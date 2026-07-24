import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { DeveloperShell } from "./_components/developer-portal";

export const metadata: Metadata = {
  title: "Mealkey Developers",
  description: "Build AI Agents for Restaurant Intelligence on MealKey OS.",
};

export default function DevelopersHomePage() {
  return (
    <DeveloperShell activePath="/developers">
      <main className="mx-auto max-w-6xl px-5 pb-16 pt-10 md:px-8 md:pt-14">
        {/* Hero：左文右图 */}
        <section className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12">
          <div>
            <p className="text-[11px] font-medium tracking-[0.12em] text-[#66735E]">
              DEVELOPER HUB · P0.1
            </p>
            <h1 className="mt-3 font-display text-[32px] font-semibold leading-[1.08] tracking-[-0.045em] text-[#171717] md:text-[42px]">
              Build AI Agents
              <br />
              for Restaurant Intelligence
            </h1>
            <p className="mt-4 max-w-lg text-[16px] leading-7 text-[#3a3d41] md:text-[17px]">
              让每一个餐饮经营者拥有下一代 AI 能力。
              <br />
              Agent ≠ Chatbot — Context in, Ports out, 拍板留在 OS。
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="/developers/start"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[12px] bg-[#181817] px-5 text-[15px] font-semibold text-white transition hover:bg-[#2a2a28]"
              >
                开始创建 Agent
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/developers/examples/m-ops"
                className="inline-flex min-h-12 items-center justify-center rounded-[12px] border border-[rgba(24,24,23,0.12)] bg-white/70 px-5 text-[15px] font-semibold text-[#202124]"
              >
                查看官方示例
              </Link>
              <Link
                href="/developers/docs"
                className="inline-flex min-h-12 items-center justify-center rounded-[12px] px-4 text-[14px] font-medium text-[#465240] underline-offset-2 hover:underline"
              >
                查看技术文档
              </Link>
            </div>
          </div>

          <div
            aria-hidden
            className="relative mx-auto w-full max-w-md rounded-[20px] border border-[rgba(24,24,23,0.08)] bg-white/55 px-6 py-8 shadow-[0_20px_50px_rgba(24,24,23,0.04)]"
          >
            <p className="text-center text-[12px] font-medium tracking-[0.08em] text-[#66735E]">
              AGENT → OS → BRAIN → DECISION
            </p>
            <div className="mt-6 flex flex-col items-center gap-3 text-center">
              {[
                { label: "Agent", sub: "餐厅经营体检系统" },
                { label: "MealKey Operating System", sub: "Gateway · Protocol" },
                { label: "Restaurant Brain", sub: "Context 租用" },
                { label: "Business Decision", sub: "今日 · 拍板 · 执行" },
              ].map((row, i) => (
                <div key={row.label} className="w-full">
                  {i > 0 ? (
                    <div className="mx-auto mb-3 h-4 w-px bg-[rgba(24,24,23,0.18)]" />
                  ) : null}
                  <div className="rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-[#F7F5EF] px-4 py-3">
                    <p className="text-[14px] font-semibold text-[#171717]">{row.label}</p>
                    <p className="mt-0.5 text-[12px] text-[#6f747b]">{row.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Why MealKey */}
        <section className="mt-16 border-t border-[rgba(24,24,23,0.1)] pt-10 md:mt-20">
          <h2 className="font-display text-[24px] font-semibold tracking-[-0.03em] text-[#171717] md:text-[28px]">
            Why MealKey?
          </h2>
          <p className="mt-2 max-w-xl text-[14px] leading-6 text-[#5f6368]">
            不讲参数墙。讲生态：你的能力如何进入真实经营场景。
          </p>
          <div className="mt-8 grid gap-8 md:grid-cols-3 md:gap-6">
            {[
              {
                title: "Context Ready",
                before: "Agent + 用户输入",
                after: "Agent + Restaurant Context + Evidence",
                note: "不需要重新采集餐厅信息。",
              },
              {
                title: "Decision Connected",
                before: "孤岛应用",
                after: "Today’s Cockpit · Decision Room · Execution",
                note: "能力进入 OS 决策与执行管线。",
              },
              {
                title: "Marketplace Distribution",
                before: "一次开发、一家客户",
                after: "一次开发 → 餐饮老板 · 场景 · 收入",
                note: "安装≠下载包；经 Store 授权到门店。",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="border-t border-[rgba(24,24,23,0.12)] pt-5"
              >
                <h3 className="font-display text-[18px] font-semibold tracking-[-0.02em] text-[#171717]">
                  {card.title}
                </h3>
                <p className="mt-3 text-[12px] leading-5 text-[#8a8f98] line-through decoration-[rgba(24,24,23,0.25)]">
                  {card.before}
                </p>
                <p className="mt-1 text-[13px] font-medium leading-6 text-[#3a3d41]">
                  {card.after}
                </p>
                <p className="mt-3 text-[13px] leading-6 text-[#5f6368]">{card.note}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 flex flex-wrap gap-x-6 gap-y-2 border-t border-[rgba(24,24,23,0.08)] pt-8 text-[13px]">
          <Link
            href="/developers/sdk"
            className="font-medium text-[#465240] underline-offset-2 hover:underline"
          >
            Developer Kit
          </Link>
          <Link
            href="/developers/docs/constitution"
            className="font-medium text-[#465240] underline-offset-2 hover:underline"
          >
            宪法索引
          </Link>
            <Link
              href="/developers/console"
              className="font-medium text-[#465240] underline-offset-2 hover:underline"
            >
              Console
            </Link>
            <Link
              href="/developers/apply"
              className="font-medium text-[#465240] underline-offset-2 hover:underline"
            >
              入驻申请
            </Link>
          <Link
            href="/developers/examples/m-ops"
            className="font-medium text-[#465240] underline-offset-2 hover:underline"
          >
            M-OPS Official Reference
          </Link>
        </section>
      </main>
    </DeveloperShell>
  );
}
