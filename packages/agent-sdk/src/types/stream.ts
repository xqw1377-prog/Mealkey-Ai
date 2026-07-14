/**
 * StreamChunk 流式输出类型
 * 
 * Agent 执行过程中的流式输出事件。
 */

// ─── 流式输出 Chunk ───

export type StreamChunk =
  | TextChunk
  | StepStartChunk
  | StepCompleteChunk
  | ToolStartChunk
  | ToolResultChunk
  | MissionSentChunk
  | MissionResultChunk
  | UIBlockChunk
  | ErrorChunk
  | DoneChunk;

export interface TextChunk {
  type: "text";
  content: string;
}

export interface StepStartChunk {
  type: "step_start";
  stepId: string;
  stepName: string;
}

export interface StepCompleteChunk {
  type: "step_complete";
  stepId: string;
  stepName: string;
  data?: Record<string, unknown>;
}

export interface ToolStartChunk {
  type: "tool_start";
  toolName: string;
}

export interface ToolResultChunk {
  type: "tool_result";
  toolName: string;
  result: {
    success: boolean;
    data?: import("./protocols").MKDecision | Record<string, unknown>;
    error?: string;
  };
}

export interface MissionSentChunk {
  type: "mission_sent";
  mission: import("./protocols").Mission;
}

export interface MissionResultChunk {
  type: "mission_result";
  missionId: string;
  status: "success" | "failed";
  decision?: import("./protocols").MKDecision;
}

export interface UIBlockChunk {
  type: "ui_block";
  block: import("./result").UIBlock;
}

export interface ErrorChunk {
  type: "error";
  message: string;
}

export interface DoneChunk {
  type: "done";
  result?: import("./result").AgentResult;
}
