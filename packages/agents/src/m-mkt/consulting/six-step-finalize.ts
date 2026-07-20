/**
 * M-MKT 六步确认 → 进入合同冻结 + 签字就绪
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
  draftEntryContract,
  freezeEntryContract,
  proposeEntryContract,
} from "./entry-contract-engine";
import type { EntryContract } from "./types";

export function assertMmktConfirmReady(project: AgentConsultingProject): void {
  assertSeatResearchReady(project.assets.research, "进入决策");
  const war = project.assets.warRoom;
  if (!war || war.status !== "agreed") {
    throw new Error("证据未齐，不能确认进入决策。待补：会议室尚未拍板");
  }
  if (!(war.consensusOneLiner || "").trim()) {
    throw new Error("证据未齐，不能确认进入决策。待补：缺少共识一句话");
  }
}

export function assertDecisionArtifactReady(decision: DecisionArtifact): void {
  assertSeatDecisionReady(decision);
}

export function ensureWarRoomEntryContractDraft(
  project: AgentConsultingProject,
  input: {
    decision: DecisionArtifact;
    warRoom: WarRoomConsensus;
    entryPack?: ExecutionRoadmap["entryPack"];
  },
): AgentConsultingProject {
  const existing = project.assets.entryContract as EntryContract | undefined;
  if (
    existing &&
    (existing.status === "proposed" || existing.status === "frozen")
  ) {
    return project;
  }

  assertDecisionArtifactReady(input.decision);
  const draft = draftEntryContract({
    decision: input.decision,
    warRoom: input.warRoom,
    advisors: project.assets.advisors,
    entryPack: input.entryPack,
    answers: project.intakeAnswers,
  });

  return {
    ...project,
    assets: {
      ...project.assets,
      entryContract: draft,
      decisionArtifact: input.decision,
      signOffStatus: project.assets.signOffStatus || "draft",
    },
    updatedAt: new Date().toISOString(),
  };
}

export type MmktFinalizeResult = {
  project: AgentConsultingProject;
  contract: EntryContract;
};

export function finalizeSixStepEntryDeliverable(
  project: AgentConsultingProject,
  input: {
    decision: DecisionArtifact;
    warRoom: WarRoomConsensus;
    roadmap?: ExecutionRoadmap;
    strategyReportMarkdown?: string;
  },
): MmktFinalizeResult {
  assertMmktConfirmReady(project);
  assertDecisionArtifactReady(input.decision);

  let next = ensureWarRoomEntryContractDraft(project, {
    decision: input.decision,
    warRoom: input.warRoom,
    entryPack: input.roadmap?.entryPack,
  });

  let contract = next.assets.entryContract as EntryContract;
  if (!contract) throw new Error("进入合同未能生成");

  if (contract.status !== "frozen") {
    contract = draftEntryContract({
      decision: input.decision,
      warRoom: input.warRoom,
      advisors: next.assets.advisors,
      entryPack: input.roadmap?.entryPack,
      answers: next.intakeAnswers,
    });
    contract = {
      ...contract,
      contractId: next.assets.entryContract?.contractId || contract.contractId,
      version: (next.assets.entryContract?.version || 0) + 1,
    };
    contract = proposeEntryContract(contract);
    contract = freezeEntryContract(contract);
  }

  if (!input.roadmap?.entryPack?.wallCard && !contract.wallCard) {
    throw new Error("进入作战卡未生成，不能冻结交付");
  }

  const primaryFacts =
    next.assets.primaryFacts && next.assets.primaryFacts.length >= 2
      ? next.assets.primaryFacts
      : harvestSeatPrimaryFacts(next.assets.research);

  next = {
    ...next,
    assets: {
      ...next.assets,
      entryContract: contract,
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
