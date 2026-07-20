/**
 * 把 founder-layer 运行时结果投影回 Gateway 合同（MeetingMission / ExpertOpinion）
 * 供 startMeeting 与现有会议桌消费，不改前端契约。
 */

import type { FounderDecision, FounderMission } from "../contracts";
import type { FounderRuntimeResult } from "../runtime/orchestrator";
import type {
  CompanyContext,
  ExpertOpinion,
  FounderAgentId,
  MeetingMission,
} from "@/server/founder/contracts";
import { AGENT_SEAT } from "@/server/founder/contracts";

function clip(text: string, max = 120): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "本轮判断仍需更多事实。";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function toFounderAgentId(agent: string): FounderAgentId {
  if (agent === "M-PNT" || agent === "M-MKT" || agent === "M-BIZ" || agent === "M-ED" || agent === "CHIEF") {
    return agent;
  }
  return "CHIEF";
}

export function projectMeetingMission(input: {
  runtime: Pick<FounderRuntimeResult, "mission">;
  companyId: string;
  companyContext: CompanyContext;
  topic?: string;
}): MeetingMission {
  const { mission } = input.runtime;
  return {
    missionId: mission.missionId,
    companyId: input.companyId,
    question: mission.question,
    goal: mission.objective,
    topic: input.topic?.trim() || mission.mission,
    requiredAgents: mission.requiredAgents.map(toFounderAgentId),
    companyContext: input.companyContext,
  };
}

export function projectDecisionToOpinion(input: {
  meetingId: string;
  decision: FounderDecision;
}): ExpertOpinion {
  const agentId = toFounderAgentId(input.decision.sourceAgent);
  const seat = AGENT_SEAT[agentId];
  const reasons =
    input.decision.evidence.length > 0
      ? input.decision.evidence.map((item) => `${item.label}：${item.content}`).slice(0, 3)
      : input.decision.nextSteps.slice(0, 2);

  const provider = input.decision.metadata?.provider;
  const judgement = input.decision.judgement || "";
  /** 以 provider 为准；高置信启发式不得冒充真引擎 */
  const degraded =
    provider === "heuristic" ||
    judgement.includes("【启发式】") ||
    judgement.includes("本席暂时降级") ||
    input.decision.confidence < 0.45;

  return {
    opinionId: input.decision.decisionId,
    meetingId: input.meetingId,
    agentId,
    seatLabel: seat.seatLabel,
    stance: input.decision.stance ?? "neutral",
    claim: clip(judgement),
    reasons,
    risks: input.decision.risks.slice(0, 3),
    confidence: input.decision.confidence,
    degraded,
    evidence: input.decision.evidence
      .filter((item) => item.evidenceId && item.content)
      .slice(0, 4)
      .map((item) => ({
        evidenceId: item.evidenceId!,
        statement: item.content,
        sourceLabel: item.source || item.label || "依据",
      })),
    reasoning: input.decision.reasoning,
    assumptions: input.decision.assumptions ?? input.decision.evidenceGap,
    validation: input.decision.validation,
    evidenceSufficient: input.decision.evidenceSufficient,
    createdAt: input.decision.metadata?.producedAt ?? new Date().toISOString(),
  };
}

export function projectOpinionsFromRuntime(input: {
  meetingId: string;
  runtime: Pick<FounderRuntimeResult, "decisions" | "mission">;
}): ExpertOpinion[] {
  const order = input.runtime.mission.requiredAgents;
  const byAgent = new Map(
    input.runtime.decisions.map((decision) => [decision.sourceAgent, decision]),
  );

  return order
    .map((agent) => byAgent.get(agent))
    .filter((decision): decision is FounderDecision => Boolean(decision))
    .map((decision) =>
      projectDecisionToOpinion({
        meetingId: input.meetingId,
        decision,
      }),
    );
}

export function projectSynthesisFromRuntime(input: {
  runtime: Pick<FounderRuntimeResult, "finalDecision" | "meeting">;
}): {
  judgement: string;
  reasons: string[];
  validationPlan: string;
} {
  const { finalDecision, meeting } = input.runtime;
  const judgement =
    finalDecision.reason[0] ||
    meeting.recommendation ||
    `${finalDecision.chosen}：${finalDecision.problem}`;

  return {
    judgement: clip(judgement, 160),
    reasons:
      finalDecision.reason.length > 0
        ? finalDecision.reason.slice(0, 4)
        : meeting.rounds[0]?.items.map((item) => `${item.agent}：${item.summary}`).slice(0, 4) ?? [],
    validationPlan:
      finalDecision.validationPlan.join("；") ||
      meeting.recommendation ||
      "先完成关键验证，再决定是否放大动作。",
  };
}

export interface StartMeetingProjection {
  meetingId: string;
  mission: MeetingMission;
  opinions: ExpertOpinion[];
  synthesis: {
    judgement: string;
    reasons: string[];
    validationPlan: string;
  };
  forceAgents: Array<{
    agentId: FounderAgentId;
    seatLabel: string;
    forceAgent: (typeof AGENT_SEAT)[FounderAgentId]["forceAgent"];
  }>;
  /** 契约层原始结果，供联调 / 后续记忆落库 */
  runtime: FounderRuntimeResult;
}

export function projectStartMeetingPayload(input: {
  meetingId: string;
  companyId: string;
  companyContext: CompanyContext;
  runtime: FounderRuntimeResult;
  topic?: string;
}): StartMeetingProjection {
  const mission = projectMeetingMission({
    runtime: input.runtime,
    companyId: input.companyId,
    companyContext: input.companyContext,
    topic: input.topic,
  });
  const opinions = projectOpinionsFromRuntime({
    meetingId: input.meetingId,
    runtime: input.runtime,
  });
  const synthesis = projectSynthesisFromRuntime({ runtime: input.runtime });

  return {
    meetingId: input.meetingId,
    mission,
    opinions,
    synthesis,
    forceAgents: opinions.map((opinion) => ({
      agentId: opinion.agentId,
      seatLabel: opinion.seatLabel,
      forceAgent: AGENT_SEAT[opinion.agentId].forceAgent,
    })),
    runtime: input.runtime,
  };
}
