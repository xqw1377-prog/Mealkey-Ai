/**
 * WorkflowEngine - 工作流引擎
 * 
 * 这是 MealKey 与普通 AI 的最大区别。
 * 普通 AI: 输入 → 输出
 * MealKey: 输入 → 判断流程 → 调用能力 → 形成决策 → 生成行动
 */

import type {
  Workflow,
  WorkflowStep,
  WorkflowState,
  WorkflowStatus,
} from "@mealkey/agent-sdk";

export class WorkflowEngine {
  private activeWorkflows = new Map<string, WorkflowState>();

  /**
   * 启动工作流
   */
  start(workflowId: string, workflow: Workflow): WorkflowState {
    const state: WorkflowState = {
      id: workflowId,
      workflow,
      currentStepIndex: 0,
      status: "running",
      results: new Map(),
      startedAt: new Date(),
    };
    this.activeWorkflows.set(workflowId, state);
    return state;
  }

  /**
   * 获取当前步骤
   */
  getCurrentStep(workflowId: string): WorkflowStep | null {
    const state = this.activeWorkflows.get(workflowId);
    if (!state || state.status !== "running") return null;
    return state.workflow.steps[state.currentStepIndex] ?? null;
  }

  /**
   * 推进到下一步
   */
  advance(workflowId: string, stepResult: Record<string, unknown>): WorkflowStep | null {
    const state = this.activeWorkflows.get(workflowId);
    if (!state) return null;

    // 保存当前步骤结果
    const currentStep = state.workflow.steps[state.currentStepIndex];
    if (currentStep) {
      state.results.set(currentStep.id, stepResult);
    }

    // 移动到下一步
    state.currentStepIndex++;

    // 检查是否完成
    if (state.currentStepIndex >= state.workflow.steps.length) {
      state.status = "completed";
      state.completedAt = new Date();
      return null;
    }

    return state.workflow.steps[state.currentStepIndex];
  }

  /**
   * 判断是否完成
   */
  isComplete(workflowId: string): boolean {
    const state = this.activeWorkflows.get(workflowId);
    return state?.status === "completed";
  }

  /**
   * 获取工作流状态
   */
  getState(workflowId: string): WorkflowState | undefined {
    return this.activeWorkflows.get(workflowId);
  }

  /**
   * 获取所有步骤结果
   */
  getResults(workflowId: string): Map<string, Record<string, unknown>> {
    const state = this.activeWorkflows.get(workflowId);
    return state?.results ?? new Map();
  }

  /**
   * 标记失败
   */
  fail(workflowId: string, error: string): void {
    const state = this.activeWorkflows.get(workflowId);
    if (state) {
      state.status = "failed";
      state.completedAt = new Date();
    }
  }

  /**
   * 清理工作流
   */
  dispose(workflowId: string): void {
    this.activeWorkflows.delete(workflowId);
  }
}
