/**
 * Mission Agent 间通信协议
 * 
 * Mission 是 Agent 之间传递任务的标准协议。
 * Agent 不直接 import 其他 Agent，而是通过 Mission 解耦通信。
 */

export type MissionType = "MISSION_REQUEST" | "MISSION_RESULT";

// ─── Mission 请求 ───

export interface MissionRequest {
  type: "MISSION_REQUEST";
  id: string;                    // 唯一 ID
  fromAgent: string;             // 发送方 Agent ID
  toAgent: string;               // 目标 Agent ID
  task: string;                  // 任务描述: "location_analysis"
  projectId: string;
  userId: string;
  context: Record<string, unknown>;  // 传递的上下文数据
  priority: "low" | "normal" | "high";
  createdAt: Date;
}

// ─── Mission 结果 ───

export interface MissionResult {
  type: "MISSION_RESULT";
  missionId: string;             // 对应的 MissionRequest ID
  status: "success" | "failed" | "partial";
  decision?: {
    summary: string;
    confidence: number;          // 0-100
  };
  data?: Record<string, unknown>;
  error?: string;
  duration: number;              // ms
}

// ─── Mission 状态 ───

export type MissionStatus = "pending" | "running" | "completed" | "failed";

// ─── Mission 记录（持久化用）───

export interface MissionRecord {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  projectId: string | null;
  userId: string;
  task: string;
  context: string;               // JSON
  status: MissionStatus;
  result: string | null;         // JSON: MissionResult
  duration: number;
  createdAt: Date;
  updatedAt: Date;
}
