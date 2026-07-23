import type {
  FounderDecision,
  FounderMeeting,
  FounderMeetingInput,
  MeetingConflict,
  MeetingRound,
} from "../contracts";

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

function buildRoundOne(decisions: FounderDecision[]): MeetingRound {
  return {
    round: 1,
    title: "专家独立判断",
    items: decisions.map((decision) => ({
      agent: decision.sourceAgent,
      summary: decision.judgement,
      stance: decision.stance,
    })),
  };
}

function detectConflicts(missionId: string, decisions: FounderDecision[]): MeetingConflict[] {
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

function buildRoundTwo(conflicts: MeetingConflict[]): MeetingRound {
  return {
    round: 2,
    title: "观点冲突暴露",
    items:
      conflicts.length > 0
        ? conflicts.map((conflict) => ({
            agent: conflict.agents[0] ?? "M-BIZ",
            summary: conflict.summary,
          }))
        : [
            {
              agent: "M-BIZ",
              summary: "本轮专家意见整体一致，未出现明显冲突。",
            },
          ],
  };
}

function buildRecommendation(decisions: FounderDecision[], conflicts: MeetingConflict[]) {
  const opposeCount = decisions.filter((item) => item.stance === "oppose").length;
  const supportCount = decisions.filter((item) => item.stance === "support").length;
  const nextSteps = [...new Set(decisions.flatMap((item) => item.nextSteps).filter(Boolean))].slice(0, 3);

  if (opposeCount > supportCount) {
    return nextSteps.length > 0
      ? `综合判断：当前不建议直接推进，建议先完成 ${nextSteps.join("、")}。`
      : "综合判断：当前不建议直接推进，建议先补齐关键验证。";
  }

  if (conflicts.length > 0) {
    return nextSteps.length > 0
      ? `综合判断：可以谨慎推进，但必须先完成 ${nextSteps.join("、")}。`
      : "综合判断：可以谨慎推进，但需要带条件执行。";
  }

  return nextSteps.length > 0
    ? `综合判断：当前方向基本成立，下一步优先执行 ${nextSteps.join("、")}。`
    : "综合判断：当前方向基本成立，可以进入下一阶段。";
}

function buildRoundThree(recommendation: string): MeetingRound {
  return {
    round: 3,
    title: "综合建议",
    items: [
      {
        agent: "M-BIZ",
        summary: recommendation,
      },
    ],
  };
}

export function buildFounderMeeting(input: FounderMeetingInput): FounderMeeting {
  const conflicts = detectConflicts(input.mission.missionId, input.decisions);
  const recommendation = buildRecommendation(input.decisions, conflicts);

  return {
    meetingId: buildMeetingId(),
    missionId: input.mission.missionId,
    topic: input.mission.mission,
    experts: input.decisions.map((item) => item.sourceAgent),
    rounds: [
      buildRoundOne(input.decisions),
      buildRoundTwo(conflicts),
      buildRoundThree(recommendation),
    ],
    conflicts,
    recommendation,
    createdAt: new Date().toISOString(),
  };
}
