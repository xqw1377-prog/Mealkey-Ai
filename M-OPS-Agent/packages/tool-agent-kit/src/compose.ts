import type { ToolAgentManifest, ToolAgentPort } from "./types";
import type { ToolAgentRegistry } from "./registry";

/**
 * 校验 Pipeline 组合是否合法（仅声明检查，不执行）。
 */
export function assertPipeline(
  registry: ToolAgentRegistry,
  agentIds: string[],
): void {
  if (agentIds.length < 2) {
    throw new Error("Pipeline 至少需要 2 个 Agent");
  }
  const manifests = agentIds.map((id) => registry.require(id).manifest);
  for (let i = 0; i < manifests.length - 1; i++) {
    const cur = manifests[i]!;
    const next = manifests[i + 1]!;
    if (cur.compose?.conflictsWith?.includes(next.id)) {
      throw new Error(`组合冲突: ${cur.id} ⊥ ${next.id}`);
    }
    if (next.compose?.conflictsWith?.includes(cur.id)) {
      throw new Error(`组合冲突: ${next.id} ⊥ ${cur.id}`);
    }
    const down = cur.compose?.downstream;
    if (down?.length && !down.includes(next.id)) {
      throw new Error(
        `${cur.id} 未声明 downstream 含 ${next.id}，拒绝隐式串联`,
      );
    }
    const up = next.compose?.upstream;
    if (up?.length && !up.includes(cur.id)) {
      throw new Error(
        `${next.id} 未声明 upstream 含 ${cur.id}，拒绝隐式串联`,
      );
    }
  }
}

/**
 * Fan-in：所有参与者必须声明 insight 口，才能汇入 Council。
 */
export function assertFanInForCouncil(
  registry: ToolAgentRegistry,
  agentIds: string[],
): ToolAgentManifest[] {
  const manifests = agentIds.map((id) => registry.require(id).manifest);
  for (const m of manifests) {
    if (!m.ports.includes("insight")) {
      throw new Error(`${m.id} 未声明 insight 口，不能 Fan-in 进 Council`);
    }
    if (m.stage === "deprecated") {
      throw new Error(`${m.id} 已 deprecated`);
    }
  }
  return manifests;
}

/** 目的 → 允许的 Port */
export function portsAllowedForPurpose(
  purpose: "radar" | "council" | "execution" | "standalone",
): ToolAgentPort[] {
  switch (purpose) {
    case "radar":
      return ["signal", "gap"];
    case "council":
      return ["insight", "gap"];
    case "execution":
      return ["work", "gap"];
    case "standalone":
      return ["signal", "insight", "work", "gap"];
    default:
      return ["gap"];
  }
}

export function assertPurposePorts(
  manifest: ToolAgentManifest,
  purpose: "radar" | "council" | "execution" | "standalone",
): void {
  const allowed = new Set(portsAllowedForPurpose(purpose));
  const overlap = manifest.ports.filter((p) => allowed.has(p));
  if (!overlap.length) {
    throw new Error(
      `${manifest.id} 的 ports=[${manifest.ports.join(",")}] 无法服务 purpose=${purpose}`,
    );
  }
}
