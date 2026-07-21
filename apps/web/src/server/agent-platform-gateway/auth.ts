import crypto from "node:crypto";
import { resolveAgentAsync } from "./registry";
import { GatewayError, type RegisteredAgentV1 } from "./types";

export { assertInstalled, getInstallStatus, isPlatformBuiltinAgent } from "./install-gate";

/** Align with @mealkey/agent-sdk/platform sign payload */
export function buildSignaturePayload(input: {
  method: string;
  path: string;
  timestamp: string;
  body: string;
  agentId: string;
}): string {
  const bodyHash = crypto
    .createHash("sha256")
    .update(input.body, "utf8")
    .digest("hex");
  return `${input.method}\n${input.path}\n${input.timestamp}\n${bodyHash}\n${input.agentId}`;
}

export function signAgentRequest(
  secret: string,
  input: {
    method: string;
    path: string;
    timestamp: string;
    body: string;
    agentId: string;
  },
): string {
  return crypto
    .createHmac("sha256", secret)
    .update(buildSignaturePayload(input), "utf8")
    .digest("hex");
}

export async function verifyAgentSignature(input: {
  method: string;
  path: string;
  body: string;
  agentId: string | null;
  timestamp: string | null;
  signature: string | null;
}): Promise<RegisteredAgentV1> {
  if (!input.agentId || !input.timestamp || !input.signature) {
    throw new GatewayError("AUTH_EXPIRED", "缺少 Agent 签名头", 401);
  }

  const agent = await resolveAgentAsync(input.agentId);
  if (!agent) {
    throw new GatewayError("AUTH_EXPIRED", `未知 Agent: ${input.agentId}`, 401);
  }

  const ts = Number(input.timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > 5 * 60 * 1000) {
    throw new GatewayError("AUTH_EXPIRED", "时间戳过期", 401);
  }

  const expected = signAgentRequest(agent.clientSecret, {
    method: input.method,
    path: input.path,
    timestamp: input.timestamp,
    body: input.body,
    agentId: input.agentId,
  });

  const left = Buffer.from(expected);
  const right = Buffer.from(input.signature);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
    throw new GatewayError("AUTH_EXPIRED", "Agent 签名无效", 401);
  }

  return agent;
}

export type GatewayUserAccess = {
  token: string;
  mode: "sandbox" | "listed" | "dev_open";
  /** listed Token 可选绑定 ownerId（配置格式 token|ownerId） */
  ownerId: string | null;
};

/**
 * V1 用户委托：
 * - sandbox*：仅非生产，或显式 MK_GATEWAY_ALLOW_SANDBOX_TOKEN=1
 * - MK_GATEWAY_USER_TOKENS：逗号分隔；支持 `token` 或 `token|ownerId`
 * - dev_open：仅非生产（生产忽略 MK_GATEWAY_DEV_OPEN）
 */
export function verifyUserAccessToken(authHeader: string | null): GatewayUserAccess {
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";
  if (!token) {
    throw new GatewayError("AUTH_EXPIRED", "缺少用户委托 Token", 401);
  }

  const isProd = process.env.NODE_ENV === "production";

  if (token === "sandbox" || token.startsWith("sandbox_")) {
    if (isProd && process.env.MK_GATEWAY_ALLOW_SANDBOX_TOKEN !== "1") {
      throw new GatewayError("AUTH_EXPIRED", "生产环境禁用 sandbox Token", 401);
    }
    return { token, mode: "sandbox", ownerId: null };
  }

  const listed = (process.env.MK_GATEWAY_USER_TOKENS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const entry of listed) {
    const pipe = entry.indexOf("|");
    const entryToken = pipe >= 0 ? entry.slice(0, pipe) : entry;
    const ownerId = pipe >= 0 ? entry.slice(pipe + 1).trim() || null : null;
    if (entryToken === token) {
      return { token, mode: "listed", ownerId };
    }
  }

  // 生产绝不因 DEV_OPEN 放行任意 Bearer
  if (!isProd) {
    return { token, mode: "dev_open", ownerId: null };
  }

  throw new GatewayError("AUTH_EXPIRED", "用户委托 Token 无效", 401);
}
