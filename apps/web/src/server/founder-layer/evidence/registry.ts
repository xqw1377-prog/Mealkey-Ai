import type {
  EvidenceNode,
  EvidencePack,
  EvidenceRelation,
} from "../contracts/evidence";

function buildId(prefix: string) {
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}`;
  return `${prefix}-${rand}`;
}

/** 单次 Founder Loop / 会议内的证据注册表（内存；可再投影进 Memory） */
export class EvidenceRegistry {
  private nodes = new Map<string, EvidenceNode>();
  private relations: EvidenceRelation[] = [];
  private contentIndex = new Map<string, string>();

  constructor(readonly projectId: string) {}

  nextId(kind: "E" | "S" | "I" | "D" = "E") {
    return buildId(kind);
  }

  ingest(node: EvidenceNode): EvidenceNode {
    const key = `${node.type}|${node.content.trim().toLowerCase()}|${node.source}`;
    const existingId = this.contentIndex.get(key);
    if (existingId) {
      const existing = this.nodes.get(existingId);
      if (existing) return existing;
    }
    this.nodes.set(node.id, node);
    this.contentIndex.set(key, node.id);
    return node;
  }

  link(relation: EvidenceRelation) {
    const dup = this.relations.some(
      (item) =>
        item.fromId === relation.fromId &&
        item.toId === relation.toId &&
        item.relationType === relation.relationType,
    );
    if (!dup) this.relations.push(relation);
  }

  get(id: string): EvidenceNode | undefined {
    return this.nodes.get(id);
  }

  list(): EvidenceNode[] {
    return [...this.nodes.values()];
  }

  toPack(): EvidencePack {
    return {
      nodes: this.list(),
      relations: [...this.relations],
    };
  }
}

export function createEvidenceRegistry(projectId: string) {
  return new EvidenceRegistry(projectId);
}
