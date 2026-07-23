/**
 * 打印深检完整会审报告（合成数据）
 */
import {
  diagnoseRestaurantSync,
  type DailyOpsRow,
  type DiagnosisFact,
  type DishSalesRow,
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

const menu: MenuItemCost[] = [
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

const daily = buildSyntheticDaily(45);
const sales: DishSalesRow[] = [];
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
    sales.push({
      date: day(i),
      mealPeriod: i % 2 ? "晚市" : "午市",
      zone: "大厅",
      dishName: item.name,
      category: item.category || "未分类",
      qty,
      amount: qty * (item.price || 30),
    });
  }
}

const facts: DiagnosisFact[] = [
  { kind: "ledger_days", claim: String(new Set(daily.map((r) => r.date)).size) },
  { kind: "daily_ops_json", claim: JSON.stringify(daily) },
  { kind: "daily_ops_summary", claim: `合成 ${daily.length} 条` },
  { kind: "dish_sales_rows", claim: String(sales.length) },
  { kind: "dish_sales_json", claim: JSON.stringify(sales) },
  { kind: "menu_count", claim: String(menu.length) },
  { kind: "menu_json", claim: JSON.stringify(menu) },
  { kind: "priceRange", claim: "人均约 78" },
  { kind: "exam_depth", claim: "deep" },
];

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

const c = deep.consultation as Record<string, unknown> | undefined;
if (!c) {
  console.log("无会审报告");
  process.exit(1);
}

function line(s: string) {
  console.log(s);
}

line("════════════════════════════════════════════════════════════");
line("湘味小馆 · 深检会审报告（合成数据模拟）");
line("════════════════════════════════════════════════════════════");
line(`判定：${c.overallVerdict ?? c.verdict ?? "—"}`);
if (c.confidence != null) line(`置信：${Math.round(Number(c.confidence) * 100)}%`);
line(`汇总：${c.consensus ?? "—"}`);
if (c.evolutionNote) line(`DNA：${c.evolutionNote}`);

const priorities = (c.priorities as string[]) || [];
if (priorities.length) {
  line("");
  line("—— 行动优先级 ——");
  for (const p of priorities) line(`• ${p}`);
}

const disputes = (c.disputes as unknown[]) || [];
if (disputes.length) {
  line("");
  line("—— 争议/分歧 ——");
  for (const d of disputes) line(`• ${typeof d === "string" ? d : JSON.stringify(d)}`);
}

const modules = (c.modules as Array<Record<string, unknown>>) || [];
if (modules.length) {
  line("");
  line("—— 报告模块 ——");
  for (const m of modules) {
    line("");
    line(`[${m.no ?? m.id}] ${m.title}`);
    if (m.summary) line(String(m.summary));
    for (const b of (m.bullets as string[]) || []) line(`  - ${b}`);
    for (const t of (m.tables as Array<Record<string, unknown>>) || []) {
      if (t.title) line(`  表：${t.title}`);
      const headers = t.headers as string[] | undefined;
      if (headers?.length) line(`  | ${headers.join(" | ")}`);
      for (const row of ((t.rows as string[][]) || []).slice(0, 10)) {
        line(`  | ${row.join(" | ")}`);
      }
    }
  }
}

const officers = (c.officers as Array<Record<string, unknown>>) || [];
if (officers.length) {
  line("");
  line("—— 四官席位 ——");
  for (const o of officers) {
    line("");
    const refused = o.refused ? "（拒签）" : "";
    line(`${o.title ?? o.role}${refused} · ${o.level ?? ""}`);
    const verdict = o.verdict as Record<string, unknown> | undefined;
    if (verdict?.headline) line(`  ${verdict.headline}`);
    if (o.refuseReason) line(`  拒签原因：${o.refuseReason}`);
    for (const x of ((o.observations as string[]) || []).slice(0, 4)) line(`  观察：${x}`);
    for (const x of ((o.risks as string[]) || []).slice(0, 3)) line(`  风险：${x}`);
    for (const x of ((o.counsel as string[]) || []).slice(0, 3)) line(`  建议：${x}`);
  }
}

// 兜底：若结构字段名不同，整份 JSON 关键输出
if (!modules.length && !officers.length) {
  line("");
  line("（原始 consultation JSON）");
  line(JSON.stringify(c, null, 2));
}
