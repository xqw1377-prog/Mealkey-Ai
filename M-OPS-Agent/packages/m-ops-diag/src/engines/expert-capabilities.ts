/**
 * 四官专业能力：基于可复核公式输出诊断，而非套话。
 */

import type {
  DiagnosisEvidenceItem,
  DiagnosisFact,
  ExpertRole,
  HealthLevel,
} from "../contracts";
import { claimMatchesTheme } from "../reasoning/patterns";
import {
  aggregateByMonth,
  computeDishAbc,
  computePnL,
  decomposeRevenueChange,
  driverLabel,
  enrichDishSalesWithMenu,
  formatMoney,
  formatPct,
  mealContributionIndex,
  professionalConfidence,
  type DailyOpsRow,
  type DishSalesRow,
  type MenuItemCost,
  uniqueDates,
  zoneContribution,
  pct,
  sum,
} from "./diagnosis-math";
import {
  evaluateCategoryAlerts,
  resolveCategoryThresholds,
} from "./category-thresholds";

export type DailyOpsFactRow = DailyOpsRow;
export type DishSalesFactRow = DishSalesRow;

export type ExpertAnalysisCell = {
  label: string;
  value: string;
  note?: string;
  metricId?: string;
};

export type ExpertCapabilityResult = {
  role: ExpertRole;
  title: string;
  seat: string;
  level: HealthLevel;
  capabilities: string[];
  verdict: string;
  analyses: ExpertAnalysisCell[];
  observations: string[];
  risks: string[];
  counsel: string[];
  confidence: number;
  refused: boolean;
  refuseReason?: string;
  /** 供会审合成的结构化信号 */
  signals?: Array<{ id: string; severity: HealthLevel; statement: string }>;
};

const MIN_DAYS = 7;
const MIN_DISH_ROWS = 8;

function parseJsonFact<T>(facts: DiagnosisFact[] | undefined, kind: string): T | null {
  const raw = facts?.find((f) => f.kind === kind)?.claim;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function factClaim(facts: DiagnosisFact[] | undefined, kind: string): string | undefined {
  return facts?.find((f) => f.kind === kind)?.claim;
}

function worse(a: HealthLevel, b: HealthLevel): HealthLevel {
  const rank: Record<HealthLevel, number> = {
    healthy: 0,
    observe: 1,
    attention: 2,
    risk: 3,
    critical: 4,
  };
  return rank[a] >= rank[b] ? a : b;
}

function trendLevel(
  changePct: number,
  warn = -5,
  risk = -15,
): HealthLevel {
  if (changePct <= risk) return "risk";
  if (changePct <= warn) return "attention";
  if (changePct >= 8) return "healthy";
  return "observe";
}

function professionalVerdict(input: {
  title: string;
  level: HealthLevel;
  headline: string;
  evidence: string;
}): string {
  const tone =
    input.level === "critical"
      ? "拒签"
      : input.level === "risk"
        ? "判定风险"
        : input.level === "attention"
          ? "提示关注"
          : input.level === "healthy"
            ? "判定稳定"
            : "维持观察";
  return `${input.title}${tone}：${input.headline}（依据：${input.evidence}）`;
}

/** 财务官 */
export function runFinanceOfficer(input: {
  facts?: DiagnosisFact[];
}): ExpertCapabilityResult {
  const capabilities = [
    "营收变动 = 客单效应 × 客流效应 分解",
    "餐段贡献指数 MCI",
    "区域贡献与集中度",
    "成本率 / 费用率 / 利润率（有科目时）",
    "硬门槛拒签：营业日 < 7",
  ];
  const daily = parseJsonFact<DailyOpsRow[]>(input.facts, "daily_ops_json") || [];
  const days = uniqueDates(daily);

  if (days < MIN_DAYS) {
    return {
      role: "finance",
      title: "财务官",
      seat: "CFO 席",
      level: "critical",
      capabilities,
      verdict: professionalVerdict({
        title: "财务官",
        level: "critical",
        headline: "日×餐段样本不足，无法出具流水与损益诊断",
        evidence: `有效营业日 ${days}（阈值 ≥${MIN_DAYS}）`,
      }),
      analyses: [],
      observations: [`有效营业日仅 ${days} 天，未达财务硬门槛`],
      risks: ["在补齐日明细前，营收/利润相关结论一律不可采信"],
      counsel: [
        `导入不少于 ${MIN_DAYS} 个营业日的日×餐段明细（建议覆盖 3 个月）`,
        "字段至少含：日期、餐段、区域、来客数、人均或营收；尽量含成本/费用",
      ],
      confidence: professionalConfidence({ days, refused: true }),
      refused: true,
      refuseReason: `营业日 ${days} < ${MIN_DAYS}`,
      signals: [
        {
          id: "finance_data_gap",
          severity: "critical",
          statement: "财务硬数据不足",
        },
      ],
    };
  }

  const months = aggregateByMonth(daily);
  const pnl = computePnL(daily);
  const meals = mealContributionIndex(daily);
  const zones = zoneContribution(daily);
  const topMeal = meals[0];
  const topZone = zones[0];

  let decomp = null as ReturnType<typeof decomposeRevenueChange> | null;
  if (months.length >= 2) {
    const first = months[0]!;
    const last = months[months.length - 1]!;
    decomp = decomposeRevenueChange({
      revenue0: first.revenue,
      guests0: first.guests,
      ticket0: first.avgTicket,
      revenue1: last.revenue,
      guests1: last.guests,
      ticket1: last.avgTicket,
    });
  }

  let level: HealthLevel = "observe";
  if (decomp) level = worse(level, trendLevel(decomp.dRevPct));
  if (pnl.hasCost || pnl.hasExpense) {
    if (pnl.marginPct < 0) level = worse(level, "risk");
    else if (pnl.marginPct < 8) level = worse(level, "attention");
    if (pnl.costRatioPct > 40) level = worse(level, "attention");
    if (pnl.expenseRatioPct > 35) level = worse(level, "attention");
  }
  if (topMeal && topMeal.revenueShare >= 65) level = worse(level, "attention");
  if (topZone && topZone.revenueShare >= 70) level = worse(level, "attention");

  const analyses: ExpertAnalysisCell[] = [
    {
      label: "样本窗",
      value: `${months[0]?.month || "?"}~${months[months.length - 1]?.month || "?"} · ${days} 个营业日 · ${daily.length} 条餐段`,
      metricId: "sample_window",
    },
    {
      label: "总营收 / 来客 / 人均",
      value: `${formatMoney(pnl.revenue)} / ${sum(daily.map((r) => r.guests))} / ${formatMoney(pnl.revenue / Math.max(1, sum(daily.map((r) => r.guests))))}`,
      metricId: "rev_guests_ticket",
    },
  ];

  if (decomp) {
    analyses.push({
      label: "营收变动分解",
      value: `Δ营收 ${formatPct(decomp.dRevPct)}｜客单效应占 ${decomp.ticketShare.toFixed(0)}%｜客流效应占 ${decomp.guestShare.toFixed(0)}%｜主因：${driverLabel(decomp.driver)}`,
      note:
        decomp.driver === "ticket"
          ? "应优先查菜单结构与定价，而非盲目拉新"
          : decomp.driver === "traffic"
            ? "应优先查获客/复购与高峰体验，而非先调价"
            : undefined,
      metricId: "rev_decomposition",
    });
  }

  analyses.push({
    label: "餐段 MCI（贡献指数）",
    value: meals
      .slice(0, 4)
      .map((m) => `${m.mealPeriod} MCI=${m.mci.toFixed(2)}（份额${m.revenueShare.toFixed(0)}%·人均指数${m.ticketIndex.toFixed(2)}）`)
      .join("；"),
    note: topMeal && topMeal.revenueShare >= 65 ? `过度依赖「${topMeal.mealPeriod}」` : undefined,
    metricId: "meal_mci",
  });

  analyses.push({
    label: "区域贡献",
    value: zones
      .slice(0, 4)
      .map((z) => `${z.zone} ${z.revenueShare.toFixed(0)}%·人均${formatMoney(z.avgTicket)}`)
      .join("；"),
    note: topZone && topZone.revenueShare >= 70 ? `区域集中度过高：${topZone.zone}` : undefined,
    metricId: "zone_mix",
  });

  analyses.push({
    label: "损益结构",
    value:
      pnl.hasCost || pnl.hasExpense
        ? `利润率 ${pnl.marginPct.toFixed(1)}% · 成本率 ${pnl.costRatioPct.toFixed(1)}% · 费用率 ${pnl.expenseRatioPct.toFixed(1)}%（成本覆盖 ${(pnl.costCoverage * 100).toFixed(0)}%）`
        : "日明细未含成本/费用，只能诊断流水与客流，不能回答「赚不赚钱」",
    metricId: "pnl",
  });

  const risks: string[] = [];
  const signals: ExpertCapabilityResult["signals"] = [];
  if (decomp && decomp.dRevPct <= -5) {
    risks.push(
      `近窗营收 ${formatPct(decomp.dRevPct)}，主因属${driverLabel(decomp.driver)}`,
    );
    signals.push({
      id: "rev_down",
      severity: trendLevel(decomp.dRevPct),
      statement: `营收下行且主因=${decomp.driver}`,
    });
  }
  if (topMeal && topMeal.revenueShare >= 65) {
    risks.push(`餐段依赖：${topMeal.mealPeriod} 占营收 ${topMeal.revenueShare.toFixed(0)}%`);
    signals.push({
      id: "meal_concentration",
      severity: "attention",
      statement: `餐段集中 ${topMeal.mealPeriod}`,
    });
  }
  if (topZone && topZone.revenueShare >= 70) {
    risks.push(`区域依赖：${topZone.zone} 占营收 ${topZone.revenueShare.toFixed(0)}%`);
  }
  if ((pnl.hasCost || pnl.hasExpense) && pnl.marginPct < 8) {
    risks.push(`利润率 ${pnl.marginPct.toFixed(1)}% 偏紧，需对照菜品毛利与费用刚性`);
    signals.push({
      id: "thin_margin",
      severity: pnl.marginPct < 0 ? "risk" : "attention",
      statement: `利润率 ${pnl.marginPct.toFixed(1)}%`,
    });
  }
  if (!pnl.hasCost && !pnl.hasExpense) {
    risks.push("缺成本费用科目：财务诊断停留在流水层");
  }
  if (!risks.length) risks.push("财务红灯未亮；继续按周监控餐段 MCI 与区域集中度");

  const headline = decomp
    ? `近窗营收 ${formatPct(decomp.dRevPct)}，变动主因${driverLabel(decomp.driver)}`
    : `已建立 ${days} 日经营截面，趋势窗仍短`;

  return {
    role: "finance",
    title: "财务官",
    seat: "CFO 席",
    level,
    capabilities,
    verdict: professionalVerdict({
      title: "财务官",
      level,
      headline,
      evidence: analyses.find((a) => a.metricId === "rev_decomposition")?.value || analyses[0]!.value,
    }),
    analyses,
    observations: analyses.map((a) => `${a.label}：${a.value}`),
    risks,
    counsel: [
      decomp?.driver === "ticket"
        ? "客单主导下行/波动：先复盘头部菜定价与结构，再谈投放"
        : decomp?.driver === "traffic"
          ? "客流主导：先查高峰体验与复购，再考虑调价"
          : "维持客单×客流双周看板，避免只看总营收",
      topMeal
        ? `提升非「${topMeal.mealPeriod}」餐段的来客或人均，降低单餐段依赖`
        : "补齐餐段标注后再做造血诊断",
      pnl.hasCost || pnl.hasExpense
        ? "按月拆成本率/费用率，识别刚性费用与可浮动费用"
        : "下一步必须补成本/费用，否则无法闭环「赚钱能力」",
    ],
    confidence: professionalConfidence({
      days,
      costCoverage: pnl.costCoverage,
      comparableMonths: months.length,
    }),
    refused: false,
    signals,
  };
}

/** 产品官 */
export function runProductOfficer(input: {
  facts?: DiagnosisFact[];
  evidence?: DiagnosisEvidenceItem[];
  category?: string;
}): ExpertCapabilityResult {
  const capabilities = [
    "Pareto ABC（A≤80% / B≤95% / C 余下）",
    "菜单成本 JOIN 菜销 → 流水×毛利四象限",
    "菜饮结构与长尾稀释",
    "对照外部产品负评",
    "硬门槛拒签：销售行 < 8 或菜单缺失",
  ];
  const salesRaw = parseJsonFact<DishSalesRow[]>(input.facts, "dish_sales_json") || [];
  const menu = parseJsonFact<MenuItemCost[]>(input.facts, "menu_json") || [];
  const menuCount = Number(factClaim(input.facts, "menu_count") || menu.length || 0);

  if (salesRaw.length < MIN_DISH_ROWS) {
    return {
      role: "product",
      title: "产品官",
      seat: "CPO 席",
      level: "critical",
      capabilities,
      verdict: professionalVerdict({
        title: "产品官",
        level: "critical",
        headline: "菜品销售结构不足，无法计算贡献与毛利矩阵",
        evidence: `销售行 ${salesRaw.length}（阈值 ≥${MIN_DISH_ROWS}）`,
      }),
      analyses: [],
      observations: [`菜品销售仅 ${salesRaw.length} 行`],
      risks: ["无销售结构则菜单优化与招牌决策没有依据"],
      counsel: ["导入菜品销售：日期、餐段、菜名、销量、销售额（最好含分类与成本）"],
      confidence: professionalConfidence({ days: 0, dishCount: 0, refused: true }),
      refused: true,
      refuseReason: `销售行 ${salesRaw.length} < ${MIN_DISH_ROWS}`,
      signals: [
        {
          id: "product_data_gap",
          severity: "critical",
          statement: "产品销售结构缺失",
        },
      ],
    };
  }

  if (menuCount < 1) {
    return {
      role: "product",
      title: "产品官",
      seat: "CPO 席",
      level: "critical",
      capabilities,
      verdict: professionalVerdict({
        title: "产品官",
        level: "critical",
        headline: "菜单主数据缺失，无法对齐售价/成本做结构会审",
        evidence: "menu_count = 0",
      }),
      analyses: [],
      observations: ["未导入菜单主数据"],
      risks: ["无菜单则无法校验定价、成本与招牌结构"],
      counsel: ["导入菜单（菜名、售价，建议含成本与分类）"],
      confidence: professionalConfidence({
        days: 0,
        dishCount: salesRaw.length,
        refused: true,
      }),
      refused: true,
      refuseReason: "菜单硬门槛缺失",
      signals: [
        {
          id: "product_data_gap",
          severity: "critical",
          statement: "菜单主数据缺失，产品官拒签",
        },
      ],
    };
  }

  const enriched = enrichDishSalesWithMenu(salesRaw, menu);
  const sales = enriched.rows;
  const abc = computeDishAbc(sales);

  const productNeg =
    input.evidence?.filter(
      (e) =>
        e.sentiment === "negative" &&
        (claimMatchesTheme(e.claim, "product", e.theme) || e.theme === "product"),
    ).length || 0;

  const cashCows = abc.ranked.filter((r) => r.quadrant === "cash_cow");
  const stars = abc.ranked.filter((r) => r.quadrant === "star");
  const dogs = abc.ranked.filter((r) => r.quadrant === "dog");

  const cat = resolveCategoryThresholds(input.category);
  let level: HealthLevel = "observe";
  if (abc.aCount <= 3) level = worse(level, "attention");
  if (abc.top20SharePct >= cat.top20ShareWarn) level = worse(level, "attention");
  if (abc.longTailCount > abc.ranked.length * 0.5) level = worse(level, "attention");
  if (cashCows.length >= 2) level = worse(level, "attention");
  if (productNeg >= 2) level = worse(level, "attention");
  if (!menuCount) level = worse(level, "attention");

  const analyses: ExpertAnalysisCell[] = [
    {
      label: "ABC 结构",
      value: `A ${abc.aCount} / B ${abc.bCount} / C ${abc.cCount}（共 ${abc.ranked.length} SKU）`,
      note: abc.aCount <= 3 ? "A 类过窄，断货与出品风险集中" : undefined,
      metricId: "abc",
    },
    {
      label: "TOP20% 流水贡献",
      value: `${abc.top20SharePct.toFixed(0)}%`,
      note:
        abc.top20SharePct >= cat.top20ShareWarn
          ? `${cat.label}告警线 ${cat.top20ShareWarn}%`
          : `${cat.label}告警线 ${cat.top20ShareWarn}%（未触达）`,
      metricId: "top20_share",
    },
    {
      label: "菜饮结构",
      value: `饮品相关 ${abc.drinkSharePct.toFixed(0)}% · 其余 ${(100 - abc.drinkSharePct).toFixed(0)}%`,
      metricId: "drink_share",
    },
    {
      label: "菜单成本对齐",
      value: abc.hasMargin
        ? `已匹配成本，可出四象限（JOIN ${enriched.matched} 项）`
        : `结构可读、毛利不可读（缺成本 ${enriched.missingCost} 项）`,
      note: abc.hasMargin ? undefined : "请在菜单或销售中补成本列",
      metricId: "menu_cost_join",
    },
    {
      label: "A 类代表",
      value: abc.ranked
        .filter((r) => r.abc === "A")
        .slice(0, 5)
        .map((t) => `${t.name}(${t.sharePct.toFixed(1)}%)`)
        .join("、"),
      metricId: "a_class",
    },
    {
      label: "长尾",
      value: `${abc.longTailCount} 个单品贡献 <1%`,
      note:
        abc.longTailCount > abc.ranked.length * 0.5
          ? "菜单可能过长，稀释厨房产能"
          : undefined,
      metricId: "long_tail",
    },
  ];

  if (abc.hasMargin) {
    analyses.push({
      label: "流水×毛利四象限",
      value: `明星 ${stars.length} · 现金流（高流水低毛利） ${cashCows.length} · 问题 ${abc.ranked.filter((r) => r.quadrant === "question").length} · 瘦狗 ${dogs.length}`,
      note: cashCows[0]
        ? `警惕高流水低毛利：${cashCows
            .slice(0, 3)
            .map((c) => c.name)
            .join("、")}`
        : undefined,
      metricId: "margin_matrix",
    });
  } else {
    analyses.push({
      label: "流水×毛利四象限",
      value: "销售未含单品成本，无法识别高流水低毛利陷阱",
      metricId: "margin_matrix",
    });
  }

  const risks: string[] = [];
  const signals: ExpertCapabilityResult["signals"] = [];
  if (abc.aCount <= 3) {
    risks.push(`A 类仅 ${abc.aCount} 个品项撑起约 80% 流水，结构脆弱`);
    signals.push({
      id: "narrow_a",
      severity: "attention",
      statement: "A类过窄",
    });
  }
  if (cashCows.length) {
    risks.push(
      `高流水低毛利：${cashCows
        .slice(0, 3)
        .map((c) => c.name)
        .join("、")}`,
    );
    signals.push({
      id: "low_margin_hero",
      severity: "attention",
      statement: "存在高流水低毛利菜",
    });
  }
  if (abc.longTailCount > abc.ranked.length * 0.5) {
    risks.push("长尾过长，可能拖累出菜速度与库存周转");
  }
  if (productNeg >= 2) risks.push("外部产品负评抬头，需核对是否落在 A 类菜");
  if (!menuCount) risks.push("缺菜单主数据，销售结构无法回写到可管理菜单");
  const catAlerts = evaluateCategoryAlerts({
    category: input.category,
    top20SharePct: abc.top20SharePct,
  }).alerts;
  for (const alert of catAlerts) {
    risks.push(alert.statement);
    signals.push({
      id: alert.id,
      severity: alert.level,
      statement: alert.statement,
    });
  }
  if (!risks.length) risks.push("产品结构红灯未亮；维持月度 ABC 复算");

  return {
    role: "product",
    title: "产品官",
    seat: "CPO 席",
    level,
    capabilities,
    verdict: professionalVerdict({
      title: "产品官",
      level,
      headline: `ABC 已定位（A${abc.aCount}/B${abc.bCount}/C${abc.cCount}），TOP20% 贡献 ${abc.top20SharePct.toFixed(0)}%`,
      evidence: analyses[0]!.value,
    }),
    analyses,
    observations: analyses.map((a) => `${a.label}：${a.value}`),
    risks,
    counsel: [
      `保护 A 类稳定性：${abc.ranked
        .filter((r) => r.abc === "A")
        .slice(0, 3)
        .map((t) => t.name)
        .join("、")}`,
      cashCows.length
        ? "对高流水低毛利菜做配方/份量/搭售改造，避免越卖越亏"
        : abc.hasMargin
          ? "维持毛利矩阵月报"
          : "补单品成本后重跑四象限",
      abc.longTailCount > abc.ranked.length * 0.4
        ? "对 C 类长尾做退市/合并试验，释放出菜产能"
        : "观察新品是否稀释 A 类",
    ],
    confidence: professionalConfidence({
      days: uniqueDates(
        sales.map((s) => ({
          date: s.date,
          mealPeriod: s.mealPeriod,
          zone: s.zone,
          guests: 0,
          avgTicket: 0,
          revenue: s.amount,
        })),
      ),
      skuCount: abc.ranked.length,
      costCoverage: abc.hasMargin ? 0.7 : 0,
      evidenceCount: productNeg,
    }),
    refused: false,
    signals,
  };
}

/** 营销官 */
export function runMarketingOfficer(input: {
  facts?: DiagnosisFact[];
  evidence?: DiagnosisEvidenceItem[];
  signals?: Array<{ type: string; observation: string; meaning: string }>;
  category?: string;
}): ExpertCapabilityResult {
  const capabilities = [
    "客流趋势与餐段旺季",
    "定位叙事 vs 真实最旺餐段匹配",
    "内容声量 vs 到店客流交叉",
    "无客流序列时拒签强增长结论",
  ];
  const daily = parseJsonFact<DailyOpsRow[]>(input.facts, "daily_ops_json") || [];
  const days = uniqueDates(daily);
  const peak = factClaim(input.facts, "peakScene") || "";
  const guestsLabel = factClaim(input.facts, "mainGuests") || "";

  if (days < MIN_DAYS) {
    return {
      role: "marketing",
      title: "营销官",
      seat: "CMO 席",
      level: "critical",
      capabilities,
      verdict: professionalVerdict({
        title: "营销官",
        level: "critical",
        headline: "无合格来客序列，拒绝出具增长结论",
        evidence: `营业日 ${days} < ${MIN_DAYS}`,
      }),
      analyses: [],
      observations: ["缺日×餐段来客，无法验证增长是真到店还是虚声量"],
      risks: ["任何投放建议在客流闭环建立前都属于赌博"],
      counsel: ["先补日明细来客数，再谈增长动作"],
      confidence: professionalConfidence({ days, refused: true }),
      refused: true,
      refuseReason: `营业日 ${days} < ${MIN_DAYS}`,
      signals: [
        {
          id: "marketing_data_gap",
          severity: "critical",
          statement: "客流序列缺失",
        },
      ],
    };
  }

  const cat = resolveCategoryThresholds(input.category);
  const months = aggregateByMonth(daily);
  const meals = mealContributionIndex(daily);
  const topMeal = meals[0]?.mealPeriod || "";
  const peakShare = meals[0]?.revenueShare ?? 0;
  let guestChange = 0;
  if (months.length >= 2) {
    const a = months[0]!.guests || 1;
    const b = months[months.length - 1]!.guests;
    guestChange = pct(b - a, a);
  }
  const peakMismatch =
    (/晚|聚餐|夜/.test(peak) && !/晚|夜/.test(topMeal)) ||
    (/午|上班/.test(peak) && !/午/.test(topMeal));

  const growthEv =
    input.evidence?.filter((e) => claimMatchesTheme(e.claim, "growth", e.theme)).length || 0;
  const compEv =
    input.evidence?.filter((e) =>
      claimMatchesTheme(e.claim, "competition", e.theme),
    ).length || 0;

  let level: HealthLevel = trendLevel(
    guestChange,
    cat.guestDropWarn,
    cat.guestDropRisk,
  );
  if (peakMismatch) level = worse(level, "attention");
  if (compEv >= 2 && guestChange < 0) level = worse(level, "attention");
  if (growthEv >= 2 && guestChange <= cat.guestDropWarn) level = worse(level, "attention");
  if (peakShare >= cat.peakShareWarn) level = worse(level, "attention");

  const catEval = evaluateCategoryAlerts({
    category: input.category,
    peakSharePct: peakShare,
    guestChangePct: months.length >= 2 ? guestChange : undefined,
  });

  const analyses: ExpertAnalysisCell[] = [
    {
      label: "客流变化",
      value:
        months.length >= 2
          ? `${formatPct(guestChange)}（${months[0]!.month}→${months[months.length - 1]!.month}）`
          : "月份不足，仅有截面",
      note: `${cat.label}告警 ${cat.guestDropWarn}% / 风险 ${cat.guestDropRisk}%`,
      metricId: "guest_trend",
    },
    {
      label: "实际最旺餐段（按 MCI）",
      value: meals
        .slice(0, 3)
        .map((m) => `${m.mealPeriod} ${m.guests}人/份额${m.revenueShare.toFixed(0)}%`)
        .join(" · "),
      note:
        peakShare >= cat.peakShareWarn
          ? `${cat.label}高峰份额告警线 ${cat.peakShareWarn}%（已触达）`
          : `${cat.label}高峰份额告警线 ${cat.peakShareWarn}%`,
      metricId: "peak_actual",
    },
    {
      label: "定位匹配",
      value: `自报高峰「${peak || "未填"}」/ 客群「${guestsLabel || "未填"}」 vs 实际最旺「${topMeal}」`,
      note: peakMismatch ? "叙事高峰与真实客流高峰不一致" : "基本一致",
      metricId: "positioning_fit",
    },
    {
      label: "声量 vs 到店",
      value: `增长主题证据 ${growthEv} · 竞争主题 ${compEv} · 客流 ${formatPct(guestChange)}`,
      note:
        growthEv >= 2 && guestChange < -5
          ? "内容有声量但客流下行 → 虚火风险"
          : undefined,
      metricId: "buzz_vs_traffic",
    },
  ];

  const risks: string[] = [];
  const signals: ExpertCapabilityResult["signals"] = [];
  for (const alert of catEval.alerts) {
    risks.push(alert.statement);
    signals.push({
      id: alert.id,
      severity: alert.level,
      statement: alert.statement,
    });
  }
  if (guestChange <= cat.guestDropWarn) {
    risks.push(`客流 ${formatPct(guestChange)}，需分清竞争分流 vs 体验劝退`);
    signals.push({
      id: "traffic_down",
      severity: trendLevel(guestChange, cat.guestDropWarn, cat.guestDropRisk),
      statement: `客流 ${formatPct(guestChange)}`,
    });
  }
  if (peakMismatch) {
    risks.push("营销叙事与真实最旺餐段错配，投放可能打错场");
    signals.push({
      id: "positioning_mismatch",
      severity: "attention",
      statement: "定位错配",
    });
  }
  if (growthEv >= 2 && guestChange <= cat.guestDropWarn) {
    risks.push("虚火：内容热度未转化为到店客流");
  }
  if (!risks.length) risks.push("增长面红灯未亮；每次内容动作需绑定来客回看");

  return {
    role: "marketing",
    title: "营销官",
    seat: "CMO 席",
    level,
    capabilities,
    verdict: professionalVerdict({
      title: "营销官",
      level,
      headline: `客流 ${formatPct(guestChange)}，最旺餐段为「${topMeal}」`,
      evidence: analyses[0]!.value,
    }),
    analyses,
    observations: analyses.map((a) => `${a.label}：${a.value}`),
    risks,
    counsel: [
      peakMismatch
        ? "先改对外叙事与场次运营，使宣传高峰对齐真实最旺餐段"
        : `在「${topMeal}」做可追踪到店动作，再复制到弱餐段`,
      guestChange < 0
        ? "客流下行期暂停扩投放，先做老客唤醒与差评止血"
        : "用最旺餐段做样板场，测量内容→到店转化",
      "建立「内容曝光 → 到店来客」周闭环，关闭虚火",
    ],
    confidence: professionalConfidence({
      days,
      evidenceCount: growthEv + compEv,
      comparableMonths: months.length,
    }),
    refused: false,
    signals,
  };
}

/** 体验官 */
export function runExperienceOfficer(input: {
  facts?: DiagnosisFact[];
  evidence?: DiagnosisEvidenceItem[];
}): ExpertCapabilityResult {
  const capabilities = [
    "价格/服务/菜品/环境四象限量化",
    "等待负评密度 × 高峰餐段来客交叉",
    "上菜/翻台/人效档位联读",
    "老板感知与外部声音对照",
  ];
  const evidence = input.evidence || [];
  const daily = parseJsonFact<DailyOpsRow[]>(input.facts, "daily_ops_json") || [];
  const days = uniqueDates(daily);

  const bucket = (theme: string) => {
    const all = evidence.filter(
      (e) => claimMatchesTheme(e.claim, theme, e.theme) || e.theme === theme,
    );
    return {
      all,
      neg: all.filter((e) => e.sentiment === "negative"),
      pos: all.filter((e) => e.sentiment === "positive"),
    };
  };
  const price = bucket("price");
  const wait = bucket("wait");
  const product = bucket("product");
  const env = bucket("environment");

  const dinnerGuests = sum(
    daily.filter((r) => /晚|夜/.test(r.mealPeriod)).map((r) => r.guests),
  );
  const allGuests = sum(daily.map((r) => r.guests)) || 1;
  const dinnerShare = pct(dinnerGuests, allGuests);
  const waitDensity =
    wait.neg.length / Math.max(1, evidence.length || wait.neg.length);
  const waitHeavyOnDinner = wait.neg.length >= 2 && dinnerShare >= 45;

  const serve = factClaim(input.facts, "serve_speed_sense") || "";
  const turnover = factClaim(input.facts, "turnover_band") || "";
  const labor = factClaim(input.facts, "labor_efficiency") || "";
  const pain = factClaim(input.facts, "owner_pain") || "";
  const praise = factClaim(input.facts, "owner_praise") || "";

  if (!evidence.length && !pain && !serve && days < MIN_DAYS) {
    return {
      role: "experience",
      title: "体验官",
      seat: "CXO 席",
      level: "critical",
      capabilities,
      verdict: professionalVerdict({
        title: "体验官",
        level: "critical",
        headline: "外部评价与运营体感双缺，无法做体验强结论",
        evidence: "无点评样本且无上菜/痛点输入",
      }),
      analyses: [],
      observations: ["体验证据不足"],
      risks: ["体验盲区会误导财务与营销归因"],
      counsel: ["积累点评/内容样本，并补上菜与翻台档位"],
      confidence: professionalConfidence({ days, evidenceCount: 0, refused: true }),
      refused: true,
      refuseReason: "体验证据与运营体感均不足",
      signals: [
        {
          id: "experience_data_gap",
          severity: "critical",
          statement: "体验数据缺口",
        },
      ],
    };
  }

  let level: HealthLevel = "observe";
  if (wait.neg.length >= 3 || price.neg.length >= 2) level = "attention";
  if (wait.neg.length >= 4 || waitDensity >= 0.35) level = "risk";
  if (waitHeavyOnDinner) level = worse(level, "attention");
  if (/slow|慢/.test(serve)) level = worse(level, "attention");

  const analyses: ExpertAnalysisCell[] = [
    {
      label: "价格体验",
      value: `正 ${price.pos.length} / 负 ${price.neg.length} / 样本 ${price.all.length}`,
      metricId: "exp_price",
    },
    {
      label: "服务等待",
      value: `等待负评 ${wait.neg.length} · 负评密度 ${(waitDensity * 100).toFixed(0)}%`,
      metricId: "exp_wait",
    },
    {
      label: "菜品/环境",
      value: `菜品 正${product.pos.length}/负${product.neg.length} · 环境 正${env.pos.length}/负${env.neg.length}`,
      metricId: "exp_product_env",
    },
    {
      label: "高峰×等待交叉",
      value: `晚/夜来客占比 ${dinnerShare.toFixed(0)}% × 等待负评 ${wait.neg.length}`,
      note: waitHeavyOnDinner
        ? "高峰客流高且等待负评集中 → 最赚钱场次正在受伤"
        : "交叉压力不显著",
      metricId: "wait_peak_cross",
    },
    {
      label: "运营档位",
      value: `上菜 ${serve || "—"} · 翻台 ${turnover || "—"} · 人效 ${labor || "—"}`,
      metricId: "ops_bands",
    },
  ];
  if (pain) analyses.push({ label: "老板痛点", value: pain, metricId: "owner_pain" });
  if (praise) analyses.push({ label: "老板亮点", value: praise, metricId: "owner_praise" });

  const risks: string[] = [];
  const signals: ExpertCapabilityResult["signals"] = [];
  if (waitHeavyOnDinner) {
    risks.push("高峰等待损伤主力场次体验与潜在复购");
    signals.push({
      id: "peak_wait_injury",
      severity: "attention",
      statement: "高峰等待伤客",
    });
  }
  if (price.neg.length >= 2) {
    risks.push("价格不值感上升，需对照真实人均与菜结构");
    signals.push({
      id: "price_value_gap",
      severity: "attention",
      statement: "价格感知恶化",
    });
  }
  if (/slow|慢/.test(serve) || wait.neg.length >= 2) {
    risks.push("上菜/等待问题可能传导至翻台与差评扩散");
  }
  if (!risks.length) risks.push("体验红灯未亮；继续扩样并周复盘上菜与翻台");

  return {
    role: "experience",
    title: "体验官",
    seat: "CXO 席",
    level,
    capabilities,
    verdict: professionalVerdict({
      title: "体验官",
      level,
      headline: waitHeavyOnDinner
        ? "高峰等待已成为可证实的体验断裂点"
        : `四象限可诊断，等待负评 ${wait.neg.length} 条`,
      evidence: analyses.find((a) => a.metricId === "wait_peak_cross")?.value || "体验样本",
    }),
    analyses,
    observations: analyses.map((a) => `${a.label}：${a.value}`),
    risks,
    counsel: [
      waitHeavyOnDinner
        ? "先治晚高峰出菜与等位告知，再谈拉新投放"
        : "维持高峰巡场，防止等待从个案变成结构",
      price.neg.length
        ? "价格抱怨对照人均与 A 类菜，决定调结构还是调预期"
        : "用正向场景词巩固体验记忆点",
      "上菜速度与翻台档位纳入周会，形成体验-运营闭环",
    ],
    confidence: professionalConfidence({
      days: Math.max(days, evidence.length ? 7 : 0),
      evidenceCount: evidence.length,
    }),
    refused: false,
    signals,
  };
}
