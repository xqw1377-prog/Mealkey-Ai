"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  FileText,
  GitBranch,
  Loader2,
  Mic,
  ShieldAlert,
  Square,
  Users2,
} from "lucide-react";
import {
  WorkspaceArchivePanel,
  ChiefAdvisorPanel,
  CollapsibleBoardSection,
  DepartmentBoardShell,
  WorkspaceDecisionPanel,
  FeedbackWidget,
  ModuleIntakeCard,
  WorkspaceMeetingPanel,
  WorkspaceJourneyRail,
} from "@/components/operating";
import { PageEmptyState, PageErrorState, PageLoadingState } from "@/components/operating/PageState";
import {
  getDepartmentBoard,
  getDepartmentExperts,
  getDepartmentMeetingHref,
  stripAgentProductNames,
} from "@/lib/department-board";
import { buildEquityProtocolProjection } from "@/lib/runtime-projections/equityProtocol";
import { trpc } from "@/lib/trpc";
import type {
  EquityCommitteeOpinion,
  EquityScenario,
  EquitySnapshot,
} from "@/lib/equity";
import { useSpeechToTextField } from "@/hooks/useSpeechToTextField";
import { useProjectStore } from "@/stores/projectStore";

function buildEquityIntakePrompt(values: {
  capTable: string;
  plan: string;
  concern: string;
  goal: string;
}) {
  return [
    "请作为股权顾问团队，帮助我完成一次股权决策。",
    `当前股东/结构：${values.capTable || "待补充"}`,
    `本轮动作：${values.plan || "待补充"}`,
    `最大担心：${values.concern || "待补充"}`,
    `想达成的目标：${values.goal || "待补充"}`,
    "请先识别场景、判断风险、组织专家讨论，再给出主方案与治理动作。",
  ].join("\n");
}

type StreamMeta = {
  type: "meta";
  runtime: "m-ed";
  provider: string;
  model: string;
  conversationId: string;
  agentName?: string;
};

type EquityJourneyStep = {
  id: "interview" | "scan" | "risk" | "council" | "scenario" | "decision";
  label: string;
  note: string;
  status: "completed" | "current" | "upcoming";
};

type EquityExpertMemo = {
  role: string;
  focus: string;
  opinion: string;
  concern: string;
};

function buildJourney(input: {
  hasSnapshot: boolean;
  hasScenarios: boolean;
  hasCommittee: boolean;
  hasDecision: boolean;
  streaming: boolean;
}): EquityJourneyStep[] {
  if (!input.hasSnapshot && !input.streaming) {
    return [
      { id: "interview", label: "股权访谈", note: "先理解当前结构和本轮议题。", status: "current" },
      { id: "scan", label: "结构扫描", note: "建立股权健康画像。", status: "upcoming" },
      { id: "risk", label: "风险判断", note: "发现控制权、公平和激励风险。", status: "upcoming" },
      { id: "council", label: "专家讨论", note: "让不同治理立场交锋。", status: "upcoming" },
      { id: "scenario", label: "方案模拟", note: "对照多套股权方案。", status: "upcoming" },
      { id: "decision", label: "治理决策", note: "形成最终股权建议。", status: "upcoming" },
    ];
  }

  if (input.streaming && !input.hasSnapshot) {
    return [
      { id: "interview", label: "股权访谈", note: "项目背景已进入顾问上下文。", status: "completed" },
      { id: "scan", label: "结构扫描", note: "正在建立股权健康画像。", status: "current" },
      { id: "risk", label: "风险判断", note: "等待控制权与激励风险浮现。", status: "upcoming" },
      { id: "council", label: "专家讨论", note: "等待治理专家委员会。", status: "upcoming" },
      { id: "scenario", label: "方案模拟", note: "等待可对照的股权方案。", status: "upcoming" },
      { id: "decision", label: "治理决策", note: "最后压成股权主判断。", status: "upcoming" },
    ];
  }

  return [
    { id: "interview", label: "股权访谈", note: "当前结构与目标已被吸收。", status: "completed" },
    { id: "scan", label: "结构扫描", note: "股权画像与健康度已形成。", status: "completed" },
    { id: "risk", label: "风险判断", note: "主要治理风险已经识别。", status: "completed" },
    {
      id: "council",
      label: "专家讨论",
      note: input.hasCommittee ? "多方治理立场已经形成。" : "等待专家形成不同意见。",
      status: input.hasCommittee ? "completed" : "current",
    },
    {
      id: "scenario",
      label: "方案模拟",
      note: input.hasScenarios ? "多套股权方案已经可对照。" : "等待可比较的股权方案。",
      status: input.hasScenarios ? "completed" : input.hasCommittee ? "current" : "upcoming",
    },
    {
      id: "decision",
      label: "治理决策",
      note: input.hasDecision ? "最终股权判断已经形成。" : "等待最终治理决策。",
      status: input.hasDecision ? "current" : input.hasScenarios ? "current" : "upcoming",
    },
  ];
}

function summarizeCapTableDelta(
  before: Array<{ label: string; equity: number }>,
  after: Array<{ label: string; equity: number }>,
  controlScore?: number,
) {
  const beforeMap = new Map(before.map((item) => [item.label, item.equity]));
  const deltas = after.map((item) => ({
    label: item.label,
    before: beforeMap.get(item.label) ?? 0,
    after: item.equity,
    delta: Math.round((item.equity - (beforeMap.get(item.label) ?? 0)) * 10) / 10,
  }));

  const biggestDecrease = [...deltas]
    .filter((item) => item.delta < 0)
    .sort((a, b) => a.delta - b.delta)[0];
  const biggestIncrease = [...deltas]
    .filter((item) => item.delta > 0)
    .sort((a, b) => b.delta - a.delta)[0];
  const optionPoolDelta = deltas.find((item) => item.label === "激励池");

  const parts: string[] = [];
  if (biggestDecrease) {
    parts.push(`${biggestDecrease.label} ${biggestDecrease.delta}%`);
  }
  if (biggestIncrease) {
    parts.push(`${biggestIncrease.label} +${biggestIncrease.delta}%`);
  }
  if (optionPoolDelta && optionPoolDelta.delta !== 0) {
    parts.push(`激励池 ${optionPoolDelta.delta > 0 ? "+" : ""}${optionPoolDelta.delta}%`);
  }
  if (typeof controlScore === "number") {
    parts.push(`控制权 ${controlScore}`);
  }

  return parts.length > 0 ? parts.join(" · ") : "当前方案对结构影响较小。";
}

function buildAdvisorMessage(input: {
  snapshot: EquitySnapshot | null;
  streaming: boolean;
  hasCommittee: boolean;
  hasScenarios: boolean;
}) {
  if (!input.snapshot && !input.streaming) {
    return {
      title: "AI 股权顾问已就位",
      summary: "我会先理解当前股东结构、本轮动作和你的底线，再判断这一轮股权怎么做才稳。",
      learned: ["当前结构", "本轮议题", "主要担心"],
      missing: ["控制权边界", "激励空间", "退出机制"],
      nextStep: "先完成股权访谈，让工作台拿到本轮治理判断的最小必要信息。",
    };
  }

  if (input.streaming && !input.snapshot) {
    return {
      title: "股权判断进行中",
      summary: "我正在扫描控制权、融资安全和激励空间，不会直接跳到分配建议。",
      learned: ["股东结构", "动作计划", "治理目标"],
      missing: ["风险共识", "方案对照", "最终决策"],
      nextStep: "等待风险和方案浮现，再进入治理专家委员会。",
    };
  }

  return {
    title: "AI 首席治理顾问",
    summary:
      input.snapshot?.pageOutput.finalDecision.judgement ||
      input.snapshot?.oneLiner ||
      "当前已经形成一轮股权治理建议。",
    learned: [
      `控制权 ${input.snapshot?.pageOutput.health.control ?? "待生成"}`,
      `融资安全 ${input.snapshot?.pageOutput.health.fundingSafety ?? "待生成"}`,
      `激励空间 ${input.snapshot?.pageOutput.health.incentiveRoom ?? "待生成"}`,
    ],
    missing: input.hasScenarios ? ["创始人确认", "执行条款"] : ["专家分歧", "创始人确认", "执行条款"],
    nextStep: input.hasCommittee
      ? "继续把专家意见压成主方案，再决定这一轮股权结构到底怎么落。"
      : "先让治理专家形成不同立场，再开始股权方案对照。",
  };
}

function buildExpertMemos(
  committee: EquityCommitteeOpinion[],
  snapshot: EquitySnapshot | null,
): EquityExpertMemo[] {
  if (committee.length > 0) {
    return committee.map((item) => ({
      role: item.role,
      focus:
        item.role.includes("创始") ? "控制权保护" : item.role.includes("投资") ? "融资空间" : "治理稳定",
      opinion: item.opinion,
      concern: item.concern || snapshot?.pageOutput.health.biggestRisk || "仍需结合执行条款继续压实。",
    }));
  }

  if (!snapshot) return [];

  return [
    {
      role: "创始人保护专家",
      focus: "控制权保护",
      opinion: snapshot.pageOutput.finalDecision.reasoning[0] || "先保住创始控制权，再谈让渡。",
      concern: snapshot.pageOutput.health.biggestRisk,
    },
    {
      role: "融资与激励专家",
      focus: "融资空间",
      opinion: snapshot.pageOutput.finalDecision.reasoning[1] || "结构必须为下一轮融资和激励留出空间。",
      concern: snapshot.pageOutput.finalDecision.risks[0] || "如果一次性释放过多，后续会很被动。",
    },
    {
      role: "治理结构专家",
      focus: "规则稳定",
      opinion: snapshot.pageOutput.finalDecision.reasoning[2] || "权责匹配和退出机制需要同步设计。",
      concern: snapshot.pageOutput.finalDecision.risks[1] || "如果只有分配没有规则，后面一定会出问题。",
    },
  ];
}

function inferFounderGovernanceGoal(text: string) {
  if (!text) return "先厘清治理边界，再决定怎么分配股权。";
  if (/融资|投资|募资/i.test(text)) return "在不失控的前提下，为后续融资留出空间。";
  if (/激励|期权|店长|合伙人/i.test(text)) return "搭出能吸引关键伙伴的激励结构。";
  if (/控制权|稀释|稳定|保住/i.test(text)) return "优先守住控制权和长期治理稳定。";
  return "在控制权、激励和融资之间找到可执行的平衡。";
}

function inferEquityRiskProfile(text: string) {
  if (/融资|扩张|快速|加速|窗口/i.test(text)) {
    return {
      label: "进取型",
      note: "愿意为增长和融资空间承受一定结构波动。",
    };
  }
  if (/控制权|稳|保守|稳定|风险|底线/i.test(text)) {
    return {
      label: "稳健型",
      note: "优先确保控制权和治理秩序不被破坏。",
    };
  }

  return {
    label: "平衡型",
    note: "会同时看控制权、激励效率和融资空间。",
  };
}

function buildFounderEquityContextView(input: {
  project: { name: string; category?: string | null; stage?: string | null };
  snapshot: EquitySnapshot | null;
  intake: { plan: string; concern: string; goal: string };
  scenarios: EquityScenario[];
}) {
  const text = [
    input.snapshot?.problem,
    input.snapshot?.oneLiner,
    input.snapshot?.strategy,
    input.snapshot?.action,
    input.snapshot?.pageOutput.finalDecision.judgement,
    input.intake.plan,
    input.intake.concern,
    input.intake.goal,
    input.scenarios[0]?.summary,
  ]
    .filter(Boolean)
    .join(" ");
  const risk = inferEquityRiskProfile(text);

  return {
    identity: `${input.project.name} 创始人`,
    background: input.project.category || "治理背景待补全",
    goal: inferFounderGovernanceGoal(text),
    riskLabel: risk.label,
    riskNote: risk.note,
    decisionStyle: input.snapshot ? "先守住治理边界，再落具体分配" : "先访谈，再进入治理扫描",
  };
}

function buildEquityContextView(input: {
  project: { category?: string | null; stage?: string | null };
  snapshot: EquitySnapshot | null;
  pageOutput: EquitySnapshot["pageOutput"] | null;
}) {
  const founders = input.pageOutput?.profile.founders || [];
  const capTable = input.pageOutput?.profile.capTable || [];
  const coreHolder = capTable[0];

  return [
    { label: "项目阶段", value: input.project.stage || input.pageOutput?.stage || "待补充" },
    { label: "当前议题", value: input.pageOutput?.topic || input.snapshot?.problem || "待澄清" },
    { label: "核心持股", value: coreHolder ? `${coreHolder.label} ${coreHolder.equity}%` : "待建立结构画像" },
    { label: "团队结构", value: founders.length > 0 ? `${founders.length} 位核心成员已进入治理视图` : "待补充" },
    {
      label: "治理矛盾",
      value: input.pageOutput?.health.biggestRisk || input.snapshot?.diagnosis || "待形成主要风险判断",
    },
    {
      label: "协议层级",
      value: input.snapshot ? "治理任务已启动" : "等待启动",
    },
  ];
}

function buildEquityDecisionProtocolView(input: {
  snapshot: EquitySnapshot | null;
  scenarios: EquityScenario[];
}) {
  const decision = input.snapshot?.pageOutput.finalDecision;
  const primaryScenario = input.scenarios.find((item) => item.recommendation === "primary") || input.scenarios[0];
  const reasoning = [
    ...(decision?.reasoning || []),
    ...(primaryScenario?.highlights || []),
  ]
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index)
    .slice(0, 3);

  return {
    problem: input.snapshot?.problem || "当前治理问题仍在澄清中。",
    choice:
      decision?.judgement ||
      primaryScenario?.title ||
      input.snapshot?.strategy ||
      "先把股权主方案压成一个正式选择。",
    reasoning,
    tradeoff:
      decision?.risks[0] ||
      primaryScenario?.risks[0] ||
      input.snapshot?.pageOutput.health.biggestRisk ||
      "需要在控制权、激励效率和融资空间之间做取舍。",
    validation:
      decision?.actions[0] ||
      input.snapshot?.action ||
      "先确认核心边界，再把方案写成执行条款。",
  };
}

function buildEquityMemoryView(input: {
  snapshot: EquitySnapshot | null;
  previous: EquitySnapshot | null;
  history: Array<{ judgement?: string | null; problem: string; createdAt: string | Date }>;
  reports: Array<{ title: string; summary?: string | null }>;
}) {
  const founderMemory = [
    inferEquityRiskProfile(
      [
        input.snapshot?.oneLiner,
        input.snapshot?.pageOutput.finalDecision.judgement,
        input.snapshot?.pageOutput.health.biggestRisk,
      ]
        .filter(Boolean)
        .join(" "),
    ).note,
    (input.snapshot?.pageOutput.health.control ?? 0) >= 75
      ? "当前阶段明显优先守住控制权。"
      : "当前阶段更强调结构弹性与后续空间。",
  ];

  const governanceMemory = [
    input.snapshot?.pageOutput.health.biggestRisk,
    input.previous?.oneLiner,
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
    governanceMemory,
    decisionMemory,
  };
}

function buildEquityLedger(input: {
  snapshot: EquitySnapshot | null;
  scenarios: EquityScenario[];
  committee: EquityCommitteeOpinion[];
}) {
  const health = input.snapshot?.pageOutput.health;
  const capTable = input.snapshot?.pageOutput.profile.capTable || [];
  const primaryScenario = input.scenarios.find((item) => item.recommendation === "primary") || input.scenarios[0];

  const ledger = [
    health
      ? {
          id: "health-score",
          kind: health.score >= 75 ? "FACT" : health.score >= 60 ? "ASSUMPTION" : "HYPOTHESIS",
          title: "股权健康度",
          statement: `当前健康度 ${health.score}，最大风险是${health.biggestRisk}。`,
          note: `系统扫描 · 控制权 ${health.control} / 融资安全 ${health.fundingSafety}`,
        }
      : null,
    capTable[0]
      ? {
          id: "cap-table",
          kind: "FACT",
          title: "现有结构",
          statement: `${capTable[0].label} 当前持股 ${capTable[0].equity}%${
            capTable[1] ? `，第二大权益项为 ${capTable[1].label} ${capTable[1].equity}%。` : "。"
          }`,
          note: "结构画像 · 当前股权结构",
        }
      : null,
    primaryScenario
      ? {
          id: `scenario-${primaryScenario.id}`,
          kind:
            primaryScenario.recommendation === "primary"
              ? "ASSUMPTION"
              : primaryScenario.recommendation === "reject"
                ? "HYPOTHESIS"
                : "ASSUMPTION",
          title: primaryScenario.title,
          statement: primaryScenario.summary,
          note: `方案推演 · ${primaryScenario.recommendation === "primary" ? "主推" : primaryScenario.recommendation === "reject" ? "暂缓" : "备选"}`,
        }
      : null,
    input.committee[0]
      ? {
          id: `committee-${input.committee[0].role}`,
          kind: "ASSUMPTION",
          title: input.committee[0].role,
          statement: input.committee[0].opinion,
          note: `专家观点 · ${input.committee[0].concern || "等待继续压实"}`,
        }
      : null,
  ]
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .slice(0, 6);

  return ledger;
}

function EquityFeedbackCard({
  decisionId,
  projectId,
}: {
  decisionId?: string;
  projectId: string;
}) {
  const feedback = trpc.agent.equityFeedback.useMutation();

  if (!decisionId) return null;

  return (
    <FeedbackWidget
      question="这轮股权判断符合你的观察吗？"
      allowComment
      positiveLabel="符合"
      negativeLabel="需要调整"
      pending={feedback.isPending}
      done={feedback.isSuccess}
      onSubmit={async (helpful, comment) => {
        await feedback.mutateAsync({ decisionId, projectId, helpful, comment });
      }}
    />
  );
}

function MetricCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "warm" | "strong";
}) {
  const toneClass =
    tone === "strong"
      ? "bg-[rgba(102,115,94,0.10)] text-[#66735E]"
      : tone === "warm"
        ? "bg-[rgba(180,124,92,0.10)] text-[#B47C5C]"
        : "bg-[#F8F7F3] text-[#202124]";
  return (
    <div className={`rounded-[16px] px-3 py-3 ${toneClass}`}>
      <p className="text-[12px] leading-5 tracking-[0.01em]">{label}</p>
      <p className="mt-1 text-[18px] leading-7">{value}</p>
    </div>
  );
}

function CapTableCompare({
  title,
  items,
  reference,
}: {
  title: string;
  items: Array<{ label: string; equity: number }>;
  reference?: Array<{ label: string; equity: number }>;
}) {
  const referenceMap = new Map((reference || []).map((item) => [item.label, item.equity]));
  return (
    <div className="rounded-[14px] border border-[rgba(24,24,23,0.06)] bg-white px-3 py-3">
      <p className="text-[12px] leading-5 tracking-[0.01em] text-[#66735E]">{title}</p>
      <div className="mt-2 space-y-1.5">
        {items.map((item) => {
          const before = referenceMap.get(item.label);
          const delta = typeof before === "number" ? Math.round((item.equity - before) * 10) / 10 : null;
          const deltaTone =
            delta === null || delta === 0 ? "text-[#6f747b]" : delta > 0 ? "text-[#66735E]" : "text-[#B47C5C]";

          return (
            <div key={`${title}-${item.label}`} className="flex items-center justify-between gap-3 text-[12px] leading-5">
              <span className="truncate text-[#202124]">{item.label}</span>
              <span className="flex items-center gap-2">
                <span className="text-[#6f747b]">{item.equity}%</span>
                {delta !== null ? (
                  <span className={`rounded-full bg-[rgba(24,24,23,0.04)] px-2 py-0.5 text-[11px] ${deltaTone}`}>
                    {delta > 0 ? `+${delta}` : delta}
                  </span>
                ) : null}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EquityScenarioCard({
  scenario,
  active,
  onSelect,
}: {
  scenario: EquityScenario;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`rounded-[22px] border p-4 shadow-[0_14px_28px_rgba(24,24,23,0.04)] ${
        active ? "border-[rgba(24,24,23,0.14)] bg-white" : "border-[rgba(24,24,23,0.08)] bg-[#FBFAF7]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[18px] font-semibold leading-[1.35] text-[#202124]">{scenario.title}</p>
          <p className="mt-2 text-[14px] leading-[1.8] text-[#5f655d]">{scenario.summary}</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[12px] ${
            scenario.recommendation === "primary"
              ? "bg-[rgba(102,115,94,0.10)] text-[#66735E]"
              : scenario.recommendation === "reject"
                ? "bg-[rgba(180,124,92,0.10)] text-[#B47C5C]"
                : "bg-white text-[#202124]"
          }`}
        >
          {scenario.recommendation === "primary" ? "主推" : scenario.recommendation === "reject" ? "暂缓" : "备选"}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <MetricCard label="创始人变化" value={scenario.founderEquityChange || "待补"} />
        <MetricCard label="控制评分" value={scenario.controlScore ?? "待补"} />
      </div>
      <div className="mt-3 rounded-[16px] bg-[#F8F7F3] px-3 py-3 text-[13px] leading-6 text-[#202124]">
        {scenario.capTable
          ? summarizeCapTableDelta(scenario.capTable.before, scenario.capTable.after, scenario.controlScore)
          : scenario.dilutionImpact || "待补结构变化说明"}
      </div>
      <button
        type="button"
        onClick={onSelect}
        className="mt-4 inline-flex min-h-10 items-center justify-center rounded-full bg-[#202124] px-4 py-2 text-[13px] font-medium text-white"
      >
        聚焦这个方案
      </button>
    </div>
  );
}

export default function EquityPage({
  params,
}: {
  params: { projectId: string };
}) {
  const projectId = params.projectId;
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const utils = trpc.useUtils();
  const metaQuery = trpc.agent.equityMeta.useQuery();
  const historyQuery = trpc.agent.equityHistory.useQuery({ projectId, limit: 8 });
  const reportsQuery = trpc.agent.equityReports.useQuery({ projectId, limit: 5 });
  const contextQuery = trpc.agent.equityContext.useQuery({ projectId });
  const projectQuery = trpc.project.getById.useQuery({ id: projectId });

  const [input, setInput] = useState("请基于当前项目，完成一次股权健康扫描，并给出本轮股权主方案。");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [runtimeMeta, setRuntimeMeta] = useState<StreamMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [liveSnapshot, setLiveSnapshot] = useState<EquitySnapshot | null>(null);
  const [livePrevious, setLivePrevious] = useState<EquitySnapshot | null>(null);
  const [simulationMode, setSimulationMode] = useState<"baseline" | "funding" | "partner" | "option_pool">("baseline");
  const [fundingAmountWan, setFundingAmountWan] = useState(800);
  const [optionPoolTarget, setOptionPoolTarget] = useState(10);
  const [newPartnerCount, setNewPartnerCount] = useState(1);
  const [focusedScenarioId, setFocusedScenarioId] = useState<string | null>(null);
  const [compareScenarioId, setCompareScenarioId] = useState<string | null>(null);
  const [equityIntake, setEquityIntake] = useState({
    capTable: "",
    plan: "",
    concern: "",
    goal: "",
  });
  const speechInput = useSpeechToTextField();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (projectQuery.data) {
      setCurrentProject(projectQuery.data);
    }
  }, [projectQuery.data, setCurrentProject]);

  function updateEquityIntake(key: keyof typeof equityIntake, value: string) {
    setEquityIntake((prev) => ({ ...prev, [key]: value }));
  }

  function applyEquityIntake() {
    setInput(buildEquityIntakePrompt(equityIntake));
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [streamText, liveSnapshot]);

  const displaySnapshot = liveSnapshot || (contextQuery.data?.current as EquitySnapshot | null) || null;
  const previousSnapshot =
    liveSnapshot ? livePrevious : ((contextQuery.data?.previous as EquitySnapshot | null) || null);
  const pageOutput =
    displaySnapshot?.pageOutput ||
    (contextQuery.data?.pageOutput as EquitySnapshot["pageOutput"] | null) ||
    null;

  useEffect(() => {
    const simulationInputs = pageOutput?.simulationInputs;
    if (!simulationInputs) return;
    if (simulationInputs.scenarioMode) {
      setSimulationMode(simulationInputs.scenarioMode);
    }
    if (typeof simulationInputs.fundingAmountWan === "number") {
      setFundingAmountWan(simulationInputs.fundingAmountWan);
    }
    if (typeof simulationInputs.optionPoolTarget === "number") {
      setOptionPoolTarget(simulationInputs.optionPoolTarget);
    }
    if (typeof simulationInputs.newPartnerCount === "number") {
      setNewPartnerCount(simulationInputs.newPartnerCount);
    }
  }, [pageOutput?.simulationInputs]);

  const scenarios = useMemo(() => pageOutput?.scenarios || [], [pageOutput?.scenarios]);
  const focusedScenario = useMemo(
    () =>
      scenarios.find((item) => item.id === focusedScenarioId) ||
      scenarios.find((item) => item.recommendation === "primary") ||
      scenarios[0] ||
      null,
    [focusedScenarioId, scenarios],
  );

  useEffect(() => {
    if (!focusedScenario) return;
    if (compareScenarioId && scenarios.some((item) => item.id === compareScenarioId && item.id !== focusedScenario.id)) {
      return;
    }
    const nextCompare =
      scenarios.find((item) => item.id !== focusedScenario.id && item.recommendation === "secondary") ||
      scenarios.find((item) => item.id !== focusedScenario.id) ||
      null;
    setCompareScenarioId(nextCompare?.id || null);
  }, [compareScenarioId, focusedScenario, scenarios]);

  const challengePrompt = useMemo(() => {
    const snapshot = liveSnapshot || (contextQuery.data?.current as EquitySnapshot | null) || null;
    if (!snapshot) return "请先完成股权健康扫描。";
    const risk =
      snapshot.pageOutput?.finalDecision?.risks?.[0] || "这个结构是否真的稳？";
    return [
      `我对当前股权建议有一个疑问：${risk}`,
      "请让创始人保护、融资激励、治理结构三个视角分别回应，再告诉我是否继续推进这套方案。",
    ].join("\n");
  }, [liveSnapshot, contextQuery.data?.current]);

  function buildSimulationPrompt() {
    if (simulationMode === "funding") {
      return `请按融资模拟重算：融资 ${fundingAmountWan} 万，期权池目标 ${optionPoolTarget}%，新增合伙人 ${newPartnerCount} 位，并给出控制权优先、激励优先、融资优先三套股权方案。`;
    }
    if (simulationMode === "partner") {
      return `请按新增合伙人模拟重算：新增 ${newPartnerCount} 位合伙人，期权池目标 ${optionPoolTarget}%，并判断当前结构如何分配更稳。`;
    }
    if (simulationMode === "option_pool") {
      return `请按期权池模拟重算：期权池目标 ${optionPoolTarget}%，融资 ${fundingAmountWan} 万作为参考，判断激励空间和控制权变化。`;
    }
    return `请基于当前项目，完成一次完整股权健康扫描；如按融资 ${fundingAmountWan} 万、期权池 ${optionPoolTarget}%、新增合伙人 ${newPartnerCount} 位进行推演，给出主方案。`;
  }

  async function runEquity() {
    return runEquityWithPrompt(input.trim());
  }

  async function runEquityWithPrompt(prompt: string) {
    if (streaming || !prompt) return;

    setError(null);
    setStreaming(true);
    setStreamText("");
    setLiveSnapshot(null);
    setLivePrevious(null);
    setInput(prompt);

    try {
      const response = await fetch("/api/agent/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: prompt,
          projectId,
          conversationId,
          forceAgent: "m-ed",
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
              | StreamMeta
              | { type: "text"; content: string }
              | { type: "equity_result"; data: EquitySnapshot; previous?: EquitySnapshot | null }
              | { type: "error"; message: string };

            if (data.type === "meta") {
              setRuntimeMeta(data);
              setConversationId(data.conversationId);
            }
            if (data.type === "text") {
              accumulated += data.content;
              setStreamText(accumulated);
            }
            if (data.type === "equity_result") {
              setLiveSnapshot(data.data);
              setLivePrevious(data.previous || null);
            }
            if (data.type === "error") {
              accumulated += `\n\n❌ ${data.message}`;
              setStreamText(accumulated);
              setError(data.message);
            }
          } catch {
            // ignore malformed lines
          }
        }
      }

      await Promise.all([
        utils.project.getById.invalidate({ id: projectId }),
        utils.project.list.invalidate(),
        utils.dashboard.getProjectOverview.invalidate({ projectId }),
        utils.dashboard.getAdvisorWorkspace.invalidate({ projectId }),
        utils.report.list.invalidate({ projectId }),
        utils.agent.equityContext.invalidate({ projectId }),
        utils.agent.equityHistory.invalidate({ projectId, limit: 8 }),
        utils.agent.equityReports.invalidate({ projectId, limit: 5 }),
        utils.agent.latestEquity.invalidate({ projectId }),
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "股权工作台执行失败");
    } finally {
      setStreaming(false);
    }
  }

  if (projectQuery.isLoading || contextQuery.isLoading || metaQuery.isLoading) {
    return (
      <PageLoadingState
        eyebrow="股权决策中心"
        title="AI 正在装配治理工作台"
        description="正在读取项目阶段、历史判断和股权结构信息。"
      />
    );
  }

  if (projectQuery.error) {
    return (
      <PageErrorState
        eyebrow="股权决策中心"
        title="股权顾问工作台暂时无法打开"
        description={projectQuery.error.message || "项目暂时不可用。"}
        primaryAction={{ href: `/projects/${projectId}`, label: "回到世界" }}
        secondaryAction={{ href: getDepartmentMeetingHref(projectId, "org"), label: "回到会议" }}
      />
    );
  }

  const project = projectQuery.data;
  if (!project) {
    return (
      <PageEmptyState
        eyebrow="股权决策中心"
        title="这个项目当前不可用"
        description="先回到经营世界重新进入。"
        primaryAction={{ href: "/projects", label: "回到世界" }}
      />
    );
  }

  const currentStage = pageOutput?.stage || project.stage || "筹备期";
  const health = pageOutput?.health;
  const founders = pageOutput?.profile.founders || [];
  const capTable = pageOutput?.profile.capTable || [];
  const committee = pageOutput?.committee || [];
  const finalDecision = pageOutput?.finalDecision;
  const compareScenario =
    scenarios.find((item) => item.id === compareScenarioId && item.id !== focusedScenario?.id) ||
    scenarios.find((item) => item.id !== focusedScenario?.id && item.recommendation === "secondary") ||
    scenarios.find((item) => item.id !== focusedScenario?.id) ||
    null;

  const journey = buildJourney({
    hasSnapshot: Boolean(displaySnapshot),
    hasScenarios: scenarios.length > 0,
    hasCommittee: committee.length > 0,
    hasDecision: Boolean(finalDecision?.judgement),
    streaming,
  });
  const progress = Math.round((journey.filter((item) => item.status === "completed").length / journey.length) * 100);
  const currentStepId = journey.find((step) => step.status === "current")?.id;
  const currentStepLabel = journey.find((step) => step.status === "current")?.label || "进行中";
  const advisor = buildAdvisorMessage({
    snapshot: displaySnapshot,
    streaming,
    hasCommittee: committee.length > 0,
    hasScenarios: scenarios.length > 0,
  });
  const expertMemos = buildExpertMemos(committee, displaySnapshot);
  const equityProtocolProjection = buildEquityProtocolProjection({
    project: {
      name: project.name,
      category: project.category,
      stage: project.stage,
    },
    snapshot: displaySnapshot,
    pageOutput,
    previous: previousSnapshot,
    intake: {
      plan: equityIntake.plan,
      concern: equityIntake.concern,
      goal: equityIntake.goal,
    },
    scenarios,
    history: (historyQuery.data || []).map((item) => ({
      judgement: item.judgement,
      problem: item.problem,
      createdAt: item.createdAt,
    })),
    reports: (reportsQuery.data || []).map((item) => ({
      title: item.title,
      summary: item.summary,
    })),
    committee,
  });
  const {
    founderContextView,
    equityContextView,
    decisionProtocolView,
    memoryView,
    equityLedger,
  } = equityProtocolProjection;
  const board = getDepartmentBoard("org");
  const experts = getDepartmentExperts("org");
  const issue = displaySnapshot?.oneLiner || pageOutput?.topic || "当前组织与股权判断";
  const meetingHref = getDepartmentMeetingHref(project.id, "org", issue);
  const judgement =
    streamText || finalDecision?.judgement || displaySnapshot?.oneLiner || board.subtitle;

  return (
    <div className="space-y-5 pb-2">
      <DepartmentBoardShell
        board={board}
        projectId={project.id}
        meetingHref={meetingHref}
        issue={issue}
        judgement={judgement}
        experts={experts}
        siblingLinks={[
          { href: `/projects/${project.id}/positioning`, label: "品牌定位部" },
          { href: `/projects/${project.id}/market`, label: "市场研究部" },
          { href: `/projects/${project.id}/business`, label: "商业战略部" },
        ]}
      />

      <CollapsibleBoardSection
        eyebrow="工作台"
        title="治理诊断与旅程"
        summary={`当前：${currentStepLabel} · 推进 ${progress}% · 正式判断请用上方开会`}
        defaultOpen={!displaySnapshot || currentStepId === "interview"}
      >
      <div className="space-y-4">
        <WorkspaceJourneyRail
          eyebrow="治理旅程"
          title="治理旅程"
          progress={progress}
          summary="这不是股权问答，而是一轮完整的治理决策咨询。"
          steps={journey}
          palette={{
            border: "border-[rgba(24,24,23,0.08)]",
            title: "text-[#202124]",
            eyebrow: "text-[#66735E]",
            cardBg: "bg-white",
            progressBg: "bg-[linear-gradient(180deg,#F8F7F3_0%,#EEF1EA_100%)]",
            progressTitle: "text-[#66735E]",
            progressValue: "text-[#202124]",
            progressText: "text-[#5f655d]",
            completedTone: "border-[#66735E] bg-[#66735E] text-white",
            currentTone: "border-[#B47C5C] bg-[rgba(180,124,92,0.12)] text-[#9A5B35]",
            upcomingTone: "border-[rgba(102,115,94,0.12)] bg-white text-[#A0A5B0]",
            note: "text-[#6f747b]",
          }}
        />

        <ChiefAdvisorPanel
          title={advisor.title}
          summary={advisor.summary}
          learned={advisor.learned}
          missing={advisor.missing}
          nextStep={advisor.nextStep}
          palette={{
            border: "border-[rgba(24,24,23,0.08)]",
            title: "text-[#202124]",
            eyebrow: "text-[#66735E]",
            chipBg: "bg-[rgba(102,115,94,0.10)]",
            chipText: "text-[#66735E]",
            body: "text-[#5f655d]",
            softBg: "bg-[#F8F7F3]",
            nextBorder: "border-[rgba(24,24,23,0.08)]",
            nextBg: "bg-[linear-gradient(180deg,#FFFFFF_0%,#F8F7F3_100%)]",
            note: "text-[#66735E]",
          }}
        />
      <section className="rounded-[16px] bg-[#FBFAF7] p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[12px] tracking-[0.08em] text-[#66735E]">顾问访谈</p>
                <h2 className="mt-1 text-[20px] leading-[1.2] tracking-[-0.03em] text-[#202124]">补充股权事实</h2>
                <p className="mt-2 max-w-2xl text-[14px] leading-[1.8] text-[#5f655d]">
                  先说清当前结构、本轮动作、最怕什么、最后想守住什么。
                </p>
              </div>
              <div className="inline-flex items-center rounded-full bg-[rgba(102,115,94,0.10)] px-3 py-1 text-[12px] text-[#66735E]">
                当前阶段：{journey.find((step) => step.status === "current")?.label || "治理决策"}
              </div>
            </div>

            <div className="mt-5 space-y-4">
              <ModuleIntakeCard
                title="最小必要股权信息"
                description="先写清当前结构、准备动什么、最担心什么、想守住什么。"
                fields={[
                  {
                    id: "capTable",
                    label: "当前股东/结构",
                    placeholder: "例如：创始人 70%，合伙人 20%，激励池 10%。",
                    value: equityIntake.capTable,
                    onChange: (value) => updateEquityIntake("capTable", value),
                  },
                  {
                    id: "plan",
                    label: "本轮动作",
                    placeholder: "例如：准备融资、新增合伙人、预留店长激励池。",
                    value: equityIntake.plan,
                    onChange: (value) => updateEquityIntake("plan", value),
                  },
                  {
                    id: "concern",
                    label: "最大担心",
                    placeholder: "例如：控制权稀释、后续融资卡死、激励不够。",
                    value: equityIntake.concern,
                    onChange: (value) => updateEquityIntake("concern", value),
                  },
                  {
                    id: "goal",
                    label: "想达成的目标",
                    placeholder: "例如：保住控制权、留出激励空间、方便下一轮融资。",
                    value: equityIntake.goal,
                    onChange: (value) => updateEquityIntake("goal", value),
                  },
                ]}
                recordingFieldId={speechInput.activeFieldId}
                speechSupported={speechInput.speechSupported}
                speechError={speechInput.speechError}
                onToggleVoiceField={(field) =>
                  void speechInput.toggleFieldRecording(field.id, field.value, field.onChange)
                }
                onApply={applyEquityIntake}
                applyLabel="写入股权诊断"
              />

              <div className="space-y-4">
                <div className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-[linear-gradient(180deg,#FFFFFF_0%,#F8F7F3_100%)] p-4">
                  <p className="text-[12px] tracking-[0.08em] text-[#66735E]">为什么先问这些</p>
                  <div className="mt-3 space-y-2 text-[14px] leading-7 text-[#202124]">
                    <p>本轮动作决定该匹配哪种治理场景。</p>
                    <p>最大担心决定风险判断的优先级。</p>
                    <p>你想守住什么，决定方案到底偏控制、激励还是融资。</p>
                  </div>
                </div>

                <div className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-4">
                  <p className="text-[12px] tracking-[0.08em] text-[#66735E]">向 AI 股权顾问发起判断</p>
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    rows={4}
                    className="mt-3 min-h-[128px] w-full resize-none rounded-[18px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-4 py-4 text-[15px] leading-[1.8] text-[#202124] outline-none placeholder:text-[#8A8FA0]"
                    placeholder="描述当前股权问题，例如：我准备引入两位合伙人并预留店长激励池，怎么设计更稳？"
                  />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      {speechInput.speechSupported ? (
                        <button
                          type="button"
                          disabled={streaming}
                          onClick={() => void speechInput.toggleFieldRecording("equity_input", input, setInput)}
                          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition active:scale-[0.98] ${
                            speechInput.activeFieldId === "equity_input"
                              ? "bg-[#202124] text-white"
                              : "border border-[rgba(24,24,23,0.08)] bg-[#F5F3EE] text-[#202124]"
                          }`}
                          aria-label={speechInput.activeFieldId === "equity_input" ? "停止语音输入" : "开始语音输入"}
                        >
                          {speechInput.activeFieldId === "equity_input" ? (
                            <Square className="h-4 w-4" />
                          ) : (
                            <Mic className="h-4 w-4" />
                          )}
                        </button>
                      ) : null}
                      <p className="text-[12px] leading-5 text-[#6f747b]">
                        {streaming
                          ? "股权工作台执行中..."
                          : speechInput.activeFieldId === "equity_input"
                            ? "正在语音转文字..."
                            : "先跑一轮主判断，再继续做场景模拟。"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void runEquity()}
                      disabled={streaming}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#202124] px-5 py-2 text-[13px] font-medium text-white disabled:opacity-50"
                    >
                      {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                      开始治理扫描
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
      </div>
      </CollapsibleBoardSection>

      <CollapsibleBoardSection
        eyebrow="分析过程"
        title="治理扫描与结构"
        summary={displaySnapshot ? "已有扫描结果，可展开查看" : "访谈后在此查看治理扫描"}
        defaultOpen={streaming || currentStepId === "scan"}
      >
          <div className="space-y-4">
            <div className="rounded-[24px] border border-[rgba(24,24,23,0.08)] bg-white p-5 shadow-[0_18px_34px_rgba(24,24,23,0.05)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[12px] tracking-[0.08em] text-[#66735E]">扫描结果</p>
                  <h2 className="mt-1 text-[20px] leading-[1.2] tracking-[-0.03em] text-[#202124]">治理扫描</h2>
                </div>
                <Users2 className="h-5 w-5 text-[#66735E]" />
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <MetricCard label="股权健康度" value={health?.score ?? "待生成"} tone="strong" />
                <MetricCard label="控制权" value={health?.control ?? "待生成"} />
                <MetricCard label="融资安全" value={health?.fundingSafety ?? "待生成"} tone="warm" />
                <MetricCard label="激励空间" value={health?.incentiveRoom ?? "待生成"} />
              </div>
              {health?.biggestRisk ? (
                <div className="mt-4 rounded-[18px] bg-[rgba(180,124,92,0.10)] p-4">
                  <p className="text-[12px] tracking-[0.08em] text-[#B47C5C]">当前最大风险</p>
                  <p className="mt-2 text-[14px] leading-[1.8] text-[#202124]">{health.biggestRisk}</p>
                </div>
              ) : null}
              {streamText ? (
                <div className="mt-4 rounded-[18px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] p-4">
                  <p className="text-[12px] tracking-[0.08em] text-[#66735E]">AI 推演过程</p>
                  <pre className="mt-3 whitespace-pre-wrap font-sans text-[13px] leading-6 text-[#202124]">{streamText}</pre>
                </div>
              ) : null}
            </div>

            <div className="rounded-[24px] border border-[rgba(24,24,23,0.08)] bg-white p-5 shadow-[0_18px_34px_rgba(24,24,23,0.05)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[12px] tracking-[0.08em] text-[#66735E]">结构画像</p>
                  <h2 className="mt-1 text-[24px] leading-[1.2] tracking-[-0.03em] text-[#202124]">结构画像</h2>
                </div>
                <ShieldAlert className="h-5 w-5 text-[#66735E]" />
              </div>
              <div className="mt-5 space-y-3">
                {founders.length > 0 ? (
                  founders.map((founder) => (
                    <div key={`${founder.name}-${founder.role}`} className="rounded-[18px] bg-[#F8F7F3] px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[15px] font-medium text-[#202124]">{founder.name}</p>
                          <p className="mt-1 text-[13px] text-[#66735E]">{founder.role}</p>
                          {founder.responsibility ? (
                            <p className="mt-1 text-[13px] leading-6 text-[#6f747b]">{founder.responsibility}</p>
                          ) : null}
                        </div>
                        <div className="rounded-full bg-white px-3 py-1 text-[13px] text-[#202124]">{founder.equity}%</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[18px] bg-[#F8F7F3] p-4 text-[14px] leading-[1.8] text-[#5f655d]">
                    还没有形成结构画像。先跑一次治理扫描。
                  </div>
                )}
                {capTable.length > 0 ? (
                  <div className="rounded-[18px] border border-[rgba(24,24,23,0.08)] bg-white p-4">
                    <p className="text-[12px] tracking-[0.08em] text-[#66735E]">当前结构</p>
                    <div className="mt-3 space-y-2">
                      {capTable.map((item) => (
                        <div key={item.label} className="flex items-center justify-between gap-3 text-[14px]">
                          <span className="text-[#202124]">{item.label}</span>
                          <span className="text-[#6f747b]">{item.equity}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
      </CollapsibleBoardSection>

      <CollapsibleBoardSection
        eyebrow="创始人智能层"
            title="股权认知协议"
            summary="把身份、治理、决策与记忆整理成可展开的工作台结构。"
            defaultOpen={false}
          >
            <div className="mb-4 flex justify-end">
              <div className="rounded-full bg-[rgba(102,115,94,0.10)] px-3 py-2 text-[12px] font-medium text-[#66735E]">
                当前任务：{displaySnapshot ? "治理任务已启动" : "等待启动"}
              </div>
            </div>

            <div className="space-y-4">
              <section className="rounded-[20px] border border-[rgba(24,24,23,0.08)] bg-white p-4">
                <p className="text-[12px] tracking-[0.08em] text-[#66735E]">身份层</p>
                <h3 className="mt-1 text-[18px] font-medium tracking-[-0.02em] text-[#202124]">创始人语境</h3>
                <div className="mt-4 space-y-3">
                  {[
                    { label: "身份", value: founderContextView.identity },
                    { label: "业务背景", value: founderContextView.background },
                    { label: "当前目标", value: founderContextView.goal },
                    { label: "风险偏好", value: `${founderContextView.riskLabel} · ${founderContextView.riskNote}` },
                    { label: "决策方式", value: founderContextView.decisionStyle },
                  ].map((item) => (
                    <div key={item.label} className="rounded-[16px] bg-[#F8F7F3] px-3 py-3">
                      <p className="text-[12px] tracking-[0.08em] text-[#66735E]">{item.label}</p>
                      <p className="mt-2 text-[13px] leading-6 text-[#202124]">{item.value}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[20px] border border-[rgba(24,24,23,0.08)] bg-white p-4">
                <p className="text-[12px] tracking-[0.08em] text-[#66735E]">治理层</p>
                <h3 className="mt-1 text-[18px] font-medium tracking-[-0.02em] text-[#202124]">股权语境</h3>
                <div className="mt-4 space-y-3">
                  {equityContextView.map((item) => (
                    <div key={item.label} className="rounded-[16px] bg-[#F8F7F3] px-3 py-3">
                      <p className="text-[12px] tracking-[0.08em] text-[#66735E]">{item.label}</p>
                      <p className="mt-2 text-[13px] leading-6 text-[#202124]">{item.value}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-[20px] border border-[rgba(24,24,23,0.08)] bg-white p-4">
                <p className="text-[12px] tracking-[0.08em] text-[#66735E]">决策层</p>
                <h3 className="mt-1 text-[18px] font-medium tracking-[-0.02em] text-[#202124]">决策协议</h3>
                <div className="mt-4 space-y-3">
                  <div className="rounded-[16px] bg-[#F8F7F3] px-3 py-3">
                    <p className="text-[12px] tracking-[0.08em] text-[#66735E]">问题</p>
                    <p className="mt-2 text-[13px] leading-6 text-[#202124]">{decisionProtocolView.problem}</p>
                  </div>
                  <div className="rounded-[16px] bg-[#F8F7F3] px-3 py-3">
                    <p className="text-[12px] tracking-[0.08em] text-[#66735E]">选择</p>
                    <p className="mt-2 text-[13px] leading-6 text-[#202124]">{decisionProtocolView.choice}</p>
                  </div>
                  <div className="rounded-[16px] bg-[#F8F7F3] px-3 py-3">
                    <p className="text-[12px] tracking-[0.08em] text-[#66735E]">理由</p>
                    <div className="mt-2 space-y-2">
                      {decisionProtocolView.reasoning.length > 0 ? (
                        decisionProtocolView.reasoning.map((item) => (
                          <p key={item} className="text-[13px] leading-6 text-[#202124]">
                            {item}
                          </p>
                        ))
                      ) : (
                        <p className="text-[13px] leading-6 text-[#5f655d]">等待形成结构化治理判断。</p>
                      )}
                    </div>
                  </div>
                  <div className="rounded-[16px] bg-[#F8F7F3] px-3 py-3">
                    <p className="text-[12px] tracking-[0.08em] text-[#66735E]">取舍</p>
                    <p className="mt-2 text-[13px] leading-6 text-[#202124]">{decisionProtocolView.tradeoff}</p>
                  </div>
                </div>
              </section>

              <section className="rounded-[20px] border border-[rgba(24,24,23,0.08)] bg-white p-4">
                <p className="text-[12px] tracking-[0.08em] text-[#66735E]">记忆层</p>
                <h3 className="mt-1 text-[18px] font-medium tracking-[-0.02em] text-[#202124]">记忆更新</h3>
                <div className="mt-4 space-y-3">
                  <div className="rounded-[16px] bg-[#F8F7F3] px-3 py-3">
                    <p className="text-[12px] tracking-[0.08em] text-[#66735E]">创始人记忆</p>
                    <div className="mt-2 space-y-2">
                      {memoryView.founderMemory.map((item) => (
                        <p key={item} className="text-[13px] leading-6 text-[#202124]">
                          {item}
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-[16px] bg-[#F8F7F3] px-3 py-3">
                    <p className="text-[12px] tracking-[0.08em] text-[#66735E]">治理记忆</p>
                    <div className="mt-2 space-y-2">
                      {memoryView.governanceMemory.length > 0 ? (
                        memoryView.governanceMemory.map((item) => (
                          <p key={item} className="text-[13px] leading-6 text-[#202124]">
                            {item}
                          </p>
                        ))
                      ) : (
                        <p className="text-[13px] leading-6 text-[#5f655d]">治理历史还在积累中。</p>
                      )}
                    </div>
                  </div>
                  <div className="rounded-[16px] bg-[#F8F7F3] px-3 py-3">
                    <p className="text-[12px] tracking-[0.08em] text-[#66735E]">决策记忆</p>
                    <div className="mt-2 space-y-2">
                      {memoryView.decisionMemory.length > 0 ? (
                        memoryView.decisionMemory.map((item) => (
                          <p key={item} className="text-[13px] leading-6 text-[#202124]">
                            {item}
                          </p>
                        ))
                      ) : (
                        <p className="text-[13px] leading-6 text-[#5f655d]">等待当前治理建议进入正式决策记录。</p>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>
      </CollapsibleBoardSection>

      <CollapsibleBoardSection
        eyebrow="账本"
            title="治理事实账本"
            summary="结构、方案与观点拆解"
            defaultOpen={false}
          >
              <div className="space-y-3">
                {equityLedger.length > 0 ? (
                  equityLedger.map((item) => (
                    <div key={item.id} className="rounded-[18px] bg-[#F8F7F3] px-4 py-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-medium tracking-[0.08em] text-[#66735E]">
                          {item.kind === "FACT"
                            ? "事实"
                            : item.kind === "ASSUMPTION"
                              ? "假设"
                              : item.kind === "HYPOTHESIS"
                                ? "假说"
                                : item.kind}
                        </div>
                        <div className="text-[12px] text-[#6f747b]">{item.note}</div>
                      </div>
                      <p className="mt-3 text-[12px] tracking-[0.08em] text-[#66735E]">{item.title}</p>
                      <p className="mt-2 text-[14px] leading-7 text-[#202124]">{item.statement}</p>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[18px] bg-[#F8F7F3] px-4 py-4 text-[14px] leading-7 text-[#5f655d]">
                    还没有结构化治理账本。先完成一次股权扫描，系统会把当前结构、方案推演和专家观点拆成可追踪的协议对象。
                  </div>
                )}
              </div>
            </CollapsibleBoardSection>

          <CollapsibleBoardSection
            eyebrow="顾问协议"
            title="治理协议流"
            summary="上下文 → 决策 → 验证 → 记忆"
            defaultOpen={false}
            tone="dark"
          >
              <div className="space-y-3">
                {[
                  {
                    title: "01 · 顾问上下文",
                    body: `${founderContextView.identity} / ${equityContextView[1]?.value || "治理议题待补全"}`,
                  },
                  {
                    title: "02 · 决策协议",
                    body: decisionProtocolView.choice,
                  },
                  {
                    title: "03 · 验证",
                    body: decisionProtocolView.validation,
                  },
                  {
                    title: "04 · 记忆更新",
                    body: memoryView.decisionMemory[0] || "当前治理决策尚未写入长期记忆。",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-[18px] border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.06)] px-4 py-4"
                  >
                    <p className="text-[12px] tracking-[0.08em] text-white/70">{item.title}</p>
                    <p className="mt-2 text-[14px] leading-7 text-white">{item.body}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-[18px] bg-white/8 px-4 py-4">
                <div className="flex items-center gap-2 text-white/72">
                  <FileText className="h-4 w-4" />
                  <p className="text-[12px] tracking-[0.08em]">协议说明</p>
                </div>
                <p className="mt-2 text-[13px] leading-6 text-white/84">
                  {stripAgentProductNames(
                    "这样 M-ED 的治理判断就能被 M-BIZ、M-PNT、M-MKT 读懂：这位创始人在什么边界下做了什么股权选择，代价是什么，下一步怎么验证。",
                  )}
                </p>
              </div>
            </CollapsibleBoardSection>

          <CollapsibleBoardSection
            eyebrow="模拟"
            title="股权方案工作台"
            summary="参数推演与方案对照"
            defaultOpen={false}
          >
          <section className="rounded-[24px] border border-[rgba(24,24,23,0.08)] bg-white p-5 shadow-[0_18px_34px_rgba(24,24,23,0.05)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[12px] tracking-[0.08em] text-[#66735E]">方案模拟</p>
                <h2 className="mt-1 text-[24px] leading-[1.2] tracking-[-0.03em] text-[#202124]">股权方案工作台</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  const prompt = buildSimulationPrompt();
                  setInput(prompt);
                  void runEquityWithPrompt(prompt);
                }}
                disabled={streaming}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-[rgba(24,24,23,0.08)] bg-white px-4 py-2 text-[13px] font-medium text-[#202124] disabled:opacity-50"
              >
                <GitBranch className="h-4 w-4" />
                按参数重算
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
              <label className="space-y-2">
                <span className="text-[12px] leading-5 tracking-[0.01em] text-[#66735E]">模拟类型</span>
                <select
                  value={simulationMode}
                  onChange={(e) => setSimulationMode(e.target.value as "baseline" | "funding" | "partner" | "option_pool")}
                  className="h-10 w-full rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[13px] text-[#202124] outline-none"
                >
                  <option value="baseline">完整扫描</option>
                  <option value="funding">融资模拟</option>
                  <option value="partner">新增合伙人</option>
                  <option value="option_pool">期权池调整</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-[12px] leading-5 tracking-[0.01em] text-[#66735E]">融资额（万）</span>
                <input
                  type="number"
                  min={0}
                  step={50}
                  value={fundingAmountWan}
                  onChange={(e) => setFundingAmountWan(Number(e.target.value || 0))}
                  className="h-10 w-full rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[13px] text-[#202124] outline-none"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[12px] leading-5 tracking-[0.01em] text-[#66735E]">期权池目标</span>
                <input
                  type="number"
                  min={0}
                  max={30}
                  step={1}
                  value={optionPoolTarget}
                  onChange={(e) => setOptionPoolTarget(Number(e.target.value || 0))}
                  className="h-10 w-full rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[13px] text-[#202124] outline-none"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[12px] leading-5 tracking-[0.01em] text-[#66735E]">新增合伙人</span>
                <input
                  type="number"
                  min={0}
                  max={5}
                  step={1}
                  value={newPartnerCount}
                  onChange={(e) => setNewPartnerCount(Number(e.target.value || 0))}
                  className="h-10 w-full rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[13px] text-[#202124] outline-none"
                />
              </label>
            </div>

            <div className="mt-5 space-y-4">
              {scenarios.length > 0 ? (
                scenarios.map((scenario) => (
                  <EquityScenarioCard
                    key={scenario.id}
                    scenario={scenario}
                    active={focusedScenario?.id === scenario.id}
                    onSelect={() => setFocusedScenarioId(scenario.id)}
                  />
                ))
              ) : (
                <div className="rounded-[22px] border border-dashed border-[rgba(24,24,23,0.16)] bg-[#FCFCFA] p-6 text-[14px] leading-[1.8] text-[#5f655d] xl:col-span-2">
                  还没有形成方案模拟。先发起治理扫描，让 AI 形成可对照的股权方案。
                </div>
              )}
            </div>

            {focusedScenario && compareScenario ? (
              <div className="mt-4 rounded-[20px] border border-[rgba(24,24,23,0.08)] bg-[linear-gradient(180deg,#FFFFFF_0%,#F8F7F3_100%)] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[12px] tracking-[0.08em] text-[#66735E]">双方案对照</p>
                  {scenarios
                    .filter((item) => item.id !== focusedScenario.id)
                    .map((scenario) => {
                      const active = compareScenario.id === scenario.id;
                      return (
                        <button
                          key={`compare-${scenario.id}`}
                          type="button"
                          onClick={() => setCompareScenarioId(scenario.id)}
                          className={`rounded-full px-3 py-1.5 text-[12px] transition ${
                            active
                              ? "bg-[#66735E] text-white"
                              : "border border-[rgba(24,24,23,0.08)] bg-white text-[#202124]"
                          }`}
                        >
                          {scenario.title}
                        </button>
                      );
                    })}
                </div>
                <div className="mt-4 space-y-3">
                  {[focusedScenario, compareScenario].map((scenario, index) => (
                    <div
                      key={`board-${scenario.id}`}
                      className={`rounded-[16px] border p-4 ${
                        index === 0
                          ? "border-[rgba(102,115,94,0.24)] bg-[rgba(102,115,94,0.08)]"
                          : "border-[rgba(24,24,23,0.08)] bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[15px] font-semibold text-[#202124]">{scenario.title}</p>
                          <p className="mt-1 text-[13px] leading-6 text-[#5f655d]">{scenario.summary}</p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 text-[12px] text-[#202124]">
                          {index === 0 ? "主看" : "对照"}
                        </span>
                      </div>
                      {scenario.capTable ? (
                        <div className="mt-3 space-y-3">
                          <CapTableCompare title="当前结构" items={scenario.capTable.before} />
                          <CapTableCompare
                            title="方案后结构"
                            items={scenario.capTable.after}
                            reference={scenario.capTable.before}
                          />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
          </CollapsibleBoardSection>

          <CollapsibleBoardSection
            eyebrow="结果"
            title="治理会议与判断"
            summary="专家会议、最终判断与档案；正式决策请用上方开会。"
            defaultOpen={false}
          >
          <WorkspaceMeetingPanel
            eyebrow="治理会议"
            title="治理专家会议"
            items={expertMemos.map((memo) => ({
              title: `${memo.role} · ${memo.focus}`,
              body: memo.opinion,
              toneNote: `关注：${memo.concern}`,
            }))}
            summary={finalDecision?.judgement || displaySnapshot?.oneLiner || "等待治理共识形成。"}
            conflict={
              finalDecision?.risks[0] ||
              health?.biggestRisk ||
              "当前正在平衡控制权、激励空间和融资安全。"
            }
            palette={{
              border: "border-[rgba(24,24,23,0.08)]",
              background: "bg-[linear-gradient(180deg,#FFFFFF_0%,#F8F7F3_100%)]",
              eyebrow: "text-[#66735E]",
              title: "text-[#202124]",
              itemBorder: "border-[rgba(24,24,23,0.08)]",
              itemBg: "bg-white",
              itemBody: "text-[#202124]",
              itemToneBg: "bg-[rgba(180,124,92,0.08)]",
              itemToneText: "text-[#B47C5C]",
              summaryBg: "bg-[#202124]",
              summaryText: "text-white",
              summaryLabel: "text-white/70",
              summaryNoteBg: "bg-white/10",
              summaryNoteText: "text-white/88",
            }}
          />

          {displaySnapshot ? (
            <WorkspaceDecisionPanel
              eyebrow="最终股权判断"
              title={finalDecision?.judgement || displaySnapshot.oneLiner}
              badge="治理建议已形成"
              summaryTitle="一句话判断"
              summaryBody={displaySnapshot.oneLiner}
              leftCards={[
                {
                  title: "优先动作",
                  body: (
                    <ul className="space-y-2">
                      {(finalDecision?.actions || []).slice(0, 3).map((item: string) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  ),
                },
                {
                  title: "不要忽略",
                  body: (
                    <ul className="space-y-2">
                      {(finalDecision?.risks || []).slice(0, 3).map((item: string) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                  ),
                  tone: "warning",
                },
              ]}
              reasonsTitle="关键理由"
              reasons={(finalDecision?.reasoning || []).slice(0, 4)}
              rightTitle="执行动作"
              rightHeading="把这轮判断写进治理档案"
              rightBody="下一步不是继续聊天，而是把本轮判断写入决策档案，并带着它进入会议或后续经营决策。"
              palette={{
                border: "border-[rgba(24,24,23,0.08)]",
                background: "bg-white",
                eyebrow: "text-[#66735E]",
                title: "text-[#202124]",
                badgeBg: "bg-[rgba(102,115,94,0.10)]",
                badgeText: "text-[#66735E]",
                summaryBg: "bg-[linear-gradient(180deg,#F8F7F3_0%,#EEF1EA_100%)]",
                summaryEyebrow: "text-[#66735E]",
                summaryText: "text-[#202124]",
                cardBorder: "border-[rgba(24,24,23,0.08)]",
                cardBg: "bg-white",
                cardEyebrow: "text-[#66735E]",
                cardText: "text-[#202124]",
                warningText: "text-[#B47C5C]",
                reasonItemBg: "bg-white/10",
                rightBg: "bg-[#202124]",
                rightEyebrow: "text-white/70",
                rightText: "text-white",
                rightBodyText: "text-white/82",
              }}
            />
          ) : null}

          <CollapsibleBoardSection
            eyebrow="历史"
            title="决策档案与报告"
            summary={
              (historyQuery.data || [])[0]?.judgement ||
              (reportsQuery.data || [])[0]?.title ||
              "仅保留最近判断摘要，详情可展开查看"
            }
            defaultOpen={false}
          >
          <div className="space-y-4">
            <WorkspaceArchivePanel
              eyebrow="决策档案"
              title="历史版本"
              emptyText="还没有股权决策历史。"
              items={(historyQuery.data || []).map((item) => ({
                id: item.id,
                title: item.problem,
                summary: item.judgement,
              }))}
              palette={{
                border: "border-[rgba(24,24,23,0.08)]",
                background: "bg-white",
                eyebrow: "text-[#66735E]",
                title: "text-[#202124]",
                itemBg: "bg-[#F8F7F3]",
                itemTitle: "text-[#202124]",
                itemBody: "text-[#5f655d]",
                emptyBg: "bg-[#F8F7F3]",
                emptyText: "text-[#5f655d]",
              }}
            />

            <WorkspaceArchivePanel
              eyebrow="资产快照"
              title="报告沉淀"
              emptyText="还没有股权报告。"
              items={(reportsQuery.data || []).map((item) => ({
                id: item.id,
                title: item.title,
                summary: item.summary || "已沉淀到报告档案",
              }))}
              palette={{
                border: "border-[rgba(24,24,23,0.08)]",
                background: "bg-white",
                eyebrow: "text-[#66735E]",
                title: "text-[#202124]",
                itemBg: "bg-[#F8F7F3]",
                itemTitle: "text-[#202124]",
                itemBody: "text-[#5f655d]",
                emptyBg: "bg-[#F8F7F3]",
                emptyText: "text-[#5f655d]",
              }}
            />
          </div>
          </CollapsibleBoardSection>

          <EquityFeedbackCard decisionId={displaySnapshot?.decisionId} projectId={projectId} />

          {previousSnapshot ? (
            <section className="rounded-[20px] border border-[rgba(24,24,23,0.06)] bg-white p-4">
              <p className="text-[13px] leading-5 tracking-[0.01em] text-[#66735E]">上一版判断</p>
              <p className="mt-1 text-[15px] leading-[1.75] text-[#202124]">{previousSnapshot.oneLiner}</p>
              <p className="mt-2 text-[13px] leading-6 text-[#6f747b]">
                上一版风险：{previousSnapshot.pageOutput.health.biggestRisk}
              </p>
            </section>
          ) : null}

          {error ? <p className="text-[13px] text-[#B47C5C]">执行失败：{error}</p> : null}
      </CollapsibleBoardSection>

      {runtimeMeta ? (
        <CollapsibleBoardSection
          eyebrow="系统"
          title="运行信息"
          summary="本轮顾问接入与提供方"
          defaultOpen={false}
        >
          <div className="space-y-2 text-[13px] leading-6 text-[#202124]">
            <div className="rounded-[16px] bg-[#F8F7F3] px-3 py-3">
              {stripAgentProductNames(runtimeMeta.agentName || "m-ed")}
            </div>
            <div className="rounded-[16px] bg-[#F8F7F3] px-3 py-3">{runtimeMeta.provider}</div>
          </div>
        </CollapsibleBoardSection>
      ) : null}

      <CollapsibleBoardSection
        eyebrow="追问"
        title="快捷追问"
        summary="常见治理问题一键写入输入区"
        defaultOpen={false}
      >
        <div className="space-y-2">
          {[
            "请先做一次完整股权健康扫描",
            "如果我要引入合伙人，应该怎么分配？",
            "模拟下一轮融资后控制权变化",
            "这轮应该先保控制权还是先给激励池？",
            challengePrompt,
          ].map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => setInput(prompt)}
              className="w-full rounded-[16px] border border-[rgba(24,24,23,0.08)] bg-[#F8F7F3] px-3 py-3 text-left text-[13px] leading-6 text-[#202124]"
            >
              {prompt}
            </button>
          ))}
        </div>
      </CollapsibleBoardSection>

      <div ref={endRef} />
    </div>
  );
}
