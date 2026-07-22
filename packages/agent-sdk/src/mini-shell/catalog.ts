import type {
  BillingManifestV1,
  MiniProgramManifestV1,
  ShellCatalogItemV1,
} from "./types";

/** Gateway / Marketplace agent id for first-party ops diagnosis */
export const M_OPS_DIAG_AGENT_ID = "restaurant-diagnosis";

export const M_OPS_DIAG_PRODUCT_NAME = "餐厅经营体检系统";

export const FIRST_HUB_VISIT_GRANT_POINTS = 500;

export const mOpsMiniProgramManifestV1: MiniProgramManifestV1 = {
  schemaVersion: "1.0",
  agentId: M_OPS_DIAG_AGENT_ID,
  hubSlot: {
    title: M_OPS_DIAG_PRODUCT_NAME,
    subtitle: "看见经营异常与证据，把值得关注的变化推到你眼前",
    category: "ops",
    coverAssetRef: "shell/plugins/restaurant-diagnosis/cover",
    tags: ["餐启 Agent", "经营体检", "证据优先"],
  },
  entry: {
    path: "/pages/plugins/restaurant-diagnosis/index",
    firstValueMinutes: 3,
  },
  surfaces: {
    host: "mealkey_agent_hub",
  },
  experience: {
    freePreviewRatio: 0.3,
    handoffCta: "enter_mealkey_brain",
    forbidDownloadAppAsPrimaryCta: true,
  },
  identity: {
    allowGuestRun: true,
    requirePhoneToPersist: true,
  },
};

export const mOpsBillingManifestV1: BillingManifestV1 = {
  schemaVersion: "1.0",
  agentId: M_OPS_DIAG_AGENT_ID,
  currency: "ops_points",
  priceTable: [
    {
      skillOrActionId: "ops.diagnosis.health_check",
      displayName: "经营体检",
      costPoints: 100,
    },
  ],
  grant: {
    firstHubVisitPoints: FIRST_HUB_VISIT_GRANT_POINTS,
  },
  settlementRef: "marketplace_v1",
};

/** S1 catalog: featured first plugin only; more slots stay gated by MVP stop-expand */
export function getShellCatalogV1(options?: {
  mOpsPluginOrigin?: string;
}): ShellCatalogItemV1[] {
  return [
    {
      agentId: M_OPS_DIAG_AGENT_ID,
      title: mOpsMiniProgramManifestV1.hubSlot.title,
      subtitle: mOpsMiniProgramManifestV1.hubSlot.subtitle ?? "",
      category: "ops",
      tags: mOpsMiniProgramManifestV1.hubSlot.tags,
      costPoints: mOpsBillingManifestV1.priceTable[0]!.costPoints,
      firstValueMinutes: mOpsMiniProgramManifestV1.entry.firstValueMinutes,
      featured: true,
      entryPath: mOpsMiniProgramManifestV1.entry.path,
      pluginOrigin: options?.mOpsPluginOrigin,
    },
  ];
}
