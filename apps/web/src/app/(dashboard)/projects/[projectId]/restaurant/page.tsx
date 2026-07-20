"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { PageContent } from "@/components/operating/PageContent";
import {
  PageEmptyState,
  PageErrorState,
  PageLoadingState,
} from "@/components/operating/PageState";
import { useProjectId } from "@/hooks/useProjectId";
import { trpc } from "@/lib/trpc";

function pct(n: number | null | undefined) {
  if (typeof n !== "number" || Number.isNaN(n)) return "未知";
  if (n <= 1) return `${Math.round(n * 100)}%`;
  return `${Math.round(n)}%`;
}

export default function MyRestaurantPage() {
  const projectId = useProjectId() || "";
  const utils = trpc.useUtils();

  const overview = trpc.restaurantBrain.getOverview.useQuery(
    { projectId },
    { enabled: Boolean(projectId) },
  );
  const decisions = trpc.restaurantBrain.listDecisions.useQuery(
    { projectId, take: 8 },
    { enabled: Boolean(projectId) },
  );
  const seed = trpc.restaurantBrain.seedGoldenScenario.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.restaurantBrain.getOverview.invalidate({ projectId }),
        utils.restaurantBrain.listDecisions.invalidate({ projectId }),
        utils.restaurantBrain.listEvents.invalidate({ projectId }),
      ]);
    },
  });

  if (!projectId) {
    return (
      <PageEmptyState
        eyebrow="我的餐厅"
        title="先选一家企业"
        description="Restaurant Brain 挂在项目上。"
        primaryAction={{ href: "/projects", label: "我的企业" }}
      />
    );
  }

  if (overview.isLoading) {
    return (
      <PageLoadingState
        eyebrow="我的餐厅"
        title="正在读取经营大脑…"
        description="加载事实、决策历史与理解度。"
      />
    );
  }

  if (overview.error || !overview.data) {
    return (
      <PageErrorState
        eyebrow="我的餐厅"
        title="暂时读不到"
        description={overview.error?.message || "稍后重试，或先回今日。"}
        primaryAction={{ href: "/dashboard", label: "回今日" }}
        secondaryAction={{
          href: `/projects/${projectId}/decision-case`,
          label: "发起决策",
        }}
      />
    );
  }

  const data = overview.data;
  return (
    <PageContent width="narrow" inset="shell" className="space-y-8">
      <header className="space-y-2">
        <p className="text-[11px] tracking-[0.14em] text-[#66735E]">我的餐厅</p>
        <h1 className="font-display text-[30px] font-semibold leading-none tracking-[-0.04em] text-[#202124] md:text-[36px]">
          {data.name}
        </h1>
        <p className="text-[14px] leading-6 text-[#6f747b]">
          {[
            data.profile.category || null,
            data.profile.city || null,
            data.profile.stage,
            `门店 ${data.profile.storeCount}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>

      <section className="space-y-3 border-y border-[rgba(24,24,23,0.1)] py-6">
        <p className="text-[11px] tracking-[0.12em] text-[#66735E]">认知状态</p>
        <p className="text-[15px] leading-7 text-[#202124]">
          理解度 {data.understandingScore}% · 完整度 {data.dataCompleteness}% ·
          决策 {data.decisionCount} · 学习 {data.learningCount}
        </p>
        <p className="text-[15px] leading-7 text-[#202124]">
          <span className="text-[#6f747b]">能力：</span>
          综合 {data.capability.overall} · 组织 {data.capability.organization} ·
          财务 {data.capability.finance}
          {data.capability.confidence < 0.3 ? "（置信偏低）" : ""}
        </p>
        <p className="text-[15px] leading-7 text-[#202124]">
          <span className="text-[#6f747b]">经营：</span>
          净利率 {pct(data.business.netMargin)}
          {data.business.monthlyRevenue != null
            ? ` · 月营收 ${Math.round(data.business.monthlyRevenue / 10000)} 万`
            : ""}
        </p>
        <p className="text-[15px] leading-7 text-[#202124]">
          <span className="text-[#6f747b]">老板：</span>
          {data.founder.decisionStyle || "风格未知"} · 风险偏好{" "}
          {data.founder.riskPreference || "未知"}
        </p>
      </section>

      {data.unknowns.length > 0 ? (
        <section className="space-y-2">
          <p className="text-[12px] tracking-[0.08em] text-[#6f747b]">
            未知（系统不会编造）
          </p>
          <ul className="space-y-1 text-[14px] leading-6 text-[#202124]">
            {data.unknowns.slice(0, 6).map((u) => (
              <li key={u}>· {u}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-[12px] tracking-[0.08em] text-[#66735E]">
            决策历史
          </p>
          <Link
            href={`/projects/${projectId}/decisions`}
            prefetch={false}
            className="text-[13px] font-medium text-[#66735E] no-underline"
          >
            全部行动 →
          </Link>
        </div>
        {(decisions.data?.decisions.length ?? 0) === 0 ? (
          <p className="text-[14px] leading-6 text-[#6f747b]">
            还没有 Brain 决策记录。开一次会并形成决策后会出现在这里。
          </p>
        ) : (
          <ul className="space-y-4">
            {decisions.data!.decisions.map((d) => (
              <li key={d.id} className="space-y-1">
                <p className="text-[15px] font-medium leading-snug text-[#202124]">
                  {d.question}
                </p>
                <p className="text-[13px] leading-5 text-[#6f747b]">
                  {d.chosenOption || "未选"} · {d.status}
                  {d.mkDecisionId ? " · 已关联 Decision" : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 border-t border-[rgba(24,24,23,0.08)] pt-6">
        <p className="text-[11px] tracking-[0.12em] text-[#66735E]">下一步</p>
        <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
          <Link
            href={`/projects/${projectId}/decision-case`}
            prefetch={false}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-[#181817] px-5 text-[15px] font-semibold text-white no-underline touch-manipulation active:scale-[0.98]"
          >
            要不要开第二家
            <Sparkles className="h-4 w-4" />
          </Link>
          <Link
            href={`/projects/${projectId}/decision-room?topic=${encodeURIComponent("我现在最该先决定什么？")}`}
            prefetch={false}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] border border-[rgba(24,24,23,0.15)] bg-white px-5 text-[15px] font-semibold text-[#181817] no-underline touch-manipulation"
          >
            发起经营决策
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <details className="pt-2">
          <summary className="cursor-pointer text-[12px] text-[#6f747b]">
            开发：写入扩张演示事实
          </summary>
          <div className="mt-3 space-y-2">
            <p className="text-[13px] leading-6 text-[#6f747b]">
              写入「一家店扩张」演示事实，供 Agent 读取组织 / 利润 / 历史风险。
            </p>
            <button
              type="button"
              disabled={seed.isPending}
              onClick={() => seed.mutate({ projectId })}
              className="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-[rgba(24,24,23,0.12)] bg-white px-4 text-[13px] font-medium text-[#202124] touch-manipulation disabled:opacity-60"
            >
              {seed.isPending ? "写入中…" : "写入扩张场景事实"}
            </button>
            {seed.isSuccess ? (
              <p className="text-[13px] leading-5 text-[#66735E]">
                {seed.data.hint}
              </p>
            ) : null}
            {seed.error ? (
              <p className="text-[13px] leading-5 text-[#B47C5C]">
                {seed.error.message}
              </p>
            ) : null}
          </div>
        </details>
      </section>

      <section className="space-y-2 border-t border-[rgba(24,24,23,0.08)] pt-6">
        <p className="text-[11px] tracking-[0.1em] text-[#6f747b]">
          Agent 看到的短文
        </p>
        <pre className="whitespace-pre-wrap rounded-[14px] bg-[#FBFAF7] p-4 text-[12px] leading-5 text-[#3a3d41]">
          {data.priorBlock}
        </pre>
        <Link
          href={`/projects/${projectId}`}
          prefetch={false}
          className="inline-flex items-center gap-1 text-[13px] font-medium text-[#66735E] no-underline underline-offset-4 hover:underline"
        >
          回企业页
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </section>
    </PageContent>
  );
}
