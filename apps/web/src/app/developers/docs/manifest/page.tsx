import type { Metadata } from "next";

import {
  CodeBlock,
  DocHeader,
  DocSection,
  DocsLayout,
} from "../../_components/developer-portal";

export const metadata: Metadata = {
  title: "Manifest · Mealkey Developers",
};

export default function ManifestPage() {
  return (
    <DocsLayout activePath="/developers/docs/manifest">
      <DocHeader
        eyebrow="MANIFEST"
        title="Agent 身份证"
        description="字段以 Protocol AgentManifestV1 为准。下列为合规示例摘录。"
        authority="MEALKEY_AGENT_PROTOCOL_V1 §2 · 宪法索引 §2"
      />
      <DocSection title="示例（partner）">
        <CodeBlock>{`{
  "id": "partner.acme.restaurant-finance",
  "name": "餐饮财务分析 Agent",
  "version": "1.0.0",
  "provider": "partner",
  "runtimeMode": "cloud_https",
  "stage": "sandbox",
  "capabilityIds": ["finance.performance.analysis"],
  "ports": ["signal", "insight", "gap"],
  "maxInsightLevel": 3,
  "permissions": ["read:restaurant", "read:evidence"],
  "skillPackageRef": "skill.finance.performance_v1",
  "schemas": { "inputRef": "…", "outputRef": "…" },
  "invokePolicy": {
    "requiresDecisionAuth": false,
    "requiresBossConfirm": false,
    "billable": true
  },
  "quality": {
    "minEvidenceSteps": 2,
    "allowsInferenceOnly": false
  },
  "marketplace": {
    "priceMonthlyFen": 29900,
    "pitch": "用证据解释利润波动"
  }
}`}</CodeBlock>
      </DocSection>
      <DocSection title="注册">
        <CodeBlock>{`POST /v1/gateway/agents/register
PUT  /v1/gateway/agents/{agentId}/manifest

体 = AgentManifestV1 + DecisionSkillPackageV1`}</CodeBlock>
        <p className="text-[13px] text-[#6f747b]">
          capabilityIds 必须在 Capability Registry；未登记不得上架。
        </p>
      </DocSection>
    </DocsLayout>
  );
}
