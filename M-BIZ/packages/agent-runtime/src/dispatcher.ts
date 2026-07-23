/**
 * KernelDispatcher — Chief Agent 调度器
 *
 * 核心调度流程：
 * 用户输入 → Chief Agent → 理解问题 → 判断是否需要专业 Agent
 *   → 如果需要：产生 Mission → MissionRouter → 收集结果 → 融合判断
 *   → 如果不需要：Chief Agent 直接处理
 *
 * 这是 MealKey OS 的 CPU 调度器。
 */

import type { MKContext, MKDecision, Mission, AgentManifest } from "@mealkey/agent-sdk";
import type { AgentRegistry } from "./registry";
import type { MissionRouter } from "./mission-router";
import type { CapabilityRegistry } from "./capability-registry";

export interface DispatcherConfig {
  agentRegistry: AgentRegistry;
  missionRouter: MissionRouter;
  capabilityRegistry: CapabilityRegistry;
}

export interface DispatchResult {
  /** 最终决策 */
  decision: MKDecision;
  /** 是否调用了专业 Agent */
  dispatched: boolean;
  /** 调度的 Mission 列表 */
  missions: Mission[];
  /** 执行时长 ms */
  duration: number;
}

export class KernelDispatcher {
  private agentRegistry: AgentRegistry;
  private missionRouter: MissionRouter;
  private capabilityRegistry: CapabilityRegistry;

  constructor(config: DispatcherConfig) {
    this.agentRegistry = config.agentRegistry;
    this.missionRouter = config.missionRouter;
    this.capabilityRegistry = config.capabilityRegistry;
  }

  /**
   * 调度入口 — Chief Agent 决定如何处理问题
   */
  async dispatch(
    context: MKContext,
    problemAnalysis: { realProblem: string; requiredCapabilities: string[] }
  ): Promise<DispatchResult> {
    const startTime = Date.now();
    const missions: Mission[] = [];

    // 1. 判断是否需要专业 Agent
    const targetAgent = this.findBestAgent(problemAnalysis.requiredCapabilities);

    if (!targetAgent) {
      // 没有合适的专业 Agent，Chief Agent 自己处理
      return {
        decision: this.createDefaultDecision(problemAnalysis.realProblem, context),
        dispatched: false,
        missions: [],
        duration: Date.now() - startTime,
      };
    }

    // 2. 产生 Mission
    const mission = this.missionRouter.createMission(
      "chief-agent",
      targetAgent.id,
      problemAnalysis.realProblem,
      context
    );
    missions.push(mission);

    // 3. 在沙箱中执行 Mission
    const completedMission = await this.missionRouter.send(mission);

    // 4. 收集结果
    if (completedMission.status === "completed" && completedMission.result) {
      return {
        decision: completedMission.result,
        dispatched: true,
        missions,
        duration: Date.now() - startTime,
      };
    }

    // 5. 失败时 Chief Agent 兜底
    return {
      decision: this.createFallbackDecision(problemAnalysis.realProblem, completedMission),
      dispatched: true,
      missions,
      duration: Date.now() - startTime,
    };
  }

  /**
   * 并行调度多个 Agent
   */
  async dispatchParallel(
    context: MKContext,
    tasks: Array<{ agentId: string; objective: string }>
  ): Promise<DispatchResult> {
    const startTime = Date.now();

    // 创建所有 Mission
    const missions = tasks.map(task =>
      this.missionRouter.createMission("chief-agent", task.agentId, task.objective, context)
    );

    // 并行执行
    const completedMissions = await Promise.all(
      missions.map(mission => this.missionRouter.send(mission))
    );

    // 融合所有结果
    const decisions = completedMissions
      .filter(m => m.status === "completed" && m.result)
      .map(m => m.result!);

    const fusedDecision = this.fuseDecisions(decisions, tasks.map(t => t.objective));

    return {
      decision: fusedDecision,
      dispatched: true,
      missions,
      duration: Date.now() - startTime,
    };
  }

  /**
   * 查找最合适的 Agent
   */
  private findBestAgent(requiredCapabilities: string[]): AgentManifest | null {
    // 列出所有 MealKeyAgent（interface-based）的 Manifest
    const agents = this.agentRegistry.listAgents();
    const manifests = this.agentRegistry.listManifests();

    // 计算每个 Agent 的匹配度
    let bestManifest: AgentManifest | null = null;
    let bestScore = 0;

    for (const manifest of manifests) {
      if (manifest.id === "chief-agent") continue; // 跳过自己

      const score = this.calculateMatchScore(manifest, requiredCapabilities);
      if (score > bestScore) {
        bestScore = score;
        bestManifest = manifest;
      }
    }

    // 匹配度太低，不调度
    return bestScore >= 0.3 ? bestManifest : null;
  }

  /**
   * 计算 Agent 与需求的匹配度
   */
  private calculateMatchScore(manifest: AgentManifest, required: string[]): number {
    if (required.length === 0) return 0;

    const agentCapabilities = new Set(manifest.capabilities);
    const matched = required.filter(cap => agentCapabilities.has(cap));

    return matched.length / required.length;
  }

  /**
   * 融合多个 Decision
   */
  private fuseDecisions(decisions: MKDecision[], objectives: string[]): MKDecision {
    if (decisions.length === 0) {
      return {
        id: `fused_${Date.now()}`,
        problem: objectives.join("; "),
        observation: "无可用结果",
        diagnosis: "专业 Agent 未能返回有效结果",
        judgement: "需要更多信息",
        strategy: "重新收集信息",
        action: "完善项目信息后重试",
        confidence: 0,
        evidence: [],
      };
    }

    if (decisions.length === 1) {
      return decisions[0];
    }

    // 融合多个决策
    const avgConfidence = decisions.reduce((sum, d) => sum + d.confidence, 0) / decisions.length;

    return {
      id: `fused_${Date.now()}`,
      problem: objectives.join("; "),
      observation: decisions.map(d => d.observation).join("\n---\n"),
      diagnosis: decisions.map(d => d.diagnosis).join("\n---\n"),
      judgement: decisions.map(d => d.judgement).join("\n---\n"),
      strategy: decisions.map(d => d.strategy).join("\n---\n"),
      action: decisions.map(d => d.action).join("\n---\n"),
      confidence: avgConfidence,
      evidence: decisions.flatMap(d => d.evidence),
    };
  }

  /**
   * 创建默认决策（Chief Agent 自己处理）
   */
  private createDefaultDecision(problem: string, context: MKContext): MKDecision {
    return {
      id: `chief_${Date.now()}`,
      problem,
      observation: `项目: ${context.project.name}, 阶段: ${context.project.stage}`,
      diagnosis: "需要进一步分析",
      judgement: "继续收集信息",
      strategy: "完善项目信息",
      action: "补充更多项目细节",
      confidence: 0.5,
      evidence: [],
    };
  }

  /**
   * 创建兜底决策（Mission 失败时）
   */
  private createFallbackDecision(problem: string, mission: Mission): MKDecision {
    return {
      id: `fallback_${Date.now()}`,
      problem,
      observation: `尝试调用 ${mission.targetAgent} 处理`,
      diagnosis: "专业 Agent 执行失败",
      judgement: "使用通用分析",
      strategy: "重新尝试或手动分析",
      action: "检查 Agent 配置后重试",
      confidence: 0.3,
      evidence: [],
    };
  }
}
