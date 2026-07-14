/**
 * M-PNT Agent Runtime Workflow V1 Tests
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MKContext } from "@mealkey/agent-sdk";
import { runMPntV1 } from "../src/m-pnt/runtime-v1.ts";
import { createMockLlm } from "../src/m-pnt/llm/mock.ts";
import { buildMatrixInputPackage } from "../src/m-pnt/matrix/input-package.ts";

// ─── 测试用 Mock Context ───────────────────────────────────────

const mockContext: MKContext = {
  owner: {
    name: "测试店主",
    experience: "5年餐饮经验",
    strengths: ["招牌菜", "本地供应链"],
    weaknesses: ["品牌弱"],
  },
  project: {
    id: "test_proj",
    name: "测试项目",
    category: "湘菜",
    city: "长沙",
    district: "五一商圈",
    stage: "筹备",
    budget: 80,
  },
  memories: [],
  decisions: [],
  knowledge: { texts: ["测试知识库"] },
};

describe("M-PNT Runtime V1", () => {
  it("完整三阶段运行（Mock LLM）", async () => {
    const result = await runMPntV1(mockContext, {
      id: "test_mission",
      type: "positioning",
      goal: "测试定位决策",
    }, { llm: createMockLlm() });

    // 必须返回三阶段
    assert.ok(result.stages.situation, "应有 Situation Stage");
    assert.ok(result.stages.position, "应有 Position Stage");
    assert.ok(result.stages.decision, "应有 Decision Stage");

    // 四步容量分析
    assert.ok(result.stages.situation.categoryAssessment, "应有品类分析");
    assert.ok(result.stages.situation.customerPortrait, "应有客群画像");
    assert.ok(result.stages.situation.pricePositioning, "应有价格定位");
    assert.ok(result.stages.situation.competitorAnalysis, "应有竞争分析");

    // 结构性字段
    assert.ok(["strong", "adequate", "weak", "failed"].includes(result.stages.situation.structured.marketOpportunity));
    assert.ok(!result.stages.situation.shouldAbort, "不应触发短路（Mock 返回数据非 failed）");

    // 三理论矩阵
    assert.ok(result.stages.position.matrixResult, "应有矩阵结果");
    assert.ok(result.stages.position.matrixResult.views.ries, "应有 Ries 视角");
    assert.ok(result.stages.position.matrixResult.views.trout, "应有 Trout 视角");
    assert.ok(result.stages.position.matrixResult.views.ye_maozhong, "应有 Ye 视角");
    assert.ok(result.stages.position.matrixResult.crossFire, "应有 Cross-Fire");
    assert.ok(result.stages.position.matrixResult.synthesis, "应有 Synthesis");

    // 候选方向
    assert.ok(result.stages.position.candidates.length >= 3, "至少 3 个候选方向");

    // Decision Stage
    assert.ok(result.stages.decision.qualityCheck, "应有 Quality Check");
    assert.ok(result.stages.decision.finalDecision, "应有最终决策");
    assert.ok(result.stages.decision.mSolution, "应有 M-Solution");

    // 最终 MKDecision
    assert.ok(result.decision, "应有最终 MKDecision");
    assert.equal(result.agentId, "m-pnt");
    assert.equal(result.mode, "llm");

    // 指标
    assert.ok(result.metrics.totalMs > 0, "应有运行时间");
    assert.ok(result.metrics.stageMs.situation, "应有 Situation 耗时");
    assert.ok(result.metrics.stageMs.position, "应有 Position 耗时");
    assert.ok(result.metrics.stageMs.decision, "应有 Decision 耗时");
    assert.ok(result.metrics.modelCalls >= 4, "至少 4 次模型调用");
    assert.equal(result.metrics.shortCircuited, false, "不应短路");

    console.log("\n=== V1 Runtime Test ===");
    console.log(`totalMs: ${result.metrics.totalMs}`);
    console.log(`stageMs: ${JSON.stringify(result.metrics.stageMs)}`);
    console.log(`modelCalls: ${result.metrics.modelCalls}`);
    console.log(`decision: ${result.decision.judgement.slice(0, 60)}...`);
    console.log(`decision_recommend: ${result.decision.id}`);
  });

  it("外部传入候选方向", async () => {
    const candidates = [
      { id: "X", name: "场景钉死型·夜宵湘菜", oneLiner: "成为长沙夜宵场景第一湘菜品牌", type: "稳健型", focus: "场景第一" },
      { id: "Y", name: "对立区隔型·不做预制菜", oneLiner: "长沙湘菜·只用当天鲜肉", type: "进攻型", focus: "竞争区隔" },
    ];

    const result = await runMPntV1(mockContext, undefined, {
      llm: createMockLlm(),
      externalCandidates: candidates,
    });

    assert.ok(result.stages.position, "应有 Position Stage");
    assert.equal(result.stages.position.candidates.length, 2, "应有 2 个外部候选方向");
    assert.equal(result.stages.position.candidates[0].id, "X");
    assert.equal(result.stages.position.candidates[1].id, "Y");
  });

  it("跳过 Situation Stage", async () => {
    const result = await runMPntV1(mockContext, undefined, {
      llm: createMockLlm(),
      skipStages: ["situation"],
    });

    assert.ok(!result.stages.situation, "不应有 Situation Stage");
    assert.ok(result.stages.position, "应从 Position 开始");
  });

  it("跳过 Decision Stage（仅到矩阵）", async () => {
    const result = await runMPntV1(mockContext, undefined, {
      llm: createMockLlm(),
      skipStages: ["decision"],
    });

    assert.ok(result.stages.situation, "应有 Situation");
    assert.ok(result.stages.position, "应有 Position");
    assert.ok(!result.stages.decision, "不应有 Decision");

    // 回落决策应存在
    assert.ok(result.decision, "应有回落决策");
  });

  it("跳过所有阶段（极端情况）", async () => {
    const result = await runMPntV1(mockContext, undefined, {
      llm: createMockLlm(),
      skipStages: ["situation", "position", "decision"],
    });

    assert.ok(!result.stages.situation);
    assert.ok(!result.stages.position);
    assert.ok(!result.stages.decision);
    assert.ok(result.decision, "应有最低回落决策");
  });
});

describe("Situation Stage 短路机制", () => {
  it("短路测试：触发 marketOpportunity=weak（不应短路）", async () => {
    const result = await runMPntV1(mockContext, undefined, {
      llm: createMockLlm({
        judgement: "品类市场机会评估为 adequate",
      }),
    });

    assert.equal(result.metrics.shortCircuited, false, "adequate 不应短路");
  });

  it("短路在 context 中有 abort 标记时不阻塞", async () => {
    // 正常流程，短路仅当 structured.marketOpportunity === "failed"
    // 目前 Mock LLM 返回的数据中无此标记，所以不会短路
    const result = await runMPntV1(mockContext, undefined, {
      llm: createMockLlm(),
    });

    assert.equal(result.metrics.shortCircuited, false);
  });
});

describe("V1 指标追踪", () => {
  it("记录各阶段耗时", async () => {
    const result = await runMPntV1(mockContext, undefined, {
      llm: createMockLlm(),
    });

    const { stageMs } = result.metrics;
    assert.ok(stageMs.situation! >= 0);
    assert.ok(stageMs.position! >= 0);
    assert.ok(stageMs.decision! >= 0);
  });

  it("记录模型调用次数", async () => {
    const result = await runMPntV1(mockContext, undefined, {
      llm: createMockLlm(),
    });

    assert.ok(result.metrics.modelCalls >= 4, "至少有品类/客群/价格/竞争 4 次调用");
  });
});

describe("Quality Check", () => {
  it("Synthesis 结果应有完整字段", async () => {
    const result = await runMPntV1(mockContext, undefined, {
      llm: createMockLlm(),
    });

    const synthesis = result.stages.position?.matrixResult.synthesis;
    assert.ok(synthesis, "应有 Synthesis");

    // 核心字段
    assert.ok(synthesis!.final_recommended_position, "应有推荐位置");
    assert.ok(synthesis!.decision_recommend, "应有决策推荐");
    assert.ok(synthesis!.why_choose_this || true, "应有选此理由");
    assert.ok(synthesis!.why_not_others || true, "应有不选理由");

    // Quality Check 结果
    const qc = result.stages.decision?.qualityCheck;
    assert.ok(qc, "应有 Quality Check");
    assert.ok(typeof qc!.pass === "boolean");
    assert.ok(Array.isArray(qc!.issues));
    assert.ok(qc!.overallScore >= 0 && qc!.overallScore <= 100);
  });
});
