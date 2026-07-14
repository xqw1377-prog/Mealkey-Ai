/**
 * 用 Founder Layer runtime（服务端会议引擎）投影 Round 2/3，
 * 替代客户端硬编码剧本。
 */

import type {
  ConsensusDraft,
  ExpertStatement,
  MeetingConflict,
} from "./meeting";
import type { DecisionOption, DeliberationResult } from "./meeting-deliberation";
import { AGENT_SEAT } from "@/server/founder/contracts";
import type { FounderAgentId } from "@/server/founder/contracts";

type RuntimeLike = {
  meeting: {
    recommendation: string;
    conflicts: Array<{
      conflictId: string;
      summary: string;
      sideA: string;
      sideB: string;
      dimension: string;
      agents: string[];
    }>;
    rounds: Array<{
      round: number;
      title: string;
      items: Array<{ agent: string; summary: string; stance?: string }>;
    }>;
  };
  decisions: Array<{
    decisionId: string;
    sourceAgent: string;
    judgement: string;
    stance?: "support" | "oppose" | "conditional" | "neutral";
    risks: string[];
    nextSteps: string[];
  }>;
  finalDecision: {
    chosen: string;
    problem: string;
    reason: string[];
    validationPlan: string[];
  };
};

function seatLabel(agent: string): { roleId: string; displayName: string } {
  const id = (["M-PNT", "M-MKT", "M-BIZ", "M-ED", "CHIEF"].includes(agent)
    ? agent
    : "CHIEF") as FounderAgentId;
  const seat = AGENT_SEAT[id];
  return {
    roleId: `founder.${id}`,
    displayName: seat.seatLabel,
  };
}

function clip(text: string, max = 72): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "本轮仍需更多事实支撑。";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function conflictFromRuntime(runtime: RuntimeLike): MeetingConflict | null {
  const first = runtime.meeting.conflicts[0];
  if (!first) return null;
  return {
    id: first.conflictId,
    issue: first.summary,
    positionA: first.sideA,
    positionB: first.sideB,
    conflictLabel: first.dimension,
  };
}

function optionsFromRuntime(runtime: RuntimeLike): DecisionOption[] {
  const plan = runtime.finalDecision.validationPlan;
  return [
    {
      id: "opt-continue",
      label: "带条件推进",
      summary: runtime.meeting.recommendation || runtime.finalDecision.reason[0] || "按共识推进",
      tradeoff: plan[0] || "先完成关键验证再放大投入",
    },
    {
      id: "opt-hold",
      label: "暂缓决策",
      summary: "先补齐分歧点对应的事实与验证",
      tradeoff: plan[1] || runtime.finalDecision.reason[1] || "避免在分歧未解时放大动作",
    },
  ];
}

function consensusFromRuntime(runtime: RuntimeLike, topic: string): ConsensusDraft {
  return {
    id: `consensus-${Date.now()}`,
    topic,
    judgement:
      runtime.finalDecision.reason[0] ||
      runtime.meeting.recommendation ||
      `${runtime.finalDecision.chosen}：${runtime.finalDecision.problem}`,
    reasons:
      runtime.finalDecision.reason.length > 0
        ? runtime.finalDecision.reason.slice(0, 4)
        : runtime.decisions.slice(0, 3).map((d) => `${d.sourceAgent}：${clip(d.judgement, 48)}`),
    risks: runtime.decisions.flatMap((d) => d.risks).filter(Boolean).slice(0, 3),
    nextSteps: [
      ...runtime.finalDecision.validationPlan,
      ...runtime.decisions.flatMap((d) => d.nextSteps),
    ]
      .filter(Boolean)
      .slice(0, 4),
  };
}

/** Round 2：基于服务端冲突与各席风险，形成挑战发言 */
export function projectRuntimeRound2(input: {
  runtime: RuntimeLike;
  previous: ExpertStatement[];
  topic: string;
}): DeliberationResult {
  const conflict = conflictFromRuntime(input.runtime);
  const roundTwoItems = input.runtime.meeting.rounds.find((r) => r.round === 2)?.items ?? [];

  const statements: ExpertStatement[] = input.runtime.decisions.map((decision, index) => {
    const seat = seatLabel(decision.sourceAgent);
    const challenge =
      roundTwoItems[index]?.summary ||
      conflict?.issue ||
      decision.risks[0] ||
      `需要回应其他席位对「${clip(decision.judgement, 28)}」的质疑。`;
    const stance =
      decision.stance === "oppose"
        ? "oppose"
        : decision.stance === "support"
          ? "conditional"
          : decision.stance || "conditional";

    return {
      id: `r2-${decision.decisionId}`,
      roleId: seat.roleId,
      displayName: seat.displayName,
      round: 2,
      stance,
      claim: clip(challenge, 64),
      reasons: [
        clip(decision.risks[0] || decision.judgement, 100),
        conflict ? `冲突点：${clip(conflict.issue, 60)}` : `围绕议题：${clip(input.topic, 40)}`,
      ].filter(Boolean),
    };
  });

  const merged = [
    ...input.previous.filter((s) => s.round === 1),
    ...statements,
  ];

  return {
    round: 2,
    statements: merged,
    conflict,
    consensus: null,
    options: optionsFromRuntime(input.runtime),
  };
}

/** Round 3：综合服务端 finalDecision / recommendation 收口 */
export function projectRuntimeRound3(input: {
  runtime: RuntimeLike;
  previous: ExpertStatement[];
  topic: string;
  focusChoice?: string | null;
}): DeliberationResult {
  const consensus = consensusFromRuntime(input.runtime, input.topic);
  if (input.focusChoice) {
    consensus.reasons = [
      `创始人关注：${input.focusChoice}`,
      ...consensus.reasons,
    ].slice(0, 4);
  }

  const statements: ExpertStatement[] = input.runtime.decisions.map((decision) => {
    const seat = seatLabel(decision.sourceAgent);
    return {
      id: `r3-${decision.decisionId}`,
      roleId: seat.roleId,
      displayName: seat.displayName,
      round: 3,
      stance: decision.stance === "oppose" ? "conditional" : decision.stance || "support",
      claim: clip(
        decision.nextSteps[0] ||
          input.runtime.finalDecision.validationPlan[0] ||
          input.runtime.meeting.recommendation,
        64,
      ),
      reasons: [
        clip(consensus.judgement, 100),
        decision.nextSteps[0] ? `下一步：${clip(decision.nextSteps[0], 60)}` : "按验证计划推进",
      ],
    };
  });

  const merged = [
    ...input.previous.filter((s) => s.round === 1 || s.round === 2),
    ...statements,
  ];

  return {
    round: 3,
    statements: merged,
    conflict: conflictFromRuntime(input.runtime),
    consensus,
    options: optionsFromRuntime(input.runtime),
  };
}
