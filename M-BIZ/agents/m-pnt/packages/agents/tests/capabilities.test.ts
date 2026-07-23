import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MKContext } from "../../agent-sdk/src/index.ts";
import {
  mPntCapabilities,
  getCapability,
  runMPnt,
  detectPositioningIntent,
  mapPositioningProblem,
  mapFinalJsonToMKDecision,
  readStructured,
  createMockLlm,
} from "../src/m-pnt/index.ts";

function sampleContext(overrides: Partial<MKContext["project"]> = {}): MKContext {
  return {
    owner: {
      experience: "5年餐饮门店运营",
      strengths: ["口味研发", "本地供应链"],
      weaknesses: ["品牌表达"],
    },
    project: {
      name: "长沙湘菜样例店",
      category: "湘菜",
      city: "长沙",
      district: "五一商圈",
      stage: "筹备",
      budget: 80,
      ...overrides,
    },
    memories: [],
    decisions: [],
    knowledge: {},
  };
}

describe("capabilities", () => {
  // MealKey 环境下，每个测试前设置 mock LLM
  it("registers exactly six capabilities", () => {
    assert.equal(mPntCapabilities.length, 6);
    for (const id of [
      "category_analysis",
      "customer_portrait",
      "price_positioning",
      "competitor_analysis",
      "differentiation",
      "brand_tonality",
    ]) {
      assert.ok(getCapability(id), `missing ${id}`);
    }
  });

  it("each capability returns a valid MKDecision", async () => {
    const ctx = sampleContext();
    for (const cap of mPntCapabilities) {
      const d = await cap.execute({}, ctx);
      assert.ok(d.id);
      assert.ok(d.problem);
      assert.ok(d.observation);
      assert.ok(d.diagnosis);
      assert.ok(d.judgement);
      assert.ok(d.strategy);
      assert.ok(d.action);
      assert.ok(d.confidence >= 0 && d.confidence <= 1);
      assert.ok(Array.isArray(d.evidence) && d.evidence.length > 0);
    }
  });

  it("differentiation embeds theory views payload", async () => {
    const cap = getCapability("differentiation")!;
    const d = await cap.execute({}, sampleContext());
    const payload = readStructured(d);
    assert.ok(payload?.theoryViews);
    assert.ok(payload?.candidates);
  });

  it("differentiation includes scoring fields", async () => {
    const cap = getCapability("differentiation")!;
    const d = await cap.execute({}, sampleContext());
    const payload = readStructured(d);
    const synthesis = payload?.synthesis as Record<string, unknown> | undefined;
    assert.ok(synthesis?.overall_score !== undefined, "missing overall_score");
    assert.ok(synthesis?.mind_position_level !== undefined, "missing mind_position_level");
    assert.ok(synthesis?.max_risk_severity !== undefined, "missing max_risk_severity");
    const score = synthesis.overall_score as number;
    assert.ok(score >= 0 && score <= 100, `overall_score out of range: ${score}`);
    const level = synthesis.mind_position_level as string;
    assert.ok(["A", "B", "C", "D"].includes(level), `invalid mind level: ${level}`);
  });
});

describe("runMPnt pipeline (MealKey mode)", () => {
  // 无独立的 before/after，每个测试独立设置 LLM
  it("runs full workflow and returns fused MKDecision", async () => {
    const result = await runMPnt(
      sampleContext(),
      { id: "mission_1", type: "positioning", goal: "完成湘菜品牌定位" },
      { llm: createMockLlm() },
    );
    assert.equal(result.agentId, "m-pnt");
    assert.equal(result.missionId, "mission_1");
    assert.equal(result.mode, "llm");
    assert.ok(result.steps.length >= 6);
    assert.equal(result.decision.problem, "品牌定位策略");
    assert.ok(result.decision.judgement.length > 0);
    const structured = readStructured(result.decision);
    assert.ok(structured?.decision_recommend);
    assert.ok(structured?.mSolution);
    assert.ok(structured?.overall_score !== undefined, "fused decision missing overall_score");
    assert.ok(structured?.mind_position_level !== undefined, "fused decision missing mind_position_level");
  });

  it("mock LLM judgement flows through pipeline", async () => {
    const result = await runMPnt(
      sampleContext(), undefined,
      { llm: createMockLlm({ judgement: "LLM主推家庭局心智位" }) },
    );
    assert.equal(result.mode, "llm");
    // first capability step should carry mock judgement
    assert.ok(
      result.steps[0].decision.judgement.includes("Mock") ||
        result.steps[0].decision.judgement.includes("家庭"),
    );
  });
});

describe("intent + mapper", () => {
  it("detects positioning intents", () => {
    assert.equal(detectPositioningIntent("帮我做品牌定位"), true);
    assert.equal(detectPositioningIntent("今天天气如何"), false);
    assert.ok(mapPositioningProblem("开什么品类比较好"));
  });

  it("maps final JSON to MKDecision", () => {
    const d = mapFinalJsonToMKDecision(
      {
        summary: "成为周末家庭局首选湘菜",
        confidence: 82,
        decision_recommend: "primary",
        brandPositioning: {
          category: "湘菜",
          targetCustomers: "家庭聚餐客群",
          priceRange: "80-100",
          differentiation: "场景钉死",
          brandTonality: "实在有脾气",
          mentalPosition: "周末家庭局首选湘菜",
        },
        why_choose_this: "场景真且可交付",
        keyFindings: [
          { dimension: "品类", conclusion: "成熟可做", confidence: 80 },
        ],
        risks: [
          { risk: "同质化", level: "medium", code: "R2", mitigation: "强化场景" },
        ],
        nextSteps: [{ step: "验证主场景", priority: "high", timeline: "2周" }],
        mSolution: {
          situation: "筹备期湘菜项目",
          insight: "家庭场景仍有空位",
          position: "周末家庭局首选湘菜",
          strategy: "场景钉死+菜单减法",
          action: "两周内完成话术与套餐",
          validation: "30天转述测试",
          decision: "主推该方向",
        },
      },
      sampleContext(),
    );
    assert.equal(d.problem, "品牌定位策略");
    assert.ok(d.judgement.includes("家庭") || d.judgement.includes("湘菜"));
    assert.ok(d.confidence > 0.8 && d.confidence <= 1);
    assert.equal(readStructured(d)?.decision_recommend, "primary");
  });
});
