"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Compass,
  Loader2,
  Mic,
  Search,
  Sparkles,
  Square,
  Swords,
  Target,
  TrendingUp,
} from "lucide-react";

import {
  ChiefAdvisorPanel,
  CollapsibleBoardSection,
  DepartmentBoardShell,
  FeedbackWidget,
  MKMetaPill,
  PositioningDiffCard,
  PositioningResultCard,
  type WorkspaceJourneyStep,
  WorkspaceJourneyRail,
} from "@/components/operating";
import { PageEmptyState, PageErrorState, PageLoadingState } from "@/components/operating/PageState";
import { useSpeechToTextField } from "@/hooks/useSpeechToTextField";
import {
  getDepartmentBoard,
  getDepartmentExperts,
  getDepartmentMeetingHref,
} from "@/lib/department-board";
import { buildPositioningProtocolProjection } from "@/lib/runtime-projections/positioningProtocol";
import { trpc } from "@/lib/trpc";

type StageStatus = "done" | "current" | "upcoming";

interface ConsultingStage {
  id: string;
  label: string;
  note: string;
  status: StageStatus;
}

interface TheoryCard {
  key: string;
  label: string;
  preferred: string;
  recommend: string;
  reason?: string;
  attack?: string;
}

interface CrossFireData {
  summary?: string;
  conflicts: string[];
  consensus: string[];
  rejected?: string[];
  decision?: string;
}

interface MarketResearch {
  summary?: string;
  marketSignals: string[];
  opportunities: string[];
  risks: string[];
  competitorFindings: Array<{
    name: string;
    positioning?: string;
    priceRange?: string;
    strengths: string[];
    weaknesses: string[];
  }>;
  userVoices: Array<{ source?: string; quote: string; sentiment?: string }>;
  sourceCount?: number;
  updatedAt?: string;
}

interface Candidate {
  id: string;
  title: string;
  fit?: string;
  why?: string;
  risk?: string;
  tag?: string;
}

function buildPositioningIntakePrompt(values: {
  brand: string;
  category: string;
  audience: string;
  differentiation: string;
}) {
  return [
    "请基于以下最少定位信息，完成一次品牌定位判断：",
    `1. 品牌/项目：${values.brand || "待补充"}`,
    `2. 业态/品类/菜系：${values.category || "待补充"}`,
    `3. 目标客群/场景：${values.audience || "待补充"}`,
    `4. 想建立的差异或当前想法：${values.differentiation || "待补充"}`,
  ].join("\n");
}

function buildStepStatuses(
  steps: Array<{ id: string; name: string; status?: StageStatus }>,
  streamText: string,
  streaming: boolean,
  hasResult: boolean,
) {
  if (hasResult) return steps.map((s) => ({ ...s, status: "done" as StageStatus }));
  let activeIndex = -1;
  steps.forEach((step, index) => {
    if (streamText.includes(`### ⏳ ${step.name}`)) activeIndex = index;
  });
  return steps.map((step, index) => {
    if (streaming && activeIndex === -1 && index === 0) return { ...step, status: "current" as StageStatus };
    if (activeIndex === index) return { ...step, status: "current" as StageStatus };
    if (activeIndex > index) return { ...step, status: "done" as StageStatus };
    return { ...step, status: "upcoming" as StageStatus };
  });
}

function buildConsultingStages(input: {
  hasInterview: boolean;
  hasDiagnosis: boolean;
  hasMarketInsight: boolean;
  hasCommittee: boolean;
  hasOptions: boolean;
  hasDecision: boolean;
  hasRoadmap: boolean;
}): ConsultingStage[] {
  const raw = [
    { id: "understanding", label: "品牌理解", done: input.hasInterview, note: "先建立品牌档案与创始人意图。" },
    { id: "market", label: "市场分析", done: input.hasDiagnosis && input.hasMarketInsight, note: "识别竞争结构与市场空位。" },
    { id: "committee", label: "专家研判", done: input.hasCommittee, note: "让三位顾问形成分歧与共识。" },
    { id: "options", label: "定位设计", done: input.hasOptions, note: "形成 3 条可比较的战略方向。" },
    { id: "decision", label: "战略确认", done: input.hasDecision, note: "结合市场、资源与创始人偏好给出建议。" },
    { id: "roadmap", label: "落地规划", done: input.hasRoadmap, note: "把定位压成 90 天执行动作。" },
  ];
  const currentIndex = raw.findIndex((s) => !s.done);
  return raw.map((stage, index) => ({
    id: stage.id,
    label: stage.label,
    note: stage.note,
    status: stage.done ? "done" : currentIndex === -1 ? "done" : currentIndex === index ? "current" : "upcoming",
  }));
}

function getInterviewQuestion(input: {
  brandName: string;
  categoryName: string;
  cityName: string;
  intake: { brand: string; category: string; audience: string; differentiation: string };
}) {
  if (!input.brandName && !input.intake.brand) return "先告诉我，你的品牌叫什么？";
  if (!input.categoryName && !input.intake.category) return "你现在主要经营什么品类、业态或菜系？";
  if (!input.cityName) return "你现在主要在哪个城市经营？";
  if (!input.intake.audience) return "你现在最想服务的客户是谁，他们在什么场景下会选择你？";
  if (!input.intake.differentiation) return "如果竞争对手复制你，你最担心他们复制走哪一点？";
  return "我已经有了基本判断，接下来我会基于这些信息推进定位诊断。";
}

function getConsultantFeedback(input: {
  brandName: string;
  categoryName: string;
  cityName: string;
  audience: string;
}) {
  const parts = [
    input.brandName ? `我先用「${input.brandName}」建立品牌档案。` : null,
    input.categoryName ? `你的核心竞争环境属于${input.categoryName}赛道。` : null,
    input.cityName ? `我会把 ${input.cityName} 的区域竞争也纳入判断。` : null,
    input.audience ? `接下来我会重点验证「${input.audience}」是否真的是最佳客群。` : null,
  ].filter(Boolean);
  if (parts.length === 0) return "我会先用最少必要信息建立品牌认知，再进入战略诊断。";
  return parts.join(" ");
}

function inferFounderBrandGoal(text: string) {
  if (/(连锁|扩张|复制|加盟|规模)/.test(text)) {
    return "优先建立可复制的品牌定位，而不是一次性创意表达。";
  }
  if (/(高端|品质|品牌|心智|认知)/.test(text)) {
    return "优先抢占清晰心智位置，建立长期品牌资产。";
  }
  if (/(稳健|验证|试点|先跑通)/.test(text)) {
    return "先用低风险方式验证定位是否被用户真正接受。";
  }
  return "先找到这家品牌最值得被记住的战略位置。";
}

function inferBrandRiskProfile(text: string) {
  if (/(验证|谨慎|先别|稳住|风险)/.test(text)) {
    return {
      label: "稳健型",
      note: "先验证定位是否成立，再放大传播投入。",
    };
  }
  if (/(占位|抢占|快速|第一|心智)/.test(text)) {
    return {
      label: "进取型",
      note: "优先抢心智位置，再补经营与传播细节。",
    };
  }
  return {
    label: "平衡型",
    note: "在品牌表达和落地可行性之间保持平衡。",
  };
}

function buildFounderBrandContextView(input: {
  project: { name: string; category?: string | null; city?: string | null };
  brandName: string;
  categoryName: string;
  audience: string;
  differentiation: string;
  snapshot: any;
}) {
  const text = [
    input.snapshot?.oneLiner,
    input.snapshot?.strategy,
    input.snapshot?.action,
    input.snapshot?.brandPositioning?.mentalPosition,
    input.snapshot?.brandPositioning?.differentiation,
    input.audience,
    input.differentiation,
  ]
    .filter(Boolean)
    .join(" ");
  const risk = inferBrandRiskProfile(text);

  return {
    identity: `${input.project.name || input.brandName || "当前项目"} 创始人`,
    background: input.categoryName || input.project.category || "品牌赛道待补全",
    goal: inferFounderBrandGoal(text),
    riskLabel: risk.label,
    riskNote: risk.note,
    decisionStyle: input.snapshot ? "先形成定位共识，再冻结战略契约" : "先理解品牌，再进入定位判断",
  };
}

function buildBrandContextView(input: {
  brandName: string;
  categoryName: string;
  cityName: string;
  audience: string;
  differentiation: string;
  snapshot: any;
}) {
  return [
    { label: "品牌", value: input.brandName || "待补充" },
    { label: "品类", value: input.categoryName || "待补充" },
    { label: "城市", value: input.cityName || "待补充" },
    { label: "目标客群", value: input.audience || "待识别" },
    { label: "差异方向", value: input.differentiation || "待明确" },
    {
      label: "协议层级",
      value: input.snapshot?.decisionId ? "品牌使命已形成决策" : "品牌使命进行中",
    },
  ];
}

function buildBrandDecisionProtocolView(input: { snapshot: any; leadCandidate?: Candidate }) {
  const reasoning = [
    input.snapshot?.diagnosis,
    input.snapshot?.brandPositioning?.mentalPosition,
    input.snapshot?.brandPositioning?.differentiation,
    input.leadCandidate?.why,
  ]
    .filter((item): item is string => Boolean(item))
    .filter((item, index, list) => list.indexOf(item) === index)
    .slice(0, 3);

  return {
    problem: input.snapshot?.problem || "当前品牌问题仍在澄清中。",
    choice:
      input.leadCandidate?.title ||
      input.snapshot?.oneLiner ||
      input.snapshot?.brandPositioning?.mentalPosition ||
      "先把定位方向压成一个正式选择。",
    reasoning,
    tradeoff:
      input.snapshot?.risks?.[0]?.risk ||
      input.leadCandidate?.risk ||
      "需要在品牌差异、市场适配和执行可行性之间做取舍。",
    validation:
      input.snapshot?.validation?.day30?.[0] ||
      input.snapshot?.action ||
      "先补一个定位验证动作，再进入放大执行。",
  };
}

function buildBrandMemoryView(input: {
  snapshot: any;
  history: Array<{ judgement?: string | null; strategy?: string | null; createdAt: string | Date }>;
  reports: Array<{ title: string; summary?: string | null }>;
}) {
  const founderMemory = [
    inferBrandRiskProfile(
      [
        input.snapshot?.oneLiner,
        input.snapshot?.brandPositioning?.mentalPosition,
        input.snapshot?.risks?.[0]?.risk,
      ]
        .filter(Boolean)
        .join(" "),
    ).note,
    input.snapshot?.validation?.day30?.length
      ? "当前偏好先做一轮定位验证。"
      : "当前偏好仍在定位阶段持续校准。",
  ];

  const brandMemory = [
    input.snapshot?.brandPositioning?.mentalPosition,
    input.snapshot?.brandPositioning?.differentiation,
    ...input.reports.slice(0, 2).map((item) => item.title),
  ]
    .filter((item): item is string => Boolean(item))
    .slice(0, 3);

  const decisionMemory = [
    input.snapshot?.oneLiner,
    ...input.history.slice(0, 2).map((item) => item.judgement || item.strategy || ""),
  ]
    .filter((item): item is string => Boolean(item))
    .slice(0, 3);

  return {
    founderMemory,
    brandMemory,
    decisionMemory,
  };
}

function buildBrandAssetLedger(input: {
  marketResearch: MarketResearch | null;
  theoryCards: TheoryCard[];
  candidates: Candidate[];
  snapshot: any;
}) {
  const items = [
    {
      id: "brand-brief",
      kind: "底板",
      title: "品牌简报",
      statement: input.snapshot?.diagnosis || "品牌问题和增长阻力仍在形成。",
    },
    {
      id: "market-insight",
      kind: "洞察",
      title: "市场洞察",
      statement:
        input.marketResearch?.summary ||
        input.marketResearch?.opportunities?.[0] ||
        "等待市场情报写回定位协议。",
    },
    {
      id: "theory-proposal",
      kind: "提案",
      title: "理论提案",
      statement:
        input.theoryCards[0]?.preferred ||
        input.theoryCards[0]?.reason ||
        "等待三位专家形成可比较提案。",
    },
    {
      id: "position-contract",
      kind: "契约",
      title: "定位契约",
      statement:
        input.candidates[0]?.title ||
        input.snapshot?.oneLiner ||
        "等待当前定位方向进入战略冻结。",
    },
  ];

  return items;
}

function ensureStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        return String(obj.summary ?? obj.content ?? obj.reason ?? obj.value ?? obj.text ?? obj.title ?? "").trim();
      }
      return "";
    })
    .filter(Boolean);
}

function normalizeMarketResearch(value: unknown): MarketResearch | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const competitorFindingItems = Array.isArray(raw.competitorFindings)
    ? raw.competitorFindings
    : Array.isArray(raw.competitor_findings)
      ? raw.competitor_findings
      : null;
  const userVoiceItems = Array.isArray(raw.userVoices)
    ? raw.userVoices
    : Array.isArray(raw.user_voices)
      ? raw.user_voices
      : null;
  const competitorFindings = competitorFindingItems
    ? competitorFindingItems.reduce<MarketResearch["competitorFindings"]>((acc, item, index) => {
        if (!item || typeof item !== "object") return acc;
        const obj = item as Record<string, unknown>;
        acc.push({
          name: String(obj.name ?? obj.title ?? `竞品 ${index + 1}`),
          positioning: obj.positioning ? String(obj.positioning) : undefined,
          priceRange: obj.priceRange
            ? String(obj.priceRange)
            : obj.price_range
              ? String(obj.price_range)
              : undefined,
          strengths: ensureStringArray(obj.strengths ?? obj.advantages),
          weaknesses: ensureStringArray(obj.weaknesses ?? obj.gaps),
        });
        return acc;
      }, [])
    : [];
  const userVoices = userVoiceItems
    ? userVoiceItems.reduce<MarketResearch["userVoices"]>((acc, item) => {
        if (!item || typeof item !== "object") return acc;
        const obj = item as Record<string, unknown>;
        const quote = String(obj.quote ?? obj.content ?? obj.text ?? "").trim();
        if (!quote) return acc;
        acc.push({
          source: obj.source ? String(obj.source) : undefined,
          quote,
          sentiment: obj.sentiment ? String(obj.sentiment) : undefined,
        });
        return acc;
      }, [])
    : [];
  return {
    summary: raw.summary ? String(raw.summary) : raw.market_summary ? String(raw.market_summary) : undefined,
    marketSignals: ensureStringArray(raw.marketSignals ?? raw.market_signals ?? raw.hot_topics),
    opportunities: ensureStringArray(raw.opportunities ?? raw.opportunityGaps ?? raw.opportunity_gaps),
    risks: ensureStringArray(raw.risks ?? raw.market_risks),
    competitorFindings,
    userVoices,
    sourceCount:
      typeof raw.sourceCount === "number"
        ? raw.sourceCount
        : typeof raw.source_count === "number"
          ? raw.source_count
          : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : raw.updated_at ? String(raw.updated_at) : undefined,
  };
}

function normalizeCandidates(value: unknown, snapshot: any): Candidate[] {
  if (Array.isArray(value) && value.length > 0) {
    return value.reduce<Candidate[]>((acc, item, index) => {
      if (!item || typeof item !== "object") return acc;
      const obj = item as Record<string, unknown>;
      const title = String(obj.title ?? obj.name ?? obj.direction ?? obj.positioning ?? "").trim();
      if (!title) return acc;
      acc.push({
        id: String(obj.id ?? obj.code ?? `candidate-${index + 1}`),
        title,
        fit: obj.fit ? String(obj.fit) : obj.scenario ? String(obj.scenario) : undefined,
        why: obj.why ? String(obj.why) : obj.reason ? String(obj.reason) : undefined,
        risk: obj.risk ? String(obj.risk) : undefined,
        tag: obj.tag ? String(obj.tag) : index === 0 ? "优先方向" : "候选方向",
      });
      return acc;
    }, []);
  }
  if (!snapshot) return [];
  const derived: Candidate[] = [
    {
      id: "current",
      title: snapshot.oneLiner,
      fit: snapshot.brandPositioning?.targetCustomers ?? "优先服务当前目标客群",
      why: snapshot.strategy ?? snapshot.diagnosis ?? "沿用当前定位主方向。",
      risk: snapshot.risks?.[0]?.risk ?? "仍需验证用户是否真正买单。",
      tag: "当前主方向",
    },
  ];
  if (snapshot.brandPositioning?.differentiation) {
    derived.push({
      id: "differentiation",
      title: `放大 ${snapshot.brandPositioning.differentiation}`,
      fit: snapshot.brandPositioning.priceRange ?? "适合当前价格带测试",
      why: snapshot.brandPositioning.differentiation,
      risk: snapshot.risks?.[1]?.risk ?? "如果差异点不被感知，传播会失焦。",
      tag: "差异化测试",
    });
  }
  if (snapshot.nextSteps?.[0]?.step) {
    derived.push({
      id: "execution",
      title: "先做小范围执行验证",
      fit: snapshot.nextSteps[0].timeline ?? "适合先做 30 天实验",
      why: snapshot.nextSteps[0].step,
      risk: snapshot.validation?.killCriteria?.[0] ?? "验证不足时不要直接放大投入。",
      tag: "执行验证",
    });
  }
  return derived.slice(0, 3);
}

function normalizeTheoryCards(theoryViews: unknown, theorySummary: unknown): TheoryCard[] {
  const labelMap: Record<string, string> = {
    ries: "里斯视角",
    trout: "特劳特视角",
    ye_maozhong: "叶茂中视角",
  };
  const recommendMap: Record<string, string> = {
    strong_recommend: "强支持",
    recommend: "支持",
    weak_recommend: "保留",
    not_recommend: "反对",
  };
  if (theoryViews && typeof theoryViews === "object") {
    const raw = theoryViews as Record<string, unknown>;
    const cards = Object.entries(raw).reduce<TheoryCard[]>((acc, [key, value]) => {
      if (!value || typeof value !== "object") return acc;
      const obj = value as Record<string, unknown>;
      acc.push({
        key,
        label: labelMap[key] ?? key,
        preferred: String(obj.preferred ?? obj.direction ?? obj.summary ?? obj.positioning ?? "").trim(),
        recommend: String(obj.recommendation ?? obj.theory_recommend ?? obj.vote ?? "已评估"),
        reason: obj.reason
          ? String(obj.reason)
          : obj.support_reason
            ? String(obj.support_reason)
            : ensureStringArray(obj.reasons ?? obj.support_points)[0],
        attack: obj.attack
          ? String(obj.attack)
          : obj.challenge
            ? String(obj.challenge)
            : ensureStringArray(obj.attacks ?? obj.attack_points ?? obj.against)[0],
      });
      return acc;
    }, []);
    if (cards.length > 0) return cards;
  }
  return Object.entries((theorySummary as Record<string, any>) ?? {}).map(([key, value]) => ({
    key,
    label: labelMap[key] ?? key,
    preferred: value?.preferred ?? "本轮未形成清晰偏好",
    recommend: recommendMap[value?.theory_recommend ?? ""] ?? "已评估",
    reason: value?.preferred ? `更支持这条方向：${value.preferred}` : undefined,
  }));
}

function normalizeCrossFire(value: unknown, snapshot: any): CrossFireData | null {
  if (typeof value === "string" && value.trim()) {
    return {
      summary: value.trim(),
      conflicts: snapshot?.risks?.map((item: any) => item.risk ?? "").filter(Boolean) ?? [],
      consensus: snapshot?.nextSteps?.slice(0, 2).map((item: any) => item.step ?? "").filter(Boolean) ?? [],
      rejected: snapshot?.validation?.killCriteria ?? [],
      decision: snapshot?.mSolution?.decision ?? snapshot?.decision_recommend,
    };
  }
  if (value && typeof value === "object") {
    const raw = value as Record<string, unknown>;
    return {
      summary: raw.summary ? String(raw.summary) : raw.narrative ? String(raw.narrative) : undefined,
      conflicts: ensureStringArray(raw.conflicts ?? raw.attacks ?? raw.conflict_points),
      consensus: ensureStringArray(raw.consensus ?? raw.sharedView ?? raw.consensus_points),
      rejected: ensureStringArray(raw.rejected ?? raw.eliminated ?? raw.rejected_options),
      decision: raw.decision ? String(raw.decision) : raw.final_choice ? String(raw.final_choice) : undefined,
    };
  }
  if (!snapshot) return null;
  return {
    summary: snapshot.diagnosis ?? snapshot.strategy,
    conflicts: snapshot?.risks?.map((item: any) => item.risk ?? "").filter(Boolean) ?? [],
    consensus: [
      snapshot.brandPositioning?.mentalPosition ?? snapshot.oneLiner,
      snapshot.brandPositioning?.differentiation ?? snapshot.strategy,
    ].filter(Boolean),
    rejected: snapshot.validation?.killCriteria ?? [],
    decision: snapshot.decision_recommend ?? snapshot.mSolution?.decision,
  };
}

const QUICK_PROMPTS = [
  "请先帮我做一次完整品牌战略诊断，再推进定位。",
  "请判断我真正应该服务的目标客群和核心场景。",
  "请结合竞品，判断我最该建立的差异化是什么。",
  "请给我 3 个定位方向，并说明为什么推荐排序。",
  "请输出一句话定位和 90 天验证动作。",
];

function JourneyStageChip({
  index,
  label,
  status,
}: {
  index: number;
  label: string;
  status: StageStatus;
}) {
  const tone =
    status === "done"
      ? "border-[rgba(102,115,94,0.22)] bg-[rgba(102,115,94,0.10)]"
      : status === "current"
        ? "border-[rgba(180,124,92,0.28)] bg-[rgba(180,124,92,0.12)]"
        : "border-[rgba(24,24,23,0.06)] bg-white/88";
  const dotClass =
    status === "done"
      ? "bg-[#66735E] text-white"
      : status === "current"
        ? "bg-[#B47C5C] text-white"
        : "bg-[#F1EEE7] text-[#6f747b]";
  return (
    <div className={`min-w-0 rounded-[14px] border px-2.5 py-2.5 ${tone}`}>
      <div className="flex items-center gap-2">
        <div
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-medium ${dotClass}`}
        >
          {String(index).padStart(2, "0")}
        </div>
        <p className="min-w-0 truncate text-[12px] font-medium leading-4 text-[#202124]">{label}</p>
      </div>
    </div>
  );
}

function ChiefAdvisorDesk({
  currentStage,
  summary,
  known,
  missing,
  recommendation,
}: {
  currentStage: string;
  summary: string;
  known: string[];
  missing: string[];
  recommendation: string;
}) {
  return (
    <section className="rounded-[22px] border border-[rgba(24,24,23,0.06)] bg-[#181817] p-4 text-[#F6F3ED] shadow-[0_14px_30px_rgba(24,24,23,0.12)]">
      <p className="text-[12px] tracking-[0.08em] text-[#B7BEA8]">AI 首席顾问</p>
      <h2 className="mt-1 text-[18px] leading-7 text-white">战略主持人</h2>
      <p className="mt-2 text-[13px] leading-6 text-[#D7D4CB]">当前阶段：{currentStage}</p>
      <p className="mt-3 text-[14px] leading-7 text-[#F6F3ED]">{summary}</p>
      <div className="mt-4 grid gap-3 md:hidden">
        <div className="rounded-[18px] bg-[rgba(255,255,255,0.06)] p-4">
          <p className="text-[12px] tracking-[0.01em] text-[#B7BEA8]">随行顾问</p>
          <p className="mt-1 text-[14px] leading-6 text-white">{recommendation}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] text-[#D7D4CB]">
            <div className="rounded-[12px] bg-[rgba(255,255,255,0.05)] px-3 py-2">已掌握 {known.length || 1} 项</div>
            <div className="rounded-[12px] bg-[rgba(255,255,255,0.05)] px-3 py-2">待补 {missing.length} 项</div>
          </div>
        </div>
      </div>
      <div className="mt-4 hidden rounded-[18px] bg-[rgba(255,255,255,0.06)] p-4 md:block">
        <p className="text-[12px] tracking-[0.01em] text-[#B7BEA8]">我已经了解</p>
        <ul className="mt-2 space-y-2 text-[13px] leading-6 text-[#F6F3ED]">
          {known.length > 0
            ? known.slice(0, 4).map((item) => <li key={item}>✓ {item}</li>)
            : <li>✓ 正在建立品牌理解</li>}
        </ul>
      </div>
      <div className="mt-3 hidden rounded-[18px] bg-[rgba(255,255,255,0.06)] p-4 md:block">
        <p className="text-[12px] tracking-[0.01em] text-[#B7BEA8]">还缺什么</p>
        <ul className="mt-2 space-y-2 text-[13px] leading-6 text-[#F6F3ED]">
          {missing.length > 0
            ? missing.slice(0, 4).map((item) => <li key={item}>• {item}</li>)
            : <li>• 当前阶段信息已基本齐备</li>}
        </ul>
      </div>
      <div className="mt-3 hidden rounded-[18px] bg-[rgba(102,115,94,0.22)] p-4 md:block">
        <p className="text-[12px] tracking-[0.01em] text-[#DDE4CF]">建议下一步</p>
        <p className="mt-1 text-[14px] leading-7 text-white">{recommendation}</p>
      </div>
    </section>
  );
}

function StrategyMapCard({
  brand,
  category,
  audience,
  differentiation,
  goal,
}: {
  brand: string;
  category: string;
  audience: string;
  differentiation: string;
  goal: string;
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-[22px] border border-[rgba(24,24,23,0.06)] bg-white p-4 shadow-[0_1px_0_rgba(24,24,23,0.04)] md:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] tracking-[0.08em] text-[#66735E]">品牌战略地图</p>
          <h2 className="mt-1 text-[18px] leading-7 text-[#202124]">先看清竞争、差异和目标怎么咬合</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <MKMetaPill label="品牌" value={brand} />
          <MKMetaPill label="客群" value={audience} />
        </div>
      </div>
      <div className="mt-4 min-w-0 rounded-[20px] bg-[linear-gradient(180deg,#fbfaf7_0%,#f4f5ef_100%)] p-4 md:p-5">
        <div>
          <div className="rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-white px-4 py-3 text-center">
            <p className="text-[11px] tracking-[0.01em] text-[#6f747b]">消费者</p>
            <p className="mt-1 break-words text-[14px] leading-6 text-[#202124]">{audience}</p>
          </div>
          <div className="my-3 flex items-center justify-center text-[#B47C5C]" aria-hidden>
            ▲
          </div>
          <div className="grid min-w-0 gap-3 md:grid-cols-3 md:items-stretch">
            <div className="min-w-0 rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-white px-4 py-4">
              <p className="text-[11px] tracking-[0.01em] text-[#6f747b]">竞争 / 品类</p>
              <p className="mt-2 break-words text-[14px] leading-6 text-[#202124]">{category}</p>
            </div>
            <div className="flex min-w-0 items-center justify-center rounded-[16px] bg-[#181817] px-4 py-4 text-center">
              <div>
                <p className="text-[11px] tracking-[0.08em] text-[#B7BEA8]">定位锚点</p>
                <p className="mt-2 text-[15px] font-medium leading-6 text-white">品牌定位</p>
              </div>
            </div>
            <div className="min-w-0 rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-white px-4 py-4">
              <p className="text-[11px] tracking-[0.01em] text-[#6f747b]">差异</p>
              <p className="mt-2 break-words text-[14px] leading-6 text-[#202124]">{differentiation}</p>
            </div>
          </div>
          <div className="my-3 flex items-center justify-center text-[#B47C5C]" aria-hidden>
            ▼
          </div>
          <div className="rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-white px-4 py-3">
            <p className="text-[11px] tracking-[0.01em] text-[#6f747b]">商业目标</p>
            <p className="mt-1 break-words text-[14px] leading-6 text-[#202124]">{goal}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function OpportunityGapMap({
  currentMarket = "待识别品类",
  emergingMarket = "待识别细分方向",
  whitespace,
  conclusion,
  pressure,
  trend,
}: {
  currentMarket?: string;
  emergingMarket?: string;
  whitespace: string;
  conclusion: string;
  pressure: string;
  trend: string;
}) {
  return (
    <section className="rounded-[18px] border border-[rgba(24,24,23,0.05)] bg-[linear-gradient(180deg,#fbfaf7_0%,#f4f5ef_100%)] p-4">
      <p className="text-[12px] tracking-[0.01em] text-[#66735E]">机会缺口</p>
      <div className="mt-3 grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[16px] bg-white/88 p-4">
          <div className="space-y-3 text-[13px] leading-6 text-[#202124]">
            <div>
              <p className="text-[11px] tracking-[0.01em] text-[#6f747b]">目前市场</p>
              <div className="mt-2 rounded-full bg-[rgba(24,24,23,0.06)] px-3 py-2">{currentMarket}</div>
              <div className="mt-2 w-4/5 rounded-full bg-[rgba(24,24,23,0.06)] px-3 py-2">{emergingMarket}</div>
            </div>
            <div className="rounded-[14px] border border-[rgba(102,115,94,0.14)] bg-[rgba(102,115,94,0.08)] px-3 py-3">
              <p className="text-[11px] tracking-[0.01em] text-[#66735E]">★ 机会区域</p>
              <p className="mt-1 text-[14px] leading-6 text-[#202124]">{whitespace}</p>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          <TopicListCard title="趋势信号" items={[trend]} empty="待补" compact />
          <TopicListCard title="竞争压力" items={[pressure]} empty="待补" compact />
        </div>
      </div>
      <div className="mt-3 rounded-[16px] bg-white/88 px-4 py-3">
        <p className="text-[11px] tracking-[0.01em] text-[#6f747b]">AI 判断</p>
        <p className="mt-1 text-[13px] leading-6 text-[#202124]">{conclusion}</p>
      </div>
    </section>
  );
}

function StrategyMeetingPanel({
  turns,
  conflict,
  consensus,
  reasons,
}: {
  turns: Array<{ speaker: string; statement: string; challenge: string }>;
  conflict: string;
  consensus: string;
  reasons: string[];
}) {
  const summaryText =
    conflict && consensus
      ? `核心分歧在于：${conflict}。各方形成共识：${consensus}。`
      : consensus
        ? `各方已形成共识：${consensus}。`
        : "正在把专家分歧压成战略共识。";

  return (
    <section className="mt-4 rounded-[20px] border border-[rgba(24,24,23,0.05)] bg-[linear-gradient(180deg,#fbfaf7_0%,#f1f2ec_100%)] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[12px] tracking-[0.01em] text-[#66735E]">AI 主持会议</p>
          <p className="mt-1 text-[16px] leading-7 text-[#202124]">正在把专家分歧压成战略共识</p>
        </div>
        <div className="rounded-full bg-white/92 px-3 py-1.5 text-[12px] text-[#6f747b]">{turns.length} 轮发言</div>
      </div>
      <div className="mt-4 space-y-3">
        {turns.map((turn, index) => (
          <div key={`${turn.speaker}-${index}`} className="grid grid-cols-[auto_1fr] gap-3">
            <div className="flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#181817] text-[11px] font-medium text-white">
                {index + 1}
              </div>
              {index < turns.length - 1 && <div className="mt-2 h-full min-h-8 w-px bg-[rgba(24,24,23,0.12)]" />}
            </div>
            <div className="rounded-[16px] bg-white/92 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[12px] tracking-[0.01em] text-[#66735E]">{turn.speaker}</p>
                <span className="rounded-full bg-[rgba(24,24,23,0.05)] px-2.5 py-1 text-[11px] text-[#6f747b]">发言中</span>
              </div>
              <p className="mt-1 text-[14px] leading-6 text-[#202124]">{turn.statement}</p>
              <div className="mt-3 rounded-[12px] bg-[rgba(180,124,92,0.08)] px-3 py-2">
                <p className="text-[11px] tracking-[0.01em] text-[#8A4F31]">挑战</p>
                <p className="mt-1 text-[12px] leading-5 text-[#8A4F31]">{turn.challenge}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 rounded-[16px] border border-[rgba(24,24,23,0.05)] bg-white/92 px-4 py-3">
        <p className="text-[12px] tracking-[0.01em] text-[#66735E]">AI 主持人总结</p>
        <p className="mt-1 text-[14px] leading-6 text-[#202124]">{summaryText}</p>
      </div>
      <div className="mt-4 space-y-3">
        <div className="rounded-[16px] border border-[rgba(180,124,92,0.16)] bg-[rgba(180,124,92,0.08)] px-4 py-3">
          <p className="text-[12px] tracking-[0.01em] text-[#8A4F31]">核心冲突</p>
          <p className="mt-1 text-[14px] leading-6 text-[#202124]">{conflict}</p>
        </div>
        <div className="rounded-[16px] border border-[rgba(102,115,94,0.16)] bg-[rgba(102,115,94,0.08)] px-4 py-3">
          <p className="text-[12px] tracking-[0.01em] text-[#66735E]">战略共识</p>
          <p className="mt-1 text-[14px] leading-6 text-[#202124]">{consensus}</p>
          {reasons.length > 0 && (
            <ul className="mt-2 space-y-1.5">
              {reasons.slice(0, 3).map((item, index) => (
                <li key={`${item}-${index}`} className="text-[12px] leading-5 text-[#5f6368]">
                  {index + 1}. {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function ContractFreezeFrame({
  statement,
  targetCustomer,
  difference,
  brandCore,
  forbidden,
  version,
}: {
  statement: string;
  targetCustomer: string;
  difference: string;
  brandCore: string;
  forbidden: string;
  version: string;
}) {
  return (
    <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-[linear-gradient(180deg,#fbfaf7_0%,#f1f2ec_100%)] p-5 shadow-[0_14px_30px_rgba(24,24,23,0.04)]">
      <p className="text-[12px] tracking-[0.08em] text-[#66735E]">品牌战略资产</p>
      <div className="mt-3 rounded-[18px] border border-[rgba(24,24,23,0.06)] bg-white/92 p-4">
        <p className="text-[12px] tracking-[0.01em] text-[#6f747b]">一句话定位</p>
        <p className="mt-1 text-[18px] leading-7 text-[#202124]">{statement}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <ArchiveField label="核心用户" value={targetCustomer} />
          <ArchiveField label="竞争差异" value={difference} />
          <ArchiveField label="核心价值" value={brandCore} />
          <ArchiveField label="禁止事项" value={forbidden} />
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[12px] leading-5 text-[#5f6368]">{version}</p>
        <div className="rounded-full bg-[#181817] px-4 py-2 text-[12px] font-medium text-white">确认冻结定位</div>
      </div>
    </section>
  );
}

function ArchiveField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-[rgba(24,24,23,0.05)] bg-[#FBF9F5] px-3.5 py-3">
      <p className="text-[11px] tracking-[0.01em] text-[#6f747b]">{label}</p>
      <p className="mt-1 text-[13px] leading-6 text-[#202124]">{value}</p>
    </div>
  );
}

function TopicListCard({
  title,
  items,
  empty,
  compact = false,
}: {
  title: string;
  items: string[];
  empty: string;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-[16px] border border-[rgba(24,24,23,0.05)] bg-[#FBF9F5] ${compact ? "p-3" : "p-4"}`}>
      <p className="text-[12px] tracking-[0.01em] text-[#6f747b]">{title}</p>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-2">
          {items.slice(0, compact ? 3 : 4).map((item, index) => (
            <li key={`${title}-${index}`} className="text-[13px] leading-6 text-[#202124]">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[13px] leading-6 text-[#5f6368]">{empty}</p>
      )}
    </div>
  );
}

function TopicMetricCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-[16px] bg-white/82 px-3 py-3 md:px-4">
      <p className="text-[12px] tracking-[0.01em] text-[#6f747b]">{label}</p>
      <p className="mt-1 text-[16px] leading-6 text-[#202124] md:text-[18px] md:leading-7">{value}</p>
      <p className="mt-1 line-clamp-2 text-[12px] leading-5 text-[#5f6368]">{note}</p>
    </div>
  );
}

function CandidateDirectionCard({
  title,
  tag,
  fit,
  why,
  risk,
  emphasis,
  onSelect,
}: {
  title: string;
  tag: string;
  fit?: string;
  why?: string;
  risk?: string;
  emphasis: "primary" | "secondary" | "normal";
  onSelect: () => void;
}) {
  const toneClass =
    emphasis === "primary"
      ? "border-[rgba(102,115,94,0.16)] bg-[linear-gradient(180deg,#fbfaf7_0%,#eef1ea_100%)]"
      : emphasis === "secondary"
        ? "border-[rgba(180,124,92,0.14)] bg-[linear-gradient(180deg,#fbfaf7_0%,#f4efea_100%)]"
        : "border-[rgba(24,24,23,0.05)] bg-[#FBF9F5]";
  const badgeLabel = emphasis === "primary" ? "当前优先" : emphasis === "secondary" ? "可对照" : tag;
  return (
    <div className={`rounded-[18px] border p-3 md:p-4 ${toneClass}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] text-[#66735E]">{badgeLabel}</span>
      </div>
      <p className="mt-3 text-[16px] leading-6 text-[#202124] md:text-[17px] md:leading-7">{title}</p>
      {fit && (
        <p className="mt-2 text-[13px] leading-6 text-[#5f6368]">
          适合：{fit}
        </p>
      )}
      {why && (
        <div className="mt-3 rounded-[14px] bg-white/82 px-3 py-2">
          <p className="text-[11px] tracking-[0.01em] text-[#6f747b]">为什么选它</p>
          <p className="mt-1 text-[13px] leading-6 text-[#202124]">{why}</p>
        </div>
      )}
      {risk && (
        <div className="mt-2 rounded-[14px] bg-[rgba(180,124,92,0.08)] px-3 py-2">
          <p className="text-[11px] tracking-[0.01em] text-[#8A4F31]">主要风险</p>
          <p className="mt-1 text-[12px] leading-6 text-[#8A4F31]">{risk}</p>
        </div>
      )}
      <button
        type="button"
        onClick={onSelect}
        className="mt-4 inline-flex min-h-9 w-full items-center justify-center rounded-full border border-[rgba(24,24,23,0.08)] bg-white px-4 py-2 text-[13px] font-medium text-[#202124] transition active:scale-[0.98]"
      >
        选择这个方向
      </button>
    </div>
  );
}

function TheoryPerspectiveCard({
  title,
  recommend,
  preferred,
  reason,
  attack,
}: {
  title: string;
  recommend: string;
  preferred: string;
  reason?: string;
  attack?: string;
}) {
  return (
    <div className="min-w-0 rounded-[18px] border border-[rgba(24,24,23,0.06)] bg-[#FBF9F5] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-[#202124]">{title}</p>
        <span className="shrink-0 rounded-full bg-[rgba(102,115,94,0.1)] px-2.5 py-1 text-[11px] text-[#66735E]">
          {recommend}
        </span>
      </div>
      {preferred && (
        <div className="mt-3">
          <p className="text-[11px] tracking-[0.01em] text-[#6f747b]">偏好方向</p>
          <p className="mt-1 text-[13px] leading-6 text-[#202124]">{preferred}</p>
        </div>
      )}
      {reason && (
        <div className="mt-3">
          <p className="text-[11px] tracking-[0.01em] text-[#6f747b]">支持理由</p>
          <p className="mt-1 text-[12px] leading-5 text-[#5f6368]">{reason}</p>
        </div>
      )}
      {attack && (
        <div className="mt-3 rounded-[12px] bg-[rgba(180,124,92,0.08)] px-3 py-2">
          <p className="text-[11px] tracking-[0.01em] text-[#8A4F31]">挑战点</p>
          <p className="mt-1 text-[12px] leading-5 text-[#8A4F31]">{attack}</p>
        </div>
      )}
    </div>
  );
}

function CrossfireOutcomeCard({
  summary,
  conflicts,
  consensus,
  decision,
}: {
  summary?: string;
  conflicts: string[];
  consensus: string[];
  rejected?: string[];
  decision?: string;
}) {
  return (
    <div className="mt-4 rounded-[18px] border border-[rgba(24,24,23,0.06)] bg-[#FBF9F5] p-4">
      {summary && (
        <div className="mb-3">
          <p className="text-[12px] tracking-[0.01em] text-[#66735E]">交火总结</p>
          <p className="mt-1 text-[14px] leading-7 text-[#202124]">{summary}</p>
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {conflicts.length > 0 && <TopicListCard title="主要冲突" items={conflicts} empty="暂无记录" />}
        {consensus.length > 0 && <TopicListCard title="战略共识" items={consensus} empty="暂无记录" />}
      </div>
      {decision && (
        <div className="mt-3 rounded-[14px] border border-[rgba(102,115,94,0.14)] bg-[rgba(102,115,94,0.08)] px-3 py-3">
          <p className="text-[11px] tracking-[0.01em] text-[#66735E]">最终建议</p>
          <p className="mt-1 text-[13px] leading-6 text-[#202124]">{decision}</p>
        </div>
      )}
    </div>
  );
}

function OutcomeCard({
  title,
  summary,
  details,
  tone,
}: {
  title: string;
  summary: string;
  details: string[];
  tone: "strategy" | "execution" | "validation";
}) {
  const toneClass =
    tone === "strategy"
      ? "border-[rgba(24,24,23,0.06)] bg-[linear-gradient(180deg,#fbfaf7_0%,#eef1ea_100%)]"
      : tone === "execution"
        ? "border-[rgba(24,24,23,0.06)] bg-white"
        : "border-[rgba(24,24,23,0.06)] bg-[#FBF9F5]";
  return (
    <div className={`min-w-0 rounded-[18px] border p-4 ${toneClass}`}>
      <p className="text-[12px] tracking-[0.01em] text-[#6f747b]">{title}</p>
      <p className="mt-2 text-[15px] leading-6 text-[#202124]">{summary}</p>
      {details.length > 0 && (
        <ul className="mt-3 space-y-2">
          {details.slice(0, 4).map((item, i) => (
            <li key={i} className="text-[12px] leading-5 text-[#5f6368]">
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function PositioningPage({ params }: { params: { projectId: string } }) {
  const projectId = params.projectId;
  const metaQuery = trpc.agent.positioningMeta.useQuery();
  const historyQuery = trpc.agent.positioningHistory.useQuery({ projectId, limit: 8 });
  const reportsQuery = trpc.agent.positioningReports.useQuery({ projectId, limit: 5 });
  const projectQuery = trpc.project.getById.useQuery({ id: projectId });
  const contextQuery = trpc.agent.positioningContext.useQuery({ projectId });
  const utils = trpc.useUtils();

  const [input, setInput] = useState("请基于当前项目信息，完成一次完整的餐饮品牌定位决策。");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [runtimeMeta, setRuntimeMeta] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [liveSnapshot, setLiveSnapshot] = useState<any>(null);
  const [livePrevious, setLivePrevious] = useState<any>(null);
  const [liveDiff, setLiveDiff] = useState<any>(null);
  const [localMarketHandoff, setLocalMarketHandoff] = useState<any>(null);
  const [dismissedSharedHandoff, setDismissedSharedHandoff] = useState(false);
  const [positioningIntake, setPositioningIntake] = useState({
    brand: "",
    category: "",
    audience: "",
    differentiation: "",
  });
  const [feedbackDone, setFeedbackDone] = useState(false);

  const speechInput = useSpeechToTextField();
  const endRef = useRef<HTMLDivElement>(null);

  const feedbackMutation = trpc.agent.positioningFeedback.useMutation({
    onSuccess: () => setFeedbackDone(true),
  });

  function applyPositioningIntake() {
    setInput(buildPositioningIntakePrompt(positioningIntake));
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [streamText, liveSnapshot]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(`market_handoff_${projectId}`);
      if (!raw) return;
      setLocalMarketHandoff(JSON.parse(raw));
    } catch {
      setLocalMarketHandoff(null);
    }
  }, [projectId]);

  const displaySnapshot = liveSnapshot ?? contextQuery.data?.current ?? null;
  const displayPrevious = liveSnapshot ? livePrevious : contextQuery.data?.previous ?? null;
  const displayDiff = liveSnapshot ? liveDiff : contextQuery.data?.diff ?? null;
  const workbenchData: any = contextQuery.data ?? {};
  const queryMarketHandoff =
    workbenchData.marketHandoff && typeof workbenchData.marketHandoff === "object"
      ? workbenchData.marketHandoff
      : null;
  const marketHandoff = dismissedSharedHandoff ? localMarketHandoff : queryMarketHandoff ?? localMarketHandoff;
  const pageOutput =
    workbenchData.pageOutput && typeof workbenchData.pageOutput === "object" ? workbenchData.pageOutput : null;
  const marketResearch = normalizeMarketResearch(
    workbenchData.marketResearch ?? pageOutput?.marketResearch ?? pageOutput?.market_research,
  );
  const candidates = normalizeCandidates(
    displaySnapshot?.candidates ?? workbenchData.candidates ?? pageOutput?.candidates,
    displaySnapshot,
  );
  const theoryCards = normalizeTheoryCards(
    workbenchData.theoryViews ?? pageOutput?.theoryViews ?? pageOutput?.theory_views,
    displaySnapshot?.theoryVoteSummary,
  );
  const crossFire = normalizeCrossFire(
    displaySnapshot?.crossFireGameSummary
      ? {
          summary: displaySnapshot.crossFireGameSummary,
          decision: displaySnapshot.mSolution?.decision ?? displaySnapshot.decision_recommend,
        }
      : workbenchData.crossFire ??
          pageOutput?.crossFire ??
          pageOutput?.cross_fire ??
          pageOutput?.cross_fire_game_summary,
    displaySnapshot,
  );
  const synthesis =
    workbenchData.synthesis && typeof workbenchData.synthesis === "object"
      ? workbenchData.synthesis
      : pageOutput?.synthesis && typeof pageOutput.synthesis === "object"
        ? pageOutput.synthesis
        : null;
  const synthesisSummary = typeof synthesis?.summary === "string" ? synthesis.summary : undefined;

  const brandName =
    displaySnapshot?.brandPositioning?.brandName ??
    (typeof pageOutput?.brand_name === "string" ? pageOutput.brand_name : null) ??
    (typeof pageOutput?.brandName === "string" ? pageOutput.brandName : null) ??
    projectQuery.data?.name ??
    "";
  const categoryName =
    displaySnapshot?.brandPositioning?.category ??
    (projectQuery.data?.category ? String(projectQuery.data.category) : "");
  const strategySummary =
    displaySnapshot?.mSolution?.position ??
    displaySnapshot?.brandPositioning?.mentalPosition ??
    displaySnapshot?.oneLiner ??
    "待形成";
  const executionSummary =
    displaySnapshot?.mSolution?.action ??
    displaySnapshot?.action ??
    displaySnapshot?.nextSteps?.[0]?.step ??
    "待补执行路径";
  const validationSummary =
    displaySnapshot?.mSolution?.validation ??
    displaySnapshot?.validation?.day30?.[0] ??
    displaySnapshot?.validation?.killCriteria?.[0] ??
    "待补验证条件";
  const contractVersionLabel = displaySnapshot?.updatedAt
    ? `品牌战略 v1.0 · ${new Date(displaySnapshot.updatedAt).toLocaleDateString("zh-CN")}`
    : "品牌战略 v1.0";
  const opportunityWhitespace =
    marketResearch?.opportunities?.[0] ?? marketHandoff?.handoffPayload?.opportunity ?? "年轻社交场景";
  const marketCoreJudgement =
    marketResearch?.summary ??
    (marketHandoff?.handoffPayload?.suggestedPositioning
      ? `机会正在向「${marketHandoff.handoffPayload.suggestedPositioning}」收敛。`
      : "市场机会仍待识别。");
  const currentDisputeLabel =
    crossFire?.conflicts?.[0] ??
    (theoryCards.length >= 2
      ? `${theoryCards[0]?.label ?? "理论 A"} vs ${theoryCards[1]?.label ?? "理论 B"}`
      : "等待专家形成清晰分歧");
  const strategyMeetingTurns = theoryCards.slice(0, 3).map((card) => ({
    speaker: card.label,
    statement: card.recommend ?? card.reason ?? "等待观点形成",
    challenge: card.attack ?? "等待补充分歧",
  }));
  const strategyMeetingConsensus = crossFire?.decision ?? synthesisSummary ?? strategySummary;
  const strategyMeetingReasons = [
    ...(crossFire?.consensus ?? []),
    ...((displaySnapshot?.nextSteps ?? []) as any[]).slice(0, 2).map((item: any) => item.step),
  ].filter(Boolean);
  const strategyDetails = [
    displaySnapshot?.overallScore != null ? `综合分：${Math.round(displaySnapshot.overallScore)}` : null,
    displaySnapshot?.mindPositionLevel ? `定位等级：${displaySnapshot.mindPositionLevel}` : null,
    displaySnapshot?.maxRiskSeverity ? `最高风险：${displaySnapshot.maxRiskSeverity}` : null,
    brandName ? `品牌名：${brandName}` : null,
    categoryName ? `品类：${categoryName}` : null,
    displaySnapshot?.brandPositioning?.targetCustomers
      ? `客群：${displaySnapshot.brandPositioning.targetCustomers}`
      : null,
    displaySnapshot?.brandPositioning?.priceRange
      ? `价格带：${displaySnapshot.brandPositioning.priceRange}`
      : null,
    displaySnapshot?.brandPositioning?.differentiation
      ? `差异化：${displaySnapshot.brandPositioning.differentiation}`
      : null,
  ].filter(Boolean) as string[];
  const executionDetails = (
    (displaySnapshot?.nextSteps as any[] | undefined)?.map((item: any) => {
      const suffix = [item.timeline, item.priority].filter(Boolean).join(" · ");
      return suffix ? `${item.step} · ${suffix}` : item.step ?? "";
    }) ?? []
  ).filter(Boolean);
  const validationDetails = [
    ...((displaySnapshot?.validation?.day30 as string[] | undefined) ?? []).map((item) => `30 天：${item}`),
    ...((displaySnapshot?.validation?.day90 as string[] | undefined) ?? []).map((item) => `90 天：${item}`),
    ...((displaySnapshot?.validation?.killCriteria as string[] | undefined) ?? []).map((item) => `止损：${item}`),
  ].filter(Boolean);

  const leadCandidate = candidates[0];
  const freezePrompt = leadCandidate
    ? [
        `我准备把「${leadCandidate.title}」作为当前品牌定位方向。`,
        leadCandidate.fit ? `适用场景：${leadCandidate.fit}` : null,
        leadCandidate.why ? `我倾向它的原因：${leadCandidate.why}` : null,
        "请把这条方向继续压缩成可以冻结的品牌定位契约。",
      ]
        .filter(Boolean)
        .join("\n")
    : ["请把当前专家共识继续压缩成品牌定位契约。", "要求明确目标用户、核心价值、竞争差异和禁止事项。"].join("\n");

  const handoffPrompt = marketHandoff?.handoffPayload
    ? [
        "请基于以下市场机会卡，直接完成本轮品牌定位，不要重新回到泛泛市场分析。",
        marketHandoff.opportunityId ? `机会编号：${marketHandoff.opportunityId}` : null,
        marketHandoff.handoffPayload.city ? `城市：${marketHandoff.handoffPayload.city}` : null,
        marketHandoff.handoffPayload.district ? `区域：${marketHandoff.handoffPayload.district}` : null,
        marketHandoff.handoffPayload.category ? `品类：${marketHandoff.handoffPayload.category}` : null,
        marketHandoff.handoffPayload.opportunity ? `市场机会：${marketHandoff.handoffPayload.opportunity}` : null,
        marketHandoff.handoffPayload.suggestedPositioning
          ? `建议定位方向：${marketHandoff.handoffPayload.suggestedPositioning}`
          : null,
        marketHandoff.handoffPayload.suggestedPriceBand
          ? `建议价格带：${marketHandoff.handoffPayload.suggestedPriceBand}`
          : null,
        marketHandoff.handoffPayload.suggestedArea
          ? `建议面积：${marketHandoff.handoffPayload.suggestedArea}`
          : null,
        typeof marketHandoff.handoffPayload.entryProbability === "number"
          ? `进入概率：${marketHandoff.handoffPayload.entryProbability}`
          : null,
        "输出必须包含：一句话心智位置、目标客群、差异化、价格带建议、30 天验证动作。",
      ]
        .filter(Boolean)
        .join("\n")
    : null;

  useEffect(() => {
    if (!handoffPrompt) return;
    setInput((current) =>
      current === "请基于当前项目信息，完成一次完整的餐饮品牌定位决策。" ? handoffPrompt : current,
    );
  }, [handoffPrompt]);

  useEffect(() => {
    setDismissedSharedHandoff(false);
  }, [projectId, queryMarketHandoff?.opportunityId, queryMarketHandoff?.createdAt]);

  const runPositioning = useCallback(
    async (message: string) => {
      if (streaming || !message.trim()) return;
      setStreaming(true);
      setStreamText("");
      setError(null);
      setLiveSnapshot(null);
      setLivePrevious(null);
      setLiveDiff(null);
      try {
        const response = await fetch("/api/agent/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, message: message.trim(), conversationId, forceAgent: "m-pnt" }),
        });
        if (!response.ok) throw new Error(`请求失败 HTTP ${response.status}`);
        const reader = response.body?.getReader();
        if (!reader) throw new Error("无法读取流式响应");
        const decoder = new TextDecoder();
        let accumulated = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "meta") {
                setRuntimeMeta(data);
                if (data.conversationId) setConversationId(data.conversationId);
              }
              if (data.type === "text" && typeof data.content === "string") {
                accumulated += data.content;
                setStreamText(accumulated);
              }
              if (data.type === "positioning_result" && data.data) {
                setLiveSnapshot(data.data);
                setLivePrevious(data.previous ?? null);
                setLiveDiff(data.diff ?? null);
              }
              if (data.type === "error" && typeof data.message === "string") {
                accumulated += `\n\n❌ ${data.message}`;
                setStreamText(accumulated);
                setError(data.message);
              }
            } catch {
              // ignore partial SSE lines
            }
          }
        }
        await Promise.all([
          utils.agent.positioningHistory.invalidate({ projectId }),
          utils.agent.positioningReports.invalidate({ projectId }),
          utils.agent.latestPositioning.invalidate({ projectId }),
          utils.agent.positioningContext.invalidate({ projectId }),
          utils.dashboard.getProjectOverview.invalidate({ projectId }),
          utils.dashboard.getAdvisorWorkspace.invalidate({ projectId }),
          utils.report.list.invalidate({ projectId }),
          utils.project.getById.invalidate({ id: projectId }),
        ]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "未知错误";
        setError(msg);
        setStreamText((prev) => prev || `出错了：${msg}`);
      } finally {
        setStreaming(false);
      }
    },
    [conversationId, projectId, streaming, utils],
  );

  if (projectQuery.isLoading || metaQuery.isLoading) {
    return (
      <PageLoadingState
        eyebrow="品牌定位"
        title="正在打开品牌定位工作台"
        description="正在加载项目上下文。"
      />
    );
  }
  if (projectQuery.error || !projectQuery.data) {
    return (
      <div className="space-y-5 pb-2 pt-6 md:pt-8">
        <PageErrorState
          eyebrow="品牌定位"
          title="无法打开定位工作台"
          description="项目不存在或暂无权限。"
          primaryAction={{ href: "/projects", label: "返回经营世界" }}
        />
      </div>
    );
  }

  const project = projectQuery.data;
  const history = historyQuery.data ?? [];
  const reports = reportsQuery.data ?? [];
  const steps = metaQuery.data?.steps ?? [];
  const stepStatuses = buildStepStatuses(steps, streamText, streaming, Boolean(displaySnapshot));

  const hasInterview =
    Boolean(brandName) ||
    Boolean(categoryName) ||
    Boolean(project.city) ||
    Object.values(positioningIntake).some((v) => v.trim().length > 0);
  const hasDiagnosis = Boolean(displaySnapshot?.diagnosis || displaySnapshot?.overallScore != null);
  const hasMarketInsight = Boolean(marketResearch || marketHandoff?.handoffPayload);
  const hasCommittee = theoryCards.length > 0 || Boolean(crossFire);
  const hasOptions = candidates.length > 0;
  const hasDecision = Boolean(displaySnapshot?.decisionId || displaySnapshot?.oneLiner);
  const hasRoadmap = Boolean(
    displaySnapshot?.nextSteps?.length || displaySnapshot?.action || displaySnapshot?.mSolution?.action,
  );

  const consultingStages = buildConsultingStages({
    hasInterview,
    hasDiagnosis,
    hasMarketInsight,
    hasCommittee,
    hasOptions,
    hasDecision,
    hasRoadmap,
  });
  const consultingDoneCount = consultingStages.filter((s) => s.status === "done").length;
  const consultingPercent = Math.round((consultingDoneCount / consultingStages.length) * 100);
  const consultingJourneySteps: WorkspaceJourneyStep[] = consultingStages.map((stage) => ({
    id: stage.id,
    label: stage.label,
    note: stage.note,
    status:
      stage.status === "done"
        ? "completed"
        : stage.status === "current"
          ? "current"
          : "upcoming",
  }));
  const currentConsultingStage =
    consultingStages.find((s) => s.status === "current") ?? consultingStages[consultingStages.length - 1];
  const currentStepId = currentConsultingStage.id;
  const openWorkbench = !hasInterview || currentStepId === "understanding";
  const openAnalysis =
    streaming || currentStepId === "market" || currentStepId === "committee";
  const openResults =
    currentStepId === "options" || currentStepId === "decision" || currentStepId === "roadmap";

  const interviewQuestion = getInterviewQuestion({
    brandName,
    categoryName,
    cityName: project.city ?? "",
    intake: positioningIntake,
  });
  const consultantFeedback = getConsultantFeedback({
    brandName,
    categoryName,
    cityName: project.city ?? "",
    audience: positioningIntake.audience || displaySnapshot?.brandPositioning?.targetCustomers || "",
  });
  const archiveCompletion = Math.min(
    100,
    Math.round(
      ([
        brandName || positioningIntake.brand,
        categoryName || positioningIntake.category,
        project.city,
        positioningIntake.audience || displaySnapshot?.brandPositioning?.targetCustomers,
        positioningIntake.differentiation || displaySnapshot?.brandPositioning?.differentiation,
      ].filter(Boolean).length /
        5) *
        100,
    ),
  );
  const strategyHealthScore = Math.max(
    displaySnapshot?.overallScore != null ? Math.round(displaySnapshot.overallScore) : 0,
    archiveCompletion,
    hasMarketInsight ? 68 : 0,
  );
  const advisorKnown = [
    brandName ? `品牌名称：${brandName}` : null,
    categoryName ? `品类方向：${categoryName}` : null,
    project.city ? `经营城市：${project.city}` : null,
    positioningIntake.audience || displaySnapshot?.brandPositioning?.targetCustomers
      ? `目标客群：${positioningIntake.audience || displaySnapshot?.brandPositioning?.targetCustomers}`
      : null,
    hasMarketInsight ? "已接入市场洞察" : null,
    hasCommittee ? "已形成专家观点" : null,
  ].filter(Boolean) as string[];
  const advisorMissing = [
    !positioningIntake.audience && !displaySnapshot?.brandPositioning?.targetCustomers ? "核心客群定义" : null,
    !positioningIntake.differentiation && !displaySnapshot?.brandPositioning?.differentiation
      ? "差异化表达"
      : null,
    !hasMarketInsight ? "市场机会验证" : null,
    !hasCommittee ? "专家分歧与共识" : null,
    !hasDecision ? "创始人确认" : null,
  ].filter(Boolean) as string[];
  const activeWorkLabel =
    currentConsultingStage.id === "understanding"
      ? "继续完成品牌理解"
      : currentConsultingStage.id === "market"
        ? "进入市场洞察"
        : currentConsultingStage.id === "committee"
          ? "等待三位定位专家提出方案"
          : currentConsultingStage.id === "options"
            ? "比较定位方向"
            : currentConsultingStage.id === "decision"
              ? "冻结品牌战略"
              : "进入执行路径";
  const positioningProtocolProjection = buildPositioningProtocolProjection({
    project: {
      name: project.name,
      category: project.category,
      city: project.city,
    },
    brandName,
    categoryName,
    cityName: project.city ?? "",
    audience:
      positioningIntake.audience || displaySnapshot?.brandPositioning?.targetCustomers || "",
    differentiation:
      positioningIntake.differentiation ||
      displaySnapshot?.brandPositioning?.differentiation ||
      "",
    snapshot: displaySnapshot,
    leadCandidate,
    history,
    reports,
    marketResearch,
    theoryCards,
    candidates,
  });
  const {
    founderContextView,
    brandContextView,
    brandDecisionProtocolView,
    brandMemoryView,
    brandAssetLedger,
  } = positioningProtocolProjection;

  const currentMarketLabel = categoryName || "待识别品类";
  const emergingMarketLabel =
    marketResearch?.opportunities?.[0] ??
    marketHandoff?.handoffPayload?.suggestedPositioning ??
    "待识别细分方向";
  const board = getDepartmentBoard("brand");
  const experts = getDepartmentExperts("brand");
  const issue =
    displaySnapshot?.oneLiner ||
    displaySnapshot?.brandPositioning?.mentalPosition ||
    strategySummary ||
    "当前品牌定位判断";
  const meetingHref = getDepartmentMeetingHref(project.id, "brand", issue);
  const judgement =
    streamText ||
    displaySnapshot?.oneLiner ||
    displaySnapshot?.brandPositioning?.mentalPosition ||
    board.subtitle;

  return (
    <div className="space-y-5 pb-8">
      <DepartmentBoardShell
        board={board}
        projectId={project.id}
        meetingHref={meetingHref}
        issue={issue}
        judgement={judgement}
        experts={experts}
        siblingLinks={[
          { href: `/projects/${project.id}/market`, label: "市场研究部" },
          { href: `/projects/${project.id}/business`, label: "商业战略部" },
          { href: `/projects/${project.id}/equity`, label: "组织设计部" },
        ]}
      />

      <div className="min-w-0 space-y-5">
        <CollapsibleBoardSection
          eyebrow="工作台"
          title="品牌咨询工作台"
          summary={`当前：${currentConsultingStage.label} · 推进 ${consultingPercent}% · 正式判断请用上方开会`}
          defaultOpen={openWorkbench}
        >
        <section className="min-w-0 rounded-[20px] bg-[#FBFAF7] p-4 md:p-5">
          <p className="text-[12px] tracking-[0.08em] text-[#66735E]">深入工作台</p>
          <h2 className="mt-2 break-words text-[22px] leading-[1.25] tracking-[-0.04em] text-[#202124] md:text-[26px]">
            {brandName || "当前品牌"}品牌战略推进
          </h2>
          <p className="mt-3 max-w-3xl break-words text-[14px] leading-7 text-[#5f6368]">
            当前阶段：{currentConsultingStage.label}。补充事实与本轮咨询在此展开。
          </p>

          <div className="mt-5 min-w-0">
            <WorkspaceJourneyRail
              eyebrow="品牌旅程"
              title="战略旅程"
              progress={consultingPercent}
              summary="不是把问题丢给 AI，而是一步一步完成品牌战略思考。"
              steps={consultingJourneySteps}
              palette={{
                border: "border-[rgba(24,24,23,0.06)]",
                title: "text-[#202124]",
                eyebrow: "text-[#6f747b]",
                cardBg: "bg-white/56",
                progressBg: "bg-[rgba(255,255,255,0.72)]",
                progressTitle: "text-[#6f747b]",
                progressValue: "text-[#202124]",
                progressText: "text-[#5f6368]",
                completedTone: "border-[rgba(102,115,94,0.22)] bg-[rgba(102,115,94,0.10)] text-[#66735E]",
                currentTone: "border-[rgba(180,124,92,0.28)] bg-[rgba(180,124,92,0.12)] text-[#9A5B35]",
                upcomingTone: "border-[rgba(24,24,23,0.06)] bg-white/88 text-[#A0A5B0]",
                note: "text-[#6f747b]",
              }}
            />
          </div>

          <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
            <div className="min-w-0 rounded-[18px] bg-white/88 p-4">
              <p className="text-[12px] tracking-[0.01em] text-[#6f747b]">推进进度</p>
              <p className="mt-2 text-[22px] leading-none tracking-[-0.04em] text-[#5f6368]">{strategyHealthScore}</p>
              <p className="mt-2 break-words text-[13px] leading-6 text-[#5f6368]">下一步：{activeWorkLabel}</p>
            </div>
            <div className="min-w-0 rounded-[18px] bg-white/88 p-4">
              <p className="text-[12px] tracking-[0.01em] text-[#6f747b]">当前进行</p>
              <ul className="mt-2 space-y-2 text-[13px] leading-6 text-[#202124]">
                <li>✓ 创始人认知 {hasInterview ? "已建立" : "待建立"}</li>
                <li>✓ 市场分析 {hasMarketInsight ? "已接入" : "待接入"}</li>
                <li>● 专家方案 {hasCommittee ? "已形成" : "进行中"}</li>
              </ul>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <MKMetaPill label="品牌理解" value={hasInterview ? "已完成" : "进行中"} />
            <MKMetaPill label="市场洞察" value={hasMarketInsight ? "已完成" : "待进入"} />
            <MKMetaPill label="专家方案" value={hasCommittee ? "已形成" : "待形成"} />
            <MKMetaPill label="战略会议" value={hasDecision ? "已形成建议" : "待推进"} />
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={streaming || !input.trim()}
              onClick={() => runPositioning(input)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[rgba(24,24,23,0.08)] bg-white px-4 py-2.5 text-[13px] font-medium text-[#202124] transition active:scale-[0.98] disabled:opacity-50"
            >
              {streaming ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  正在推进咨询…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  开始本轮咨询
                </>
              )}
            </button>
          </div>
        </section>

        <StrategyMapCard
          brand={brandName || "品牌定位"}
          category={categoryName || "品类待定"}
          audience={
            positioningIntake.audience || displaySnapshot?.brandPositioning?.targetCustomers || "客群待识别"
          }
          differentiation={
            displaySnapshot?.brandPositioning?.differentiation ||
            positioningIntake.differentiation ||
            "差异待明确"
          }
          goal={displaySnapshot?.strategy ?? executionSummary}
        />
        </CollapsibleBoardSection>

        <CollapsibleBoardSection
          eyebrow="补充事实"
          title="创始人访谈"
          summary="回答顾问问题、补充品牌背景"
          defaultOpen={openWorkbench}
        >
          <section className="rounded-[22px] border border-[rgba(24,24,23,0.06)] bg-white p-4 shadow-[0_1px_0_rgba(24,24,23,0.04)] md:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[12px] tracking-[0.08em] text-[#66735E]">创始人访谈</p>
                <h2 className="mt-1 text-[20px] leading-8 text-[#202124]">先像顾问一样理解这个品牌</h2>
                <p className="mt-2 text-[13px] leading-6 text-[#5f6368]">
                  每次只问一个关键问题，每次都产生新的理解，而不是把你扔进表单。
                </p>
              </div>
              <Sparkles className="mt-1 h-5 w-5 text-[#66735E]" />
            </div>
            <div className="mt-4 rounded-[20px] bg-[linear-gradient(180deg,#fbfaf7_0%,#f1f2ec_100%)] p-4">
              <p className="text-[12px] tracking-[0.01em] text-[#66735E]">AI 首席顾问</p>
              <p className="mt-2 text-[18px] leading-8 text-[#202124]">{interviewQuestion}</p>
              <p className="mt-3 text-[13px] leading-6 text-[#5f6368]">{consultantFeedback}</p>
            </div>
            <div className="mt-4">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={4}
                disabled={streaming}
                className="w-full resize-none rounded-[18px] border border-[rgba(24,24,23,0.08)] bg-[#FBF9F5] px-4 py-3 text-[15px] leading-7 text-[#202124] outline-none focus:border-[#66735E]"
                placeholder="先回答顾问问题，或者直接补充你的品牌背景、客户、竞争和差异想法。"
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {speechInput.speechSupported && (
                  <button
                    type="button"
                    disabled={streaming}
                    onClick={() => void speechInput.toggleFieldRecording("positioning_input", input, setInput)}
                    className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-[0.98] ${
                      speechInput.activeFieldId === "positioning_input"
                        ? "bg-[#181817] text-white"
                        : "border border-[rgba(24,24,23,0.08)] bg-[#F5F3EE] text-[#202124]"
                    }`}
                    aria-label={speechInput.activeFieldId === "positioning_input" ? "停止语音输入" : "开始语音输入"}
                  >
                    {speechInput.activeFieldId === "positioning_input" ? (
                      <Square className="h-4 w-4" />
                    ) : (
                      <Mic className="h-4 w-4" />
                    )}
                  </button>
                )}
                <button
                  type="button"
                  disabled={streaming}
                  onClick={applyPositioningIntake}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-[rgba(24,24,23,0.08)] bg-[#F5F3EE] px-4 py-2.5 text-[13px] font-medium text-[#202124] transition active:scale-[0.98]"
                >
                  写入品牌档案
                </button>
              </div>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    disabled={streaming}
                    onClick={() => setInput(p)}
                    className="shrink-0 rounded-full border border-[rgba(24,24,23,0.08)] bg-[#FBF9F5] px-3 py-1.5 text-left text-[12px] text-[#202124] transition hover:border-[#66735E] disabled:opacity-50"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-2">
            <ChiefAdvisorPanel
              title={`战略主持人 · ${currentConsultingStage.label}`}
              summary={consultantFeedback}
              learned={advisorKnown.length > 0 ? advisorKnown.slice(0, 4) : ["正在建立品牌理解"]}
              missing={advisorMissing.length > 0 ? advisorMissing.slice(0, 4) : ["当前阶段信息已基本齐备"]}
              nextStep={activeWorkLabel}
              palette={{
                border: "border-[rgba(24,24,23,0.06)]",
                title: "text-white",
                eyebrow: "text-[#B7BEA8]",
                chipBg: "bg-[rgba(255,255,255,0.08)]",
                chipText: "text-[#F6F3ED]",
                body: "text-[#D7D4CB]",
                softBg: "bg-[rgba(255,255,255,0.06)]",
                nextBorder: "border-transparent",
                nextBg: "bg-[rgba(102,115,94,0.22)]",
                note: "text-[#DDE4CF]",
              }}
            />
            <section className="min-w-0 rounded-[22px] border border-[rgba(24,24,23,0.06)] bg-white p-4 shadow-[0_1px_0_rgba(24,24,23,0.04)]">
              <p className="text-[12px] tracking-[0.08em] text-[#66735E]">品牌档案</p>
              <h2 className="mt-1 text-[18px] leading-7 text-[#202124]">品牌档案</h2>
              <div className="mt-4 space-y-3">
                <ArchiveField label="品牌名称" value={brandName || positioningIntake.brand || "未填写"} />
                <ArchiveField label="品类 / 菜系" value={categoryName || positioningIntake.category || "未填写"} />
                <ArchiveField label="市场城市" value={project.city || "未填写"} />
                <ArchiveField
                  label="目标客群"
                  value={positioningIntake.audience || displaySnapshot?.brandPositioning?.targetCustomers || "待补充"}
                />
                <ArchiveField
                  label="差异想法"
                  value={
                    positioningIntake.differentiation ||
                    displaySnapshot?.brandPositioning?.differentiation ||
                    "待补充"
                  }
                />
              </div>
              <div className="mt-4 rounded-[18px] bg-[linear-gradient(180deg,#fbfaf7_0%,#eef1ea_100%)] p-4">
                <div className="flex items-center justify-between text-[12px] text-[#6f747b]">
                  <span>品牌画像完成度</span>
                  <span>{archiveCompletion}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-white/80">
                  <div className="h-2 rounded-full bg-[#66735E] transition-all" style={{ width: `${archiveCompletion}%` }} />
                </div>
                <p className="mt-3 text-[13px] leading-6 text-[#5f6368]">
                  已形成：品牌理解、问题线索、阶段判断。接下来会继续沉淀市场和专家资产。
                </p>
              </div>
            </section>
          </div>
        </CollapsibleBoardSection>

        <CollapsibleBoardSection
          eyebrow="创始人智能层"
          title="品牌认知协议"
          summary="把创始人、品牌、决策与记忆翻译成可复用的战略协议。"
          defaultOpen={false}
        >
          <div className="mb-4 flex justify-end">
            <div className="rounded-full bg-[#FBF9F5] px-3 py-1.5 text-[12px] text-[#6f747b]">
              当前任务：{currentConsultingStage.label}
            </div>
          </div>

          <div className="space-y-4">
            <section className="rounded-[18px] border border-[rgba(24,24,23,0.05)] bg-white/92 p-4">
              <p className="text-[12px] tracking-[0.08em] text-[#66735E]">身份层</p>
              <h3 className="mt-1 text-[16px] leading-7 text-[#202124]">创始人语境</h3>
              <div className="mt-3 space-y-3">
                {[
                  { label: "身份", value: founderContextView.identity },
                  { label: "赛道背景", value: founderContextView.background },
                  { label: "定位目标", value: founderContextView.goal },
                  { label: "风险偏好", value: `${founderContextView.riskLabel} · ${founderContextView.riskNote}` },
                  { label: "决策方式", value: founderContextView.decisionStyle },
                ].map((item) => (
                  <div key={item.label} className="rounded-[14px] bg-[#FBF9F5] px-3.5 py-3">
                    <p className="text-[11px] tracking-[0.01em] text-[#6f747b]">{item.label}</p>
                    <p className="mt-1 text-[13px] leading-6 text-[#202124]">{item.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[18px] border border-[rgba(24,24,23,0.05)] bg-white/92 p-4">
              <p className="text-[12px] tracking-[0.08em] text-[#66735E]">品牌层</p>
              <h3 className="mt-1 text-[16px] leading-7 text-[#202124]">品牌语境</h3>
              <div className="mt-3 space-y-3">
                {brandContextView.map((item) => (
                  <div key={item.label} className="rounded-[14px] bg-[#FBF9F5] px-3.5 py-3">
                    <p className="text-[11px] tracking-[0.01em] text-[#6f747b]">{item.label}</p>
                    <p className="mt-1 text-[13px] leading-6 text-[#202124]">{item.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[18px] border border-[rgba(24,24,23,0.05)] bg-white/92 p-4">
              <p className="text-[12px] tracking-[0.08em] text-[#66735E]">决策层</p>
              <h3 className="mt-1 text-[16px] leading-7 text-[#202124]">决策协议</h3>
              <div className="mt-3 space-y-3">
                <div className="rounded-[14px] bg-[#FBF9F5] px-3.5 py-3">
                  <p className="text-[11px] tracking-[0.01em] text-[#6f747b]">问题</p>
                  <p className="mt-1 text-[13px] leading-6 text-[#202124]">{brandDecisionProtocolView.problem}</p>
                </div>
                <div className="rounded-[14px] bg-[#FBF9F5] px-3.5 py-3">
                  <p className="text-[11px] tracking-[0.01em] text-[#6f747b]">选择</p>
                  <p className="mt-1 text-[13px] leading-6 text-[#202124]">{brandDecisionProtocolView.choice}</p>
                </div>
                <div className="rounded-[14px] bg-[#FBF9F5] px-3.5 py-3">
                  <p className="text-[11px] tracking-[0.01em] text-[#6f747b]">理由</p>
                  <div className="mt-1 space-y-1.5">
                    {brandDecisionProtocolView.reasoning.length > 0 ? (
                      brandDecisionProtocolView.reasoning.map((item) => (
                        <p key={item} className="text-[13px] leading-6 text-[#202124]">{item}</p>
                      ))
                    ) : (
                      <p className="text-[13px] leading-6 text-[#5f6368]">等待形成结构化定位理由。</p>
                    )}
                  </div>
                </div>
                <div className="rounded-[14px] bg-[#FBF9F5] px-3.5 py-3">
                  <p className="text-[11px] tracking-[0.01em] text-[#6f747b]">验证</p>
                  <p className="mt-1 text-[13px] leading-6 text-[#202124]">{brandDecisionProtocolView.validation}</p>
                </div>
              </div>
            </section>

            <section className="rounded-[18px] border border-[rgba(24,24,23,0.05)] bg-white/92 p-4">
              <p className="text-[12px] tracking-[0.08em] text-[#66735E]">记忆层</p>
              <h3 className="mt-1 text-[16px] leading-7 text-[#202124]">记忆更新</h3>
              <div className="mt-3 space-y-3">
                <div className="rounded-[14px] bg-[#FBF9F5] px-3.5 py-3">
                  <p className="text-[11px] tracking-[0.01em] text-[#6f747b]">创始人记忆</p>
                  <div className="mt-1 space-y-1.5">
                    {brandMemoryView.founderMemory.map((item) => (
                      <p key={item} className="text-[13px] leading-6 text-[#202124]">{item}</p>
                    ))}
                  </div>
                </div>
                <div className="rounded-[14px] bg-[#FBF9F5] px-3.5 py-3">
                  <p className="text-[11px] tracking-[0.01em] text-[#6f747b]">品牌记忆</p>
                  <div className="mt-1 space-y-1.5">
                    {brandMemoryView.brandMemory.length > 0 ? (
                      brandMemoryView.brandMemory.map((item) => (
                        <p key={item} className="text-[13px] leading-6 text-[#202124]">{item}</p>
                      ))
                    ) : (
                      <p className="text-[13px] leading-6 text-[#5f6368]">品牌记忆还在形成中。</p>
                    )}
                  </div>
                </div>
                <div className="rounded-[14px] bg-[#FBF9F5] px-3.5 py-3">
                  <p className="text-[11px] tracking-[0.01em] text-[#6f747b]">决策记忆</p>
                  <div className="mt-1 space-y-1.5">
                    {brandMemoryView.decisionMemory.length > 0 ? (
                      brandMemoryView.decisionMemory.map((item) => (
                        <p key={item} className="text-[13px] leading-6 text-[#202124]">{item}</p>
                      ))
                    ) : (
                      <p className="text-[13px] leading-6 text-[#5f6368]">当前定位判断尚未沉淀为长期记忆。</p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        </CollapsibleBoardSection>

        <div className="space-y-4">
          <CollapsibleBoardSection
            eyebrow="品牌资产"
            title="品牌资产账本"
            summary="沉淀品牌判断、资产条目与可复用陈述。"
            defaultOpen={false}
          >
            <div className="space-y-3">
              {brandAssetLedger.map((item) => (
                <div key={item.id} className="rounded-[16px] bg-[#FBF9F5] px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-medium tracking-[0.08em] text-[#66735E]">
                      {item.kind}
                    </div>
                    <p className="text-[12px] text-[#6f747b]">{item.title}</p>
                  </div>
                  <p className="mt-3 text-[14px] leading-7 text-[#202124]">{item.statement}</p>
                </div>
              ))}
            </div>
          </CollapsibleBoardSection>

          <CollapsibleBoardSection
            eyebrow="顾问协议"
            title="品牌协议流"
            summary="上下文 → 决策 → 验证 → 记忆"
            defaultOpen={false}
            tone="dark"
          >
            <div className="space-y-3">
              {[
                {
                  title: "01 · 顾问上下文",
                  body: `${founderContextView.identity} / ${brandContextView[1]?.value || "品类待补充"} / ${brandContextView[3]?.value || "客群待识别"}`,
                },
                {
                  title: "02 · 决策协议",
                  body: brandDecisionProtocolView.choice,
                },
                {
                  title: "03 · 取舍",
                  body: brandDecisionProtocolView.tradeoff,
                },
                {
                  title: "04 · 记忆更新",
                  body: brandMemoryView.decisionMemory[0] || "当前定位尚未写入长期记忆。",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-[16px] border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.06)] px-4 py-4"
                >
                  <p className="text-[13px] font-medium text-white">{item.title}</p>
                  <p className="mt-2 text-[13px] leading-6 text-[#F6F3ED]">{item.body}</p>
                </div>
              ))}
            </div>
          </CollapsibleBoardSection>
        </div>
      </div>

      {marketHandoff?.handoffPayload && (
        <CollapsibleBoardSection
          eyebrow="交接"
          title="市场机会交接"
          summary="已带入市场机会卡，可展开查看细节"
          defaultOpen={false}
        >
        <section className="rounded-[20px] border border-[rgba(102,115,94,0.16)] bg-[rgba(102,115,94,0.08)] p-4 shadow-[0_1px_0_rgba(24,24,23,0.04)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-3xl">
              <p className="text-[12px] leading-5 tracking-[0.01em] text-[#66735E]">市场机会交接</p>
              <p className="mt-1 text-[16px] leading-[1.7] text-[#202124]">
                这次定位已带入市场机会卡，不需要重新问城市、品类和初始切口。
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {marketHandoff.opportunityId && <MKMetaPill label="机会编号" value={marketHandoff.opportunityId} />}
                {marketHandoff.handoffPayload.opportunity && (
                  <MKMetaPill label="机会" value={marketHandoff.handoffPayload.opportunity} />
                )}
                {marketHandoff.handoffPayload.suggestedPositioning && (
                  <MKMetaPill label="建议方向" value={marketHandoff.handoffPayload.suggestedPositioning} />
                )}
                {marketHandoff.handoffPayload.suggestedPriceBand && (
                  <MKMetaPill label="建议价格" value={marketHandoff.handoffPayload.suggestedPriceBand} />
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={streaming || !handoffPrompt}
                onClick={() => {
                  if (!handoffPrompt) return;
                  setInput(handoffPrompt);
                  void runPositioning(handoffPrompt);
                }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#181817] px-4 py-2 text-[13px] font-medium text-white transition active:scale-[0.98] disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                按机会卡启动定位
              </button>
              <button
                type="button"
                onClick={() => {
                  window.localStorage.removeItem(`market_handoff_${projectId}`);
                  setLocalMarketHandoff(null);
                  setDismissedSharedHandoff(true);
                }}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[rgba(24,24,23,0.08)] bg-white px-4 py-2 text-[13px] font-medium text-[#202124] transition active:scale-[0.98]"
              >
                清除交接
              </button>
            </div>
          </div>
        </section>
        </CollapsibleBoardSection>
      )}

      <CollapsibleBoardSection
        eyebrow="分析过程"
        title="分析过程"
        summary="诊断、市场情报、专家会与战略会议"
        defaultOpen={openAnalysis}
      >
      <div className="space-y-5">
      <section className="rounded-[20px] border border-[rgba(24,24,23,0.06)] bg-white p-4 shadow-[0_1px_0_rgba(24,24,23,0.04)] md:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-[12px] tracking-[0.08em] text-[#66735E]">品牌诊断</p>
            <h2 className="mt-1 text-[18px] leading-7 text-[#202124]">先形成第一次品牌诊断</h2>
            <p className="mt-1 text-[13px] leading-6 text-[#5f6368]">
              这一段不是给结论，而是先判断品牌现在处于什么状态，最大的阻力卡在哪里。
            </p>
          </div>
          <span className="rounded-full bg-[rgba(102,115,94,0.1)] px-3 py-1 text-[12px] text-[#66735E]">
            {streaming ? "正在扫描品牌战略" : hasDiagnosis ? "诊断已生成" : "待启动诊断"}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
          <TopicMetricCard
            label="品牌健康度"
            value={displaySnapshot?.overallScore != null ? `${Math.round(displaySnapshot.overallScore)}` : "待生成"}
            note={displaySnapshot?.oneLiner ?? "先完成一轮访谈和诊断。"}
          />
          <TopicMetricCard
            label="差异方向"
            value={displaySnapshot?.mindPositionLevel ?? "待评估"}
            note={displaySnapshot?.brandPositioning?.differentiation ?? "待判断差异化。"}
          />
          <TopicMetricCard
            label="核心客群"
            value={displaySnapshot?.brandPositioning?.targetCustomers ? "已识别" : "待识别"}
            note={displaySnapshot?.brandPositioning?.targetCustomers ?? "待识别核心客群。"}
          />
          <TopicMetricCard
            label="主要阻力"
            value={displaySnapshot?.maxRiskSeverity ?? "待识别"}
            note={displaySnapshot?.risks?.[0]?.risk ?? "待识别关键阻力。"}
          />
        </div>
      </section>

      <section className="rounded-[20px] border border-[rgba(24,24,23,0.06)] bg-white p-4 shadow-[0_1px_0_rgba(24,24,23,0.04)] md:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Search className="h-4 w-4 text-[#66735E]" />
          <h2 className="text-[15px] font-medium text-[#202124]">市场情报室</h2>
        </div>
        {marketResearch ? (
          <div className="space-y-4">
            <div className="rounded-[18px] border border-[rgba(24,24,23,0.05)] bg-[linear-gradient(180deg,#fbfaf7_0%,#f4f5ef_100%)] px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="max-w-3xl">
                  <p className="text-[12px] tracking-[0.01em] text-[#66735E]">调研摘要</p>
                  <p className="mt-1 text-[16px] leading-7 text-[#202124]">
                    {marketResearch.summary ?? "待补调研摘要"}
                  </p>
                </div>
                {(marketResearch.sourceCount || marketResearch.updatedAt) && (
                  <div className="rounded-[14px] bg-white/85 px-3 py-2 text-[12px] text-[#6f747b]">
                    {marketResearch.sourceCount ? `来源 ${marketResearch.sourceCount} 条` : null}
                    {marketResearch.sourceCount && marketResearch.updatedAt ? " · " : null}
                    {marketResearch.updatedAt
                      ? `更新于 ${new Date(marketResearch.updatedAt).toLocaleString("zh-CN")}`
                      : null}
                  </div>
                )}
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                <TopicMetricCard
                  label="市场信号"
                  value={`${marketResearch.marketSignals.length || 0} 条`}
                  note={marketResearch.marketSignals[0] ?? "待补"}
                />
                <TopicMetricCard
                  label="竞品样本"
                  value={`${marketResearch.competitorFindings.length || 0} 个`}
                  note={marketResearch.competitorFindings[0]?.name ?? "待补"}
                />
                <TopicMetricCard
                  label="用户声音"
                  value={`${marketResearch.userVoices.length || 0} 条`}
                  note={marketResearch.userVoices[0]?.quote ?? "待补"}
                />
              </div>
            </div>
            <OpportunityGapMap
              currentMarket={currentMarketLabel}
              emergingMarket={emergingMarketLabel}
              whitespace={opportunityWhitespace}
              conclusion={marketCoreJudgement}
              pressure={marketResearch.risks[0] ?? "传统竞争仍然强势"}
              trend={marketResearch.marketSignals[0] ?? "年轻消费场景持续抬升"}
            />
            <div className="space-y-3">
              <TopicListCard title="市场信号" items={marketResearch.marketSignals} empty="待补" />
              <TopicListCard
                title="竞品观察"
                items={marketResearch.competitorFindings
                  .slice(0, 3)
                  .map((item) => (item.positioning ? `${item.name} · ${item.positioning}` : item.name))}
                empty="待补"
              />
              <TopicListCard
                title="用户声音"
                items={marketResearch.userVoices
                  .slice(0, 3)
                  .map((item) => (item.source ? `${item.source} · ${item.quote}` : item.quote))}
                empty="待补"
              />
              <TopicListCard title="可利用空位" items={marketResearch.opportunities} empty="待补" />
            </div>
            {(marketResearch.risks.length > 0 || marketResearch.competitorFindings.length > 0) && (
              <div className="space-y-3">
                <TopicListCard title="主要风险" items={marketResearch.risks} empty="暂无明显市场风险" />
                <TopicListCard
                  title="竞品缺口"
                  items={marketResearch.competitorFindings.slice(0, 3).map((item) => {
                    const weakness = item.weaknesses?.[0];
                    return weakness ? `${item.name} · ${weakness}` : `${item.name} · 待补`;
                  })}
                  empty="待补"
                />
              </div>
            )}
          </div>
        ) : (
          <section className="rounded-[16px] border border-dashed border-[rgba(24,24,23,0.12)] bg-[#FBF9F5] p-4">
            <p className="text-[14px] text-[#202124]">等待调研结果。</p>
            <p className="mt-1 text-[13px] leading-6 text-[#5f6368]">会显示市场信号、竞品观察、用户声音和机会位。</p>
          </section>
        )}
      </section>

      <section className="rounded-[20px] border border-[rgba(24,24,23,0.06)] bg-white p-4 shadow-[0_1px_0_rgba(24,24,23,0.04)] md:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Swords className="h-4 w-4 text-[#66735E]" />
          <h2 className="text-[15px] font-medium text-[#202124]">定位专家会</h2>
        </div>
        <div className="mb-4 rounded-[18px] border border-[rgba(180,124,92,0.16)] bg-[rgba(180,124,92,0.08)] px-4 py-3">
          <p className="text-[12px] tracking-[0.01em] text-[#8A4F31]">当前争议</p>
          <p className="mt-1 text-[14px] leading-6 text-[#202124]">{currentDisputeLabel}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {theoryCards.length > 0 ? (
            theoryCards.map((card) => (
              <TheoryPerspectiveCard
                key={card.key}
                title={card.label}
                recommend={card.recommend}
                preferred={card.preferred}
                reason={card.reason}
                attack={card.attack}
              />
            ))
          ) : (
            <div className="rounded-[16px] border border-dashed border-[rgba(24,24,23,0.12)] bg-[#FBF9F5] p-4 md:col-span-3">
              <p className="text-[14px] text-[#202124]">等待矩阵结果。</p>
              <p className="mt-1 text-[13px] leading-6 text-[#5f6368]">这里会展示三方视角和分歧。</p>
            </div>
          )}
        </div>
        {crossFire && (
          <CrossfireOutcomeCard
            summary={crossFire.summary}
            conflicts={crossFire.conflicts}
            consensus={crossFire.consensus}
            rejected={crossFire.rejected}
            decision={crossFire.decision ?? synthesisSummary}
          />
        )}
        {synthesisSummary && (
          <div className="mt-3 rounded-[18px] border border-[rgba(24,24,23,0.05)] bg-[#FBF9F5] px-4 py-4">
            <p className="text-[12px] tracking-[0.01em] text-[#66735E]">综合判断</p>
            <p className="mt-1 text-[14px] leading-7 text-[#202124]">{synthesisSummary}</p>
          </div>
        )}
      </section>

      <section className="rounded-[20px] border border-[rgba(24,24,23,0.06)] bg-white p-4 shadow-[0_1px_0_rgba(24,24,23,0.04)] md:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[#66735E]" />
          <h2 className="text-[15px] font-medium text-[#202124]">AI 战略会议</h2>
        </div>
        <p className="text-[13px] leading-6 text-[#5f6368]">
          这一段不是展示三个结果，而是让你看到不同战略模型如何被主持、被挑战、再被压成一个共识。
        </p>
        {strategyMeetingTurns.length > 0 ? (
          <StrategyMeetingPanel
            turns={strategyMeetingTurns}
            conflict={currentDisputeLabel}
            consensus={strategyMeetingConsensus}
            reasons={strategyMeetingReasons}
          />
        ) : (
          <section className="mt-4 rounded-[16px] border border-dashed border-[rgba(24,24,23,0.12)] bg-[#FBF9F5] p-4">
            <p className="text-[14px] text-[#202124]">等待战略会议启动。</p>
            <p className="mt-1 text-[13px] leading-6 text-[#5f6368]">
              当专家观点形成后，AI 主持人会在这里组织会议并生成共识。
            </p>
          </section>
        )}
      </section>
      </div>
      </CollapsibleBoardSection>

      <CollapsibleBoardSection
        eyebrow="结果"
        title="定位结果与档案"
        summary="候选方向、契约冻结与历史沉淀；正式判断请用上方开会。"
        defaultOpen={openResults}
      >
      <section className="rounded-[20px] border border-[rgba(24,24,23,0.06)] bg-white p-4 shadow-[0_1px_0_rgba(24,24,23,0.04)] md:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Compass className="h-4 w-4 text-[#66735E]" />
          <h2 className="text-[15px] font-medium text-[#202124]">定位选择</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {candidates.length > 0 ? (
            candidates.map((candidate, index) => (
              <CandidateDirectionCard
                key={candidate.id}
                title={candidate.title}
                tag={candidate.tag ?? "候选方向"}
                fit={candidate.fit}
                why={candidate.why}
                risk={candidate.risk}
                emphasis={index === 0 ? "primary" : index === 1 ? "secondary" : "normal"}
                onSelect={() =>
                  setInput(
                    [
                      `我更倾向选择「${candidate.title}」这条定位方向。`,
                      candidate.fit ? `适配场景：${candidate.fit}` : null,
                      candidate.why ? `我认可它的原因是：${candidate.why}` : "请继续追问我为什么选择这个方向。",
                      "请结合市场、资源和风险，继续判断这是不是当前最优策略。",
                    ]
                      .filter(Boolean)
                      .join("\n"),
                  )
                }
              />
            ))
          ) : (
            <div className="rounded-[16px] border border-dashed border-[rgba(24,24,23,0.12)] bg-[#FBF9F5] p-4 md:col-span-3">
              <p className="text-[14px] text-[#202124]">等待候选方向。</p>
              <p className="mt-1 text-[13px] leading-6 text-[#5f6368]">这里会展示多个方向。</p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-[linear-gradient(180deg,#fbfaf7_0%,#eef1ea_100%)] p-4 shadow-[0_14px_30px_rgba(24,24,23,0.04)] md:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-3xl">
            <p className="text-[12px] tracking-[0.08em] text-[#66735E]">创始人确认</p>
            <h2 className="mt-1 text-[18px] leading-7 text-[#202124]">从候选方向进入品牌定位契约</h2>
            <p className="mt-2 text-[13px] leading-6 text-[#5f6368]">
              到这里不是继续堆信息，而是把专家观点、市场判断和你的偏好压成一个可冻结的战略版本。
            </p>
          </div>
          <div className="rounded-full bg-white/92 px-3 py-1.5 text-[12px] text-[#6f747b]">下一步：战略冻结</div>
        </div>
        <div className="mt-4 space-y-3">
          <div className="rounded-[18px] bg-white/92 p-4">
            <p className="text-[12px] tracking-[0.01em] text-[#6f747b]">当前优先方向</p>
            <p className="mt-1 text-[18px] leading-7 text-[#202124]">{leadCandidate?.title ?? strategySummary}</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <ArchiveField label="为什么往前走" value={leadCandidate?.why ?? strategyMeetingConsensus} />
              <ArchiveField
                label="进入契约时要写清"
                value={leadCandidate?.risk ?? "目标用户、核心价值、竞争差异、禁止事项"}
              />
            </div>
          </div>
          <div className="rounded-[18px] border border-[rgba(24,24,23,0.05)] bg-[#181817] p-4 text-white">
            <p className="text-[12px] tracking-[0.01em] text-[#B7BEA8]">AI 首席顾问建议</p>
            <p className="mt-2 text-[14px] leading-7 text-[#F6F3ED]">
              如果你认同当前方向，就应该把它收成一份清晰的定位契约；如果不认同，就回到会议区继续挑战专家共识。
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={streaming}
                onClick={() => setInput(freezePrompt)}
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-4 py-2 text-[13px] font-medium text-[#202124] transition active:scale-[0.98]"
              >
                写入战略确认
              </button>
              <button
                type="button"
                disabled={streaming}
                onClick={() => {
                  setInput(freezePrompt);
                  void runPositioning(freezePrompt);
                }}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[rgba(255,255,255,0.16)] px-4 py-2 text-[13px] font-medium text-white transition active:scale-[0.98]"
              >
                继续压成定位契约
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="rounded-[20px] border border-[rgba(24,24,23,0.06)] bg-white p-4 shadow-[0_1px_0_rgba(24,24,23,0.04)] md:p-5">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-[#66735E]" />
            <h2 className="text-[15px] font-medium text-[#202124]">品牌战略资产</h2>
          </div>
          <p className="mt-2 text-[13px] leading-6 text-[#5f6368]">不是停在结论，而是形成可确认、可执行的品牌战略。</p>
        </div>
        <ContractFreezeFrame
          statement={strategySummary}
          targetCustomer={displaySnapshot?.brandPositioning?.targetCustomers ?? "待确认"}
          difference={displaySnapshot?.brandPositioning?.differentiation ?? "待确认"}
          brandCore={displaySnapshot?.strategy ?? displaySnapshot?.diagnosis ?? "待形成"}
          forbidden={displaySnapshot?.risks?.[0]?.risk ?? "不要回到普通竞争"}
          version={contractVersionLabel}
        />
        <div className="grid gap-3 md:grid-cols-3">
          <OutcomeCard title="定位策略" summary={strategySummary} details={strategyDetails} tone="strategy" />
          <OutcomeCard title="执行路径" summary={executionSummary} details={executionDetails} tone="execution" />
          <OutcomeCard title="验证条件" summary={validationSummary} details={validationDetails} tone="validation" />
        </div>
        {displaySnapshot ? (
          <>
            <PositioningResultCard snapshot={displaySnapshot} projectId={projectId} showActions={false} />
            {displayDiff && (displayDiff.hasChanges || displayPrevious) ? (
              <PositioningDiffCard previous={displayPrevious} current={displaySnapshot} diff={displayDiff} />
            ) : null}
            <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-[linear-gradient(180deg,#fbfaf7_0%,#eef1ea_100%)] p-4 shadow-[0_14px_30px_rgba(24,24,23,0.04)]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="max-w-3xl">
                  <p className="text-[12px] leading-5 tracking-[0.01em] text-[#66735E]">当前链路</p>
                  <p className="mt-1 text-[16px] font-medium leading-[1.6] text-[#202124]">
                    带着这条定位进入会议，继续压成经营判断和动作。
                  </p>
                  <p className="mt-2 text-[13px] leading-6 text-[#5f6368]">这条定位会同步进入世界、会议和决策档案。</p>
                </div>
                <Target className="mt-1 h-5 w-5 text-[#66735E]" />
              </div>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                {[
                  { label: "世界", text: "同步进入世界模型。" },
                  { label: "会议", text: "会议默认沿用。" },
                  { label: "决策档案", text: "变化会触发复审。" },
                ].map((item) => (
                  <div key={item.label} className="rounded-[16px] bg-white/82 px-3.5 py-2.5">
                    <p className="text-[12px] tracking-[0.01em] text-[#6f747b]">{item.label}</p>
                    <p className="mt-1 text-[13px] leading-[1.7] text-[#202124]">{item.text}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 md:flex md:flex-wrap">
                <Link
                  href={`/projects/${projectId}`}
                  prefetch={false}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] bg-[#181817] px-4 py-2.5 text-[14px] font-semibold text-white no-underline transition active:scale-[0.98]"
                >
                  进入世界
                </Link>
                <Link
                  href={`/projects/${projectId}/decisions`}
                  prefetch={false}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-white px-4 py-2.5 text-[14px] font-semibold text-[#202124] no-underline transition active:scale-[0.98] sm:col-span-2 md:col-span-1"
                >
                  决策档案
                </Link>
              </div>
            </section>
            {displaySnapshot.decisionId && (
              <FeedbackWidget
                question="这条定位有帮助吗？"
                allowComment
                pending={feedbackMutation.isPending}
                done={feedbackDone}
                onSubmit={async (helpful, comment) => {
                  await feedbackMutation.mutateAsync({
                    decisionId: displaySnapshot.decisionId!,
                    projectId,
                    helpful,
                    comment: comment || undefined,
                  });
                }}
              />
            )}
          </>
        ) : (
          <section className="rounded-[22px] border border-dashed border-[rgba(24,24,23,0.12)] bg-[#FBF9F5] p-5">
            <p className="text-[13px] text-[#66735E]">尚未形成定位结论</p>
            <p className="mt-2 text-[18px] font-medium text-[#202124]">完成一轮定位后，这里会出现结果卡</p>
            <p className="mt-2 text-[13px] leading-6 text-[#5f6368]">结果会自动写回项目并生成对比。</p>
          </section>
        )}
      </section>
      </CollapsibleBoardSection>

      <CollapsibleBoardSection
        eyebrow="过程"
        title="本轮咨询过程"
        summary={streaming ? "正在展开顾问过程…" : streamText ? "可展开查看本轮过程" : "发起咨询后在此查看过程"}
        defaultOpen={streaming || openAnalysis}
      >
      <section className="rounded-[20px] border border-[rgba(24,24,23,0.06)] bg-white p-4 shadow-[0_1px_0_rgba(24,24,23,0.04)] md:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[15px] font-medium text-[#202124]">顾问工作过程</h2>
            <p className="mt-1 text-[12px] leading-5 text-[#5f6368]">
              这里显示顾问团队的工作过程。继续补充信息，请回到上方访谈区。
            </p>
          </div>
          {runtimeMeta && (
            <MKMetaPill
              label="本轮已接入"
              value={
                runtimeMeta.assetCount && runtimeMeta.assetCount > 0
                  ? `已纳入 ${runtimeMeta.assetCount} 份资料`
                  : "将结合项目背景与历史判断"
              }
            />
          )}
        </div>
        <div className="space-y-3">
          {stepStatuses.map((step, index) => (
            <div
              key={step.id}
              className={`rounded-[16px] border px-3.5 py-2.5 ${
                step.status === "done"
                  ? "border-[rgba(102,115,94,0.18)] bg-[rgba(102,115,94,0.08)]"
                  : step.status === "current"
                    ? "border-[rgba(180,124,92,0.18)] bg-[rgba(180,124,92,0.08)]"
                    : "border-[rgba(24,24,23,0.06)] bg-[#FBF9F5]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] tracking-[0.01em] text-[#6f747b]">步骤 {index + 1}</p>
                <span className="text-[11px] text-[#66735E]">
                  {step.status === "done" ? "已完成" : step.status === "current" ? "进行中" : "待开始"}
                </span>
              </div>
              <p className="mt-1 text-[13px] font-medium leading-[1.6] text-[#202124]">{step.name}</p>
            </div>
          ))}
        </div>
        {error && <p className="mt-3 text-[13px] text-[#B47C5C]">错误：{error}</p>}
        {(streamText || streaming) && (
          <div className="mt-5 max-h-[420px] overflow-y-auto rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-[#FBF9F5] p-4 md:max-h-[520px]">
            <p className="mb-3 text-[12px] tracking-[0.01em] text-[#66735E]">过程会持续展开，并同步回主链路。</p>
            <pre className="whitespace-pre-wrap font-sans text-[13px] leading-6 text-[#202124]">
              {streamText || "正在启动…"}
            </pre>
            <div ref={endRef} />
          </div>
        )}
        {!streamText && !streaming && (
          <div className="mt-4 rounded-[16px] border border-dashed border-[rgba(24,24,23,0.12)] bg-[#FBF9F5] p-4">
            <p className="text-[14px] text-[#202124]">等待本轮咨询过程。</p>
            <p className="mt-1 text-[13px] leading-6 text-[#5f6368]">
              当你从上方访谈区发起本轮咨询后，这里会持续展开顾问团队的内部工作记录。
            </p>
          </div>
        )}
      </section>
      </CollapsibleBoardSection>

      <CollapsibleBoardSection
        eyebrow="档案"
        title="决策历史与资产"
        summary="历史判断与报告沉淀"
        defaultOpen={false}
      >
      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-[20px] border border-[rgba(24,24,23,0.06)] bg-white p-4 md:p-5">
          <h3 className="mb-3 text-[14px] font-medium text-[#202124]">决策历史</h3>
          {history.length === 0 ? (
            <PageEmptyState eyebrow="历史" title="还没有历史决策" description="完成一次后会自动沉淀。" />
          ) : (
            <ul className="space-y-3">
              {history.map((d: any) => (
                <li key={d.id} className="rounded-[14px] border border-[rgba(24,24,23,0.05)] bg-[#FBF9F5] p-3">
                  <div className="mb-1 text-[12px] text-[#5f6368]">
                    {new Date(d.createdAt).toLocaleString("zh-CN")} · 信心 {Math.round((d.confidence ?? 0) * 100)}%
                  </div>
                  <div className="text-[13px] font-medium text-[#202124]">{d.judgement}</div>
                  <div className="mt-1 line-clamp-2 text-[12px] text-[#5f6368]">{d.strategy}</div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-[20px] border border-[rgba(24,24,23,0.06)] bg-white p-4 md:p-5">
          <h3 className="mb-3 text-[14px] font-medium text-[#202124]">资产快照</h3>
          {reports.length === 0 ? (
            <PageEmptyState eyebrow="报告" title="暂无报告快照" description="完成后会在这里沉淀。" />
          ) : (
            <ul className="space-y-3">
              {reports.map((r: any) => (
                <li key={r.id} className="rounded-[14px] border border-[rgba(24,24,23,0.05)] bg-[#FBF9F5] p-3">
                  <div className="text-[13px] font-medium text-[#202124]">{r.title}</div>
                  <div className="mt-1 line-clamp-3 text-[12px] text-[#5f6368]">{r.summary}</div>
                  <Link
                    href={`/projects/${projectId}/report`}
                    className="mt-2 inline-flex text-[12px] text-[#66735E] no-underline"
                  >
                    进入报告区 →
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      </CollapsibleBoardSection>

      <section className="rounded-[20px] border border-[rgba(24,24,23,0.06)] bg-[#FBF9F5] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[12px] tracking-[0.01em] text-[#6f747b]">品牌旅程</p>
            <p className="mt-1 text-[14px] leading-6 text-[#202124]">
              完成本轮后，用页头「进入品牌战略会议」做正式判断；每一步都会留在档案里。
            </p>
          </div>
          <Link
            href={`/projects/${projectId}/decisions`}
            prefetch={false}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[rgba(24,24,23,0.08)] bg-white px-4 py-2 text-[13px] font-medium text-[#202124] no-underline transition active:scale-[0.98]"
          >
            <TrendingUp className="h-4 w-4" />
            查看决策档案
          </Link>
        </div>
      </section>
    </div>
  );
}
