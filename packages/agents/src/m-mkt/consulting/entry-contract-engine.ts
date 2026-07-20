/**
 * M-MKT 进入决策合同 — draft / propose / freeze
 */
import type {
  AdvisorStrategySet,
  DecisionArtifact,
  ExecutionDeliveryPack,
  WarRoomConsensus,
} from "../../consulting-os/types";
import { createId } from "../../consulting-os/types";
import type { EntryContract, EntryScheme } from "./types";

const SEAT_LABEL: Record<string, string> = {
  strategy: "市场战略",
  ops: "餐饮经营",
  invest: "投资增长",
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

export function draftEntryContract(input: {
  decision: DecisionArtifact;
  warRoom: WarRoomConsensus;
  advisors?: AdvisorStrategySet;
  entryPack?: ExecutionDeliveryPack | null;
  answers?: Record<string, string>;
}): EntryContract {
  const primary = resolvePrimary(input.advisors, input.warRoom);
  const scheme = primary?.entryScheme as EntryScheme | undefined;
  const rejected =
    input.advisors?.strategies
      .filter((s) => s.advisorId !== primary?.advisorId)
      .map((s) => ({
        summary: s.oneLiner,
        reason: "本阶段不作为同期进入主策",
      })) || [];

  const oneLiner =
    input.warRoom.consensusOneLiner ||
    input.decision.recommendation ||
    scheme?.entryMode ||
    "已确认的进入方式";

  return {
    contractId: createId("econtract"),
    version: 1,
    status: "draft",
    oneLiner,
    entryMode: scheme?.entryMode || oneLiner,
    cityScene:
      input.entryPack?.cityScene ||
      [input.answers?.city, scheme?.sceneCut].filter(Boolean).join(" · ") ||
      undefined,
    menuPilot:
      input.entryPack?.menuPilot ||
      scheme?.menuPilot?.slice(0, 3).join(" / ") ||
      undefined,
    successMetrics: input.entryPack?.successMetrics,
    tradeoffAccepted: input.decision.tradeoffAccepted,
    killCriteria: input.decision.killCriteria.slice(0, 4),
    mondayMoves: input.decision.mondayMoves.slice(0, 4),
    evidenceUsed: input.decision.evidenceUsed.slice(0, 6),
    whatWeWontDo: input.decision.whatWeWontDo.slice(0, 4),
    wallCard: input.entryPack?.wallCard,
    entryPackMarkdown: input.entryPack?.markdown,
    rejectedAlternatives: rejected.slice(0, 3),
    seatId: primary?.advisorId,
    seatLabel:
      SEAT_LABEL[primary?.advisorId || ""] ||
      primary?.advisorId ||
      "拍板席",
  };
}

export function proposeEntryContract(contract: EntryContract): EntryContract {
  if (contract.status === "frozen") {
    throw new Error("合同已冻结，不能再次提出");
  }
  const missing: string[] = [];
  if (!contract.oneLiner?.trim()) missing.push("oneLiner");
  if (!contract.tradeoffAccepted?.trim()) missing.push("tradeoffAccepted");
  if ((contract.killCriteria?.length || 0) < 2) missing.push("killCriteria>=2");
  if ((contract.mondayMoves?.length || 0) < 3) missing.push("mondayMoves>=3");
  if (missing.length) {
    throw new Error(`进入合同未齐，待补：${missing.join("；")}`);
  }
  return { ...contract, status: "proposed" };
}

export function freezeEntryContract(contract: EntryContract): EntryContract {
  if (contract.status !== "proposed" && contract.status !== "draft") {
    throw new Error(`冻结前状态无效：${contract.status}`);
  }
  const proposed =
    contract.status === "draft" ? proposeEntryContract(contract) : contract;
  return {
    ...proposed,
    status: "frozen",
    frozenAt: new Date().toISOString(),
  };
}
