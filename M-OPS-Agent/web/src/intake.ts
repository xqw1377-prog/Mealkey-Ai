import type { ContextPackageV1 } from "@mealkey/agent-sdk/platform";
import {
  MIN_DISH_SALES_ROWS,
  MIN_LEDGER_MONTHS,
  aggregateDailyToMonthly,
  assessDailyOpsQuality,
  deriveBandsFromDaily,
  deriveBandsFromLedger,
  deriveDishStructure,
} from "./imports/finance";
import { menuContributionSense, menuMixBand } from "./imports/menu";
import type {
  DailyOpsRow,
  DishSalesRow,
  MenuItemRow,
  MonthlyLedgerRow,
} from "./imports/types";

export type IntakePhase = "identity" | "reality" | "owner" | "focus";

export const INTAKE_PHASES: Array<{
  id: IntakePhase;
  no: string;
  title: string;
  feel: string;
}> = [
  { id: "identity", no: "A", title: "这家店是谁", feel: "名字 · 位置 · 品类" },
  {
    id: "reality",
    no: "B",
    title: "经营账本与菜单",
    feel: "浅检可跳过账本，先看画像 · 深检需导入日×餐段 / 菜品销售 / 菜单",
  },
  {
    id: "owner",
    no: "C",
    title: "运营与体感",
    feel: "翻台 · 人效 · 客群 · 痛点",
  },
  { id: "focus", no: "D", title: "这次看什么", feel: "焦点 · 证据源" },
];

export type ExamDepth = "quick" | "deep";

export const EXAM_DEPTH_OPTIONS: Array<{ value: ExamDepth; label: string; hint: string }> = [
  { value: "quick", label: "浅检 · 快速画像", hint: "先看定位与体感，账本可后补" },
  { value: "deep", label: "深检 · 完整体检", hint: "需导入日×餐段账本、菜品销售与菜单" },
];

export type FormState = {
  /** 双轨体检深度：quick=浅检（可跳过账本）；deep=深检（需导入账本/销售/菜单） */
  examDepth: ExamDepth;
  name: string;
  city: string;
  district: string;
  address: string;
  category: string;
  priceRange: string;
  stage: string;
  seats: string;
  peakScene: string;
  signature: string;
  /** 经营 KPI 档位（可由账本推导） */
  revenueTrend: string;
  profitPressure: string;
  costPressure: string;
  expensePressure: string;
  trafficTrend: string;
  seatUtilization: string;
  dishDrinkMix: string;
  contributionSense: string;
  /** 账本与菜单：日×餐段为硬门槛 */
  dailyOps: DailyOpsRow[];
  dailyOpsFileName: string;
  dishSales: DishSalesRow[];
  dishSalesFileName: string;
  ledger: MonthlyLedgerRow[];
  ledgerFileName: string;
  menu: MenuItemRow[];
  menuFileName: string;
  menuPhotoDataUrl: string;
  menuSource: string;
  /** 运营 KPI 档位 */
  turnoverBand: string;
  serveSpeedSense: string;
  laborEfficiency: string;
  tableEfficiency: string;
  spaceEfficiency: string;
  staffChurn: string;
  mainGuests: string;
  knownPraise: string;
  knownPain: string;
  recentChange: string;
  focus: string;
  evidenceSources: string[];
};

export type RestaurantProfileLike = {
  brand?: string;
  city?: string;
  district?: string;
  category?: string;
  address?: string;
  priceRange?: string;
  stage?: string;
};

export const FOCI = [
  "为什么生意下降？",
  "顾客到底喜欢什么？",
  "有没有增长机会？",
  "我的定位有没有问题？",
  "全面看看我的经营状态",
];

export const STAGES = [
  { value: "single_store", label: "单店起步" },
  { value: "growth", label: "正在扩张/增长" },
  { value: "mature", label: "成熟稳定" },
  { value: "chain", label: "多店连锁" },
  { value: "franchise", label: "加盟体系" },
];

export const PEAK_SCENES = [
  "午市上班族",
  "晚市家庭/朋友聚餐",
  "周末打卡高峰",
  "夜宵/酒局",
  "全天较均匀",
];

export const GUEST_TYPES = [
  "附近居民复购",
  "朋友聚餐",
  "商务接待",
  "年轻人打卡",
  "家庭带娃",
  "外卖为主",
];

export const EVIDENCE_SOURCES = [
  { id: "dianping", label: "大众点评/美团评价" },
  { id: "xiaohongshu", label: "小红书种草" },
  { id: "douyin", label: "抖音传播" },
  { id: "map", label: "周边竞争/地图" },
  { id: "manual", label: "我补充的店内事实" },
];

export const TREND_BANDS = [
  { value: "up", label: "上行/增长" },
  { value: "flat", label: "持平" },
  { value: "down", label: "下行/下滑" },
];

export const PROFIT_BANDS = [
  { value: "comfortable", label: "利润尚可" },
  { value: "tight", label: "利润偏紧" },
  { value: "loss", label: "接近或已经亏损" },
];

export const PRESSURE_BANDS = [
  { value: "low", label: "压力不大" },
  { value: "medium", label: "有压力" },
  { value: "high", label: "压力很大" },
];

export const UTIL_BANDS = [
  { value: "high", label: "偏高/忙" },
  { value: "medium", label: "中等" },
  { value: "low", label: "偏低/空" },
];

export const MIX_BANDS = [
  { value: "food_heavy", label: "更靠菜品" },
  { value: "balanced", label: "菜饮较均衡" },
  { value: "drink_heavy", label: "更靠饮品" },
];

export const CONTRIB_BANDS = [
  { value: "high", label: "主力品很清晰" },
  { value: "medium", label: "一般" },
  { value: "low", label: "贡献很散" },
];

export const EFF_BANDS = [
  { value: "high", label: "偏强" },
  { value: "ok", label: "一般" },
  { value: "low", label: "偏弱" },
];

export const TURNOVER_BANDS = [
  { value: "high", label: "翻得快" },
  { value: "ok", label: "一般" },
  { value: "low", label: "翻得慢" },
];

export const SPEED_BANDS = [
  { value: "fast", label: "偏快" },
  { value: "ok", label: "正常" },
  { value: "slow", label: "偏慢" },
];

export const CHURN_BANDS = [
  { value: "low", label: "人员稳定" },
  { value: "medium", label: "有流动" },
  { value: "high", label: "流失偏高" },
];

export const DEFAULT_FORM: FormState = {
  examDepth: "quick",
  name: "湘味小馆",
  city: "长沙",
  district: "岳麓区",
  address: "",
  category: "湘菜",
  priceRange: "80",
  stage: "single_store",
  seats: "60",
  peakScene: "晚市家庭/朋友聚餐",
  signature: "",
  revenueTrend: "",
  profitPressure: "",
  costPressure: "",
  expensePressure: "",
  trafficTrend: "flat",
  seatUtilization: "medium",
  dishDrinkMix: "",
  contributionSense: "",
  dailyOps: [],
  dailyOpsFileName: "",
  dishSales: [],
  dishSalesFileName: "",
  ledger: [],
  ledgerFileName: "",
  menu: [],
  menuFileName: "",
  menuPhotoDataUrl: "",
  menuSource: "",
  turnoverBand: "ok",
  serveSpeedSense: "ok",
  laborEfficiency: "ok",
  tableEfficiency: "ok",
  spaceEfficiency: "ok",
  staffChurn: "medium",
  mainGuests: "朋友聚餐",
  knownPraise: "",
  knownPain: "",
  recentChange: "",
  focus: FOCI[4]!,
  evidenceSources: ["dianping", "xiaohongshu", "douyin", "map", "manual"],
};

export function nextIntakePhase(phase: IntakePhase): IntakePhase | null {
  const order: IntakePhase[] = ["identity", "reality", "owner", "focus"];
  const idx = order.indexOf(phase);
  return idx >= 0 && idx < order.length - 1 ? order[idx + 1]! : null;
}

export function prevIntakePhase(phase: IntakePhase): IntakePhase | null {
  const order: IntakePhase[] = ["identity", "reality", "owner", "focus"];
  const idx = order.indexOf(phase);
  return idx > 0 ? order[idx - 1]! : null;
}

export function validateIntakePhase(
  phase: IntakePhase,
  form: FormState,
): string | null {
  if (phase === "identity") {
    if (!form.name.trim()) return "先告诉我餐厅叫什么";
    if (!form.city.trim()) return "城市能帮我接到外部世界";
    if (!form.category.trim()) return "品类决定该听哪些顾客声音";
    return null;
  }
  if (phase === "reality") {
    if (form.examDepth === "quick") {
      // 浅检：只要求定位类信息，账本/销售/菜单缺失仅软提示（不阻断）
      if (!form.priceRange.trim()) return "客单价能帮我判断竞争位置";
      if (!form.stage.trim()) return "门店阶段会影响风险解读";
      if (!form.peakScene.trim()) return "高峰场景决定先看服务还是产品";
      return null;
    }
    const dailyQ = assessDailyOpsQuality(form.dailyOps);
    if (!dailyQ.ok) {
      return dailyQ.reason || "请导入日×餐段经营明细（日期/餐段/来客/人均或营收）";
    }
    if (form.dishSales.length < MIN_DISH_SALES_ROWS) {
      return `请导入菜品销售结构（至少 ${MIN_DISH_SALES_ROWS} 行：日期/菜名/销量或销售额）`;
    }
    if (!form.menu.length) {
      return "请导入菜单（Excel/CSV），或拍照后补录至少 1 个品项";
    }
    if (!form.priceRange.trim()) return "客单价能帮我判断竞争位置";
    if (!form.stage.trim()) return "门店阶段会影响风险解读";
    if (!form.peakScene.trim()) return "高峰场景决定先看服务还是产品";
    return null;
  }
  if (phase === "owner") {
    if (!form.mainGuests.trim()) return "谁常来，决定声音墙怎么读";
    if (!form.turnoverBand.trim()) return "翻台率是运营轴的底线输入";
    if (!form.laborEfficiency.trim()) return "人效能帮我判断是人不够还是节奏问题";
    if (!form.knownPain.trim() && !form.knownPraise.trim()) {
      return "至少告诉我一件顾客常夸或常抱怨的事";
    }
    return null;
  }
  if (!form.focus.trim()) return "选一个这次最想弄清的问题";
  if (!form.evidenceSources.length) return "至少选一个要观察的证据源";
  return null;
}

export function intakeCompleteness(form: FormState): number {
  const checks = [
    form.name,
    form.city,
    form.category,
    form.address || form.district,
    form.priceRange,
    form.stage,
    form.peakScene,
    form.seats,
    form.signature,
    form.dailyOps.length ? "1" : "",
    form.dishSales.length >= MIN_DISH_SALES_ROWS ? "1" : "",
    form.ledger.length >= MIN_LEDGER_MONTHS || form.dailyOps.length ? "1" : "",
    form.menu.length ? "1" : "",
    form.revenueTrend,
    form.profitPressure,
    form.costPressure,
    form.trafficTrend,
    form.seatUtilization,
    form.dishDrinkMix,
    form.turnoverBand,
    form.serveSpeedSense,
    form.laborEfficiency,
    form.mainGuests,
    form.knownPraise || form.knownPain,
    form.focus,
    form.evidenceSources.length > 0 ? "1" : "",
  ];
  const filled = checks.filter((item) => String(item || "").trim()).length;
  return Math.round((filled / checks.length) * 100);
}

function pushBandFact(
  facts: Array<{ kind: string; claim: string; asOf?: string }>,
  kind: string,
  label: string,
  band: string,
  asOf: string,
) {
  if (!band.trim()) return;
  facts.push({ kind, claim: `${label}：${band}`, asOf });
}

export function applyLedgerDerivedBands(form: FormState): FormState {
  const fromDaily = form.dailyOps.length ? deriveBandsFromDaily(form.dailyOps) : null;
  const ledger =
    form.ledger.length >= MIN_LEDGER_MONTHS
      ? form.ledger
      : form.dailyOps.length
        ? aggregateDailyToMonthly(form.dailyOps)
        : form.ledger;
  const fromMonthly = deriveBandsFromLedger(ledger);
  const derived = fromDaily || fromMonthly;
  if (!derived) return { ...form, ledger };

  const dishStruct = form.dishSales.length
    ? deriveDishStructure(form.dishSales)
    : null;
  const mix =
    dishStruct?.dishDrinkMix ||
    (form.menu.length ? menuMixBand(form.menu) : form.dishDrinkMix);
  const contrib =
    dishStruct?.contributionSense ||
    (form.menu.length ? menuContributionSense(form.menu) : form.contributionSense);

  const avgTicket = fromDaily?.avgTicket;
  return {
    ...form,
    ledger,
    revenueTrend: derived.revenueTrend,
    profitPressure: derived.profitPressure,
    costPressure: derived.costPressure,
    expensePressure: derived.expensePressure,
    trafficTrend:
      "trafficTrend" in derived && derived.trafficTrend
        ? String(derived.trafficTrend)
        : form.trafficTrend || "flat",
    dishDrinkMix: mix || form.dishDrinkMix,
    contributionSense: contrib || form.contributionSense,
    priceRange:
      form.priceRange.trim() ||
      (avgTicket ? String(Math.round(avgTicket)) : form.priceRange),
  };
}

export function buildOwnerFacts(form: FormState) {
  const synced = applyLedgerDerivedBands(form);
  const asOf = new Date().toISOString();
  const facts: Array<{ kind: string; claim: string; asOf?: string }> = [
    { kind: "exam_depth", claim: synced.examDepth, asOf },
    { kind: "focus", claim: `当前最想知道：${synced.focus}`, asOf },
    { kind: "priceRange", claim: `人均约 ${synced.priceRange} 元`, asOf },
    { kind: "storeStage", claim: `门店阶段：${stageLabel(synced.stage)}`, asOf },
    { kind: "peakScene", claim: `高峰场景：${synced.peakScene}`, asOf },
    { kind: "mainGuests", claim: `主力客群：${synced.mainGuests}`, asOf },
  ];
  if (synced.seats.trim()) {
    facts.push({ kind: "seats", claim: `餐位数约 ${synced.seats}`, asOf });
  }
  if (synced.signature.trim()) {
    facts.push({ kind: "signature", claim: `招牌/记忆点：${synced.signature}`, asOf });
  }
  if (synced.address.trim()) {
    facts.push({ kind: "address", claim: synced.address, asOf });
  }

  if (synced.ledger.length >= MIN_LEDGER_MONTHS) {
    facts.push({
      kind: "ledger_months",
      claim: String(synced.ledger.length),
      asOf,
    });
    facts.push({
      kind: "ledger_json",
      claim: JSON.stringify(synced.ledger),
      asOf,
    });
    const derived = deriveBandsFromLedger(synced.ledger)!;
    facts.push({
      kind: "ledger_summary",
      claim: `${derived.span} 近${derived.months}月均营收${Math.round(derived.avgRevenue)}/均成本${Math.round(derived.avgCost)}/均费用${Math.round(derived.avgExpense)}/均利润${Math.round(derived.avgProfit)}/利润率${(derived.margin * 100).toFixed(1)}%`,
      asOf,
    });
  }

  if (synced.dailyOps.length) {
    const q = assessDailyOpsQuality(synced.dailyOps);
    facts.push({ kind: "ledger_days", claim: String(q.days), asOf });
    facts.push({
      kind: "daily_ops_summary",
      claim: `${q.months.join("~")}｜${q.days}日｜${synced.dailyOps.length}条餐段｜来客${q.totalGuests}｜人均${Math.round(q.avgTicket)}｜餐段${q.mealPeriods.join("/")}`,
      asOf,
    });
    facts.push({
      kind: "daily_ops_json",
      claim: JSON.stringify(synced.dailyOps.slice(0, 400)),
      asOf,
    });
    facts.push({
      kind: "meal_period_mix",
      claim: q.mealPeriods.join("、") || "未标注",
      asOf,
    });
    const zoneRev = new Map<string, number>();
    for (const row of synced.dailyOps) {
      zoneRev.set(row.zone, (zoneRev.get(row.zone) || 0) + row.revenue);
    }
    const topZones = Array.from(zoneRev.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([z, v]) => `${z}:${Math.round(v)}`);
    facts.push({
      kind: "zone_revenue_mix",
      claim: topZones.join("；") || "未分区",
      asOf,
    });
  }

  if (synced.dishSales.length) {
    const struct = deriveDishStructure(synced.dishSales)!;
    facts.push({
      kind: "dish_sales_rows",
      claim: String(synced.dishSales.length),
      asOf,
    });
    facts.push({
      kind: "dish_sales_summary",
      claim: `${struct.skuCount}品项｜TOP贡献${(struct.topShare * 100).toFixed(0)}%｜${struct.top
        .slice(0, 5)
        .map((t) => `${t.name}¥${Math.round(t.amount)}`)
        .join("、")}`,
      asOf,
    });
    facts.push({
      kind: "dish_sales_json",
      claim: JSON.stringify(synced.dishSales.slice(0, 500)),
      asOf,
    });
  }

  if (synced.menu.length) {
    facts.push({
      kind: "menu_count",
      claim: String(synced.menu.length),
      asOf,
    });
    facts.push({
      kind: "menu_json",
      claim: JSON.stringify(
        synced.menu.map((item) => ({
          name: item.name,
          category: item.category,
          price: item.price,
          cost: item.cost,
          kind: item.kind,
        })),
      ),
      asOf,
    });
  }

  pushBandFact(facts, "revenue_trend", "营收趋势", synced.revenueTrend, asOf);
  pushBandFact(facts, "profit_pressure", "利润压力", synced.profitPressure, asOf);
  pushBandFact(facts, "cost_pressure", "成本压力", synced.costPressure, asOf);
  pushBandFact(facts, "expense_pressure", "费用压力", synced.expensePressure, asOf);
  pushBandFact(facts, "traffic_trend", "客流趋势", synced.trafficTrend, asOf);
  pushBandFact(facts, "seat_utilization", "餐位利用率", synced.seatUtilization, asOf);
  pushBandFact(facts, "dish_drink_mix", "菜饮贡献结构", synced.dishDrinkMix, asOf);
  pushBandFact(facts, "contribution_sense", "结构贡献感", synced.contributionSense, asOf);
  pushBandFact(facts, "turnover_band", "翻台率", synced.turnoverBand, asOf);
  pushBandFact(facts, "serve_speed_sense", "上菜速度", synced.serveSpeedSense, asOf);
  pushBandFact(facts, "labor_efficiency", "人效", synced.laborEfficiency, asOf);
  pushBandFact(facts, "table_efficiency", "桌效", synced.tableEfficiency, asOf);
  pushBandFact(facts, "space_efficiency", "平效", synced.spaceEfficiency, asOf);
  pushBandFact(facts, "staff_churn", "员工流失", synced.staffChurn, asOf);
  if (synced.knownPraise.trim()) {
    facts.push({ kind: "owner_praise", claim: synced.knownPraise, asOf });
  }
  if (synced.knownPain.trim()) {
    facts.push({ kind: "owner_pain", claim: synced.knownPain, asOf });
  }
  if (synced.recentChange.trim()) {
    facts.push({ kind: "recent_change", claim: synced.recentChange, asOf });
  }
  facts.push({
    kind: "evidence_sources",
    claim: `重点观察：${synced.evidenceSources.join("、")}`,
    asOf,
  });
  return facts;
}

export function buildOwnerEvidence(form: FormState): ContextPackageV1["evidence"] {
  const asOf = new Date().toISOString();
  const items: NonNullable<ContextPackageV1["evidence"]> = [];
  if (form.knownPraise.trim()) {
    items.push({
      id: "owner-praise",
      source: "老板补充",
      claim: form.knownPraise.trim(),
      sentiment: "positive",
      theme: "product",
      observedAt: asOf,
    });
  }
  if (form.knownPain.trim()) {
    const theme = /等|排队|慢|服务|上菜/.test(form.knownPain) ? "wait" : "service";
    items.push({
      id: "owner-pain",
      source: "老板补充",
      claim: form.knownPain.trim(),
      sentiment: "negative",
      theme,
      observedAt: asOf,
    });
  }
  if (form.signature.trim()) {
    items.push({
      id: "owner-signature",
      source: "老板补充",
      claim: `${form.name} 的记忆点是「${form.signature.trim()}」`,
      sentiment: "positive",
      theme: "product",
      observedAt: asOf,
    });
  }
  if (form.recentChange.trim()) {
    items.push({
      id: "owner-change",
      source: "老板补充",
      claim: `近期变化：${form.recentChange.trim()}`,
      sentiment: "neutral",
      theme: "operation",
      observedAt: asOf,
    });
  }
  if (form.mainGuests.trim()) {
    items.push({
      id: "owner-guests",
      source: "老板补充",
      claim: `主力客群偏「${form.mainGuests}」，高峰更像「${form.peakScene}」`,
      sentiment: "neutral",
      theme: "growth",
      observedAt: asOf,
    });
  }
  if (form.dailyOps.length) {
    const q = assessDailyOpsQuality(form.dailyOps);
    items.push({
      id: "daily-ops-core",
      source: "日×餐段账本",
      claim: q.ok
        ? `已导入 ${q.days} 个营业日、${form.dailyOps.length} 条餐段明细；来客 ${q.totalGuests}，人均 ${Math.round(q.avgTicket)}；餐段 ${q.mealPeriods.join("/")}`
        : `日明细不完整：${q.reason}`,
      sentiment: q.ok ? "neutral" : "negative",
      theme: "operation",
      observedAt: asOf,
    });
  } else if (form.ledger.length >= MIN_LEDGER_MONTHS) {
    const derived = deriveBandsFromLedger(form.ledger);
    items.push({
      id: "ledger-core",
      source: "经营账本",
      claim: derived
        ? `仅有月度汇总 ${form.ledger.length} 个月（${derived.span}），缺日×餐段明细，经营分析深度受限`
        : `已导入 ${form.ledger.length} 个月账本`,
      sentiment: "negative",
      theme: "operation",
      observedAt: asOf,
    });
  }
  if (form.dishSales.length) {
    const struct = deriveDishStructure(form.dishSales);
    items.push({
      id: "dish-sales-core",
      source: "菜品销售结构",
      claim: struct
        ? `销售结构 ${form.dishSales.length} 行 / ${struct.skuCount} 品项；TOP ${(struct.topShare * 100).toFixed(0)}%：${struct.top
            .slice(0, 3)
            .map((t) => t.name)
            .join("、")}`
        : `已导入 ${form.dishSales.length} 行菜品销售`,
      sentiment: "neutral",
      theme: "product",
      observedAt: asOf,
    });
  }
  if (form.menu.length) {
    const top = [...form.menu].sort((a, b) => b.price - a.price).slice(0, 3);
    items.push({
      id: "menu-core",
      source: "菜单导入",
      claim: `菜单 ${form.menu.length} 项；高价位代表：${top.map((i) => `${i.name}¥${i.price}`).join("、")}`,
      sentiment: "neutral",
      theme: "product",
      observedAt: asOf,
    });
  }
  return items;
}

function stageLabel(stage: string) {
  return STAGES.find((item) => item.value === stage)?.label || stage;
}

export function mapFormToRegistration(form: FormState, restaurantId: string) {
  return {
    restaurantId,
    brand: form.name,
    storeName: form.name,
    city: form.city,
    district: form.district,
    category: form.category,
    address: form.address || undefined,
    priceRange: form.priceRange || undefined,
    stage: form.stage as
      | "single_store"
      | "growth"
      | "chain"
      | "franchise"
      | "mature",
    tags: [form.peakScene, form.mainGuests, form.signature].filter(Boolean),
    manualFacts: buildOwnerFacts(form),
    manualEvidence: buildOwnerEvidence(form),
    scanPlan: {
      enabled: true,
      frequency: "daily" as const,
      sources: form.evidenceSources as Array<
        "dianping" | "meituan" | "xiaohongshu" | "douyin" | "map" | "manual"
      >,
    },
  };
}
