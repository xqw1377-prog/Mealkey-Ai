import type { Metadata } from "next";

import {
  CodeBlock,
  DocHeader,
  DocLinkList,
  DocSection,
  DocsLayout,
} from "../_components/developer-portal";

export const metadata: Metadata = {
  title: "Docs · Mealkey Developers",
};

export default function DocsIndexPage() {
  return (
    <DocsLayout activePath="/developers/docs">
      <DocHeader
        eyebrow="DOCUMENTATION"
        title="开发者文档"
        description="先读宪法索引，再按 Quick Start 七天上手。页面只投影冻结文档，不改 Schema。"
        authority="MEALKEY_DEVELOPER_PORTAL_V1 · MEALKEY_AGENT_DEVELOPER_CONSTITUTION_INDEX_V1"
      />
      <DocSection title="推荐阅读顺序">
        <DocLinkList
          items={[
            {
              href: "/developers/docs/quick-start",
              label: "Quick Start",
              note: "7 日上手",
            },
            {
              href: "/developers/docs/constitution",
              label: "宪法索引",
              note: "六块总览 + 提审清单",
            },
            {
              href: "/developers/docs/protocol",
              label: "Agent Protocol",
              note: "能力标准化",
            },
            {
              href: "/developers/docs/context-api",
              label: "Context API",
            },
            {
              href: "/developers/docs/ingress-api",
              label: "Ingress API",
            },
            {
              href: "/developers/docs/manifest",
              label: "Manifest",
            },
            {
              href: "/developers/docs/security",
              label: "Security",
            },
            {
              href: "/developers/sdk",
              label: "SDK",
            },
            {
              href: "/developers/examples/m-ops",
              label: "M-OPS Example",
            },
          ]}
        />
      </DocSection>
      <DocSection title="铁律（摘要）">
        <CodeBlock>{`❌ Agent → Prisma / 内部 tRPC / 私写 Memory
✅ Agent → Gateway → ContextPackage / Ingress Ports
默认 maxInsightLevel ≤ 3；禁止拍板句`}</CodeBlock>
      </DocSection>
    </DocsLayout>
  );
}
