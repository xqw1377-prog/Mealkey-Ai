/**
 * MissionRouter — Agent 间通信路由
 *
 * Protocol 6: Mission Protocol
 * Agent 不互相调用，统一通过 Mission 通信。
 * Brand Agent 产生 Mission → Mission Router → Finance Agent
 */

import type { Mission, MKContext, MKDecision, AgentManifest } from "@mealkey/agent-sdk";
import type { AgentRegistry } from "./registry";
import type { AgentSandbox } from "./sandbox";

export interface MissionRouterConfig {
  registry: AgentRegistry;
  sandbox?: AgentSandbox;
  onMissionComplete?: (mission: Mission) => void;
  onMissionFailed?: (mission: Mission, error: string) => void;
}

export class MissionRouter {
  private pendingMissions = new Map<string, Mission & { duration?: number }>();
  private completedMissions = new Map<string, Mission & { duration?: number }>();
  private registry: AgentRegistry;
  private sandbox?: AgentSandbox;
  private onMissionComplete?: (mission: Mission) => void;
  private onMissionFailed?: (mission: Mission, error: string) => void;

  constructor(config: MissionRouterConfig) {
    this.registry = config.registry;
    this.sandbox = config.sandbox;
    this.onMissionComplete = config.onMissionComplete;
    this.onMissionFailed = config.onMissionFailed;
  }

  /**
   * 创建 Mission
   */
  createMission(
    sourceAgent: string,
    targetAgent: string,
    objective: string,
    context: MKContext
  ): Mission {
    return {
      id: `mission_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      sourceAgent,
      targetAgent,
      objective,
      context,
      status: "pending",
      createdAt: new Date(),
    };
  }

  /**
   * 发送 Mission 给目标 Agent（通过 Registry 查找并执行）
   */
  async send(mission: Mission): Promise<Mission> {
    const startTime = Date.now();
    mission.status = "running";
    this.pendingMissions.set(mission.id, mission as Mission & { duration?: number });

    try {
      // 查找目标 Agent — 支持 AgentDefinition（workflow-based）和 MealKeyAgent（interface-based）
      const targetAgent = this.registry.get(mission.targetAgent);
      const targetAgentInterface = this.registry.getAgent(mission.targetAgent);

      if (!targetAgent && !targetAgentInterface) {
        mission.status = "failed";
        this.pendingMissions.delete(mission.id);
        const failedMission = { ...mission, duration: Date.now() - startTime };
        this.completedMissions.set(mission.id, failedMission);
        this.onMissionFailed?.(failedMission, `Agent "${mission.targetAgent}" not found`);
        return failedMission;
      }

      // 尝试通过 MealKeyAgent 接口执行
      if (targetAgentInterface) {
        const executeAgent = async (ctx: MKContext): Promise<MKDecision> => {
          const result = await targetAgentInterface.analyze({
            user: { id: ctx.owner.id ?? "", name: ctx.owner.name ?? null, email: ctx.owner.email ?? null },
            project: {
              id: ctx.project.id,
              name: ctx.project.name,
              stage: ctx.project.stage,
              city: ctx.project.city,
              district: ctx.project.district,
              category: ctx.project.category,
              profile: ctx.project.profile,
            },
            mission: null,
            memory: ctx.memories.map(m => ({ key: m.key, value: m.content, updatedAt: m.updatedAt })),
            knowledge: [],
            messageHistory: [],
          });

          return {
            id: `decision_${Date.now()}`,
            problem: mission.objective,
            observation: "由 Agent 执行",
            diagnosis: result.decision?.summary ?? "无结果",
            judgement: result.decision?.summary ?? "无结果",
            strategy: result.decision?.summary ?? "无结果",
            action: "见详细报告",
            confidence: (result.decision?.confidence ?? 0) / 100,
            evidence: [],
          };
        };

        const manifest: AgentManifest = {
          id: targetAgentInterface.id,
          name: targetAgentInterface.name,
          version: "1.0.0",
          domain: "agent",
          description: targetAgentInterface.name,
          requiredContext: ["owner", "project"],
          capabilities: targetAgentInterface.capabilities,
          workflow: "single-step",
          outputSchema: "MKDecision",
        };

        if (this.sandbox) {
          const sandboxResult = await this.sandbox.execute(manifest, mission.context, executeAgent);
          if (sandboxResult.success && sandboxResult.decision) {
            mission.result = sandboxResult.decision;
          } else {
            throw new Error(sandboxResult.error ?? "Sandbox execution failed");
          }
        } else {
          mission.result = await executeAgent(mission.context);
        }
      }

      mission.status = "completed";
      const completedMission = { ...mission, duration: Date.now() - startTime };
      this.pendingMissions.delete(mission.id);
      this.completedMissions.set(mission.id, completedMission);
      this.onMissionComplete?.(completedMission);

      return completedMission;
    } catch (error) {
      const failedMission = { ...mission, status: "failed" as const, duration: Date.now() - startTime };
      this.pendingMissions.delete(mission.id);
      this.completedMissions.set(mission.id, failedMission);
      this.onMissionFailed?.(failedMission, error instanceof Error ? error.message : String(error));

      return failedMission;
    }
  }

  /**
   * 获取待处理的 Mission
   */
  getPending(): Mission[] {
    return Array.from(this.pendingMissions.values());
  }

  /**
   * 获取已完成的 Mission
   */
  getCompleted(): Mission[] {
    return Array.from(this.completedMissions.values());
  }

  /**
   * 获取 Mission 状态
   */
  getMission(id: string): (Mission & { duration?: number }) | undefined {
    return this.pendingMissions.get(id) ?? this.completedMissions.get(id);
  }

  /**
   * 统计
   */
  stats(): { pending: number; completed: number; failed: number } {
    const completed = Array.from(this.completedMissions.values());
    return {
      pending: this.pendingMissions.size,
      completed: completed.filter(m => m.status === "completed").length,
      failed: completed.filter(m => m.status === "failed").length,
    };
  }
}
