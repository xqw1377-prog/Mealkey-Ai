/**
 * Mini Shell contracts & first-party catalog helpers.
 * Implementation of the WeChat Mini Program lives in apps/mini-shell.
 */

export {
  FIRST_HUB_VISIT_GRANT_POINTS,
  M_OPS_DIAG_AGENT_ID,
  M_OPS_DIAG_PRODUCT_NAME,
  getShellCatalogV1,
  mOpsBillingManifestV1,
  mOpsMiniProgramManifestV1,
} from "./catalog";
export {
  HANDOFF_PRIMARY_CTA,
  buildBrainHandoffUrl,
  buildShellContextV1,
  createInvokeId,
  isPluginUiEventType,
  parsePluginUiEvent,
  type BuildShellContextInput,
} from "./runtime";
export type {
  BillingManifestV1,
  MiniProgramHost,
  MiniProgramManifestV1,
  MiniShellUserStatus,
  PluginUiEventType,
  PluginUiEventV1,
  ShellCatalogItemV1,
  ShellContextV1,
} from "./types";
export { PLUGIN_UI_EVENT_TYPES } from "./types";
