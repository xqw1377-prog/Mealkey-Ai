/**
 * MealKeyAgent — Agent 标准接口
 *
 * 所有 MealKey Agent 必须实现此接口。
 * 支持未来 Agent 插件化和商业化。
 */

import type { AgentContext } from "./context";
import type { AgentResult } from "./result";

// ─── Agent 标准接口 ───

export interface MealKeyAgent {
  id: string;
  name: string;
  capabilities: string[];
  analyze(context: AgentContext): Promise<AgentResult>;
}

// ─── Agent Manifest V2 ───

export interface AgentManifestV2 {
  id: string;
  name: string;
  version: string;
  description: string;
  category: string;
  capabilities: Array<{
    id: string;
    description: string;
  }>;
  permissions: AgentPermission[];
}

// ─── Agent 权限 ───

export type AgentPermission =
  | "READ_PROJECT"
  | "READ_MEMORY"
  | "WRITE_MEMORY"
  | "READ_KNOWLEDGE"
  | "CREATE_REPORT"
  | "UPDATE_DECISION";
