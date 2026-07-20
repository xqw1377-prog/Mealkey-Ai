import type {
  AdapterBuildInput,
  AdapterNormalizeContext,
  AdapterRawResponse,
  AdapterRequest,
  FounderAgentAdapter,
  FounderAgentName,
  FounderDecision,
  FounderMission,
} from "../contracts";

export abstract class BaseFounderAgentAdapter implements FounderAgentAdapter {
  abstract agent: FounderAgentName;

  supports(_mission: FounderMission): boolean {
    return true;
  }

  abstract buildRequest(input: AdapterBuildInput): AdapterRequest;

  abstract invoke(request: AdapterRequest): Promise<AdapterRawResponse>;

  abstract normalize(
    response: AdapterRawResponse,
    context: AdapterNormalizeContext,
  ): FounderDecision;

  protected buildDecisionId() {
    return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `founder-decision-${Date.now()}`;
  }

  protected buildNowIso() {
    return new Date().toISOString();
  }

  /** Memory Engine 先验块 — 注入各席 payload */
  protected memoryPriorPayload(input: AdapterBuildInput): Record<string, string> {
    const block = input.memory?.priorBlock?.trim();
    return block ? { memoryPriorBlock: block } : {};
  }
}
