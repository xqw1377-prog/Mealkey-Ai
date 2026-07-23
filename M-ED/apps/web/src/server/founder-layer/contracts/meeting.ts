import type {
  FounderDecision,
  FounderDecisionStance,
} from "./decision";
import type { FounderAgentName, FounderMission } from "./mission";

export interface FounderMeetingInput {
  mission: FounderMission;
  decisions: FounderDecision[];
}

export interface MeetingRoundItem {
  agent: FounderAgentName;
  summary: string;
  stance?: FounderDecisionStance;
}

export interface MeetingRound {
  round: 1 | 2 | 3;
  title: string;
  items: MeetingRoundItem[];
}

export interface MeetingConflict {
  conflictId: string;
  missionId: string;
  dimension: string;
  summary: string;
  agents: FounderAgentName[];
  sideA: string;
  sideB: string;
  severity: "low" | "medium" | "high";
}

export interface FounderMeeting {
  meetingId: string;
  missionId: string;
  topic: string;
  experts: FounderAgentName[];
  rounds: MeetingRound[];
  conflicts: MeetingConflict[];
  recommendation?: string;
  createdAt: string;
}
