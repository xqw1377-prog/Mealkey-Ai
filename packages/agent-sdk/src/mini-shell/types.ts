/**
 * MealKey Mini Shell · Plugin contracts
 * docs/MEALKEY_MINI_PROGRAM_SHELL_AND_PLUGIN_RUNTIME_V1.md
 * docs/MEALKEY_AGENT_MINI_PROGRAM_PLATFORM_V1.md
 *
 * Platform shell only — no vertical diagnosis logic here.
 */

export type MiniShellUserStatus = "guest" | "bound" | "member";

export type ShellContextV1 = {
  schemaVersion: "1.0";
  session: {
    userId: string;
    status: MiniShellUserStatus;
    wechatOpenId: string;
  };
  restaurant: {
    localProfileId: string;
    mealkeyRestaurantId?: string;
    name: string;
    city?: string;
    category?: string;
  };
  entitlements: {
    agentId: string;
    installed: boolean;
    scopesGranted: string[];
  };
  fuel: {
    balancePoints: number;
    estimatedCostPoints?: number;
  };
  userAccessToken: string;
  invokeId: string;
  locale: "zh-CN";
};

export type PluginUiEventV1 =
  | { type: "fuel.quote"; costPoints: number }
  | { type: "fuel.spend_confirmed" }
  | { type: "run.progress"; message: string }
  | { type: "run.completed"; invokeId: string }
  | { type: "ingress.submitted"; ok: boolean }
  | { type: "handoff.brain"; reason: "upgrade" | "continue_tracking" }
  | { type: "auth.bind_phone"; reason: "persist_profile" }
  | { type: "error"; code: string; message: string };

export const PLUGIN_UI_EVENT_TYPES = [
  "fuel.quote",
  "fuel.spend_confirmed",
  "run.progress",
  "run.completed",
  "ingress.submitted",
  "handoff.brain",
  "auth.bind_phone",
  "error",
] as const;

export type PluginUiEventType = (typeof PLUGIN_UI_EVENT_TYPES)[number];

export type MiniProgramHost = "mealkey_agent_hub" | "partner_miniprogram";

export type MiniProgramManifestV1 = {
  schemaVersion: "1.0";
  agentId: string;
  hubSlot: {
    title: string;
    subtitle?: string;
    category: "ops" | "menu" | "review" | "site" | "other";
    coverAssetRef: string;
    tags: string[];
  };
  entry: {
    path: string;
    firstValueMinutes: number;
  };
  surfaces: {
    host: MiniProgramHost;
  };
  experience: {
    freePreviewRatio: number;
    handoffCta: "enter_mealkey_brain";
    forbidDownloadAppAsPrimaryCta: true;
  };
  identity: {
    allowGuestRun: boolean;
    requirePhoneToPersist: true;
  };
};

export type BillingManifestV1 = {
  schemaVersion: "1.0";
  agentId: string;
  currency: "ops_points";
  priceTable: Array<{
    skillOrActionId: string;
    displayName: string;
    costPoints: number;
  }>;
  grant?: {
    firstHubVisitPoints?: number;
  };
  settlementRef: "marketplace_v1";
};

export type ShellCatalogItemV1 = {
  agentId: string;
  title: string;
  subtitle: string;
  category: MiniProgramManifestV1["hubSlot"]["category"];
  tags: string[];
  costPoints: number;
  firstValueMinutes: number;
  featured?: boolean;
  entryPath: string;
  /** External agent UI origin for web-view (S2); empty = native shell page only */
  pluginOrigin?: string;
};
