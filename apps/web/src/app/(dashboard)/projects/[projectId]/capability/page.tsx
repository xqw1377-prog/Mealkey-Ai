"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BrandSwitcher } from "@/components/operating/BrandSwitcher";
import { CapabilityEightRadar } from "@/components/operating/CapabilityEightRadar";
import { MKPageHeader } from "@/components/operating/MKPageHeader";
import { OpsSecondaryLinks } from "@/components/operating/OpsSecondaryLinks";
import { PageContent } from "@/components/operating/PageContent";
import { PageErrorState, PageLoadingState } from "@/components/operating/PageState";
import { ThreeEasyLanes } from "@/components/operating/ThreeEasyGuide";
import { useProjectId } from "@/hooks/useProjectId";
import { trendTone } from "@/lib/format";
import { useProjectStore } from "@/stores/projectStore";
import { trpc } from "@/lib/trpc";

function decisionTopicHref(projectId: string, topic: string) {
  return `/projects/${projectId}/decision-room?topic=${encodeURIComponent(topic)}`;
}

type AgentEntry = {
  label: string;
  href: (projectId: string) => string;
};

type CapabilityMeta = {
  id: "cognition" | "decision" | "execution" | "growth";
  label: string;
  entries: AgentEntry[];
};

/** 四大能力：一级名 ≤5 字、可读；无二级解释 */
const CAPABILITY_META: CapabilityMeta[] = [
  {
    id: "cognition",
    label: "经营认知",
    entries: [
      { label: "市场机会", href: (id) => `/projects/${id}/market` },
      { label: "品牌定位", href: (id) => `/projects/${id}/positioning` },
      { label: "商业模式", href: (id) => `/projects/${id}/business` },
      { label: "经营对话", href: (id) => `/projects/${id}/agent` },
      { label: "餐厅认知", href: (id) => `/projects/${id}/restaurant` },
      { label: "经营者档", href: () => "/profile" },
    ],
  },
  {
    id: "decision",
    label: "关键决策",
    entries: [
      { label: "经营动态", href: () => "/dashboard?radar=1" },
      { label: "决策会议", href: (id) => `/projects/${id}/decision-room` },
      { label: "扩店决策", href: (id) => `/projects/${id}/decision-case` },
      { label: "股权结构", href: (id) => `/projects/${id}/equity` },
      {
        label: "风险推演",
        href: (id) =>
          decisionTopicHref(id, "请帮我推演当前关键决策的主要风险与否决条件"),
      },
      {
        label: "情景模拟",
        href: (id) =>
          decisionTopicHref(id, "请做情景模拟：乐观 / 基准 / 悲观下该怎么选"),
      },
      { label: "决策证据", href: (id) => `/projects/${id}/decisions` },
    ],
  },
  {
    id: "execution",
    label: "执行推动",
    entries: [
      { label: "目标拆解", href: (id) => `/projects/${id}/decisions` },
      { label: "任务推进", href: (id) => `/projects/${id}/mission` },
      {
        label: "团队对齐",
        href: (id) =>
          decisionTopicHref(id, "请帮我对齐团队对当前决策的共识与分工"),
      },
      {
        label: "对外表达",
        href: (id) =>
          decisionTopicHref(
            id,
            "请帮我把当前战略选择整理成可对外沟通的一页表达",
          ),
      },
      { label: "结果验证", href: (id) => `/projects/${id}/mission` },
    ],
  },
  {
    id: "growth",
    label: "成长复盘",
    entries: [
      { label: "经营复盘", href: () => "/profile" },
      { label: "能力记分", href: (id) => `/projects/${id}/score` },
      { label: "经营知识", href: (id) => `/projects/${id}/knowledge` },
      { label: "能力画像", href: () => "/profile" },
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
      <PageLoadingState eyebrow="能力" title="正在打开…" />
    );
  }

  if (error && !status) {
    return (
      <PageErrorState
        eyebrow="能力"
        title="暂时打不开"
        description={error.message}
        primaryAction={{ href: "/dashboard?radar=1", label: "经营动态" }}
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
  const weakestId = status?.weakestId;
  const weakest = weakestId ? scoreById.get(weakestId) : null;
  const weakestLabel =
    CAPABILITY_META.find((c) => c.id === weakestId)?.label ||
    weakest?.label ||
    null;
  const weakTopic =
    (weakestId && WEAK_TOPIC[weakestId]) ||
    (weakestLabel ? `校准${weakestLabel}短板：下一步最该验证什么？` : null);
  const weakMeetingHref =
    weakTopic && projectId ? decisionTopicHref(projectId, weakTopic) : null;

  return (
    <PageContent width="console" inset="shell" className="space-y-8">
      <MKPageHeader
        eyebrow="能力"
        title={name}
        description="三易主路径在上：学→做→管；下面是能力目录。"
        meta={
          <>
            {projectId ? (
              <BrandSwitcher projectId={projectId} variant="full" />
            ) : null}
            <OpsSecondaryLinks
              projectId={projectId}
              links={
                projectId
                  ? [
                      {
                        href: `/projects/${projectId}/agent`,
                        label: "回对话",
                      },
                      {
                        href: `/projects/${projectId}/decision-room`,
                        label: "决策室",
                      },
                      {
                        href: `/projects/${projectId}/decisions`,
                        label: "跟进",
                      },
                    ]
                  : undefined
              }
            />
          </>
        }
      />

      {projectId ? <ThreeEasyLanes projectId={projectId} /> : null}

      <section className="border-y border-[rgba(24,24,23,0.08)] py-3">
        <p className="text-[11px] font-medium tracking-[0.12em] text-[#66735E]">
          可信度
        </p>
        <p className="mt-1 text-[13px] leading-5 text-[#202124]">
          证据 {status?.rigor?.evidenceSufficiencyLabel ?? "未知"}
          <span className="mx-1.5 text-[#c5c2ba]">·</span>
          已验证 {status?.rigor?.validatedOutcomeCount ?? 0}
          <span className="mx-1.5 text-[#c5c2ba]">·</span>
          降级 {Math.round((status?.rigor?.heuristicRatio ?? 0) * 100)}%
          {(status?.rigor?.openValidationCount ?? 0) > 0 ? (
            <>
              <span className="mx-1.5 text-[#c5c2ba]">·</span>
              验证中 {status?.rigor?.openValidationCount}
            </>
          ) : null}
        </p>
      </section>

      {status?.eightDim && status.eightDim.length >= 4 ? (
        <div className="mt-1">
          <CapabilityEightRadar
            dimensions={status.eightDim.map((d) => ({
              dim: d.dim,
              label: d.label,
              score: d.score,
            }))}
            decisionQualityTotal={status.decisionQuality?.total ?? null}
            weakestLabel={weakestLabel}
            variant="os"
          />
        </div>
      ) : null}

      {weakest && weakMeetingHref ? (
        <section className="mt-3 flex items-center justify-between gap-3 border-l-2 border-[#B47C5C] py-0.5 pl-3">
          <p className="text-[14px] font-medium text-[#202124]">
            短板 · {weakestLabel} {weakest.score}
          </p>
          <Link
            href={weakMeetingHref}
            prefetch={false}
            className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-[#181817] no-underline"
          >
            进决策室
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      ) : null}

      <section className="mt-3 space-y-2">
        <p className="text-[11px] font-medium tracking-[0.12em] text-[#6f747b]">
          能力目录 · 需要时再点
        </p>
        <div className="divide-y divide-[rgba(24,24,23,0.08)] border-y border-[rgba(24,24,23,0.08)]">
        {CAPABILITY_META.map((cap) => {
          const live = scoreById.get(cap.id);
          const score =
            typeof live?.score === "number" && Number.isFinite(live.score)
              ? live.score
              : null;
          const trend = score != null ? live?.trendGlyph ?? "→" : null;
          const isWeak = cap.id === weakestId;

          return (
            <div
              key={cap.id}
              className={`py-2.5 ${isWeak ? "bg-[rgba(180,124,92,0.04)]" : ""}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-baseline gap-2">
                  <h2 className="font-display text-[16px] font-semibold tracking-[-0.02em] text-[#202124]">
                    {cap.label}
                  </h2>
                  {isWeak ? (
                    <span className="text-[11px] font-medium text-[#B47C5C]">
                      短板
                    </span>
                  ) : null}
                </div>
                {score != null ? (
                  <p
                    className={`shrink-0 font-display text-[18px] font-semibold leading-none tracking-[-0.03em] ${trendTone(trend || "→")}`}
                  >
                    {score}
                    <span className="ml-0.5 text-[12px]">{trend}</span>
                  </p>
                ) : (
                  <p className="shrink-0 text-[12px] font-medium text-[#6f747b]">
                    —
                  </p>
                )}
              </div>

              <ul className="mt-1">
                {cap.entries.map((entry) => (
                  <li key={entry.label}>
                    <Link
                      href={entry.href(projectId)}
                      prefetch={false}
                      className="flex min-h-9 items-center justify-between gap-3 px-0.5 text-[14px] font-medium text-[#202124] no-underline"
                    >
                      {entry.label}
                      <ArrowRight className="h-3 w-3 shrink-0 text-[#6f747b]" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        </div>
      </section>
    </PageContent>
  );
}
