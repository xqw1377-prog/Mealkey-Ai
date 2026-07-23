"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Compass,
  History,
  Loader2,
  MessagesSquare,
  Mic,
  Search,
  Square,
  TrendingUp,
} from "lucide-react";
import {
  WorkspaceArchivePanel,
  ChiefAdvisorPanel,
  CollapsibleBoardSection,
  DepartmentBoardShell,
  WorkspaceDecisionPanel,
  FeedbackWidget,
  MKMetaPill,
  ModuleIntakeCard,
  WorkspaceMeetingPanel,
  WorkspaceJourneyRail,
} from "@/components/operating";
import { PageErrorState, PageLoadingState } from "@/components/operating/PageState";
import { trpc } from "@/lib/trpc";
import type { MarketGap, MarketSnapshot } from "@/lib/market";
import {
  getDepartmentBoard,
  getDepartmentExperts,
  getDepartmentMeetingHref,
  stripAgentProductNames,
} from "@/lib/department-board";
import { buildMarketProtocolProjection } from "@/lib/runtime-projections/marketProtocol";
import { useSpeechToTextField } from "@/hooks/useSpeechToTextField";
import { useProjectStore } from "@/stores/projectStore";

function buildMarketIntakePrompt(values: {
  city: string;
  category: string;
  opportunity: string;
  constraint: string;
}) {
  return [
    "请作为市场战略顾问，帮助我完成一次市场进入判断。",
    `城市/区域：${values.city || "待补充"}`,
    `品类/业态：${values.category || "待补充"}`,
    `想判断的机会：${values.opportunity || "待补充"}`,
    `当前约束：${values.constraint || "待补充"}`,
    "请先理解项目，再给出市场机会、进入风险、专家分歧和最终进入建议。",
  ].join("\n");
}

type MarketJourneyStep = {
  id: "interview" | "scanning" | "insight" | "council" | "decision";
  label: string;
  note: string;
  status: "completed" | "current" | "upcoming";
};

type MarketCouncilOpinion = {
  role: string;
  focus: string;
  judgement: string;
  reason: string;
  risk: string;
};

function buildMarketJourney(input: {
  hasSnapshot: boolean;
  hasSignals: boolean;
  hasCouncil: boolean;
  hasDecision: boolean;
  streaming: boolean;
}): MarketJourneyStep[] {
  if (!input.hasSnapshot && !input.streaming) {
    return [
      { id: "interview", label: "市场访谈", note: "先理解你的项目。", status: "current" },
      { id: "scanning", label: "市场扫描", note: "扫描城市、品类、竞争。", status: "upcoming" },
      { id: "insight", label: "机会发现", note: "寻找结构性机会窗口。", status: "upcoming" },
      { id: "council", label: "专家讨论", note: "把分歧压成判断。", status: "upcoming" },
      { id: "decision", label: "进入决策", note: "形成进入建议。", status: "upcoming" },
    ];
  }

  if (input.streaming && !input.hasSnapshot) {
    return [
      { id: "interview", label: "市场访谈", note: "已获得初步项目背景。", status: "completed" },
      { id: "scanning", label: "市场扫描", note: "正在建立市场判断模型。", status: "current" },
      { id: "insight", label: "机会发现", note: "等待结构性信号浮现。", status: "upcoming" },
      { id: "council", label: "专家讨论", note: "等待专家委员会形成观点。", status: "upcoming" },
      { id: "decision", label: "进入决策", note: "最后压成进入建议。", status: "upcoming" },
    ];
  }

  return [
    { id: "interview", label: "市场访谈", note: "项目背景已被吸收。", status: "completed" },
    { id: "scanning", label: "市场扫描", note: "城市、品类、竞争已完成扫描。", status: "completed" },
    {
      id: "insight",
      label: "机会发现",
      note: input.hasSignals ? "关键市场信号已经形成。" : "还在压缩有效信号。",
      status: input.hasSignals ? "completed" : "current",
    },
    {
      id: "council",
      label: "专家讨论",
      note: input.hasCouncil ? "三类市场视角已形成分歧。" : "等待专家判断进入方式。",
      status: input.hasCouncil ? "completed" : input.hasSignals ? "current" : "upcoming",
    },
    {
      id: "decision",
      label: "进入决策",
      note: input.hasDecision ? "已经形成进入建议。" : "等待最终进入判断。",
      status: input.hasDecision ? "current" : input.hasCouncil ? "current" : "upcoming",
    },
  ];
}

function buildMarketSignals(snapshot: MarketSnapshot | null): MarketGap[] {
  if (!snapshot) return [];
  if (snapshot.pageOutput.gaps.length > 0) return snapshot.pageOutput.gaps;

  return [
    {
      title: "消费趋势变化",
      summary: snapshot.pageOutput.marketStructure.trendSummary,
      confidence: snapshot.pageOutput.scores.timing,
    },
    {
      title: "竞争空位判断",
      summary: snapshot.pageOutput.competition.homogenization,
      confidence: snapshot.pageOutput.scores.gap,
    },
  ];
}

function buildCouncilOpinions(snapshot: MarketSnapshot | null): MarketCouncilOpinion[] {
  if (!snapshot) return [];

  const primary = snapshot.pageOutput.entryStrategies[0];
  const secondary = snapshot.pageOutput.entryStrategies[1];

  return [
    {
      role: "市场战略专家",
      focus: "趋势变化",
      judgement: snapshot.pageOutput.health.judgement === "kill" ? "进入窗口较弱" : "存在进入窗口",
      reason: snapshot.pageOutput.marketStructure.trendSummary,
      risk: snapshot.pageOutput.health.biggestRisk,
    },
    {
      role: "餐饮经营专家",
      focus: "落地能力",
      judgement: primary ? `优先考虑：${primary.title}` : "传统打法风险较高",
      reason: primary?.summary || snapshot.pageOutput.competition.biggestPressure,
      risk: primary?.risks[0] || snapshot.pageOutput.competition.biggestPressure,
    },
    {
      role: "投资增长专家",
      focus: "复制能力",
      judgement: secondary ? `备选路径：${secondary.title}` : "需要验证复制性",
      reason:
        secondary?.summary ||
        snapshot.pageOutput.finalDecision.reasoning[0] ||
        "先验证单店模型，再决定是否进入规模化阶段。",
      risk:
        secondary?.risks[0] ||
        snapshot.pageOutput.finalDecision.risks[0] ||
        "如果复制性不足，进入价值会快速下降。",
    },
  ];
}

function buildChiefAdvisorMessage(input: {
  snapshot: MarketSnapshot | null;
  streaming: boolean;
  hasSignals: boolean;
  hasCouncil: boolean;
}) {
  if (!input.snapshot && !input.streaming) {
    return {
      title: "AI 市场顾问已就位",
      summary: "我会先理解你的项目，再帮你判断这个市场值不值得进入。",
      learned: ["创业想法", "目标城市", "品类方向"],
      missing: ["竞争对象", "目标客群", "预算约束"],
      nextStep: "先完成市场访谈，建立最小必要判断上下文。",
    };
  }

  if (input.streaming && !input.snapshot) {
    return {
      title: "市场判断进行中",
      summary: "我正在扫描消费结构、竞争格局和案例匹配，不会直接跳到结论。",
      learned: ["项目背景", "进入意图", "城市与品类"],
      missing: ["结构性机会", "专家共识", "进入建议"],
      nextStep: "等待市场信号浮现，再进入专家委员会。",
    };
  }

  return {
    title: "市场战略顾问",
    summary:
      input.snapshot?.pageOutput.finalDecision.judgement ||
      "当前已经形成一轮市场进入建议。",
    learned: [
      input.snapshot?.pageOutput.marketStructure.populationTag || "消费结构",
      input.snapshot?.pageOutput.marketStructure.sceneSummary || "消费场景",
      input.snapshot?.pageOutput.competition.densitySummary || "竞争密度",
    ],
    missing: input.hasCouncil
      ? ["用户反馈", "进入方式确认"]
      : ["专家分歧", "进入方式确认"],
    nextStep: input.hasSignals
      ? "继续把专家分歧压成最终进入建议，再把机会卡交给品牌定位中心。"
      : "先看市场信号，再判断是否真的存在结构性机会。",
  };
}

function inferFounderMarketGoal(text: string) {
  if (/(连锁|复制|规模|加盟|全国)/.test(text)) {
    return "优先判断这个市场是否适合承接规模化扩张。";
  }
  if (/(稳健|验证|谨慎|试点|小范围)/.test(text)) {
    return "优先找到低风险试点进入方式。";
  }
  if (/(品牌|定位|心智|差异化)/.test(text)) {
    return "优先判断市场是否值得为品牌占位投入。";
  }
  return "先判断这个市场是否真的存在进入窗口。";
}

function inferMarketRiskProfile(text: string) {
  if (/(暂缓|谨慎|验证|风险|先别)/.test(text)) {
    return {
      label: "稳健型",
      note: "先验证市场窗口，再决定是否进入。",
    };
  }

  if (/(进入|抢占|快速|窗口|扩张)/.test(text)) {
    return {
      label: "进取型",
      note: "优先抢占机会，再补后续动作。",
    };
  }

  return {
    label: "平衡型",
    note: "在进入速度和进入质量之间保持平衡。",
  };
}

function buildFounderMarketContextView(input: {
  project: { name: string; category?: string | null; stage?: string | null };
  snapshot: MarketSnapshot | null;
}) {
  const text = [
    input.snapshot?.problem,
    input.snapshot?.oneLiner,
    input.snapshot?.strategy,
    input.snapshot?.action,
    input.snapshot?.pageOutput.finalDecision.judgement,
  ]
    .filter(Boolean)
    .join(" ");
  const risk = inferMarketRiskProfile(text);

  return {
    identity: `${input.project.name} 创始人`,
    background: input.project.category || "市场方向待补全",
    goal: inferFounderMarketGoal(text),
    riskLabel: risk.label,
    riskNote: risk.note,
    decisionStyle: input.snapshot ? "先判断市场窗口，再决定进入方式" : "先访谈，再开始市场扫描",
  };
}

function buildMarketContextView(input: { snapshot: MarketSnapshot | null }) {
  const pageOutput = input.snapshot?.pageOutput;
  return [
    { label: "城市", value: pageOutput?.city || "待补充" },
    { label: "品类", value: pageOutput?.category || "待补充" },
    { label: "消费结构", value: pageOutput?.marketStructure.populationTag || "待建立" },
    { label: "场景判断", value: pageOutput?.marketStructure.sceneSummary || "待形成" },
    { label: "竞争压力", value: pageOutput?.competition.biggestPressure || "待判断" },
    { label: "协议层级", value: pageOutput ? "Market Mission 已启动" : "等待启动" },
  ];
}

function buildMarketDecisionProtocolView(input: { snapshot: MarketSnapshot | null }) {
  const pageOutput = input.snapshot?.pageOutput;
  const decision = pageOutput?.finalDecision;
  const reasoning = (decision?.reasoning || [])
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index)
    .slice(0, 3);

  return {
    problem: input.snapshot?.problem || "当前市场问题仍在澄清中。",
    choice:
      decision?.judgement ||
      input.snapshot?.strategy ||
      "先把市场进入建议压成一个正式选择。",
    reasoning,
    tradeoff:
      decision?.risks[0] ||
      pageOutput?.health.biggestRisk ||
      "需要在抢机会和控制进入风险之间做取舍。",
    validation:
      decision?.actions[0] ||
      input.snapshot?.action ||
      "先补一个进入验证动作，再继续推进品牌定位。",
  };
}

function buildMarketMemoryView(input: {
  snapshot: MarketSnapshot | null;
  history: Array<{ judgement?: string | null; problem: string; createdAt: string | Date }>;
  reports: Array<{ title: string; summary?: string | null }>;
}) {
  const founderFitScore = input.snapshot?.pageOutput.scores.founderFit ?? 0;
  const founderMemory = [
    inferMarketRiskProfile(
      [
        input.snapshot?.oneLiner,
        input.snapshot?.pageOutput.finalDecision.judgement,
        input.snapshot?.pageOutput.health.biggestRisk,
      ]
        .filter(Boolean)
        .join(" "),
    ).note,
    founderFitScore >= 70
      ? "当前创始人与该市场进入方式较匹配。"
      : "当前创始人与市场窗口仍需继续校准。",
  ];

  const marketMemory = [
    input.snapshot?.pageOutput.marketMemory?.patternSummary,
    input.snapshot?.pageOutput.marketMemory?.confidenceNote,
    ...input.reports.slice(0, 2).map((item) => item.title),
  ]
    .filter((item): item is string => Boolean(item))
    .slice(0, 3);

  const decisionMemory = [
    input.snapshot?.pageOutput.finalDecision.judgement,
    ...input.history.slice(0, 2).map((item) => item.judgement || item.problem),
  ]
    .filter((item): item is string => Boolean(item))
    .slice(0, 3);

  return {
    founderMemory,
    marketMemory,
    decisionMemory,
  };
}

function buildMarketSignalLedger(signals: MarketGap[]) {
  return signals.slice(0, 6).map((item) => {
    const confidence = item.confidence ?? 0;
    const kind = confidence >= 80 ? "FACT" : confidence >= 65 ? "ASSUMPTION" : "HYPOTHESIS";

    return {
      id: item.title,
      kind,
      statement: item.summary,
      title: item.title,
      confidence,
    };
  });
}

function scoreTone(score: number) {
  if (score >= 80) return "text-[#C9A227]";
  if (score >= 65) return "text-[#172554]";
  return "text-[#EA580C]";
}

function MarketFeedbackCard({
  decisionId,
  projectId,
}: {
  decisionId?: string;
  projectId: string;
}) {
  const feedback = trpc.agent.marketFeedback.useMutation();

  if (!decisionId) return null;

  return (
    <FeedbackWidget
      question="这个市场判断符合你的观察吗？"
      positiveLabel="符合"
      negativeLabel="需要调整"
      pending={feedback.isPending}
      done={feedback.isSuccess}
      onSubmit={async (helpful) => {
        await feedback.mutateAsync({ decisionId, projectId, helpful });
      }}
    />
  );
}

function StrategyMapCard({
  city,
  category,
  judgement,
}: {
  city: string;
  category: string;
  judgement: string;
}) {
  return (
    <section className="rounded-[24px] border border-[rgba(23,37,84,0.08)] bg-[linear-gradient(180deg,#FFFFFF_0%,#F6F7F4_100%)] p-5 shadow-[0_18px_34px_rgba(23,37,84,0.06)] md:p-6">
      <p className="text-[13px] leading-5 tracking-[0.08em] text-[#5B6475]">机会判断台</p>
      <h2 className="mt-2 text-[28px] leading-[1.15] tracking-[-0.04em] text-[#172554] md:text-[34px]">
        市场机会中心
      </h2>
      <p className="mt-3 max-w-3xl text-[15px] leading-[1.8] text-[#4B5563]">
        不是生成一份市场报告，而是陪你完成一次市场进入判断。
      </p>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[22px] border border-[rgba(23,37,84,0.08)] bg-white p-5">
          <p className="text-[12px] tracking-[0.08em] text-[#6B7280]">市场战略地图</p>
          <div className="mt-5 flex min-h-[210px] items-center justify-center rounded-[20px] bg-[linear-gradient(180deg,#F8F8F4_0%,#EEF2F8_100%)] p-4">
            <div className="relative h-[160px] w-full max-w-[420px]">
              <div className="absolute left-1/2 top-0 -translate-x-1/2 text-[13px] text-[#172554]">消费者变化</div>
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[13px] text-[#172554]">商业成立</div>
              <div className="absolute left-0 top-1/2 -translate-y-1/2 text-[13px] text-[#172554]">竞争压力</div>
              <div className="absolute right-0 top-1/2 -translate-y-1/2 text-[13px] text-[#172554]">机会空位</div>
              <div className="absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[rgba(201,162,39,0.35)] bg-[rgba(201,162,39,0.12)] text-center text-[13px] font-medium leading-5 text-[#8C6B00]">
                {city}
                <br />
                {category}
              </div>
              <div className="absolute left-1/2 top-5 h-[calc(50%-28px)] w-px -translate-x-1/2 bg-[rgba(23,37,84,0.12)]" />
              <div className="absolute bottom-5 left-1/2 h-[calc(50%-28px)] w-px -translate-x-1/2 bg-[rgba(23,37,84,0.12)]" />
              <div className="absolute left-5 top-1/2 h-px w-[calc(50%-28px)] -translate-y-1/2 bg-[rgba(23,37,84,0.12)]" />
              <div className="absolute right-5 top-1/2 h-px w-[calc(50%-28px)] -translate-y-1/2 bg-[rgba(23,37,84,0.12)]" />
            </div>
          </div>
        </div>
        <div className="rounded-[22px] border border-[rgba(23,37,84,0.08)] bg-[#172554] p-5 text-white">
          <p className="text-[12px] tracking-[0.08em] text-white/70">当前判断</p>
          <p className="mt-3 text-[24px] leading-[1.3] tracking-[-0.03em]">{judgement}</p>
          <div className="mt-5 rounded-[18px] bg-white/8 p-4 text-[13px] leading-6 text-white/82">
            AI 正在把消费变化、竞争结构和进入方式压成一条可执行的市场进入建议。
          </div>
        </div>
      </div>
    </section>
  );
}

function OpportunitySignalCard({ gap }: { gap: MarketGap }) {
  return (
    <div className="rounded-[22px] border border-[rgba(23,37,84,0.08)] bg-white p-4 shadow-[0_14px_28px_rgba(23,37,84,0.05)]">
      <p className="text-[12px] tracking-[0.08em] text-[#5B6475]">发现一个市场信号</p>
      <h3 className="mt-2 text-[18px] font-semibold leading-[1.35] text-[#172554]">{gap.title}</h3>
      <p className="mt-3 text-[14px] leading-[1.8] text-[#4B5563]">{gap.summary}</p>
      {typeof gap.confidence === "number" ? (
        <div className="mt-4 inline-flex items-center rounded-full bg-[rgba(201,162,39,0.14)] px-3 py-1 text-[12px] text-[#8C6B00]">
          可信度 {gap.confidence}%
        </div>
      ) : null}
    </div>
  );
}

function CouncilMemberCard({ opinion }: { opinion: MarketCouncilOpinion }) {
  return (
    <div className="rounded-[22px] border border-[rgba(23,37,84,0.08)] bg-white p-4 shadow-[0_14px_28px_rgba(23,37,84,0.05)]">
      <p className="text-[12px] tracking-[0.08em] text-[#5B6475]">{opinion.focus}</p>
      <h3 className="mt-2 text-[18px] font-semibold leading-[1.35] text-[#172554]">{opinion.role}</h3>
      <p className="mt-3 text-[14px] font-medium leading-7 text-[#172554]">判断：{opinion.judgement}</p>
      <p className="mt-2 text-[14px] leading-[1.8] text-[#4B5563]">{opinion.reason}</p>
      <div className="mt-4 rounded-[16px] bg-[rgba(234,88,12,0.08)] px-3 py-3 text-[13px] leading-6 text-[#9A3412]">
        风险：{opinion.risk}
      </div>
    </div>
  );
}

function DebatePanel({
  conflicts,
  consensus,
  reasons,
}: {
  conflicts: string[];
  consensus: string;
  reasons: string[];
}) {
  return (
    <section className="rounded-[24px] border border-[rgba(23,37,84,0.08)] bg-[linear-gradient(180deg,#FFFFFF_0%,#F8F8F4_100%)] p-5 shadow-[0_18px_32px_rgba(23,37,84,0.06)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[12px] tracking-[0.08em] text-[#5B6475]">战略会议</p>
          <h3 className="mt-1 text-[22px] leading-[1.3] tracking-[-0.03em] text-[#172554]">专家观点碰撞</h3>
        </div>
        <MessagesSquare className="h-5 w-5 text-[#172554]" />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3">
          {conflicts.length > 0 ? (
            conflicts.map((item, index) => (
              <div key={`${item}-${index}`} className="rounded-[18px] border border-[rgba(23,37,84,0.08)] bg-white px-4 py-4">
                <p className="text-[12px] tracking-[0.08em] text-[#5B6475]">争议 {index + 1}</p>
                <p className="mt-2 text-[14px] leading-[1.8] text-[#172554]">{item}</p>
              </div>
            ))
          ) : (
            <div className="rounded-[18px] border border-[rgba(23,37,84,0.08)] bg-white px-4 py-4 text-[14px] leading-[1.8] text-[#172554]">
              当前还没有显式争议，AI 正在把判断压成可执行共识。
            </div>
          )}
        </div>
        <div className="rounded-[20px] bg-[#172554] p-5 text-white">
          <p className="text-[12px] tracking-[0.08em] text-white/70">AI 主持总结</p>
          <p className="mt-3 text-[22px] leading-[1.4] tracking-[-0.03em]">{consensus}</p>
          <div className="mt-4 space-y-2">
            {reasons.slice(0, 3).map((item) => (
              <div key={item} className="rounded-[14px] bg-white/10 px-3 py-3 text-[13px] leading-6 text-white/88">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function DecisionFrame({
  snapshot,
  onContinue,
}: {
  snapshot: MarketSnapshot;
  onContinue: () => void;
}) {
  const decision = snapshot.pageOutput.finalDecision;
  const opportunity = snapshot.pageOutput.opportunityCard;

  return (
    <section className="rounded-[24px] border border-[rgba(23,37,84,0.08)] bg-white p-5 shadow-[0_18px_34px_rgba(23,37,84,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[12px] tracking-[0.08em] text-[#5B6475]">市场进入建议</p>
          <h3 className="mt-2 text-[26px] leading-[1.2] tracking-[-0.04em] text-[#172554]">{snapshot.oneLiner}</h3>
        </div>
        <div className="inline-flex items-center rounded-full bg-[rgba(22,163,74,0.12)] px-4 py-2 text-[13px] font-medium text-[#166534]">
          {snapshot.pageOutput.health.judgement === "kill"
            ? "建议暂缓"
            : snapshot.pageOutput.health.judgement === "enter"
              ? "建议进入"
              : "谨慎进入"}
        </div>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className="rounded-[20px] bg-[linear-gradient(180deg,#F8F8F4_0%,#EEF2F8_100%)] p-4">
            <p className="text-[12px] tracking-[0.08em] text-[#5B6475]">一句话判断</p>
            <p className="mt-2 text-[15px] leading-[1.9] text-[#172554]">{decision.judgement}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[20px] border border-[rgba(23,37,84,0.08)] bg-white p-4">
              <p className="text-[12px] tracking-[0.08em] text-[#5B6475]">进入策略</p>
              <p className="mt-2 text-[15px] leading-[1.8] text-[#172554]">
                {snapshot.pageOutput.entryStrategies[0]?.title ||
                  opportunity?.suggestedPositioning ||
                  "先验证结构性空位，再决定定位。"}
              </p>
            </div>
            <div className="rounded-[20px] border border-[rgba(23,37,84,0.08)] bg-white p-4">
              <p className="text-[12px] tracking-[0.08em] text-[#5B6475]">不要做</p>
              <p className="mt-2 text-[15px] leading-[1.8] text-[#9A3412]">
                {decision.risks[0] || opportunity?.risk || "不要回到传统高同质化打法。"}
              </p>
            </div>
          </div>
          <div className="rounded-[20px] border border-[rgba(23,37,84,0.08)] bg-white p-4">
            <p className="text-[12px] tracking-[0.08em] text-[#5B6475]">为什么这样判断</p>
            <div className="mt-3 space-y-2">
              {decision.reasoning.slice(0, 3).map((item) => (
                <div key={item} className="rounded-[14px] bg-[#F8F8F4] px-3 py-3 text-[14px] leading-7 text-[#172554]">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-[22px] bg-[#172554] p-5 text-white">
          <p className="text-[12px] tracking-[0.08em] text-white/70">下一步</p>
          <p className="mt-3 text-[22px] leading-[1.4] tracking-[-0.03em]">把机会判断交给品牌定位中心</p>
          <p className="mt-3 text-[14px] leading-[1.8] text-white/80">
            {stripAgentProductNames(
              "M-MKT 回答的是“这个市场值不值得做”，下一步该由 M-PNT 回答“在这个市场你应该成为谁”。",
            )}
          </p>
          <button
            type="button"
            onClick={onContinue}
            className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-5 py-2 text-[13px] font-medium text-[#172554]"
          >
            进入品牌定位
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </section>
  );
}

export default function MarketPage({
  params,
}: {
  params: { projectId: string };
}) {
  const router = useRouter();
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const utils = trpc.useUtils();
  const { data: project, isLoading, error } = trpc.project.getById.useQuery({
    id: params.projectId,
  });
  const { data: latestMarket } = trpc.agent.latestMarket.useQuery({
    projectId: params.projectId,
  });
  const { data: marketContext } = trpc.agent.marketContext.useQuery({
    projectId: params.projectId,
  });
  const { data: marketHistory = [] } = trpc.agent.marketHistory.useQuery({
    projectId: params.projectId,
    limit: 6,
  });
  const { data: marketReports = [] } = trpc.agent.marketReports.useQuery({
    projectId: params.projectId,
    limit: 4,
  });
  const [input, setInput] = useState("请先帮我完成一次市场进入判断，再告诉我应该怎么进入。");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [liveSnapshot, setLiveSnapshot] = useState<MarketSnapshot | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [marketIntake, setMarketIntake] = useState({
    city: "",
    category: "",
    opportunity: "",
    constraint: "",
  });
  const speechInput = useSpeechToTextField();

  useEffect(() => {
    if (project) {
      setCurrentProject(project);
    }
  }, [project, setCurrentProject]);

  const challengePrompt = useMemo(() => {
    const snapshot = liveSnapshot ?? latestMarket ?? marketContext?.current ?? null;
    if (!snapshot) return "请先完成市场判断。";
    const risk =
      snapshot.pageOutput?.finalDecision?.risks?.[0] || "进入方式是否成立？";
    return [
      `我对当前市场判断有一个疑问：${risk}`,
      "请让市场专家、经营专家和投资专家分别回应，再给我一个更明确的进入建议。",
    ].join("\n");
  }, [liveSnapshot, latestMarket, marketContext?.current]);

  function updateMarketIntake(key: keyof typeof marketIntake, value: string) {
    setMarketIntake((prev) => ({ ...prev, [key]: value }));
  }

  function applyMarketIntake() {
    setInput(buildMarketIntakePrompt(marketIntake));
  }

  async function runMarket(prompt = input.trim()) {
    if (streaming || !prompt) return;

    setStreaming(true);
    setStreamText("");
    setLiveSnapshot(null);
    setInput(prompt);

    try {
      const response = await fetch("/api/agent/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          projectId: params.projectId,
          conversationId,
          forceAgent: "m-mkt",
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = decoder.decode(value, { stream: true });
        const lines = text.split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6)) as
              | { type: "meta"; conversationId: string }
              | { type: "text"; content: string }
              | { type: "market_result"; data: MarketSnapshot }
              | { type: "error"; message: string };

            if (data.type === "meta") {
              setConversationId(data.conversationId);
            }
            if (data.type === "text") {
              accumulated += data.content;
              setStreamText(accumulated);
            }
            if (data.type === "market_result") {
              setLiveSnapshot(data.data);
            }
            if (data.type === "error") {
              accumulated += `\n\n❌ ${data.message}`;
              setStreamText(accumulated);
            }
          } catch {
            // ignore malformed SSE chunk
          }
        }
      }

      await Promise.all([
        utils.project.getById.invalidate({ id: params.projectId }),
        utils.project.list.invalidate(),
        utils.dashboard.getProjectOverview.invalidate({ projectId: params.projectId }),
        utils.dashboard.getAdvisorWorkspace.invalidate({ projectId: params.projectId }),
        utils.agent.latestMarket.invalidate({ projectId: params.projectId }),
        utils.agent.marketContext.invalidate({ projectId: params.projectId }),
        utils.agent.marketHistory.invalidate({ projectId: params.projectId, limit: 6 }),
        utils.agent.marketReports.invalidate({ projectId: params.projectId, limit: 4 }),
      ]);
    } finally {
      setStreaming(false);
    }
  }

  if (isLoading) {
    return (
      <PageLoadingState
        eyebrow="市场机会中心"
        title="AI 正在读取市场判断"
        description="正在同步项目上下文、历史判断和机会卡。"
      />
    );
  }

  if (error || !project) {
    return (
      <PageErrorState
        eyebrow="市场机会中心"
        title="市场工作台暂时不可用"
        description="项目上下文还没完整同步。"
        primaryAction={{ href: getDepartmentMeetingHref(params.projectId, "market"), label: "进入会议" }}
        secondaryAction={{ href: `/projects/${params.projectId}`, label: "回到项目" }}
      />
    );
  }

  const snapshot: MarketSnapshot | null = liveSnapshot ?? latestMarket ?? marketContext?.current ?? null;
  const signals = buildMarketSignals(snapshot);
  const council = buildCouncilOpinions(snapshot);
  const decision = snapshot?.pageOutput.finalDecision;
  const journey = buildMarketJourney({
    hasSnapshot: Boolean(snapshot),
    hasSignals: signals.length > 0,
    hasCouncil: council.length > 0,
    hasDecision: Boolean(snapshot?.pageOutput.finalDecision?.judgement),
    streaming,
  });
  const advisor = buildChiefAdvisorMessage({
    snapshot,
    streaming,
    hasSignals: signals.length > 0,
    hasCouncil: council.length > 0,
  });
  const marketProtocolProjection = buildMarketProtocolProjection({
    project: {
      name: project.name,
      category: project.category,
      stage: project.stage,
    },
    snapshot,
    signals,
    history: marketHistory,
    reports: marketReports,
  });
  const {
    founderContextView,
    marketContextView,
    decisionProtocolView,
    memoryView,
    signalLedger,
  } = marketProtocolProjection;
  const currentStepCount = journey.filter((step) => step.status === "completed").length;
  const completion = Math.round((currentStepCount / journey.length) * 100);
  const scoreRows = snapshot
    ? [
        { label: "需求机会", value: snapshot.pageOutput.scores.demand },
        { label: "竞争空间", value: 100 - snapshot.pageOutput.scores.competition },
        { label: "消费变化", value: snapshot.pageOutput.scores.timing },
        { label: "进入窗口", value: snapshot.pageOutput.scores.entryProbability },
        { label: "经营成立", value: snapshot.pageOutput.scores.economics },
      ]
    : [];
  const currentStepId = journey.find((step) => step.status === "current")?.id;
  const currentStepLabel = journey.find((step) => step.status === "current")?.label || "进行中";
  const board = getDepartmentBoard("market");
  const experts = getDepartmentExperts("market");
  const issue = snapshot?.oneLiner || "当前市场进入判断";
  const meetingHref = getDepartmentMeetingHref(project.id, "market", issue);
  const judgement =
    streamText || snapshot?.pageOutput?.finalDecision?.judgement || board.subtitle;

  return (
    <div className="space-y-5 pb-3">
      <DepartmentBoardShell
        board={board}
        projectId={project.id}
        meetingHref={meetingHref}
        issue={issue}
        judgement={judgement}
        experts={experts}
        siblingLinks={[
          { href: `/projects/${project.id}/positioning`, label: "品牌定位部" },
          { href: `/projects/${project.id}/business`, label: "商业战略部" },
          { href: `/projects/${project.id}/equity`, label: "组织设计部" },
        ]}
      />

      <CollapsibleBoardSection
        eyebrow="工作台"
        title="市场诊断与旅程"
        summary={`当前：${currentStepLabel} · 推进 ${completion}% · 正式判断请用上方开会`}
        defaultOpen={!snapshot || currentStepId === "interview"}
      >
      <div className="space-y-4">
      <WorkspaceJourneyRail
        eyebrow="市场旅程"
        title="战略旅程"
        progress={completion}
        summary="按访谈 → 扫描 → 机会 → 专家 → 决策逐步推进，一次只专注当前一步。"
        steps={journey}
        palette={{
          border: "border-[rgba(23,37,84,0.08)]",
          title: "text-[#172554]",
          eyebrow: "text-[#5B6475]",
          cardBg: "bg-white",
          progressBg: "bg-[linear-gradient(180deg,#F8F8F4_0%,#EEF2F8_100%)]",
          progressTitle: "text-[#5B6475]",
          progressValue: "text-[#172554]",
          progressText: "text-[#4B5563]",
          completedTone: "border-[#172554] bg-[#172554] text-white",
          currentTone: "border-[#C9A227] bg-[rgba(201,162,39,0.14)] text-[#8C6B00]",
          upcomingTone: "border-[rgba(23,37,84,0.12)] bg-white text-[#A0A5B0]",
          note: "text-[#6B7280]",
        }}
      />

      <ChiefAdvisorPanel
        title={advisor.title}
        summary={advisor.summary}
        learned={advisor.learned}
        missing={advisor.missing}
        nextStep={advisor.nextStep}
        palette={{
          border: "border-[rgba(23,37,84,0.08)]",
          title: "text-[#172554]",
          eyebrow: "text-[#5B6475]",
          chipBg: "bg-[rgba(23,37,84,0.08)]",
          chipText: "text-[#172554]",
          body: "text-[#4B5563]",
          softBg: "bg-[#F8F8F4]",
          nextBorder: "border-[rgba(23,37,84,0.08)]",
          nextBg: "bg-[linear-gradient(180deg,#FFFFFF_0%,#F8F8F4_100%)]",
          note: "text-[#5B6475]",
        }}
      />

      <section className="rounded-[16px] bg-[#FBFAF7] p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[12px] tracking-[0.08em] text-[#5B6475]">顾问访谈</p>
                <h2 className="mt-1 text-[20px] leading-[1.2] tracking-[-0.03em] text-[#172554]">补充市场事实</h2>
                <p className="mt-2 max-w-2xl text-[14px] leading-[1.8] text-[#4B5563]">
                  先把城市、品类、机会和约束说清，再启动分析。
                </p>
              </div>
              <div className="inline-flex items-center rounded-full bg-[rgba(23,37,84,0.08)] px-3 py-1 text-[12px] text-[#172554]">
                当前阶段：{journey.find((step) => step.status === "current")?.label || "进入决策"}
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <ModuleIntakeCard
                title="最小必要市场信息"
                description="先说明创业想法、进入区域、想看的机会和当前约束。"
                fields={[
                  {
                    id: "city",
                    label: "城市/区域",
                    placeholder: "例如：长沙雨花区、上海陆家嘴、社区商圈。",
                    value: marketIntake.city,
                    onChange: (value) => updateMarketIntake("city", value),
                  },
                  {
                    id: "category",
                    label: "品类/业态",
                    placeholder: "例如：湘菜快餐、咖啡烘焙、夜宵烧烤。",
                    value: marketIntake.category,
                    onChange: (value) => updateMarketIntake("category", value),
                  },
                  {
                    id: "opportunity",
                    label: "想判断的机会",
                    placeholder: "例如：能不能开、值不值得进、哪个区更有机会。",
                    value: marketIntake.opportunity,
                    onChange: (value) => updateMarketIntake("opportunity", value),
                  },
                  {
                    id: "constraint",
                    label: "当前约束",
                    placeholder: "例如：预算 100 万、夫妻创业、只能做外卖。",
                    value: marketIntake.constraint,
                    onChange: (value) => updateMarketIntake("constraint", value),
                  },
                ]}
                recordingFieldId={speechInput.activeFieldId}
                speechSupported={speechInput.speechSupported}
                speechError={speechInput.speechError}
                onToggleVoiceField={(field) =>
                  void speechInput.toggleFieldRecording(field.id, field.value, field.onChange)
                }
                onApply={applyMarketIntake}
                applyLabel="写入顾问访谈"
              />

              <div className="space-y-4">
                <div className="rounded-[22px] border border-[rgba(23,37,84,0.08)] bg-[linear-gradient(180deg,#FFFFFF_0%,#F8F8F4_100%)] p-4">
                  <p className="text-[12px] tracking-[0.08em] text-[#5B6475]">为什么先问这些</p>
                  <div className="mt-3 space-y-2 text-[14px] leading-7 text-[#172554]">
                    <p>创业动机会影响风险偏好。</p>
                    <p>城市和区域决定真实竞争环境。</p>
                    <p>约束条件会改变进入方式，而不是只改结论。</p>
                  </div>
                </div>

                <div className="rounded-[22px] border border-[rgba(23,37,84,0.08)] bg-white p-4">
                  <p className="text-[12px] tracking-[0.08em] text-[#5B6475]">向 AI 市场顾问发起判断</p>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    rows={4}
                    disabled={streaming}
                    className="mt-3 min-h-[128px] w-full resize-none rounded-[18px] border border-[rgba(23,37,84,0.08)] bg-[#F8F8F4] px-4 py-4 text-[15px] leading-[1.8] text-[#172554] outline-none placeholder:text-[#8A8FA0] disabled:opacity-60"
                    placeholder="请用一句话说明：你想判断哪个市场、想抓什么机会、有什么约束。"
                  />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      {speechInput.speechSupported ? (
                        <button
                          type="button"
                          onClick={() => void speechInput.toggleFieldRecording("market_input", input, setInput)}
                          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-[0.98] ${
                            speechInput.activeFieldId === "market_input"
                              ? "bg-[#172554] text-white"
                              : "border border-[rgba(23,37,84,0.08)] bg-[#F8F8F4] text-[#172554]"
                          }`}
                          aria-label={speechInput.activeFieldId === "market_input" ? "停止语音输入" : "开始语音输入"}
                        >
                          {speechInput.activeFieldId === "market_input" ? (
                            <Square className="h-4 w-4" />
                          ) : (
                            <Mic className="h-4 w-4" />
                          )}
                        </button>
                      ) : null}
                      <p className="text-[12px] leading-5 text-[#6B7280]">
                        {streaming
                          ? "市场扫描进行中..."
                          : speechInput.activeFieldId === "market_input"
                            ? "正在语音转文字..."
                            : "支持直接语音补充市场信息。"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void runMarket()}
                      disabled={streaming || !input.trim()}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#172554] px-5 py-2 text-[13px] font-medium text-white transition active:scale-[0.98] disabled:opacity-50"
                    >
                      {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                      开始市场分析
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

      <CollapsibleBoardSection
        eyebrow="分析过程"
        title="市场智能扫描"
        summary={streaming ? "正在扫描…" : snapshot ? "已有扫描结果，可展开查看" : "访谈后在此查看扫描过程"}
        defaultOpen={streaming || currentStepId === "scanning"}
      >
          <section className="rounded-[16px] bg-[#FBFAF7] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[12px] tracking-[0.08em] text-[#5B6475]">扫描进度</p>
                <h2 className="mt-1 text-[20px] leading-[1.2] tracking-[-0.03em] text-[#172554]">工作进度</h2>
              </div>
              <Search className="h-5 w-5 text-[#172554]" />
            </div>

            <div className="mt-5 space-y-4">
              <div className="rounded-[22px] bg-[linear-gradient(180deg,#F8F8F4_0%,#EEF2F8_100%)] p-4">
                <p className="text-[12px] tracking-[0.08em] text-[#5B6475]">AI 工作进度</p>
                <div className="mt-3 space-y-3 text-[14px] leading-7 text-[#172554]">
                  <div>✓ 城市消费分析</div>
                  <div>✓ 品类生命周期</div>
                  <div>{snapshot || streaming ? "✓" : "○"} 竞争结构分析</div>
                  <div>{signals.length > 0 ? "✓" : streaming ? "●" : "○"} 寻找结构性机会</div>
                  <div>{council.length > 0 ? "✓" : "○"} 专家委员会形成观点</div>
                </div>
                {streamText ? (
                  <div className="mt-4 rounded-[18px] border border-[rgba(23,37,84,0.08)] bg-white p-4">
                    <p className="text-[12px] tracking-[0.08em] text-[#5B6475]">AI 分析过程</p>
                    <pre className="mt-3 whitespace-pre-wrap font-sans text-[13px] leading-6 text-[#172554]">
                      {streamText}
                    </pre>
                  </div>
                ) : (
                  <div className="mt-4 rounded-[18px] border border-[rgba(23,37,84,0.08)] bg-white p-4 text-[13px] leading-6 text-[#4B5563]">
                    {streaming
                      ? "AI 正在把消费趋势、竞争结构和案例信号压成市场判断。"
                      : "完成访谈后，这里会展开 AI 的市场扫描过程。"}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {signals.length > 0 ? (
                  signals.slice(0, 3).map((gap) => <OpportunitySignalCard key={gap.title} gap={gap} />)
                ) : (
                  <div className="rounded-[22px] border border-dashed border-[rgba(23,37,84,0.16)] bg-[#FCFCFA] p-6 text-[14px] leading-[1.8] text-[#4B5563]">
                    还没有市场信号浮现。先启动一次市场分析，让 AI 形成结构性机会判断。
                  </div>
                )}
              </div>
            </div>
          </section>
      </CollapsibleBoardSection>
      </div>
      </CollapsibleBoardSection>

      {snapshot ? (
        <>
          <CollapsibleBoardSection
            eyebrow="结果摘要"
            title="市场判断与底板"
            summary={decision?.judgement || snapshot.oneLiner || "扫描完成后可展开查看"}
            defaultOpen={false}
          >
          <div className="space-y-4">
            <div className="rounded-[24px] border border-[rgba(23,37,84,0.08)] bg-white p-5 shadow-[0_18px_34px_rgba(23,37,84,0.05)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[12px] tracking-[0.08em] text-[#5B6475]">市场机会</p>
                      <h2 className="mt-1 text-[24px] leading-[1.2] tracking-[-0.03em] text-[#172554]">市场机会判断</h2>
                    </div>
                    <TrendingUp className="h-5 w-5 text-[#172554]" />
                  </div>
                  <div className="mt-5 rounded-[22px] bg-[linear-gradient(180deg,#172554_0%,#22346F_100%)] p-5 text-white">
                    <p className="text-[12px] tracking-[0.08em] text-white/70">部门判断</p>
                    <p className="mt-2 text-[16px] leading-7 text-white/90">{decision?.judgement}</p>
                    <p className="mt-4 text-[12px] tracking-[0.08em] text-white/70">进入参考分 · 仅作辅助</p>
                    <p className="mt-2 text-[18px] font-medium tracking-[-0.02em] text-white/85">
                      {snapshot.pageOutput.scores.entryProbability}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <MKMetaPill label="城市" value={snapshot.pageOutput.city} />
                      <MKMetaPill label="品类" value={snapshot.pageOutput.category} />
                      <MKMetaPill
                        label="判断级别"
                        value={
                          snapshot.pageOutput.health.judgement === "kill"
                            ? "建议暂缓"
                            : snapshot.pageOutput.health.judgement === "enter"
                              ? "建议进入"
                              : "谨慎进入"
                        }
                      />
                    </div>
                  </div>
                  <div className="mt-4 space-y-3">
                    {scoreRows.map((item) => (
                      <div key={item.label} className="flex items-center justify-between rounded-[16px] bg-[#F8F8F4] px-4 py-3">
                        <span className="text-[14px] text-[#172554]">{item.label}</span>
                        <span className={`text-[15px] font-medium ${scoreTone(item.value)}`}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-[rgba(23,37,84,0.08)] bg-white p-5 shadow-[0_18px_34px_rgba(23,37,84,0.05)]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[12px] tracking-[0.08em] text-[#5B6475]">市场底板</p>
                      <h2 className="mt-1 text-[24px] leading-[1.2] tracking-[-0.03em] text-[#172554]">市场底板</h2>
                    </div>
                    <Compass className="h-5 w-5 text-[#172554]" />
                  </div>
                  <div className="mt-5 space-y-3">
                    <div className="rounded-[18px] bg-[#F8F8F4] p-4">
                      <p className="text-[12px] tracking-[0.08em] text-[#5B6475]">消费趋势</p>
                      <p className="mt-2 text-[14px] leading-[1.8] text-[#172554]">{snapshot.pageOutput.marketStructure.trendSummary}</p>
                    </div>
                    <div className="rounded-[18px] bg-[#F8F8F4] p-4">
                      <p className="text-[12px] tracking-[0.08em] text-[#5B6475]">竞争判断</p>
                      <p className="mt-2 text-[14px] leading-[1.8] text-[#172554]">{snapshot.pageOutput.competition.densitySummary}</p>
                    </div>
                    <div className="rounded-[18px] bg-[rgba(234,88,12,0.08)] p-4">
                      <p className="text-[12px] tracking-[0.08em] text-[#9A3412]">最大风险</p>
                      <p className="mt-2 text-[14px] leading-[1.8] text-[#9A3412]">{snapshot.pageOutput.health.biggestRisk}</p>
                    </div>
                  </div>
                </div>
          </div>
          </CollapsibleBoardSection>

              <CollapsibleBoardSection
                eyebrow="创始人智能层"
                title="市场认知协议"
                summary="把创始人、市场、决策与记忆翻译成可复用的市场资产协议。"
                defaultOpen={false}
              >
                <div className="mb-4 flex justify-end">
                  <div className="rounded-full bg-[rgba(23,37,84,0.08)] px-3 py-2 text-[12px] font-medium text-[#172554]">
                    当前任务：{journey.find((step) => step.status === "current")?.label || "进入决策"}
                  </div>
                </div>

                <div className="space-y-4">
                  <section className="rounded-[20px] border border-[rgba(23,37,84,0.08)] bg-white p-4">
                    <p className="text-[12px] tracking-[0.08em] text-[#5B6475]">身份层</p>
                    <h3 className="mt-1 text-[18px] font-medium tracking-[-0.02em] text-[#172554]">创始人语境</h3>
                    <div className="mt-4 space-y-3">
                      {[
                        { label: "身份", value: founderContextView.identity },
                        { label: "业务背景", value: founderContextView.background },
                        { label: "进入目标", value: founderContextView.goal },
                        { label: "风险偏好", value: `${founderContextView.riskLabel} · ${founderContextView.riskNote}` },
                        { label: "决策方式", value: founderContextView.decisionStyle },
                      ].map((item) => (
                        <div key={item.label} className="rounded-[16px] bg-[#F8F8F4] px-3 py-3">
                          <p className="text-[12px] tracking-[0.08em] text-[#5B6475]">{item.label}</p>
                          <p className="mt-2 text-[13px] leading-6 text-[#172554]">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-[20px] border border-[rgba(23,37,84,0.08)] bg-white p-4">
                    <p className="text-[12px] tracking-[0.08em] text-[#5B6475]">市场层</p>
                    <h3 className="mt-1 text-[18px] font-medium tracking-[-0.02em] text-[#172554]">市场语境</h3>
                    <div className="mt-4 space-y-3">
                      {marketContextView.map((item) => (
                        <div key={item.label} className="rounded-[16px] bg-[#F8F8F4] px-3 py-3">
                          <p className="text-[12px] tracking-[0.08em] text-[#5B6475]">{item.label}</p>
                          <p className="mt-2 text-[13px] leading-6 text-[#172554]">{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-[20px] border border-[rgba(23,37,84,0.08)] bg-white p-4">
                    <p className="text-[12px] tracking-[0.08em] text-[#5B6475]">决策层</p>
                    <h3 className="mt-1 text-[18px] font-medium tracking-[-0.02em] text-[#172554]">决策协议</h3>
                    <div className="mt-4 space-y-3">
                      <div className="rounded-[16px] bg-[#F8F8F4] px-3 py-3">
                        <p className="text-[12px] tracking-[0.08em] text-[#5B6475]">问题</p>
                        <p className="mt-2 text-[13px] leading-6 text-[#172554]">{decisionProtocolView.problem}</p>
                      </div>
                      <div className="rounded-[16px] bg-[#F8F8F4] px-3 py-3">
                        <p className="text-[12px] tracking-[0.08em] text-[#5B6475]">选择</p>
                        <p className="mt-2 text-[13px] leading-6 text-[#172554]">{decisionProtocolView.choice}</p>
                      </div>
                      <div className="rounded-[16px] bg-[#F8F8F4] px-3 py-3">
                        <p className="text-[12px] tracking-[0.08em] text-[#5B6475]">理由</p>
                        <div className="mt-2 space-y-2">
                          {decisionProtocolView.reasoning.length > 0 ? (
                            decisionProtocolView.reasoning.map((item) => (
                              <p key={item} className="text-[13px] leading-6 text-[#172554]">
                                {item}
                              </p>
                            ))
                          ) : (
                            <p className="text-[13px] leading-6 text-[#5B6475]">等待形成结构化进入理由。</p>
                          )}
                        </div>
                      </div>
                      <div className="rounded-[16px] bg-[#F8F8F4] px-3 py-3">
                        <p className="text-[12px] tracking-[0.08em] text-[#5B6475]">验证</p>
                        <p className="mt-2 text-[13px] leading-6 text-[#172554]">{decisionProtocolView.validation}</p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[20px] border border-[rgba(23,37,84,0.08)] bg-white p-4">
                    <p className="text-[12px] tracking-[0.08em] text-[#5B6475]">记忆层</p>
                    <h3 className="mt-1 text-[18px] font-medium tracking-[-0.02em] text-[#172554]">记忆更新</h3>
                    <div className="mt-4 space-y-3">
                      <div className="rounded-[16px] bg-[#F8F8F4] px-3 py-3">
                        <p className="text-[12px] tracking-[0.08em] text-[#5B6475]">创始人记忆</p>
                        <div className="mt-2 space-y-2">
                          {memoryView.founderMemory.map((item) => (
                            <p key={item} className="text-[13px] leading-6 text-[#172554]">
                              {item}
                            </p>
                          ))}
                        </div>
                      </div>
                      <div className="rounded-[16px] bg-[#F8F8F4] px-3 py-3">
                        <p className="text-[12px] tracking-[0.08em] text-[#5B6475]">市场记忆</p>
                        <div className="mt-2 space-y-2">
                          {memoryView.marketMemory.length > 0 ? (
                            memoryView.marketMemory.map((item) => (
                              <p key={item} className="text-[13px] leading-6 text-[#172554]">
                                {item}
                              </p>
                            ))
                          ) : (
                            <p className="text-[13px] leading-6 text-[#5B6475]">市场记忆还在形成中。</p>
                          )}
                        </div>
                      </div>
                      <div className="rounded-[16px] bg-[#F8F8F4] px-3 py-3">
                        <p className="text-[12px] tracking-[0.08em] text-[#5B6475]">决策记忆</p>
                        <div className="mt-2 space-y-2">
                          {memoryView.decisionMemory.length > 0 ? (
                            memoryView.decisionMemory.map((item) => (
                              <p key={item} className="text-[13px] leading-6 text-[#172554]">
                                {item}
                              </p>
                            ))
                          ) : (
                            <p className="text-[13px] leading-6 text-[#5B6475]">当前进入判断还没沉淀为长期记忆。</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              </CollapsibleBoardSection>

              <div className="space-y-4">
                <CollapsibleBoardSection
                  eyebrow="账本"
                  title="市场信号账本"
                  summary="事实 / 假设 / 待验证信号"
                  defaultOpen={false}
                >
                  <div className="space-y-3">
                    {signalLedger.length > 0 ? (
                      signalLedger.map((item) => (
                        <div key={item.id} className="rounded-[18px] bg-[#F8F8F4] px-4 py-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-medium tracking-[0.08em] text-[#172554]">
                              {{ FACT: "事实", ASSUMPTION: "假设", HYPOTHESIS: "假说" }[item.kind] ?? item.kind}
                            </div>
                            <div className="text-[12px] text-[#5B6475]">可信度 {item.confidence}%</div>
                          </div>
                          <p className="mt-3 text-[13px] tracking-[0.08em] text-[#5B6475]">{item.title}</p>
                          <p className="mt-2 text-[14px] leading-7 text-[#172554]">{item.statement}</p>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-[18px] bg-[#F8F8F4] px-4 py-4 text-[14px] leading-[1.8] text-[#4B5563]">
                        还没有结构化市场信号。先完成一轮市场扫描，系统会把机会判断拆成事实、假设和待验证信号。
                      </div>
                    )}
                  </div>
                </CollapsibleBoardSection>

                <CollapsibleBoardSection
                  eyebrow="顾问协议"
                  title="市场协议流"
                  summary="上下文 → 决策 → 验证 → 记忆"
                  defaultOpen={false}
                  tone="dark"
                >
                  <div className="space-y-3">
                    {[
                      {
                        title: "01 · 顾问上下文",
                        body: `${founderContextView.identity} / ${marketContextView[0]?.value || "城市待补充"} / ${marketContextView[1]?.value || "品类待补充"}`,
                      },
                      {
                        title: "02 · 决策协议",
                        body: decisionProtocolView.choice,
                      },
                      {
                        title: "03 · 取舍",
                        body: decisionProtocolView.tradeoff,
                      },
                      {
                        title: "04 · 记忆更新",
                        body: memoryView.decisionMemory[0] || "当前市场判断尚未写入长期记忆。",
                      },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="rounded-[18px] border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.06)] px-4 py-4"
                      >
                        <div className="flex items-center gap-2 text-[13px] font-medium text-white">
                          <History className="h-4 w-4" />
                          {item.title}
                        </div>
                        <p className="mt-2 text-[13px] leading-6 text-white/84">{item.body}</p>
                      </div>
                    ))}
                  </div>
                </CollapsibleBoardSection>
              </div>

              <CollapsibleBoardSection
                eyebrow="结果"
                title="委员会与进入建议"
                summary="专家意见、会议摘要与下一步交接；正式判断请用上方开会。"
                defaultOpen={false}
              >
              <section className="rounded-[24px] border border-[rgba(23,37,84,0.08)] bg-white p-5 shadow-[0_18px_34px_rgba(23,37,84,0.05)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[12px] tracking-[0.08em] text-[#5B6475]">市场顾问会</p>
                    <h2 className="mt-1 text-[24px] leading-[1.2] tracking-[-0.03em] text-[#172554]">市场战略委员会</h2>
                  </div>
                  <MessagesSquare className="h-5 w-5 text-[#172554]" />
                </div>
                <div className="space-y-4">
                  {council.map((item) => (
                    <CouncilMemberCard key={item.role} opinion={item} />
                  ))}
                </div>
                <div className="mt-4 rounded-[18px] border border-[rgba(23,37,84,0.08)] bg-[linear-gradient(180deg,#F8F8F4_0%,#EEF2F8_100%)] p-4">
                  <p className="text-[12px] tracking-[0.08em] text-[#5B6475]">向专家发问</p>
                  <p className="mt-2 text-[14px] leading-[1.8] text-[#172554]">
                    如果你对当前市场判断有疑问，可以把问题重新写回输入区，让市场专家、经营专家和投资专家分别回应。
                  </p>
                  <button
                    type="button"
                    onClick={() => setInput(challengePrompt)}
                    className="mt-4 inline-flex min-h-10 items-center justify-center rounded-full border border-[rgba(23,37,84,0.10)] bg-white px-4 py-2 text-[13px] font-medium text-[#172554]"
                  >
                    写入专家追问
                  </button>
                </div>
              </section>

              <WorkspaceMeetingPanel
                eyebrow="战略会议"
                title="专家观点碰撞"
                items={
                  (decision?.risks || []).length > 0
                    ? (decision?.risks || []).map((item, index) => ({
                        title: `争议 ${index + 1}`,
                        body: item,
                      }))
                    : [
                        {
                          title: "当前状态",
                          body: "当前还没有显式争议，AI 正在把判断压成可执行共识。",
                        },
                      ]
                }
                summary={decision?.judgement || snapshot.oneLiner}
                conflict={(decision?.reasoning || []).slice(0, 3).join(" · ")}
                conflictLabel="形成共识的依据"
                palette={{
                  border: "border-[rgba(23,37,84,0.08)]",
                  background: "bg-[linear-gradient(180deg,#FFFFFF_0%,#F8F8F4_100%)]",
                  eyebrow: "text-[#5B6475]",
                  title: "text-[#172554]",
                  itemBorder: "border-[rgba(23,37,84,0.08)]",
                  itemBg: "bg-white",
                  itemBody: "text-[#172554]",
                  summaryBg: "bg-[#172554]",
                  summaryText: "text-white",
                  summaryLabel: "text-white/70",
                  summaryNoteBg: "bg-white/10",
                  summaryNoteText: "text-white/88",
                }}
              />

              <WorkspaceDecisionPanel
                eyebrow="市场进入建议"
                title={snapshot.oneLiner}
                badge={
                  snapshot.pageOutput.health.judgement === "kill"
                    ? "建议暂缓"
                    : snapshot.pageOutput.health.judgement === "enter"
                      ? "建议进入"
                      : "谨慎进入"
                }
                summaryTitle="一句话判断"
                summaryBody={decision?.judgement || snapshot.oneLiner}
                leftCards={[
                  {
                    title: "进入策略",
                    body:
                      snapshot.pageOutput.entryStrategies[0]?.title ||
                      snapshot.pageOutput.opportunityCard?.suggestedPositioning ||
                      "先验证结构性空位，再决定定位。",
                  },
                  {
                    title: "不要做",
                    body:
                      decision?.risks?.[0] ||
                      snapshot.pageOutput.opportunityCard?.risk ||
                      "不要回到传统高同质化打法。",
                    tone: "warning",
                  },
                ]}
                reasonsTitle="为什么这样判断"
                reasons={(decision?.reasoning || []).slice(0, 3)}
                rightTitle="下一步"
                rightHeading="把机会判断交给品牌定位中心"
                rightBody={stripAgentProductNames(
                  "M-MKT 回答的是“这个市场值不值得做”，下一步该由 M-PNT 回答“在这个市场你应该成为谁”。",
                )}
                rightAction={
                  <button
                    type="button"
                    onClick={() => router.push(`/projects/${project.id}/positioning`)}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-white px-5 py-2 text-[13px] font-medium text-[#172554]"
                  >
                    进入品牌定位
                    <ArrowRight className="h-4 w-4" />
                  </button>
                }
                palette={{
                  border: "border-[rgba(23,37,84,0.08)]",
                  background: "bg-white",
                  eyebrow: "text-[#5B6475]",
                  title: "text-[#172554]",
                  badgeBg: "bg-[rgba(22,163,74,0.12)]",
                  badgeText: "text-[#166534]",
                  summaryBg: "bg-[linear-gradient(180deg,#F8F8F4_0%,#EEF2F8_100%)]",
                  summaryEyebrow: "text-[#5B6475]",
                  summaryText: "text-[#172554]",
                  cardBorder: "border-[rgba(23,37,84,0.08)]",
                  cardBg: "bg-white",
                  cardEyebrow: "text-[#5B6475]",
                  cardText: "text-[#172554]",
                  warningText: "text-[#9A3412]",
                  reasonItemBg: "bg-[#F8F8F4]",
                  rightBg: "bg-[#172554]",
                  rightEyebrow: "text-white/70",
                  rightText: "text-white",
                  rightBodyText: "text-white/80",
                }}
              />

              <MarketFeedbackCard decisionId={snapshot.decisionId} projectId={params.projectId} />

              <CollapsibleBoardSection
                eyebrow="历史"
                title="决策档案与报告"
                summary={
                  marketHistory[0]?.judgement ||
                  marketReports[0]?.title ||
                  "仅保留最近判断摘要，详情可展开查看"
                }
                defaultOpen={false}
              >
              <div className="space-y-4">
                <WorkspaceArchivePanel
                  eyebrow="决策档案"
                  title="最近判断"
                  emptyText="暂无历史版本。"
                  items={marketHistory.slice(0, 4).map((item) => ({
                    id: item.id,
                    title: item.judgement || item.problem,
                    summary: new Date(item.createdAt).toLocaleDateString("zh-CN"),
                  }))}
                  palette={{
                    border: "border-[rgba(23,37,84,0.08)]",
                    background: "bg-white",
                    eyebrow: "text-[#5B6475]",
                    title: "text-[#172554]",
                    itemBg: "bg-[#F8F8F4]",
                    itemTitle: "text-[#172554]",
                    itemBody: "text-[#6B7280]",
                    emptyBg: "bg-[#F8F8F4]",
                    emptyText: "text-[#4B5563]",
                  }}
                />

                <WorkspaceArchivePanel
                  eyebrow="资产快照"
                  title="报告沉淀"
                  emptyText="暂无市场报告沉淀。"
                  items={marketReports.map((report) => ({
                    id: report.id,
                    title: report.title,
                    summary: report.summary || undefined,
                  }))}
                  palette={{
                    border: "border-[rgba(23,37,84,0.08)]",
                    background: "bg-white",
                    eyebrow: "text-[#5B6475]",
                    title: "text-[#172554]",
                    itemBg: "bg-[#F8F8F4]",
                    itemTitle: "text-[#172554]",
                    itemBody: "text-[#4B5563]",
                    emptyBg: "bg-[#F8F8F4]",
                    emptyText: "text-[#4B5563]",
                  }}
                />
              </div>
              </CollapsibleBoardSection>
              </CollapsibleBoardSection>
            </>
          ) : null}
    </div>
  );
}
