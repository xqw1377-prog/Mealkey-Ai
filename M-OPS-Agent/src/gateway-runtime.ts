/**
 * Gateway 运行时硬闸：安装检查 → Context 租用 → Ingress
 * 禁止未安装时静默读写生产 Context / Ingress。
 */
import {
  createAgentClient,
  type AgentPlatformClient,
  type ContextPackageV1,
  type ContextScope,
  type IngressAckV1,
  type IngressItemV1,
} from "@mealkey/agent-sdk/platform";
import { M_OPS_DIAG_AGENT_ID } from "@mealkey/m-ops-diag";

export type GatewayMode = "sandbox" | "production";

export type GatewayEnv = {
  agentId: string;
  clientSecret: string;
  baseUrl: string;
  userAccessToken: string;
  mode: GatewayMode;
};

export class GatewayInstallError extends Error {
  code = "NOT_INSTALLED" as const;
  constructor(message: string) {
    super(message);
    this.name = "GatewayInstallError";
  }
}

export class GatewayConfigError extends Error {
  code = "GATEWAY_NOT_CONFIGURED" as const;
  constructor(message: string) {
    super(message);
    this.name = "GatewayConfigError";
  }
}

export function resolveGatewayEnv(
  overrides?: Partial<GatewayEnv> & { requireConfigured?: boolean },
): GatewayEnv | null {
  const baseUrl =
    overrides?.baseUrl?.trim() ||
    process.env.MK_GATEWAY_URL?.trim() ||
    "";
  const clientSecret =
    overrides?.clientSecret?.trim() ||
    process.env.MK_AGENT_SECRET?.trim() ||
    "";
  const agentId =
    overrides?.agentId?.trim() ||
    process.env.MK_AGENT_ID?.trim() ||
    M_OPS_DIAG_AGENT_ID;
  const userAccessToken =
    overrides?.userAccessToken?.trim() ||
    process.env.MK_USER_ACCESS_TOKEN?.trim() ||
    "sandbox";
  const mode: GatewayMode =
    overrides?.mode ||
    (process.env.MK_GATEWAY_MODE?.trim() === "production"
      ? "production"
      : "sandbox");

  if (!baseUrl || !clientSecret) {
    if (overrides?.requireConfigured) {
      throw new GatewayConfigError(
        "缺少 MK_GATEWAY_URL / MK_AGENT_SECRET，无法连接 MealKey Gateway",
      );
    }
    return null;
  }

  return { agentId, clientSecret, baseUrl, userAccessToken, mode };
}

export function createMkClient(env: GatewayEnv): AgentPlatformClient {
  return createAgentClient({
    agentId: env.agentId,
    clientSecret: env.clientSecret,
    baseUrl: env.baseUrl,
    env: env.mode,
  });
}

const DEFAULT_SCOPES: ContextScope[] = [
  "basic",
  "facts",
  "review",
  "operation",
  "market",
];

/**
 * 生产路径：必须已安装才能读 Context。
 * Sandbox fixture 路径不走本函数。
 */
export async function requireInstalledContext(
  mk: AgentPlatformClient,
  input: {
    restaurantId: string;
    userAccessToken: string;
    scopes?: ContextScope[];
    mode: GatewayMode;
  },
): Promise<ContextPackageV1> {
  const status = await mk.auth.getInstallStatus(
    input.restaurantId,
    input.userAccessToken,
  );
  if (!status.installed) {
    throw new GatewayInstallError(
      `Agent 未安装到餐厅 ${input.restaurantId}：禁止租用生产 Context / 提交 Ingress。请先在 MealKey Store 安装「餐启经营诊断」。`,
    );
  }

  const scopes = input.scopes?.length ? input.scopes : DEFAULT_SCOPES;
  return mk.getRestaurantContext(input.restaurantId, {
    scopes,
    userAccessToken: input.userAccessToken,
    purpose: "radar",
  });
}

/**
 * 提交 Ingress：生产必须先确认安装；sandbox 允许（Host 侧另有 fixture/sandbox token 规则）。
 */
export async function submitIngressGuarded(
  mk: AgentPlatformClient,
  input: {
    restaurantId: string;
    userAccessToken: string;
    items: IngressItemV1[];
    invokeId?: string;
    horizon?: "today" | "7d" | "30d";
    mode: GatewayMode;
  },
): Promise<IngressAckV1> {
  if (!input.items.length) {
    return {
      ok: true,
      invokeId: input.invokeId || `empty-${Date.now()}`,
      accepted: [],
      rejected: [],
    };
  }

  if (input.mode === "production") {
    const status = await mk.auth.getInstallStatus(
      input.restaurantId,
      input.userAccessToken,
    );
    if (!status.installed) {
      throw new GatewayInstallError(
        `Agent 未安装到餐厅 ${input.restaurantId}：禁止提交生产 Ingress`,
      );
    }
  }

  return mk.submitIngress({
    restaurantId: input.restaurantId,
    invokeId: input.invokeId || `mops-${Date.now()}`,
    userAccessToken: input.userAccessToken,
    horizon: input.horizon || "7d",
    items: input.items,
  });
}
