"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Check, MessageSquare, Pencil, Plus } from "lucide-react";
import type {
  ConsensusDraft,
  DecisionCard,
  ExpertSeat,
  ExpertStatement,
  MeetingConflict,
  MeetingLifecycle,
} from "@/lib/meeting";
import { lifecycleLabel } from "@/lib/meeting";
import type { DecisionOption, DeliberationRound } from "@/lib/meeting-deliberation";
import type { GrowthPlan } from "@/lib/onboarding-interview";
import { DecisionClosedActions } from "@/components/operating/DecisionLoopRail";

type ValidationTaskPreview = {
  id: string;
  title: string;
  objective: string;
  owner: string;
  horizonDays: number;
  metrics: Array<{ id: string; label: string; target?: string | number }>;
  status?: string;
};

type DecisionContractPreview = {
  decisionId: string;
  intent: string;
  intentLabel: string;
  decision: string;
  status: string;
  statusLabel: string;
  confidence: number;
  gateReason: string;
  tensions: Array<{
    topic: string;
    supporters: string[];
    opponents: string[];
    criticalEvidence: string[];
  }>;
  committeeViews: Array<{
    committee: string;
    committeeLabel: string;
    position: string;
    reason: string;
  }>;
  validationPlan: {
    goal: string;
    hypothesis: string;
    metrics: string[];
    period: string;
    successCriteria: string;
    killCriteria?: string;
  };
  claimRefs: string[];
  memo?: {
    title: string;
    decision: string;
    whyNow: string;
    tradeoffs: string[];
    conditions: string[];
    validation: string;
    killCriteria: string;
    stopLine: string;
    evidenceIds: string[];
  };
};

type DebateSessionPreview = {
  conflicts: Array<{
    topic: string;
    severity: string;
    summary: string;
    committees: string[];
  }>;
  challenges: Array<{
    challengeType: string;
    challengeTypeLabel: string;
    fromCommitteeLabel: string;
    targetCommitteeLabel: string;
    statement: string;
  }>;
  proposal?: {
    decision: string;
    whyNow: string;
    tradeoffs: string[];
    conditions: string[];
    risksAccepted: string[];
    validationPlan: string;
  };
  scenarioTests: Array<{
    scenario: string;
    trigger: string;
    impact: string;
    mitigation: string;
  }>;
};

const COMMITTEE_DISPLAY: Record<string, string> = {
  market: "市场",
  brand: "品牌",
  business: "商业",
  capital: "组织",
};

const INVITE_ADVISORS = [
  { name: "市场", duty: "机会与需求" },
  { name: "品牌", duty: "定位与差异" },
  { name: "商业", duty: "赚钱与复制" },
  { name: "组织", duty: "股权与控制权" },
];

type MeetingRoomProps = {
  projectId: string;
  title: string;
  topic: string;
  lifecycle: MeetingLifecycle;
  preparing?: boolean;
  knownFacts: string[];
  /** 已验证店访一手事实条数；>0 时会前提示「店访证据已带入」 */
  storeVisitFactCount?: number;
  unknownGaps: string[];
  experts: ExpertSeat[];
  statements: ExpertStatement[];
  conflict: MeetingConflict | null;
  conflictMatrix?: {
    rows: Array<{
      topic: string;
      cells: Record<string, string>;
      summary?: string;
    }>;
    primary?: {
      topic: string;
      question?: string;
      sideA: { agents: string[]; claim: string };
      sideB: { agents: string[]; claim: string };
      drivingEvidenceIds?: string[];
    } | null;
    tradeoffs?: Array<{ keep: string; giveUp: string; why: string }>;
  } | null;
  debateSession?: DebateSessionPreview | null;
  consensus: ConsensusDraft | null;
  decisionCard: DecisionCard | null;
  options?: DecisionOption[];
  selectedOptionId?: string | null;
  onSelectOption?: (optionId: string) => void;
  topicConfirmed: boolean;
  focusChoice: string | null;
  deliberationRound: DeliberationRound | 0;
  deliberating?: boolean;
  onConfirmTopic: () => void;
  onEditTopic: () => void;
  onChooseFocus: (value: string) => void;
  onAdvanceRound: () => void;
  onSupplementFact?: (fact: string) => void;
  onAccept: () => void;
  onContinueDiscuss: () => void;
  onModify: () => void;
  accepting?: boolean;
  acceptedDecisionId?: string | null;
  growthPlan?: GrowthPlan | null;
  validationTask?: ValidationTaskPreview | null;
  decisionContract?: DecisionContractPreview | null;
  showTranscript?: boolean;
  onToggleTranscript?: () => void;
  transcriptSlot?: ReactNode;
};

const FOCUS_OPTIONS = [
  { id: "growth", label: "快速增长" },
  { id: "profit", label: "稳健盈利" },
  { id: "brand", label: "品牌长期价值" },
];

function roundLabel(round: number): string {
  if (round === 1) return "第 1 轮 · 独立判断";
  if (round === 2) return "第 2 轮 · 压力测试";
  if (round === 3) return "第 3 轮 · 决策提案";
  return "等待开始";
}

function advanceLabel(round: DeliberationRound | 0): string {
  if (round === 0) return "开始独立判断";
  if (round === 1) return "继续推演";
  if (round === 2) return "解决冲突";
  return "提案已形成";
}

export function MeetingRoom({
  projectId,
  title,
  topic,
  lifecycle,
  preparing,
  knownFacts,
  storeVisitFactCount = 0,
  unknownGaps,
  experts,
  statements,
  conflict,
  conflictMatrix,
  debateSession,
  consensus,
  decisionCard,
  options = [],
  selectedOptionId,
  onSelectOption,
  topicConfirmed,
  focusChoice,
  deliberationRound,
  deliberating,
  onConfirmTopic,
  onEditTopic,
  onChooseFocus,
  onAdvanceRound,
  onSupplementFact,
  onAccept,
  onContinueDiscuss,
  onModify,
  accepting,
  acceptedDecisionId,
  growthPlan,
  validationTask,
  decisionContract,
  showTranscript,
  onToggleTranscript,
  transcriptSlot,
}: MeetingRoomProps) {
  const showPrepare = preparing || lifecycle === "PREPARE" || !topicConfirmed;
  const [inviteReadyCount, setInviteReadyCount] = useState(0);
  const [expandGaps, setExpandGaps] = useState(false);
  const [expandChallenges, setExpandChallenges] = useState(false);
  const [expandConflictRows, setExpandConflictRows] = useState(false);
  const inviteComplete = inviteReadyCount >= INVITE_ADVISORS.length;

  useEffect(() => {
    if (!showPrepare) {
      setInviteReadyCount(INVITE_ADVISORS.length);
      return;
    }
    setInviteReadyCount(0);
    const timers: number[] = [];
    INVITE_ADVISORS.forEach((_, index) => {
      timers.push(
        window.setTimeout(() => {
          setInviteReadyCount(index + 1);
        }, 450 + index * 520),
      );
    });
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [showPrepare, topic]);

  const showDebate = Boolean(conflict) && topicConfirmed && deliberationRound >= 2;
  const showOptions = topicConfirmed && deliberationRound >= 3 && options.length > 0;
  const showDecide =
    topicConfirmed &&
    consensus &&
    deliberationRound >= 3 &&
    (lifecycle === "SYNTHESIS" ||
      lifecycle === "USER_CONFIRM" ||
      lifecycle === "DEBATE" ||
      lifecycle === "DISCUSS" ||
      lifecycle === "DECISION" ||
      lifecycle === "VALIDATE" ||
      lifecycle === "MEMORY_UPDATE");

  const visibleStatements =
    deliberationRound === 0
      ? []
      : statements.filter((s) => s.round <= Math.max(deliberationRound, 1));

  return (
    <div className="space-y-4 md:space-y-5">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/projects/${projectId}/agent`}
              prefetch={false}
              className="inline-flex min-h-11 items-center gap-1 border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[13px] font-medium text-[#66735E] no-underline touch-manipulation"
            >
              回对话
            </Link>
            <Link
              href="/dashboard?radar=1"
              prefetch={false}
              className="inline-flex min-h-11 items-center gap-1 border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[13px] font-medium text-[#6f747b] no-underline touch-manipulation"
            >
              经营动态
            </Link>
          </div>
          <span className="rounded-full border border-[rgba(24,24,23,0.08)] bg-white px-3 py-1 text-[12px] text-[#6f747b]">
            {lifecycleLabel(lifecycle)} · {roundLabel(deliberationRound)}
          </span>
        </div>
        <div>
          <p className="text-[12px] tracking-[0.08em] text-[#66735E]">会商 · {title}</p>
          <h1 className="mt-1 font-display text-[26px] font-semibold leading-[1.15] tracking-[-0.04em] text-[#202124] md:text-[36px]">
            {topic}
          </h1>
          <p className="mt-2 text-[14px] leading-6 text-[#6f747b]">
            先各自表态，再互相质疑，最后你拍板。
          </p>
        </div>
      </header>

      {showPrepare ? (
        <section className="border border-[rgba(24,24,23,0.08)] bg-[linear-gradient(180deg,#fbfaf7_0%,#eef1ea_100%)] p-4 md:p-5">
          <p className="text-[12px] tracking-[0.08em] text-[#66735E]">准备开案</p>
          <p className="mt-2 text-[18px] leading-[1.4] text-[#202124]">
            {inviteComplete ? "顾问已到齐" : "正在召集顾问…"}
          </p>
          <p className="mt-2 text-[14px] leading-7 text-[#5f655d]">
            确认议题后开始。
          </p>

          <ul className="mt-5 space-y-2.5">
            {INVITE_ADVISORS.map((advisor, index) => {
              const ready = index < inviteReadyCount;
              return (
                <li
                  key={advisor.name}
                  className={`flex items-start gap-3 px-1 py-2.5 transition ${
                    ready ? "opacity-100" : "opacity-55"
                  }`}
                >
                  <span
                    className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] ${
                      ready
                        ? "bg-[#66735E] text-white"
                        : "border border-[rgba(24,24,23,0.12)] text-transparent"
                    }`}
                  >
                    <Check className="h-3 w-3" />
                  </span>
                  <div>
                    <p className={`text-[14px] font-medium ${ready ? "text-[#202124]" : "text-[#9a968e]"}`}>
                      {advisor.name}
                    </p>
                    <p className="text-[12px] leading-5 text-[#6f747b]">{advisor.duty}</p>
                  </div>
                </li>
              );
            })}
          </ul>

          {inviteComplete ? (
            <>
              <p className="mt-5 text-[14px] leading-7 text-[#5f655d]">
                本次议题：「{topic}」——是否正确？
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={onConfirmTopic}
                  className="inline-flex min-h-12 items-center justify-center gap-2 bg-[#181817] px-4 text-[14px] font-semibold text-white touch-manipulation active:scale-[0.98] sm:min-h-11"
                >
                  <Check className="h-4 w-4" />
                  确认并开始
                </button>
                <button
                  type="button"
                  onClick={onEditTopic}
                  className="inline-flex min-h-12 items-center justify-center gap-2 border border-[rgba(24,24,23,0.08)] bg-white px-4 text-[14px] font-medium text-[#202124] touch-manipulation sm:min-h-11"
                >
                  <Pencil className="h-4 w-4" />
                  改议题
                </button>
              </div>

              {storeVisitFactCount > 0 ? (
                <p className="mt-4 rounded-[12px] border border-[rgba(95,107,78,0.25)] bg-[rgba(95,107,78,0.08)] px-3 py-2 text-[13px] leading-5 text-[#3f4a35]">
                  已带入 {storeVisitFactCount} 条店访事实，会按现场情况谈。
                </p>
              ) : null}

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-[16px] bg-white/85 px-4 py-3">
                  <p className="text-[12px] text-[#66735E]">已有事实</p>
                  <ul className="mt-2 space-y-1.5">
                    {(knownFacts.length ? knownFacts : ["项目上下文已加载"])
                      .slice(0, storeVisitFactCount > 0 ? 8 : 6)
                      .map((fact) => (
                      <li key={fact} className="text-[13px] leading-6 text-[#202124]">
                        ✓ {fact}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-[16px] bg-white/85 px-4 py-3">
                  <p className="text-[12px] text-[#B47C5C]">未知 / 请补充</p>
                  <ul className="mt-2 space-y-1.5">
                    {(unknownGaps.length ? unknownGaps : ["关键限制条件待补充"])
                      .slice(0, expandGaps ? undefined : 4)
                      .map((gap) => (
                      <li key={gap} className="text-[13px] leading-6 text-[#202124]">
                        ? {gap}
                      </li>
                    ))}
                  </ul>
                  {unknownGaps.length > 4 ? (
                    <button
                      type="button"
                      onClick={() => setExpandGaps((v) => !v)}
                      className="mt-2 inline-flex min-h-11 items-center text-[13px] font-medium text-[#66735E] touch-manipulation"
                    >
                      {expandGaps
                        ? "收起"
                        : `还有 ${unknownGaps.length - 4} 条`}
                    </button>
                  ) : null}
                  {onSupplementFact ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {unknownGaps.slice(0, 2).map((gap) => (
                        <button
                          key={`fill-${gap}`}
                          type="button"
                          onClick={() => onSupplementFact(gap)}
                          className="inline-flex min-h-11 items-center gap-1 rounded-full border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[13px] text-[#202124] touch-manipulation"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          补充：{gap.length > 12 ? `${gap.slice(0, 12)}…` : gap}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {topicConfirmed ? (
        <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[12px] tracking-[0.08em] text-[#66735E]">顾问席</p>
              <p className="mt-1 text-[13px] text-[#6f747b]">
                {deliberating
                  ? "正在形成判断…"
                  : deliberationRound === 0
                    ? "点下方开始"
                    : roundLabel(deliberationRound)}
              </p>
            </div>
            {deliberationRound < 3 ? (
              <button
                type="button"
                disabled={deliberating}
                onClick={onAdvanceRound}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[#181817] px-4 text-[14px] font-semibold text-white touch-manipulation disabled:opacity-60 sm:w-auto"
              >
                {deliberating ? "分析中…" : advanceLabel(deliberationRound)}
              </button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {experts.map((expert) => {
              const spoken = visibleStatements.filter((s) => s.roleId === expert.roleId);
              const analyzing = deliberating || (topicConfirmed && deliberationRound === 0);
              const latest = spoken[spoken.length - 1];
              return (
                <div
                  key={expert.roleId}
                  className="rounded-[16px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[14px] font-semibold text-[#202124]">{expert.displayName}</p>
                    <span
                      className={`text-[11px] ${
                        analyzing && !latest ? "text-[#B47C5C]" : "text-[#66735E]"
                      }`}
                    >
                      {analyzing && !latest ? "分析中" : latest ? "已发言" : expert.duty}
                    </span>
                  </div>
                  {analyzing && !latest ? (
                    <p className="mt-2 text-[13px] leading-6 text-[#9a968e]">
                      从{expert.duty}看…
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="mt-5 space-y-3">
            <p className="text-[12px] tracking-[0.08em] text-[#66735E]">发言</p>
            {visibleStatements.length === 0 ? (
              <p className="rounded-[16px] bg-[#F8F7F3] px-4 py-3 text-[14px] text-[#6f747b]">
                点「开始独立判断」后，顾问会依次表态。
              </p>
            ) : (
              visibleStatements.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[16px] border border-[rgba(24,24,23,0.08)] bg-white px-4 py-4 shadow-[0_8px_20px_rgba(24,24,23,0.03)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-[14px] font-semibold text-[#202124]">
                        {item.displayName}
                      </p>
                      {item.claim.includes("【启发式】") ? (
                        <span className="border border-[rgba(180,124,92,0.35)] bg-[rgba(180,124,92,0.1)] px-1.5 py-0.5 text-[11px] font-medium text-[#B47C5C]">
                          启发式
                        </span>
                      ) : item.claim.includes("【真实引擎】") ? (
                        <span className="border border-[rgba(102,115,94,0.35)] bg-[rgba(102,115,94,0.1)] px-1.5 py-0.5 text-[11px] font-medium text-[#66735E]">
                          真实引擎
                        </span>
                      ) : null}
                    </div>
                    {typeof item.confidence === "number" ? (
                      <p className="text-[12px] text-[#66735E]">
                        置信度 {Math.round(item.confidence * 100)}%
                      </p>
                    ) : null}
                  </div>
                  <p className="mt-3 text-[12px] tracking-[0.06em] text-[#6f747b]">
                    {item.round === 1
                      ? "判断"
                      : item.round === 2
                        ? "质疑"
                        : "提案立场"}
                  </p>
                  <p className="mt-1 text-[16px] leading-[1.65] text-[#202124]">{item.claim}</p>
                  {item.round === 2 && item.challengeTo ? (
                    <p className="mt-2 text-[12px] text-[#B47C5C]">
                      挑战对象：{item.challengeTo.replace("founder.", "")}
                      {item.challengeEvidenceId ? ` · 证据 ${item.challengeEvidenceId}` : ""}
                    </p>
                  ) : null}
                  {item.evidence && item.evidence.length > 0 ? (
                    <div className="mt-4 rounded-[14px] bg-[#F8F7F3] px-3 py-3">
                      <p className="text-[12px] tracking-[0.06em] text-[#66735E]">为什么这样判断？</p>
                      <p className="mt-1 text-[13px] font-medium text-[#202124]">会商依据</p>
                      <ul className="mt-2 space-y-1.5">
                        {item.evidence.slice(0, 4).map((ev) => (
                          <li key={ev.evidenceId} className="text-[13px] leading-6 text-[#5f655d]">
                            ✓ {ev.statement}
                            <span className="ml-1 text-[11px] text-[#9a968e]">
                              ({ev.evidenceId}
                              {ev.sourceLabel ? ` · ${ev.sourceLabel}` : ""})
                            </span>
                          </li>
                        ))}
                      </ul>
                      {item.evidence.length > 4 ? (
                        <p className="mt-2 text-[12px] font-medium text-[#66735E]">
                          还有 {item.evidence.length - 4} 条依据
                        </p>
                      ) : null}
                      {item.evidenceSufficient === false ? (
                        <p className="mt-2 text-[12px] leading-5 text-[#B47C5C]">
                          仍需验证：
                          {(item.evidenceGap && item.evidenceGap[0]) || "关键假设尚缺外部事实支撑"}
                        </p>
                      ) : null}
                    </div>
                  ) : item.reasons[0] ? (
                    <p className="mt-3 text-[14px] leading-7 text-[#5f655d]">{item.reasons[0]}</p>
                  ) : null}
                  {item.validation ? (
                    <p className="mt-3 text-[13px] leading-6 text-[#66735E]">验证：{item.validation}</p>
                  ) : null}
                </article>
              ))
            )}
          </div>
        </section>
      ) : null}

      {showDebate && conflict ? (
        <section className="rounded-[22px] border border-[rgba(180,124,92,0.22)] bg-[linear-gradient(180deg,#fffdfb_0%,#fbf6f1_100%)] p-4 md:p-5">
          <p className="text-[12px] tracking-[0.08em] text-[#B47C5C]">当前最大争议</p>
          <div className="mt-4 grid grid-cols-1 items-center gap-2 text-center sm:grid-cols-[1fr_auto_1fr] sm:gap-3">
            <p className="text-[16px] font-semibold leading-snug text-[#202124] md:text-[18px]">
              {conflict.positionA}
            </p>
            <p className="text-[12px] font-medium tracking-[0.12em] text-[#B47C5C] sm:text-[13px]">
              VS
            </p>
            <p className="text-[16px] font-semibold leading-snug text-[#202124] md:text-[18px]">
              {conflict.positionB}
            </p>
          </div>
          <p className="mt-4 text-center text-[13px] text-[#6f747b]">{conflict.conflictLabel}</p>
          {conflictMatrix?.primary?.question ? (
            <p className="mt-3 text-center text-[13px] leading-6 text-[#5f655d]">
              {conflictMatrix.primary.question}
            </p>
          ) : null}

          {conflictMatrix && conflictMatrix.rows.length > 0 ? (
            <div className="mt-5 border border-[rgba(24,24,23,0.08)] bg-white">
              <p className="border-b border-[rgba(24,24,23,0.06)] px-3 py-2 text-[12px] tracking-[0.06em] text-[#66735E]">
                冲突矩阵
              </p>
              {/* 手机：卡片列表；桌面：表格 */}
              <ul className="divide-y divide-[rgba(24,24,23,0.06)] md:hidden">
                {conflictMatrix.rows
                  .slice(0, expandConflictRows ? undefined : 5)
                  .map((row) => (
                  <li key={row.topic} className="px-3 py-3">
                    <p className="text-[13px] font-medium text-[#202124]">{row.topic}</p>
                    <div className="mt-2 grid grid-cols-2 gap-1.5 text-[12px] text-[#5f655d]">
                      {(
                        [
                          ["M-MKT", "市场"],
                          ["M-PNT", "品牌"],
                          ["M-BIZ", "商业"],
                          ["M-ED", "组织"],
                        ] as const
                      ).map(([agent, label]) => (
                        <span key={agent}>
                          {label}{" "}
                          <span className="font-semibold text-[#202124]">
                            {row.cells[agent] || "0"}
                          </span>
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-[rgba(24,24,23,0.06)] text-[#6f747b]">
                      <th className="px-3 py-2 font-medium">议题</th>
                      <th className="px-2 py-2 font-medium">市场</th>
                      <th className="px-2 py-2 font-medium">品牌</th>
                      <th className="px-2 py-2 font-medium">商业</th>
                      <th className="px-2 py-2 font-medium">组织</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conflictMatrix.rows
                      .slice(0, expandConflictRows ? undefined : 5)
                      .map((row) => (
                      <tr
                        key={row.topic}
                        className="border-b border-[rgba(24,24,23,0.04)] last:border-0"
                      >
                        <td className="px-3 py-2 text-[#202124]">{row.topic}</td>
                        {(["M-MKT", "M-PNT", "M-BIZ", "M-ED"] as const).map((agent) => (
                          <td key={agent} className="px-2 py-2 font-semibold text-[#202124]">
                            {row.cells[agent] || "0"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {conflictMatrix.rows.length > 5 ? (
                <button
                  type="button"
                  onClick={() => setExpandConflictRows((v) => !v)}
                  className="flex min-h-11 w-full items-center justify-center border-t border-[rgba(24,24,23,0.06)] text-[13px] font-medium text-[#66735E] touch-manipulation"
                >
                  {expandConflictRows
                    ? "收起矩阵"
                    : `还有 ${conflictMatrix.rows.length - 5} 条议题`}
                </button>
              ) : null}
              {conflictMatrix.primary?.drivingEvidenceIds &&
              conflictMatrix.primary.drivingEvidenceIds.length > 0 ? (
                <p className="border-t border-[rgba(24,24,23,0.06)] px-3 py-2 text-[11px] text-[#9a968e]">
                  驱动证据：{conflictMatrix.primary.drivingEvidenceIds.join(" · ")}
                </p>
              ) : null}
            </div>
          ) : null}

          {debateSession && debateSession.challenges.length > 0 && deliberationRound >= 2 ? (
            <div className="mt-5 space-y-2">
              <p className="text-[12px] tracking-[0.06em] text-[#B47C5C]">专业质疑</p>
              {debateSession.challenges
                .slice(0, expandChallenges ? undefined : 4)
                .map((ch, idx) => (
                <div
                  key={`${ch.fromCommitteeLabel}-${idx}`}
                  className="rounded-[14px] border border-[rgba(180,124,92,0.18)] bg-white px-3 py-3"
                >
                  <p className="text-[12px] text-[#B47C5C]">
                    {ch.challengeTypeLabel} · {ch.fromCommitteeLabel} → {ch.targetCommitteeLabel}
                  </p>
                  <p className="mt-1 text-[14px] leading-6 text-[#202124]">{ch.statement}</p>
                </div>
              ))}
              {debateSession.challenges.length > 4 ? (
                <button
                  type="button"
                  onClick={() => setExpandChallenges((v) => !v)}
                  className="inline-flex min-h-11 items-center text-[13px] font-medium text-[#B47C5C] touch-manipulation"
                >
                  {expandChallenges
                    ? "收起质疑"
                    : `还有 ${debateSession.challenges.length - 4} 条质疑`}
                </button>
              ) : null}
            </div>
          ) : null}

          {debateSession && debateSession.conflicts.length > 0 ? (
            <div className="mt-4 rounded-[14px] bg-white/80 px-3 py-3">
              <p className="text-[12px] tracking-[0.06em] text-[#66735E]">当前冲突</p>
              {debateSession.conflicts.slice(0, 2).map((c) => (
                <p key={c.topic} className="mt-2 text-[14px] leading-6 text-[#202124]">
                  {c.topic}
                  <span className="text-[#6f747b]">
                    {" "}
                    ·{" "}
                    {c.committees.map((id) => COMMITTEE_DISPLAY[id] || id).join(" / ")}
                  </span>
                </p>
              ))}
            </div>
          ) : null}

          <div className="mt-5">
            <p className="text-[13px] text-[#5f655d]">你更关注：</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {FOCUS_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChooseFocus(opt.id)}
                  className={`min-h-12 border px-3 text-[14px] font-medium transition touch-manipulation active:scale-[0.99] sm:min-h-11 sm:text-[13px] ${
                    focusChoice === opt.id
                      ? "border-[#181817] bg-[#181817] text-white"
                      : "border-[rgba(24,24,23,0.08)] bg-white text-[#202124]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {showOptions ? (
        <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-4 md:p-5">
          <p className="text-[12px] tracking-[0.08em] text-[#66735E]">方案选择</p>
          <p className="mt-2 text-[14px] text-[#5f655d]">三个方案，你倾向哪个？</p>
          <div className="mt-4 space-y-2">
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelectOption?.(opt.id)}
                className={`min-h-14 w-full border px-4 py-3.5 text-left transition touch-manipulation active:scale-[0.99] ${
                  selectedOptionId === opt.id
                    ? "border-[#181817] bg-[#181817] text-white"
                    : "border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] text-[#202124]"
                }`}
              >
                <p className="text-[14px] font-semibold">{opt.label}</p>
                <p
                  className={`mt-1 text-[13px] leading-6 ${
                    selectedOptionId === opt.id ? "text-white/80" : "text-[#6f747b]"
                  }`}
                >
                  {opt.summary}
                </p>
                <p
                  className={`mt-1 text-[12px] ${
                    selectedOptionId === opt.id ? "text-white/60" : "text-[#9a968e]"
                  }`}
                >
                  取舍：{opt.tradeoff}
                </p>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {showDecide && debateSession?.proposal ? (
        <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-[linear-gradient(180deg,#fbfaf7_0%,#f3f1eb_100%)] p-4 md:p-5">
          <p className="text-[12px] tracking-[0.08em] text-[#66735E]">决策提案 · 解决冲突</p>
          <p className="mt-3 text-[20px] leading-[1.4] tracking-[-0.02em] text-[#202124] md:text-[24px]">
            {debateSession.proposal.decision}
          </p>
          <p className="mt-3 text-[14px] leading-7 text-[#5f655d]">{debateSession.proposal.whyNow}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[14px] bg-white px-3 py-3">
              <p className="text-[12px] text-[#66735E]">取舍</p>
              <ul className="mt-2 space-y-1 text-[13px] leading-6 text-[#202124]">
                {debateSession.proposal.tradeoffs.slice(0, 3).map((t) => (
                  <li key={t}>· {t}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-[14px] bg-white px-3 py-3">
              <p className="text-[12px] text-[#66735E]">条件 / 接受风险</p>
              <ul className="mt-2 space-y-1 text-[13px] leading-6 text-[#202124]">
                {debateSession.proposal.conditions.slice(0, 2).map((c) => (
                  <li key={c}>· {c}</li>
                ))}
                {debateSession.proposal.risksAccepted.slice(0, 2).map((r) => (
                  <li key={r} className="text-[#B47C5C]">
                    · 接受：{r}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="mt-3 text-[13px] leading-6 text-[#66735E]">
            验证计划：{debateSession.proposal.validationPlan}
          </p>
        </section>
      ) : null}

      {showDecide && debateSession && debateSession.scenarioTests.length > 0 ? (
        <section className="rounded-[22px] border border-[rgba(180,124,92,0.2)] bg-white p-4 md:p-5">
          <p className="text-[12px] tracking-[0.08em] text-[#B47C5C]">如果错了呢</p>
          <p className="mt-2 text-[14px] text-[#5f655d]">最坏情况与最小损失。</p>
          <div className="mt-4 space-y-3">
            {debateSession.scenarioTests.slice(0, 3).map((sc) => (
              <div
                key={sc.scenario}
                className="rounded-[14px] border border-[rgba(24,24,23,0.06)] bg-[#FBFAF7] px-3 py-3"
              >
                <p className="text-[14px] font-semibold text-[#202124]">{sc.scenario}</p>
                <p className="mt-2 text-[13px] leading-6 text-[#5f655d]">触发：{sc.trigger}</p>
                <p className="mt-1 text-[13px] leading-6 text-[#5f655d]">后果：{sc.impact}</p>
                <p className="mt-1 text-[13px] leading-6 text-[#66735E]">最小损失：{sc.mitigation}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {showDecide && consensus ? (
        <section className="rounded-[22px] bg-[#202124] p-4 text-white md:p-5">
          <p className="text-[12px] tracking-[0.08em] text-white/65">
            {decisionContract ? "待你确认" : "当前共识"}
          </p>
          {decisionContract ? (
            <div className="mt-2 space-y-2">
              <p className="text-[13px] text-white/65">
                {decisionContract.intentLabel} · {decisionContract.statusLabel} · 置信度{" "}
                {Math.round(decisionContract.confidence * 100)}%
              </p>
              <p className="text-[20px] leading-[1.4] tracking-[-0.02em] md:text-[24px]">
                {decisionContract.memo?.decision || decisionContract.decision}
              </p>
              <p className="text-[13px] text-white/70">{decisionContract.gateReason}</p>
            </div>
          ) : (
            <p className="mt-2 text-[20px] leading-[1.4] tracking-[-0.02em] md:text-[24px]">
              {consensus.summary}
            </p>
          )}
          {consensus.validationPlan && !decisionContract ? (
            <p className="mt-3 text-[14px] text-white/75">验证：{consensus.validationPlan}</p>
          ) : null}
          {decisionContract?.memo ? (
            <div className="mt-4 rounded-[14px] bg-white/10 px-3 py-3 text-[13px] leading-6 text-white/85">
              <p className="text-[12px] text-white/65">{decisionContract.memo.title}</p>
              <p className="mt-2">为什么现在：{decisionContract.memo.whyNow}</p>
              {decisionContract.memo.tradeoffs.length > 0 ? (
                <p className="mt-1">
                  取舍：{decisionContract.memo.tradeoffs.slice(0, 2).join("；")}
                </p>
              ) : null}
              {decisionContract.memo.conditions.length > 0 ? (
                <p className="mt-1">
                  条件：{decisionContract.memo.conditions.slice(0, 2).join("；")}
                </p>
              ) : null}
              <p className="mt-1">验证：{decisionContract.memo.validation}</p>
              <p className="mt-1">停止线：{decisionContract.memo.stopLine}</p>
              <p className="mt-1 text-white/70">止损：{decisionContract.memo.killCriteria}</p>
            </div>
          ) : null}

          {decisionContract?.validationPlan ? (
            <div className="mt-3 rounded-[14px] bg-white/10 px-3 py-3 text-[13px] leading-6 text-white/85">
              <p>验证目标：{decisionContract.validationPlan.goal}</p>
              <p>假设：{decisionContract.validationPlan.hypothesis}</p>
              <p>指标：{decisionContract.validationPlan.metrics.join(" · ")}</p>
              <p>
                成功：{decisionContract.validationPlan.successCriteria}
                {decisionContract.validationPlan.killCriteria
                  ? ` · 停止：${decisionContract.validationPlan.killCriteria}`
                  : ""}
              </p>
            </div>
          ) : null}

          {decisionContract && decisionContract.tensions.length > 0 ? (
            <div className="mt-4 rounded-[14px] bg-white/10 px-3 py-3">
              <p className="text-[12px] text-white/65">会商分歧</p>
              {decisionContract.tensions.slice(0, 2).map((tension) => (
                <div key={tension.topic} className="mt-2">
                  <p className="text-[14px] font-medium text-white">关于{tension.topic}</p>
                  <p className="mt-1 text-[13px] text-white/80">
                    支持：{tension.supporters.join(" / ") || "—"} · 反对：
                    {tension.opponents.join(" / ") || "—"}
                  </p>
                  {tension.criticalEvidence.length > 0 ? (
                    <p className="mt-1 text-[12px] text-white/60">
                      关键证据：{tension.criticalEvidence.join(" · ")}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {decisionContract && decisionContract.committeeViews.length > 0 ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {decisionContract.committeeViews.map((view) => (
                <div key={view.committee} className="rounded-[12px] bg-white/10 px-3 py-2">
                  <p className="text-[12px] text-white/65">
                    {view.committeeLabel} · {view.position}
                  </p>
                  <p className="mt-1 text-[13px] leading-5 text-white/90">{view.reason}</p>
                </div>
              ))}
            </div>
          ) : null}

          {statements.some((s) => s.evidenceSufficient === false) ? (
            <p className="mt-2 text-[13px] text-[#F0C9A8]">
              证据还不够，确认后会按「假设」写入；先别放大执行。
            </p>
          ) : null}

          {decisionCard &&
          (lifecycle === "DECISION" || lifecycle === "VALIDATE" || lifecycle === "MEMORY_UPDATE") ? (
            <div className="mt-5 rounded-[16px] bg-white/10 px-4 py-4">
              <p className="text-[12px] text-white/65">决策卡</p>
              <p className="mt-2 text-[15px] leading-7">问题：{decisionCard.problem}</p>
              <p className="text-[15px] leading-7">共识：{decisionCard.consensus}</p>
              <p className="text-[15px] leading-7">下一步：{decisionCard.nextSteps.join("；")}</p>
              <p className="text-[15px] leading-7">
                状态：验证中 · {decisionCard.validationDays}天
              </p>
              {validationTask ? (
                <div className="mt-4 rounded-[14px] bg-white/10 px-3 py-3">
                  <p className="text-[12px] text-white/65">验证任务</p>
                  <p className="mt-1 text-[14px] font-medium text-white">
                    {validationTask.id} · {validationTask.title}
                  </p>
                  <p className="mt-1 text-[13px] leading-6 text-white/80">
                    目标：{validationTask.objective}
                  </p>
                  <p className="mt-1 text-[12px] text-white/65">
                    负责人：{validationTask.owner} · 周期：{validationTask.horizonDays} 天
                  </p>
                  {validationTask.metrics.length > 0 ? (
                    <ul className="mt-2 space-y-1 text-[12px] leading-5 text-white/75">
                      {validationTask.metrics.slice(0, 4).map((metric) => (
                        <li key={metric.id}>
                          {metric.label}
                          {metric.target ? ` · ${metric.target}` : ""}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
              {growthPlan ? (
                <div className="mt-4 rounded-[14px] bg-white/10 px-3 py-3">
                  <p className="text-[12px] text-white/65">90天成长计划</p>
                  <ul className="mt-2 space-y-1.5 text-[13px] leading-6 text-white/90">
                    <li>第30天：{growthPlan.day30}</li>
                    <li>第60天：{growthPlan.day60}</li>
                    <li>第90天：{growthPlan.day90}</li>
                  </ul>
                </div>
              ) : null}
              {acceptedDecisionId ? (
                <DecisionClosedActions
                  projectId={projectId}
                  archiveOk
                  variant="onDark"
                />
              ) : null}
            </div>
          ) : (
            <div className="mt-5">
              <p className="text-[14px] text-white/80">接受这个方案吗？</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  disabled={accepting}
                  onClick={onAccept}
                  className="inline-flex min-h-12 items-center justify-center bg-white px-4 text-[14px] font-semibold text-[#202124] touch-manipulation active:scale-[0.98] disabled:opacity-60 sm:min-h-11"
                >
                  {accepting
                    ? "写入中…"
                    : statements.some((s) => s.evidenceSufficient === false)
                      ? "仅存假设"
                      : "接受"}
                </button>
                <button
                  type="button"
                  onClick={onModify}
                  className="inline-flex min-h-12 items-center justify-center border border-white/25 bg-white/10 px-4 text-[14px] font-medium text-white touch-manipulation sm:min-h-11"
                >
                  修改
                </button>
                <button
                  type="button"
                  onClick={onContinueDiscuss}
                  className="inline-flex min-h-12 items-center justify-center border border-white/25 bg-white/10 px-4 text-[14px] font-medium text-white touch-manipulation sm:min-h-11"
                >
                  继续讨论
                </button>
              </div>
            </div>
          )}
        </section>
      ) : null}

      {onToggleTranscript ? (
        <button
          type="button"
          onClick={onToggleTranscript}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 border border-[rgba(24,24,23,0.08)] bg-white px-4 text-[13px] font-medium text-[#66735E] touch-manipulation"
        >
          <MessageSquare className="h-4 w-4" />
          {showTranscript ? "收起补充记录" : "补充观点 / 会商记录"}
        </button>
      ) : null}

      {showTranscript ? transcriptSlot : null}
    </div>
  );
}
