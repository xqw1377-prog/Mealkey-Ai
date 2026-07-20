/**
 * M-BIZ 六步确认 → 模式合同冻结 + 签字就绪
 */
import {
  assertSeatDecisionReady,
  assertSeatResearchReady,
} from "../../consulting-os/delivery-gates";
import { harvestSeatPrimaryFacts } from "../../consulting-os/seat-evidence";
import type {
  AgentConsultingProject,
  DecisionArtifact,
  ExecutionRoadmap,
  WarRoomConsensus,
} from "../../consulting-os/types";
import {
  draftModeContract,
  freezeModeContract,
  proposeModeContract,
} from "./mode-contract-engine";
import type { ModeContract } from "./types";

/** 确认策略前：调研证据硬门禁 + 决策包硬门槛 */
export function assertMbizConfirmReady(project: AgentConsultingProject): void {
  assertSeatResearchReady(project.assets.research, "模式主航道");
  const war = project.assets.warRoom;
  if (!war || war.status !== "agreed") {
    throw new Error("证据未齐，不能确认模式主航道。待补：会议室尚未拍板");
  }
  if (!(war.consensusOneLiner || "").trim()) {
    throw new Error("证据未齐，不能确认模式主航道。待补：缺少共识一句话");
  }
}

export function assertDecisionArtifactReady(decision: DecisionArtifact): void {
  assertSeatDecisionReady(decision);
}

/** 会议拍板后写入模式合同草稿（不吞错） */
export function ensureWarRoomModeContractDraft(
  project: AgentConsultingProject,
  input: {
    decision: DecisionArtifact;
    warRoom: WarRoomConsensus;
    modePack?: ExecutionRoadmap["modePack"];
  },
): AgentConsultingProject {
  const existing = project.assets.modeContract as ModeContract | undefined;
  if (
    existing &&
    (existing.status === "proposed" || existing.status === "frozen")
  ) {
    return project;
  }

  assertDecisionArtifactReady(input.decision);
  const draft = draftModeContract({
    decision: input.decision,
    warRoom: input.warRoom,
    advisors: project.assets.advisors,
    modePack: input.modePack,
    answers: project.intakeAnswers,
  });

  return {
    ...project,
    assets: {
      ...project.assets,
      modeContract: draft,
      decisionArtifact: input.decision,
      signOffStatus: project.assets.signOffStatus || "draft",
    },
    updatedAt: new Date().toISOString(),
  };
}

export type MbizFinalizeResult = {
  project: AgentConsultingProject;
  contract: ModeContract;
};

/**
 * 确认策略：冻结 Mode Contract，进入签字就绪（in_review）
 */
export function finalizeSixStepModeDeliverable(
  project: AgentConsultingProject,
  input: {
    decision: DecisionArtifact;
    warRoom: WarRoomConsensus;
    roadmap?: ExecutionRoadmap;
    strategyReportMarkdown?: string;
  },
): MbizFinalizeResult {
  assertMbizConfirmReady(project);
  assertDecisionArtifactReady(input.decision);

  let next = ensureWarRoomModeContractDraft(project, {
    decision: input.decision,
    warRoom: input.warRoom,
    modePack: input.roadmap?.modePack,
  });

  let contract = next.assets.modeContract as ModeContract;
  if (!contract) {
    throw new Error("模式合同未能生成");
  }

  if (contract.status !== "frozen") {
    // 确认时用最新决策包与作战卡刷新草稿再冻
    contract = draftModeContract({
      decision: input.decision,
      warRoom: input.warRoom,
      advisors: next.assets.advisors,
      modePack: input.roadmap?.modePack,
      answers: next.intakeAnswers,
    });
    contract = {
      ...contract,
      contractId: next.assets.modeContract?.contractId || contract.contractId,
      version: (next.assets.modeContract?.version || 0) + 1,
    };
    contract = proposeModeContract(contract);
    contract = freezeModeContract(contract);
  }

  if (!input.roadmap?.modePack?.wallCard && !contract.wallCard) {
    throw new Error("模式作战卡未生成，不能冻结交付");
  }

  const primaryFacts =
    next.assets.primaryFacts && next.assets.primaryFacts.length >= 2
      ? next.assets.primaryFacts
      : harvestSeatPrimaryFacts(next.assets.research);

  next = {
    ...next,
    assets: {
      ...next.assets,
      modeContract: contract,
      decisionArtifact: input.decision,
      executionRoadmap: input.roadmap || next.assets.executionRoadmap,
      strategyReportMarkdown:
        input.strategyReportMarkdown || next.assets.strategyReportMarkdown,
      primaryFacts,
      strategyConfirmedAt: new Date().toISOString(),
      signOffStatus:
        next.assets.signOffStatus === "signed" ? "signed" : "in_review",
    },
    updatedAt: new Date().toISOString(),
  };

  return { project: next, contract };
}
