import type {
  DiagnosisCase,
  DiagnosisCaseStatus,
  DiagnosisHypothesis,
  DiagnosisLearning,
  ExternalScanJob,
} from "./knowledge";

export function createDiagnosisCase(input: {
  restaurantId: string;
  trigger: string;
  observations: string[];
  patterns: string[];
  hypothesis: DiagnosisHypothesis[];
  impactScore?: number;
  createdAt?: string;
}): DiagnosisCase {
  const now = input.createdAt || new Date().toISOString();
  return {
    id: `diag-case-${Date.now()}`,
    restaurantId: input.restaurantId,
    trigger: input.trigger,
    status: "DISCOVERED",
    observations: input.observations,
    patterns: input.patterns,
    hypothesis: input.hypothesis,
    impactScore: input.impactScore,
    createdAt: now,
    updatedAt: now,
  };
}

export function advanceDiagnosisCase(
  diagnosisCase: DiagnosisCase,
  status: DiagnosisCaseStatus,
): DiagnosisCase {
  return {
    ...diagnosisCase,
    status,
    updatedAt: new Date().toISOString(),
  };
}

export function buildLearningDraft(input: {
  diagnosisId: string;
  hypothesis: string;
  action?: string;
  expectedOutcome?: string;
}): DiagnosisLearning {
  return {
    diagnosisId: input.diagnosisId,
    hypothesis: input.hypothesis,
    action: input.action,
    expectedOutcome: input.expectedOutcome,
  };
}

export function buildExternalScanJob(input: {
  restaurantId: string;
  sources: string[];
  newEvidenceCount?: number;
  frequency?: ExternalScanJob["frequency"];
}): ExternalScanJob {
  return {
    restaurantId: input.restaurantId,
    sources: input.sources,
    frequency: input.frequency || "daily",
    lastRun: new Date().toISOString(),
    newEvidenceCount: input.newEvidenceCount,
  };
}
