"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, Check, MessageSquare, Pencil, Plus } from "lucide-react";
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

const INVITE_ADVISORS = [
  { name: "市场顾问", duty: "分析行业空间" },
  { name: "品牌顾问", duty: "分析品牌定位" },
  { name: "商业顾问", duty: "分析扩张模型" },
  { name: "组织顾问", duty: "分析管理能力" },
];

type MeetingRoomProps = {
  projectId: string;
  title: string;
  topic: string;
  lifecycle: MeetingLifecycle;
  preparing?: boolean;
  knownFacts: string[];
  unknownGaps: string[];
  experts: ExpertSeat[];
  statements: ExpertStatement[];
  conflict: MeetingConflict | null;
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
  if (round === 1) return "Round 1 · 独立判断";
  if (round === 2) return "Round 2 · 互相挑战";
  if (round === 3) return "Round 3 · 形成共识";
  return "等待开始";
}

function advanceLabel(round: DeliberationRound | 0): string {
  if (round === 0) return "开始独立判断";
  if (round === 1) return "进入互相挑战";
  if (round === 2) return "请收口共识";
  return "共识已形成";
}

export function MeetingRoom({
  projectId,
  title,
  topic,
  lifecycle,
  preparing,
  knownFacts,
  unknownGaps,
  experts,
  statements,
  conflict,
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
  showTranscript,
  onToggleTranscript,
  transcriptSlot,
}: MeetingRoomProps) {
  const showPrepare = preparing || lifecycle === "PREPARE" || !topicConfirmed;
  const [inviteReadyCount, setInviteReadyCount] = useState(0);
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
          <Link
            href={`/projects/${projectId}`}
            prefetch={false}
            className="inline-flex min-h-8 items-center gap-1 rounded-full border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[12px] font-medium text-[#66735E] no-underline"
          >
            退出会议
          </Link>
          <span className="rounded-full border border-[rgba(24,24,23,0.08)] bg-white px-3 py-1 text-[12px] text-[#6f747b]">
            {lifecycleLabel(lifecycle)} · {roundLabel(deliberationRound)}
          </span>
        </div>
        <div>
          <p className="text-[12px] tracking-[0.08em] text-[#66735E]">{title}</p>
          <h1 className="mt-1 font-display text-[26px] font-semibold leading-[1.15] tracking-[-0.04em] text-[#202124] md:text-[36px]">
            {topic}
          </h1>
          <p className="mt-2 text-[14px] leading-6 text-[#6f747b]">
            你不是在和 AI 聊天，你在参加一场咨询会议。
          </p>
        </div>
      </header>

      {showPrepare ? (
        <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-[linear-gradient(180deg,#fbfaf7_0%,#eef1ea_100%)] p-4 md:p-5">
          <p className="text-[12px] tracking-[0.08em] text-[#66735E]">会前准备</p>
          <p className="mt-2 text-[18px] leading-[1.4] text-[#202124]">
            {inviteComplete ? "顾问团队已就位" : "正在邀请顾问"}
          </p>
          <p className="mt-2 text-[14px] leading-7 text-[#5f655d]">
            这个问题需要一次战略评审会议——团队正在形成。
          </p>

          <ul className="mt-5 space-y-2.5">
            {INVITE_ADVISORS.map((advisor, index) => {
              const ready = index < inviteReadyCount;
              return (
                <li
                  key={advisor.name}
                  className={`flex items-start gap-3 rounded-[14px] px-3 py-2.5 transition ${
                    ready ? "bg-white/90" : "bg-white/40"
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
                我理解你的问题是：「{topic}」是否正确？
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={onConfirmTopic}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] bg-[#181817] px-4 text-[14px] font-semibold text-white"
                >
                  <Check className="h-4 w-4" />
                  确认议题，开始会议
                </button>
                <button
                  type="button"
                  onClick={onEditTopic}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-white px-4 text-[14px] font-medium text-[#202124]"
                >
                  <Pencil className="h-4 w-4" />
                  修改议题
                </button>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-[16px] bg-white/85 px-4 py-3">
                  <p className="text-[12px] text-[#66735E]">已有事实</p>
                  <ul className="mt-2 space-y-1.5">
                    {(knownFacts.length ? knownFacts : ["项目上下文已加载"]).slice(0, 6).map((fact) => (
                      <li key={fact} className="text-[13px] leading-6 text-[#202124]">
                        ✓ {fact}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-[16px] bg-white/85 px-4 py-3">
                  <p className="text-[12px] text-[#B47C5C]">未知 / 请补充</p>
                  <ul className="mt-2 space-y-1.5">
                    {(unknownGaps.length ? unknownGaps : ["关键限制条件待补充"]).slice(0, 4).map((gap) => (
                      <li key={gap} className="text-[13px] leading-6 text-[#202124]">
                        ? {gap}
                      </li>
                    ))}
                  </ul>
                  {onSupplementFact ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {unknownGaps.slice(0, 2).map((gap) => (
                        <button
                          key={`fill-${gap}`}
                          type="button"
                          onClick={() => onSupplementFact(gap)}
                          className="inline-flex min-h-9 items-center gap-1 rounded-full border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[12px] text-[#202124]"
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
                  ? "当前会议状态：正在形成判断…"
                  : deliberationRound === 0
                    ? "顾问已入席，等待开始诊断"
                    : roundLabel(deliberationRound)}
              </p>
            </div>
            {deliberationRound < 3 ? (
              <button
                type="button"
                disabled={deliberating}
                onClick={onAdvanceRound}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[14px] bg-[#181817] px-4 text-[13px] font-semibold text-white disabled:opacity-60"
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
                    <p className="mt-2 text-[13px] leading-6 text-[#9a968e]">正在从{expert.duty}视角审查议题…</p>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="mt-5 space-y-3">
            <p className="text-[12px] tracking-[0.08em] text-[#66735E]">专家观点</p>
            {visibleStatements.length === 0 ? (
              <p className="rounded-[16px] bg-[#F8F7F3] px-4 py-3 text-[14px] text-[#6f747b]">
                还不会立刻给答案。点击「开始独立判断」，观看顾问逐一发言。
              </p>
            ) : (
              visibleStatements.map((item) => (
                <article
                  key={item.id}
                  className="rounded-[16px] border border-[rgba(24,24,23,0.08)] bg-white px-4 py-4 shadow-[0_8px_20px_rgba(24,24,23,0.03)]"
                >
                  <p className="text-[14px] font-semibold text-[#202124]">{item.displayName}</p>
                  <p className="mt-3 text-[12px] tracking-[0.06em] text-[#6f747b]">
                    {item.round === 1 ? "我的初步判断" : item.round === 2 ? "我要挑战的一点" : "我支持的共识"}
                  </p>
                  <p className="mt-1 text-[16px] leading-[1.65] text-[#202124]">{item.claim}</p>
                  {item.reasons[0] ? (
                    <p className="mt-3 text-[14px] leading-7 text-[#5f655d]">{item.reasons[0]}</p>
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
          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
            <p className="text-[16px] font-semibold leading-snug text-[#202124] md:text-[18px]">
              {conflict.positionA}
            </p>
            <p className="text-[13px] font-medium tracking-[0.12em] text-[#B47C5C]">VS</p>
            <p className="text-[16px] font-semibold leading-snug text-[#202124] md:text-[18px]">
              {conflict.positionB}
            </p>
          </div>
          <p className="mt-4 text-center text-[13px] text-[#6f747b]">{conflict.conflictLabel}</p>

          <div className="mt-5">
            <p className="text-[13px] text-[#5f655d]">你更关注：</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {FOCUS_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChooseFocus(opt.id)}
                  className={`min-h-11 rounded-[14px] border px-3 text-[13px] font-medium transition ${
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
                className={`w-full rounded-[16px] border px-4 py-3 text-left transition ${
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

      {showDecide && consensus ? (
        <section className="rounded-[22px] bg-[#202124] p-4 text-white md:p-5">
          <p className="text-[12px] tracking-[0.08em] text-white/65">当前共识</p>
          <p className="mt-2 text-[20px] leading-[1.4] tracking-[-0.02em] md:text-[24px]">
            {consensus.summary}
          </p>
          {consensus.validationPlan ? (
            <p className="mt-3 text-[14px] text-white/75">验证：{consensus.validationPlan}</p>
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
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/projects/${projectId}/decisions`}
                    prefetch={false}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-[13px] font-medium text-[#202124] no-underline"
                  >
                    查看决策档案
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/dashboard"
                    prefetch={false}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/30 px-4 text-[13px] font-medium text-white no-underline"
                  >
                    回到今日简报
                  </Link>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-5">
              <p className="text-[14px] text-white/80">下一步：是否接受该方案？</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  disabled={accepting}
                  onClick={onAccept}
                  className="inline-flex min-h-11 items-center justify-center rounded-[14px] bg-white px-4 text-[14px] font-semibold text-[#202124] disabled:opacity-60"
                >
                  {accepting ? "写入中…" : "接受"}
                </button>
                <button
                  type="button"
                  onClick={onModify}
                  className="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-white/25 bg-white/10 px-4 text-[14px] font-medium text-white"
                >
                  修改
                </button>
                <button
                  type="button"
                  onClick={onContinueDiscuss}
                  className="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-white/25 bg-white/10 px-4 text-[14px] font-medium text-white"
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
          className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-white px-4 text-[13px] font-medium text-[#66735E]"
        >
          <MessageSquare className="h-4 w-4" />
          {showTranscript ? "收起补充记录" : "补充观点 / 会议记录"}
        </button>
      ) : null}

      {showTranscript ? transcriptSlot : null}
    </div>
  );
}
