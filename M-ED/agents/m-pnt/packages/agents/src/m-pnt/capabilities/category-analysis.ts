import type { CapabilityDefinition, MKContext } from "@mealkey/agent-sdk";
import { decision, evidence, projectLabel as _p } from "./_shared";

/** 品类分析 — LLM 驱动，空实现作回落 */
export const categoryAnalysisCapability: CapabilityDefinition = {
  id: "category_analysis",
  name: "品类分析",
  description: "评估目标品类在城市市场中的容量、生命周期、饱和度与资源匹配度",
  domain: "analysis",
  inputSchema: { type: "object", properties: { category: { type: "string" }, city: { type: "string" } } },
  outputSchema: { type: "object", properties: { lifecycle: { type: "string" }, conclusion: { type: "string" } } },

  async execute(_input: unknown, context: MKContext) {
    return decision({
      idPrefix: "category_analysis",
      problem: `${context.project.name || context.project.category || "项目"} 品类分析`,
      observation: `${context.project.city || "目标城市"} · ${context.project.category || "餐饮"}品类分析`,
      diagnosis: "品类分析由 LLM 完成，此处为规则回落占位",
      judgement: `品类分析完成（详见 LLM 输出）`,
      strategy: "由 LLM 生成的品类策略",
      action: "由 LLM 生成的具体行动",
      confidence: 0.5,
      evidence: [evidence("fallback", "规则回落模式", 0.5)],
    });
  },
};
