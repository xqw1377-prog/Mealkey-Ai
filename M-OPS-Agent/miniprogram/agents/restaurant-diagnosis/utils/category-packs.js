/**
 * 品类体检包：免费独立壳用不同示例店与提示，避免「全国一张嘴」。
 * 数据仍为合成，规则引擎同源；对标提示仅作文案参考（非外部行情 API）。
 */

function day(offset) {
  const d = new Date("2026-04-01T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

function buildDaily(opts) {
  const days = opts.days || 45;
  const meals = opts.meals || ["午市", "晚市", "夜宵"];
  const baseGuests = opts.baseGuests || 28;
  const decline = opts.decline != null ? opts.decline : 0.004;
  const mealBoost = opts.mealBoost || { 午市: 1, 晚市: 1.35, 夜宵: 0.55 };
  const ticket = opts.ticket || { 午市: 76, 晚市: 88, 夜宵: 65 };
  const rows = [];
  for (let i = 0; i < days; i++) {
    for (let m = 0; m < meals.length; m++) {
      const meal = meals[m];
      const weekend = [0, 6].includes(new Date(day(i)).getUTCDay());
      const guests = Math.round(
        (weekend ? baseGuests * 1.35 : baseGuests) *
          (mealBoost[meal] || 1) *
          (1 - i * decline),
      );
      const avgTicket = Math.round((weekend ? ticket[meal] * 1.08 : ticket[meal]) || 70);
      rows.push({
        date: day(i),
        mealPeriod: meal,
        zone: i % 2 ? "大厅" : "外摆",
        guests: guests,
        avgTicket: avgTicket,
        revenue: guests * avgTicket,
        cost: Math.round(guests * avgTicket * (opts.costRate || 0.38)),
        expense: Math.round(guests * avgTicket * (opts.expenseRate || 0.22)),
        profit: Math.round(guests * avgTicket * 0.35),
      });
    }
  }
  return rows;
}

function buildSales(menu, days) {
  const rows = [];
  for (let i = 0; i < days; i++) {
    for (let j = 0; j < menu.length; j++) {
      const item = menu[j];
      const qty = item.demoQty || 6 + (i % 4);
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

const PACKS = {
  xiangcai: {
    id: "xiangcai",
    label: "湘菜",
    tip: "关注晚市高峰等待与高流水低毛利招牌；同城对标提示：晚市份额常 >45% 需盯出菜。",
    profile: {
      name: "湘味小馆",
      city: "长沙",
      category: "湘菜",
      priceRange: "人均约 78",
    },
    evidence: [
      "周末等位太久，上菜慢",
      "红烧肉很下饭",
      "高峰排队劝退",
      "有点贵不太值",
    ],
    menu: [
      { name: "招牌红烧肉", category: "热菜", price: 68, cost: 42, demoQty: 18 },
      { name: "剁椒鱼头", category: "热菜", price: 98, cost: 55, demoQty: 10 },
      { name: "小炒黄牛肉", category: "热菜", price: 58, cost: 28, demoQty: 12 },
      { name: "农家小炒肉", category: "热菜", price: 48, cost: 18, demoQty: 8 },
      { name: "酸辣土豆丝", category: "素菜", price: 22, cost: 6, demoQty: 10 },
      { name: "米饭", category: "主食", price: 3, cost: 1, demoQty: 40 },
      { name: "长沙米酒", category: "饮品", price: 18, cost: 4, demoQty: 14 },
      { name: "自制酸梅汤", category: "饮品", price: 16, cost: 3, demoQty: 9 },
      { name: "低毛利引流烤翅", category: "热菜", price: 39, cost: 28, demoQty: 22 },
      { name: "季节时蔬", category: "素菜", price: 26, cost: 8, demoQty: 7 },
    ],
    dailyOpts: { decline: 0.004, costRate: 0.38 },
  },
  hotpot: {
    id: "hotpot",
    label: "火锅",
    tip: "火锅重翻台与夜宵；对标提示：周末晚市客流波动大时优先查等位与锅底毛利。",
    profile: {
      name: "渝焰火锅",
      city: "成都",
      category: "火锅",
      priceRange: "人均约 95",
    },
    evidence: [
      "周末等位一个小时，带小孩吃不了",
      "锅底味道可以，会回购",
      "牛肉卷有点贵不太值",
      "服务员换桌太慢",
      "环境有点吵但氛围够",
    ],
    menu: [
      { name: "牛油红锅", category: "锅底", price: 48, cost: 12, demoQty: 30 },
      { name: "鲜切毛肚", category: "荤菜", price: 48, cost: 22, demoQty: 24 },
      { name: "精品肥牛", category: "荤菜", price: 58, cost: 32, demoQty: 20 },
      { name: "鸭肠", category: "荤菜", price: 36, cost: 14, demoQty: 18 },
      { name: "笋片", category: "素菜", price: 16, cost: 4, demoQty: 22 },
      { name: "豆腐", category: "素菜", price: 12, cost: 3, demoQty: 16 },
      { name: "冰粉", category: "小吃", price: 12, cost: 3, demoQty: 14 },
      { name: "酸梅汤", category: "饮品", price: 15, cost: 3, demoQty: 20 },
      { name: "低毛利羊肉卷", category: "荤菜", price: 52, cost: 38, demoQty: 26 },
      { name: "米饭", category: "主食", price: 3, cost: 1, demoQty: 10 },
    ],
    dailyOpts: {
      meals: ["午市", "晚市", "夜宵"],
      baseGuests: 36,
      decline: 0.0035,
      mealBoost: { 午市: 0.75, 晚市: 1.45, 夜宵: 0.9 },
      ticket: { 午市: 82, 晚市: 105, 夜宵: 88 },
      costRate: 0.42,
      expenseRate: 0.24,
    },
  },
  tea: {
    id: "tea",
    label: "茶饮",
    tip: "茶饮重午晚峰与单品爆款；对标提示：TOP 单品贡献过高时要防供应链与排队劝退。",
    profile: {
      name: "清茶一号",
      city: "深圳",
      category: "茶饮",
      priceRange: "人均约 22",
    },
    evidence: [
      "高峰排队太长，等杯时间久",
      "杨枝甘露好喝会回购",
      "有点贵，隔壁更便宜",
      "外卖出餐慢",
      "店员态度不错",
    ],
    menu: [
      { name: "杨枝甘露", category: "果茶", price: 22, cost: 7, demoQty: 40 },
      { name: "柠檬茶", category: "茶饮", price: 14, cost: 3, demoQty: 55 },
      { name: "生椰拿铁", category: "咖啡", price: 18, cost: 6, demoQty: 28 },
      { name: "芋泥波波", category: "奶茶", price: 19, cost: 5, demoQty: 32 },
      { name: "纯茶", category: "茶饮", price: 12, cost: 2, demoQty: 18 },
      { name: "低毛利大杯水果茶", category: "果茶", price: 26, cost: 16, demoQty: 36 },
      { name: "小食薯条", category: "小吃", price: 12, cost: 4, demoQty: 10 },
      { name: "面包", category: "小吃", price: 10, cost: 3, demoQty: 8 },
    ],
    dailyOpts: {
      meals: ["午市", "下午茶", "晚市"],
      baseGuests: 55,
      decline: 0.0025,
      mealBoost: { 午市: 1.1, 下午茶: 1.25, 晚市: 1.0 },
      ticket: { 午市: 20, 下午茶: 22, 晚市: 21 },
      costRate: 0.32,
      expenseRate: 0.28,
    },
  },
};

function listPacks() {
  return Object.keys(PACKS).map(function (id) {
    return { id: id, label: PACKS[id].label, tip: PACKS[id].tip };
  });
}

function getPack(id) {
  return PACKS[id] || PACKS.xiangcai;
}

function buildPackRequest(packId) {
  const pack = getPack(packId);
  const menu = pack.menu;
  const daily = buildDaily(pack.dailyOpts || {});
  const sales = buildSales(menu, 30);
  const daySet = {};
  for (let i = 0; i < daily.length; i++) daySet[daily[i].date] = true;

  const diag = require("../../../libs/m-ops-diag.js");
  const evidence = diag.tagEvidenceFromText(pack.evidence.join("\n"), "dianping");

  return {
    profile: pack.profile,
    tip: pack.tip,
    request: {
      restaurantContext: {
        brandName: pack.profile.name,
        category: pack.profile.category,
        city: pack.profile.city,
        stage: "single_store",
        projectId: "mp-pack-" + pack.id,
      },
      facts: [
        { kind: "ledger_days", claim: String(Object.keys(daySet).length) },
        { kind: "daily_ops_json", claim: JSON.stringify(daily) },
        {
          kind: "daily_ops_summary",
          claim: pack.label + "示例 " + daily.length + " 条日×餐段",
        },
        { kind: "dish_sales_rows", claim: String(sales.length) },
        { kind: "dish_sales_json", claim: JSON.stringify(sales) },
        { kind: "menu_count", claim: String(menu.length) },
        { kind: "menu_json", claim: JSON.stringify(menu) },
        { kind: "priceRange", claim: pack.profile.priceRange },
        { kind: "exam_depth", claim: "deep" },
        { kind: "category_pack", claim: pack.id },
        { kind: "category_tip", claim: pack.tip },
      ],
      evidence: evidence,
      focus: "overall",
      horizon: "30d",
    },
  };
}

module.exports = {
  listPacks: listPacks,
  getPack: getPack,
  buildPackRequest: buildPackRequest,
};
