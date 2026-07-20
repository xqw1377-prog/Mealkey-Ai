/**
 * 用 Founder Layer runtime（服务端会议引擎）投影 Round 2/3，
 * 替代客户端硬编码剧本；Round2 优先走 Debate Session 挑战。
 */

import type {
  ConsensusDraft,
  ExpertStatement,
  MeetingConflict,
} from "./meeting";
import type { DecisionOption, DeliberationResult } from "./meeting-deliberation";
import type { FounderDecision } from "@/server/founder-layer/contracts/decision";
import {
  buildChallengeStatements,
  buildConflictMatrix,
} from "@/server/founder-layer/meeting/conflict-matrix";
import { CHALLENGE_TYPE_LABEL } from "@/server/founder-layer/contracts/debate-session";

const SEAT_LABEL: Record<string, { roleId: string; displayName: string }> = {
  "M-MKT": { roleId: "founder.M-MKT", displayName: "市场顾问" },
  "M-PNT": { roleId: "founder.M-PNT", displayName: "品牌顾问" },
  "M-BIZ": { roleId: "founder.M-BIZ", displayName: "商业顾问" },
  "M-ED": { roleId: "founder.M-ED", displayName: "组织顾问" },
  CHIEF: { roleId: "founder.CHIEF", displayName: "主持人" },
};

const COMMITTEE_LABEL: Record<string, string> = {
  market: "市场委员会",
  brand: "品牌委员会",
  business: "商业委员会",
  capital: "资本委员会",
};

type DebateSessionLike = {
  debateId: string;
  status: string;
  conflicts: Array<{
    conflictId: string;
    topic: string;
    severity: "low" | "medium" | "high";
    committees: string[];
    evidenceRefs: string[];
    summary: string;
  }>;
  challenges: Array<{
    challengeId: string;
    fromCommittee: string;
    fromAgent: string;
    targetCommittee: string;
    targetAgent: string;
    targetEvidenceId?: string;
    challengeType: "evidence" | "logic" | "assumption" | "risk";
    statement: string;
    evidenceRefs?: string[];
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
    scenarioId: string;
    scenario: string;
    trigger: string;
    impact: string;
    mitigation: string;
  }>;
};

type RuntimeLike = {
  meeting: {
    recommendation?: string;
    conflicts: Array<{
      conflictId: string;
      summary: string;
      sideA: string;
      sideB: string;
      dimension: string;
      agents: readonly string[];
      drivingEvidenceIds?: string[];
    }>;
    rounds: Array<{
      round: number;
      title: string;
      items: Array<{
        agent: string;
        summary: string;
        stance?: string;
        challengeTo?: string;
        challengeEvidenceId?: string;
      }>;
    }>;
    conflictMatrix?: {
      rows?: Array<{
        topic: string;
        cells: Record<string, string>;
        summary: string;
        drivingEvidenceIds?: string[];
      }>;
      primary?: {
        topic: string;
        sideA: { agents: string[]; claim: string };
        sideB: { agents: string[]; claim: string };
        drivingEvidenceIds?: string[];
        question?: string;
      } | null;
      tradeoffs?: Array<{ keep: string; giveUp: string; why: string }>;
    };
    debateSession?: DebateSessionLike;
  };
  decisions: Array<{
    decisionId: string;
    sourceAgent: string;
    judgement: string;
    stance?: "support" | "oppose" | "conditional" | "neutral" | string;
    risks: string[];
    nextSteps: string[];
    evidence?: Array<{
      evidenceId?: string;
      label: string;
      content: string;
      source?: string;
    }>;
    reasoning?: string;
    validation?: string;
    evidenceSufficient?: boolean;
    evidenceGap?: string[];
    assumptions?: string[];
    confidence?: number;
  }>;
  finalDecision: {
    chosen: string;
    problem: string;
    reason: string[];
    validationPlan: string[];
    evidenceStatus?: "sufficient" | "insufficient";
  };
};

function seatLabel(agent: string): { roleId: string; displayName: string } {
  return SEAT_LABEL[agent] || SEAT_LABEL.CHIEF!;
}

function clip(text: string, max = 72): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "本轮仍需更多事实支撑。";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function conflictFromRuntime(runtime: RuntimeLike): MeetingConflict | null {
  const debateConflict = runtime.meeting.debateSession?.conflicts?.[0];
  if (debateConflict) {
    return {
      id: debateConflict.conflictId,
      issue: debateConflict.summary,
      positionA: debateConflict.topic,
      positionB: debateConflict.summary,
      conflictLabel: debateConflict.severity === "high" ? "高冲突" : "当前冲突",
    };
  }
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
  const proposal = runtime.meeting.debateSession?.proposal;
  const tradeoff = runtime.meeting.conflictMatrix?.tradeoffs?.[0];
  return [
    {
      id: "opt-continue",
      label: "带条件推进",
      summary:
        proposal?.decision ||
        runtime.meeting.recommendation ||
        runtime.finalDecision.reason[0] ||
        "按共识推进",
      tradeoff: proposal?.tradeoffs[0]
        ? proposal.tradeoffs[0]
        : tradeoff
          ? `保留「${tradeoff.keep}」，暂缓「${tradeoff.giveUp}」`
          : plan[0] || "先完成关键验证再放大投入",
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
  const proposal = runtime.meeting.debateSession?.proposal;
  const judgement =
    proposal?.decision ||
    runtime.finalDecision.reason[0] ||
    runtime.meeting.recommendation ||
    `${runtime.finalDecision.chosen}：${runtime.finalDecision.problem}`;
  const tradeoffs = runtime.meeting.conflictMatrix?.tradeoffs ?? [];

  return {
    summary: clip(`${topic}：${judgement}`, 120),
    proposedDecision: clip(proposal?.decision || runtime.meeting.recommendation || judgement, 100),
    coreReasons: proposal
      ? [
          proposal.whyNow,
          ...proposal.tradeoffs.map((t) => `取舍：${t}`),
          ...proposal.conditions.map((c) => `条件：${c}`),
        ].slice(0, 4)
      : tradeoffs.length > 0
        ? tradeoffs.map((t) => `取舍：保留「${t.keep}」/ 放弃「${t.giveUp}」`).slice(0, 4)
        : runtime.finalDecision.reason.length > 0
          ? runtime.finalDecision.reason.slice(0, 4)
          : runtime.decisions.slice(0, 3).map((d) => `${d.sourceAgent}：${clip(d.judgement, 48)}`),
    nextActions: [
      ...(proposal?.conditions ?? []),
      ...runtime.finalDecision.validationPlan,
      ...runtime.decisions.flatMap((d) => d.nextSteps),
    ]
      .filter(Boolean)
      .slice(0, 4),
    validationPlan:
      proposal?.validationPlan ||
      runtime.finalDecision.validationPlan.join("；") ||
      undefined,
  };
}

function toFounderDecisions(runtime: RuntimeLike): FounderDecision[] {
  return runtime.decisions.map((d) => ({
    decisionId: d.decisionId,
    sourceAgent: d.sourceAgent as FounderDecision["sourceAgent"],
    question: "",
    judgement: d.judgement,
    confidence: d.confidence ?? 0.6,
    evidence: (d.evidence ?? []).map((e) => ({
      evidenceId: e.evidenceId,
      label: e.label,
      content: e.content,
      source: e.source,
    })),
    risks: d.risks,
    nextSteps: d.nextSteps,
    stance:
      d.stance === "support" || d.stance === "oppose" || d.stance === "conditional"
        ? d.stance
        : "conditional",
    evidenceGap: d.evidenceGap,
    assumptions: d.assumptions,
    validation: d.validation,
    reasoning: d.reasoning,
    evidenceSufficient: d.evidenceSufficient,
  }));
}

export function projectRuntimeRound2(input: {
  runtime: RuntimeLike;
  previous: ExpertStatement[];
  topic: string;
}): DeliberationResult {
  const conflict = conflictFromRuntime(input.runtime);
  const decisions = toFounderDecisions(input.runtime);
  const debateChallenges = input.runtime.meeting.debateSession?.challenges;

  let statements: ExpertStatement[];

  if (debateChallenges && debateChallenges.length > 0) {
    statements = debateChallenges.map((ch) => {
      const decision =
        decisions.find((d) => d.sourceAgent === ch.fromAgent) || decisions[0]!;
      const seat = seatLabel(ch.fromAgent);
      const targetSeat = seatLabel(ch.targetAgent);
      const typeLabel = CHALLENGE_TYPE_LABEL[ch.challengeType];
      return {
        id: `r2-${ch.challengeId}`,
        roleId: seat.roleId,
        displayName: seat.displayName,
        round: 2 as const,
        stance: (decision.stance === "oppose" ? "oppose" : "conditional") as ExpertStatement["stance"],
        claim: clip(ch.statement, 72),
        reasons: [
          `${typeLabel} · 质疑${COMMITTEE_LABEL[ch.targetCommittee] || targetSeat.displayName}`,
          ch.targetEvidenceId
            ? `点名证据 ${ch.targetEvidenceId}`
            : ch.evidenceRefs?.[0]
              ? `依据 ${ch.evidenceRefs[0]}`
              : "按专业路由发起挑战",
        ],
        challengeTo: `founder.${ch.targetAgent}`,
        challengeEvidenceId: ch.targetEvidenceId || ch.evidenceRefs?.[0],
        evidence: (decision.evidence ?? [])
          .filter((item) => item.evidenceId && item.content)
          .slice(0, 3)
          .map((item) => ({
            evidenceId: item.evidenceId!,
            statement: item.content,
            sourceLabel: item.source || item.label,
          })),
        confidence: decision.confidence,
        evidenceSufficient: decision.evidenceSufficient,
        evidenceGap: decision.evidenceGap,
        validation: decision.validation,
      };
    });
  } else {
    const matrix =
      input.runtime.meeting.conflictMatrix && input.runtime.meeting.conflictMatrix.primary
        ? {
            matrixId: "runtime-cm",
            missionId: "runtime",
            rows: (input.runtime.meeting.conflictMatrix.rows ?? []).map((row) => ({
              topic: row.topic,
              cells: row.cells as Record<string, "+" | "-" | "--" | "0">,
              drivingEvidenceIds: row.drivingEvidenceIds ?? [],
              summary: row.summary,
            })),
            primary: {
              topic: input.runtime.meeting.conflictMatrix.primary.topic,
              sideA: {
                agents: input.runtime.meeting.conflictMatrix.primary.sideA
                  .agents as FounderDecision["sourceAgent"][],
                claim: input.runtime.meeting.conflictMatrix.primary.sideA.claim,
                polarity: "+" as const,
              },
              sideB: {
                agents: input.runtime.meeting.conflictMatrix.primary.sideB
                  .agents as FounderDecision["sourceAgent"][],
                claim: input.runtime.meeting.conflictMatrix.primary.sideB.claim,
                polarity: "--" as const,
              },
              drivingEvidenceIds:
                input.runtime.meeting.conflictMatrix.primary.drivingEvidenceIds ?? [],
              question:
                input.runtime.meeting.conflictMatrix.primary.question ||
                "为什么你的判断比对方更重要？",
            },
            tradeoffs: input.runtime.meeting.conflictMatrix.tradeoffs ?? [],
            createdAt: new Date().toISOString(),
          }
        : buildConflictMatrix({
            missionId: "runtime",
            decisions,
          });

    const challenges = buildChallengeStatements({ decisions, matrix });
    statements = challenges.map((challenge, index) => {
      const decision = decisions[index]!;
      const seat = seatLabel(challenge.agent);
      return {
        id: "r2-" + decision.decisionId,
        roleId: seat.roleId,
        displayName: seat.displayName,
        round: 2 as const,
        stance: (decision.stance === "oppose" ? "oppose" : "conditional") as ExpertStatement["stance"],
        claim: clip(challenge.claim, 64),
        reasons: challenge.reasons,
        challengeTo: challenge.challengeTo,
        challengeEvidenceId: challenge.challengeEvidenceId,
        evidence: (decision.evidence ?? [])
          .filter((item) => item.evidenceId && item.content)
          .slice(0, 3)
          .map((item) => ({
            evidenceId: item.evidenceId!,
            statement: item.content,
            sourceLabel: item.source || item.label,
          })),
        confidence: decision.confidence,
        evidenceSufficient: decision.evidenceSufficient,
        evidenceGap: decision.evidenceGap,
        validation: decision.validation,
      };
    });
  }

  const matrixPrimary = input.runtime.meeting.conflictMatrix?.primary;

  return {
    round: 2,
    statements: input.previous.filter((s) => s.round === 1).concat(statements),
    conflict: conflict || {
      id: matrixPrimary ? `cm-${matrixPrimary.topic}` : "conflict-matrix",
      issue: matrixPrimary?.question || `${input.topic} 出现行动取舍冲突`,
      positionA: matrixPrimary?.sideA.claim || "推进时机",
      positionB: matrixPrimary?.sideB.claim || "能力准备",
      conflictLabel: matrixPrimary?.topic || "综合判断",
    },
    consensus: null,
    options: optionsFromRuntime(input.runtime),
  };
}

export function projectRuntimeRound3(input: {
  runtime: RuntimeLike;
  previous: ExpertStatement[];
  topic: string;
  focusChoice?: string | null;
}): DeliberationResult {
  const consensus = consensusFromRuntime(input.runtime, input.topic);
  if (input.focusChoice) {
    consensus.coreReasons = ["创始人关注：" + input.focusChoice].concat(consensus.coreReasons).slice(0, 4);
  }

  const proposal = input.runtime.meeting.debateSession?.proposal;
  const scenario = input.runtime.meeting.debateSession?.scenarioTests?.[0];

  const statements: ExpertStatement[] = input.runtime.decisions.map((decision) => {
    const seat = seatLabel(decision.sourceAgent);
    return {
      id: "r3-" + decision.decisionId,
      roleId: seat.roleId,
      displayName: seat.displayName,
      round: 3 as const,
      stance: (decision.stance === "oppose" ? "conditional" : "support") as ExpertStatement["stance"],
      claim: clip(
        proposal?.decision ||
          decision.nextSteps[0] ||
          input.runtime.finalDecision.validationPlan[0] ||
          input.runtime.meeting.recommendation ||
          "按验证计划推进",
        64,
      ),
      reasons: [
        clip(proposal?.whyNow || consensus.proposedDecision, 100),
        proposal?.conditions[0]
          ? `条件：${clip(proposal.conditions[0], 60)}`
          : decision.nextSteps[0]
            ? `下一步：${clip(decision.nextSteps[0], 60)}`
            : "按验证计划推进",
        scenario ? `若错：${clip(scenario.mitigation, 48)}` : "",
      ].filter(Boolean),
      evidence: (decision.evidence ?? [])
        .filter((item) => item.evidenceId && item.content)
        .slice(0, 3)
        .map((item) => ({
          evidenceId: item.evidenceId!,
          statement: item.content,
          sourceLabel: item.source || item.label,
        })),
      confidence: decision.confidence,
      evidenceSufficient: decision.evidenceSufficient,
      validation:
        proposal?.validationPlan ||
        decision.validation ||
        decision.nextSteps[0] ||
        input.runtime.finalDecision.validationPlan[0],
    };
  });

  return {
    round: 3,
    statements: input.previous.filter((s) => s.round === 1 || s.round === 2).concat(statements),
    conflict: conflictFromRuntime(input.runtime),
    consensus,
    options: optionsFromRuntime(input.runtime),
  };
}
