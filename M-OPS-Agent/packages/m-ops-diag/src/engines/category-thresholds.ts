/**
 * 品类阈值表 — 同读数不同品类告警带不同（非 LLM）
 */
export type CategoryThresholds = {
  id: "xiangcai" | "hotpot" | "tea" | "default";
  label: string;
  /** 最旺餐段营收份额告警（%） */
  peakShareWarn: number;
  /** TOP20% SKU 流水贡献告警（%） */
  top20ShareWarn: number;
  /** 客流月环比告警 / 风险（%）负向 */
  guestDropWarn: number;
  guestDropRisk: number;
  tip: string;
};

export const CATEGORY_THRESHOLDS: Record<string, CategoryThresholds> = {
  xiangcai: {
    id: "xiangcai",
    label: "湘菜/正餐",
    peakShareWarn: 45,
    top20ShareWarn: 55,
    guestDropWarn: -5,
    guestDropRisk: -12,
    tip: "湘菜关注晚市高峰等待与高流水低毛利招牌。",
  },
  hotpot: {
    id: "hotpot",
    label: "火锅",
    peakShareWarn: 50,
    top20ShareWarn: 50,
    guestDropWarn: -8,
    guestDropRisk: -15,
    tip: "火锅关注翻台/夜宵波动与锅底及涮品毛利结构。",
  },
  tea: {
    id: "tea",
    label: "茶饮",
    peakShareWarn: 40,
    top20ShareWarn: 60,
    guestDropWarn: -6,
    guestDropRisk: -14,
    tip: "茶饮关注爆品集中度与午晚峰排队劝退。",
  },
  default: {
    id: "default",
    label: "通用餐饮",
    peakShareWarn: 48,
    top20ShareWarn: 55,
    guestDropWarn: -5,
    guestDropRisk: -12,
    tip: "按通用餐饮阈值监控高峰集中与客流波动。",
  },
};

export function resolveCategoryThresholds(category?: string): CategoryThresholds {
  const c = String(category || "");
  if (/火锅|串串|冒菜|麻辣烫/.test(c)) return CATEGORY_THRESHOLDS.hotpot!;
  if (/茶|咖啡|饮品|奶茶|果汁/.test(c)) return CATEGORY_THRESHOLDS.tea!;
  if (/湘|川|粤|菜|餐|烧烤|烤肉|面|粉/.test(c)) return CATEGORY_THRESHOLDS.xiangcai!;
  return CATEGORY_THRESHOLDS.default!;
}

export type CategoryAlert = {
  id: string;
  level: "attention" | "risk";
  statement: string;
};

/** 供会审/报告附加品类告警 */
export function evaluateCategoryAlerts(input: {
  category?: string;
  peakSharePct?: number;
  top20SharePct?: number;
  guestChangePct?: number;
}): { thresholds: CategoryThresholds; alerts: CategoryAlert[] } {
  const thresholds = resolveCategoryThresholds(input.category);
  const alerts: CategoryAlert[] = [];
  if (
    input.peakSharePct != null &&
    input.peakSharePct >= thresholds.peakShareWarn
  ) {
    alerts.push({
      id: "cat_peak_share",
      level: "attention",
      statement: `${thresholds.label}：最旺餐段份额 ${input.peakSharePct.toFixed(0)}% ≥ ${thresholds.peakShareWarn}% 告警线，需盯出菜与等位`,
    });
  }
  if (
    input.top20SharePct != null &&
    input.top20SharePct >= thresholds.top20ShareWarn
  ) {
    alerts.push({
      id: "cat_top20",
      level: "attention",
      statement: `${thresholds.label}：TOP20% 贡献 ${input.top20SharePct.toFixed(0)}% ≥ ${thresholds.top20ShareWarn}% ，爆品/招牌集中风险`,
    });
  }
  if (input.guestChangePct != null) {
    if (input.guestChangePct <= thresholds.guestDropRisk) {
      alerts.push({
        id: "cat_guest_risk",
        level: "risk",
        statement: `${thresholds.label}：客流 ${input.guestChangePct.toFixed(1)}% ≤ 风险线 ${thresholds.guestDropRisk}%`,
      });
    } else if (input.guestChangePct <= thresholds.guestDropWarn) {
      alerts.push({
        id: "cat_guest_warn",
        level: "attention",
        statement: `${thresholds.label}：客流 ${input.guestChangePct.toFixed(1)}% ≤ 告警线 ${thresholds.guestDropWarn}%`,
      });
    }
  }
  return { thresholds, alerts };
}
