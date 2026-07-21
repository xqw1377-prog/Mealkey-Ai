import type { Metadata } from "next";
import Link from "next/link";

import {
  CodeBlock,
  DocHeader,
  DocZones,
  DocsLayout,
} from "../../_components/developer-portal";

export const metadata: Metadata = {
  title: "Agent Protocol · Mealkey Developers",
};

export default function ProtocolPage() {
  return (
    <DocsLayout activePath="/developers/docs/protocol">
      <DocHeader
        eyebrow="AGENT PROTOCOL"
        title="能力标准化（宪法）"
        description="Agent ≠ Chatbot。五层齐全才能 Live；合法出口仅 Ports。"
        authority="MEALKEY_AGENT_PROTOCOL_V1"
      />
      <DocZones
        canDo={
          <p>
            理解 MealKey 如何把餐饮能力标准化：你交付的是{" "}
            <strong className="font-semibold text-[#202124]">Decision Skill + Manifest</strong>
            ，不是一段 Prompt。
          </p>
        }
        contract={
          <>
            <CodeBlock>{`禁止: 用户输入 → LLM 直接回答 / 拍板关店
允许: Context → Reasoning (Skill) → Capability
      → Insight / Signal / Gap →（OS 决策层）`}</CodeBlock>
            <ul className="list-disc space-y-1 pl-5">
              <li>零直连数据面</li>
              <li>能力必须挂 Capability Registry</li>
              <li>Ports：Signal · Insight · Work · Gap</li>
              <li>默认 maxInsightLevel ≤ 3</li>
              <li>无永久私有记忆；Learning 经审核</li>
            </ul>
            <p className="text-[13px] text-[#6f747b]">
              Insight 分级：L1 观察 · L2 诊断 · L3 建议（默认上限）· L4/L5 须认证。
            </p>
          </>
        }
        example={
          <>
            <CodeBlock>{`m-ops-diag
  capabilities: ops.diagnosis.*
  maxInsightLevel: 3
  ports: signal · insight · gap`}</CodeBlock>
            <p>
              <Link
                href="/developers/docs/constitution"
                className="font-medium text-[#465240] underline-offset-2 hover:underline"
              >
                宪法索引
              </Link>
              {" · "}
              <Link
                href="/developers/examples/m-ops"
                className="font-medium text-[#465240] underline-offset-2 hover:underline"
              >
                M-OPS
              </Link>
            </p>
          </>
        }
      />
    </DocsLayout>
  );
}
