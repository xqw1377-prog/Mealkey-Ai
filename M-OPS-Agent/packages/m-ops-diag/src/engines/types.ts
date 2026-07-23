import type {
  DiagnosisEvidenceItem,
  HealthDimension,
  HealthLevel,
} from "../contracts";
import type { DiagnosisHypothesis } from "../knowledge";

export type EngineContext = {
  evidence: DiagnosisEvidenceItem[];
};

export type EngineAnalysis = {
  dimension: HealthDimension;
  level: HealthLevel;
  finding: string;
  meaning: string;
  observed: string;
  confidence: number;
  evidenceIds: string[];
  watchHint?: string;
  hypotheses: DiagnosisHypothesis[];
  opportunity?: boolean;
  rawEvidence: DiagnosisEvidenceItem[];
  /** review=评论引擎；expert=四官；merged=融合 */
  source?: "review" | "expert" | "merged";
  expertRole?: "finance" | "product" | "marketing" | "experience";
  metricIds?: string[];
  /** 经营冲击上下文（供 impact 使用） */
  businessImpact?: {
    revenueDeltaPct?: number;
    trafficDeltaPct?: number;
    marginPct?: number;
    peakSharePct?: number;
  };
};
