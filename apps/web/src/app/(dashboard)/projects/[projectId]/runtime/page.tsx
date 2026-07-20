"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { BrandSwitcher } from "@/components/operating/BrandSwitcher";
import { PageContent } from "@/components/operating/PageContent";
import { PageErrorState, PageLoadingState } from "@/components/operating/PageState";
import {
  DecisionRuntimePanel,
  ExecutionRuntimePanel,
  GrowthRuntimePanel,
  MemoryRuntimePanel,
  OpportunityRuntimePanel,
  RiskRuntimePanel,
} from "@/components/operating/runtime";
import { useProjectId } from "@/hooks/useProjectId";
import { buildMeetingHref, detectDepartmentFromTopic } from "@/lib/meeting";
import { trpc } from "@/lib/trpc";

const TABS = [
  {
    id: "memory",
    no: "01",
    label: "记忆",
    feel: "开会前先翻翻记得住的",
    now: "带着记忆去开会",
  },
  {
    id: "risk",
    no: "02",
    label: "风险",
    feel: "先处理会出事的",
    now: "高风险先复会",
  },
  {
    id: "opportunity",
    no: "03",
    label: "机会",
    feel: "值得研究的候选",
    now: "开会判断值不值得做",
  },
  {
    id: "growth",
    no: "04",
    label: "成长",
    feel: "短板与下一步",
    now: "用真实议题补能力",
  },
  {
    id: "decision",
    no: "05",
    label: "决策",
    feel: "给已有决定补意见",
    now: "补证据，不改原判断",
  },
  {
    id: "execution",
    no: "06",
    label: "执行",
    feel: "今日动作与偏航",
    now: "勾进度，偏了再复会",
  },
] as const;

type TabId = (typeof TABS)[number]["id"];

function isTabId(value: string | null): value is TabId {
  return TABS.some((t) => t.id === value);
}

export default function RuntimeHubPage() {
  const projectId = useProjectId() || "";
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const [tab, setTab] = useState<TabId>(() =>
    isTabId(tabFromUrl) ? tabFromUrl : "risk",
  );
  const [selectedDecisionId, setSelectedDecisionId] = useState<string>("");
  const [memoryTopic, setMemoryTopic] = useState("");

  useEffect(() => {
    if (isTabId(tabFromUrl)) {
      setTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  function selectTab(next: TabId) {
    setTab(next);
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  const { data: homeResponse, isLoading: homeLoading } =
    trpc.dashboard.getHome.useQuery(
      { projectId },
      { enabled: Boolean(projectId) },
    );
  const home = homeResponse?.home ?? null;
  const { data: brands } = trpc.project.listBrands.useQuery(
    { projectId },
    { enabled: Boolean(projectId) },
  );
  const { data: riskData } = trpc.riskRuntime.listOpen.useQuery(
    { projectId },
    {
      enabled:
        Boolean(projectId) &&
        (tab === "risk" || tab === "opportunity" || tab === "memory"),
    },
  );
  const { data: oppData } = trpc.opportunityRuntime.listOpen.useQuery(
    { projectId },
    {
      enabled:
        Boolean(projectId) && (tab === "opportunity" || tab === "risk"),
    },
  );
  const { data: decisionsData, isLoading: decisionsLoading } =
    trpc.decisionArchive.list.useInfiniteQuery(
      { projectId, limit: 12 },
      {
        enabled:
          Boolean(projectId) && (tab === "decision" || tab === "execution"),
        getNextPageParam: (last) => last.nextCursor ?? undefined,
      },
    );

  const decisions = useMemo(
    () => decisionsData?.pages.flatMap((p) => p.items) ?? [],
    [decisionsData],
  );

  useEffect(() => {
    if (!memoryTopic && home) {
      const seed =
        home.openRiskAlert?.suggestedTopic ||
        home.openOpportunity?.suggestedTopic ||
        home.currentProblemTitle ||
        "";
      if (seed) setMemoryTopic(seed);
    }
  }, [home, memoryTopic]);

  useEffect(() => {
    if (!selectedDecisionId && decisions[0]?.id) {
      setSelectedDecisionId(decisions[0].id);
    }
  }, [decisions, selectedDecisionId]);

  const activeDecisionId = selectedDecisionId || decisions[0]?.id || "";
  const riskCount = riskData?.alerts?.length ?? 0;
  const oppCount = oppData?.opportunities?.length ?? 0;
  const riskBlocks =
    home?.riskBlocksOpportunity ||
    home?.openRiskAlert?.level === "critical" ||
    home?.openRiskAlert?.level === "high" ||
    home?.openRiskAlert?.suggestCouncil === true;

  const activeTab = TABS.find((t) => t.id === tab) ?? TABS[1];
  const firstRisk = riskData?.alerts?.[0];
  const firstOpp = oppData?.opportunities?.[0];
  const growthTaskTopic = home?.founderGrowth?.growthTasks?.[0]?.topic;
  const growthTopic =
    growthTaskTopic ||
    (home?.founderGrowth?.weakest?.label
      ? `能力补强：${home.founderGrowth.weakest.label}`
      : null);

  const stickyCta = (() => {
    if (tab === "risk" && firstRisk) {
      const topic =
        firstRisk.suggestedTopic || `风险复核：${firstRisk.title}`;
      return {
        eyebrow: "现在",
        title: "带着风险复会",
        href: buildMeetingHref(
          projectId,
          topic,
          detectDepartmentFromTopic(topic),
          { confirmSpend: true, spendKind: "growth" },
        ),
        tone: "ink" as const,
      };
    }
    if (tab === "opportunity") {
      if (riskBlocks) {
        return {
          eyebrow: "先处理风险",
          title: "去看风险",
          onClick: () => selectTab("risk"),
          tone: "copper" as const,
        };
      }
      if (firstOpp) {
        const topic = firstOpp.suggestedTopic || firstOpp.title;
        return {
          eyebrow: "现在",
          title: "开会研究这个机会",
          href: buildMeetingHref(
            projectId,
            topic,
            detectDepartmentFromTopic(topic),
            { confirmSpend: true, spendKind: "council" },
          ),
          tone: "ink" as const,
        };
      }
    }
    if (tab === "growth" && growthTopic) {
      return {
        eyebrow: "现在",
        title: "带着短板开会",
        href: buildMeetingHref(
          projectId,
          growthTopic,
          detectDepartmentFromTopic(growthTopic),
          { confirmSpend: true, spendKind: "growth" },
        ),
        tone: "ink" as const,
      };
    }
    if (tab === "memory") {
      return {
        eyebrow: "现在",
        title: "带着记忆开会",
        href: buildMeetingHref(
          projectId,
          memoryTopic || home?.currentProblemTitle || "经营议题校准",
          detectDepartmentFromTopic(
            memoryTopic || home?.currentProblemTitle || "经营议题校准",
          ),
          { confirmSpend: true, spendKind: "council" },
        ),
        tone: "ink" as const,
      };
    }
    if (tab === "decision") {
      return {
        eyebrow: "行动",
        title: "去跟进",
        href: `/projects/${projectId}/decisions`,
        tone: "olive" as const,
      };
    }
    if (tab === "execution") {
      return {
        eyebrow: "今日",
        title: "回今日勾进度",
        href: "/dashboard",
        tone: "olive" as const,
      };
    }
    return {
      eyebrow: "今日",
      title: "回今日",
      href: "/dashboard",
      tone: "olive" as const,
    };
  })();

  if (!projectId) {
    return (
      <PageErrorState
        eyebrow="管理"
        title="先选企业"
        description="风险、机会和执行都挂在具体企业上。"
        primaryAction={{ href: "/projects", label: "选企业" }}
      />
    );
  }

  if (homeLoading && !homeResponse) {
    return (
      <PageLoadingState
        eyebrow="管理"
        title="正在打开…"
        description="准备风险、机会与执行。"
      />
    );
  }

  const name =
    brands?.activeBrand?.brandName ||
    homeResponse?.currentProject?.name ||
    "你的企业";

  return (
    <PageContent width="default" inset="shell" className="space-y-8">
      <header className="space-y-3">
        <p className="text-[11px] tracking-[0.14em] text-[#66735E]">管理</p>
        <h1 className="font-display text-[28px] font-semibold leading-[1.15] tracking-[-0.04em] text-[#202124] md:text-[34px]">
          {name}
        </h1>
        <p className="max-w-2xl text-[15px] leading-7 text-[#6f747b]">
          管风险、机会和执行。要拍板去决策会议室。
        </p>
        <BrandSwitcher projectId={projectId} variant="full" />
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-[13px]">
          <Link
            href={`/projects/${projectId}/decision-case`}
            prefetch={false}
            className="font-medium text-[#66735E] no-underline underline-offset-4 hover:underline"
          >
            决策会议室
          </Link>
          <Link
            href={`/projects/${projectId}/capability`}
            prefetch={false}
            className="font-medium text-[#66735E] no-underline underline-offset-4 hover:underline"
          >
            能力
          </Link>
          <Link
            href="/dashboard"
            prefetch={false}
            className="font-medium text-[#66735E] no-underline underline-offset-4 hover:underline"
          >
            回今日
          </Link>
        </div>
      </header>

      <section className="space-y-5 border-y border-[rgba(24,24,23,0.1)] py-6">
        <div>
          <h2 className="font-display text-[22px] font-semibold tracking-[-0.03em] text-[#202124]">
            {activeTab.label}
          </h2>
          <p className="mt-2 text-[14px] leading-6 text-[#3a3d41]">
            {activeTab.feel}
            {tab === "risk" && riskCount > 0 ? ` · ${riskCount} 项` : ""}
            {tab === "opportunity" && oppCount > 0 ? ` · ${oppCount} 项` : ""}
          </p>
          <p className="mt-1 text-[13px] text-[#6f747b]">{activeTab.now}</p>
        </div>

        <div
          className="flex gap-1 overflow-x-auto pb-1"
          role="tablist"
          aria-label="管理分区"
        >
          {TABS.map((t) => {
            const active = tab === t.id;
            const badge =
              t.id === "risk"
                ? riskCount
                : t.id === "opportunity"
                  ? oppCount
                  : 0;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                onClick={() => selectTab(t.id)}
                aria-selected={active}
                className={`shrink-0 rounded-[12px] px-3 py-2 text-[13px] font-medium touch-manipulation ${
                  active
                    ? "bg-[#181817] text-white"
                    : "bg-[#FBFAF7] text-[#6f747b]"
                }`}
              >
                {t.label}
                {badge > 0 ? (
                  <span className="ml-1 opacity-80">{badge}</span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div
          className={`flex flex-col gap-3 rounded-[14px] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between ${
            stickyCta.tone === "copper"
              ? "border border-[rgba(180,124,92,0.25)] bg-[rgba(180,124,92,0.08)]"
              : stickyCta.tone === "olive"
                ? "border border-[rgba(102,115,94,0.2)] bg-[rgba(102,115,94,0.06)]"
                : "bg-[#181817] text-white"
          }`}
        >
          <div>
            <p
              className={`text-[11px] tracking-[0.1em] ${
                stickyCta.tone === "ink"
                  ? "text-white/60"
                  : stickyCta.tone === "copper"
                    ? "text-[#B47C5C]"
                    : "text-[#66735E]"
              }`}
            >
              {stickyCta.eyebrow}
            </p>
            <p
              className={`mt-1 text-[15px] font-semibold ${
                stickyCta.tone === "ink" ? "text-white" : "text-[#202124]"
              }`}
            >
              {stickyCta.title}
            </p>
          </div>
          {"href" in stickyCta && stickyCta.href ? (
            <Link
              href={stickyCta.href}
              prefetch={false}
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] px-4 text-[13px] font-semibold no-underline touch-manipulation active:scale-[0.98] ${
                stickyCta.tone === "ink"
                  ? "bg-white text-[#181817]"
                  : "bg-[#181817] text-white"
              }`}
            >
              {stickyCta.title}
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={"onClick" in stickyCta ? stickyCta.onClick : undefined}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] bg-[#181817] px-4 text-[13px] font-semibold text-white touch-manipulation"
            >
              {stickyCta.title}
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </section>

      <div className="space-y-5">
        {tab === "memory" ? (
          <MemoryRuntimePanel
            projectId={projectId}
            topic={memoryTopic}
            editableTopic
            onTopicChange={setMemoryTopic}
          />
        ) : null}
        {tab === "risk" ? <RiskRuntimePanel projectId={projectId} /> : null}
        {tab === "opportunity" ? (
          <OpportunityRuntimePanel
            projectId={projectId}
            riskBlocks={Boolean(riskBlocks)}
            onGoToRisk={() => selectTab("risk")}
          />
        ) : null}
        {tab === "growth" ? (
          <GrowthRuntimePanel projectId={projectId} showRadar />
        ) : null}
        {tab === "decision" ? (
          <div className="space-y-5">
            {decisionsLoading && !decisions.length ? (
              <p className="text-[13px] text-[#6f747b]">加载决策档案…</p>
            ) : decisions.length === 0 ? (
              <div className="space-y-3 border-y border-[rgba(24,24,23,0.08)] py-8 text-center">
                <p className="font-display text-[18px] font-semibold text-[#202124]">
                  还没有可追加的决策
                </p>
                <p className="text-[13px] leading-6 text-[#6f747b]">
                  先进入决策会议室拍板，记录会出现在这里。
                </p>
                <Link
                  href={`/projects/${projectId}/decision-case`}
                  prefetch={false}
                  className="inline-flex min-h-11 items-center justify-center rounded-[14px] bg-[#181817] px-5 text-[13px] font-semibold text-white no-underline touch-manipulation"
                >
                  去拍板
                </Link>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-[11px] tracking-[0.12em] text-[#66735E]">
                    选择决策
                  </p>
                  <ul className="mt-3 max-h-[240px] space-y-2 overflow-y-auto">
                    {decisions.map((d) => {
                      const selected = d.id === activeDecisionId;
                      return (
                        <li key={d.id}>
                          <button
                            type="button"
                            onClick={() => setSelectedDecisionId(d.id)}
                            className={`w-full rounded-[12px] border px-4 py-3 text-left touch-manipulation ${
                              selected
                                ? "border-[#181817] bg-[#181817] text-white"
                                : "border-[rgba(24,24,23,0.1)] bg-[#FBFAF7] text-[#202124]"
                            }`}
                          >
                            <p className="text-[14px] font-medium leading-6">
                              {d.problem || d.judgement || "未命名决策"}
                            </p>
                            {d.judgement && d.problem ? (
                              <p
                                className={`mt-0.5 line-clamp-1 text-[12px] ${
                                  selected ? "text-white/65" : "text-[#6f747b]"
                                }`}
                              >
                                共识：{d.judgement}
                              </p>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                {activeDecisionId ? (
                  <DecisionRuntimePanel
                    projectId={projectId}
                    decisionId={activeDecisionId}
                  />
                ) : null}
              </>
            )}
          </div>
        ) : null}
        {tab === "execution" ? (
          <div className="space-y-5">
            {decisions.length > 0 ? (
              <div>
                <p className="text-[11px] tracking-[0.12em] text-[#66735E]">
                  绑定决策（可选）
                </p>
                <ul className="mt-3 max-h-[160px] space-y-1.5 overflow-y-auto">
                  <li>
                    <button
                      type="button"
                      onClick={() => setSelectedDecisionId("")}
                      className={`w-full rounded-[12px] border px-3 py-2 text-left text-[13px] touch-manipulation ${
                        !selectedDecisionId
                          ? "border-[#181817] bg-[#181817] font-medium text-white"
                          : "border-[rgba(24,24,23,0.1)] bg-[#FBFAF7] text-[#6f747b]"
                      }`}
                    >
                      当前执行计划（默认）
                    </button>
                  </li>
                  {decisions.map((d) => (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedDecisionId(d.id)}
                        className={`w-full rounded-[12px] border px-3 py-2 text-left text-[13px] touch-manipulation ${
                          selectedDecisionId === d.id
                            ? "border-[#181817] bg-[#181817] font-medium text-white"
                            : "border-[rgba(24,24,23,0.1)] bg-[#FBFAF7] text-[#6f747b]"
                        }`}
                      >
                        {d.problem || d.judgement || d.id}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <ExecutionRuntimePanel
              projectId={projectId}
              decisionId={selectedDecisionId || undefined}
            />
          </div>
        ) : null}
      </div>
    </PageContent>
  );
}
