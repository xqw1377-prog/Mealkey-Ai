/**
 * 经营体检计算内核 — 可复核公式，供四官与会审共用。
 */

export type DailyOpsRow = {
  date: string;
  mealPeriod: string;
  zone: string;
  guests: number;
  avgTicket: number;
  revenue: number;
  cost?: number;
  expense?: number;
  profit?: number;
};

export type DishSalesRow = {
  date: string;
  mealPeriod: string;
  zone: string;
  dishName: string;
  category?: string;
  qty: number;
  amount: number;
  cost?: number;
};

export type MenuItemCost = {
  name: string;
  category?: string;
  price?: number;
  cost?: number;
  kind?: string;
};

/** 用菜单成本/售价 enrich 菜销行，支撑毛利四象限 */
export function enrichDishSalesWithMenu(
  sales: DishSalesRow[],
  menu: MenuItemCost[],
): { rows: DishSalesRow[]; matched: number; missingCost: number } {
  if (!menu.length) {
    return {
      rows: sales,
      matched: 0,
      missingCost: sales.filter((r) => !(r.cost && r.cost > 0)).length,
    };
  }
  const byName = new Map(
    menu.map((m) => [m.name.trim().toLowerCase(), m] as const),
  );
  let matched = 0;
  let missingCost = 0;
  const rows = sales.map((row) => {
    if (row.cost && row.cost > 0) return row;
    const hit = byName.get(row.dishName.trim().toLowerCase());
    if (!hit) {
      missingCost += 1;
      return row;
    }
    matched += 1;
    const unitCost =
      hit.cost !== undefined && hit.cost >= 0
        ? hit.cost
        : undefined;
    if (unitCost === undefined) {
      missingCost += 1;
      return {
        ...row,
        category: row.category || hit.category || row.category,
      };
    }
    const qty = Math.max(1, row.qty || 1);
    return {
      ...row,
      category: row.category || hit.category || row.category,
      cost: unitCost * qty,
    };
  });
  return { rows, matched, missingCost };
}

export function sum(nums: number[]) {
  return nums.reduce((s, n) => s + n, 0);
}

export function pct(part: number, total: number) {
  return total <= 0 ? 0 : (part / total) * 100;
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** 按月聚合 */
export function aggregateByMonth(rows: DailyOpsRow[]) {
  const map = new Map<string, { revenue: number; guests: number; days: Set<string> }>();
  for (const row of rows) {
    const month = row.date.slice(0, 7);
    const cur = map.get(month) || { revenue: 0, guests: 0, days: new Set<string>() };
    cur.revenue += row.revenue;
    cur.guests += row.guests;
    cur.days.add(row.date);
    map.set(month, cur);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([month, v]) => ({
      month,
      revenue: v.revenue,
      guests: v.guests,
      days: v.days.size,
      avgTicket: v.revenue / Math.max(1, v.guests),
    }));
}

/**
 * 营收变动分解（对数近似的加性拆分）：
 * ΔRev ≈ Guests0·ΔTicket + Ticket0·ΔGuests + ΔTicket·ΔGuests
 * 返回各效应占 |ΔRev| 的贡献方向与占比。
 */
export function decomposeRevenueChange(input: {
  revenue0: number;
  guests0: number;
  ticket0: number;
  revenue1: number;
  guests1: number;
  ticket1: number;
}) {
  const dTicket = input.ticket1 - input.ticket0;
  const dGuests = input.guests1 - input.guests0;
  const dRev = input.revenue1 - input.revenue0;
  const ticketEffect = input.guests0 * dTicket;
  const guestEffect = input.ticket0 * dGuests;
  const interaction = dTicket * dGuests;
  const explained = ticketEffect + guestEffect + interaction;
  const absExplained = Math.abs(ticketEffect) + Math.abs(guestEffect) + Math.abs(interaction) || 1;

  let driver: "ticket" | "traffic" | "mixed" | "flat" = "flat";
  if (Math.abs(dRev) / Math.max(1, Math.abs(input.revenue0)) < 0.02) {
    driver = "flat";
  } else if (Math.abs(ticketEffect) > Math.abs(guestEffect) * 1.25) {
    driver = "ticket";
  } else if (Math.abs(guestEffect) > Math.abs(ticketEffect) * 1.25) {
    driver = "traffic";
  } else {
    driver = "mixed";
  }

  return {
    dRev,
    dRevPct: pct(dRev, input.revenue0),
    ticketEffect,
    guestEffect,
    interaction,
    ticketShare: pct(Math.abs(ticketEffect), absExplained),
    guestShare: pct(Math.abs(guestEffect), absExplained),
    driver,
    explained,
  };
}

export type MealContribution = {
  mealPeriod: string;
  revenue: number;
  guests: number;
  avgTicket: number;
  revenueShare: number;
  /** 相对全店人均的指数（1=持平） */
  ticketIndex: number;
  /** 贡献指数 = 份额 × 人均指数 */
  mci: number;
};

/** 餐段贡献指数 MCI = 营收份额 × (餐段人均 / 全店人均) */
export function mealContributionIndex(rows: DailyOpsRow[]): MealContribution[] {
  const totalRev = sum(rows.map((r) => r.revenue));
  const totalGuests = sum(rows.map((r) => r.guests));
  const storeTicket = totalRev / Math.max(1, totalGuests);
  const byMeal = new Map<string, { revenue: number; guests: number }>();
  for (const row of rows) {
    const cur = byMeal.get(row.mealPeriod) || { revenue: 0, guests: 0 };
    cur.revenue += row.revenue;
    cur.guests += row.guests;
    byMeal.set(row.mealPeriod, cur);
  }
  return [...byMeal.entries()]
    .map(([mealPeriod, v]) => {
      const avgTicket = v.revenue / Math.max(1, v.guests);
      const revenueShare = pct(v.revenue, totalRev) / 100;
      const ticketIndex = avgTicket / Math.max(1e-6, storeTicket);
      return {
        mealPeriod,
        revenue: v.revenue,
        guests: v.guests,
        avgTicket,
        revenueShare: revenueShare * 100,
        ticketIndex,
        mci: revenueShare * ticketIndex,
      };
    })
    .sort((a, b) => b.mci - a.mci);
}

export type ZoneContribution = {
  zone: string;
  revenue: number;
  guests: number;
  avgTicket: number;
  revenueShare: number;
};

export function zoneContribution(rows: DailyOpsRow[]): ZoneContribution[] {
  const totalRev = sum(rows.map((r) => r.revenue));
  const byZone = new Map<string, { revenue: number; guests: number }>();
  for (const row of rows) {
    const zone = row.zone || "未分区";
    const cur = byZone.get(zone) || { revenue: 0, guests: 0 };
    cur.revenue += row.revenue;
    cur.guests += row.guests;
    byZone.set(zone, cur);
  }
  return [...byZone.entries()]
    .map(([zone, v]) => ({
      zone,
      revenue: v.revenue,
      guests: v.guests,
      avgTicket: v.revenue / Math.max(1, v.guests),
      revenueShare: pct(v.revenue, totalRev),
    }))
    .sort((a, b) => b.revenueShare - a.revenueShare);
}

export type PnLSnapshot = {
  revenue: number;
  cost: number;
  expense: number;
  profit: number;
  marginPct: number;
  costRatioPct: number;
  expenseRatioPct: number;
  hasCost: boolean;
  hasExpense: boolean;
  costCoverage: number;
};

export function computePnL(rows: DailyOpsRow[]): PnLSnapshot {
  const revenue = sum(rows.map((r) => r.revenue));
  const withCost = rows.filter((r) => r.cost !== undefined);
  const withExpense = rows.filter((r) => r.expense !== undefined);
  const cost = sum(withCost.map((r) => r.cost || 0));
  const expense = sum(withExpense.map((r) => r.expense || 0));
  const profit = sum(
    rows.map((r) =>
      r.profit !== undefined
        ? r.profit
        : r.revenue - (r.cost || 0) - (r.expense || 0),
    ),
  );
  return {
    revenue,
    cost,
    expense,
    profit,
    marginPct: pct(profit, revenue),
    costRatioPct: pct(cost, revenue),
    expenseRatioPct: pct(expense, revenue),
    hasCost: withCost.length > 0,
    hasExpense: withExpense.length > 0,
    costCoverage: withCost.length / Math.max(1, rows.length),
  };
}

export type AbcClass = "A" | "B" | "C";

export type DishAbcRow = {
  name: string;
  category: string;
  amount: number;
  qty: number;
  cost: number;
  sharePct: number;
  cumSharePct: number;
  abc: AbcClass;
  marginPct: number | null;
  quadrant?: "star" | "cash_cow" | "question" | "dog" | "unknown";
};

/**
 * Pareto ABC：
 * A = 累计至 80%；B = 80–95%；C = 其余
 * 有成本时：流水高&毛利高=star；流水高&毛利低=cash_cow；流水低&毛利高=question；双低=dog
 */
export function computeDishAbc(rows: DishSalesRow[]): {
  ranked: DishAbcRow[];
  aCount: number;
  bCount: number;
  cCount: number;
  top20SharePct: number;
  drinkSharePct: number;
  longTailCount: number;
  hasMargin: boolean;
} {
  const byDish = new Map<
    string,
    { amount: number; qty: number; category: string; cost: number }
  >();
  for (const row of rows) {
    const cur = byDish.get(row.dishName) || {
      amount: 0,
      qty: 0,
      category: row.category || "未分类",
      cost: 0,
    };
    cur.amount += row.amount;
    cur.qty += row.qty;
    cur.cost += row.cost || 0;
    byDish.set(row.dishName, cur);
  }
  const total = sum([...byDish.values()].map((v) => v.amount)) || 1;
  let cum = 0;
  const ranked: DishAbcRow[] = [...byDish.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.amount - a.amount)
    .map((item) => {
      cum += item.amount;
      const sharePct = pct(item.amount, total);
      const cumSharePct = pct(cum, total);
      const abc: AbcClass =
        cumSharePct <= 80 || (cum - item.amount) / total < 0.8
          ? cumSharePct <= 80
            ? "A"
            : cumSharePct <= 95
              ? "B"
              : "C"
          : cumSharePct <= 95
            ? "B"
            : "C";
      // fix ABC: assign based on cum after including item
      let cls: AbcClass = "C";
      if (cumSharePct <= 80) cls = "A";
      else if (cumSharePct <= 95) cls = "B";
      else cls = "C";
      // first items that cross 80 stay A if previous cum < 80
      const prevCum = cumSharePct - sharePct;
      if (prevCum < 80) cls = "A";
      else if (prevCum < 95) cls = "B";
      else cls = "C";

      const hasCost = item.cost > 0;
      const marginPct = hasCost ? pct(item.amount - item.cost, item.amount) : null;
      let quadrant: DishAbcRow["quadrant"] = "unknown";
      if (marginPct !== null) {
        const highRev = sharePct >= 5 || cls === "A";
        const highMargin = marginPct >= 55;
        if (highRev && highMargin) quadrant = "star";
        else if (highRev && !highMargin) quadrant = "cash_cow";
        else if (!highRev && highMargin) quadrant = "question";
        else quadrant = "dog";
      }

      return {
        name: item.name,
        category: item.category,
        amount: item.amount,
        qty: item.qty,
        cost: item.cost,
        sharePct,
        cumSharePct,
        abc: cls,
        marginPct,
        quadrant,
      };
    });

  // Re-assign ABC properly in one pass
  let running = 0;
  for (const row of ranked) {
    const prev = running;
    running += row.amount;
    if (prev / total < 0.8) row.abc = "A";
    else if (prev / total < 0.95) row.abc = "B";
    else row.abc = "C";
    row.cumSharePct = pct(running, total);
  }

  const aCount = ranked.filter((r) => r.abc === "A").length;
  const bCount = ranked.filter((r) => r.abc === "B").length;
  const cCount = ranked.filter((r) => r.abc === "C").length;
  const topN = Math.max(1, Math.ceil(ranked.length * 0.2));
  const top20SharePct = pct(sum(ranked.slice(0, topN).map((r) => r.amount)), total);
  const drinkAmount = sum(
    ranked
      .filter((r) => /饮|酒|茶|咖|饮料/.test(r.category) || /汤|茶|汁|酒/.test(r.name))
      .map((r) => r.amount),
  );
  const longTailCount = ranked.filter((r) => r.sharePct < 1).length;
  const hasMargin = ranked.some((r) => r.marginPct !== null);

  return {
    ranked,
    aCount,
    bCount,
    cCount,
    top20SharePct,
    drinkSharePct: pct(drinkAmount, total),
    longTailCount,
    hasMargin,
  };
}

/** 专业置信度：样本日数、SKU、证据、成本覆盖、窗可比 */
export function professionalConfidence(input: {
  days: number;
  skuCount?: number;
  /** @deprecated 兼容旧调用，等价于 skuCount */
  dishCount?: number;
  evidenceCount?: number;
  costCoverage?: number;
  comparableMonths?: number;
  refused?: boolean;
}): number {
  if (input.refused) return 0.12;
  const daysScore = clamp(input.days / 60, 0, 1) * 0.35;
  const skuScore = clamp((input.skuCount ?? input.dishCount ?? 0) / 40, 0, 1) * 0.2;
  const evidenceScore = clamp((input.evidenceCount || 0) / 12, 0, 1) * 0.2;
  const costScore = clamp(input.costCoverage || 0, 0, 1) * 0.15;
  const monthScore = clamp((input.comparableMonths || 0) / 3, 0, 1) * 0.1;
  return clamp(0.2 + daysScore + skuScore + evidenceScore + costScore + monthScore, 0.15, 0.95);
}

export function uniqueDates(rows: DailyOpsRow[]) {
  return new Set(rows.map((r) => r.date)).size;
}

export function formatMoney(n: number) {
  return Math.round(n).toLocaleString("zh-CN");
}

export function formatPct(n: number, digits = 1) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}%`;
}

export function driverLabel(driver: ReturnType<typeof decomposeRevenueChange>["driver"]) {
  if (driver === "ticket") return "客单主导";
  if (driver === "traffic") return "客流主导";
  if (driver === "mixed") return "客单与客流共同作用";
  return "基本持平";
}
