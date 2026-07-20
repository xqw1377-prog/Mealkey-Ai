/**

 * 严谨性验收：证据门禁 / 能力分 / 委员会证据引用 / Brief 种子

 */

import { describe, expect, it } from "vitest";

import {

  CAPABILITY_SCORE_CAP_WITHOUT_OUTCOME,

  assessFounderCapabilities,

} from "@/server/founder-layer/capability/growth/scoring";

import { createEvidenceRegistry } from "@/server/founder-layer/evidence/registry";

import { bindEvidenceToJudgement } from "@/server/founder-layer/evidence/bind";

import { buildWorldInsight } from "@/server/founder-layer/capability/cognition/world";

import {

  addPrimaryFact,

  countFacts,

  isVerifiedPrimaryFact,

  primaryEvidenceCoverage,

  seedPrimaryFactsFromBrief,

} from "../../../packages/agents/src/m-pnt/consulting";

import {

  buildHeuristicOpinions,

  sanitizeOpinionEvidence,

} from "../../../packages/agents/src/founder-os";



describe("严谨性 · 证据绑定", () => {

  it("无硬事实时 sufficient=false，且不得靠假设冒充充分", () => {

    const registry = createEvidenceRegistry("proj_rigor");

    const bound = bindEvidenceToJudgement({

      registry,

      projectId: "proj_rigor",

      missionId: "m1",

      agent: "M-PNT",

      judgement: "应立即全国加盟扩张",

      drafts: [],

      padFrom: ["假设客群足够大", "假设供应链能跟上"],

    });

    expect(bound.sufficient).toBe(false);

    expect(bound.gaps.length).toBeGreaterThan(0);

    expect(bound.evidence.some((e) => e.type === "ASSUMPTION")).toBe(true);

  });



  it("≥2 条硬证据且无假设填充时 sufficient=true", () => {

    const registry = createEvidenceRegistry("proj_rigor2");

    const bound = bindEvidenceToJudgement({

      registry,

      projectId: "proj_rigor2",

      missionId: "m2",

      agent: "M-MKT",

      judgement: "先验证单店模型",

      drafts: [

        {

          label: "门店观察",

          content: "周末翻台率稳定高于工作日 30%",

          type: "FACT",

          sourceLevel: "company_asset",

          confidence: 0.8,

        },

        {

          label: "销售笔记",

          content: "家庭客客单稳定在 90–110",

          type: "FACT",

          sourceLevel: "company_asset",

          confidence: 0.78,

        },

        {

          label: "竞品笔记",

          content: "同商圈竞品尚未占住家庭心智",

          type: "DATA",

          sourceLevel: "company_asset",

          confidence: 0.7,

        },

      ],

    });

    expect(bound.sufficient).toBe(true);

  });

});



describe("严谨性 · 能力分", () => {

  it("无验证结果时分数不超过上限，且不会相对先验上涨", () => {

    const prior = assessFounderCapabilities({

      memory: {

        facts: [],

        decisions: [],

        preferences: [],

        patterns: [],

        priorBlock: "",

      },

      decisionsWithOutcome: 0,

      validatedOutcomeCount: 0,

    });

    const afterMeetingNoise = assessFounderCapabilities({

      memory: {

        facts: [

          { label: "a", value: "1" },

          { label: "b", value: "2" },

          { label: "c", value: "3" },

        ],

        decisions: [{ summary: "开会讨论了扩张" }],

        preferences: [{ label: "风格", value: "稳健" }],

        patterns: [],

        priorBlock: "",

      },

      priorScores: prior,

      decisionsWithOutcome: 0,

      validatedOutcomeCount: 0,

      insightPack: {

        packId: "ip",

        missionId: "m",

        agentId: "cognition",

        insights: [

          {

            insightId: "i1",

            plugin: "market",

            title: "市场",

            statement: "噪声洞察",

            confidence: 0.7,

          },

        ],

        summary: "x",

        createdAt: new Date().toISOString(),

      } as never,

    });



    for (const s of afterMeetingNoise) {

      expect(s.score).toBeLessThanOrEqual(CAPABILITY_SCORE_CAP_WITHOUT_OUTCOME);

      expect(s.trend).not.toBe("up");

    }

  });



  it("有验证结果后允许抬升", () => {

    const prior = assessFounderCapabilities({

      decisionsWithOutcome: 0,

      validatedOutcomeCount: 0,

    });

    const after = assessFounderCapabilities({

      priorScores: prior,

      decisionsWithOutcome: 2,

      validatedOutcomeCount: 2,

      memory: {

        facts: [],

        decisions: [{ summary: "带条件推进" }],

        preferences: [],

        patterns: [

          {

            patternId: "p1",

            kind: "success",

            summary: "小样本验证通过",

          },

        ],

        priorBlock: "",

      },

    });

    expect(after.some((s) => s.score > prior.find((p) => p.id === s.id)!.score)).toBe(

      true,

    );

  });

});



describe("严谨性 · Brief 种子", () => {

  it("种子事实为待核实，不计入覆盖与门禁计数", () => {

    const ledger = seedPrimaryFactsFromBrief(undefined, {

      categoryDefinition: "家常湘菜",

      targetCustomer: "城市家庭",

      customerNeed: "干净可预期",

      competitiveSet: ["某湘"],

      founderBelief: "供应链",

    });

    expect(ledger.facts.length).toBeGreaterThanOrEqual(3);

    expect(ledger.facts.every((f) => !isVerifiedPrimaryFact(f))).toBe(true);

    expect(primaryEvidenceCoverage(ledger).ok).toBe(false);

    expect(countFacts(ledger, { stage: "CATEGORY_ANALYSIS" })).toBe(0);



    const verified = addPrimaryFact(ledger, {

      claim: "周末家庭客群堂食占比过半，可核验",

      sourceType: "sales_note",

      relatedStage: "CATEGORY_ANALYSIS",

      strength: "strong",

    });

    expect(countFacts(verified, { stage: "CATEGORY_ANALYSIS" })).toBe(1);

  });

});



describe("严谨性 · 委员会证据", () => {

  it("非法 evidence_used 被剔除，保留合法引用时可维持 support", () => {

    const cleaned = sanitizeOpinionEvidence(

      {

        member: "CSO",

        position: "support",

        confidence: 88,

        summary: "推进",

        judgment: "推进",

        evidence_used: ["E-FAKE-999", "E-REAL-1"],

        reasoning: ["依据真实证据继续推进"],
        risks: [],

        conditions: [],

        veto: false,
      },

      {

        caseId: "c1",

        generatedAt: new Date().toISOString(),

        items: [

          {

            evidenceId: "E-REAL-1",

            sourceAgent: "M-PNT",

            claim: "真实事实",

            strength: "strong",

          },

        ],

      },

    );

    expect(cleaned.evidence_used).toEqual(["E-REAL-1"]);

    expect(cleaned.position).toBe("support");

    expect(cleaned.risks?.[0]).toContain("已剔除");

  });



  it("全部非法引用时 support→conditional", () => {

    const cleaned = sanitizeOpinionEvidence(

      {

        member: "CMO",

        position: "support",

        confidence: 90,

        summary: "推进",

        judgment: "推进",

        evidence_used: ["E-FAKE"],

        reasoning: ["原始支持判断缺少有效证据"],
        risks: [],

        conditions: [],

        veto: false,
      },

      {

        caseId: "c1",

        generatedAt: new Date().toISOString(),

        items: [

          {

            evidenceId: "E-REAL-1",

            sourceAgent: "M-MKT",

            claim: "真实",

            strength: "medium",

          },

        ],

      },

    );

    expect(cleaned.evidence_used).toEqual([]);

    expect(cleaned.position).toBe("conditional");

    expect(cleaned.confidence).toBeLessThanOrEqual(58);

  });



  it("无证据包时启发式不编造 E-BRIEF-001", () => {

    const opinions = buildHeuristicOpinions({

      roster: ["CSO", "CFO"],

      topic: "要不要扩张",

    });

    for (const op of opinions) {

      expect(op.evidence_used?.includes("E-BRIEF-001")).toBe(false);

    }

  });

});



describe("严谨性 · World Sense", () => {

  it("无市场事实时 provider=insufficient", () => {

    const insight = buildWorldInsight(

      {

        projectId: "p",

        mode: "strategy_meeting",

        mission: {

          missionId: "m",

          question: "今天吃什么",

          type: "strategy",

        },

        companyContext: {

          basicInfo: { name: "测试店", industry: "餐饮" },

        },

      } as never,

      { facts: [], decisions: [], preferences: [], patterns: [], priorBlock: "" },

    );

    expect(insight.provider).toBe("insufficient");

    expect(insight.confidence).toBeLessThanOrEqual(0.42);

  });

});


