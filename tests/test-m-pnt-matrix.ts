/**
 * M-PNT 三理论 Agent 矩阵测试
 * 每一个理论 = 一个 Agent（ries / trout / ye_maozhong）
 */
import {
  theoryAgents,
  riesAgent,
  troutAgent,
  yeMaozhongAgent,
  runTheoryMatrix,
  runSingleTheoryAgent,
  getTheoryAgent,
  buildMatrixInputPackage,
} from "@mealkey/agents";
import type { MKContext } from "@mealkey/agent-sdk";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(() => fn())
    .then(() => {
      console.log(`✓ ${name}`);
      passed++;
    })
    .catch((e: Error) => {
      console.log(`✗ ${name}: ${e.message}`);
      failed++;
    });
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const sampleContext: MKContext = {
  owner: {
    id: "o1",
    name: "张老板",
    email: null,
    experience: "8年餐饮门店运营",
    strengths: ["招牌剁椒鱼头", "本地供应链"],
    weaknesses: ["品牌表达弱"],
    overallScore: 70,
    riskTolerance: "medium",
    investmentStyle: "moderate",
  },
  project: {
    id: "p1",
    name: "长沙湘菜样例",
    stage: "positioning",
    category: "湘菜",
    target: null,
    city: "长沙",
    district: "五一商圈",
    budget: 100,
    profile: null,
    healthScore: null,
    confidence: null,
  },
  memories: [],
  decisions: [],
  knowledge: { rules: [], cases: [], models: [] },
};

async function main() {
  console.log("\n=== M-PNT 三理论 Agent 矩阵 ===\n");

  await test("注册表有且仅有 3 个理论 Agent", () => {
    assert(theoryAgents.length === 3, "should be 3");
    assert(theoryAgents.map((a) => a.id).sort().join(",") === "ries,trout,ye_maozhong", "ids");
  });

  await test("getTheoryAgent 可按 id 取 Agent", () => {
    assert(
      getTheoryAgent("ries").name.includes("心智") ||
        getTheoryAgent("ries").id === "ries",
      "ries",
    );
    assert(getTheoryAgent("trout").id === "trout", "trout");
    assert(
      getTheoryAgent("ye_maozhong").stance.includes("冲突营销") ||
        getTheoryAgent("ye_maozhong").name.includes("冲突"),
      "ye",
    );
  });

  await test("每个 Agent 有独立 systemPrompt 与 stance", () => {
    for (const a of [riesAgent, troutAgent, yeMaozhongAgent]) {
      assert(a.systemPrompt.length > 20, `${a.id} prompt`);
      assert(a.stance.length > 5, `${a.id} stance`);
    }
  });

  await test("Input Package 只读事实 + 3 候选", () => {
    const pkg = buildMatrixInputPackage(sampleContext);
    assert(pkg.candidates.length === 3, "3 candidates");
    assert(pkg.project.category === "湘菜", "category");
    assert(pkg.owner.strengths.includes("招牌剁椒鱼头"), "strengths");
    assert(pkg.constraints!.some((c) => c.includes("不得改写")), "constraints");
  });

  await test("单理论 Agent 产出 Theory View", async () => {
    const view = await runSingleTheoryAgent("ries", sampleContext);
    assert(view.agent_id === "ries", "agent_id");
    assert(!!view.preferred_direction, "preferred");
    assert(!!view.theory_recommend, "theory_recommend");
    assert(view.direction_scores.length === 3, "scores");
    assert(Array.isArray(view.main_risks), "risks");
  });

  await test("runTheoryMatrix 并行三 Agent + Cross-Fire + Synthesis", async () => {
    const result = await runTheoryMatrix(sampleContext);
    assert(result.views.ries.agent_id === "ries", "ries");
    assert(result.views.trout.agent_id === "trout", "trout");
    assert(result.views.ye_maozhong.agent_id === "ye_maozhong", "ye");
    assert(result.crossFire.agent_id === "cross_fire", "cross_fire");
    assert(result.synthesis.agent_id === "synthesis", "synthesis");
    assert(
      ["primary", "secondary", "backup", "reject"].includes(
        result.synthesis.decision_recommend,
      ),
      "decision_recommend",
    );
    assert(!!result.synthesis.final_recommended_position, "final position");
    assert(!!result.synthesis.theory_vote_summary.ries, "vote summary");
    assert(result.elapsedMs >= 0, "elapsed");
  });

  await test("三 Agent 偏好字段齐全且可比较", async () => {
    const result = await runTheoryMatrix(sampleContext);
    for (const v of [
      result.views.ries,
      result.views.trout,
      result.views.ye_maozhong,
    ]) {
      assert(!!v.why_this_direction, `${v.agent_id} why`);
      assert(!!v.key_mental_position, `${v.agent_id} mental`);
      assert(
        ["strong_recommend", "recommend", "neutral", "not_recommend"].includes(
          v.theory_recommend,
        ),
        `${v.agent_id} recommend enum`,
      );
    }
  });

  await test("三 Agent 各代表：心智占位 / 竞争空位 / 冲突营销", () => {
    assert(
      riesAgent.stance.includes("心智占位") || riesAgent.name.includes("心智"),
      "ries = 心智占位学派",
    );
    assert(
      troutAgent.stance.includes("竞争空位") || troutAgent.name.includes("空位"),
      "trout = 竞争空位学派",
    );
    assert(
      yeMaozhongAgent.stance.includes("冲突营销") ||
        yeMaozhongAgent.name.includes("冲突"),
      "ye = 冲突营销学派",
    );
  });

  await test("Cross-Fire 含竞争/博弈攻击/硬软共识", async () => {
    const result = await runTheoryMatrix(sampleContext);
    const cf = result.crossFire;
    assert(typeof cf.game_summary === "string" && cf.game_summary.length > 10, "game_summary");
    assert(Array.isArray(cf.challenges), "challenges");
    assert(Array.isArray(cf.hard_consensus), "hard_consensus");
    assert(Array.isArray(cf.soft_consensus), "soft_consensus");
    const same =
      result.views.ries.preferred_candidate_id ===
        result.views.trout.preferred_candidate_id &&
      result.views.trout.preferred_candidate_id ===
        result.views.ye_maozhong.preferred_candidate_id;
    if (!same) {
      assert(cf.challenges.length > 0, "split => attacks");
      assert(cf.challenges.every((c) => c.from !== c.to), "no self-attack");
      assert(
        cf.challenges.every((c) => c.attack.includes("【")),
        "attack tagged by theory system",
      );
    }
    assert(
      cf.game_summary.includes("竞争") && cf.game_summary.includes("博弈"),
      "narrative 竞争→博弈→共识",
    );
  });

  console.log(`\n结果: ${passed} 通过, ${failed} 失败\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
