export type FounderAgentName = "M-PNT" | "M-MKT" | "M-BIZ" | "M-ED";

export type FounderMissionType =
  | "expansion_review"
  | "positioning_review"
  | "market_entry"
  | "business_diagnosis"
  | "organization_review"
  | "mixed_strategy";

export type FounderMeetingType =
  | "strategy_meeting"
  | "positioning_council"
  | "expansion_meeting"
  | "entry_meeting"
  | "diagnosis_meeting";

export interface CompanyContext {
  companyId: string;
  basicInfo: {
    name: string;
    industry: string;
    city: string;
    stage: string;
  };
  business?: {
    model?: string;
    revenue?: string;
    scale?: string;
  };
  brand?: {
    name?: string;
    positioning?: string;
    users?: string;
  };
  goals: string[];
}

export interface MemoryFact {
  label: string;
  value: string;
  updatedAt?: string;
}

export interface MemoryDecisionSummary {
  decisionId?: string;
  summary: string;
  createdAt?: string;
}

export interface MemoryPreference {
  label: string;
  value: string;
  confidence?: number;
}

export interface FounderMemorySnapshot {
  facts: MemoryFact[];
  decisions: MemoryDecisionSummary[];
  preferences: MemoryPreference[];
}

export interface FounderMissionRequest {
  requestId: string;
  projectId: string;
  userId: string;
  message: string;
  companyContext: CompanyContext;
  currentMemory?: FounderMemorySnapshot;
  /** 用户本轮选中的资料摘要 */
  assetContextBlock?: string;
  createdAt: string;
}

export interface FounderMission {
  missionId: string;
  requestId: string;
  mission: string;
  missionType: FounderMissionType;
  objective: string;
  question: string;
  requiredAgents: FounderAgentName[];
  meetingType: FounderMeetingType;
  confidence: number;
  createdAt: string;
}
