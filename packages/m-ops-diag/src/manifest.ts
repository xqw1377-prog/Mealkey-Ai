import type { ToolAgentManifest } from "@mealkey/tool-agent-kit";
import {
  M_OPS_DIAG_AGENT_ID,
  M_OPS_DIAG_PRODUCT_NAME,
} from "./contracts";

/** Tool Agent 身份证 — 服从 MEALKEY_AGENT_PROTOCOL_V1 + TOOL_AGENT_FRAMEWORK_V1 */
export const mOpsDiagManifest: ToolAgentManifest = {
  id: M_OPS_DIAG_AGENT_ID,
  name: M_OPS_DIAG_PRODUCT_NAME,
  version: "0.1.0",
  kind: "ops",
  stage: "pilot",
  ports: ["signal", "insight", "gap"],
  permissions: [
    "READ_BRAIN_SLICE",
    "READ_RIP",
    "READ_EVIDENCE",
    "EMIT_SIGNAL",
    "EMIT_INSIGHT",
  ],
  inputSchemaRef: "m-ops-diag.RestaurantDiagnosisRequest.v1",
  outputSchemaRef: "m-ops-diag.RestaurantDiagnosisResult.v1",
  invokePolicy: {
    requiresDecisionAuth: false,
    requiresBossConfirm: false,
    billable: true,
  },
  description:
    "经营感知器：看见问题 → 识别异常 → 提供证据 → 生成洞察；不决策、不执行。",
};
