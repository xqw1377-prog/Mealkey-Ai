import type { Metadata } from "next";
import Link from "next/link";

import {
  CodeBlock,
  DocHeader,
  DocSection,
  DeveloperShell,
} from "../../_components/developer-portal";

export const metadata: Metadata = {
  title: "餐厅经营体检系统 · Mealkey Developers",
};

export default function MOpsExamplePage() {
  return (
    <DeveloperShell activePath="/developers/examples/m-ops">
      <main className="mx-auto max-w-3xl px-5 py-10 md:px-8">
        <DocHeader
          eyebrow="REFERENCE · 餐启"
          title="餐厅经营体检系统"
          description="官方 Hello World Agent：用户产品 + 开发模板 + 教材。外置实现，经 Gateway 接入；禁止回流 Core。"
          authority="M_OPS_AGENT_AS_REFERENCE_IMPLEMENTATION_V1 · M_OPS_DIAG_EXTERNAL_POINTER_V1"
        />
        <DocSection title="它示范什么">
          <ul className="list-disc space-y-1 pl-5">
            <li>如何租用 Context</li>
            <li>如何组织 Evidence</li>
            <li>如何输出 Signal / Insight / Gap</li>
            <li>如何 Handoff 进今日 / 拍板候选（不在 Agent 内拍板）</li>
          </ul>
        </DocSection>
        <DocSection title="本地仓">
          <CodeBlock>{`路径（开发机）:
C:\\Users\\xqw13\\M-OPS-Agent

npm install
npm test
npm run web:dev          # 体检 Agent UI（餐启 logo）
npm run run:sandbox      # → Gateway`}</CodeBlock>
          <p className="text-[13px] text-[#6f747b]">
            Gateway id：restaurant-diagnosis · 中文名：餐厅经营体检系统 · maxInsightLevel 3
          </p>
        </DocSection>
        <DocSection title="对照文档">
          <p>
            <Link
              href="/developers/docs/quick-start"
              className="font-medium text-[#465240] underline-offset-2 hover:underline"
            >
              Quick Start
            </Link>
            {" · "}
            <Link
              href="/developers/docs/constitution"
              className="font-medium text-[#465240] underline-offset-2 hover:underline"
            >
              提审清单
            </Link>
            {" · "}
            <Link
              href="/developers/docs/manifest"
              className="font-medium text-[#465240] underline-offset-2 hover:underline"
            >
              Manifest
            </Link>
          </p>
        </DocSection>
      </main>
    </DeveloperShell>
  );
}
