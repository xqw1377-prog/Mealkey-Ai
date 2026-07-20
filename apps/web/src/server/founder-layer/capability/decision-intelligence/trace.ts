import type {
  DecisionContextV1,
  DecisionOptionV1,
  DecisionTraceV1,
} from "@/server/founder-layer/contracts/decision-intelligence-data-contract";

export function buildExpansionTrace(input: {
  decisionId: string;
  context: DecisionContextV1;
  chosen: DecisionOptionV1;
  allOptions: DecisionOptionV1[];
  mode: "accept" | "modify" | "insist";
  founderReason?: string;
  at?: string;
}): DecisionTraceV1 {
  return {
    decisionId: input.decisionId,
    factsUsed: input.context.evidences.map((e) => e.id),
    optionsRejected: input.allOptions
      .filter((o) => o.id !== input.chosen.id)
      .map((o) => ({
        optionId: o.id,
        reason:
          o.isRecommended && input.mode === "insist"
            ? "老板坚持非推荐方案"
            : "未选择",
      })),
    challenges: input.context.expertOpinions.map((e) => ({
      roleId: e.roleId,
      claim: e.claim,
    })),
    founderChoice: input.chosen.name,
    founderOverrideReason:
      input.mode === "insist" ? input.founderReason?.trim() : undefined,
    at: input.at || new Date().toISOString(),
  };
}
