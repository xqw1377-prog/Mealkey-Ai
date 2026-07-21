import type { Metadata } from "next";
import Link from "next/link";

import {
  CodeBlock,
  DocHeader,
  DocSection,
  DocsLayout,
} from "../../_components/developer-portal";

export const metadata: Metadata = {
  title: "Constitution Index · Mealkey Developers",
};

export default function ConstitutionPage() {
  return (
    <DocsLayout activePath="/developers/docs/constitution">
      <DocHeader
        eyebrow="CONSTITUTION INDEX"
        title="第三方可读宪法索引"
        description="Protocol + External Interface 的目录与提审清单。禁止在门户另立字段。"
        authority="MEALKEY_AGENT_DEVELOPER_CONSTITUTION_INDEX_V1"
      />
      <DocSection title="六块总览">
        <div className="overflow-x-auto rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white/80">
          <table className="min-w-full text-left text-[13px]">
            <thead className="bg-[#F7F5EF] text-[11px] uppercase tracking-[0.06em] text-[#6f747b]">
              <tr>
                <th className="px-3 py-2 font-medium">块</th>
                <th className="px-3 py-2 font-medium">主题</th>
                <th className="px-3 py-2 font-medium">权威</th>
              </tr>
            </thead>
            <tbody className="text-[#3a3d41]">
              {[
                ["A", "Manifest", "Protocol §2"],
                ["B", "ContextPackage", "External §3"],
                ["C", "Ingress", "External §4"],
                ["D", "Scope / 安装", "External §2–3 · Protocol §8"],
                ["E", "Sandbox", "External §5"],
                ["F", "Version", "Protocol §13"],
              ].map(([a, b, c]) => (
                <tr key={a} className="border-t border-[rgba(24,24,23,0.06)]">
                  <td className="px-3 py-2 font-semibold">{a}</td>
                  <td className="px-3 py-2">{b}</td>
                  <td className="px-3 py-2 text-[#5f6368]">{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3">
          详表与提审勾选见仓内{" "}
          <code className="rounded bg-white/80 px-1 text-[12px]">
            docs/MEALKEY_AGENT_DEVELOPER_CONSTITUTION_INDEX_V1.md
          </code>
          。
        </p>
      </DocSection>
      <DocSection title="提审清单（摘要）">
        <CodeBlock>{`□ 无 DB/Prisma；仅 Context + Ingress
□ Manifest + Skill Package；capabilityIds 在 Registry
□ maxInsightLevel ≤ 3（未认证）
□ Signal 主位有证据；无拍板句
□ 未安装门店不得读生产 Context
□ 幂等 invokeId；Sandbox fixture 跑通`}</CodeBlock>
        <p>
          继续：
          <Link
            href="/developers/docs/protocol"
            className="ml-1 font-medium text-[#465240] underline-offset-2 hover:underline"
          >
            Protocol
          </Link>
          ·
          <Link
            href="/developers/docs/context-api"
            className="ml-1 font-medium text-[#465240] underline-offset-2 hover:underline"
          >
            Context
          </Link>
          ·
          <Link
            href="/developers/docs/ingress-api"
            className="ml-1 font-medium text-[#465240] underline-offset-2 hover:underline"
          >
            Ingress
          </Link>
        </p>
      </DocSection>
    </DocsLayout>
  );
}
