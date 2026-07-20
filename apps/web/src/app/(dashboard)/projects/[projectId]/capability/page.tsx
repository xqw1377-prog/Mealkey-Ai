"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandSwitcher } from "@/components/operating/BrandSwitcher";
import { CapabilityEightRadar } from "@/components/operating/CapabilityEightRadar";
import { PageContent } from "@/components/operating/PageContent";
import { PageErrorState, PageLoadingState } from "@/components/operating/PageState";
import { useProjectId } from "@/hooks/useProjectId";
import { trendTone } from "@/lib/format";
import { useProjectStore } from "@/stores/projectStore";
import { trpc } from "@/lib/trpc";

function decisionTopicHref(projectId: string, topic: string) {
  return `/projects/${projectId}/decision-room?topic=${encodeURIComponent(topic)}`;
}

type AgentEntry = {
  label: string;
  /** 对外展示的 Agent / 模块名 */
  agent: string;
  hint: string;
  href: (projectId: string) => string;
};

type CapabilityMeta = {
  id: "cognition" | "decision" | "execution" | "growth";
  label: string;
  blurb: string;
  entries: AgentEntry[];
};

/**
 * 四大能力卡片统一结构：分数 + 说明 + 可点专业模块列表（不再整块跳转）。
 */
const CAPABILITY_META: CapabilityMeta[] = [
  {
    id: "cognition",
    label: "认知力",
    blurb: "看清市场、品牌与赚钱逻辑",
    entries: [
      {
        label: "市场",
        agent: "M-MKT",
        hint: "值不值得进、怎么进",
        href: (id) => `/projects/${id}/market`,
      },
      {
        label: "品牌",
        agent: "M-PNT",
        hint: "你是谁、卖给谁（可另设咨询品牌）",
        href: (id) => `/projects/${id}/positioning`,
      },
      {
        label: "顾问咨询",
        agent: "Consulting",
        hint: "深度咨询会；不等于今日决策",
        href: (id) => `/projects/${id}/advisor`,
      },
      {
        label: "商业模式",
        agent: "M-BIZ",
        hint: "钱怎么赚、怎么守住",
        href: (id) => `/projects/${id}/business`,
      },
      {
        label: "我自己",
        agent: "经营者画像",
        hint: "短板与习惯",
        href: () => "/profile",
      },
      {
        label: "我的餐厅",
        agent: "Restaurant Brain",
        hint: "系统对这家店的长期认知",
        href: (id) => `/projects/${id}/restaurant`,
      },
    ],
  },
  {
    id: "decision",
    label: "决策力",
    blurb: "对你正在经营的店做判断；日常入口在「今日」",
    entries: [
      {
        label: "今日决策",
        agent: "Decision HQ",
        hint: "系统推送 + 任意发起经营判断",
        href: () => "/dashboard",
      },
      {
        label: "决策室",
        agent: "Decision Room",
        hint: "带着题目直接开一笔决策",
        href: (id) => `/projects/${id}/decision-room`,
      },
      {
        label: "扩店决策",
        agent: "Decision Case",
        hint: "第二家店专项闭环",
        href: (id) => `/projects/${id}/decision-case`,
      },
      {
        label: "股权",
        agent: "M-ED",
        hint: "谁说了算、怎么分",
        href: (id) => `/projects/${id}/equity`,
      },
      {
        label: "风险推演",
        agent: "Decision Room",
        hint: "最坏会怎样",
        href: (id) =>
          decisionTopicHref(id, "请帮我推演当前关键决策的主要风险与否决条件"),
      },
      {
        label: "情景模拟",
        agent: "Decision Room",
        hint: "好/中/差三种情况怎么选",
        href: (id) =>
          decisionTopicHref(id, "请做情景模拟：乐观 / 基准 / 悲观下该怎么选"),
      },
      {
        label: "证据够不够",
        agent: "决策台账",
        hint: "去行动里核对",
        href: (id) => `/projects/${id}/decisions`,
      },
    ],
  },
  {
    id: "execution",
    label: "推动力",
    blurb: "把决定做成能跟进的动作",
    entries: [
      {
        label: "目标拆解",
        agent: "决策台账",
        hint: "拆成可跟踪目标",
        href: (id) => `/projects/${id}/decisions`,
      },
      {
        label: "本周动作",
        agent: "任务中心",
        hint: "今天该做什么",
        href: (id) => `/projects/${id}/mission`,
      },
      {
        label: "对齐团队",
        agent: "Decision Room",
        hint: "口径与分工对齐",
        href: (id) =>
          decisionTopicHref(id, "请帮我对齐团队对当前决策的共识与分工"),
      },
      {
        label: "对外一页纸",
        agent: "Decision Room",
        hint: "说清楚为什么选这条路",
        href: (id) =>
          decisionTopicHref(
            id,
            "请帮我把当前战略选择整理成可对外沟通的一页表达",
          ),
      },
      {
        label: "验证任务",
        agent: "任务中心",
        hint: "假设对不对，用结果验",
        href: (id) => `/projects/${id}/mission`,
      },
    ],
  },
  {
    id: "growth",
    label: "成长力",
    blurb: "从结果里变强",
    entries: [
      {
        label: "复盘",
        agent: "经营者画像",
        hint: "最近一次教会了什么",
        href: () => "/profile",
      },
      {
        label: "记分卡",
        agent: "经营记分卡",
        hint: "健康度与能力分",
        href: (id) => `/projects/${id}/score`,
      },
      {
        label: "下一步学什么",
        agent: "经营者画像",
        hint: "补哪块能力",
        href: () => "/profile",
      },
      {
        label: "知识库",
        agent: "知识库",
        hint: "事实与经验沉淀",
        href: (id) => `/projects/${id}/knowledge`,
      },
      {
        label: "经营者画像",
        agent: "经营者画像",
        hint: "优势与瓶颈",
        href: () => "/profile",
      },
    ],
  },
];

const WEAK_TOPIC: Record<string, string> = {
  cognition: "校准认知短板：我们真正看懂了市场、品牌与赚钱逻辑吗？",
  decision: "校准决策短板：当前最关键选择的证据是否足够？",
  execution: "校准推动短板：最近一条决策如何拆成可验证动作？",
  growth: "校准成长短板：上一次验证结果教会了我们什么？",
};

export default function CapabilityHubPage() {
  const projectId = useProjectId() || "";
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const { data: home, isLoading: homeLoading } = trpc.dashboard.getHome.useQuery(
    { projectId },
    { enabled: Boolean(projectId) },
  );
  const {
    data: status,
    isLoading: statusLoading,
    error,
  } = trpc.founder.getCapabilityStatus.useQuery(
    { projectId },
    { enabled: Boolean(projectId) },
  );
  const { data: brands } = trpc.project.listBrands.useQuery(
    { projectId },
    { enabled: Boolean(projectId) },
  );

  useEffect(() => {
    if (home?.currentProject) {
      setCurrentProject(home.currentProject);
    }
  }, [home?.currentProject, setCurrentProject]);

  const isLoading = (homeLoading || statusLoading) && !status;

  if (isLoading) {
    return (
      <PageLoadingState
        eyebrow="能力"
        title="正在打开能力…"
        description="读取分数与入口。"
      />
    );
  }

  if (error && !status) {
    return (
      <PageErrorState
        eyebrow="能力"
        title="能力页暂时打不开"
        description={error.message}
        primaryAction={{ href: "/dashboard", label: "回今日" }}
      />
    );
  }

  const name =
    brands?.activeBrand?.brandName ||
    status?.projectName ||
    home?.currentProject?.name ||
    "你的企业";
  const scoreById = new Map(
    (status?.scores ?? []).map((s) => [s.id, s] as const),
  );
  const learningHint =
    status?.lastGrowthDelta?.learningNext?.[0] ||
    status?.lastGrowthDelta?.summary ||
    null;
  const weakestId = status?.weakestId;
  const weakest = weakestId ? scoreById.get(weakestId) : null;
  const weakTopic =
    (weakestId && WEAK_TOPIC[weakestId]) ||
    (weakest ? `校准${weakest.label}短板：下一步最该验证什么？` : null);
  const weakMeetingHref =
    weakTopic && projectId ? decisionTopicHref(projectId, weakTopic) : null;

  return (
    <PageContent width="narrow" inset="shell">
      <header className="space-y-3">
        <p className="text-[11px] font-medium tracking-[0.14em] text-[#66735E]">能力</p>
        <h1 className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.045em] text-[#202124] md:text-[36px]">
          {name}
        </h1>
        <p className="text-[15px] leading-7 text-[#3a3d41]">
          日常拍板请回「今日」。这里看短板、进专业模块；咨询可另设对象。
        </p>
        <BrandSwitcher projectId={projectId} variant="full" />
        {learningHint ? (
          <p className="text-[13px] leading-6 text-[#66735E]">下一步：{learningHint}</p>
        ) : null}
      </header>

      <section className="mt-6 border-y border-[rgba(24,24,23,0.08)] py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-[0.12em] text-[#66735E]">
              日常决策
            </p>
            <p className="mt-1 text-[15px] leading-7 text-[#202124]">
              有判断回今日；这里补专业能力
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Link
              href="/dashboard"
              prefetch={false}
              className="inline-flex min-h-12 items-center justify-center gap-1 rounded-[16px] bg-[#181817] px-5 text-[15px] font-semibold text-white no-underline touch-manipulation active:scale-[0.98]"
            >
              回今日
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href={`/projects/${projectId}/decision-room`}
              prefetch={false}
              className="inline-flex min-h-12 items-center justify-center gap-1 rounded-[16px] border border-[rgba(24,24,23,0.12)] bg-white px-5 text-[15px] font-semibold text-[#202124] no-underline touch-manipulation"
            >
              决策室
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-0 space-y-2 border-b border-[rgba(24,24,23,0.08)] py-5">
        <p className="text-[11px] font-medium tracking-[0.12em] text-[#66735E]">可信度</p>
        <ul className="space-y-1.5 text-[15px] leading-6 text-[#202124]">
          <li>
            证据：
            <span className="font-medium">
              {status?.rigor?.evidenceSufficiencyLabel ?? "还未知"}
            </span>
          </li>
          <li>
            已验证：
            <span className="font-medium">
              {status?.rigor?.validatedOutcomeCount ?? 0}
            </span>
            <span className="text-[#6f747b]"> 次</span>
          </li>
          <li>
            降级占比：
            <span className="font-medium">
              {Math.round((status?.rigor?.heuristicRatio ?? 0) * 100)}%
            </span>
          </li>
          {(status?.rigor?.openValidationCount ?? 0) > 0 ? (
            <li className="text-[13px] text-[#6f747b]">
              验证中 {status?.rigor?.openValidationCount} 项
            </li>
          ) : null}
        </ul>
      </section>

      {status?.eightDim && status.eightDim.length >= 4 ? (
        <div className="mt-2">
          <CapabilityEightRadar
            dimensions={status.eightDim.map((d) => ({
              dim: d.dim,
              label: d.label,
              score: d.score,
              note: d.note ?? undefined,
            }))}
            decisionQualityTotal={status.decisionQuality?.total ?? null}
            weakestLabel={weakest?.label ?? null}
            variant="os"
          />
        </div>
      ) : null}

      {weakest && weakMeetingHref ? (
        <section className="mt-8 border-l-2 border-[#B47C5C] pl-4">
          <p className="text-[11px] font-medium tracking-[0.12em] text-[#B47C5C]">当前短板</p>
          <p className="mt-1 text-[17px] font-medium leading-7 text-[#202124]">
            {weakest.label} {weakest.score}
          </p>
          <p className="mt-1 text-[13px] leading-6 text-[#6f747b]">{weakest.note}</p>
          <Link
            href={weakMeetingHref}
            prefetch={false}
            className="mt-3 inline-flex items-center gap-1 text-[14px] font-semibold text-[#181817] no-underline"
          >
            带着短板开会
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      ) : null}

      <section className="mt-8 divide-y divide-[rgba(24,24,23,0.08)] border-y border-[rgba(24,24,23,0.08)]">
        {CAPABILITY_META.map((cap) => {
          const live = scoreById.get(cap.id);
          const score =
            typeof live?.score === "number" && Number.isFinite(live.score)
              ? live.score
              : null;
          const trend = score != null ? live?.trendGlyph ?? "→" : null;
          const note = live?.note;
          const isWeak = cap.id === weakestId;

          return (
            <div
              key={cap.id}
              className={`py-4 ${isWeak ? "bg-[rgba(180,124,92,0.04)]" : ""}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <h2 className="font-display text-[20px] font-semibold tracking-[-0.03em] text-[#202124]">
                      {cap.label}
                    </h2>
                    {isWeak ? (
                      <span className="text-[12px] font-medium text-[#B47C5C]">短板</span>
                    ) : null}
                    <span className="text-[13px] text-[#6f747b]">{cap.blurb}</span>
                  </div>
                  {note ? (
                    <p className="mt-1 line-clamp-1 text-[12px] leading-5 text-[#5f6368]">
                      {note}
                    </p>
                  ) : null}
                </div>
                {score != null ? (
                  <p
                    className={`shrink-0 font-display text-[22px] font-semibold leading-none tracking-[-0.04em] ${trendTone(trend || "→")}`}
                  >
                    {score}
                    <span className="ml-0.5 text-[14px]">{trend}</span>
                  </p>
                ) : (
                  <p className="shrink-0 text-[13px] font-medium text-[#6f747b]">
                    待评估
                  </p>
                )}
              </div>

              <ul className="mt-3 space-y-1">
                {cap.entries.map((entry) => (
                  <li key={entry.label}>
                    <Link
                      href={entry.href(projectId)}
                      prefetch={false}
                      className="flex min-h-11 items-center justify-between gap-3 px-0.5 text-[14px] font-medium text-[#202124] no-underline transition hover:bg-[rgba(24,24,23,0.03)]"
                    >
                      <span className="min-w-0">
                        {entry.label}
                        <span className="mt-0.5 block text-[12px] font-normal text-[#6f747b]">
                          {entry.hint}
                        </span>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[#6f747b]" />
                    </Link>
                  </li>
                ))}
              </ul>

              {isWeak && weakMeetingHref ? (
                <Link
                  href={weakMeetingHref}
                  prefetch={false}
                  className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-[#181817] no-underline"
                >
                  开会补这块
                  <ArrowRight className="h-3 w-3" />
                </Link>
              ) : null}
            </div>
          );
        })}
      </section>

      <p className="mt-8 text-[13px] leading-6 text-[#6f747b]">
        记得住：事实 {status?.memoryCounts.facts ?? 0} · 决策{" "}
        {status?.memoryCounts.decisions ?? 0} · 模式{" "}
        {status?.memoryCounts.patterns ?? 0}
      </p>
    </PageContent>
  );
}
