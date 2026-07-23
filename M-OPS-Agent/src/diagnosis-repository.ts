import type {
  DiagnosisCase,
  DiagnosisLearning,
  RestaurantDiagnosisResult,
  RestaurantHealthSnapshot,
} from "@mealkey/m-ops-diag";

export type DiagnosisArchiveEntry = {
  asOf: string;
  result: RestaurantDiagnosisResult;
};

export type DiagnosisRunRecord = {
  runId: string;
  restaurantId: string;
  asOf: string;
  snapshot?: RestaurantHealthSnapshot;
  result: RestaurantDiagnosisResult;
  caseRecord?: DiagnosisCase;
  learningDraft?: DiagnosisLearning[];
};

export type DiagnosisKnowledgeSummary = {
  restaurantId: string;
  runCount: number;
  caseCount: number;
  learningCount: number;
  verifiedLearningCount?: number;
  evolutionStage?: string;
  maturityScore?: number;
  evolutionSummary?: string;
  latestSnapshot?: RestaurantHealthSnapshot;
};

export interface DiagnosisRepository {
  getLatestSnapshot(restaurantId: string): RestaurantHealthSnapshot | undefined;
  listRuns(restaurantId: string): DiagnosisRunRecord[];
  listCases(restaurantId: string): DiagnosisCase[];
  listLearnings(restaurantId: string): DiagnosisLearning[];
  getKnowledgeSummary(restaurantId: string): DiagnosisKnowledgeSummary;
  persistRun(input: {
    restaurantId: string;
    result: RestaurantDiagnosisResult;
  }): DiagnosisRunRecord;
  updateLearning(input: {
    restaurantId: string;
    diagnosisId: string;
    hypothesis: string;
    action?: string;
    actualOutcome?: string;
    lesson?: string;
  }): DiagnosisLearning | undefined;
  clear(): void;
}
