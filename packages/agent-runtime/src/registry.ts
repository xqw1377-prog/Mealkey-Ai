/**
 * AgentRegistry - Agent 注册中心
 *
 * 管理所有已注册的 Agent 定义。
 * 支持 AgentDefinition（workflow-based）和 MealKeyAgent（interface-based）两种注册方式。
 * 是未来 Marketplace 的基础。
 */

import type { AgentDefinition, AgentManifest as ProtocolsAgentManifest, MealKeyAgent } from "@mealkey/agent-sdk";

export class AgentRegistry {
  private agents = new Map<string, AgentDefinition>();
  private mealKeyAgents = new Map<string, MealKeyAgent>();

  /**
   * 注册 Agent（workflow-based）
   */
  register(agent: AgentDefinition): void {
    const id = agent.manifest.id;
    if (this.agents.has(id)) {
      throw new Error(`Agent "${id}" already registered`);
    }
    this.agents.set(id, agent);
  }

  /**
   * 注册 MealKeyAgent（interface-based）
   */
  registerAgent(agent: MealKeyAgent): void {
    if (this.mealKeyAgents.has(agent.id)) {
      throw new Error(`MealKeyAgent "${agent.id}" already registered`);
    }
    this.mealKeyAgents.set(agent.id, agent);
  }

  /**
   * 获取 Agent（workflow-based）
   */
  get(id: string): AgentDefinition | undefined {
    return this.agents.get(id);
  }

  /**
   * 获取 MealKeyAgent（interface-based）
   */
  getAgent(id: string): MealKeyAgent | undefined {
    return this.mealKeyAgents.get(id);
  }

  /**
   * 列出所有 Agent（workflow-based）
   */
  list(): AgentDefinition[] {
    return Array.from(this.agents.values());
  }

  /**
   * 列出所有 MealKeyAgent（interface-based）
   */
  listAgents(): MealKeyAgent[] {
    return Array.from(this.mealKeyAgents.values());
  }

  /**
   * 按分类查询
   */
  listByCategory(category: string): AgentDefinition[] {
    return this.list().filter(a => a.manifest.category === category);
  }

  /**
   * 按能力查询 MealKeyAgent
   */
  findByCapability(capability: string): MealKeyAgent[] {
    return this.listAgents().filter(a => a.capabilities.includes(capability));
  }

  /**
   * 检查是否已注册
   */
  has(id: string): boolean {
    return this.agents.has(id) || this.mealKeyAgents.has(id);
  }

  /**
   * 批量注册
   */
  registerBatch(agents: AgentDefinition[]): void {
    for (const agent of agents) {
      this.register(agent);
    }
  }

  /**
   * 获取所有 Agent 的 Manifest（用于 Marketplace 展示）
   */
  private mapPricingModel(type: "free" | "subscription" | "one_time"): "free" | "subscription" | "per_use" {
    const mapping: Record<string, "free" | "subscription" | "per_use"> = {
      free: "free",
      subscription: "subscription",
      one_time: "per_use",
    };
    return mapping[type] ?? "per_use";
  }

  listManifests(): ProtocolsAgentManifest[] {
    return this.list().map(a => ({
      id: a.manifest.id,
      name: a.manifest.name,
      version: a.manifest.version ?? "1.0.0",
      domain: a.manifest.category ?? "general",
      description: a.manifest.description,
      requiredContext: ["owner", "project"],
      capabilities: a.manifest.capabilities ?? [],
      workflow: a.workflow?.name ?? "",
      outputSchema: "MKDecision",
      ...(a.manifest.pricing ? { pricing: { model: this.mapPricingModel(a.manifest.pricing.type), price: a.manifest.pricing.price, currency: a.manifest.pricing.currency ?? "CNY" } } : {}),
    }));
  }
}
