export type DecisionMemoryUpsert = {
  kind: "decision_memory_upsert";
  projectId: string;
  restaurantId?: string;
  decisionId?: string;
  decisionType?: string;
  question: string;
  context?: Record<string, unknown>;
  options?: string[];
  chosen?: string;
  chosenOption?: string;
  reason?: string;
  aiAssessment?: unknown;
  councilResult?: unknown;
  expectedOutcome?: unknown;
  at: string;
};

export type DecisionMemoryValidated = {
  kind: "decision_memory_validated";
  decisionMemoryId: string;
  projectId: string;
  actualOutcome: unknown;
  learning: string;
  outcome: "confirmed" | "partial" | "invalidated";
  at: string;
};

export type LearningEvolutionHint = {
  kind: "learning_evolution";
  projectId: string;
  decisionMemoryId: string;
  learning: string;
  outcome: DecisionMemoryValidated["outcome"];
  at: string;
};
