import type { CapabilityDefinition, MKContext } from "@mealkey/agent-sdk";
import {
  budgetNumber,
  categoryBenchmark,
  decision,
  evidence,
  projectLabel,
} from "./_shared";

export const pricePositioningCapability: CapabilityDefinition = {
  id: "price_positioning",
  name: "价格带定位",
  description: "结合品类基准、客群与成本结构给出价格带与盈利模型建议",
  domain: "strategy",
  inputSchema: {
    type: "object",
    properties: {
      category: { type: "string" },
      targetAsp: { type: "number" },
      previousSummary: { type: "string" },
    },
  },
  outputSchema: {
    type: "object",
    properties: {
      recommendedAsp: { type: "object" },
      band: { type: "string" },
      costModel: { type: "object" },
    },
  },

  async execute(input: unknown, context: MKContext) {
    const params = (input || {}) as Record<string, unknown>;
    const category =
      String(params.category || context.project.category || "餐饮").trim();
    const city = context.project.city || "目标城市";
    const bench = categoryBenchmark(category);
    const budget = budgetNumber(context);
    const [low, high] = bench.priceBand;
    const midLow = Math.round(low + (high - low) * 0.35);
    const midHigh = Math.round(low + (high - low) * 0.65);

    let band = "中端";
    let recommended = { min: midLow, max: midHigh, anchor: Math.round((midLow + midHigh) / 2) };

    if (budget !== undefined && budget < 40) {
      band = "中低端";
      recommended = {
        min: low,
        max: midLow,
        anchor: Math.round((low + midLow) / 2),
      };
    } else if (budget !== undefined && budget >= 150) {
      band = "中高端";
      recommended = {
        min: midHigh,
        max: high,
        anchor: Math.round((midHigh + high) / 2),
      };
    }

    if (typeof params.targetAsp === "number") {
      recommended.anchor = params.targetAsp as number;
    }

    const costModel = {
      foodCost: "30-35%",
      labor: "20-25%",
      rent: "10-15%",
      note: "倒推毛利时优先守住食材成本上限，再谈体验加价",
    };

    const observation = `${bench.label} 在 ${city} 的参考客单价带 ${low}-${high} 元；结合预算与客群，建议锚定「${band}」区间。`;
    const diagnosis =
      "价格带不是越高越有品牌感。价格必须同时满足：客群付得起、成本撑得住、与差异化承诺一致。";
    const judgement = `建议客单价锚点约 ${recommended.anchor} 元（区间 ${recommended.min}-${recommended.max} 元），定位为${band}。`;

    return decision({
      idPrefix: "price_positioning",
      problem: `${projectLabel(context)} 价格带定位`,
      observation,
      diagnosis,
      judgement,
      strategy: `用「锚点菜 + 组合套餐」落价格带，而不是全菜单均价漂移。成本模型参考：食材 ${costModel.foodCost} / 人力 ${costModel.labor} / 租金 ${costModel.rent}。`,
      action: `按锚点 ${recommended.anchor} 元设计 3 个主力套餐，测算毛利；与同城 5 家竞品做价格带对标表。`,
      confidence: 0.72,
      evidence: [
        evidence("pricing_benchmark", observation, 0.85),
        evidence("cost_model", JSON.stringify(costModel), 0.75),
      ],
      payload: {
        band,
        recommendedAsp: recommended,
        costModel,
        categoryBenchmarkBand: bench.priceBand,
      },
    });
  },
};
