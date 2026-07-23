import type {
  DiagnosisEvidenceItem,
  DiagnosisFact,
  DiagnosisGap,
  ExamAxisResult,
  ExamMetric,
  HealthLevel,
  RestaurantExamReport,
} from "../contracts";
import { claimMatchesTheme } from "../reasoning/patterns";
import {
  aggregateByMonth,
  computeDishAbc,
  computePnL,
  decomposeRevenueChange,
  driverLabel,
  formatMoney,
  formatPct,
  mealContributionIndex,
  type DailyOpsRow,
  type DishSalesRow,
  uniqueDates,
  zoneContribution,
} from "./diagnosis-math";

function parseJsonFact<T>(facts: DiagnosisFact[] | undefined, kind: string): T | null {
  const raw = facts?.find((f) => f.kind === kind)?.claim;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function factBand(facts: DiagnosisFact[] | undefined, kind: string): string | undefined {
  const claim = facts?.find((item) => item.kind === kind)?.claim;
  if (!claim) return undefined;
  // claim 形如「营收趋势：down」或裸值 down
  const parts = claim.split("：");
  return (parts[1] || parts[0] || "").trim() || undefined;
}

function trendBand(pctChange: number): "up" | "flat" | "down" {
  if (pctChange > 3) return "up";
  if (pctChange < -3) return "down";
  return "flat";
}

function profitBand(marginPct: number | undefined): "comfortable" | "tight" | "loss" | undefined {
  if (marginPct === undefined || Number.isNaN(marginPct)) return undefined;
  if (marginPct < 0) return "loss";
  if (marginPct < 8) return "tight";
  return "comfortable";
}

function pressureBand(ratioPct: number | undefined): "low" | "medium" | "high" | undefined {
  if (ratioPct === undefined || Number.isNaN(ratioPct)) return undefined;
  if (ratioPct >= 40) return "high";
  if (ratioPct >= 28) return "medium";
  return "low";
}

function bandLevel(
  band: string | undefined,
  map: Record<string, HealthLevel>,
  fallback: HealthLevel = "observe",
): HealthLevel {
  if (!band) return fallback;
  return map[band] || fallback;
}

function worstLevel(levels: HealthLevel[]): HealthLevel {
  const rank: Record<HealthLevel, number> = {
    healthy: 0,
    observe: 1,
    attention: 2,
    risk: 3,
    critical: 4,
  };
  return levels.reduce((worst, item) => (rank[item] > rank[worst] ? item : worst), "healthy");
}

function metric(
  partial: Omit<ExamMetric, "confidence"> & { confidence?: number },
): ExamMetric {
  return {
    ...partial,
    confidence: partial.confidence ?? (partial.source === "missing" ? 0 : 0.55),
  };
}

function themeBucket(
  evidence: DiagnosisEvidenceItem[],
  theme: string,
): { all: DiagnosisEvidenceItem[]; neg: DiagnosisEvidenceItem[]; pos: DiagnosisEvidenceItem[] } {
  const all = evidence.filter(
    (item) => claimMatchesTheme(item.claim, theme, item.theme) || item.theme === theme,
  );
  return {
    all,
    neg: all.filter((item) => item.sentiment === "negative"),
    pos: all.filter((item) => item.sentiment === "positive"),
  };
}

function experienceLevel(neg: number, pos: number, total: number): HealthLevel {
  if (total === 0) return "observe";
  if (neg >= 3 || (neg >= 2 && neg > pos)) return "risk";
  if (neg >= 1) return "attention";
  if (pos >= 2 && neg === 0) return "healthy";
  return "observe";
}

function buildBusinessAxis(facts: DiagnosisFact[] | undefined): ExamAxisResult {
  const gaps: DiagnosisGap[] = [];
  const metrics: ExamMetric[] = [];
  const levels: HealthLevel[] = [];

  const ledgerMonths = Number(facts?.find((f) => f.kind === "ledger_months")?.claim || 0);
  const ledgerDays = Number(facts?.find((f) => f.kind === "ledger_days")?.claim || 0);
  const ledgerSummary =
    facts?.find((f) => f.kind === "daily_ops_summary")?.claim ||
    facts?.find((f) => f.kind === "ledger_summary")?.claim;
  const dishSalesRows = Number(facts?.find((f) => f.kind === "dish_sales_rows")?.claim || 0);
  const dishSalesSummary = facts?.find((f) => f.kind === "dish_sales_summary")?.claim;
  const menuCount = Number(facts?.find((f) => f.kind === "menu_count")?.claim || 0);
  const zoneMix = facts?.find((f) => f.kind === "zone_revenue_mix")?.claim;
  const mealMix = facts?.find((f) => f.kind === "meal_period_mix")?.claim;

  if (!ledgerDays || ledgerDays < 7) {
    gaps.push({
      field: "daily_ops",
      reason:
        "缺少日×餐段明细（日期/餐段/来客数/人均或营收）。仅有月汇总时经营分析没有价值",
      severity: "high",
    });
    metrics.push(
      metric({
        id: "ledger",
        label: "日×餐段账本",
        reading: "未导入合格日明细",
        source: "missing",
        confidence: 0,
      }),
    );
    return {
      axis: "business",
      title: "经营体检",
      level: "critical",
      summary:
        "没有每日×餐段的来客、人均、营收（及区域）明细，经营分析没有价值",
      confidence: 0.05,
      metrics,
      gaps,
    };
  }

  metrics.push(
    metric({
      id: "ledger",
      label: "日×餐段账本",
      reading: ledgerSummary || `已导入 ${ledgerDays} 个营业日明细`,
      band: String(ledgerDays),
      source: "owner_reported",
      confidence: 0.93,
    }),
  );

  if (mealMix) {
    metrics.push(
      metric({
        id: "meal_periods",
        label: "餐段覆盖",
        reading: mealMix,
        source: "owner_reported",
        confidence: 0.9,
      }),
    );
  }
  if (zoneMix) {
    metrics.push(
      metric({
        id: "zone_mix",
        label: "区域贡献",
        reading: zoneMix,
        source: "owner_reported",
        confidence: 0.86,
      }),
    );
  }

  if (dishSalesRows > 0) {
    metrics.push(
      metric({
        id: "dish_sales",
        label: "菜品销售结构",
        reading: dishSalesSummary || `已导入 ${dishSalesRows} 行销售`,
        band: String(dishSalesRows),
        source: "owner_reported",
        confidence: 0.9,
      }),
    );
  } else {
    gaps.push({
      field: "dish_sales",
      reason: "缺少菜品销售结构，无法判断贡献率与菜饮占比",
      severity: "high",
    });
  }

  if (menuCount > 0) {
    metrics.push(
      metric({
        id: "menu",
        label: "菜单主数据",
        reading: `已导入 ${menuCount} 个品项`,
        band: String(menuCount),
        source: "owner_reported",
        confidence: 0.85,
      }),
    );
  } else {
    gaps.push({
      field: "menu",
      reason: "缺少菜单主数据",
      severity: "medium",
    });
  }

  if (ledgerMonths > 0) {
    metrics.push(
      metric({
        id: "monthly_rollups",
        label: "月度汇总",
        reading: `覆盖 ${ledgerMonths} 个月`,
        band: String(ledgerMonths),
        source: "owner_reported",
        confidence: 0.88,
      }),
    );
  }

  const daily = parseJsonFact<DailyOpsRow[]>(facts, "daily_ops_json") || [];
  const dishes = parseJsonFact<DishSalesRow[]>(facts, "dish_sales_json") || [];
  const months = daily.length ? aggregateByMonth(daily) : [];
  const pnl = daily.length ? computePnL(daily) : null;
  const meals = daily.length ? mealContributionIndex(daily) : [];
  const zones = daily.length ? zoneContribution(daily) : [];
  const abc = dishes.length >= 8 ? computeDishAbc(dishes) : null;

  const seatsClaim = facts?.find((f) => f.kind === "seats")?.claim;
  const seatsCount = seatsClaim ? Number(seatsClaim.replace(/[^\d.]/g, "")) : 0;
  let derivedSeatUtilBand: string | undefined;
  if (seatsCount > 0 && daily.length) {
    const days = uniqueDates(daily);
    const avgGuestsPerDay = sumGuests(daily) / Math.max(1, days);
    // 粗估：假设每餐位日均可承接 ~2 轮客流为满载基准
    const capacityPerDay = seatsCount * 2;
    const utilRatio = avgGuestsPerDay / Math.max(1, capacityPerDay);
    derivedSeatUtilBand = utilRatio >= 0.75 ? "high" : utilRatio <= 0.4 ? "low" : "medium";
  }

  let derivedRevBand: string | undefined;
  let derivedTrafficBand: string | undefined;
  let decompReading: string | undefined;
  if (months.length >= 2) {
    const prev = months[months.length - 2];
    const curr = months[months.length - 1];
    const decomp = decomposeRevenueChange({
      revenue0: prev.revenue,
      guests0: prev.guests,
      ticket0: prev.avgTicket,
      revenue1: curr.revenue,
      guests1: curr.guests,
      ticket1: curr.avgTicket,
    });
    derivedRevBand = trendBand(decomp.dRevPct);
    derivedTrafficBand = trendBand(
      prev.guests <= 0 ? 0 : ((curr.guests - prev.guests) / prev.guests) * 100,
    );
    decompReading = `${prev.month}→${curr.month} 营收 ${formatPct(decomp.dRevPct)}，驱动：${driverLabel(decomp.driver)}（客单效应 ${formatMoney(decomp.ticketEffect)} / 客流效应 ${formatMoney(decomp.guestEffect)}）`;
    metrics.push(
      metric({
        id: "rev_decomposition",
        label: "营收变动分解",
        reading: decompReading,
        band: decomp.driver,
        source: "derived",
        confidence: 0.9,
      }),
    );
    levels.push(
      bandLevel(derivedRevBand, { up: "healthy", flat: "observe", down: "attention" }),
    );
  }

  if (meals[0]) {
    const top = meals[0];
    const mciLevel: HealthLevel =
      top.revenueShare >= 55 ? "attention" : top.revenueShare >= 40 ? "observe" : "healthy";
    levels.push(mciLevel);
    metrics.push(
      metric({
        id: "meal_mci",
        label: "餐段贡献指数",
        reading: `最强场次「${top.mealPeriod}」份额 ${top.revenueShare.toFixed(1)}%，MCI ${top.mci.toFixed(2)}`,
        band: top.mealPeriod,
        source: "derived",
        confidence: 0.88,
      }),
    );
  }

  if (zones[0] && zones[0].zone !== "未分区") {
    metrics.push(
      metric({
        id: "zone_top",
        label: "区域贡献首位",
        reading: `${zones[0].zone} 占营收 ${zones[0].revenueShare.toFixed(1)}%，人均 ${formatMoney(zones[0].avgTicket)}`,
        band: zones[0].zone,
        source: "derived",
        confidence: 0.84,
      }),
    );
  }

  if (abc) {
    const aAmount = abc.ranked.filter((r) => r.abc === "A").reduce((s, r) => s + r.amount, 0);
    const totalAmount = abc.ranked.reduce((s, r) => s + r.amount, 0) || 1;
    const aShare = (aAmount / totalAmount) * 100;
    const lowMarginHeroes = abc.ranked.filter(
      (r) => r.abc === "A" && r.quadrant === "cash_cow",
    );
    const contribBand = aShare >= 70 ? "high" : aShare >= 45 ? "medium" : "low";
    const contribLevel = bandLevel(contribBand, {
      high: "healthy",
      medium: "observe",
      low: "attention",
    });
    levels.push(contribLevel);
    if (lowMarginHeroes.length) levels.push("attention");
    metrics.push(
      metric({
        id: "dish_abc",
        label: "菜品 ABC / 毛利象限",
        reading: `A 类份额 ${aShare.toFixed(1)}%；高流水低毛利 ${lowMarginHeroes.length} 个`,
        band: contribBand,
        source: "derived",
        confidence: 0.9,
      }),
    );
  }

  if (pnl) {
    metrics.push(
      metric({
        id: "avg_ticket_derived",
        label: "客单价（账本）",
        reading: `样本人均 ${formatMoney(pnl.revenue / Math.max(1, sumGuests(daily)))} · 毛利率 ${pnl.hasCost ? formatPct(pnl.marginPct) : "成本未齐"}`,
        band: String(Math.round(pnl.revenue / Math.max(1, sumGuests(daily)))),
        source: "derived",
        confidence: pnl.hasCost ? 0.9 : 0.75,
      }),
    );
  }

  const derivedProfit = pnl?.hasCost ? profitBand(pnl.marginPct) : undefined;
  const derivedCost = pnl?.hasCost ? pressureBand(pnl.costRatioPct) : undefined;
  const derivedExpense = pnl?.hasExpense ? pressureBand(pnl.expenseRatioPct) : undefined;

  const specs: Array<{
    id: string;
    kind: string;
    label: string;
    map: Record<string, HealthLevel>;
    reading: (band: string) => string;
    required?: boolean;
    derived?: string;
  }> = [
    {
      id: "revenue_trend",
      kind: "revenue_trend",
      label: "营收趋势",
      map: { up: "healthy", flat: "observe", down: "attention" },
      reading: (b) => (b === "up" ? "营收偏上行" : b === "down" ? "营收偏下行" : "营收大致持平"),
      required: true,
      derived: derivedRevBand,
    },
    {
      id: "profit_pressure",
      kind: "profit_pressure",
      label: "利润压力",
      map: { comfortable: "healthy", tight: "attention", loss: "risk" },
      reading: (b) =>
        b === "comfortable" ? "利润尚可" : b === "loss" ? "利润承压偏亏" : "利润偏紧",
      required: true,
      derived: derivedProfit,
    },
    {
      id: "cost_pressure",
      kind: "cost_pressure",
      label: "成本压力",
      map: { low: "healthy", medium: "observe", high: "attention" },
      reading: (b) => (b === "high" ? "成本压力偏高" : b === "low" ? "成本压力可控" : "成本压力中等"),
      required: true,
      derived: derivedCost,
    },
    {
      id: "expense_pressure",
      kind: "expense_pressure",
      label: "费用压力",
      map: { low: "healthy", medium: "observe", high: "attention" },
      reading: (b) => (b === "high" ? "费用开支偏重" : b === "low" ? "费用相对可控" : "费用压力中等"),
      required: true,
      derived: derivedExpense,
    },
    {
      id: "traffic_trend",
      kind: "traffic_trend",
      label: "客流增长",
      map: { up: "healthy", flat: "observe", down: "attention" },
      reading: (b) => (b === "up" ? "客流偏增长" : b === "down" ? "客流偏下滑" : "客流大致持平"),
      derived: derivedTrafficBand,
    },
    {
      id: "seat_utilization",
      kind: "seat_utilization",
      label: "餐位利用率",
      map: { high: "healthy", medium: "observe", low: "attention" },
      reading: (b) =>
        b === "high" ? "餐位利用率偏高" : b === "low" ? "餐位利用率偏低" : "餐位利用率中等",
      derived: derivedSeatUtilBand,
    },
    {
      id: "dish_drink_mix",
      kind: "dish_drink_mix",
      label: "菜品/饮品贡献",
      map: { food_heavy: "observe", balanced: "healthy", drink_heavy: "observe" },
      reading: (b) =>
        b === "food_heavy"
          ? "贡献更偏菜品"
          : b === "drink_heavy"
            ? "贡献更偏饮品"
            : "菜饮贡献相对均衡",
      derived: abc
        ? abc.drinkSharePct >= 60
          ? "drink_heavy"
          : abc.drinkSharePct <= 20
            ? "food_heavy"
            : "balanced"
        : undefined,
    },
    {
      id: "contribution_sense",
      kind: "contribution_sense",
      label: "结构贡献感",
      map: { high: "healthy", medium: "observe", low: "attention" },
      reading: (b) =>
        b === "high" ? "主力品贡献清晰" : b === "low" ? "贡献结构偏散" : "贡献结构一般",
      derived: abc
        ? (() => {
            const aAmount = abc.ranked
              .filter((r) => r.abc === "A")
              .reduce((s, r) => s + r.amount, 0);
            const totalAmount = abc.ranked.reduce((s, r) => s + r.amount, 0) || 1;
            const aShare = (aAmount / totalAmount) * 100;
            return aShare >= 70 ? "high" : aShare >= 45 ? "medium" : "low";
          })()
        : undefined,
    },
  ];

  for (const spec of specs) {
    const band = factBand(facts, spec.kind) || spec.derived;
    if (!band) {
      metrics.push(
        metric({
          id: spec.id,
          label: spec.label,
          reading: "缺少对应指标",
          source: "missing",
          confidence: 0,
        }),
      );
      if (spec.required && !spec.derived) {
        gaps.push({
          field: spec.kind,
          reason: `账本已导入但仍缺「${spec.label}」推算结果（可补成本/费用列或月度对照）`,
          severity: "medium",
        });
      }
      continue;
    }
    const level = bandLevel(band, spec.map);
    levels.push(level);
    const fromDerived = !factBand(facts, spec.kind) && Boolean(spec.derived);
    metrics.push(
      metric({
        id: spec.id,
        label: spec.label,
        reading: fromDerived
          ? `${spec.reading(band)}（由日明细派生）`
          : spec.reading(band),
        band,
        source: fromDerived ? "derived" : "owner_reported",
        confidence: fromDerived ? 0.86 : 0.88,
      }),
    );
  }

  const price = facts?.find((item) => item.kind === "priceRange")?.claim;
  if (price && !metrics.some((m) => m.id === "avg_ticket_derived")) {
    metrics.push(
      metric({
        id: "avg_ticket",
        label: "客单价",
        reading: price.includes("人均") ? price : `人均约 ${price}`,
        band: price,
        source: "owner_reported",
        confidence: 0.8,
      }),
    );
  }

  const level = levels.length ? worstLevel(levels) : "observe";
  const dayCount = daily.length ? uniqueDates(daily) : ledgerDays;
  return {
    axis: "business",
    title: "经营体检",
    level,
    summary:
      decompReading ||
      (level === "risk" || level === "attention" || level === "critical"
        ? `基于 ${dayCount} 个营业日×餐段明细：经营侧已出现承压信号`
        : `基于 ${dayCount} 个营业日×餐段 + 菜品销售结构的经营骨架已建立`),
    confidence: Math.min(0.95, 0.55 + Math.min(dayCount, 60) * 0.005 + (daily.length ? 0.08 : 0)),
    metrics,
    gaps,
  };
}

function sumGuests(rows: DailyOpsRow[]) {
  return rows.reduce((s, r) => s + (r.guests || 0), 0);
}

function buildExperienceAxis(evidence: DiagnosisEvidenceItem[]): ExamAxisResult {
  const gaps: DiagnosisGap[] = [];
  const metrics: ExamMetric[] = [];
  const levels: HealthLevel[] = [];

  const specs: Array<{ theme: string; id: string; label: string }> = [
    { theme: "price", id: "price", label: "价格体验" },
    { theme: "service", id: "service", label: "服务体验" },
    { theme: "product", id: "product", label: "菜品体验" },
    { theme: "environment", id: "environment", label: "环境体验" },
  ];

  for (const spec of specs) {
    const theme = spec.theme === "service" ? "wait" : spec.theme;
    const bucket =
      spec.theme === "service"
        ? (() => {
            const wait = themeBucket(evidence, "wait");
            const svc = evidence.filter((item) => item.theme === "service");
            const all = [...wait.all, ...svc];
            return {
              all,
              neg: all.filter((item) => item.sentiment === "negative"),
              pos: all.filter((item) => item.sentiment === "positive"),
            };
          })()
        : themeBucket(evidence, theme);

    if (!bucket.all.length) {
      metrics.push(
        metric({
          id: spec.id,
          label: spec.label,
          reading: "外部声音样本不足",
          source: "missing",
          confidence: 0.1,
        }),
      );
      gaps.push({
        field: `experience_${spec.id}`,
        reason: `缺少「${spec.label}」相关评价，体验轴不完整`,
        severity: spec.id === "product" || spec.id === "service" ? "high" : "medium",
      });
      continue;
    }

    const level = experienceLevel(bucket.neg.length, bucket.pos.length, bucket.all.length);
    levels.push(level);
    metrics.push(
      metric({
        id: spec.id,
        label: spec.label,
        reading:
          bucket.neg.length > bucket.pos.length
            ? `${spec.label}负反馈偏多（${bucket.neg.length}/${bucket.all.length}）`
            : bucket.pos.length > bucket.neg.length
              ? `${spec.label}正向声音更强`
              : `${spec.label}褒贬交织`,
        band: level,
        source: "external_evidence",
        confidence: Math.min(0.88, 0.4 + bucket.all.length * 0.1),
        evidenceIds: bucket.all.slice(0, 4).map((item, i) => item.id || `${spec.id}-${i}`),
      }),
    );
  }

  const level = levels.length ? worstLevel(levels) : "observe";
  return {
    axis: "experience",
    title: "消费体验体检",
    level,
    summary:
      levels.length === 0
        ? "缺少评论样本，无法建立价格/服务/菜品/环境体验"
        : level === "risk" || level === "attention"
          ? "体验侧已出现可感知断裂，优先看服务与菜品"
          : "体验四象限暂未出现强风险，可继续扩样",
    confidence: levels.length ? Math.min(0.86, 0.4 + levels.length * 0.1) : 0.2,
    metrics,
    gaps,
  };
}

function buildOperationsAxis(
  facts: DiagnosisFact[] | undefined,
  evidence: DiagnosisEvidenceItem[],
): ExamAxisResult {
  const gaps: DiagnosisGap[] = [];
  const metrics: ExamMetric[] = [];
  const levels: HealthLevel[] = [];

  const daily = parseJsonFact<DailyOpsRow[]>(facts, "daily_ops_json") || [];
  if (daily.length) {
    const meals = mealContributionIndex(daily);
    const topMeal = meals[0];
    if (topMeal) {
      const concentrationLevel: HealthLevel =
        topMeal.revenueShare >= 65 ? "attention" : topMeal.revenueShare >= 50 ? "observe" : "healthy";
      levels.push(concentrationLevel);
      metrics.push(
        metric({
          id: "peak_concentration",
          label: "高峰集中度（MCI）",
          reading: `最强场次「${topMeal.mealPeriod}」份额 ${topMeal.revenueShare.toFixed(1)}%，MCI ${topMeal.mci.toFixed(2)}${
            topMeal.revenueShare >= 65 ? "，运营承接压力集中于该场次" : ""
          }`,
          band: topMeal.mealPeriod,
          source: "derived",
          confidence: 0.85,
        }),
      );
    }
  }

  const specs: Array<{
    id: string;
    kind: string;
    label: string;
    map: Record<string, HealthLevel>;
    reading: (band: string) => string;
    required?: boolean;
  }> = [
    {
      id: "turnover",
      kind: "turnover_band",
      label: "翻台率",
      map: { high: "healthy", ok: "observe", low: "attention" },
      reading: (b) => (b === "high" ? "翻台偏快" : b === "low" ? "翻台偏慢" : "翻台中等"),
      required: true,
    },
    {
      id: "labor_efficiency",
      kind: "labor_efficiency",
      label: "人效",
      map: { high: "healthy", ok: "observe", low: "attention" },
      reading: (b) => (b === "high" ? "人效偏强" : b === "low" ? "人效偏弱" : "人效一般"),
      required: true,
    },
    {
      id: "table_efficiency",
      kind: "table_efficiency",
      label: "桌效",
      map: { high: "healthy", ok: "observe", low: "attention" },
      reading: (b) => (b === "high" ? "桌效偏强" : b === "low" ? "桌效偏弱" : "桌效一般"),
    },
    {
      id: "space_efficiency",
      kind: "space_efficiency",
      label: "平效",
      map: { high: "healthy", ok: "observe", low: "attention" },
      reading: (b) => (b === "high" ? "平效偏强" : b === "low" ? "平效偏弱" : "平效一般"),
    },
    {
      id: "staff_churn",
      kind: "staff_churn",
      label: "员工流失率",
      map: { low: "healthy", medium: "observe", high: "attention" },
      reading: (b) =>
        b === "high" ? "人员流失偏高" : b === "low" ? "人员相对稳定" : "人员流失中等",
    },
  ];

  for (const spec of specs) {
    const band = factBand(facts, spec.kind);
    if (!band) {
      metrics.push(
        metric({
          id: spec.id,
          label: spec.label,
          reading: "缺少运营自报档位",
          source: "missing",
          confidence: 0,
        }),
      );
      gaps.push({
        field: spec.kind,
        reason: `缺少「${spec.label}」；评论无法直接算出该 KPI`,
        severity: spec.required ? "high" : "medium",
      });
      continue;
    }
    const level = bandLevel(band, spec.map);
    levels.push(level);
    metrics.push(
      metric({
        id: spec.id,
        label: spec.label,
        reading: spec.reading(band),
        band,
        source: "owner_reported",
        confidence: 0.7,
      }),
    );
  }

  const wait = themeBucket(evidence, "wait");
  const serveBand = factBand(facts, "serve_speed_sense");
  if (serveBand || wait.all.length) {
    const proxyLevel: HealthLevel = serveBand
      ? bandLevel(serveBand, { fast: "healthy", ok: "observe", slow: "attention" })
      : wait.neg.length >= 3
        ? "risk"
        : wait.neg.length >= 1 || wait.all.length >= 2
          ? "attention"
          : "observe";
    levels.push(proxyLevel);
    metrics.push(
      metric({
        id: "serve_speed",
        label: "上菜速度",
        reading: serveBand
          ? serveBand === "slow"
            ? "老板自报上菜偏慢"
            : serveBand === "fast"
              ? "老板自报上菜偏快"
              : "老板自报上菜正常"
          : wait.all.length
            ? `评论侧等待/上菜提及 ${wait.all.length} 次（代理信号）`
            : "上菜速度暂无信号",
        band: serveBand || proxyLevel,
        source: serveBand ? "owner_reported" : wait.all.length ? "proxy" : "missing",
        confidence: serveBand ? 0.68 : wait.all.length ? 0.55 : 0.1,
        evidenceIds: wait.all.slice(0, 4).map((item, i) => item.id || `serve-${i}`),
      }),
    );
  } else {
    gaps.push({
      field: "serve_speed_sense",
      reason: "缺少上菜速度自报，且评论无等待证据",
      severity: "medium",
    });
  }

  const level = levels.length ? worstLevel(levels) : "observe";
  const filled = metrics.filter((item) => item.source !== "missing").length;
  return {
    axis: "operations",
    title: "运营体检",
    level,
    summary:
      filled === 0
        ? "运营 KPI 几乎空白；仅靠点评只能看到等待代理，看不到人效/桌效/平效"
        : level === "risk" || level === "attention"
          ? "运营效率侧已有承压项，建议与高峰场景交叉核对"
          : "运营自报整体尚可，精确人效/平效仍需店内数据校准",
    confidence: filled === 0 ? 0.18 : Math.min(0.8, 0.35 + filled * 0.07),
    metrics,
    gaps,
  };
}

/** 构建三轴体检报告：经营靠自报 KPI，体验靠评论，运营靠自报+等待代理 */
export function buildRestaurantExamReport(input: {
  facts?: DiagnosisFact[];
  evidence?: DiagnosisEvidenceItem[];
  asOf?: string;
}): RestaurantExamReport {
  const evidence = input.evidence || [];
  const business = buildBusinessAxis(input.facts);
  const experience = buildExperienceAxis(evidence);
  const operations = buildOperationsAxis(input.facts, evidence);
  const axes = [business, experience, operations];
  const weak = axes.filter(
    (axis) => axis.level === "risk" || axis.level === "attention" || axis.confidence < 0.35,
  );

  return {
    asOf: input.asOf || new Date().toISOString(),
    summary:
      weak.length === 0
        ? "三轴体检已建立初稿：经营自报 + 体验评论 + 运营效率"
        : `优先关注：${weak.map((item) => item.title).join("、")}`,
    axes,
  };
}

export function examGaps(report: RestaurantExamReport): DiagnosisGap[] {
  return report.axes.flatMap((axis) =>
    axis.gaps.map((gap) => ({
      ...gap,
      field: `${axis.axis}.${gap.field}`,
    })),
  );
}
