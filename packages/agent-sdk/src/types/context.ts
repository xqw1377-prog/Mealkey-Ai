/**
 * AgentContext 共享上下文
 * 
 * 所有 Agent 共享的上下文结构。
 * Agent 不直接查数据库，通过 Context 获取数据。
 */

// ─── Agent 上下文 ───

export interface AgentContext {
  user: UserContext;
  project: ProjectContext;
  mission: import("./mission").MissionRequest | null;
  memory: Memory[];
  knowledge: Knowledge[];
  messageHistory: ChatMessage[];
}

// ─── 用户上下文 ───

export interface UserContext {
  id: string;
  name: string | null;
  email: string | null;
}

// ─── 项目上下文 ───

export interface ProjectContext {
  id: string;
  name: string;
  stage: string | null;
  city: string | null;
  district: string | null;
  category: string | null;
  profile: Record<string, unknown> | null;
}

// ─── 记忆 ───

export interface Memory {
  key: string;
  value: unknown;
  updatedAt: Date;
}

// ─── 知识 ───

export interface Knowledge {
  id: string;
  title: string;
  content: string;
  category: string;
  relevance: number;             // 0-1
}

// ─── 对话消息 ───

export interface ChatMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolName?: string;
  toolCallId?: string;
  toolResult?: Record<string, unknown>;
}

// ─── 流式执行上下文 ───

export interface ExecutionContext {
  userId: string;
  projectId: string;
  conversationId?: string;
  agentId: string;
}
