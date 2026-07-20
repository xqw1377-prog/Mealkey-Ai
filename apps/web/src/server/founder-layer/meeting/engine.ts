import type {
  FounderDecision,
  FounderMeeting,
  FounderMeetingInput,
  MeetingConflict,
  MeetingRound,
} from "../contracts";
import {
  buildConflictMatrix,
  conflictMatrixToMeetingConflict,
} from "./conflict-matrix";
import { buildDebateSession } from "./debate-engine";
import { CHALLENGE_TYPE_LABEL } from "../contracts/debate-session";

function buildMeetingId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `founder-meeting-${Date.now()}`;
}

function buildConflictId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `meeting-conflict-${Date.now()}`;
}

function detectConflictsFallback(missionId: string, decisions: FounderDecision[]): MeetingConflict[] {
  const supports = decisions.filter((item) => item.stance === "support");
  const opposes = decisions.filter((item) => item.stance === "oppose");

  if (supports.length === 0 || opposes.length === 0) return [];

  return [
    {
      conflictId: buildConflictId(),
      missionId,
      dimension: "综合判断",
      summary: "不同专家对当前行动节奏出现明显分歧。",
      agents: [...new Set([...supports, ...opposes].map((item) => item.sourceAgent))],
      sideA: supports.map((item) => `${item.sourceAgent}：${item.judgement}`).join("；"),
      sideB: opposes.map((item) => `${item.sourceAgent}：${item.judgement}`).join("；"),
      severity: "high",
    },
  ];
}

function buildRecommendation(
  decisions: FounderDecision[],
  conflicts: MeetingConflict[],
  tradeoffs: ReturnType<typeof buildConflictMatrix>["tradeoffs"],
  proposalDecision?: string,
) {
  if (proposalDecision) {
    return proposalDecision;
  }
  const opposeCount = decisions.filter((item) => item.stance === "oppose").length;
  const supportCount = decisions.filter((item) => item.stance === "support").length;
  const nextSteps = [...new Set(decisions.flatMap((item) => item.nextSteps).filter(Boolean))].slice(0, 3);
  const tradeoffLine = tradeoffs[0]
    ? `取舍：保留「${tradeoffs[0].keep}」，暂缓「${tradeoffs[0].giveUp}」。`
    : "";

  if (opposeCount > supportCount) {
    return nextSteps.length > 0
      ? `综合判断：当前不建议直接推进，建议先完成 ${nextSteps.join("、")}。${tradeoffLine}`
      : `综合判断：当前不建议直接推进，建议先补齐关键验证。${tradeoffLine}`;
  }

  if (conflicts.length > 0) {
    return nextSteps.length > 0
      ? `综合判断：可以谨慎推进，但必须先完成 ${nextSteps.join("、")}。${tradeoffLine}`
      : `综合判断：可以谨慎推进，但需要带条件执行。${tradeoffLine}`;
  }

  return nextSteps.length > 0
    ? `综合判断：当前方向基本成立，下一步优先执行 ${nextSteps.join("、")}。`
    : "综合判断：当前方向基本成立，可以进入下一阶段。";
}

function roundsFromDebateSession(
  debate: ReturnType<typeof buildDebateSession>,
): MeetingRound[] {
  const r1 = debate.rounds.find((r) => r.round === 1);
  const r2 = debate.rounds.find((r) => r.round === 2);
  const r3 = debate.rounds.find((r) => r.round === 3);

  return [
    {
      round: 1,
      title: r1?.title || "Round 1 · 独立判断",
      items: (r1?.items ?? []).map((item) => ({
        agent: item.agent,
        summary: item.claim,
        stance: item.position === "neutral" ? undefined : item.position,
      })),
    },
    {
      round: 2,
      title: r2?.title || "Round 2 · 压力测试",
      items: (r2?.challenges ?? debate.challenges).map((ch) => ({
        agent: ch.fromAgent,
        summary: `[${CHALLENGE_TYPE_LABEL[ch.challengeType]}] ${ch.statement}`,
        challengeTo: `founder.${ch.targetAgent}`,
        challengeEvidenceId: ch.targetEvidenceId || ch.evidenceRefs?.[0],
      })),
    },
    {
      round: 3,
      title: r3?.title || "Round 3 · 决策提案",
      items: (r3?.items ?? []).map((item) => ({
        agent: item.agent,
        summary: item.claim,
        stance: item.position === "neutral" ? undefined : item.position,
      })),
    },
  ];
}

export function buildFounderMeeting(input: FounderMeetingInput): FounderMeeting {
  const debateSession = buildDebateSession({
    missionId: input.mission.missionId,
    decisions: input.decisions,
  });

  const conflictMatrix = debateSession.conflictMatrix || buildConflictMatrix({
    missionId: input.mission.missionId,
    decisions: input.decisions,
  });
  const matrixConflict = conflictMatrixToMeetingConflict(conflictMatrix);
  const conflicts = matrixConflict
    ? [
        {
          ...matrixConflict,
          drivingEvidenceIds: conflictMatrix.primary?.drivingEvidenceIds,
        },
      ]
    : detectConflictsFallback(input.mission.missionId, input.decisions);

  const recommendation = buildRecommendation(
    input.decisions,
    conflicts,
    conflictMatrix.tradeoffs,
    debateSession.proposal?.decision,
  );

  return {
    meetingId: buildMeetingId(),
    missionId: input.mission.missionId,
    topic: input.mission.mission,
    experts: input.decisions.map((item) => item.sourceAgent),
    rounds: roundsFromDebateSession(debateSession),
    conflicts,
    conflictMatrix,
    debateSession,
    recommendation,
    createdAt: new Date().toISOString(),
  };
}
