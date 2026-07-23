import type { LLMAdapter, LLMResponse } from "./types";

/**
 * Deterministic mock LLM for tests — returns a valid MKDecision JSON.
 */
export function createMockLlm(
  override?: Partial<{
    judgement: string;
    confidence: number;
  }>,
): LLMAdapter {
  return {
    async chat(): Promise<LLMResponse> {
      const body = {
        problem: "品牌定位策略",
        observation: "Mock LLM 观察：目标市场存在场景空位",
        diagnosis: "Mock 诊断：需要单一心智锚而非大而全",
        judgement:
          override?.judgement ||
          "Mock 判断：聚焦周末家庭聚餐场景的心智第一",
        strategy: "Mock 策略：菜单减法 + 场景话术 + 30天验证",
        action: "Mock 行动：本周完成主场景转述测试",
        confidence: override?.confidence ?? 0.81,
        evidence: [
          {
            source: "mock",
            content: "unit-test mock llm",
            relevance: 0.9,
          },
        ],
      };
      return { content: JSON.stringify(body), toolCalls: [] };
    },
  };
}
