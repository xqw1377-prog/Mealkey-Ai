import Link from "next/link";
import { Activity, ArrowRight, CheckCheck, Clock3, Coins, ReceiptText, TriangleAlert } from "lucide-react";

import { MKPageHeader } from "@/components/operating";
import { PlatformDeniedState } from "@/components/operating/PlatformDeniedState";
import { formatNumber } from "@/lib/format";
import { getAuthenticatedUser, requirePlatformAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getPlatformOverview } from "@/server/services/platform-dashboard.service";

const WINDOW_OPTIONS = [
  { label: "24h", value: 24 },
  { label: "7d", value: 24 * 7 },
  { label: "30d", value: 24 * 30 },
] as const;

function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return `${value}%`;
}

function formatCost(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return `¥${value.toFixed(4)}`;
}

export default async function PlatformPage({
  searchParams,
}: {
  searchParams?: { hours?: string };
}) {
  try {
    await requirePlatformAdmin();
    const requestedHours = Number(searchParams?.hours);
    const hours = Number.isFinite(requestedHours)
      ? Math.max(1, Math.min(24 * 30, requestedHours))
      : 24;

    const overview = await getPlatformOverview(prisma, { hours });

    return (
      <div className="space-y-5 pb-2">
        <MKPageHeader
          eyebrow="平台"
          title="Agent Runtime Monitor"
          description="这里直接看平台事实层，不看页面投机口径。"
          badge={
            <div className="inline-flex min-h-7 items-center rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">
              Event Driven
            </div>
          }
        />

        <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-[linear-gradient(180deg,#fbfaf7_0%,#eef1ea_100%)] p-4 shadow-[0_14px_30px_rgba(24,24,23,0.04)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <p className="text-[13px] leading-5 tracking-[0.01em] text-[#66735E]">观测窗口</p>
              <h2 className="text-[22px] leading-[1.15] tracking-[-0.03em] text-[#202124] md:text-[28px]">
                最近 {overview.window.hours} 小时的平台运行概览
              </h2>
              <p className="text-[14px] leading-[1.7] text-[#6f747b]">
                从 {overview.window.startAt} 到 {overview.window.endAt}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 md:w-auto">
              {WINDOW_OPTIONS.map((option) => {
                const active = overview.window.hours === option.value;
                return (
                  <Link
                    key={option.value}
                    href={`/platform?hours=${option.value}`}
                    className={`inline-flex min-h-10 items-center justify-center rounded-[14px] px-3 text-[14px] font-semibold no-underline transition active:scale-[0.98] ${
                      active
                        ? "bg-[#181817] text-white"
                        : "border border-[rgba(24,24,23,0.08)] bg-white text-[#202124]"
                    }`}
                  >
                    {option.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <div className="rounded-[20px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_12px_28px_rgba(24,24,23,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">Run 成功率</p>
              <Activity className="h-4 w-4 text-[#66735E]" />
            </div>
            <p className="mt-3 text-[28px] font-semibold leading-none tracking-[-0.03em] text-[#202124]">
              {formatPercent(overview.runtime.successRate)}
            </p>
            <p className="mt-2 text-[14px] leading-6 text-[#6f747b]">
              完成 {formatNumber(overview.runtime.runsCompleted)} / 失败 {formatNumber(overview.runtime.runsFailed)}
            </p>
          </div>

          <div className="rounded-[20px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_12px_28px_rgba(24,24,23,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">平均延迟</p>
              <Clock3 className="h-4 w-4 text-[#66735E]" />
            </div>
            <p className="mt-3 text-[28px] font-semibold leading-none tracking-[-0.03em] text-[#202124]">
              {formatNumber(overview.runtime.averageLatencyMs)}
            </p>
            <p className="mt-2 text-[14px] leading-6 text-[#6f747b]">单位 ms，只统计 `run.completed`。</p>
          </div>

          <div className="rounded-[20px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_12px_28px_rgba(24,24,23,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">Token 总量</p>
              <Coins className="h-4 w-4 text-[#66735E]" />
            </div>
            <p className="mt-3 text-[28px] font-semibold leading-none tracking-[-0.03em] text-[#202124]">
              {formatNumber(overview.usage.tokenTotal)}
            </p>
            <p className="mt-2 text-[14px] leading-6 text-[#6f747b]">
              输入 {formatNumber(overview.usage.tokenInput)} / 输出 {formatNumber(overview.usage.tokenOutput)}
            </p>
          </div>

          <div className="rounded-[20px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_12px_28px_rgba(24,24,23,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">底层成本</p>
              <ReceiptText className="h-4 w-4 text-[#66735E]" />
            </div>
            <p className="mt-3 text-[28px] font-semibold leading-none tracking-[-0.03em] text-[#202124]">
              {formatCost(overview.usage.costTotal)}
            </p>
            <p className="mt-2 text-[14px] leading-6 text-[#6f747b]">
              billable 事件 {formatNumber(overview.usage.billableCount)} 条
            </p>
          </div>

          <div className="rounded-[20px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_12px_28px_rgba(24,24,23,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">决策采纳率</p>
              <CheckCheck className="h-4 w-4 text-[#66735E]" />
            </div>
            <p className="mt-3 text-[28px] font-semibold leading-none tracking-[-0.03em] text-[#202124]">
              {formatPercent(overview.intelligence.decisionAcceptanceRate)}
            </p>
            <p className="mt-2 text-[14px] leading-6 text-[#6f747b]">
              创建 {formatNumber(overview.intelligence.decisionCreated)} / 采纳 {formatNumber(overview.intelligence.decisionAccepted)} / 驳回 {formatNumber(overview.intelligence.decisionRejected)}
            </p>
          </div>
        </section>

        <section className="grid gap-3 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_14px_28px_rgba(24,24,23,0.04)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">Recent Events</p>
                <h2 className="mt-1 text-[18px] font-semibold leading-[1.25] tracking-[-0.02em] text-[#202124]">
                  最新事件流
                </h2>
              </div>
              <p className="text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">
                共 {formatNumber(overview.totals.platformEvents)} 条事件
              </p>
            </div>

            <div className="mt-5 space-y-3">
              {overview.recentEvents.length > 0 ? (
                overview.recentEvents.map((event) => (
                  <div
                    key={event.eventId}
                    className="rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] p-3"
                  >
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold leading-6 text-[#202124]">{event.eventName}</p>
                        <p className="text-[13px] leading-5 text-[#6f747b]">
                          {event.entityType} · {event.entityId}
                        </p>
                        <p className="mt-1 break-all text-[13px] leading-5 text-[#6f747b]">
                          producer: {event.producer} · source: {event.source}
                        </p>
                      </div>
                      <div className="text-[12px] leading-5 text-[#6f747b]">{event.occurredAt}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] p-4">
                  <p className="text-[14px] leading-6 text-[#6f747b]">当前窗口还没有平台事件。</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_14px_28px_rgba(24,24,23,0.04)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">Runtime Risk</p>
                  <h2 className="mt-1 text-[18px] font-semibold leading-[1.25] tracking-[-0.02em] text-[#202124]">
                    错误热点
                  </h2>
                </div>
                <TriangleAlert className="h-4 w-4 text-[#B47C5C]" />
              </div>

              <div className="mt-5 space-y-3">
                {overview.runtime.topErrorCodes.length > 0 ? (
                  overview.runtime.topErrorCodes.map((item) => (
                    <div
                      key={item.code}
                      className="flex items-center justify-between gap-3 rounded-[16px] border border-[rgba(180,124,92,0.10)] bg-[rgba(180,124,92,0.04)] px-4 py-3"
                    >
                      <span className="text-[14px] font-medium text-[#202124]">{item.code}</span>
                      <span className="text-[14px] text-[#6f747b]">{formatNumber(item.count)} 次</span>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] p-4">
                    <p className="text-[14px] leading-6 text-[#6f747b]">当前窗口没有 trace failure。</p>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_14px_28px_rgba(24,24,23,0.04)]">
              <div>
                <p className="text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">Decision Funnel</p>
                <h2 className="mt-1 text-[18px] font-semibold leading-[1.25] tracking-[-0.02em] text-[#202124]">
                  决策状态流
                </h2>
              </div>

              <div className="mt-5 grid gap-3">
                {[
                  { label: "Decision Created", value: overview.intelligence.decisionCreated },
                  { label: "Decision Accepted", value: overview.intelligence.decisionAccepted },
                  { label: "Decision Rejected", value: overview.intelligence.decisionRejected },
                  { label: "Decision Executed", value: overview.intelligence.decisionExecuted },
                  { label: "Acceptance Rate", value: formatPercent(overview.intelligence.decisionAcceptanceRate) },
                  { label: "Rejection Rate", value: formatPercent(overview.intelligence.decisionRejectionRate) },
                  { label: "Execution Rate", value: formatPercent(overview.intelligence.decisionExecutionRate) },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-3 rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] px-4 py-3"
                  >
                    <span className="text-[14px] font-medium text-[#202124]">{item.label}</span>
                    <span className="text-[14px] text-[#6f747b]">
                      {typeof item.value === "number" ? formatNumber(item.value) : item.value}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_14px_28px_rgba(24,24,23,0.04)]">
              <div>
                <p className="text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">Projection Health</p>
                <h2 className="mt-1 text-[18px] font-semibold leading-[1.25] tracking-[-0.02em] text-[#202124]">
                  当前事实层规模
                </h2>
              </div>

              <div className="mt-5 grid gap-3">
                {[
                  { label: "PlatformEvent", value: overview.totals.platformEvents },
                  { label: "UsageRecord", value: overview.totals.usageRecords },
                  { label: "AgentTrace", value: overview.totals.traces },
                  { label: "AgentOutcome", value: overview.totals.outcomes },
                  { label: "DecisionEvent", value: overview.totals.decisionEvents },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between gap-3 rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] px-4 py-3"
                  >
                    <span className="text-[14px] font-medium text-[#202124]">{item.label}</span>
                    <span className="text-[14px] text-[#6f747b]">{formatNumber(item.value)}</span>
                  </div>
                ))}
              </div>

              <div className="mt-5 grid gap-2">
                <Link
                  href="/platform/admin"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-white px-4 text-[15px] font-semibold text-[#202124] no-underline transition active:scale-[0.98]"
                >
                  <span>进入平台管理端</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] bg-[#181817] px-4 text-[15px] font-semibold text-white no-underline transition active:scale-[0.98]"
                >
                  <span>回到今日</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/projects"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#F5F3EE] px-4 text-[15px] font-semibold text-[#202124] no-underline transition active:scale-[0.98]"
                >
                  <span>我的企业</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </section>
          </div>
        </section>
      </div>
    );
  } catch (error) {
    const user = await getAuthenticatedUser();
    return (
      <PlatformDeniedState
        surface="observe"
        error={error}
        currentEmail={user?.email}
      />
    );
  }
}
