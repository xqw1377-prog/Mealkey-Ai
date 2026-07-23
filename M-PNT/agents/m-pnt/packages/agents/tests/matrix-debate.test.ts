import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { MKContext } from "../../agent-sdk/src/index.ts";
import { runTheoryMatrix, getTheoryAgent } from "../src/m-pnt/matrix/index.ts";
import { runCrossFireAgent } from "../src/m-pnt/matrix/agents/index.ts";

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

describe("three-agent matrix debate", () => {
  it("each agent produces a TheoryView with distinct stance", async () => {
    const ctx = sampleContext();
    const result = await runTheoryMatrix(ctx);

    const views = result.views;

    // Each agent has a theory_recommend
    assert.ok(["ries", "trout", "ye_maozhong"].every((id) => views[id as keyof typeof views].theory_recommend));

    // Each agent has a preferred_direction
    assert.ok(views.ries.preferred_direction);
    assert.ok(views.trout.preferred_direction);
    assert.ok(views.ye_maozhong.preferred_direction);

    // Each agent has main_risks
    assert.ok(views.ries.main_risks.length > 0);
    assert.ok(views.trout.main_risks.length > 0);
    assert.ok(views.ye_maozhong.main_risks.length > 0);

    // Each agent explains why
    assert.ok(views.ries.why_this_direction.length > 20);
    assert.ok(views.trout.why_this_direction.length > 20);
    assert.ok(views.ye_maozhong.why_this_direction.length > 20);
  });

  it("cross-fire shows challenges/conflicts", async () => {
    const ctx = sampleContext();
    const result = await runTheoryMatrix(ctx);

    const crossFire = result.crossFire;
    assert.ok(crossFire.conflicts.length > 0);
    assert.ok(crossFire.challenges.length > 0);
    assert.ok(crossFire.game_summary.length > 0);

    // Each challenge is a real "attack"
    for (const ch of crossFire.challenges) {
      assert.ok(ch.from);
      assert.ok(ch.to);
      assert.ok(ch.target_direction);
      assert.ok(ch.attack.length > 20, `attack too short: ${ch.attack}`);
      assert.ok(ch.severity);
    }
  });

  it("synthesis produces a clear winner", async () => {
    const ctx = sampleContext();
    const result = await runTheoryMatrix(ctx);

    const syn = result.synthesis;
    assert.ok(syn.decision_recommend);
    assert.ok(syn.final_recommended_position);
    assert.ok(syn.why_choose_this.length > 10);
    assert.ok(syn.why_not_others.length > 10);
    assert.ok(syn.overall_score >= 0 && syn.overall_score <= 100);
    assert.ok(["A", "B", "C", "D"].includes(syn.mind_position_level));
    assert.ok(["R1", "R2", "R3", "R4"].includes(syn.max_risk_severity));
  });

  it("cross-fire debate reads like real argument", async () => {
    const ctx = sampleContext();
    const result = await runTheoryMatrix(ctx);

    // Check that game_summary describes the debate narrative
    const game = result.crossFire.game_summary;
    assert.ok(game.includes("【开场】") || game.includes("【辩论】"));
    assert.ok(game.includes("Ries") || game.includes("里斯"));
    assert.ok(game.includes("Trout") || game.includes("特劳特"));
    assert.ok(game.includes("Ye") || game.includes("叶茂中"));

    // Verify at least some attacks are substantial
    const meaningfulAttacks = result.crossFire.challenges.filter(
      (c) => c.attack.length > 40 && !c.attack.includes("[object Object]"),
    );
    assert.ok(meaningfulAttacks.length >= 2, `only ${meaningfulAttacks.length} meaningful attacks`);
  });
});
