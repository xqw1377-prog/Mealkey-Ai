/**
 * End-to-end offline demo: 湘菜样例
 * Run: npx tsx src/m-pnt/demo-xiangcai.ts
 */
import type { MKContext } from "@mealkey/agent-sdk";
import { runMPnt } from "./runtime";

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
    profile: {
      area: 180,
      seats: 70,
    },
  },
  memories: [],
  decisions: [],
  knowledge: {
    texts: ["优先验证家庭聚餐与朋友小聚场景"],
  },
};

async function main() {
  const result = await runMPnt(
    context,
    {
      id: "demo_mission_xiangcai",
      type: "positioning",
      goal: "完成湘菜品牌定位决策",
    },
    { mode: "heuristic" },
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
