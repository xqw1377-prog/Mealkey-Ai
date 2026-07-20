import { describe, expect, it } from "vitest";
import {
  assertAgentConsultingNotDegraded,
  evaluateResearchEvidenceStrength,
} from "../../../packages/agents/src/consulting-os/delivery-gates";
import type { AgentConsultingProject, ResearchPack } from "../../../packages/agents/src/consulting-os/types";

function pack(partial: Partial<ResearchPack>): ResearchPack {
  return {
    packId: "rp_1",
    status: "confirmed",
    headline: "区域竞争与客群结构已摸清",
    sections: [
      { title: "A", body: "x".repeat(40) },
      { title: "B", body: "y".repeat(40) },
      { title: "C", body: "z".repeat(40) },
      { title: "D", body: "w".repeat(40) },
    ],
    risks: [],
    generatedAt: new Date().toISOString(),
    sources: [
      "https://example.com/a | 区域客流",
      "https://example.com/b | 竞品定价",
    ],
    collectionMode: "hybrid",
    ...partial,
  };
}

function project(research?: ResearchPack | null): AgentConsultingProject {
  return {
    id: "ac_1",
    agentId: "m-mkt",
    name: "测试",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    assets: { research: research || undefined },
  } as AgentConsultingProject;
}

describe("delivery-gates：禁降级确认", () => {
  it("heuristic / degradationNote 不能确认策略", () => {
    expect(() =>
      assertAgentConsultingNotDegraded(
        project(pack({ collectionMode: "heuristic" })),
        "确认策略",
      ),
    ).toThrow(/降级|启发式/);

    expect(() =>
      assertAgentConsultingNotDegraded(
        project(
          pack({
            collectionMode: "hybrid",
            degradationNote: "引擎超时，已降级本地推断",
          }),
        ),
        "签字交付",
      ),
    ).toThrow(/降级/);
  });

  it("hybrid + 来源齐可过证据强度", () => {
    const { ok, missing } = evaluateResearchEvidenceStrength(pack({}));
    expect(ok).toBe(true);
    expect(missing).toEqual([]);
    expect(() =>
      assertAgentConsultingNotDegraded(project(pack({})), "确认策略"),
    ).not.toThrow();
  });
});
