import type { Metadata } from "next";
import Link from "next/link";

import {
  CodeBlock,
  DocHeader,
  DocZones,
  DocsLayout,
} from "../../_components/developer-portal";

export const metadata: Metadata = {
  title: "Ingress API · Mealkey Developers",
};

export default function IngressApiPage() {
  return (
    <DocsLayout activePath="/developers/docs/ingress-api">
      <DocHeader
        eyebrow="INGRESS API"
        title="唯一合法写出"
        description="Signal / Insight / Work / Gap / Learning。禁止伪 /agent/run 平行契约。"
        authority="MEALKEY_AGENT_EXTERNAL_INTERFACE_V1 §4 · 宪法索引 §4"
      />
      <DocZones
        canDo={
          <p>
            把 Agent 的判断以<strong className="font-semibold text-[#202124]">合法 Ports</strong>
            写回 OS：进入今日雷达、拍板候选或学习队列——不能直接替老板拍板。
          </p>
        }
        contract={
          <>
            <CodeBlock>{`POST /v1/gateway/ingress

IngressBatchV1 {
  agentId, restaurantId, invokeId,  // 幂等键
  items: IngressItemV1[]
}`}</CodeBlock>
            <CodeBlock>{`// ✅ Signal（须有证据）
{
  "type": "OPERATION",
  "title": "服务体验下降",
  "severity": "MEDIUM",
  "confidence": 0.82,
  "evidence": [{ "source": "dianping", "fact": "近30天差评增加" }]
}

// ❌ 禁止：「你应该关闭这家店」`}</CodeBlock>
            <CodeBlock>{`拒收码（不得改写语义）:
LEVEL_EXCEEDED | NO_EVIDENCE | INFERENCE_ONLY
FORBIDDEN_DECISION | SCOPE_DENIED | WORK_NO_AUTH | SCHEMA_INVALID`}</CodeBlock>
          </>
        }
        example={
          <>
            <CodeBlock>{`M-OPS:
  输入 Context → Skill
  输出 signal / insight / gap
  Handoff → 今日可见（不在 Agent 内拍板）`}</CodeBlock>
            <p>
              <Link
                href="/developers/examples/m-ops"
                className="font-medium text-[#465240] underline-offset-2 hover:underline"
              >
                打开 M-OPS Example
              </Link>
            </p>
          </>
        }
      />
    </DocsLayout>
  );
}
