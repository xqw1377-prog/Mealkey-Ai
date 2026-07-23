/**
 * Launch Agent - 经营诊断能力
 *
 * 分析餐饮经营指标，对比行业基准，给出诊断结果。
 */

import type { CapabilityDefinition, MKContext, MKDecision } from "@mealkey/agent-sdk";

export const diagnosisCapability: CapabilityDefinition = {
  id: "business_diagnosis",
  name: "经营诊断",
  description: "分析餐饮经营指标数据，对比行业基准，给出诊断结果和改进建议",
  domain: "operation",
  inputSchema: {
    type: "object",
    properties: {
      metrics: {
        type: "object",
        description: "经营指标数据",
        properties: {
          revenue: { type: "number", description: "月营收（元）" },
          cost: {
            type: "object",
            description: "成本结构",
            properties: {
              food: { type: "number", description: "食材成本（元）" },
              labor: { type: "number", description: "人力成本（元）" },
              rent: { type: "number", description: "租金（元）" },
            },
          },
          customerCount: { type: "number", description: "月客流量" },
          avgTicket: { type: "number", description: "客单价（元）" },
        },
      },
      focus: {
        type: "string",
        enum: ["cost", "revenue", "labor", "menu", "overall"],
        description: "分析焦点",
      },
    },
    required: ["metrics"],
  },
  outputSchema: {
    type: "object",
    properties: {
      indicators: { type: "object" },
      benchmarks: { type: "object" },
      warnings: { type: "array" },
    },
  },

  async execute(input: unknown, context: MKContext): Promise<MKDecision> {
    const inputObj = (input ?? {}) as Record<string, unknown>;
    const metrics = (inputObj.metrics as Record<string, unknown>)
      ?? ((context.project.profile as Record<string, unknown>)?.metrics as Record<string, unknown>)
      ?? {};

    const revenue = (metrics.revenue as number) ?? 0;
    const cost = (metrics.cost as Record<string, number>) ?? {};
    const foodCost = cost.food ?? 0;
    const laborCost = cost.labor ?? 0;
    const rentCost = cost.rent ?? 0;

    const foodCostRate = revenue > 0 ? Math.round((foodCost / revenue) * 1000) / 10 : null;
    const laborCostRate = revenue > 0 ? Math.round((laborCost / revenue) * 1000) / 10 : null;
    const rentRate = revenue > 0 ? Math.round((rentCost / revenue) * 1000) / 10 : null;

    const warnings: string[] = [];
    if (foodCostRate !== null && foodCostRate > 35) warnings.push("食材成本率过高");
    if (laborCostRate !== null && laborCostRate > 25) warnings.push("人力成本率过高");
    if (rentRate !== null && rentRate > 15) warnings.push("租金成本率过高");

    const indicators = {
      foodCostRate: foodCostRate !== null ? `${foodCostRate}%` : null,
      laborCostRate: laborCostRate !== null ? `${laborCostRate}%` : null,
      rentRate: rentRate !== null ? `${rentRate}%` : null,
    };

    return {
      id: `diagnosis_${Date.now()}`,
      problem: "经营诊断分析",
      observation: `项目 ${context.project.name} 经营指标分析`,
      diagnosis: warnings.length > 0 ? `发现 ${warnings.length} 个问题` : "经营状况良好",
      judgement: warnings.length > 0 ? "需要关注经营风险" : "健康运营",
      strategy: "根据诊断结果优化",
      action: warnings.join("; ") || "继续保持",
      confidence: revenue > 0 ? 0.8 : 0.5,
      evidence: [{
        source: "observation",
        content: JSON.stringify({ indicators, revenue, warnings }),
        relevance: 1,
      }],
    };
  },
};
