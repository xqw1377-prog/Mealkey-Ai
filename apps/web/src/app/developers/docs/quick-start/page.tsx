import type { Metadata } from "next";
import Link from "next/link";

import {
  CodeBlock,
  DocHeader,
  DocSection,
  DocsLayout,
} from "../../_components/developer-portal";

export const metadata: Metadata = {
  title: "Quick Start · Mealkey Developers",
};

export default function QuickStartPage() {
  return (
    <DocsLayout activePath="/developers/docs/quick-start">
      <DocHeader
        eyebrow="QUICK START"
        title="7 日做出第一个合规 Agent"
        description="对照官方样板仓 M-OPS-Agent。目标：Sandbox 跑通 Context → Skill → Ingress。"
        authority="MEALKEY_AGENT_DEVELOPER_ONBOARDING_7DAY_V1"
      />
      <DocSection title="Day 0–1 · 边界与 Hello Context">
        <p>读懂：禁直连 Prisma；只经 Gateway。起 MealKey OS 与样板 sandbox。</p>
        <CodeBlock>{`# MealKey OS
npm run dev -w @mealkey/web

# 样板仓（外置）
cd <M-OPS-Agent>
set MK_GATEWAY_URL=http://localhost:3000/api
set MK_AGENT_SECRET=mk-sandbox-agent-secret
npm run run:sandbox`}</CodeBlock>
      </DocSection>
      <DocSection title="Day 2–3 · Skill + Ingress">
        <p>
          Decision Skill：Context →{" "}
          <code className="rounded bg-white/80 px-1">signal / insight / gap</code>
          。提交 Ingress 批，处理{" "}
          <code className="rounded bg-white/80 px-1">accepted / rejected</code>。
        </p>
        <CodeBlock>{`const mk = createAgentClient({
  agentId: "partner.acme.diagnosis",
  clientSecret: process.env.MK_AGENT_SECRET!,
  baseUrl: "http://localhost:3000/api",
});
const ctx = await mk.sandbox.getRestaurantFixture("changsha-xiangcai-a");
await mk.submitIngress({ /* IngressBatchV1 */ });`}</CodeBlock>
      </DocSection>
      <DocSection title="Day 4–7 · Manifest · UI · 提审">
        <ul className="list-disc space-y-1 pl-5">
          <li>登记 Manifest（capabilityIds · maxInsightLevel≤3）</li>
          <li>Agent UI 五段旅程（实现外置）</li>
          <li>Handoff 回今日；提审包对照宪法索引清单</li>
        </ul>
        <p className="mt-3">
          完整日课见仓内文档{" "}
          <code className="rounded bg-white/80 px-1 text-[12px]">
            docs/MEALKEY_AGENT_DEVELOPER_ONBOARDING_7DAY_V1.md
          </code>
          。样板：
          <Link
            href="/developers/examples/m-ops"
            className="ml-1 font-medium text-[#465240] underline-offset-2 hover:underline"
          >
            M-OPS Example
          </Link>
          。
        </p>
      </DocSection>
    </DocsLayout>
  );
}
