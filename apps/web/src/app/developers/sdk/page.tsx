import type { Metadata } from "next";
import Link from "next/link";

import {
  CodeBlock,
  DocHeader,
  DocSection,
  DeveloperShell,
} from "../_components/developer-portal";

export const metadata: Metadata = {
  title: "Developer Kit · Mealkey Developers",
};

export default function SdkPage() {
  return (
    <DeveloperShell activePath="/developers/sdk">
      <main className="mx-auto max-w-3xl px-5 py-10 md:px-8">
        <DocHeader
          eyebrow="DEVELOPER KIT"
          title="Developer Kit"
          description="不是「下载中心」。一套接入经营能力协议的工具包：SDK · 沙箱 · 样板 ·（P1）CLI / Manifest Generator。"
          authority="MEALKEY_AGENT_SDK_V1 · EXTERNAL_INTERFACE §7 · UI/UX §9"
        />

        <DocSection title="包含">
          <ul className="list-disc space-y-1.5 pl-5">
            <li>MealKey Agent SDK（TypeScript 真源）</li>
            <li>Sandbox Tool（fixture + Gateway）</li>
            <li>Example Agent（M-OPS Official Reference）</li>
            <li>CLI / Manifest Generator — P1 Console 内</li>
            <li>Python SDK — P1+ 预告</li>
          </ul>
        </DocSection>

        <DocSection title="安装">
          <CodeBlock>{`npm install @mealkey/agent-sdk

# 样板仓内也可直接依赖 workspace 包并：
npm install
npm test
npm run run:sandbox`}</CodeBlock>
        </DocSection>

        <DocSection title="最小表面">
          <CodeBlock>{`createAgentClient({ agentId, secret, baseUrl })
client.getRestaurantContext(restaurantId, scopes[])
client.submitIngress(batch)
client.submitLearning(event)

// baseUrl = "{origin}/api"
// 签名 path 仍为 /v1/gateway/...
// 禁止依赖 @mealkey/restaurant-brain 内部包 / Prisma`}</CodeBlock>
        </DocSection>

        <DocSection title="下一步">
          <div className="flex flex-wrap gap-4">
            <Link
              href="/developers/start"
              className="font-medium text-[#465240] underline-offset-2 hover:underline"
            >
              Quick Start
            </Link>
            <Link
              href="/developers/examples/m-ops"
              className="font-medium text-[#465240] underline-offset-2 hover:underline"
            >
              M-OPS Example
            </Link>
            <Link
              href="/developers/apply"
              className="font-medium text-[#465240] underline-offset-2 hover:underline"
            >
              入驻申请
            </Link>
          </div>
        </DocSection>
      </main>
    </DeveloperShell>
  );
}
