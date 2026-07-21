import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import {
  CodeBlock,
  DeveloperShell,
  DocHeader,
  DocSection,
} from "../_components/developer-portal";

export const metadata: Metadata = {
  title: "Start · Mealkey Developers",
  description: "7 天完成第一个合规 MealKey Agent。",
};

const ENTRIES = [
  {
    title: "① Build from SDK",
    body: "用 TypeScript SDK 从零搭 Skill + Ingress。",
    href: "/developers/sdk",
    cta: "打开 Developer Kit",
  },
  {
    title: "② Fork Example",
    body: "对照 M-OPS Official Reference，复制合规路径。",
    href: "/developers/examples/m-ops",
    cta: "打开 M-OPS",
  },
  {
    title: "③ Connect Existing Agent",
    body: "已有服务：登记 Manifest · 接 Gateway · 跑 Sandbox。",
    href: "/developers/apply",
    cta: "先入驻申请",
  },
] as const;

export default function DevelopersStartPage() {
  return (
    <DeveloperShell activePath="/developers/start">
      <main className="mx-auto max-w-3xl px-5 py-10 md:px-8">
        <DocHeader
          eyebrow="GETTING STARTED"
          title="7 天快速开始"
          description="目标：理解 → 注册 → 开发 → 测试 → 提交 → 上架。P0 先打通理解与本地开发；Console 写入在 P1。"
          authority="MEALKEY_AGENT_DEVELOPER_ONBOARDING_7DAY_V1 · UI/UX §3"
        />

        <DocSection title="Step 0 · 选择开发方式">
          <div className="space-y-4">
            {ENTRIES.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="block border-t border-[rgba(24,24,23,0.1)] pt-4 no-underline transition hover:border-[#66735E]"
              >
                <p className="font-display text-[17px] font-semibold text-[#171717]">
                  {item.title}
                </p>
                <p className="mt-1 text-[14px] leading-6 text-[#5f6368]">{item.body}</p>
                <span className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-[#465240]">
                  {item.cta}
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            ))}
          </div>
        </DocSection>

        <DocSection title="本地最小闭环">
          <CodeBlock>{`# A · MealKey OS
npm run dev -w @mealkey/web

# B · 样板仓 M-OPS-Agent
set MK_GATEWAY_URL=http://localhost:3000/api
set MK_AGENT_SECRET=mk-sandbox-agent-secret
npm run run:sandbox

# 验收：拿到 ContextPackageV1，再 submitIngress`}</CodeBlock>
        </DocSection>

        <DocSection title="日课地图">
          <ul className="list-disc space-y-1.5 pl-5 text-[14px] leading-6">
            <li>Day 0–1：边界 + Hello Context</li>
            <li>Day 2–3：Decision Skill + Ingress</li>
            <li>Day 4：Manifest（maxInsightLevel≤3）</li>
            <li>Day 5–6：Agent UI 五段 + Handoff 今日</li>
            <li>Day 7：提审包（对照宪法索引清单）</li>
          </ul>
          <p className="mt-4">
            <Link
              href="/developers/docs/quick-start"
              className="font-medium text-[#465240] underline-offset-2 hover:underline"
            >
              详细 Quick Start 文档
            </Link>
            {" · "}
            <Link
              href="/developers/docs/constitution"
              className="font-medium text-[#465240] underline-offset-2 hover:underline"
            >
              提审清单
            </Link>
          </p>
        </DocSection>

        <div className="mt-10 rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-white/70 px-4 py-4 text-[13px] leading-6 text-[#5f6368]">
          已开放{" "}
          <Link href="/developers/console" className="font-medium text-[#465240] underline-offset-2 hover:underline">
            Developer Console
          </Link>
          ：创建 Agent · Sandbox · 提交审核。请先{" "}
          <Link href="/developers/apply" className="font-medium text-[#465240] underline-offset-2 hover:underline">
            入驻申请
          </Link>
          ，并用同一邮箱登录。
        </div>
      </main>
    </DeveloperShell>
  );
}
