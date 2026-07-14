/**
 * CapabilityRegistry — 能力注册中心
 *
 * Protocol 5: Capability Protocol
 * 能力不属于 Agent，能力属于系统。Agent 只是组合能力。
 */

import type { CapabilityDefinition, MKContext, MKDecision } from "@mealkey/agent-sdk";

export class CapabilityRegistry {
  private capabilities = new Map<string, CapabilityDefinition>();

  /**
   * 注册能力
   */
  register(capability: CapabilityDefinition): void {
    this.capabilities.set(capability.id, capability);
  }

  /**
   * 获取能力
   */
  get(id: string): CapabilityDefinition | undefined {
    return this.capabilities.get(id);
  }

  /**
   * 按领域查询能力
   */
  listByDomain(domain: string): CapabilityDefinition[] {
    return this.list().filter(c => c.domain === domain);
  }

  /**
   * 获取多个能力
   */
  getMany(ids: string[]): CapabilityDefinition[] {
    return ids
      .map(id => this.capabilities.get(id))
      .filter((c): c is CapabilityDefinition => c !== undefined);
  }

  /**
   * 批量注册
   */
  registerBatch(capabilities: CapabilityDefinition[]): void {
    for (const cap of capabilities) {
      this.register(cap);
    }
  }

  /**
   * 列出所有能力
   */
  list(): CapabilityDefinition[] {
    return Array.from(this.capabilities.values());
  }

  /**
   * 执行能力 — 返回 MKDecision
   */
  async execute(id: string, input: unknown, context: MKContext): Promise<MKDecision> {
    const capability = this.capabilities.get(id);
    if (!capability) {
      return {
        id: `error_${Date.now()}`,
        problem: "能力不存在",
        observation: `请求的能力 "${id}" 未注册`,
        diagnosis: "系统配置错误",
        judgement: "无法执行",
        strategy: "检查能力注册",
        action: "联系管理员",
        confidence: 0,
        evidence: [],
      };
    }

    return capability.execute(input, context);
  }

  /**
   * 检查能力是否已注册
   */
  has(id: string): boolean {
    return this.capabilities.has(id);
  }
}
