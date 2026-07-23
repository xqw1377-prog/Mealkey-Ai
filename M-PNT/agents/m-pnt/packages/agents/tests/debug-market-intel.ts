import { getCompetitionNarrative, isInWhiteSpot } from "../src/m-pnt/matrix/market-intel";
import { evaluateByRules } from "../src/m-pnt/matrix/rule-engine";
import { riesRules } from "../src/m-pnt/matrix/knowledge-ries";
import { troutRules } from "../src/m-pnt/matrix/knowledge-trout";
import { yeRules } from "../src/m-pnt/matrix/knowledge-ye";

const pkg = {
  project: { category: "湘菜", city: "长沙", budget: 100 },
  owner: { strengths: ["供应链"], weaknesses: [] },
  candidates: [],
  constraints: [],
  previousSummary: "",
};

// 测试两个场景：
// 1. 落在空白区的方向
const whiteSpotCandidate = {
  id: "X",
  name: "长沙湘菜·夜间场景型",
  oneLiner: "不做午市晚市，专做长沙夜宵湘菜",
  type: "进攻型",
  focus: "竞争空位",
};

// 2. 与正面冲突的方向
const headOnCandidate = {
  id: "Y",
  name: "长沙湘菜·辣椒炒肉",
  oneLiner: "长沙最好吃的辣椒炒肉",
  type: "进攻型",
  focus: "产品第一",
};

console.log("=== 竞争数据验证 ===\n");

const narrative = getCompetitionNarrative("湘菜", "长沙");
console.log("品类竞争格局:", narrative, "\n");

for (const c of [whiteSpotCandidate, headOnCandidate]) {
  const ws = isInWhiteSpot(c.oneLiner, "湘菜", "长沙");
  console.log(`【${c.name}】`);
  console.log("  定位语:", c.oneLiner);
  console.log("  空白区检测:", ws.isWhite ? "✅ 落在空白区" : "❌ 未命中空白区" + (ws.note ? ` (${ws.note})` : ""));
  console.log("");

  // 三个 Agent 评分
  for (const [label, rules] of [
    ["里斯定位", riesRules],
    ["特劳特定位", troutRules],
    ["叶茂中冲突营销", yeRules],
  ] as const) {
    const result = evaluateByRules(c, pkg as any, rules, []);
    console.log(`  ${label}: ${result.totalScore}分 (${result.theory_recommend})`);
    // 打印前3个高分和前2个低分
    const sorted = [...result.dimensions].sort((a, b) => b.score - a.score);
    const highs = sorted.filter(d => d.score >= 70).slice(0, 3);
    const lows = sorted.filter(d => d.score < 45).slice(0, 2);
    if (highs.length > 0) console.log(`    优势: ${highs.map(d => d.dimension + "(" + d.score + "分)").join(", ")}`);
    if (lows.length > 0) console.log(`    短板: ${lows.map(d => d.dimension + "(" + d.score + "分)").join(", ")}`);
  }
  console.log("");
}
