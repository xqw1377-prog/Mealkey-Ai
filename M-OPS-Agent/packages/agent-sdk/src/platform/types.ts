/**
 * Platform Gateway client types — docs/MEALKEY_AGENT_SDK_V1.md
 * HTTP SSOT: docs/MEALKEY_AGENT_EXTERNAL_INTERFACE_V1.md
 */

export type ContextScope =
  | "basic"
  | "facts"
  | "review"
  | "operation"
  | "market"
  | "dna";

export type InsightLevel = 1 | 2 | 3 | 4 | 5;

export type AgentClientConfig = {
  agentId: string;
  clientSecret: string;
  baseUrl: string;
  manifestVersion?: string;
  timeoutMs?: number;
  maxRetries?: number;
  env?: "production" | "sandbox";
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

export type SignalIngressV1 = {
  type: string;
  title: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  observation: string;
  pattern?: string;
  meaning?: string;
  impact: string;
  confidence: number;
  evidence: Array<{ source: string; fact: string }>;
  evidenceChain?: Array<{
    kind: "internal_fact" | "external_intel" | "inference";
    claim: string;
  }>;
  watchHint?: string;
};

export type InsightIngressV1 = {
  topic: string;
  finding: string;
  reasoning?: string;
  impact?: string;
  confidence: number;
  evidence: Array<{ claim: string; source?: string }>;
  unknowns?: string[];
  recommendation?: string;
  decisionTopic?: string;
};

export type WorkIngressV1 = {
  title: string;
  summary: string;
  artifacts?: Array<{ kind: string; label: string; payload: unknown }>;
  requiresDecisionId?: string;
};

export type GapIngressV1 = {
  field: string;
  reason: string;
  severity: "low" | "medium" | "high";
};

export type LearningEventV1 = {
  kind: string;
  summary: string;
  evidenceRefs?: string[];
};

export type IngressItemV1 =
  | { port: "signal"; level: InsightLevel; payload: SignalIngressV1 }
  | { port: "insight"; level: InsightLevel; payload: InsightIngressV1 }
  | { port: "work"; level: 5; payload: WorkIngressV1 }
  | { port: "gap"; level: 1; payload: GapIngressV1 }
  | { port: "learning"; payload: LearningEventV1 };

export type IngressBatchV1 = {
  restaurantId: string;
  invokeId: string;
  userAccessToken: string;
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

export type InstallStatusV1 = {
  installed: boolean;
  scopesGranted: string[];
  maxInsightLevel: InsightLevel;
};
