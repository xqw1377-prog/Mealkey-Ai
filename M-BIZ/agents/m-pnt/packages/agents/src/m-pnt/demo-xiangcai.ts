/**
 * End-to-end offline demo: 湘菜样例
 * Run: npx tsx src/m-pnt/demo-xiangcai.ts          (V0)
 *       npx tsx src/m-pnt/demo-xiangcai.ts --v1    (V1)
 */
import type { MKContext } from "@mealkey/agent-sdk";
import { runMPnt, runMPntUnified } from "./runtime";

const context: MKContext = {
  owner: {
    name: "张老板",
    experience: "8年湘菜后厨与单店运营",
    strengths: ["招牌剁椒鱼头", "本地食材供应链", "老客维护"],
    weaknesses: ["品牌表达弱", "数字化运营不足"],
  },
  project: {
    id: "proj_xiangcai_demo",
    name: "长沙·新湘菜筹备项目",
    category: "湘菜",
    city: "长沙",
    district: "五一/黄兴路商圈",
    stage: "筹备",
    budget: 100,
    profile: { area: 180, seats: 70 },
  },
  memories: [],
  decisions: [],
  knowledge: { texts: ["优先验证家庭聚餐与朋友小聚场景"] },
};

async function main() {
  const useV1 = process.argv.includes("--v1") || process.argv.includes("--runtime-v1");

  if (useV1) {
    const result = await runMPntUnified(
      context,
      { id: "demo_mission_xiangcai", type: "positioning", goal: "完成湘菜品牌定位决策" },
      {
        llm: { chat: async () => ({ content: JSON.stringify({ judgement: "mock" }) }) },
        runtimeVersion: "v1",
      },
    );

    console.log(`=== M-PNT 湘菜样例 · V1 ===`);
    console.log(`mode=llm | totalMs=${result.metrics?.totalMs} | modelCalls=${result.metrics?.modelCalls}`);
    if (result.metrics?.shortCircuited) {
      console.log(`⚠ 短路: ${result.metrics.shortCircuitReason}`);
    }

    console.log(`\n--- 决策概要 ---`);
    console.log(`summary: ${result.pageOutput.summary}`);
    console.log(`decision_recommend: ${result.pageOutput.decision_recommend}`);
    console.log(`overall_score: ${result.pageOutput.overall_score}`);
    console.log(`mind_position_level: ${result.pageOutput.mind_position_level}`);
    console.log(`max_risk_severity: ${result.pageOutput.max_risk_severity}`);

    console.log(`\n--- 三理论投票 ---`);
    for (const v of result.pageOutput.theory_vote_summary) {
      console.log(`  ${v.agent}: ${v.preferred} (${v.theory_recommend})`);
    }

    console.log(`\n=== 最终 MKDecision ===`);
    console.log(JSON.stringify(result.decision, null, 2));
    return;
  }

  // V0 默认
  const result = await runMPnt(
    context,
    { id: "demo_mission_xiangcai", type: "positioning", goal: "完成湘菜品牌定位决策" },
    { llm: { chat: async () => ({ content: JSON.stringify({ judgement: "mock" }) }) } },
  );

  console.log(`=== M-PNT 湘菜样例 · mode=${result.mode} ===`);
  for (const s of result.steps) {
    console.log(
      `- ${s.stepId}: conf=${s.decision.confidence.toFixed(2)} | ${s.decision.judgement.slice(0, 80)}`,
    );
  }
  console.log("\n=== 最终 MKDecision ===");
  console.log(JSON.stringify(result.decision, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
