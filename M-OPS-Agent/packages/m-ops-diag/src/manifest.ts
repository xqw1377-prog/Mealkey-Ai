import type { ToolAgentManifest } from "@mealkey/tool-agent-kit";
import {
  M_OPS_DIAG_AGENT_ID,
  M_OPS_DIAG_PRODUCT_NAME,
  M_OPS_DIAG_PRODUCT_NAME_FULL,
} from "./contracts";

/**
 * MealKey AgentManifestV1（外接 Host / Store / Console 投影）
 * SSOT：MEALKEY_AGENT_PROTOCOL_V1 · MEALKEY_AGENT_EXTERNAL_INTERFACE_V1
 */
export const mOpsAgentManifestV1 = {
  id: M_OPS_DIAG_AGENT_ID,
  name: M_OPS_DIAG_PRODUCT_NAME_FULL,
  version: "0.1.0",
  provider: "official" as const,
  runtimeMode: "cloud_https" as const,
  stage: "sandbox" as const,
  capabilityIds: [
    "ops.diagnosis.health",
    "ops.diagnosis.signal",
    "ops.diagnosis.gap",
  ],
  ports: ["signal", "insight", "gap"] as const,
  maxInsightLevel: 3 as const,
  permissions: ["read:restaurant", "read:evidence"],
  skillPackageRef: "skill.restaurant-diagnosis.v1",
  schemas: {
    inputRef: "ContextPackageV1",
    outputRef: "IngressBatchV1",
  },
  invokePolicy: {
    requiresDecisionAuth: false,
    requiresBossConfirm: false,
    billable: true,
  },
  quality: {
    minEvidenceSteps: 2,
    allowsInferenceOnly: false,
  },
  endpointUrl: null as string | null,
  category: "ops",
  description:
    "餐厅经营体检系统：看见问题 → 识别异常 → 提供证据 → 生成洞察；不决策、不执行。拍板留在餐启 OS。",
};

/** Tool Agent 身份证 — 服从 TOOL_AGENT_FRAMEWORK_V1（id 与 Gateway 对齐） */
export const mOpsDiagManifest: ToolAgentManifest = {
  id: M_OPS_DIAG_AGENT_ID,
  name: M_OPS_DIAG_PRODUCT_NAME,
  version: mOpsAgentManifestV1.version,
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
  inputSchemaRef: "ContextPackageV1",
  outputSchemaRef: "IngressBatchV1",
  invokePolicy: {
    requiresDecisionAuth: false,
    requiresBossConfirm: false,
    billable: true,
  },
  description: mOpsAgentManifestV1.description,
};
