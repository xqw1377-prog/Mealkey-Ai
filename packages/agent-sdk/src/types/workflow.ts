/**
 * Workflow 工作流定义
 * 
 * Workflow 是 MealKey 与普通 AI 的最大区别。
 * 普通 AI: 输入 → 输出
 * MealKey: 输入 → 判断流程 → 调用能力 → 形成决策 → 生成行动
 */

// ─── 工作流定义 ───

export interface Workflow {
  name: string;
  description: string;
  steps: WorkflowStep[];
}

// ─── 工作流步骤 ───

export interface WorkflowStep {
  id: string;                    // "owner_analysis"
  name: string;                  // "创业者分析"
  type: WorkflowStepType;
  capabilities?: string[];       // 步骤需要的能力 ID
  knowledge?: string[];          // 步骤需要的知识库 ID
  prompt?: string;               // 步骤专属提示词（覆盖默认）
  next?: string;                 // 下一步 ID（或条件路由）
  output?: "final";              // 是否为最终步骤
}

export type WorkflowStepType =
  | "analysis"    // 分析阶段
  | "question"    // 提问阶段（需要用户输入）
  | "decision"    // 决策阶段
  | "action";     // 行动阶段

// ─── 工作流状态 ───

export interface WorkflowState {
  id: string;
  workflow: Workflow;
  currentStepIndex: number;
  status: WorkflowStatus;
  results: Map<string, Record<string, unknown>>;
  startedAt: Date;
  completedAt?: Date;
}

export type WorkflowStatus = "running" | "completed" | "failed" | "paused";

// ─── 工作流步骤结果 ───

export interface WorkflowStepResult {
  stepId: string;
  stepName: string;
  type: "text" | "tool_result" | "step_complete" | "workflow_complete";
  content?: string;
  data?: Record<string, unknown>;
}
