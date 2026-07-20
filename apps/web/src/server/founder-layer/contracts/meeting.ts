import type {
  FounderDecision,
  FounderDecisionStance,
} from "./decision";
import type { ConflictMatrix } from "./debate";
import type { DebateSession } from "./debate-session";
import type { FounderAgentName, FounderMission } from "./mission";

export interface FounderMeetingInput {
  mission: FounderMission;
  decisions: FounderDecision[];
}

export interface MeetingRoundItem {
  agent: FounderAgentName;
  summary: string;
  stance?: FounderDecisionStance;
  challengeTo?: string;
  challengeEvidenceId?: string;
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
  drivingEvidenceIds?: string[];
}

export interface FounderMeeting {
  meetingId: string;
  missionId: string;
  topic: string;
  experts: FounderAgentName[];
  rounds: MeetingRound[];
  conflicts: MeetingConflict[];
  /** Debate Engine：冲突矩阵 */
  conflictMatrix?: ConflictMatrix;
  /** Debate Engine V1：完整辩论会话 */
  debateSession?: DebateSession;
  recommendation?: string;
  createdAt: string;
}
