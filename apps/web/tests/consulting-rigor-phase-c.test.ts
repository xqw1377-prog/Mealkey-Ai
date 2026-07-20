/**

 * 严谨性阶段 C：同题 supersedes + 能力严谨性聚合

 */

import { describe, expect, it } from "vitest";

import {

  findConflictingOpenDecision,

  judgementsConflict,

  normalizeProblem,

  problemFingerprint,

} from "@/server/founder-layer/decision/problem-fingerprint";

import { buildCapabilityRigor } from "@/server/founder-layer/capability/growth/rigor";



describe("严谨性 C · 议题指纹", () => {

  it("同品牌同题指纹一致，不同品牌不一致", () => {

    const a = problemFingerprint("brand_a", "要不要进入新城市扩张？");

    const b = problemFingerprint("brand_a", "要不要进入新城市扩张?");

    const c = problemFingerprint("brand_b", "要不要进入新城市扩张？");

    expect(normalizeProblem("要不要进入新城市扩张？")).toBe(

      normalizeProblem("要不要进入新城市扩张?"),

    );

    expect(a).toBe(b);

    expect(a).not.toBe(c);

  });



  it("极性冲突的 judgement 判定为冲突", () => {

    expect(

      judgementsConflict("应推进扩张进入新城市", "现阶段不宜推进扩张"),

    ).toBe(true);

    expect(

      judgementsConflict("先验证单店模型再扩张", "先验证单店模型再扩张。"),

    ).toBe(false);

  });



  it("开放旧案冲突时返回 related id", () => {

    const fp = problemFingerprint("b1", "要不要开第二家店");

    const hit = findConflictingOpenDecision({

      brandId: "b1",

      problem: "要不要开第二家店？",

      judgement: "暂缓开店，先验证人效",

      candidates: [

        {

          id: "old_1",

          problem: "要不要开第二家店",

          judgement: "立即推进开第二家店",

          outcome: JSON.stringify({

            status: "validating",

            problemFingerprint: fp,

            brandId: "b1",

          }),

        },

      ],

    });

    expect(hit?.id).toBe("old_1");

  });



  it("无冲突时不返回", () => {

    const hit = findConflictingOpenDecision({

      brandId: "b1",

      problem: "要不要开第二家店",

      judgement: "立即推进开第二家店",

      candidates: [

        {

          id: "old_1",

          problem: "要不要开第二家店",

          judgement: "立即推进开第二家店",

          outcome: JSON.stringify({ status: "validating", brandId: "b1" }),

        },

      ],

    });

    expect(hit).toBeNull();

  });



  it("已 superseded 的旧案不再触发冲突", () => {

    const hit = findConflictingOpenDecision({

      brandId: "b1",

      problem: "要不要开第二家店",

      judgement: "暂缓开店",

      candidates: [

        {

          id: "old_1",

          problem: "要不要开第二家店",

          judgement: "立即开店",

          outcome: JSON.stringify({ status: "superseded", brandId: "b1" }),

        },

      ],

    });

    expect(hit).toBeNull();

  });

});



describe("严谨性 C · 能力 rigor 聚合", () => {

  it("统计 validated_outcome 与启发式占比", () => {

    const rigor = buildCapabilityRigor({

      evidenceLedger: [

        { id: "E1", sourceLevel: "validated_outcome", origin: "validation_os" },

        {

          id: "E2",

          sourceLevel: "user_asserted",

          type: "ASSUMPTION",

          origin: "founder_loop",

          content: "待核实假设",

        },

        {

          id: "E3",

          sourceLevel: "company_asset",

          type: "FACT",

          origin: "founder_loop",

          content: "门店观察",

        },

      ],

      lastDecisionPack: { evidenceStatus: "insufficient" },

      validationTasks: [{ id: "t1", status: "active" }],

    });

    expect(rigor.validatedOutcomeCount).toBe(1);

    expect(rigor.evidenceSufficiency).toBe("insufficient");

    expect(rigor.heuristicRatio).toBeGreaterThan(0);

    expect(rigor.openValidationCount).toBe(1);

    expect(rigor.heuristicShareLabel).toContain("/");

  });



  it("无样本时启发式占比为 0", () => {

    const rigor = buildCapabilityRigor({});

    expect(rigor.validatedOutcomeCount).toBe(0);

    expect(rigor.heuristicRatio).toBe(0);

    expect(rigor.evidenceSufficiency).toBe("unknown");

  });

});


