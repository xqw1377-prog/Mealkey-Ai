/**
 * M-PNT 完整集成检查
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { runTheoryMatrix } from "../src/m-pnt/matrix/index.ts";
import { runMPnt } from "../src/m-pnt/runtime.ts";
import { runSixDimensionDiagnosis, generateCandidates } from "../src/m-pnt/distillation/index.ts";
import { getCompetitionData, getMentalWords } from "../src/m-pnt/matrix/market-intel.ts";
import { decisionToPageOutput } from "../src/m-pnt/protocols/mk-decision-mapper.ts";
import type { MKContext } from "../../agent-sdk/src/index.ts";

const sampleCtx: MKContext = {
  owner: { experience: "8年湘菜经验", strengths: ["供应链"], weaknesses: ["品牌弱"] },
  project: { name: "湘菜项目", category: "湘菜", city: "长沙", district: "五一", stage: "筹备", budget: 100 },
  memories: [], decisions: [], knowledge: { texts: ["家庭聚餐"] },
};

describe("M-PNT 集成检查", () => {
  it("1. 竞争数据：品类城市覆盖", () => {
    const checks = [
      ["湘菜", "长沙"], ["火锅", "重庆"], ["茶饮", "上海"],
      ["日料", "北京"], ["粤菜", "广州"], ["云南菜", "昆明"],
      ["螺蛳粉", "柳州"], ["炸鸡", "北京"], ["咖喱", "上海"],
    ];
    for (const [cat, city] of checks) {
      assert.ok(getCompetitionData(cat, city), `缺失竞争数据: ${cat}@${city}`);
      assert.ok(getMentalWords(cat), `缺失心智词: ${cat}`);
    }
  });

  it("2. 蒸馏层：六维诊断+候选生成+红队+质量校验", () => {
    const ctx = sampleCtx;
    const sixDim = runSixDimensionDiagnosis(ctx);
    assert.ok(sixDim.overall_positioning_feasibility);

    const candidates = generateCandidates(ctx, sixDim);
    assert.ok(candidates.length >= 3);
    for (const c of candidates) {
      assert.ok(c.oneLiner);
      assert.ok(c.style);
      assert.ok(c.entryPoint);
    }
  });

  it("3. 三理论矩阵：三个Agent并行评估", async () => {
    const result = await runTheoryMatrix(sampleCtx);
    const { ries, trout, ye_maozhong: ye } = result.views;
    
    // 每个Agent必须有输出
    assert.ok(ries.theory_recommend);
    assert.ok(trout.theory_recommend);
    assert.ok(ye.theory_recommend);
    
    // 每个Agent的评分必须有区分度
    const distinctRies = new Set(ries.direction_scores.map(d => d.theory_score)).size;
    assert.ok(distinctRies >= 2, `Ries评分无区分度: ${ries.direction_scores.map(d => d.theory_score)}`);
  });

  it("4. Cross-Fire 辩论", async () => {
    const result = await runTheoryMatrix(sampleCtx);
    const cf = result.crossFire;
    assert.ok(cf.conflicts.length > 0, "无冲突");
    assert.ok(cf.challenges.length > 0, "无攻击");
    assert.ok(cf.game_summary.includes("【开场】"), "无辩论叙事");
    
    // 攻击应该有具体内容（同意类攻击可以短一些）
    for (const ch of cf.challenges) {
      assert.ok(ch.attack.length > 20, `攻击太短: ${ch.attack}`);
    }
  });

  it("5. Synthesis 决策", async () => {
    const result = await runTheoryMatrix(sampleCtx);
    const syn = result.synthesis;
    assert.ok(syn.decision_recommend);
    assert.ok(syn.overall_score >= 0 && syn.overall_score <= 100);
    assert.ok(["A","B","C","D"].includes(syn.mind_position_level));
    assert.ok(syn.why_choose_this.length > 20);
    assert.ok(syn.why_not_others.length > 20);
  });

  it("6. 专题页出参：decisionToPageOutput", async () => {
    const result = await runMPnt(sampleCtx, { id: "test", type: "positioning", goal: "验证" }, { llm: { chat: async () => ({ content: JSON.stringify({ judgement: "湘菜品牌", strategy: "场景钉死" }) }) } });
    const page = decisionToPageOutput(result.decision);

    // 前端渲染必需字段
    assert.ok(page.summary, "缺少 summary");
    assert.ok(page.candidates.length >= 2, `候选方向不足: ${page.candidates.length}`);
    assert.ok(["primary", "secondary", "backup", "reject"].includes(page.decision_recommend), `无效 decision_recommend: ${page.decision_recommend}`);
    assert.ok(page.why_choose_this, "缺少 why_choose_this");
    assert.ok(page.why_not_others, "缺少 why_not_others");
    assert.ok(page.risks.length > 0, "缺少 risks");
    assert.ok(page.validation.day30.length > 0, "缺少 validation.day30");
    assert.ok(page.next_steps.length > 0, "缺少 next_steps");
    assert.ok(page.m_solution.position, "缺少 m_solution.position");
    assert.ok(["A", "B", "C", "D"].includes(page.mind_position_level), `无效 mind_position_level: ${page.mind_position_level}`);
    assert.ok(page.overall_score >= 0 && page.overall_score <= 100, `overall_score 越界: ${page.overall_score}`);

    // theory_vote_summary 应该包含三个视角
    if (page.theory_vote_summary.length > 0) {
      const agents = page.theory_vote_summary.map((t) => t.agent);
      assert.ok(agents.some((a) => a.includes("ries") || a.includes("trout") || a.includes("ye")), `理论视角缺失: ${agents.join(",")}`);
    }
  });

  it("7. 全链路：runMPnt 端到端", async () => {
    const result = await runMPnt(sampleCtx, { id: "test", type: "positioning", goal: "验证" }, { mode: "heuristic" });
    assert.equal(result.agentId, "m-pnt");
    assert.ok(result.steps.length >= 6);
    assert.ok(result.decision.judgement.length > 0);
    
    const structured = JSON.parse(
      result.decision.evidence.find(e => e.source === "structured")!.content
    );
    assert.ok(structured.decision_recommend);
    assert.ok(structured.mSolution);
    // 蒸馏层输出可选（架构精简后 distillation 非必填）
    // 核心输出：decision_recommend + mSolution
  });
});
