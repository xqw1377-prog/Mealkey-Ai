/**
 * M-ED 治理决策合同 — draft / propose / freeze
 */
import type {
  AdvisorStrategySet,
  DecisionArtifact,
  ExecutionDeliveryPack,
  WarRoomConsensus,
} from "../../consulting-os/types";
import { createId } from "../../consulting-os/types";
import type { GovernanceContract, GovernanceScheme } from "./types";

const SEAT_LABEL: Record<string, string> = {
  capital: "资本席",
  founder: "创始人席",
  risk: "风控席",
  govern: "治理席",
};

function resolvePrimary(
  advisors: AdvisorStrategySet | undefined,
  war: WarRoomConsensus | undefined,
) {
  if (!advisors?.strategies?.length) return undefined;
  const pref = war?.userPreference;
  if (pref && pref !== "blend") {
    return advisors.strategies.find((s) => s.advisorId === pref);
  }
  return advisors.strategies[0];
}

export function draftGovernanceContract(input: {
  decision: DecisionArtifact;
  warRoom: WarRoomConsensus;
  advisors?: AdvisorStrategySet;
  governancePack?: ExecutionDeliveryPack | null;
  answers?: Record<string, string>;
}): GovernanceContract {
  const primary = resolvePrimary(input.advisors, input.warRoom);
  const scheme = primary?.governScheme as GovernanceScheme | undefined;
  const rejected =
    input.advisors?.strategies
      .filter((s) => s.advisorId !== primary?.advisorId)
      .map((s) => ({
        summary: s.oneLiner,
        reason: "本阶段不作为同期治理主锁",
      })) || [];

  const oneLiner =
    input.warRoom.consensusOneLiner ||
    input.decision.recommendation ||
    scheme?.lockFirst ||
    "已确认的治理主锁";

  return {
    contractId: createId("gcontract"),
    version: 1,
    status: "draft",
    oneLiner,
    lockFirst: scheme?.lockFirst || oneLiner,
    controlFloor:
      input.answers?.control ||
      scheme?.lockFirst ||
      input.governancePack?.oneLiner ||
      undefined,
    mustSign:
      scheme?.mustSign?.slice(0, 3).join(" / ") ||
      input.governancePack?.wallCard?.slice(0, 80),
    vestingNote: scheme?.weekProof,
    tradeoffAccepted: input.decision.tradeoffAccepted,
    killCriteria: input.decision.killCriteria.slice(0, 4),
    mondayMoves: input.decision.mondayMoves.slice(0, 4),
    evidenceUsed: input.decision.evidenceUsed.slice(0, 6),
    whatWeWontDo: input.decision.whatWeWontDo.slice(0, 4),
    wallCard: input.governancePack?.wallCard,
    governancePackMarkdown: input.governancePack?.markdown,
    rejectedAlternatives: rejected.slice(0, 3),
    seatId: primary?.advisorId,
    seatLabel:
      SEAT_LABEL[primary?.advisorId || ""] ||
      primary?.advisorId ||
      "拍板席",
  };
}

export function proposeGovernanceContract(
  contract: GovernanceContract,
): GovernanceContract {
  if (contract.status === "frozen") {
    throw new Error("合同已冻结，不能再次提出");
  }
  const missing: string[] = [];
  if (!contract.oneLiner?.trim()) missing.push("oneLiner");
  if (!contract.tradeoffAccepted?.trim()) missing.push("tradeoffAccepted");
  if ((contract.killCriteria?.length || 0) < 2) missing.push("killCriteria>=2");
  if ((contract.mondayMoves?.length || 0) < 3) missing.push("mondayMoves>=3");
  if (missing.length) {
    throw new Error(`治理合同未齐，待补：${missing.join("；")}`);
  }
  return { ...contract, status: "proposed" };
}

export function freezeGovernanceContract(
  contract: GovernanceContract,
): GovernanceContract {
  if (contract.status !== "proposed" && contract.status !== "draft") {
    throw new Error(`冻结前状态无效：${contract.status}`);
  }
  const proposed =
    contract.status === "draft"
      ? proposeGovernanceContract(contract)
      : contract;
  return {
    ...proposed,
    status: "frozen",
    frozenAt: new Date().toISOString(),
  };
}
