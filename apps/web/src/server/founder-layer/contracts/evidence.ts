/**
 * Founder OS Evidence Layer — 契约
 * Fact → Signal → Insight → Decision 四层；MVP 先 Registry + Binding + Display。
 */

import type { FounderAgentName } from "./mission";

export type EvidenceNodeType =
  | "FACT"
  | "DATA"
  | "CASE"
  | "EXPERT"
  | "USER_INPUT"
  | "ASSUMPTION"
  | "SIGNAL"
  | "INSIGHT";

export type EvidenceRelationType =
  | "supports"
  | "contradicts"
  | "derived_from"
  | "validated_by";

/** 来源等级：决定会议权重与「敢不敢说因为」 */
export type EvidenceSourceLevel =
  | "user_asserted"
  | "company_asset"
  | "engine_derived"
  | "external_data"
  | "validated_outcome";

export type EvidenceDomain =
  | "market"
  | "brand"
  | "business"
  | "capital"
  | "mixed";

export type EvidenceNodeStatus = "draft" | "accepted" | "contested" | "retired";

export interface EvidenceNode {
  id: string;
  projectId: string;
  missionId?: string;
  type: EvidenceNodeType;
  content: string;
  source: string;
  sourceLevel: EvidenceSourceLevel;
  reliability: number;
  domain: EvidenceDomain;
  agent?: FounderAgentName;
  createdAt: string;
  status: EvidenceNodeStatus;
}

export interface EvidenceRelation {
  fromId: string;
  toId: string;
  relationType: EvidenceRelationType;
}

export interface EvidencePack {
  nodes: EvidenceNode[];
  relations: EvidenceRelation[];
}

export interface EvidenceDraftItem {
  label: string;
  content: string;
  confidence?: number;
  type?: EvidenceNodeType;
  source?: string;
  sourceLevel?: EvidenceSourceLevel;
}

export interface EvidenceBindingResult {
  evidence: import("./decision").DecisionEvidence[];
  insightId: string;
  gaps: string[];
  sufficient: boolean;
  reasoning: string;
}

export const MIN_EVIDENCE_PER_JUDGEMENT = 3;

export function sourceLevelWeight(level: EvidenceSourceLevel): number {
  switch (level) {
    case "validated_outcome":
      return 5;
    case "external_data":
      return 4;
    case "engine_derived":
      return 3;
    case "company_asset":
      return 2;
    case "user_asserted":
    default:
      return 1;
  }
}

export function isHardEvidence(node: Pick<EvidenceNode, "type" | "sourceLevel">): boolean {
  if (node.type === "ASSUMPTION") return false;
  return sourceLevelWeight(node.sourceLevel) >= 2;
}
