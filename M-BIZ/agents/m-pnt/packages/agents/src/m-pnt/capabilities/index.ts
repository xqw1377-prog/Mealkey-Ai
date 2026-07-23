import type { CapabilityDefinition } from "@mealkey/agent-sdk";
import { brandTonalityCapability as brandTonalityHeuristic } from "./brand-tonality";
import { categoryAnalysisCapability as categoryAnalysisHeuristic } from "./category-analysis";
import { competitorAnalysisCapability as competitorAnalysisHeuristic } from "./competitor-analysis";
import { customerPortraitCapability as customerPortraitHeuristic } from "./customer-portrait";
import { differentiationCapability as differentiationHeuristic } from "./differentiation";
import { pricePositioningCapability as pricePositioningHeuristic } from "./price-positioning";
import { withMealKeyLlm, buildDefaultLLMPrompt } from "../llm/with-llm";
import { buildThreeTheoryEvalPrompt } from "../llm/llm-context";

/**
 * MealKey 生态下的 Capability 定义
 *
 * 所有 Capability 默认由 LLM 驱动（withMealKeyLlm），
 * 启发式引擎仅作为 LLM 失败时的结构化回落。
 *
 * 每个 Capability 在运行时自动注入：
 * - 品类竞争数据（market-intel）
 * - 市场情报上下文
 * - 经营者信息
 */

export const categoryAnalysisCapability = withMealKeyLlm(
  categoryAnalysisHeuristic,
  (input, ctx) => buildDefaultLLMPrompt(
    "品类分析",
    ["市场容量与增长趋势", "品类生命周期（导入/成长/成熟/衰退）", "品类竞争饱和度", "与经营者资源匹配度", "标准化与复制难度"],
    input,
    ctx,
  ),
);

export const customerPortraitCapability = withMealKeyLlm(
  customerPortraitHeuristic,
  (input, ctx) => buildDefaultLLMPrompt(
    "客群画像",
    ["核心心智客户（谁买单、谁传播、谁反复想起）", "消费场景（真、频、可记）", "消费能力与客单价接受范围", "消费决策因素", "避免客群过宽"],
    input,
    ctx,
  ),
);

export const pricePositioningCapability = withMealKeyLlm(
  pricePositioningHeuristic,
  (input, ctx) => buildDefaultLLMPrompt(
    "价格带定位",
    ["品类价格带分布", "目标客群付费意愿", "成本结构倒推（食材30-35%、人力20-25%、租金10-15%）", "竞争定价对标", "建议价格带与盈利模型"],
    input,
    ctx,
  ),
);

export const competitorAnalysisCapability = withMealKeyLlm(
  competitorAnalysisHeuristic,
  (input, ctx) => buildDefaultLLMPrompt(
    "竞争分析",
    ["直接竞争对手", "间接/场景替代竞争", "各竞品心智锚点与优劣势", "竞争壁垒", "差异化空位（第一联想归谁、我们抢什么）"],
    input,
    ctx,
  ),
);

export const differentiationCapability = withMealKeyLlm(
  differentiationHeuristic,
  (input, ctx) => {
    // 使用新的三理论矩阵 Prompt（含大师级判断框架）
    const { systemContent, userContent } = buildThreeTheoryEvalPrompt(
      ctx.project.category || "餐饮",
      ctx.project.city || "目标城市",
      "候选方向由 LLM 根据上下文生成，请先分析项目情况再生成 3-5 个候选方向进行评估。",
      `经营者: ${ctx.owner.experience || "-"}\n优势: ${JSON.stringify(ctx.owner.strengths)}\n盲区: ${JSON.stringify(ctx.owner.weaknesses)}\n预算: ${ctx.project.budget ?? "-"}万\n品类: ${ctx.project.category || "-"}\n城市: ${ctx.project.city || "-"}\n区域: ${ctx.project.district || "-"}`,
    );
    return {
      systemPromptExtension: systemContent,
      userMessage: userContent,
    };
  },
);

export const brandTonalityCapability = withMealKeyLlm(
  brandTonalityHeuristic,
  (input, ctx) => buildDefaultLLMPrompt(
    "品牌调性",
    ["品牌核心价值主张", "品牌人格和调性", "视觉风格建议", "品牌故事线", "传播策略（可转述优先）"],
    input,
    ctx,
  ),
);

export const mPntCapabilities: CapabilityDefinition[] = [
  categoryAnalysisCapability,
  customerPortraitCapability,
  pricePositioningCapability,
  competitorAnalysisCapability,
  differentiationCapability,
  brandTonalityCapability,
];

export function getCapability(id: string): CapabilityDefinition | undefined {
  return mPntCapabilities.find((c) => c.id === id);
}
