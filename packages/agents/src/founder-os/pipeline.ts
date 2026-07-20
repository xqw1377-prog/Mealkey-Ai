/**
 * Expert → Council 协同流水线（编排，不二次研究）
 */

import { getDecisionType } from "./catalog";
import { buildDecisionBrief } from "./decision-brief";
import { classifyIssueLevel } from "./cdo";
import { buildCouncilRuntimePrompt, classifyDecisionType } from "./prompt-stack";
import { attachWeights, resolveCouncilDecision } from "./resolution";
import type {
  CasePacket,
  CouncilOpinion,
  CouncilPipelineResult,
  CouncilRoleId,
  DecisionBrief,
  EvidencePacket,
  ExpertReport,
  IssueLevel,
} from "./types";
import { COUNCIL_ROLE_IDS } from "./catalog";

export type PipelineStage =
  | "intake"
  | "expert_research"
  | "evidence_compile"
  | "council_blind"
  | "council_debate"
  | "resolution"
  | "founder_override"
  | "decision_brief"
  | "validation";

export const PIPELINE_STAGES: PipelineStage[] = [
  "intake",
  "expert_research",
  "evidence_compile",
  "council_blind",
  "council_debate",
  "resolution",
  "founder_override",
  "decision_brief",
  "validation",
];

export interface RunCouncilPipelineInput {
  casePacket: CasePacket;
  expertReports: ExpertReport[];
  evidencePacket?: EvidencePacket;
  /** Round 3 终态意见（由 LLM/启发式产出后注入） */
  councilOpinions: CouncilOpinion[];
  founderConfirmed?: boolean;
  unresolvedQuestions?: string[];
  /** 议题级别；缺省由 decisionType 推断 */
  level?: IssueLevel;
}

/**
 * 在已有 Expert Reports + Council Opinions 上完成决议与 Brief 组装。
 * 研究阶段由 Expert Engines / 咨询室完成，本函数不重做分析。
 */
export function assembleCouncilOutcome(
  input: RunCouncilPipelineInput,
): CouncilPipelineResult {
  const dt = getDecisionType(input.casePacket.decisionType);
  const required = (
    input.casePacket.requiredAgents ?? dt.default_required_agents
  ) as string[];
  const present = new Set(input.expertReports.map((r) => r.engineId));
  const missingEngines = required.filter((id) => !present.has(id as ExpertReport["engineId"]));

  const opinions = attachWeights(
    input.councilOpinions,
    input.casePacket.decisionType,
  );

  const level =
    input.level ??
    classifyIssueLevel(input.casePacket.decisionType);

  const resolution = resolveCouncilDecision({
    decisionType: input.casePacket.decisionType,
    opinions,
    founderConfirmed: input.founderConfirmed,
    level,
    unresolvedQuestions: [
      ...(input.unresolvedQuestions ?? []),
      ...missingEngines.map((e) => `缺失 Expert Report：${e}`),
    ],
  });

  const brief: DecisionBrief = buildDecisionBrief({
    casePacket: input.casePacket,
    evidencePacket: input.evidencePacket,
    expertReports: input.expertReports,
    councilOpinions: opinions,
    resolution,
  });

  return {
    stage: "decision_brief",
    missingEngines,
    resolution,
    brief,
  };
}

/** 为全部常委生成 Round1 盲评 Prompt（注入专家报告，禁止重研） */
export function buildBlindRoundPrompts(input: {
  casePacket: CasePacket;
  expertReports: ExpertReport[];
  evidencePacket?: EvidencePacket;
}): Record<CouncilRoleId, string> {
  const out = {} as Record<CouncilRoleId, string>;
  for (const roleId of COUNCIL_ROLE_IDS) {
    out[roleId] = buildCouncilRuntimePrompt({
      roleId,
      casePacket: input.casePacket,
      evidencePacket: input.evidencePacket,
      expertReports: input.expertReports,
      round: 1,
    });
  }
  return out;
}

export function suggestCasePacket(partial: {
  caseId: string;
  question: string;
  objective?: string;
  decisionType?: CasePacket["decisionType"];
  founderView?: CasePacket["founderView"];
}): CasePacket {
  const decisionType =
    partial.decisionType ?? classifyDecisionType(partial.question);
  const dt = getDecisionType(decisionType);
  return {
    caseId: partial.caseId,
    question: partial.question,
    objective: partial.objective,
    decisionType,
    founderView: partial.founderView,
    requiredAgents: dt.default_required_agents,
  };
}
