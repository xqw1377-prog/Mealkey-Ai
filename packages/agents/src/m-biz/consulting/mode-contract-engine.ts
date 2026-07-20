/**
 * M-BIZ 模式主航道合同 — draft / propose / freeze
 */
import type {
  AdvisorStrategySet,
  DecisionArtifact,
  ExecutionDeliveryPack,
  WarRoomConsensus,
} from "../../consulting-os/types";
import { createId } from "../../consulting-os/types";
import type { ModeContract, ModeScheme } from "./types";

const SEAT_LABEL: Record<string, string> = {
  strategy: "战略官",
  product: "产品官",
  finance: "财务官",
  ops: "运营官",
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

export function draftModeContract(input: {
  decision: DecisionArtifact;
  warRoom: WarRoomConsensus;
  advisors?: AdvisorStrategySet;
  modePack?: ExecutionDeliveryPack | null;
  answers?: Record<string, string>;
}): ModeContract {
  const primary = resolvePrimary(input.advisors, input.warRoom);
  const scheme = primary?.modeScheme as ModeScheme | undefined;
  const rejected =
    input.advisors?.strategies
      .filter((s) => s.advisorId !== primary?.advisorId)
      .map((s) => ({
        summary: s.oneLiner,
        reason: "本阶段不作为同期主航道",
      })) || [];

  const oneLiner =
    input.warRoom.consensusOneLiner ||
    input.decision.recommendation ||
    scheme?.northStar ||
    "已确认的商业主航道";

  return {
    contractId: createId("mcontract"),
    version: 1,
    status: "draft",
    oneLiner,
    northStar:
      // modePack.cityScene 承载唯一北极星指标（勿用 oneLiner 航道口号冒充）
      input.modePack?.cityScene ||
      input.answers?.northStar ||
      scheme?.northStar ||
      oneLiner,
    priorityAxis: input.answers?.priority?.trim() || undefined,
    tradeoffAccepted: input.decision.tradeoffAccepted,
    killCriteria: input.decision.killCriteria.slice(0, 4),
    mondayMoves: input.decision.mondayMoves.slice(0, 4),
    evidenceUsed: input.decision.evidenceUsed.slice(0, 6),
    whatWeWontDo: input.decision.whatWeWontDo.slice(0, 4),
    wallCard: input.modePack?.wallCard,
    modePackMarkdown: input.modePack?.markdown,
    rejectedAlternatives: rejected.slice(0, 3),
    seatId: primary?.advisorId,
    seatLabel:
      SEAT_LABEL[primary?.advisorId || ""] ||
      primary?.advisorId ||
      "拍板席",
  };
}

export function proposeModeContract(contract: ModeContract): ModeContract {
  if (contract.status === "frozen") {
    throw new Error("合同已冻结，不能再次提出");
  }
  const missing: string[] = [];
  if (!contract.oneLiner?.trim()) missing.push("oneLiner");
  if (!contract.tradeoffAccepted?.trim()) missing.push("tradeoffAccepted");
  if ((contract.killCriteria?.length || 0) < 2) missing.push("killCriteria>=2");
  if ((contract.mondayMoves?.length || 0) < 3) missing.push("mondayMoves>=3");
  if (missing.length) {
    throw new Error(`模式合同未齐，待补：${missing.join("；")}`);
  }
  return { ...contract, status: "proposed" };
}

export function freezeModeContract(contract: ModeContract): ModeContract {
  if (contract.status !== "proposed" && contract.status !== "draft") {
    throw new Error(`冻结前状态无效：${contract.status}`);
  }
  const proposed =
    contract.status === "draft" ? proposeModeContract(contract) : contract;
  return {
    ...proposed,
    status: "frozen",
    frozenAt: new Date().toISOString(),
  };
}
