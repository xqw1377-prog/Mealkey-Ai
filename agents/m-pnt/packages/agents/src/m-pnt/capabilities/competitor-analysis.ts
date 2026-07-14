import type { CapabilityDefinition, MKContext } from "@mealkey/agent-sdk";
import { decision, evidence } from "./_shared";

export const competitorAnalysisCapability: CapabilityDefinition = {
  id: "competitor_analysis",
  name: "竞品分析",
  description: "梳理直接/间接竞争、壁垒与差异化空位",
  domain: "analysis",
  inputSchema: { type: "object", properties: {} },
  outputSchema: { type: "object", properties: { whiteSpace: { type: "string" } } },

  async execute(_input: unknown, context: MKContext) {
    return decision({
      idPrefix: "competitor_analysis",
      problem: `${context.project.name || "项目"} 竞争分析`,
      observation: "竞争分析由 LLM 完成",
      diagnosis: "竞争分析（LLM 驱动）",
      judgement: "竞争分析完成",
      strategy: "由 LLM 生成的竞争策略",
      action: "确认竞品心智地图与差异化空位",
      confidence: 0.5,
      evidence: [evidence("fallback", "规则回落", 0.5)],
    });
  },
};
