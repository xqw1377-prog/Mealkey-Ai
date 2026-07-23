import type { ToolAgentEngine, ToolAgentManifest } from "./types";

/**
 * 进程内 Registry — 发现与组合的真源入口。
 * Host（apps/web）与单测共用同一注册表形状。
 */
export class ToolAgentRegistry {
  private readonly engines = new Map<string, ToolAgentEngine>();

  register(engine: ToolAgentEngine): void {
    const id = engine.manifest.id;
    if (!id || typeof id !== "string") {
      throw new Error("ToolAgentManifest.id 必填");
    }
    if (this.engines.has(id)) {
      throw new Error(`Tool Agent 已注册: ${id}`);
    }
    assertManifest(engine.manifest);
    this.engines.set(id, engine);
  }

  get(agentId: string): ToolAgentEngine | undefined {
    return this.engines.get(agentId);
  }

  require(agentId: string): ToolAgentEngine {
    const engine = this.engines.get(agentId);
    if (!engine) {
      throw new Error(`未注册的 Tool Agent: ${agentId}`);
    }
    return engine;
  }

  list(filter?: {
    kind?: ToolAgentManifest["kind"];
    stage?: ToolAgentManifest["stage"];
    port?: ToolAgentManifest["ports"][number];
  }): ToolAgentManifest[] {
    return [...this.engines.values()]
      .map((e) => e.manifest)
      .filter((m) => {
        if (filter?.kind && m.kind !== filter.kind) return false;
        if (filter?.stage && m.stage !== filter.stage) return false;
        if (filter?.port && !m.ports.includes(filter.port)) return false;
        return true;
      })
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  clear(): void {
    this.engines.clear();
  }
}

export function assertManifest(m: ToolAgentManifest): void {
  // 承认两套：框架态 l3.<kind>.<cap> · 产品族态 m-<domain>（如 m-ops-diag，仍为 L3）
  const okId =
    /^l3\.[a-z0-9]+(\.[a-z0-9-]+)+$/.test(m.id) ||
    /^m-[a-z0-9]+(-[a-z0-9]+)+$/.test(m.id);
  if (!okId) {
    throw new Error(
      `Manifest.id 须为 l3.<kind>.<capability> 或 m-<domain>（如 m-ops-diag），收到: ${m.id}`,
    );
  }
  if (!m.ports?.length) {
    throw new Error(`${m.id}: ports 不能为空`);
  }
  if (!m.version) {
    throw new Error(`${m.id}: version 必填`);
  }
  const legal = new Set([
    "signal",
    "insight",
    "work",
    "gap",
  ] as const);
  for (const p of m.ports) {
    if (!legal.has(p)) {
      throw new Error(`${m.id}: 非法 port ${p}`);
    }
  }
}
