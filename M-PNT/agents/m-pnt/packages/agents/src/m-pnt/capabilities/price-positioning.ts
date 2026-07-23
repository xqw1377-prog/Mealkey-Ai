import type { CapabilityDefinition, MKContext } from "@mealkey/agent-sdk";
import { decision, evidence } from "./_shared";

export const pricePositioningCapability: CapabilityDefinition = {
  id: "price_positioning",
  name: "价格带定位",
  description: "结合品类基准、客群与成本结构给出价格带与盈利模型建议",
  domain: "strategy",
  inputSchema: { type: "object", properties: {} },
  outputSchema: { type: "object", properties: { recommendedAsp: { type: "object" } } },

  async execute(_input: unknown, context: MKContext) {
    return decision({
      idPrefix: "price_positioning",
      problem: `${context.project.name || "项目"} 价格带定位`,
      observation: "价格分析由 LLM 完成",
      diagnosis: "价格带定位分析（LLM 驱动）",
      judgement: "价格带定位完成",
      strategy: "由 LLM 生成的价格策略",
      action: "确认价格带与盈利模型",
      confidence: 0.5,
      evidence: [evidence("fallback", "规则回落", 0.5)],
    });
  },
};
