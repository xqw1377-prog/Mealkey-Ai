/** 合成示例店数据 — 无真实账本时也能独立跑通会审 */
function day(offset) {
  const d = new Date("2026-04-01T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

function buildMenu() {
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

function buildDaily(days) {
  const meals = ["午市", "晚市", "夜宵"];
  const zones = ["大厅", "包厢"];
  const rows = [];
  for (let i = 0; i < days; i++) {
    for (let m = 0; m < meals.length; m++) {
      const meal = meals[m];
      const weekend = [0, 6].includes(new Date(day(i)).getUTCDay());
      const mealBoost = meal === "晚市" ? 1.35 : meal === "午市" ? 1.0 : 0.55;
      const guests = Math.round((weekend ? 42 : 28) * mealBoost * (1 - i * 0.004));
      const avgTicket = Math.round((weekend ? 88 : 76) * (meal === "夜宵" ? 0.85 : 1));
      rows.push({
        date: day(i),
        mealPeriod: meal,
        zone: zones[i % 2],
        guests: guests,
        avgTicket: avgTicket,
        revenue: guests * avgTicket,
        cost: Math.round(guests * avgTicket * 0.38),
        expense: Math.round(guests * avgTicket * 0.22),
        profit: Math.round(guests * avgTicket * 0.4),
      });
    }
  }
  return rows;
}

function buildSales(menu) {
  const rows = [];
  for (let i = 0; i < 30; i++) {
    for (let j = 0; j < menu.length; j++) {
      const item = menu[j];
      const qty = item.name.indexOf("红烧肉") >= 0
        ? 18
        : item.name.indexOf("烤翅") >= 0
          ? 22
          : item.name.indexOf("鱼头") >= 0
            ? 10
            : item.name.indexOf("米酒") >= 0
              ? 14
              : 4 + (i % 3);
      rows.push({
        date: day(i),
        mealPeriod: i % 2 ? "晚市" : "午市",
        zone: "大厅",
        dishName: item.name,
        category: item.category || "未分类",
        qty: qty,
        amount: qty * (item.price || 30),
      });
    }
  }
  return rows;
}

function buildEvidence() {
  return [
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
  ];
}

function buildDeepRequest(profile) {
  const menu = buildMenu();
  const daily = buildDaily(45);
  const sales = buildSales(menu);
  const daySet = {};
  for (let i = 0; i < daily.length; i++) daySet[daily[i].date] = true;
  const ledgerDays = Object.keys(daySet).length;

  return {
    restaurantContext: {
      brandName: profile.name || "湘味小馆",
      category: profile.category || "湘菜",
      city: profile.city || "长沙",
      stage: "single_store",
      projectId: "mp-" + (profile.name || "demo"),
    },
    facts: [
      { kind: "ledger_days", claim: String(ledgerDays) },
      { kind: "daily_ops_json", claim: JSON.stringify(daily) },
      { kind: "daily_ops_summary", claim: "合成 " + daily.length + " 条日×餐段" },
      { kind: "dish_sales_rows", claim: String(sales.length) },
      { kind: "dish_sales_json", claim: JSON.stringify(sales) },
      { kind: "menu_count", claim: String(menu.length) },
      { kind: "menu_json", claim: JSON.stringify(menu) },
      { kind: "priceRange", claim: "人均约 78" },
      { kind: "exam_depth", claim: "deep" },
    ],
    evidence: buildEvidence(),
    focus: "overall",
    horizon: "30d",
  };
}

function buildQuickRequest(profile) {
  const diag = require("../../../libs/m-ops-diag.js");
  const base = diag.mockDiagnosisRequest({
    restaurantContext: {
      brandName: profile.name || "示例小馆",
      category: profile.category || "中式正餐",
      city: profile.city || "本地",
      stage: "single_store",
    },
    facts: [
      { kind: "priceRange", claim: profile.priceRange || "人均待补充" },
      { kind: "exam_depth", claim: "quick" },
    ],
    focus: "overall",
    horizon: "7d",
  });
  return base;
}

/** 用粘贴导入的真实/半真实数据跑深检 */
function buildFromImport(profile, bundle) {
  const daily = bundle.daily || [];
  const sales = bundle.sales || [];
  const menu = bundle.menu || [];
  const daySet = {};
  for (let i = 0; i < daily.length; i++) daySet[daily[i].date] = true;
  const ledgerDays = Object.keys(daySet).length;

  const facts = [
    { kind: "ledger_days", claim: String(ledgerDays) },
    { kind: "daily_ops_json", claim: JSON.stringify(daily) },
    {
      kind: "daily_ops_summary",
      claim: "导入 " + daily.length + " 条日×餐段",
    },
    { kind: "priceRange", claim: profile.priceRange || "人均待补充" },
    { kind: "exam_depth", claim: "deep" },
  ];

  if (sales.length) {
    facts.push({ kind: "dish_sales_rows", claim: String(sales.length) });
    facts.push({ kind: "dish_sales_json", claim: JSON.stringify(sales) });
  }
  if (menu.length) {
    facts.push({ kind: "menu_count", claim: String(menu.length) });
    facts.push({ kind: "menu_json", claim: JSON.stringify(menu) });
  }

  return {
    restaurantContext: {
      brandName: profile.name || "未命名门店",
      category: profile.category || "餐饮",
      city: profile.city || "本地",
      stage: "single_store",
      projectId: "mp-import-" + (profile.name || "store"),
    },
    facts: facts,
    evidence:
      bundle.evidence && bundle.evidence.length
        ? bundle.evidence
        : bundle.useDemoEvidence === false
          ? []
          : buildEvidence(),
    focus: "overall",
    horizon: "30d",
  };
}

module.exports = {
  buildDeepRequest: buildDeepRequest,
  buildQuickRequest: buildQuickRequest,
  buildFromImport: buildFromImport,
};
