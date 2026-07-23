import type {
  FounderDecision,
  FounderFinalDecision,
  FounderMeeting,
  FounderMission,
} from "../contracts";

export interface FounderDecisionEngineInput {
  mission: FounderMission;
  meeting: FounderMeeting;
  decisions: FounderDecision[];
}

function buildFinalDecisionId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `founder-final-decision-${Date.now()}`;
}

function buildDecisionOptions(decisions: FounderDecision[]) {
  const supportAgents = decisions
    .filter((item) => item.stance === "support")
    .map((item) => item.sourceAgent);
  const conditionalAgents = decisions
    .filter((item) => item.stance === "conditional")
    .map((item) => item.sourceAgent);
  const opposeAgents = decisions
    .filter((item) => item.stance === "oppose")
    .map((item) => item.sourceAgent);

  return [
    {
      label: "继续推进",
      summary: "当前判断支持直接进入下一阶段执行。",
      supportedBy: supportAgents,
    },
    {
      label: "带条件推进",
      summary: "可以继续，但必须先完成关键验证动作。",
      supportedBy: conditionalAgents,
    },
    {
      label: "暂缓推进",
      summary: "当前阶段先不要放大动作，优先补齐前置条件。",
      supportedBy: opposeAgents,
    },
  ];
}

function chooseDecision(meeting: FounderMeeting, decisions: FounderDecision[]) {
  const opposeCount = decisions.filter((item) => item.stance === "oppose").length;
  const supportCount = decisions.filter((item) => item.stance === "support").length;

  if (opposeCount > supportCount) return "暂缓推进";
  if (meeting.conflicts.length > 0) return "带条件推进";
  return "继续推进";
}

export function buildFounderFinalDecision(
  input: FounderDecisionEngineInput,
): FounderFinalDecision {
  const chosen = chooseDecision(input.meeting, input.decisions);
  const reason = input.decisions.map((item) => item.judgement).filter(Boolean).slice(0, 3);
  const validationPlan = [...new Set(input.decisions.flatMap((item) => item.nextSteps).filter(Boolean))].slice(0, 4);

  return {
    finalDecisionId: buildFinalDecisionId(),
    missionId: input.mission.missionId,
    problem: input.mission.question,
    options: buildDecisionOptions(input.decisions),
    chosen,
    reason,
    validationPlan,
    status: "proposed",
    createdAt: new Date().toISOString(),
  };
}
