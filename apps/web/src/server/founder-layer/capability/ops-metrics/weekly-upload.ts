/**
 * 经营内数周上传 — CSV/手工录入 → profile → Signal internalFacts
 * 权威：MEALKEY_MVP_90DAY_ROADMAP · 商业交付清单
 */

export const PROFILE_WEEKLY_OPS_KEY = "weeklyOpsMetrics" as const;

export type WeeklyOpsMetricsV1 = {
  schemaVersion: 1;
  weekOf: string; // YYYY-MM-DD（周一或录入日）
  revenue?: number;
  guests?: number;
  avgTicket?: number;
  notes?: string;
  source: "csv" | "manual";
  uploadedAt: string;
};

export type WeeklyOpsParseResult =
  | { ok: true; metrics: WeeklyOpsMetricsV1 }
  | { ok: false; error: string };

function num(raw: string | undefined): number | undefined {
  if (raw == null || !String(raw).trim()) return undefined;
  const n = Number(String(raw).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : undefined;
}

/** 解析简易 CSV：表头含 日期/营业额/客流/客单 */
export function parseWeeklyOpsCsv(
  csvText: string,
  opts?: { weekOf?: string },
): WeeklyOpsParseResult {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    return { ok: false, error: "CSV 至少需要表头 + 一行数据" };
  }
  const header = lines[0]!.split(/[,，\t]/).map((h) => h.trim().toLowerCase());
  const idx = (aliases: string[]) =>
    header.findIndex((h) => aliases.some((a) => h.includes(a)));

  const iDate = idx(["日期", "周", "week", "date"]);
  const iRev = idx(["营业额", "营收", "revenue", "销售额"]);
  const iGuests = idx(["客流", "人次", "guests", "客数"]);
  const iTicket = idx(["客单", "ticket", "单价"]);

  if (iRev < 0 && iGuests < 0 && iTicket < 0) {
    return {
      ok: false,
      error: "未识别列：请包含「营业额 / 客流 / 客单」至少一列",
    };
  }

  // 取最后一行有效数据
  let dataLine = lines[lines.length - 1]!;
  for (let i = lines.length - 1; i >= 1; i--) {
    if (lines[i]!.split(/[,，\t]/).some((c) => c.trim())) {
      dataLine = lines[i]!;
      break;
    }
  }
  const cols = dataLine.split(/[,，\t]/).map((c) => c.trim());
  const revenue = iRev >= 0 ? num(cols[iRev]) : undefined;
  const guests = iGuests >= 0 ? num(cols[iGuests]) : undefined;
  let avgTicket = iTicket >= 0 ? num(cols[iTicket]) : undefined;
  if (avgTicket == null && revenue != null && guests && guests > 0) {
    avgTicket = Math.round((revenue / guests) * 100) / 100;
  }
  const weekOf =
    opts?.weekOf ||
    (iDate >= 0 && cols[iDate] ? cols[iDate]! : new Date().toISOString().slice(0, 10));

  if (revenue == null && guests == null && avgTicket == null) {
    return { ok: false, error: "数据行没有可解析的数字" };
  }

  return {
    ok: true,
    metrics: {
      schemaVersion: 1,
      weekOf,
      revenue,
      guests,
      avgTicket,
      source: "csv",
      uploadedAt: new Date().toISOString(),
    },
  };
}

export function readWeeklyOpsMetrics(
  profile: Record<string, unknown> | null | undefined,
): WeeklyOpsMetricsV1 | null {
  const raw = profile?.[PROFILE_WEEKLY_OPS_KEY];
  if (!raw || typeof raw !== "object") return null;
  const m = raw as WeeklyOpsMetricsV1;
  if (m.schemaVersion !== 1) return null;
  return m;
}

/** 转为 Signal Engine internalFacts */
export function weeklyOpsToInternalFacts(
  metrics: WeeklyOpsMetricsV1 | null,
): Array<{ id: string; source: string; fact: string }> {
  if (!metrics) return [];
  const facts: Array<{ id: string; source: string; fact: string }> = [];
  const parts: string[] = [`周次 ${metrics.weekOf}`];
  if (metrics.revenue != null) parts.push(`营业额 ${metrics.revenue}`);
  if (metrics.guests != null) parts.push(`客流 ${metrics.guests}`);
  if (metrics.avgTicket != null) parts.push(`客单 ${metrics.avgTicket}`);
  facts.push({
    id: `ops_${metrics.weekOf}`,
    source: "经营周报",
    fact: parts.join(" · "),
  });
  if (
    metrics.revenue != null &&
    metrics.guests != null &&
    metrics.guests > 0 &&
    metrics.avgTicket != null
  ) {
    // 结构提示：客单 vs 客流（不 invent 因果，只陈述组合）
    facts.push({
      id: `ops_structure_${metrics.weekOf}`,
      source: "经营周报",
      fact: `客流与客单已同步录入，可用于拆解「市场 vs 客单」`,
    });
  }
  return facts;
}

/** 从周报生成弱 OPERATION worldHint（有数字才生成） */
export function weeklyOpsToWorldHint(
  metrics: WeeklyOpsMetricsV1 | null,
): {
  id: string;
  title: string;
  detail: string;
  kind: string;
  source: string;
} | null {
  if (!metrics) return null;
  if (metrics.revenue == null && metrics.avgTicket == null) return null;
  const detail = [
    metrics.revenue != null ? `营业额 ${metrics.revenue}` : "",
    metrics.guests != null ? `客流 ${metrics.guests}` : "",
    metrics.avgTicket != null ? `客单 ${metrics.avgTicket}` : "",
  ]
    .filter(Boolean)
    .join("，");
  return {
    id: `ops_hint_${metrics.weekOf}`,
    title: "本周经营数据已更新",
    detail: `${detail}。请对照客流是否稳定、客单是否承压。`,
    kind: "operation",
    source: "经营周报",
  };
}
