/**
 * 合成数据全流程模拟：浅检 → 深检 → 会审 → 学习回填 → 再诊进化
 */
import {
  applyEvolvedPatternLibrary,
  buildEvolutionState,
  diagnoseRestaurantSync,
  enrichDishSalesWithMenu,
  stageLabel,
  type DiagnosisFact,
  type DiagnosisLearning,
  type DishSalesRow,
  type DailyOpsRow,
  type MenuItemCost,
} from "@mealkey/m-ops-diag";

function day(offset: number) {
  const d = new Date("2026-04-01T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

function buildSyntheticDaily(days = 45): DailyOpsRow[] {
  const meals = ["午市", "晚市", "夜宵"];
  const zones = ["大厅", "包厢"];
  const rows: DailyOpsRow[] = [];
  for (let i = 0; i < days; i++) {
    for (const meal of meals) {
      const weekend = [0, 6].includes(new Date(day(i)).getUTCDay());
      const mealBoost = meal === "晚市" ? 1.35 : meal === "午市" ? 1.0 : 0.55;
      const guests = Math.round((weekend ? 42 : 28) * mealBoost * (1 - i * 0.004));
      const avgTicket = Math.round((weekend ? 88 : 76) * (meal === "夜宵" ? 0.85 : 1));
      rows.push({
        date: day(i),
        mealPeriod: meal,
        zone: zones[i % 2]!,
        guests,
        avgTicket,
        revenue: guests * avgTicket,
        cost: Math.round(guests * avgTicket * 0.38),
        expense: Math.round(guests * avgTicket * 0.22),
        profit: Math.round(guests * avgTicket * 0.4),
      });
    }
  }
  return rows;
}

function buildSyntheticMenu(): MenuItemCost[] {
  return [
    { name: "招牌红烧肉", category: "热菜", price: 68, cost: 42, kind: "dish" },
    { name: "剁椒鱼头", category: "热菜", price: 98, cost: 55, kind: "dish" },
    { name: "小炒黄牛肉", category: "热菜", price: 58, cost: 28, kind: "dish" },
    { name: "农家小炒肉", category: "热菜", price: 48, cost: 18, kind: "dish" },
    { name: "酸辣土豆丝", category: "素菜", price: 22, cost: 6, kind: "dish" },
    { name: "米饭", category: "主食", price: 3, cost: 1, kind: "dish" },
    { name: "长沙米酒", category: "饮品", price: 18, cost: 4, kind: "drink" },
    { name: "自制酸梅汤", category: "饮品", price: 16, cost: 3, kind: "drink" },
    { name: "低毛利引流烤翅", category: "热菜", price: 39, cost: 28, kind: "dish" },
    { name: "季节时蔬", category: "素菜", price: 26, cost: 8, kind: "dish" },
  ];
}

function buildSyntheticDishSales(menu: MenuItemCost[]): DishSalesRow[] {
  const rows: DishSalesRow[] = [];
  for (let i = 0; i < 30; i++) {
    for (const item of menu) {
      const qty = item.name.includes("红烧肉")
        ? 18
        : item.name.includes("烤翅")
          ? 22
          : item.name.includes("鱼头")
            ? 10
            : item.name.includes("米酒")
              ? 14
              : 4 + (i % 3);
      const amount = qty * (item.price || 30);
      rows.push({
        date: day(i),
        mealPeriod: i % 2 ? "晚市" : "午市",
        zone: "大厅",
        dishName: item.name,
        category: item.category || "未分类",
        qty,
        amount,
        // 故意不写 cost，验证菜单 JOIN
      });
    }
  }
  return rows;
}

function factsFromSynthetic(input: {
  daily: DailyOpsRow[];
  sales: DishSalesRow[];
  menu: MenuItemCost[];
}): DiagnosisFact[] {
  return [
    { kind: "ledger_days", claim: String(new Set(input.daily.map((r) => r.date)).size) },
    { kind: "daily_ops_json", claim: JSON.stringify(input.daily) },
    { kind: "daily_ops_summary", claim: `合成 ${input.daily.length} 条日×餐段` },
    { kind: "dish_sales_rows", claim: String(input.sales.length) },
    { kind: "dish_sales_json", claim: JSON.stringify(input.sales) },
    { kind: "menu_count", claim: String(input.menu.length) },
    { kind: "menu_json", claim: JSON.stringify(input.menu) },
    { kind: "priceRange", claim: "人均约 78" },
    { kind: "exam_depth", claim: "deep" },
  ];
}

function printSection(title: string) {
  console.log("\n" + "=".repeat(60));
  console.log(title);
  console.log("=".repeat(60));
}

function main() {
  const menu = buildSyntheticMenu();
  const daily = buildSyntheticDaily(45);
  const sales = buildSyntheticDishSales(menu);
  const join = enrichDishSalesWithMenu(sales, menu);

  printSection("0. 合成数据就绪");
  console.log(`日×餐段: ${daily.length} 行 / ${new Set(daily.map((d) => d.date)).size} 天`);
  console.log(`菜品销售: ${sales.length} 行`);
  console.log(`菜单: ${menu.length} 项；JOIN 匹配 ${join.matched}，缺成本 ${join.missingCost}`);

  printSection("1. 浅检（仅评论证据，无账本）");
  const quick = diagnoseRestaurantSync({
    restaurantContext: {
      brandName: "湘味小馆",
      category: "湘菜",
      city: "长沙",
      stage: "single_store",
      projectId: "sim-xiangwei",
    },
    facts: [
      { kind: "priceRange", claim: "人均约 78" },
      { kind: "exam_depth", claim: "quick" },
    ],
    evidence: [
      {
        id: "e1",
        source: "dianping",
        claim: "周末等位太久，上菜慢",
        sentiment: "negative",
        theme: "wait",
      },
      {
        id: "e2",
        source: "dianping",
        claim: "红烧肉很下饭",
        sentiment: "positive",
        theme: "product",
      },
      {
        id: "e3",
        source: "xiaohongshu",
        claim: "高峰排队劝退",
        sentiment: "negative",
        theme: "wait",
      },
    ],
    focus: "overall",
    horizon: "7d",
  });
  console.log(`信号数: ${quick.signals.length}`);
  console.log(`综合摘要: ${quick.health?.snapshot.summary}`);
  console.log(`进化: ${quick.evolution?.summary}`);
  console.log(`会审判定: ${quick.consultation?.overallVerdict}`);
  console.log(`DNA 备注: ${quick.consultation?.evolutionNote}`);

  printSection("2. 深检（账本+菜销+菜单+评论）");
  const facts = factsFromSynthetic({ daily, sales, menu });
  const deep = diagnoseRestaurantSync({
    restaurantContext: {
      brandName: "湘味小馆",
      category: "湘菜",
      city: "长沙",
      stage: "single_store",
      projectId: "sim-xiangwei",
    },
    facts,
    evidence: [
      {
        id: "e1",
        source: "dianping",
        claim: "周末等位太久，上菜慢",
        sentiment: "negative",
        theme: "wait",
      },
      {
        id: "e2",
        source: "dianping",
        claim: "红烧肉很下饭",
        sentiment: "positive",
        theme: "product",
      },
      {
        id: "e3",
        source: "xiaohongshu",
        claim: "高峰排队劝退",
        sentiment: "negative",
        theme: "wait",
      },
      {
        id: "e4",
        source: "dianping",
        claim: "有点贵不太值",
        sentiment: "negative",
        theme: "price",
      },
    ],
    focus: "overall",
    horizon: "30d",
  });

  console.log(`信号数: ${deep.signals.length}`);
  console.log(`体检摘要: ${deep.exam?.summary}`);
  for (const axis of deep.exam?.axes || []) {
    console.log(`  - ${axis.title}: ${axis.level} | ${axis.summary}`);
  }
  console.log(`会审判定: ${deep.consultation?.overallVerdict}`);
  console.log(`汇总结论: ${deep.consultation?.consensus}`);
  console.log("行动优先级:");
  for (const p of deep.consultation?.priorities || []) console.log(`  • ${p}`);
  console.log("主因/发现模块:");
  for (const m of (deep.consultation?.modules || []).filter((x) =>
    ["evolution", "findings", "conclusion"].includes(x.id),
  )) {
    console.log(`  [${m.no}] ${m.title}: ${m.summary}`);
    for (const b of (m.bullets || []).slice(0, 3)) console.log(`      - ${b}`);
  }
  console.log("病例假设:");
  for (const h of deep.caseRecord?.hypothesis || []) {
    console.log(`  • ${(h.probability * 100).toFixed(0)}% ${h.statement}`);
    for (const v of h.validationPlan || []) console.log(`      验证: ${v}`);
  }

  printSection("3. 学习回填（模拟老板反馈）");
  const learnings: DiagnosisLearning[] = (deep.learningDraft || []).map((item, idx) => {
    if (idx === 0) {
      return {
        ...item,
        action: "晚市加排班、缩短出餐",
        actualOutcome: "验证成立",
        lesson: "高峰等位是客流承压主因，应优先止血体验",
        polarity: "confirmed" as const,
        themes: ["wait", "growth"],
        verifiedAt: new Date().toISOString(),
      };
    }
    return {
      ...item,
      actualOutcome: "不成立",
      lesson: "价格本身不是主因",
      polarity: "rejected" as const,
      themes: ["price"],
      verifiedAt: new Date().toISOString(),
    };
  });
  const evo1 = buildEvolutionState(learnings, "sim-xiangwei");
  console.log(evo1.summary);
  console.log(`阶段: ${stageLabel(evo1.stage)} / 成熟度 ${evo1.maturityScore}`);
  console.log(
    "主题权重:",
    evo1.themeWeights.map((t) => `${t.theme}×${t.weight.toFixed(2)}`).join(", "),
  );
  applyEvolvedPatternLibrary(learnings);

  printSection("4. 再诊（注入 previousLearnings，观察进化）");
  const again = diagnoseRestaurantSync({
    restaurantContext: {
      brandName: "湘味小馆",
      category: "湘菜",
      city: "长沙",
      stage: "single_store",
      projectId: "sim-xiangwei",
    },
    facts,
    evidence: [
      {
        id: "e1",
        source: "dianping",
        claim: "周末等位太久，上菜慢",
        sentiment: "negative",
        theme: "wait",
      },
      {
        id: "e3",
        source: "xiaohongshu",
        claim: "高峰排队劝退",
        sentiment: "negative",
        theme: "wait",
      },
    ],
    previousLearnings: learnings,
    previousSnapshot: deep.health?.snapshot,
    focus: "overall",
    horizon: "30d",
  });
  console.log(`再诊信号数: ${again.signals.length}`);
  console.log(`再诊摘要: ${again.health?.snapshot.summary}`);
  console.log(`再诊 DNA: ${again.evolution?.summary}`);
  console.log(`再诊会审: ${again.consultation?.consensus}`);
  console.log("再诊假设概率:");
  for (const h of again.caseRecord?.hypothesis || []) {
    console.log(`  • ${(h.probability * 100).toFixed(0)}% ${h.statement}`);
  }
  console.log("再诊行动:");
  for (const prio of (again.consultation?.priorities || []).slice(0, 4)) {
    console.log(`  • ${prio}`);
  }

  printSection("5. 无评论仅账本（验证双轨兜底）");
  const ledgerOnly = diagnoseRestaurantSync({
    restaurantContext: {
      brandName: "湘味小馆",
      category: "湘菜",
      city: "长沙",
      projectId: "sim-xiangwei",
    },
    facts,
    evidence: [],
    previousLearnings: learnings,
    focus: "overall",
    horizon: "30d",
  });
  console.log(`无评论信号数: ${ledgerOnly.signals.length}（应 > 0）`);
  console.log(`摘要: ${ledgerOnly.health?.snapshot.summary}`);
  console.log(`会审: ${ledgerOnly.consultation?.overallVerdict}`);

  console.log("\n模拟完成。");
}

main();
