/**
 * Debate Engine — 冲突矩阵契约
 * Round2 核心：观点冲突，而非轮流发言。
 */

import type { FounderAgentName } from "./mission";

/** 席位对议题的态度：+ 支持 / - 谨慎反对 / -- 强烈反对 / 0 中立或无关 */
export type ConflictCell = "+" | "-" | "--" | "0";

export interface ConflictMatrixRow {
  topic: string;
  cells: Partial<Record<FounderAgentName, ConflictCell>>;
  drivingEvidenceIds: string[];
  summary: string;
}

export interface ConflictMatrixPrimary {
  topic: string;
  sideA: {
    agents: FounderAgentName[];
    claim: string;
    polarity: "+";
  };
  sideB: {
    agents: FounderAgentName[];
    claim: string;
    polarity: "-" | "--";
  };
  drivingEvidenceIds: string[];
  question: string;
}

export interface DecisionTradeoff {
  keep: string;
  giveUp: string;
  why: string;
}

export interface ConflictMatrix {
  matrixId: string;
  missionId: string;
  rows: ConflictMatrixRow[];
  primary: ConflictMatrixPrimary | null;
  tradeoffs: DecisionTradeoff[];
  createdAt: string;
}
