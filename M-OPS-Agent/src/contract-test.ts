/**
 * 契约 / 引擎冒烟：假设学习闭环、模式库匹配、诊断信封、进化状态。
 */
import {
  buildEvolutionState,
  claimMatchesTheme,
  diagnoseRestaurantSync,
  evolvePatternLibraryFromLearnings,
  mockDiagnosisRequest,
  rankHypotheses,
  resetPatternLibrary,
  setPatternLibrary,
  stageLabel,
  type DiagnosisFact,
} from "@mealkey/m-ops-diag";

function assert(cond: unknown, message: string): asserts cond {
  if (!cond) {
    console.error(`FAIL: ${message}`);
    process.exit(1);
  }
}

function testPatternLibrary() {
  resetPatternLibrary();
  assert(claimMatchesTheme("周末等位太久", "wait"), "wait pattern should match");
  assert(claimMatchesTheme("味道很正宗", "product"), "product pattern should match");
  setPatternLibrary([
    {
      id: "custom_wait",
      theme: "wait",
      label: "自定义等待",
      regex: /塞车|堵死/,
      dimensions: ["service"],
    },
  ]);
  assert(claimMatchesTheme("门口塞车", "wait"), "custom pattern should match");
  assert(!claimMatchesTheme("周末等位太久", "wait"), "default wait pattern should be replaced");
  resetPatternLibrary();
  console.log("OK: pattern library");
}

function testLearningLoop() {
  const analyses = [
    {
      dimension: "service" as const,
      level: "attention" as const,
      finding: "等待",
      meaning: "x",
      observed: "y",
      confidence: 0.7,
      evidenceIds: ["a", "b"],
      watchHint: "看等位",
      hypotheses: [
        {
          statement: "高峰等位导致口碑下滑",
          probability: 0.5,
          supportingEvidence: ["a"],
          validationPlan: ["抽查高峰"],
        },
      ],
      rawEvidence: [],
    },
  ];

  const up = rankHypotheses(analyses, [
    {
      diagnosisId: "c1",
      hypothesis: "高峰等位导致口碑下滑",
      actualOutcome: "验证成立",
    },
  ]);
  assert(up[0]!.probability > 0.5, "validated learning should raise probability");

  const down = rankHypotheses(analyses, [
    {
      diagnosisId: "c1",
      hypothesis: "高峰等位导致口碑下滑",
      actualOutcome: "不成立",
    },
  ]);
  assert(down[0]!.probability < 0.5, "rejected learning should lower probability");
  console.log("OK: learning loop");
}

function testEvolution() {
  const learnings = [
    {
      diagnosisId: "c1",
      hypothesis: "高峰等位导致口碑下滑",
      actualOutcome: "验证成立",
      lesson: "周末要加人，缩短等位",
    },
    {
      diagnosisId: "c2",
      hypothesis: "客单价偏高影响转化",
      actualOutcome: "不成立",
      lesson: "问题在等待而非价格",
    },
  ];
  const state = buildEvolutionState(learnings, "shop-1");
  assert(state.verifiedCount === 2, "should count verified learnings");
  assert(state.confirmedCount >= 1, "should count confirmed");
  assert(state.rejectedCount >= 1, "should count rejected");
  assert(state.maturityScore > 0, "maturity should rise");
  assert(stageLabel(state.stage).length > 0, "stage label should exist");
  assert(state.themeWeights.some((t) => t.theme === "wait"), "wait theme should gain weight");

  const evolved = evolvePatternLibraryFromLearnings(learnings);
  const wait = evolved.find((r) => r.theme === "wait");
  assert(wait && (wait.weight || 1) > 1, "wait pattern weight should increase");
  console.log("OK: evolution");
}

function buildDualTrackFacts(): DiagnosisFact[] {
  const dailyOps: Array<{
    date: string;
    mealPeriod: string;
    zone: string;
    guests: number;
    avgTicket: number;
    revenue: number;
  }> = [];
  // 两个月、每月 10 个营业日 × 2 餐段，制造营收/客流下行趋势
  for (let month = 0; month < 2; month++) {
    for (let day = 1; day <= 10; day++) {
      const date = `2024-0${month + 1}-${String(day).padStart(2, "0")}`;
      const decline = month === 1 ? 0.7 : 1; // 第二个月下行 30%
      const lunchGuests = Math.round(40 * decline);
      const dinnerGuests = Math.round(90 * decline);
      dailyOps.push({
        date,
        mealPeriod: "午市",
        zone: "大厅",
        guests: lunchGuests,
        avgTicket: 60,
        revenue: lunchGuests * 60,
      });
      dailyOps.push({
        date,
        mealPeriod: "晚市",
        zone: "大厅",
        guests: dinnerGuests,
        avgTicket: 80,
        revenue: dinnerGuests * 80,
      });
    }
  }

  const dishNames = [
    "剁椒鱼头",
    "小炒黄牛肉",
    "口味虾",
    "农家小炒肉",
    "腊味合蒸",
    "青椒炒肉",
    "梅菜扣肉",
    "酸辣土豆丝",
    "冬瓜排骨汤",
    "凉拌黄瓜",
  ];
  const dishSales = dishNames.map((name, index) => ({
    date: "2024-02-05",
    mealPeriod: "晚市",
    zone: "大厅",
    dishName: name,
    category: index < 6 ? "热菜" : "凉菜",
    qty: 40 - index * 3,
    amount: (40 - index * 3) * (30 + index * 5),
  }));
  const menu = dishNames.map((name, index) => ({
    name,
    category: index < 6 ? "热菜" : "凉菜",
    price: 30 + index * 5,
    cost: (30 + index * 5) * 0.4,
  }));

  return [
    { kind: "priceRange", claim: "人均约 80 元" },
    { kind: "peakScene", claim: "高峰场景：晚市家庭/朋友聚餐" },
    { kind: "mainGuests", claim: "主力客群：朋友聚餐" },
    { kind: "ledger_days", claim: String(20) },
    { kind: "daily_ops_json", claim: JSON.stringify(dailyOps) },
    { kind: "dish_sales_rows", claim: String(dishSales.length) },
    { kind: "dish_sales_json", claim: JSON.stringify(dishSales) },
    { kind: "menu_count", claim: String(menu.length) },
    { kind: "menu_json", claim: JSON.stringify(menu) },
  ];
}

function testDualTrackWithoutEvidence() {
  resetPatternLibrary();
  const result = diagnoseRestaurantSync(
    mockDiagnosisRequest({
      evidence: [],
      facts: buildDualTrackFacts(),
    }),
  );
  assert(
    result.health?.snapshot?.dimensions?.length,
    "no-evidence dual-track run should still populate health dimensions via experts",
  );
  assert(
    Array.isArray(result.signals) && result.signals.length > 0,
    "no-evidence dual-track run with sufficient facts should still produce signals",
  );
  assert(
    result.consultation?.experts?.some((e) => !e.refused),
    "consultation should include at least one non-refused expert opinion",
  );
  console.log("OK: dual-track without evidence");
}

function testDiagnosisEnvelope() {
  const result = diagnoseRestaurantSync(mockDiagnosisRequest());
  assert(result.health?.snapshot, "diagnosis should produce health snapshot");
  assert(Array.isArray(result.signals), "signals should be array");
  assert(result.caseRecord?.hypothesis?.length, "case should carry hypotheses");
  assert(result.evolution, "diagnosis should attach evolution state");
  assert(result.consultation?.evolutionNote, "consultation should note evolution");
  console.log("OK: diagnosis envelope");
}

testPatternLibrary();
testLearningLoop();
testEvolution();
testDiagnosisEnvelope();
testDualTrackWithoutEvidence();
console.log("contract-test: all passed");
