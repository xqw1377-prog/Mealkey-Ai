import {
  FIRST_HUB_VISIT_GRANT_POINTS,
  getShellCatalogV1,
  M_OPS_DIAG_AGENT_ID,
} from "@mealkey/agent-sdk/mini-shell";

export { FIRST_HUB_VISIT_GRANT_POINTS, M_OPS_DIAG_AGENT_ID };

export function listMiniShellCatalog() {
  const mOpsPluginOrigin = process.env.MK_MOPS_PLUGIN_ORIGIN?.trim() || undefined;
  return getShellCatalogV1({ mOpsPluginOrigin });
}
