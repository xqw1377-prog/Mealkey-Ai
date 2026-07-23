import type { CapabilityDefinition, MKContext } from "@mealkey/agent-sdk";
import { decision, evidence } from "./_shared";

export const customerPortraitCapability: CapabilityDefinition = {
  id: "customer_portrait",
  name: "客群画像",
  description: "定义目标心智客户、消费场景、决策因素与客群规模方向",
  domain: "analysis",
  inputSchema: { type: "object", properties: {} },
  outputSchema: { type: "object", properties: { coreCustomer: { type: "string" } } },

  async execute(_input: unknown, context: MKContext) {
    return decision({
      idPrefix: "customer_portrait",
      problem: `${context.project.name || "项目"} 客群画像`,
      observation: "客群画像由 LLM 完成",
      diagnosis: "客群画像分析（LLM 驱动）",
      judgement: "客群画像分析完成",
      strategy: "由 LLM 生成的客群策略",
      action: "完成目标客群定义与场景分析",
      confidence: 0.5,
      evidence: [evidence("fallback", "规则回落", 0.5)],
    });
  },
};
