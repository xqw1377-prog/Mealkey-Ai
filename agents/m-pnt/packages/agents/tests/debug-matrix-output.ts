import { runTheoryMatrix } from "../src/m-pnt/matrix/index.ts";
import type { MKContext } from "../../agent-sdk/src/index.ts";

const ctx: MKContext = {
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

(async () => {
  const r = await runTheoryMatrix(ctx);

  console.log("=== 三个 Agent 评估结果 ===");
  const labels: Record<string, string> = {
    ries: "里斯定位",
    trout: "特劳特定位",
    ye_maozhong: "叶茂中冲突营销",
  };

  for (const id of ["ries", "trout", "ye_maozhong"] as const) {
    const v = r.views[id];
    console.log(`\n【${labels[id]}】`);
    console.log(`  推荐等级: ${v.theory_recommend}`);
    console.log(`  首选: ${v.preferred_direction}`);
    console.log(`  选择理由: ${v.why_this_direction}`);

    console.log(`  各方向评分:`);
    for (const ds of v.direction_scores) {
      console.log(`    ${ds.name}: ${ds.theory_score}分 (${ds.theory_recommend})`);
    }

    console.log(`  风险:`);
    for (const risk of v.main_risks) {
      console.log(`    ${risk.severity}: ${risk.risk}`);
    }

    console.log(`  淘汰:`);
    for (const rej of v.rejected_directions) {
      console.log(`    ${rej.name}: ${rej.reason}`);
    }
  }

  console.log(`\n=== Cross-Fire 辩论 ==`);
  console.log(`  博弈叙事: ${r.crossFire.game_summary}`);
  console.log(`  冲突点:`);
  for (const c of r.crossFire.conflicts) {
    console.log(`    - ${c}`);
  }
  console.log(`  攻击回合:`);
  for (const ch of r.crossFire.challenges) {
    console.log(`    ${ch.from} → ${ch.to}`);
    console.log(`      攻击: ${ch.attack}`);
    console.log(`      防守: ${ch.defense_hint}`);
    console.log(`      严重度: ${ch.severity}`);
  }

  console.log(`\n=== Synthesis 最终决策 ==`);
  console.log(`  决策: ${r.synthesis.decision_recommend}`);
  console.log(`  主推: ${r.synthesis.final_recommended_position}`);
  console.log(`  次选: ${r.synthesis.secondary_option}`);
  console.log(`  综合评分: ${r.synthesis.overall_score}`);
  console.log(`  心智等级: ${r.synthesis.mind_position_level}`);
  console.log(`  最大风险: ${r.synthesis.max_risk_severity}`);
  console.log(`  选择理由: ${r.synthesis.why_choose_this}`);
  console.log(`  不选理由: ${r.synthesis.why_not_others}`);
})().catch(console.error);
