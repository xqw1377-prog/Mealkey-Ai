export type FounderMemoryWriteType =
  | "fact"
  | "decision"
  | "preference"
  | "meeting";

export type FounderMemoryDomain =
  | "brand"
  | "market"
  | "business"
  | "organization"
  | "mixed";

export type FounderMemorySource =
  | "company_context"
  | "agent_decision"
  | "meeting_engine"
  | "decision_engine"
  | "user_feedback";

export interface FounderMemoryWrite {
  writeId: string;
  projectId: string;
  missionId?: string;
  type: FounderMemoryWriteType;
  domain?: FounderMemoryDomain;
  summary: string;
  payload: Record<string, unknown>;
  source: FounderMemorySource;
  createdAt: string;
}
