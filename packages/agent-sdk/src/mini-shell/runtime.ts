import { PLUGIN_UI_EVENT_TYPES, type PluginUiEventType, type PluginUiEventV1, type ShellContextV1 } from "./types";

export function isPluginUiEventType(value: string): value is PluginUiEventType {
  return (PLUGIN_UI_EVENT_TYPES as readonly string[]).includes(value);
}

/** Shell only accepts whitelisted plugin events */
export function parsePluginUiEvent(raw: unknown): PluginUiEventV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const type = (raw as { type?: unknown }).type;
  if (typeof type !== "string" || !isPluginUiEventType(type)) return null;
  return raw as PluginUiEventV1;
}

export function createInvokeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `inv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export type BuildShellContextInput = {
  userId: string;
  status: ShellContextV1["session"]["status"];
  wechatOpenId: string;
  restaurant: ShellContextV1["restaurant"];
  agentId: string;
  installed: boolean;
  scopesGranted?: string[];
  balancePoints: number;
  estimatedCostPoints?: number;
  userAccessToken: string;
  invokeId?: string;
};

export function buildShellContextV1(input: BuildShellContextInput): ShellContextV1 {
  return {
    schemaVersion: "1.0",
    session: {
      userId: input.userId,
      status: input.status,
      wechatOpenId: input.wechatOpenId,
    },
    restaurant: input.restaurant,
    entitlements: {
      agentId: input.agentId,
      installed: input.installed,
      scopesGranted: input.scopesGranted ?? ["basic", "facts", "review"],
    },
    fuel: {
      balancePoints: input.balancePoints,
      estimatedCostPoints: input.estimatedCostPoints,
    },
    userAccessToken: input.userAccessToken,
    invokeId: input.invokeId ?? createInvokeId(),
    locale: "zh-CN",
  };
}

/** Deep link into MealKey OS brain (Web). App store install stays secondary. */
export function buildBrainHandoffUrl(options: {
  osOrigin: string;
  restaurantId?: string;
  focus?: "signal" | "profile";
}): string {
  const base = options.osOrigin.replace(/\/$/, "");
  const params = new URLSearchParams();
  if (options.restaurantId) params.set("restaurantId", options.restaurantId);
  if (options.focus) params.set("focus", options.focus);
  const q = params.toString();
  return `${base}/dashboard${q ? `?${q}` : ""}`;
}

export const HANDOFF_PRIMARY_CTA = "进入 MealKey 经营大脑" as const;
