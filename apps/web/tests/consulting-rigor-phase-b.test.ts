/**

 * 严谨性阶段 B：账本投影 / 确认门禁 / contradicts / 反馈不冒充验证

 */

import { describe, expect, it } from "vitest";

import {

  appendInvalidationContradicts,

  assertMeetingConfirmEvidence,

  createEvidenceRegistry,

  linkSeatContradictions,

  mergeEvidencePackIntoProfile,

} from "@/server/founder-layer/evidence";

import type { FounderDecision } from "@/server/founder-layer/contracts/decision";

import { validateProfile } from "@/lib/profile-schema";



function fakeDecision(

  partial: Partial<FounderDecision> & Pick<FounderDecision, "stance" | "sourceAgent">,

): FounderDecision {

  return {

    decisionId: partial.decisionId || `d_${partial.sourceAgent}`,

    sourceAgent: partial.sourceAgent,

    question: "要不要扩张",

    judgement: partial.judgement || "判断",

    confidence: 0.7,

    evidence: [],

    risks: [],

    nextSteps: [],

    stance: partial.stance,

    metadata: partial.metadata,

  };

}



describe("严谨性 B · 证据账本投影", () => {

  it("Founder Loop 证据写入 ledger，且不得写成 validated_outcome", () => {

    const registry = createEvidenceRegistry("p1");

    const node = registry.ingest({

      id: "E-1",

      projectId: "p1",

      type: "FACT",

      content: "周末翻台高于工作日",

      source: "市场引擎",

      sourceLevel: "engine_derived",

      reliability: 0.8,

      domain: "market",

      createdAt: new Date().toISOString(),

      status: "accepted",

    });

    // 即使误标 validated_outcome，投影也要降级

    registry.ingest({

      ...node,

      id: "E-2",

      content: "误标验证结果",

      sourceLevel: "validated_outcome",

    });



    const next = mergeEvidencePackIntoProfile({}, registry.toPack(), {

      missionId: "m1",

    });

    const ledger = next.evidenceLedger as Array<Record<string, unknown>>;

    expect(ledger.some((r) => r.id === "E-1")).toBe(true);

    expect(ledger.every((r) => r.sourceLevel !== "validated_outcome")).toBe(true);

    expect((next.lastEvidencePack as { missionId?: string }).missionId).toBe("m1");



    const parsed = validateProfile(JSON.stringify(next));

    expect(Array.isArray(parsed.evidenceLedger)).toBe(true);

  });

});



describe("严谨性 B · 确认门禁", () => {

  it("证据不足且未放行时抛错", () => {

    expect(() =>

      assertMeetingConfirmEvidence({

        parentEvidenceIds: ["only-one"],

        evidenceSufficient: false,

      }),

    ).toThrow(/确认失败/);

  });



  it("允许假设推进时 mode=hypothesis", () => {

    const gate = assertMeetingConfirmEvidence({

      parentEvidenceIds: [],

      allowInsufficientEvidence: true,

    });

    expect(gate.mode).toBe("hypothesis");

  });



  it("≥2 条证据时 mode=formal", () => {

    const gate = assertMeetingConfirmEvidence({

      parentEvidenceIds: ["E-a", "E-b"],

    });

    expect(gate.mode).toBe("formal");

    expect(gate.evidenceIds).toHaveLength(2);

  });

});



describe("严谨性 B · contradicts", () => {

  it("席位对立写入 contradicts 关系", () => {

    const registry = createEvidenceRegistry("p2");

    registry.ingest({

      id: "I-sup",

      projectId: "p2",

      type: "INSIGHT",

      content: "支持扩张",

      source: "市场",

      sourceLevel: "engine_derived",

      reliability: 0.7,

      domain: "market",

      createdAt: new Date().toISOString(),

      status: "accepted",

    });

    registry.ingest({

      id: "I-opp",

      projectId: "p2",

      type: "INSIGHT",

      content: "反对扩张",

      source: "资本",

      sourceLevel: "engine_derived",

      reliability: 0.7,

      domain: "capital",

      createdAt: new Date().toISOString(),

      status: "accepted",

    });



    const linked = linkSeatContradictions(registry, [

      fakeDecision({

        sourceAgent: "M-MKT",

        stance: "support",

        metadata: { missionId: "m-support", insightId: "I-sup", producedAt: new Date().toISOString() },
      }),

      fakeDecision({

        sourceAgent: "M-ED",

        stance: "oppose",

        metadata: { missionId: "m-oppose", insightId: "I-opp", producedAt: new Date().toISOString() },
      }),

    ]);

    expect(linked).toBeGreaterThanOrEqual(1);

    expect(

      registry.toPack().relations.some((r) => r.relationType === "contradicts"),

    ).toBe(true);

  });



  it("验证证伪追加 contradicts 到 lastEvidencePack", () => {

    const next = appendInvalidationContradicts(

      {

        lastEvidencePack: {

          nodeCount: 1,

          relationCount: 0,

          nodes: [],

          relations: [],

          projectedAt: new Date().toISOString(),

        },

      },

      {

        resultEvidenceId: "E-VAL-1",

        parentEvidenceIds: ["E-OLD-1", "E-OLD-2"],

      },

    );

    const relations = (next.lastEvidencePack as { relations: Array<{ relationType: string }> })

      .relations;

    expect(relations.filter((r) => r.relationType === "contradicts")).toHaveLength(2);

  });

});


