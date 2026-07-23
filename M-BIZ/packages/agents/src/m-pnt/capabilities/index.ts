import type { CapabilityDefinition } from "@mealkey/agent-sdk";
import { brandTonalityCapability as brandTonalityHeuristic } from "./brand-tonality";
import { categoryAnalysisCapability as categoryAnalysisHeuristic } from "./category-analysis";
import { competitorAnalysisCapability as competitorAnalysisHeuristic } from "./competitor-analysis";
import { customerPortraitCapability as customerPortraitHeuristic } from "./customer-portrait";
import { differentiationCapability as differentiationHeuristic } from "./differentiation";
import { pricePositioningCapability as pricePositioningHeuristic } from "./price-positioning";
import { defaultCapPrompt, withLlm } from "../llm/with-llm";

export const categoryAnalysisCapability = withLlm(
  categoryAnalysisHeuristic,
  (input, ctx) =>
    defaultCapPrompt(
      "品类分析",
      [
        "市场容量与增长",
        "生命周期",
        "饱和度",
        "与经营者资源匹配",
        "标准化与复制难度",
      ],
      input,
      ctx,
    ),
);

export const customerPortraitCapability = withLlm(
  customerPortraitHeuristic,
  (input, ctx) =>
    defaultCapPrompt(
      "客群画像",
      ["心智客户", "场景", "付费意愿", "决策因素", "避免客群过宽"],
      input,
      ctx,
    ),
);

export const pricePositioningCapability = withLlm(
  pricePositioningHeuristic,
  (input, ctx) =>
    defaultCapPrompt(
      "价格带定位",
      ["品类价格带", "客群付费", "成本倒推", "竞品对标", "盈利模型"],
      input,
      ctx,
    ),
);

export const competitorAnalysisCapability = withLlm(
  competitorAnalysisHeuristic,
  (input, ctx) =>
    defaultCapPrompt(
      "竞争分析",
      ["直接竞品", "间接替代", "心智锚点", "壁垒", "差异化空位"],
      input,
      ctx,
    ),
);

export const differentiationCapability = withLlm(
  differentiationHeuristic,
  (input, ctx) =>
    defaultCapPrompt(
      "差异化策略（含 Ries/Trout/Ye 三理论）",
      [
        "3-5 候选方向",
        "Ries 聚焦/第一",
        "Trout 区隔/第一联想",
        "Ye 场景/落地",
        "禁止平均整合",
      ],
      input,
      ctx,
    ),
);

export const brandTonalityCapability = withLlm(
  brandTonalityHeuristic,
  (input, ctx) =>
    defaultCapPrompt(
      "品牌调性",
      ["价值主张", "人格", "视觉", "故事", "传播（可转述）"],
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
