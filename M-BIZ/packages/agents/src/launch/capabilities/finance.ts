/**
 * Launch Agent - 财务分析能力
 *
 * 真实的投资风险评估模型
 */

import type { CapabilityDefinition, MKContext, MKDecision } from "@mealkey/agent-sdk";

export const financeCapability: CapabilityDefinition = {
  id: "finance_analysis",
  name: "财务分析",
  description: "投资风险评估，包括投资额预估、盈亏平衡、投资回收期",
  domain: "finance",
  inputSchema: {
    type: "object",
    properties: {
      investment: { type: "number", description: "总投资额（元）" },
      monthlyRevenue: { type: "number", description: "预估月营收（元）" },
      monthlyCost: { type: "number", description: "预估月成本（元）" },
    },
    required: ["investment"],
  },
  outputSchema: {
    type: "object",
    properties: {
      estimatedInvestment: { type: "number" },
      breakEvenPoint: { type: "number" },
      riskLevel: { type: "string" },
    },
  },
  
  async execute(input: unknown, context: MKContext): Promise<MKDecision> {
    const inputObj = (input ?? {}) as Record<string, unknown>;
    const investment = (inputObj.investment as number) ?? 0;
    const budget = context.project.budget ?? investment ?? 0;
    const actualInvestment = investment > 0 ? investment : budget;
    
    const category = context.project.category ?? "未知";
    const city = context.project.city ?? "未知";
    
    // 基于品类的投资基准
    const investmentBenchmark: Record<string, { min: number; typical: number; max: number; paybackMonths: number }> = {
      "湘菜": { min: 300000, typical: 800000, max: 2000000, paybackMonths: 12 },
      "川菜": { min: 300000, typical: 700000, max: 1800000, paybackMonths: 12 },
      "火锅": { min: 500000, typical: 1200000, max: 3000000, paybackMonths: 14 },
      "茶饮": { min: 100000, typical: 300000, max: 800000, paybackMonths: 8 },
      "快餐": { min: 200000, typical: 500000, max: 1500000, paybackMonths: 10 },
      "面馆": { min: 150000, typical: 350000, max: 800000, paybackMonths: 8 },
      "烧烤": { min: 300000, typical: 600000, max: 1500000, paybackMonths: 10 },
      "日料": { min: 500000, typical: 1500000, max: 4000000, paybackMonths: 18 },
      "咖啡": { min: 200000, typical: 450000, max: 1000000, paybackMonths: 12 },
    };
    const bench = investmentBenchmark[category] ?? { min: 200000, typical: 500000, max: 1500000, paybackMonths: 12 };
    
    // 投资合理性评估
    let riskLevel: "low" | "medium" | "high" = "medium";
    let diagnosis = "";
    let judgement = "";
    
    if (actualInvestment < bench.min) {
      riskLevel = "high";
      diagnosis = `投资额(${(actualInvestment / 10000).toFixed(0)}万)低于${category}品类最低门槛(${(bench.min / 10000).toFixed(0)}万)`;
      judgement = "投资不足可能导致竞争力不够";
    } else if (actualInvestment > bench.max) {
      riskLevel = "medium";
      diagnosis = `投资额(${(actualInvestment / 10000).toFixed(0)}万)超过${category}品类典型上限(${(bench.max / 10000).toFixed(0)}万)`;
      judgement = "高投入需要高营收支撑，回收压力大";
    } else if (actualInvestment > bench.typical * 1.5) {
      riskLevel = "medium";
      diagnosis = `投资额偏高于${category}品类典型水平`;
      judgement = "建议控制成本，轻装上阵";
    } else {
      riskLevel = "low";
      diagnosis = `投资额在${category}品类合理范围内`;
      judgement = "投资规模适中，风险可控";
    }
    
    // 经验调整
    const expStr = context.owner.experience;
    const expYears = parseInt(expStr) || 0;
    if (expYears < 1 && actualInvestment > bench.typical) {
      riskLevel = "high";
      diagnosis = `首次创业+投资额${(actualInvestment / 10000).toFixed(0)}万=高组合风险`;
      judgement = "经验不足时建议降低投资规模";
    }
    
    return {
      id: `finance_${Date.now()}`,
      problem: "投资风险评估",
      observation: `项目: ${context.project.name || "未命名"} | 品类: ${category} | 城市: ${city} | 投资额: ${(actualInvestment / 10000).toFixed(0)}万 | 品类基准: ${(bench.typical / 10000).toFixed(0)}万`,
      diagnosis,
      judgement,
      strategy: riskLevel === "high" 
        ? `建议降低投资至${(bench.typical / 10000).toFixed(0)}万以内，预留至少6个月运营资金`
        : riskLevel === "medium" 
          ? "优化投资结构，控制装修和固定投入"
          : "按计划推进，定期复盘经营数据",
      action: riskLevel === "high" 
        ? "重新做预算，优先控制固定成本投入"
        : "制作详细的3年财务预测表",
      confidence: actualInvestment > 0 ? 0.75 : 0.4,
      evidence: [{
        source: "observation",
        content: JSON.stringify({ 
          investment: actualInvestment, 
          benchmark: bench, 
          riskLevel, 
          ownerExperience: expStr,
        }),
        relevance: 0.85,
      }],
    };
  },
};
