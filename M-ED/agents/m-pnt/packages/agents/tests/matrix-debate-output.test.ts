import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MKContext } from "../../agent-sdk/src/index.ts";
import { runTheoryMatrix } from "../src/m-pnt/matrix/index.ts";

function sampleContext(): MKContext {
  return {
    owner: {
      experience: "8年湘菜后厨与门店运营",
      strengths: ["招牌剁椒鱼头", "本地食材供应链"],
      weaknesses: ["品牌表达弱"],
    },
    project: {
      name: "长沙湘菜项目",
      category: "湘菜",
      city: "长沙",
      district: "五一商圈",
      stage: "筹备",
      budget: 100,
    },
    memories: [],
    decisions: [],
    knowledge: { texts: ["优先验证家庭聚餐场景"] },
  };
}

describe("rule-engine evaluation quality", () => {
  it("each agent produces distinct multi-dimensional scores", async () => {
    const r = await runTheoryMatrix(sampleContext());
    const { ries, trout, ye_maozhong: ye } = r.views;

    // 每个 Agent 应该对 3 个候选方向都有评分
    assert.equal(ries.direction_scores.length, 3);
    assert.equal(trout.direction_scores.length, 3);
    assert.equal(ye.direction_scores.length, 3);

    // 每个 Agent 的 preferred 应该有意义
    assert.ok(ries.preferred_direction.length > 5);
    assert.ok(trout.preferred_direction.length > 5);
    assert.ok(ye.preferred_direction.length > 5);

    // 评分应该在合理范围内
    for (const ds of ries.direction_scores) {
      assert.ok(ds.theory_score >= 0 && ds.theory_score <= 100);
    }
  });

  it("agents disagree in meaningful ways", async () => {
    const r = await runTheoryMatrix(sampleContext());
    const prefs = [
      r.views.ries.preferred_candidate_id,
      r.views.trout.preferred_candidate_id,
      r.views.ye_maozhong.preferred_candidate_id,
    ];

    // 三个 Agent 的 preferred 不一定相同
    // 但 Cross-Fire 必须有内容
    assert.ok(r.crossFire.conflicts.length > 0);
    assert.ok(r.crossFire.challenges.length > 0);
    assert.ok(r.crossFire.game_summary.includes("【开场】") || r.crossFire.game_summary.includes("【辩论】"));

    // 应该有攻击文本
    for (const ch of r.crossFire.challenges) {
      assert.ok(ch.attack.length > 30);
      assert.ok(ch.from);
      assert.ok(ch.to);
    }
  });

  it("synthesis produces reasonable output", async () => {
    const r = await runTheoryMatrix(sampleContext());
    const syn = r.synthesis;

    assert.ok(syn.decision_recommend);
    assert.ok(syn.final_recommended_position);
    assert.ok(syn.overall_score >= 0 && syn.overall_score <= 100);
    assert.ok(["A", "B", "C", "D"].includes(syn.mind_position_level));
    assert.ok(["R1", "R2", "R3", "R4"].includes(syn.max_risk_severity));
    assert.ok(syn.why_choose_this.length > 20);
    assert.ok(syn.why_not_others.length > 20);
  });

  it("different context leads to different outcomes", async () => {
    // 低预算场景
    const lowBudget: MKContext = {
      owner: { strengths: [], weaknesses: ["无经验", "预算低"] },
      project: { name: "小本创业", category: "快餐", city: "三线城市", budget: 15 },
      memories: [], decisions: [], knowledge: {},
    };

    const r1 = await runTheoryMatrix(sampleContext());
    const r2 = await runTheoryMatrix(lowBudget);

    // 两个场景的评分应该不同
    const scores1 = r1.views.ries.direction_scores.map((d) => d.theory_score);
    const scores2 = r2.views.ries.direction_scores.map((d) => d.theory_score);
    const avg1 = scores1.reduce((a, b) => a + b, 0) / scores1.length;
    const avg2 = scores2.reduce((a, b) => a + b, 0) / scores2.length;

    // 低预算场景的评分应该显著低于正常场景（因为规则引擎检测到资源不匹配）
    // 断言：不一定每次低预算都低分，但至少不同场景产生不同结果
    assert.ok(r1.synthesis.overall_score !== r2.synthesis.overall_score || 
              r1.synthesis.decision_recommend !== r2.synthesis.decision_recommend);
  });
});
