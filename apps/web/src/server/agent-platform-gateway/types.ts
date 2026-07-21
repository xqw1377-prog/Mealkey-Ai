/** Agent Platform Gateway — docs/MEALKEY_AGENT_EXTERNAL_INTERFACE_V1.md */

export type ContextScope =
  | "basic"
  | "facts"
  | "review"
  | "operation"
  | "market"
  | "dna";

export type RegisteredAgentV1 = {
  agentId: string;
  clientSecret: string;
  maxInsightLevel: 1 | 2 | 3 | 4 | 5;
  allowedScopes: ContextScope[];
  stage: "sandbox" | "live" | "pilot";
};

export type ContextPackageV1 = {
  restaurantId: string;
  asOf: string;
  scopesGranted: string[];
  scopesDenied: string[];
  identity?: {
    brand?: string;
    storeName?: string;
    city?: string;
    district?: string;
    category?: string;
    priceRange?: string;
  };
  facts?: Array<{ kind: string; claim: string; asOf?: string }>;
  evidence?: Array<{
    id: string;
    source: string;
    claim: string;
    sentiment?: "positive" | "neutral" | "negative";
    theme?: string;
    observedAt?: string;
  }>;
  decisionContext?: { currentQuestion?: string; caseId?: string };
};

export type IngressItemV1 = {
  port: "signal" | "insight" | "work" | "gap" | "learning";
  level?: number;
  payload: Record<string, unknown>;
};

export type IngressBatchV1 = {
  agentId: string;
  restaurantId: string;
  invokeId: string;
  horizon?: "today" | "7d" | "30d";
  items: IngressItemV1[];
};

export type IngressAckV1 = {
  ok: boolean;
  invokeId: string;
  accepted: Array<{
    port: string;
    id: string;
    projectedTo?: "radar" | "room" | "exec" | "gap_ui" | "learning_queue";
  }>;
  rejected: Array<{ index: number; code: string; message: string }>;
};

export class GatewayError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly httpStatus: number,
  ) {
    super(message);
    this.name = "GatewayError";
  }
}
