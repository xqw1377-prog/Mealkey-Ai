/**
 * 经营模型库 — 扩展模型 (0008-0015)
 *
 * 覆盖：现金流预测、库存周转、员工排班优化、LTV计算、营销ROI
 */
import type { BusinessModel } from "../types";

export const EXTENDED_MODELS: BusinessModel[] = [
  // ═══════════════════════════════════════════
  // 现金流预测模型
  // ═══════════════════════════════════════════
  {
    id: "MK-MODEL-0008",
    name: "现金流预测模型",
    category: "finance",
    description: "预测未来6个月的现金流变化",
    parameters: [
      { name: "monthlyRevenue", description: "月营业收入", unit: "万" },
      { name: "monthlyCost", description: "月运营成本", unit: "万" },
      { name: "currentCash", description: "当前现金储备", unit: "万" },
      { name: "initialInvestment", description: "初始投资", unit: "万" },
    ],
    formula: "currentCash + initialInvestment + (monthlyRevenue - monthlyCost) * 6",
    benchmarks: {
      minCashReserve: 6, // 至少6个月运营资金
    },
    applicableScenarios: ["财务规划", "风险评估"],
    source: "财务模型",
  },

  // ═══════════════════════════════════════════
  // 库存周转模型
  // ═══════════════════════════════════════════
  {
    id: "MK-MODEL-0009",
    name: "库存周转模型",
    category: "operations",
    description: "计算库存周转天数和最优库存水平",
    parameters: [
      { name: "monthlyCOGS", description: "月食材成本", unit: "万" },
      { name: "avgInventory", description: "平均库存价值", unit: "万" },
    ],
    formula: "avgInventory / (monthlyCOGS / 30)",
    benchmarks: {
      turnoverDays: 7, // 7天为健康
    },
    applicableScenarios: ["成本优化", "库存管理"],
    source: "经营模型",
  },

  // ═══════════════════════════════════════════
  // 员工排班优化模型
  // ═══════════════════════════════════════════
  {
    id: "MK-MODEL-0010",
    name: "人效优化模型",
    category: "operations",
    description: "计算最优员工排班和人力成本",
    parameters: [
      { name: "monthlyRevenue", description: "月营业收入", unit: "万" },
      { name: "staffCount", description: "员工人数", unit: "人" },
      { name: "avgSalary", description: "平均月薪", unit: "元" },
    ],
    formula: "staffCount * avgSalary / (monthlyRevenue * 10000)",
    benchmarks: {
      laborCostRatio: 0.25, // 人力成本率不超过25%
    },
    applicableScenarios: ["人力成本评估", "排班优化"],
    source: "经营模型",
  },

  // ═══════════════════════════════════════════
  // 顾客生命周期价值(LTV)模型
  // ═══════════════════════════════════════════
  {
    id: "MK-MODEL-0011",
    name: "顾客LTV模型",
    category: "marketing",
    description: "计算单个顾客的长期价值",
    parameters: [
      { name: "avgTicket", description: "客单价", unit: "元" },
      { name: "monthlyFrequency", description: "月消费频次", unit: "次" },
      { name: "avgLifespan", description: "平均客户生命周期", unit: "月" },
      { name: "grossMargin", description: "毛利率", unit: "%" },
    ],
    formula: "avgTicket * monthlyFrequency * avgLifespan * (grossMargin / 100)",
    benchmarks: {
      ltvTarget: 3000, // 3年LTV目标3000元
    },
    applicableScenarios: ["营销策略", "客户运营"],
    source: "经营模型",
  },

  // ═══════════════════════════════════════════
  // 营销ROI模型
  // ═══════════════════════════════════════════
  {
    id: "MK-MODEL-0012",
    name: "营销ROI模型",
    category: "marketing",
    description: "计算营销活动的投资回报率",
    parameters: [
      { name: "marketingCost", description: "营销投入", unit: "元" },
      { name: "newCustomers", description: "新增顾客数", unit: "人" },
      { name: "avgCustomerValue", description: "平均顾客价值", unit: "元" },
    ],
    formula: "(newCustomers * avgCustomerValue - marketingCost) / marketingCost",
    benchmarks: {
      roiTarget: 3, // ROI目标3倍以上
    },
    applicableScenarios: ["营销评估", "预算分配"],
    source: "经营模型",
  },

  // ═══════════════════════════════════════════
  // 开店选址评分模型
  // ═══════════════════════════════════════════
  {
    id: "MK-MODEL-0013",
    name: "选址评分模型",
    category: "location",
    description: "综合评估选址位置的商业价值",
    parameters: [
      { name: "dailyFootfall", description: "日均人流量", unit: "人" },
      { name: "passingRate", description: "进店率", unit: "%" },
      { name: "avgTicket", description: "预估客单价", unit: "元" },
      { name: "monthlyRent", description: "月租金", unit: "万" },
      { name: "competitionScore", description: "竞争强度评分", unit: "分" },
    ],
    formula: "dailyFootfall * (passingRate / 100) * avgTicket * 30 / (monthlyRent * 10000 + competitionScore)",
    benchmarks: {
      locationScore: 5, // 评分5以上为优质位置
    },
    applicableScenarios: ["选址决策", "投资评估"],
    source: "经营模型",
  },

  // ═══════════════════════════════════════════
  // 菜品毛利分析模型
  // ═══════════════════════════════════════════
  {
    id: "MK-MODEL-0014",
    name: "菜品毛利分析模型",
    category: "product",
    description: "计算每道菜品的毛利率和贡献度",
    parameters: [
      { name: "sellingPrice", description: "售价", unit: "元" },
      { name: "foodCost", description: "食材成本", unit: "元" },
      { name: "laborCostPerDish", description: "人工成本", unit: "元" },
      { name: "monthlySales", description: "月销量", unit: "份" },
    ],
    formula: "(sellingPrice - foodCost - laborCostPerDish) * monthlySales",
    benchmarks: {
      grossMarginTarget: 0.6, // 目标毛利率60%
      monthlyContribution: 5000, // 单品月贡献利润目标5000元
    },
    applicableScenarios: ["菜单优化", "定价策略"],
    source: "经营模型",
  },

  // ═══════════════════════════════════════════
  // 多店扩张可行性模型
  // ═══════════════════════════════════════════
  {
    id: "MK-MODEL-0015",
    name: "扩张可行性模型",
    category: "strategy",
    description: "评估是否具备扩张条件",
    parameters: [
      { name: "firstStoreMonths", description: "首店运营月数", unit: "月" },
      { name: "profitMonths", description: "连续盈利月数", unit: "月" },
      { name: "standardizationScore", description: "标准化程度", unit: "分" },
      { name: "managementCapacity", description: "管理团队能力", unit: "分" },
      { name: "cashReserve", description: "可动用现金", unit: "万" },
    ],
    formula: "(profitMonths / firstStoreMonths) * (standardizationScore + managementCapacity) / 2 * (cashReserve / 10)",
    benchmarks: {
      expansionScore: 60, // 60分以上可考虑扩张
    },
    applicableScenarios: ["扩张决策", "战略规划"],
    source: "经营模型",
  },
];
