/**
 * 经营模型库
 * 
 * 餐饮经营的核心计算模型
 */

import type { BusinessModel } from "../types";

export const BUSINESS_MODELS: BusinessModel[] = [
  // ═══════════════════════════════════════════
  // 投资回报模型
  // ═══════════════════════════════════════════
  {
    id: "MK-MODEL-0001",
    name: "投资回报模型",
    category: "investment",
    description: "计算投资回收期和投资回报率",
    parameters: [
      { name: "investment", description: "总投资额", unit: "万" },
      { name: "monthlyProfit", description: "月净利润", unit: "万" },
    ],
    formula: "investment / monthlyProfit",
    benchmarks: {
      paybackPeriod: 18, // 18个月为健康
    },
    applicableScenarios: ["投资决策", "项目评估"],
    source: "行业基准",
  },

  // ═══════════════════════════════════════════
  // 坪效模型
  // ═══════════════════════════════════════════
  {
    id: "MK-MODEL-0002",
    name: "坪效模型",
    category: "operations",
    description: "计算每平方米产生的营业额",
    parameters: [
      { name: "revenue", description: "月营业额", unit: "万" },
      { name: "area", description: "面积", unit: "㎡" },
    ],
    formula: "revenue / area",
    benchmarks: {
      efficiency: 0.15, // 0.15万/㎡为健康
    },
    applicableScenarios: ["运营评估", "选址分析"],
    source: "行业基准",
  },

  // ═══════════════════════════════════════════
  // 人效模型
  // ═══════════════════════════════════════════
  {
    id: "MK-MODEL-0003",
    name: "人效模型",
    category: "operations",
    description: "计算每个员工创造的营业额",
    parameters: [
      { name: "revenue", description: "月营业额", unit: "万" },
      { name: "staffCount", description: "员工人数", unit: "人" },
    ],
    formula: "revenue / staffCount",
    benchmarks: {
      efficiency: 3, // 3万/人为健康
    },
    applicableScenarios: ["人力成本评估", "运营优化"],
    source: "行业基准",
  },

  // ═══════════════════════════════════════════
  // 盈亏平衡模型
  // ═══════════════════════════════════════════
  {
    id: "MK-MODEL-0004",
    name: "盈亏平衡模型",
    category: "finance",
    description: "计算达到盈亏平衡需要的营业额",
    parameters: [
      { name: "fixedCost", description: "固定成本（租金+人工+折旧）", unit: "万" },
      { name: "variableCostRatio", description: "变动成本率（食材+耗材）", unit: "%" },
    ],
    formula: "fixedCost / (1 - variableCostRatio / 100)",
    benchmarks: {
      breakEvenRevenue: 0, // 需要根据具体项目计算
    },
    applicableScenarios: ["财务规划", "风险评估"],
    source: "财务模型",
  },

  // ═══════════════════════════════════════════
  // 客单价模型
  // ═══════════════════════════════════════════
  {
    id: "MK-MODEL-0005",
    name: "客单价模型",
    category: "pricing",
    description: "基于成本和目标利润计算合理客单价",
    parameters: [
      { name: "foodCostPerPerson", description: "人均食材成本", unit: "元" },
      { name: "targetFoodCostRatio", description: "目标食材成本率", unit: "%" },
    ],
    formula: "foodCostPerPerson / (targetFoodCostRatio / 100)",
    benchmarks: {
      priceRange: 0, // 需要根据品类确定
    },
    applicableScenarios: ["定价策略", "菜单设计"],
    source: "经营模型",
  },

  // ═══════════════════════════════════════════
  // 翻台率模型
  // ═══════════════════════════════════════════
  {
    id: "MK-MODEL-0006",
    name: "翻台率模型",
    category: "operations",
    description: "计算翻台率和最大接待能力",
    parameters: [
      { name: "seats", description: "座位数", unit: "个" },
      { name: "avgDiningTime", description: "平均用餐时间", unit: "分钟" },
      { name: "operatingHours", description: "营业时间", unit: "小时" },
      { name: "customerCount", description: "日客流量", unit: "人" },
    ],
    formula: "customerCount / seats",
    benchmarks: {
      turnoverRate: 2, // 2次/天为健康
    },
    applicableScenarios: ["运营优化", "扩容评估"],
    source: "行业基准",
  },

  // ═══════════════════════════════════════════
  // 租金承受力模型
  // ═══════════════════════════════════════════
  {
    id: "MK-MODEL-0007",
    name: "租金承受力模型",
    category: "location",
    description: "基于预期营业额计算可承受的租金",
    parameters: [
      { name: "expectedRevenue", description: "预期月营业额", unit: "万" },
      { name: "targetRentRatio", description: "目标租金占比", unit: "%" },
    ],
    formula: "expectedRevenue * targetRentRatio / 100",
    benchmarks: {
      maxRentRatio: 15, // 租金占比不超过15%
    },
    applicableScenarios: ["选址决策", "租金谈判"],
    source: "行业基准",
  },
];

/**
 * 根据场景查找模型
 */
export function findModelsByScenario(
  scenario: string,
  models: BusinessModel[] = BUSINESS_MODELS
): BusinessModel[] {
  return models.filter(model =>
    model.applicableScenarios.some(s =>
      s.includes(scenario) || scenario.includes(s)
    )
  );
}

/**
 * 根据ID查找模型
 */
export function findModelById(
  id: string,
  models: BusinessModel[] = BUSINESS_MODELS
): BusinessModel | undefined {
  return models.find(model => model.id === id);
}
