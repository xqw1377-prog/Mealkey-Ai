import {
  headerIndexMap,
  normalizeDate,
  normalizeMealPeriod,
  normalizeMonth,
  sheetToMatrix,
  toNumber,
} from "./parse-sheet";
import type {
  DailyOpsImportResult,
  DailyOpsRow,
  DishSalesImportResult,
  DishSalesRow,
  FinanceImportResult,
  MonthlyLedgerRow,
} from "./types";

/** 至少覆盖 3 个自然月 */
export const MIN_LEDGER_MONTHS = 3;
/** 日明细至少多少个营业日（可与月跨度并用） */
export const MIN_DAILY_DAYS = 21;
/** 菜品销售结构至少多少行 */
export const MIN_DISH_SALES_ROWS = 8;

export function parseFinanceMatrix(
  matrix: string[][],
  fileName: string,
): FinanceImportResult {
  if (matrix.length < 2) {
    throw new Error("月度账本至少需要表头 + 一行数据");
  }
  const header = matrix[0] || [];
  const idx = headerIndexMap(header);
  const required = ["month", "revenue", "cost", "expense", "profit"] as const;
  for (const key of required) {
    if (idx[key] === undefined) {
      throw new Error(
        `缺少列「${labelOf(key)}」。月度表头需含：月份、营收、成本、费用、利润`,
      );
    }
  }

  const warnings: string[] = [];
  const rows: MonthlyLedgerRow[] = [];
  for (let i = 1; i < matrix.length; i++) {
    const line = matrix[i] || [];
    if (line.every((cell) => !String(cell || "").trim())) continue;
    const month = normalizeMonth(String(line[idx.month!] ?? ""));
    const revenue = toNumber(line[idx.revenue!]);
    const cost = toNumber(line[idx.cost!]);
    const expense = toNumber(line[idx.expense!]);
    let profit = toNumber(line[idx.profit!]);
    if (!month) {
      warnings.push(`第 ${i + 1} 行月份无法识别，已跳过`);
      continue;
    }
    if (revenue === null || cost === null || expense === null) {
      warnings.push(`第 ${i + 1} 行营收/成本/费用不完整，已跳过`);
      continue;
    }
    if (profit === null) {
      profit = revenue - cost - expense;
      warnings.push(`${month} 未填利润，已按 营收-成本-费用 推算`);
    }
    rows.push({ month, revenue, cost, expense, profit });
  }

  const unique = dedupeMonthly(rows);
  if (unique.length < MIN_LEDGER_MONTHS) {
    throw new Error(
      `已识别 ${unique.length} 个月，仍建议至少 ${MIN_LEDGER_MONTHS} 个月；经营主分析请导入日×餐段明细`,
    );
  }
  return { rows: unique, fileName, warnings };
}

export async function importFinanceFile(file: File): Promise<FinanceImportResult> {
  const { matrix, fileName } = await sheetToMatrix(file);
  return parseFinanceMatrix(matrix, fileName);
}

export function parseDailyOpsMatrix(
  matrix: string[][],
  fileName: string,
): DailyOpsImportResult {
  if (matrix.length < 2) throw new Error("日明细至少需要表头 + 一行数据");
  const header = matrix[0] || [];
  const idx = headerIndexMap(header);
  if (idx.date === undefined) {
    throw new Error("日明细必须有「日期」列");
  }
  if (idx.meal_period === undefined) {
    throw new Error("日明细必须有「餐段」列（午市/晚市/夜宵等）");
  }
  if (idx.guests === undefined) {
    throw new Error("日明细必须有「来客数」列");
  }
  if (idx.revenue === undefined && idx.avg_ticket === undefined) {
    throw new Error("日明细至少要有「营收」或「人均消费」");
  }

  const warnings: string[] = [];
  const rows: DailyOpsRow[] = [];
  for (let i = 1; i < matrix.length; i++) {
    const line = matrix[i] || [];
    if (line.every((cell) => !String(cell || "").trim())) continue;
    const date = normalizeDate(String(line[idx.date!] ?? ""));
    const mealPeriod = normalizeMealPeriod(String(line[idx.meal_period!] ?? ""));
    const zone =
      idx.zone !== undefined
        ? String(line[idx.zone] ?? "").trim() || "未分区"
        : "未分区";
    const guests = toNumber(line[idx.guests!]);
    let revenue = idx.revenue !== undefined ? toNumber(line[idx.revenue]) : null;
    let avgTicket =
      idx.avg_ticket !== undefined ? toNumber(line[idx.avg_ticket]) : null;

    if (!date) {
      warnings.push(`第 ${i + 1} 行日期无法识别，已跳过`);
      continue;
    }
    if (guests === null || guests < 0) {
      warnings.push(`第 ${i + 1} 行来客数无效，已跳过`);
      continue;
    }
    if (revenue === null && avgTicket !== null) {
      revenue = avgTicket * guests;
    }
    if (avgTicket === null && revenue !== null && guests > 0) {
      avgTicket = revenue / guests;
    }
    if (revenue === null || avgTicket === null) {
      warnings.push(`第 ${i + 1} 行营收/人均不完整，已跳过`);
      continue;
    }

    const cost = idx.cost !== undefined ? toNumber(line[idx.cost]) ?? undefined : undefined;
    const expense =
      idx.expense !== undefined ? toNumber(line[idx.expense]) ?? undefined : undefined;
    let profit =
      idx.profit !== undefined ? toNumber(line[idx.profit]) ?? undefined : undefined;
    if (profit === undefined && cost !== undefined && expense !== undefined) {
      profit = revenue - cost - expense;
    }

    rows.push({
      date,
      mealPeriod,
      zone,
      guests,
      avgTicket,
      revenue,
      cost,
      expense,
      profit,
    });
  }

  if (!rows.length) throw new Error("没有解析到有效日×餐段明细");

  const quality = assessDailyOpsQuality(rows);
  if (!quality.ok) {
    throw new Error(quality.reason);
  }
  if (!quality.hasZone) {
    warnings.push("区域列缺失或全为未分区，厅区贡献分析会变弱");
  }
  if (quality.mealPeriods.length < 2) {
    warnings.push("餐段种类偏少，建议至少区分午市/晚市");
  }

  return { rows: sortDaily(rows), fileName, warnings };
}

export async function importDailyOpsFile(file: File): Promise<DailyOpsImportResult> {
  const { matrix, fileName } = await sheetToMatrix(file);
  return parseDailyOpsMatrix(matrix, fileName);
}

export function parseDishSalesMatrix(
  matrix: string[][],
  fileName: string,
): DishSalesImportResult {
  if (matrix.length < 2) throw new Error("菜品销售表至少需要表头 + 一行数据");
  const header = matrix[0] || [];
  const idx = headerIndexMap(header);
  if (idx.date === undefined) throw new Error("菜品销售必须有「日期」");
  if (idx.name === undefined) throw new Error("菜品销售必须有「菜名」");
  if (idx.qty === undefined && idx.amount === undefined) {
    throw new Error("菜品销售至少要有「销量」或「销售额」");
  }

  const warnings: string[] = [];
  const rows: DishSalesRow[] = [];
  for (let i = 1; i < matrix.length; i++) {
    const line = matrix[i] || [];
    if (line.every((cell) => !String(cell || "").trim())) continue;
    const date = normalizeDate(String(line[idx.date!] ?? ""));
    const dishName = String(line[idx.name!] ?? "").trim();
    const mealPeriod = normalizeMealPeriod(
      idx.meal_period !== undefined ? String(line[idx.meal_period] ?? "") : "",
    );
    const zone =
      idx.zone !== undefined
        ? String(line[idx.zone] ?? "").trim() || "未分区"
        : "未分区";
    const category =
      idx.category !== undefined
        ? String(line[idx.category] ?? "").trim() || "未分类"
        : "未分类";
    let qty = idx.qty !== undefined ? toNumber(line[idx.qty]) : null;
    let amount = idx.amount !== undefined ? toNumber(line[idx.amount]) : null;
    const unitPrice = idx.price !== undefined ? toNumber(line[idx.price]) : null;
    const cost = idx.cost !== undefined ? toNumber(line[idx.cost]) ?? undefined : undefined;

    if (!date || !dishName) {
      warnings.push(`第 ${i + 1} 行日期/菜名无效，已跳过`);
      continue;
    }
    if (amount === null && qty !== null && unitPrice !== null) {
      amount = qty * unitPrice;
    }
    if (qty === null && amount !== null) {
      qty = 1;
      warnings.push(`${date} ${dishName} 缺销量，暂记 1 份`);
    }
    if (qty === null || amount === null) {
      warnings.push(`第 ${i + 1} 行销量/销售额不完整，已跳过`);
      continue;
    }

    rows.push({
      date,
      mealPeriod,
      zone,
      dishName,
      category,
      qty,
      amount,
      cost,
    });
  }

  if (rows.length < MIN_DISH_SALES_ROWS) {
    throw new Error(
      `菜品销售仅 ${rows.length} 行，至少需要 ${MIN_DISH_SALES_ROWS} 行才能看结构贡献`,
    );
  }

  rows.sort((a, b) => a.date.localeCompare(b.date) || b.amount - a.amount);
  return { rows, fileName, warnings };
}

export async function importDishSalesFile(file: File): Promise<DishSalesImportResult> {
  const { matrix, fileName } = await sheetToMatrix(file);
  return parseDishSalesMatrix(matrix, fileName);
}

export function assessDailyOpsQuality(rows: DailyOpsRow[]): {
  ok: boolean;
  reason: string;
  days: number;
  months: string[];
  mealPeriods: string[];
  hasZone: boolean;
  totalGuests: number;
  totalRevenue: number;
  avgTicket: number;
} {
  const days = new Set(rows.map((r) => r.date));
  const months = Array.from(
    new Set(rows.map((r) => r.date.slice(0, 7))),
  ).sort();
  const mealPeriods = Array.from(
    new Set(rows.map((r) => r.mealPeriod).filter((p) => p && p !== "未标注餐段")),
  );
  const hasZone = rows.some((r) => r.zone && r.zone !== "未分区");
  const totalGuests = rows.reduce((s, r) => s + r.guests, 0);
  const totalRevenue = rows.reduce((s, r) => s + r.revenue, 0);
  const avgTicket = totalRevenue / Math.max(1, totalGuests);

  if (months.length < MIN_LEDGER_MONTHS && days.size < MIN_DAILY_DAYS) {
    return {
      ok: false,
      reason: `日明细仅覆盖 ${months.length} 个月、${days.size} 个营业日；至少需要 ${MIN_LEDGER_MONTHS} 个月，或不少于 ${MIN_DAILY_DAYS} 个营业日的日×餐段数据`,
      days: days.size,
      months,
      mealPeriods,
      hasZone,
      totalGuests,
      totalRevenue,
      avgTicket,
    };
  }
  if (!mealPeriods.length) {
    return {
      ok: false,
      reason: "日明细缺少有效餐段（午市/晚市等），经营分析没有餐段价值",
      days: days.size,
      months,
      mealPeriods,
      hasZone,
      totalGuests,
      totalRevenue,
      avgTicket,
    };
  }
  if (totalGuests <= 0) {
    return {
      ok: false,
      reason: "来客数合计为 0，无法计算人均与客流",
      days: days.size,
      months,
      mealPeriods,
      hasZone,
      totalGuests,
      totalRevenue,
      avgTicket,
    };
  }
  return {
    ok: true,
    reason: "",
    days: days.size,
    months,
    mealPeriods,
    hasZone,
    totalGuests,
    totalRevenue,
    avgTicket,
  };
}

export function aggregateDailyToMonthly(rows: DailyOpsRow[]): MonthlyLedgerRow[] {
  const map = new Map<string, MonthlyLedgerRow>();
  for (const row of rows) {
    const month = row.date.slice(0, 7);
    const cur = map.get(month) || {
      month,
      revenue: 0,
      cost: 0,
      expense: 0,
      profit: 0,
    };
    cur.revenue += row.revenue;
    cur.cost += row.cost || 0;
    cur.expense += row.expense || 0;
    cur.profit +=
      row.profit !== undefined
        ? row.profit
        : row.revenue - (row.cost || 0) - (row.expense || 0);
    map.set(month, cur);
  }
  return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
}

export function deriveBandsFromLedger(rows: MonthlyLedgerRow[]) {
  if (rows.length < 1) return null;
  const recent = rows.slice(-Math.max(MIN_LEDGER_MONTHS, Math.min(rows.length, MIN_LEDGER_MONTHS)));
  if (recent.length < 1) return null;
  const first = recent[0]!;
  const last = recent[recent.length - 1]!;
  const revChange =
    (last.revenue - first.revenue) / Math.max(1, Math.abs(first.revenue));
  const revenueTrend = revChange > 0.05 ? "up" : revChange < -0.05 ? "down" : "flat";

  const avgRevenue = avg(recent.map((r) => r.revenue));
  const avgCost = avg(recent.map((r) => r.cost));
  const avgExpense = avg(recent.map((r) => r.expense));
  const avgProfit = avg(recent.map((r) => r.profit));
  const margin = avgProfit / Math.max(1, avgRevenue);
  const costRatio = avgCost / Math.max(1, avgRevenue);
  const expenseRatio = avgExpense / Math.max(1, avgRevenue);

  return {
    revenueTrend,
    profitPressure: margin < 0 ? "loss" : margin < 0.08 ? "tight" : "comfortable",
    costPressure: costRatio > 0.4 ? "high" : costRatio > 0.3 ? "medium" : "low",
    expensePressure:
      expenseRatio > 0.35 ? "high" : expenseRatio > 0.22 ? "medium" : "low",
    avgRevenue,
    avgCost,
    avgExpense,
    avgProfit,
    margin,
    costRatio,
    expenseRatio,
    months: recent.length,
    span: `${first.month}~${last.month}`,
  };
}

export function deriveBandsFromDaily(rows: DailyOpsRow[]) {
  const monthly = aggregateDailyToMonthly(rows);
  const base = deriveBandsFromLedger(monthly);
  const quality = assessDailyOpsQuality(rows);
  if (!base) return null;

  // traffic from guests by month
  const guestsByMonth = new Map<string, number>();
  for (const row of rows) {
    const m = row.date.slice(0, 7);
    guestsByMonth.set(m, (guestsByMonth.get(m) || 0) + row.guests);
  }
  const months = Array.from(guestsByMonth.keys()).sort();
  let trafficTrend = "flat";
  if (months.length >= 2) {
    const a = guestsByMonth.get(months[0]!) || 0;
    const b = guestsByMonth.get(months[months.length - 1]!) || 0;
    const ch = (b - a) / Math.max(1, a);
    trafficTrend = ch > 0.05 ? "up" : ch < -0.05 ? "down" : "flat";
  }

  const dinnerShare =
    rows.filter((r) => r.mealPeriod === "晚市").reduce((s, r) => s + r.revenue, 0) /
    Math.max(1, quality.totalRevenue);
  const zoneCount = new Set(rows.map((r) => r.zone).filter((z) => z !== "未分区")).size;

  return {
    ...base,
    trafficTrend,
    avgTicket: quality.avgTicket,
    days: quality.days,
    mealPeriods: quality.mealPeriods,
    dinnerShare,
    zoneCount,
    totalGuests: quality.totalGuests,
  };
}

export function deriveDishStructure(rows: DishSalesRow[]) {
  if (!rows.length) return null;
  const byDish = new Map<string, { amount: number; qty: number; category: string }>();
  for (const row of rows) {
    const cur = byDish.get(row.dishName) || {
      amount: 0,
      qty: 0,
      category: row.category,
    };
    cur.amount += row.amount;
    cur.qty += row.qty;
    byDish.set(row.dishName, cur);
  }
  const ranked = Array.from(byDish.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.amount - a.amount);
  const total = ranked.reduce((s, r) => s + r.amount, 0);
  const top = ranked.slice(0, 5);
  const topShare = top.reduce((s, r) => s + r.amount, 0) / Math.max(1, total);
  const drinkAmount = ranked
    .filter((r) => /饮|酒|茶|咖/.test(r.category) || /饮|汤|茶/.test(r.name))
    .reduce((s, r) => s + r.amount, 0);
  const drinkShare = drinkAmount / Math.max(1, total);
  const dishDrinkMix =
    drinkShare >= 0.45 ? "drink_heavy" : drinkShare <= 0.2 ? "food_heavy" : "balanced";
  const contributionSense =
    topShare >= 0.45 ? "high" : topShare >= 0.3 ? "medium" : "low";

  return {
    skuCount: ranked.length,
    top,
    topShare,
    drinkShare,
    dishDrinkMix,
    contributionSense,
    totalAmount: total,
  };
}

export function dailyOpsSummaryText(rows: DailyOpsRow[]) {
  const q = assessDailyOpsQuality(rows);
  return `${q.months[0] || "?"}~${q.months[q.months.length - 1] || "?"}｜${q.days} 个营业日｜${rows.length} 条餐段明细｜来客 ${q.totalGuests}｜人均 ${Math.round(q.avgTicket)}｜餐段 ${q.mealPeriods.join("/") || "—"}`;
}

export function dishSalesSummaryText(rows: DishSalesRow[]) {
  const s = deriveDishStructure(rows);
  if (!s) return "尚未导入菜品销售结构";
  return `${rows.length} 行销售｜${s.skuCount} 个品项｜TOP贡献 ${(s.topShare * 100).toFixed(0)}%｜代表 ${s.top
    .slice(0, 3)
    .map((t) => t.name)
    .join("、")}`;
}

export function ledgerSummaryText(rows: MonthlyLedgerRow[]) {
  const derived = deriveBandsFromLedger(rows);
  if (!derived) return `已导入 ${rows.length} 个月汇总`;
  return `${derived.span} 共 ${rows.length} 个月｜近窗均营收 ${Math.round(derived.avgRevenue)}、均利润 ${Math.round(derived.avgProfit)}、利润率 ${(derived.margin * 100).toFixed(1)}%`;
}

function labelOf(key: string) {
  const map: Record<string, string> = {
    month: "月份",
    revenue: "营收",
    cost: "成本",
    expense: "费用",
    profit: "利润",
  };
  return map[key] || key;
}

function avg(nums: number[]) {
  return nums.reduce((s, n) => s + n, 0) / Math.max(1, nums.length);
}

function dedupeMonthly(rows: MonthlyLedgerRow[]) {
  const dedup = new Map<string, MonthlyLedgerRow>();
  for (const row of rows) dedup.set(row.month, row);
  return Array.from(dedup.values()).sort((a, b) => a.month.localeCompare(b.month));
}

function sortDaily(rows: DailyOpsRow[]) {
  return [...rows].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.mealPeriod.localeCompare(b.mealPeriod) ||
      a.zone.localeCompare(b.zone),
  );
}
