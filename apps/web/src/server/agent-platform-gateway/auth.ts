import crypto from "node:crypto";
import { resolveAgent } from "./registry";
import { GatewayError, type RegisteredAgentV1 } from "./types";

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

export function verifyAgentSignature(input: {
  method: string;
  path: string;
  body: string;
  agentId: string | null;
  timestamp: string | null;
  signature: string | null;
}): RegisteredAgentV1 {
  if (!input.agentId || !input.timestamp || !input.signature) {
    throw new GatewayError("AUTH_EXPIRED", "缺少 Agent 签名头", 401);
  }

  const agent = resolveAgent(input.agentId);
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

/**
 * V1 用户委托：Bearer sandbox* | 环境白名单 | 开发放行
 * 生产须配置 MK_GATEWAY_USER_TOKENS（逗号分隔）
 */
export function verifyUserAccessToken(authHeader: string | null): {
  token: string;
  mode: "sandbox" | "listed" | "dev_open";
} {
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";
  if (!token) {
    throw new GatewayError("AUTH_EXPIRED", "缺少用户委托 Token", 401);
  }

  if (token === "sandbox" || token.startsWith("sandbox_")) {
    return { token, mode: "sandbox" };
  }

  const listed = (process.env.MK_GATEWAY_USER_TOKENS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (listed.includes(token)) {
    return { token, mode: "listed" };
  }

  if (
    process.env.NODE_ENV !== "production" ||
    process.env.MK_GATEWAY_DEV_OPEN === "1"
  ) {
    return { token, mode: "dev_open" };
  }

  throw new GatewayError("AUTH_EXPIRED", "用户委托 Token 无效", 401);
}

/** V1：sandbox/dev 默认已安装；listed 视为已授权 Manifest 声明 scopes */
export function assertInstalled(input: {
  agentId: string;
  restaurantId: string;
  userMode: "sandbox" | "listed" | "dev_open";
}): void {
  if (!input.restaurantId.trim()) {
    throw new GatewayError("SCOPE_DENIED", "restaurantId 必填", 403);
  }
  // 安装表工程后置；V1 凭 Token 模式放行已注册 Agent
  void input.agentId;
  void input.userMode;
}
