import type {
  FounderDecision,
  FounderDecisionContract,
  FounderFinalDecision,
  FounderMeeting,
  FounderMission,
} from "../contracts";
import { assembleFounderDecisionContract } from "./contract-v2";

export interface FounderDecisionEngineInput {
  mission: FounderMission;
  meeting: FounderMeeting;
  decisions: FounderDecision[];
  projectId?: string;
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
  // 优先对齐 Debate Engine 提案（压力测试后的收口）
  const proposal = meeting.debateSession?.proposal?.decision?.trim();
  if (proposal) {
    if (/不开放加盟|暂缓|拒绝|不建议|反对/.test(proposal)) return "暂缓推进";
    if (/带条件|验证|先完成|先锁|直营复制|稀释上限/.test(proposal)) return "带条件推进";
    if (/按共识推进|可以进入|继续/.test(proposal)) return "继续推进";
    // 有明确提案文案时，仍用带条件作为默认安全档，避免冲掉约束
    return "带条件推进";
  }

  const opposeCount = decisions.filter((item) => item.stance === "oppose").length;
  const supportCount = decisions.filter((item) => item.stance === "support").length;

  if (opposeCount > supportCount) return "暂缓推进";
  if (meeting.conflicts.length > 0) return "带条件推进";
  return "继续推进";
}

export function buildFounderFinalDecision(
  input: FounderDecisionEngineInput,
): FounderFinalDecision & { contract?: FounderDecisionContract } {
  const chosen = chooseDecision(input.meeting, input.decisions);
  const reason = input.decisions.map((item) => item.judgement).filter(Boolean).slice(0, 3);
  const validationPlan = [...new Set(input.decisions.flatMap((item) => item.nextSteps).filter(Boolean))].slice(0, 4);
  const evidenceIds = [
    ...new Set(
      input.decisions.flatMap((item) =>
        item.evidence.map((ev) => ev.evidenceId).filter((id): id is string => Boolean(id)),
      ),
    ),
  ].slice(0, 24);
  const evidenceStatus = input.decisions.every((item) => item.evidenceSufficient !== false)
    ? "sufficient"
    : "insufficient";

  const contract = assembleFounderDecisionContract({
    projectId: input.projectId || "unknown-project",
    mission: input.mission,
    meeting: input.meeting,
    seatDecisions: input.decisions,
    chosen,
    evidenceStatus,
    evidenceIds,
  });

  return {
    finalDecisionId: buildFinalDecisionId(),
    missionId: input.mission.missionId,
    problem: input.mission.question,
    options: buildDecisionOptions(input.decisions),
    chosen,
    reason,
    validationPlan,
    status:
      contract.status === "VALIDATION_REQUIRED"
        ? "proposed"
        : contract.status === "READY_FOR_APPROVAL"
          ? "proposed"
          : "proposed",
    createdAt: new Date().toISOString(),
    evidenceStatus,
    evidenceIds,
    contract,
  };
}
