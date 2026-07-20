/**
 * M-ED 六步确认 → 治理合同冻结 + 签字就绪
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
  draftGovernanceContract,
  freezeGovernanceContract,
  proposeGovernanceContract,
} from "./governance-contract-engine";
import type { GovernanceContract } from "./types";

export function assertMedConfirmReady(project: AgentConsultingProject): void {
  assertSeatResearchReady(project.assets.research, "治理主锁");
  const war = project.assets.warRoom;
  if (!war || war.status !== "agreed") {
    throw new Error("证据未齐，不能确认治理主锁。待补：会议室尚未拍板");
  }
  if (!(war.consensusOneLiner || "").trim()) {
    throw new Error("证据未齐，不能确认治理主锁。待补：缺少共识一句话");
  }
}

export function assertDecisionArtifactReady(decision: DecisionArtifact): void {
  assertSeatDecisionReady(decision);
}

export function ensureWarRoomGovernanceContractDraft(
  project: AgentConsultingProject,
  input: {
    decision: DecisionArtifact;
    warRoom: WarRoomConsensus;
    governancePack?: ExecutionRoadmap["governancePack"];
  },
): AgentConsultingProject {
  const existing = project.assets.governanceContract as
    | GovernanceContract
    | undefined;
  if (
    existing &&
    (existing.status === "proposed" || existing.status === "frozen")
  ) {
    return project;
  }

  assertDecisionArtifactReady(input.decision);
  const draft = draftGovernanceContract({
    decision: input.decision,
    warRoom: input.warRoom,
    advisors: project.assets.advisors,
    governancePack: input.governancePack,
    answers: project.intakeAnswers,
  });

  return {
    ...project,
    assets: {
      ...project.assets,
      governanceContract: draft,
      decisionArtifact: input.decision,
      signOffStatus: project.assets.signOffStatus || "draft",
    },
    updatedAt: new Date().toISOString(),
  };
}

export type MedFinalizeResult = {
  project: AgentConsultingProject;
  contract: GovernanceContract;
};

export function finalizeSixStepGovernanceDeliverable(
  project: AgentConsultingProject,
  input: {
    decision: DecisionArtifact;
    warRoom: WarRoomConsensus;
    roadmap?: ExecutionRoadmap;
    strategyReportMarkdown?: string;
  },
): MedFinalizeResult {
  assertMedConfirmReady(project);
  assertDecisionArtifactReady(input.decision);

  let next = ensureWarRoomGovernanceContractDraft(project, {
    decision: input.decision,
    warRoom: input.warRoom,
    governancePack: input.roadmap?.governancePack,
  });

  let contract = next.assets.governanceContract as GovernanceContract;
  if (!contract) throw new Error("治理合同未能生成");

  if (contract.status !== "frozen") {
    contract = draftGovernanceContract({
      decision: input.decision,
      warRoom: input.warRoom,
      advisors: next.assets.advisors,
      governancePack: input.roadmap?.governancePack,
      answers: next.intakeAnswers,
    });
    contract = {
      ...contract,
      contractId:
        next.assets.governanceContract?.contractId || contract.contractId,
      version: (next.assets.governanceContract?.version || 0) + 1,
    };
    contract = proposeGovernanceContract(contract);
    contract = freezeGovernanceContract(contract);
  }

  if (!input.roadmap?.governancePack?.wallCard && !contract.wallCard) {
    throw new Error("协议清单包未生成，不能冻结交付");
  }

  const primaryFacts =
    next.assets.primaryFacts && next.assets.primaryFacts.length >= 2
      ? next.assets.primaryFacts
      : harvestSeatPrimaryFacts(next.assets.research);

  next = {
    ...next,
    assets: {
      ...next.assets,
      governanceContract: contract,
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
