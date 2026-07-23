/**
 * Agent 核心类型定义
 */

// ─── Agent 身份证 ───

export interface AgentManifest {
  id: string;                    // "location"
  name: string;                  // "MealKey智能选址顾问"
  version: string;               // "1.0"
  description: string;           // "帮助餐饮老板判断位置是否值得投资"
  category: string;              // "site-selection"
  capabilities: string[];        // ["trade_area", "competition", "rent_analysis"]
  pricing?: AgentPricing;
  permissions: AgentPermissions;
}

export interface AgentPricing {
  type: "free" | "subscription" | "one_time";
  price: number;               // 分
  currency?: string;           // 默认 "CNY"
}

export interface AgentPermissions {
  knowledge: boolean;          // 是否需要知识库访问
  project: boolean;            // 是否需要项目数据访问
  memory: boolean;             // 是否需要记忆/历史访问
}

// ─── Agent 完整定义 ───

export interface AgentDefinition {
  manifest: AgentManifest;
  workflow: import("./workflow").Workflow;
  capabilities: import("./protocols").CapabilityDefinition[];
  prompt: string;
  promptTemplates?: Record<string, string>;
}

// ─── Agent 分类 ───

export type AgentCategory =
  | "startup"       // 开店相关
  | "operations"    // 日常运营
  | "marketing"     // 营销获客
  | "finance"       // 财务成本
  | "hr"            // 人力资源
  | "chain"         // 连锁扩张
  | "site-selection" // 选址
  | "custom";       // 自定义

// ─── Agent 能力声明（结构化）───

export interface AgentCapabilityDeclaration {
  id: string;
  name: string;
  description: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}
