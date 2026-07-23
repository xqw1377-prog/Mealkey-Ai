import type { CapabilityDefinition, MKContext } from "@mealkey/agent-sdk";
import { decision, evidence } from "./_shared";

export const brandTonalityCapability: CapabilityDefinition = {
  id: "brand_tonality",
  name: "品牌调性",
  description: "基于差异化方向定义品牌价值主张、人格、视觉与传播调性",
  domain: "strategy",
  inputSchema: { type: "object", properties: {} },
  outputSchema: { type: "object", properties: { valueProposition: { type: "string" } } },

  async execute(_input: unknown, context: MKContext) {
    return decision({
      idPrefix: "brand_tonality",
      problem: `${context.project.name || "项目"} 品牌调性`,
      observation: "品牌调性由 LLM 完成",
      diagnosis: "品牌调性分析（LLM 驱动）",
      judgement: "品牌调性分析完成",
      strategy: "由 LLM 生成的品牌调性策略",
      action: "输出品牌调性板与传播建议",
      confidence: 0.5,
      evidence: [evidence("fallback", "规则回落", 0.5)],
    });
  },
};
