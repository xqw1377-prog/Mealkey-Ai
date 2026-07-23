/**
 * 经营体检 · 数据采集目录（SSOT）
 * 原则：没有硬门槛数据，对应专家拒签；加分数据决定分析深度。
 */

import type { ExpertRole } from "./contracts";

export type DataRequiredLevel = "hard" | "strong" | "optional";

export type DataFieldGroup =
  | "identity"
  | "daily_ops"
  | "dish_sales"
  | "menu"
  | "finance_monthly"
  | "ops_kpi"
  | "owner_voice"
  | "external";

export type DataFieldDef = {
  id: string;
  group: DataFieldGroup;
  label: string;
  required: DataRequiredLevel;
  /** 哪些专家主审依赖该字段 */
  experts: ExpertRole[];
  why: string;
  /** 对应 DiagnosisFact.kind 或导入域 */
  factKinds?: string[];
};

/** 完整采集目录：体检价值 = 硬门槛齐备 + 强建议充实 + 外部证据 */
export const DATA_COLLECTION_CATALOG: DataFieldDef[] = [
  // —— 身份 ——
  {
    id: "brand",
    group: "identity",
    label: "店名/品牌",
    required: "hard",
    experts: ["finance", "product", "marketing", "experience"],
    why: "一切结论必须挂在具体门店上",
  },
  {
    id: "city_category",
    group: "identity",
    label: "城市 + 品类",
    required: "hard",
    experts: ["marketing", "experience", "product"],
    why: "决定竞争对照与外部声音范围",
  },
  {
    id: "price_range",
    group: "identity",
    label: "客单锚点",
    required: "strong",
    experts: ["finance", "experience", "marketing"],
    why: "对照价格感知与定位",
    factKinds: ["priceRange"],
  },

  // —— 日×餐段经营（财务官硬门槛）——
  {
    id: "daily_date",
    group: "daily_ops",
    label: "营业日期",
    required: "hard",
    experts: ["finance", "marketing"],
    why: "没有日期序列，无法看趋势与季节性",
    factKinds: ["daily_ops_json", "ledger_days"],
  },
  {
    id: "meal_period",
    group: "daily_ops",
    label: "餐段（午/晚/夜…）",
    required: "hard",
    experts: ["finance", "marketing", "experience"],
    why: "餐厅经营以餐段为基本生产单位",
    factKinds: ["meal_period_mix", "daily_ops_json"],
  },
  {
    id: "guests",
    group: "daily_ops",
    label: "来客数",
    required: "hard",
    experts: ["finance", "marketing", "experience"],
    why: "客流是增长与体验压力的共同输入",
    factKinds: ["daily_ops_json"],
  },
  {
    id: "avg_ticket",
    group: "daily_ops",
    label: "人均消费",
    required: "hard",
    experts: ["finance", "experience", "product"],
    why: "连接定价、结构与顾客价格感知",
    factKinds: ["daily_ops_json", "priceRange"],
  },
  {
    id: "revenue",
    group: "daily_ops",
    label: "营收",
    required: "hard",
    experts: ["finance"],
    why: "经营体检的核心分子",
    factKinds: ["daily_ops_json", "ledger_summary"],
  },
  {
    id: "zone",
    group: "daily_ops",
    label: "区域/厅区",
    required: "strong",
    experts: ["finance", "marketing"],
    why: "看大厅/包厢/外卖谁在贡献、谁在拖累",
    factKinds: ["zone_revenue_mix"],
  },
  {
    id: "cost_expense_profit",
    group: "daily_ops",
    label: "成本/费用/利润",
    required: "strong",
    experts: ["finance"],
    why: "只有营收没有利润结构，财务官只能谈流水",
    factKinds: ["ledger_json", "cost_pressure", "expense_pressure", "profit_pressure"],
  },

  // —— 菜品销售结构（产品官硬门槛）——
  {
    id: "dish_sales",
    group: "dish_sales",
    label: "菜品销售明细（日期×菜名×销量/额）",
    required: "hard",
    experts: ["product", "finance"],
    why: "贡献率、长尾、菜饮结构必须靠销售事实",
    factKinds: ["dish_sales_json", "dish_sales_summary"],
  },
  {
    id: "dish_category",
    group: "dish_sales",
    label: "菜品分类",
    required: "strong",
    experts: ["product"],
    why: "热菜/凉菜/饮品结构决定毛利叙事",
    factKinds: ["dish_sales_json"],
  },
  {
    id: "dish_cost",
    group: "dish_sales",
    label: "单品成本",
    required: "optional",
    experts: ["product", "finance"],
    why: "有成本才能算单品毛利，而不只是流水贡献",
    factKinds: ["dish_sales_json"],
  },

  // —— 菜单主数据 ——
  {
    id: "menu_master",
    group: "menu",
    label: "菜单主数据（品项/售价）",
    required: "hard",
    experts: ["product", "experience"],
    why: "销售结构要挂回可管理的菜单",
    factKinds: ["menu_json", "menu_count"],
  },

  // —— 月度财务补充 ——
  {
    id: "monthly_pnl",
    group: "finance_monthly",
    label: "月度损益汇总",
    required: "optional",
    experts: ["finance"],
    why: "补日明细缺失的费用科目口径",
    factKinds: ["ledger_months", "ledger_json"],
  },

  // —— 运营 KPI（体验官/财务交叉）——
  {
    id: "turnover",
    group: "ops_kpi",
    label: "翻台率体感/档位",
    required: "strong",
    experts: ["experience", "finance"],
    why: "连接客流、餐段时长与桌效",
    factKinds: ["turnover_band"],
  },
  {
    id: "serve_speed",
    group: "ops_kpi",
    label: "上菜速度",
    required: "strong",
    experts: ["experience"],
    why: "体验断裂最常见的可操作点",
    factKinds: ["serve_speed_sense"],
  },
  {
    id: "labor_table_space",
    group: "ops_kpi",
    label: "人效/桌效/平效",
    required: "strong",
    experts: ["finance", "experience"],
    why: "人效与平效决定费用压力是否结构性",
    factKinds: ["labor_efficiency", "table_efficiency", "space_efficiency"],
  },
  {
    id: "staff_churn",
    group: "ops_kpi",
    label: "员工流失",
    required: "optional",
    experts: ["experience"],
    why: "服务稳定性的领先指标",
    factKinds: ["staff_churn"],
  },

  // —— 老板感知 ——
  {
    id: "owner_pain_praise",
    group: "owner_voice",
    label: "常夸/常抱怨",
    required: "strong",
    experts: ["experience", "product"],
    why: "外部评论的先验，用于交叉验证",
    factKinds: ["owner_pain", "owner_praise"],
  },
  {
    id: "peak_guests",
    group: "owner_voice",
    label: "高峰场景 + 主力客群",
    required: "strong",
    experts: ["marketing", "experience"],
    why: "对照实际餐段客流是否匹配定位",
    factKinds: ["peakScene", "mainGuests"],
  },

  // —— 外部证据 ——
  {
    id: "reviews",
    group: "external",
    label: "点评/内容评价样本",
    required: "strong",
    experts: ["experience", "product", "marketing"],
    why: "体验四象限与产品口碑的外部锚",
  },
  {
    id: "competition_map",
    group: "external",
    label: "周边竞争密度",
    required: "optional",
    experts: ["marketing"],
    why: "客流下滑时判断是市场还是自身",
  },
];

export type DataReadiness = {
  score: number;
  hardReady: boolean;
  hardMissing: DataFieldDef[];
  strongMissing: DataFieldDef[];
  byExpert: Record<
    ExpertRole,
    { ready: boolean; missingHard: string[]; missingStrong: string[] }
  >;
  summary: string;
};

function hasFact(
  facts: Array<{ kind: string; claim?: string }> | undefined,
  kinds?: string[],
): boolean {
  if (!kinds?.length) return false;
  return kinds.some((kind) => {
    const hit = facts?.find((f) => f.kind === kind);
    if (!hit) return false;
    const claim = String(hit.claim || "").trim();
    if (!claim || claim === "0" || claim === "[]") return false;
    if (kind === "ledger_days" && Number(claim) < 7) return false;
    if (kind === "dish_sales_rows" && Number(claim) < 8) return false;
    if (kind === "menu_count" && Number(claim) < 1) return false;
    return true;
  });
}

export type DataReadinessContext = {
  brand?: string;
  city?: string;
  category?: string;
};

function fieldPresent(
  field: DataFieldDef,
  facts: Array<{ kind: string; claim?: string }> | undefined,
  evidenceCount: number,
  context?: DataReadinessContext,
): boolean {
  if (field.id === "brand") {
    return Boolean(context?.brand?.trim()) || hasFact(facts, ["brand", "brandName"]);
  }
  if (field.id === "city_category") {
    return (
      Boolean(context?.city?.trim() && context?.category?.trim()) ||
      hasFact(facts, ["city", "category"])
    );
  }
  if (field.id === "reviews") return evidenceCount >= 3;
  if (field.id === "competition_map") {
    return (facts || []).some((f) => /competition|map/i.test(f.kind + f.claim));
  }
  return hasFact(facts, field.factKinds);
}

/** 评估采集就绪度：硬门槛不齐 → 对应专家应拒签 */
export function assessDataReadiness(input: {
  facts?: Array<{ kind: string; claim?: string }>;
  evidenceCount?: number;
  context?: DataReadinessContext;
}): DataReadiness {
  const facts = input.facts || [];
  const evidenceCount = input.evidenceCount || 0;
  const context = input.context;

  // 用更精确的 hard 检测覆盖 catalog 的近似 identity
  const hardExtraMissing: DataFieldDef[] = [];
  if (!hasFact(facts, ["daily_ops_json", "ledger_days"])) {
    const f = DATA_COLLECTION_CATALOG.find((d) => d.id === "daily_date");
    if (f) hardExtraMissing.push(f);
  }

  const hardMissing = DATA_COLLECTION_CATALOG.filter(
    (f) => f.required === "hard" && !fieldPresent(f, facts, evidenceCount, context),
  );
  // 去重
  const hardIds = new Set(hardMissing.map((f) => f.id));
  for (const f of hardExtraMissing) {
    if (!hardIds.has(f.id)) hardMissing.push(f);
  }

  const strongMissing = DATA_COLLECTION_CATALOG.filter(
    (f) => f.required === "strong" && !fieldPresent(f, facts, evidenceCount, context),
  );

  const hardTotal = DATA_COLLECTION_CATALOG.filter((f) => f.required === "hard").length;
  const strongTotal = DATA_COLLECTION_CATALOG.filter((f) => f.required === "strong").length;
  const hardOk = hardTotal - hardMissing.length;
  const strongOk = strongTotal - strongMissing.length;
  const score = Math.round(
    (hardOk / Math.max(1, hardTotal)) * 70 + (strongOk / Math.max(1, strongTotal)) * 30,
  );

  const roles: ExpertRole[] = ["finance", "product", "marketing", "experience"];
  const byExpert = Object.fromEntries(
    roles.map((role) => {
      const missingHard = hardMissing
        .filter((f) => f.experts.includes(role))
        .map((f) => f.label);
      const missingStrong = strongMissing
        .filter((f) => f.experts.includes(role))
        .map((f) => f.label);
      return [
        role,
        {
          ready: missingHard.length === 0,
          missingHard,
          missingStrong,
        },
      ];
    }),
  ) as DataReadiness["byExpert"];

  const hardReady = hardMissing.length === 0;
  return {
    score,
    hardReady,
    hardMissing,
    strongMissing,
    byExpert,
    summary: hardReady
      ? `数据采集就绪度 ${score}%：硬门槛已齐，可出具会审报告`
      : `数据采集就绪度 ${score}%：硬门槛缺失 ${hardMissing.map((f) => f.label).join("、")}，专家将部分拒签`,
  };
}

export function catalogByGroup(): Record<DataFieldGroup, DataFieldDef[]> {
  const groups: DataFieldGroup[] = [
    "identity",
    "daily_ops",
    "dish_sales",
    "menu",
    "finance_monthly",
    "ops_kpi",
    "owner_voice",
    "external",
  ];
  return Object.fromEntries(
    groups.map((g) => [g, DATA_COLLECTION_CATALOG.filter((f) => f.group === g)]),
  ) as Record<DataFieldGroup, DataFieldDef[]>;
}
