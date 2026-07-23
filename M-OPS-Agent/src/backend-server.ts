import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { URL } from "node:url";
import {
  getRestaurantBackendState,
  getRestaurantDiagnosisHistory,
  listBackendRestaurantsPaginated,
  registerRestaurant,
  runDueRestaurantScans,
  runRestaurantBackendScan,
  searchRestaurants,
  seedSampleRestaurants,
  updateRestaurantLearning,
  deleteRestaurant,
  exportRestaurantData,
  batchRunScans,
  getScanStats,
} from "./backend-service";
import {
  getStoreStats,
  verifyStoreIntegrity,
  clearDiagnosisStore,
} from "./diagnosis-persistence";
import type { ApiResponse } from "./backend-types";
import { createLogger } from "./logger";

type JsonBody = Record<string, unknown>;

const log = createLogger("backend-server");

const MAX_BODY_BYTES = Number(process.env.M_OPS_BACKEND_MAX_BODY_BYTES || 1_048_576);
const BACKEND_TOKEN = (process.env.M_OPS_BACKEND_TOKEN || "").trim();
const BIND_HOST = process.env.M_OPS_BACKEND_HOST || "127.0.0.1";

function isPublicPath(pathname: string, method: string) {
  return (
    (pathname === "/health" && method === "GET") ||
    (pathname === "/api" && method === "GET") ||
    (pathname === "/wechat/session" && method === "POST") ||
    (pathname === "/brain/sync" && method === "POST") ||
    method === "OPTIONS"
  );
}

/** 小程序 Shell 换票占位：生产应接微信 code2session */
const shellSessions = new Map<string, { openid: string; userId: string; at: string }>();
const brainSyncLog: Array<Record<string, unknown>> = [];

function extractBearer(req: IncomingMessage): string {
  const header = req.headers.authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match?.[1]?.trim() || "";
}

function requireAuth(req: IncomingMessage, res: ServerResponse, pathname: string): boolean {
  if (!BACKEND_TOKEN) {
    // 未配置 token 时仅允许本机绑定场景；危险路由仍拒绝
    if (pathname === "/api/store/clear") {
      sendError(
        res,
        403,
        "清空存储需要配置 M_OPS_BACKEND_TOKEN 并携带 Authorization: Bearer <token>",
        "AUTH_REQUIRED",
      );
      return false;
    }
    return true;
  }
  const token = extractBearer(req);
  if (token !== BACKEND_TOKEN) {
    sendError(res, 401, "未授权：需要有效的 Bearer token", "UNAUTHORIZED");
    return false;
  }
  return true;
}

function readJson(req: IncomingMessage): Promise<JsonBody> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error(`请求体超过限制 ${MAX_BODY_BYTES} bytes`));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw) as JsonBody);
      } catch (error) {
        reject(new Error(`无效的 JSON: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
    req.on("error", reject);
  });
}

function corsOrigin(): string {
  return process.env.M_OPS_BACKEND_CORS_ORIGIN || "http://localhost:5173";
}

function send<T>(res: ServerResponse, status: number, payload: ApiResponse<T>) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", corsOrigin());
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("X-Service-Name", "m-ops-backend");
  res.end(JSON.stringify(payload));
}

function sendError(res: ServerResponse, status: number, error: string, code?: string) {
  send(res, status, { ok: false, error, code });
}

function sendSuccess<T>(res: ServerResponse, data: T, meta?: Record<string, unknown>) {
  send(res, 200, { ok: true, data, meta } as ApiResponse<T>);
}

function parseQueryInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

type RouteMatch =
  | { type: "restaurant_detail"; restaurantId: string }
  | { type: "restaurant_scan"; restaurantId: string }
  | { type: "restaurant_learning"; restaurantId: string }
  | { type: "restaurant_delete"; restaurantId: string }
  | { type: "restaurant_export"; restaurantId: string }
  | { type: "restaurant_history"; restaurantId: string }
  | { type: "restaurant_refresh"; restaurantId: string }
  | null;

function matchRestaurantPath(pathname: string): RouteMatch {
  const scan = pathname.match(/^\/api\/restaurants\/([^/]+)\/scan$/);
  if (scan) return { type: "restaurant_scan", restaurantId: decodeURIComponent(scan[1]!) };
  const learning = pathname.match(/^\/api\/restaurants\/([^/]+)\/learning$/);
  if (learning) return { type: "restaurant_learning", restaurantId: decodeURIComponent(learning[1]!) };
  const hist = pathname.match(/^\/api\/restaurants\/([^/]+)\/history$/);
  if (hist) return { type: "restaurant_history", restaurantId: decodeURIComponent(hist[1]!) };
  const exp = pathname.match(/^\/api\/restaurants\/([^/]+)\/export$/);
  if (exp) return { type: "restaurant_export", restaurantId: decodeURIComponent(exp[1]!) };
  const refresh = pathname.match(/^\/api\/restaurants\/([^/]+)\/refresh$/);
  if (refresh) return { type: "restaurant_refresh", restaurantId: decodeURIComponent(refresh[1]!) };
  const detail = pathname.match(/^\/api\/restaurants\/([^/]+)$/);
  if (detail) return { type: "restaurant_detail", restaurantId: decodeURIComponent(detail[1]!) };
  return null;
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url || "/", "http://localhost");
  const pathname = url.pathname;
  const method = req.method || "GET";
  const startTime = Date.now();

  if (method === "OPTIONS") {
    res.statusCode = 204;
    res.setHeader("Access-Control-Allow-Origin", corsOrigin());
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.end();
    return;
  }

  try {
    if (!isPublicPath(pathname, method) && !requireAuth(req, res, pathname)) {
      return;
    }

    if (pathname === "/health" && method === "GET") {
      sendSuccess(res, {
        service: "m-ops-backend",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        version: "0.3.0",
        authRequired: Boolean(BACKEND_TOKEN),
        bindHost: BIND_HOST,
        shell: {
          wechatSession: "/wechat/session",
          brainSync: "/brain/sync",
        },
      });
      return;
    }

    if (pathname === "/wechat/session" && method === "POST") {
      const body = await readJson(req);
      const code = String(body.code || "").trim();
      if (!code) {
        sendError(res, 400, "缺少 code", "BAD_REQUEST");
        return;
      }
      const openid = "dev_openid_" + code.slice(0, 12);
      const userId = "u_" + Buffer.from(openid).toString("base64url").slice(0, 16);
      const row = { openid, userId, at: new Date().toISOString() };
      shellSessions.set(code, row);
      sendSuccess(res, {
        openid: row.openid,
        unionid: "",
        userId: row.userId,
        nickName: "微信用户",
        mode: "dev_stub",
        note: "开发占位；生产请换微信 code2session",
      });
      return;
    }

    if (pathname === "/brain/sync" && method === "POST") {
      const body = await readJson(req);
      brainSyncLog.unshift({
        ...body,
        receivedAt: new Date().toISOString(),
      });
      if (brainSyncLog.length > 100) brainSyncLog.length = 100;
      sendSuccess(res, {
        accepted: true,
        pendingServer: brainSyncLog.length,
      });
      return;
    }

    if (pathname === "/api" && method === "GET") {
      sendSuccess(res, getApiDocs());
      return;
    }

    if (pathname === "/api/store/stats" && method === "GET") {
      sendSuccess(res, getStoreStats());
      return;
    }

    if (pathname === "/api/store/verify" && method === "GET") {
      sendSuccess(res, verifyStoreIntegrity());
      return;
    }

    if (pathname === "/api/store/clear" && method === "POST") {
      clearDiagnosisStore();
      sendSuccess(res, { cleared: true });
      return;
    }

    if (pathname === "/api/stats" && method === "GET") {
      sendSuccess(res, getScanStats());
      return;
    }

    if (pathname === "/api/seed" && method === "POST") {
      const seeded = seedSampleRestaurants();
      sendSuccess(res, { seeded, count: seeded.length });
      return;
    }

    if (pathname === "/api/scan/run-due" && method === "POST") {
      const results = await runDueRestaurantScans();
      sendSuccess(res, { results, count: results.length });
      return;
    }

    if (pathname === "/api/scan/batch" && method === "POST") {
      const body = await readJson(req);
      const ids = (body as { restaurantIds?: string[] }).restaurantIds;
      if (!Array.isArray(ids) || ids.length === 0) {
        sendError(res, 400, "需要提供 restaurantIds 数组", "INVALID_INPUT");
        return;
      }
      if (ids.length > 50) {
        sendError(res, 400, "批量扫描最多 50 个餐厅", "TOO_MANY");
        return;
      }
      sendSuccess(res, await batchRunScans(ids));
      return;
    }

    if (pathname === "/api/restaurants/search" && method === "GET") {
      const query = url.searchParams.get("q") || "";
      if (!query.trim()) {
        sendError(res, 400, "需要提供搜索关键词 q", "INVALID_INPUT");
        return;
      }
      sendSuccess(res, searchRestaurants(query));
      return;
    }

    if (pathname === "/api/restaurants" && method === "GET") {
      const page = parseQueryInt(url.searchParams.get("page"), 1);
      const pageSize = parseQueryInt(url.searchParams.get("pageSize"), 20);
      const query = url.searchParams.get("q") || undefined;
      const city = url.searchParams.get("city") || undefined;
      const category = url.searchParams.get("category") || undefined;
      const stageParam = url.searchParams.get("stage") || undefined;
      const scanEnabled = url.searchParams.has("scanEnabled")
        ? url.searchParams.get("scanEnabled") === "true"
        : undefined;

      if (pageSize > 100) {
        sendError(res, 400, "pageSize 最大为 100", "INVALID_INPUT");
        return;
      }

      if (query) {
        sendSuccess(res, searchRestaurants(query));
        return;
      }

      const result = listBackendRestaurantsPaginated(page, pageSize, {
        query,
        city,
        category,
        stage: stageParam as import("./backend-types").RestaurantStage | undefined,
        scanEnabled,
      });
      sendSuccess(res, result, {
        page,
        pageSize,
        total: result.total,
        totalPages: result.totalPages,
      });
      return;
    }

    if (pathname === "/api/restaurants" && method === "POST") {
      const body = await readJson(req);
      if (!body.restaurantId || !body.brand) {
        sendError(res, 400, "restaurantId 和 brand 为必填字段", "INVALID_INPUT");
        return;
      }
      sendSuccess(res, registerRestaurant(body as never));
      return;
    }

    const matched = matchRestaurantPath(pathname);
    if (!matched) {
      sendError(res, 404, `路由未找到: ${method} ${pathname}`, "NOT_FOUND");
      return;
    }

    const { restaurantId } = matched;

    switch (matched.type) {
      case "restaurant_detail": {
        if (method === "GET") {
          const state = getRestaurantBackendState(restaurantId);
          if (!state.profile) {
            sendError(res, 404, `餐厅 ${restaurantId} 不存在`, "NOT_FOUND");
            return;
          }
          sendSuccess(res, state);
        } else if (method === "DELETE") {
          const deleted = deleteRestaurant(restaurantId);
          if (!deleted) {
            sendError(res, 404, `餐厅 ${restaurantId} 不存在`, "NOT_FOUND");
            return;
          }
          sendSuccess(res, { deleted: true, restaurantId });
        } else {
          sendError(res, 405, `不支持的方法: ${method}`, "METHOD_NOT_ALLOWED");
        }
        return;
      }

      case "restaurant_scan": {
        if (method !== "POST") {
          sendError(res, 405, "请使用 POST", "METHOD_NOT_ALLOWED");
          return;
        }
        const body = await readJson(req);
        const result = await runRestaurantBackendScan({
          restaurantId,
          asOf: typeof body.asOf === "string" ? body.asOf : undefined,
          syncToGateway:
            typeof body.syncToGateway === "boolean" ? body.syncToGateway : true,
        });
        sendSuccess(res, result);
        return;
      }

      case "restaurant_learning": {
        if (method !== "PATCH") {
          sendError(res, 405, "请使用 PATCH", "METHOD_NOT_ALLOWED");
          return;
        }
        const body = await readJson(req);
        if (!body.diagnosisId || !body.hypothesis) {
          sendError(res, 400, "diagnosisId 和 hypothesis 为必填字段", "INVALID_INPUT");
          return;
        }
        const learning = updateRestaurantLearning({
          restaurantId,
          diagnosisId: String(body.diagnosisId),
          hypothesis: String(body.hypothesis),
          action: typeof body.action === "string" ? body.action : undefined,
          actualOutcome:
            typeof body.actualOutcome === "string" ? body.actualOutcome : undefined,
          lesson: typeof body.lesson === "string" ? body.lesson : undefined,
        });
        if (!learning) {
          sendError(res, 404, "学习记录未找到", "NOT_FOUND");
          return;
        }
        sendSuccess(res, learning);
        return;
      }

      case "restaurant_export": {
        if (method !== "GET") {
          sendError(res, 405, "请使用 GET", "METHOD_NOT_ALLOWED");
          return;
        }
        const format = (url.searchParams.get("format") || "json") as "json" | "csv";
        const data = exportRestaurantData(restaurantId, format);
        if (!data) {
          sendError(res, 404, `餐厅 ${restaurantId} 不存在`, "NOT_FOUND");
          return;
        }
        if (format === "csv") {
          res.statusCode = 200;
          res.setHeader("Content-Type", "text/csv; charset=utf-8");
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="restaurant-${restaurantId}.csv"`,
          );
          res.setHeader("Access-Control-Allow-Origin", corsOrigin());
          res.end(data);
        } else {
          sendSuccess(res, JSON.parse(data));
        }
        return;
      }

      case "restaurant_history": {
        if (method !== "GET") {
          sendError(res, 405, "请使用 GET", "METHOD_NOT_ALLOWED");
          return;
        }
        const page = parseQueryInt(url.searchParams.get("page"), 1);
        const pageSize = parseQueryInt(url.searchParams.get("pageSize"), 20);
        sendSuccess(res, getRestaurantDiagnosisHistory(restaurantId, page, pageSize));
        return;
      }

      case "restaurant_refresh": {
        if (method !== "POST") {
          sendError(res, 405, "请使用 POST", "METHOD_NOT_ALLOWED");
          return;
        }
        const result = await runRestaurantBackendScan({
          restaurantId,
          syncToGateway: true,
        });
        sendSuccess(res, result);
        return;
      }

      default:
        sendError(res, 405, "方法不允许", "METHOD_NOT_ALLOWED");
    }
  } catch (error) {
    const elapsed = Date.now() - startTime;
    const msg = error instanceof Error ? error.message : String(error);
    log("error", `请求处理异常 ${method} ${pathname} (${elapsed}ms)`, msg);
    const isBodyLimit = msg.includes("请求体超过限制");
    sendError(
      res,
      isBodyLimit ? 413 : 500,
      isBodyLimit ? msg : "内部错误",
      isBodyLimit ? "PAYLOAD_TOO_LARGE" : "INTERNAL_ERROR",
    );
  }
}

function getApiDocs() {
  return {
    service: "M-OPS-Agent 后端服务（本地开发旁路）",
    version: "0.3.0",
    description:
      "餐厅经营体检系统 HTTP API。默认绑定 127.0.0.1；配置 M_OPS_BACKEND_TOKEN 后除 /health、/api 外需 Bearer 鉴权。",
    auth: BACKEND_TOKEN
      ? "Authorization: Bearer <M_OPS_BACKEND_TOKEN>"
      : "未配置 token（仅建议本机使用）；/api/store/clear 仍强制要求 token",
    baseUrl: `http://${BIND_HOST}:{port}`,
    endpoints: [
      { path: "/health", method: "GET", description: "健康检查（公开）" },
      { path: "/api", method: "GET", description: "API 文档（公开）" },
      { path: "/api/restaurants", method: "GET", description: "餐厅列表（分页）" },
      { path: "/api/restaurants", method: "POST", description: "注册餐厅" },
      { path: "/api/restaurants/:id/scan", method: "POST", description: "诊断扫描" },
      { path: "/api/restaurants/:id/learning", method: "PATCH", description: "更新学习记录" },
      { path: "/api/scan/run-due", method: "POST", description: "到期扫描" },
      { path: "/api/store/clear", method: "POST", description: "清空存储（需 token）" },
      { path: "/wechat/session", method: "POST", description: "Shell 微信 code 换票（开发占位）" },
      { path: "/brain/sync", method: "POST", description: "Shell Brain 云同步接收" },
    ],
  };
}

export function startBackendServer(
  port = Number(process.env.M_OPS_BACKEND_PORT || 8787),
) {
  const server = createServer((req, res) => {
    void handle(req, res);
  });

  let shuttingDown = false;
  const gracefulShutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    log("info", "正在优雅关闭服务器...");
    server.close(() => {
      log("info", "服务器已关闭");
      process.exit(0);
    });
    setTimeout(() => {
      log("warn", "强制关闭服务器");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);

  server.listen(port, BIND_HOST, () => {
    log("info", `后端服务已启动 http://${BIND_HOST}:${port}`);
    log("info", `API 文档地址 http://${BIND_HOST}:${port}/api`);
    if (!BACKEND_TOKEN) {
      log("warn", "未设置 M_OPS_BACKEND_TOKEN：API 在本机开放，生产请务必配置 token");
    }
  });

  server.on("error", (error) => {
    log("error", "服务器启动失败", error.message);
    process.exit(1);
  });

  return server;
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\\\/g, "/")}`) {
  startBackendServer();
}
