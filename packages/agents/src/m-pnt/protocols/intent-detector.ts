/**
 * Positioning intent detection — mirror for mother-body intent-detector.ts
 * Merge into @mealkey/core when integrating.
 */

const POSITIONING_PATTERN =
  /定位|品牌定位|品牌|品类|做什么菜|什么品类|差异化|定位策略|心智|客群画像|价格带|开什么店|做什么类型/;

export function detectPositioningIntent(message: string): boolean {
  if (!message || !message.trim()) return false;
  return POSITIONING_PATTERN.test(message.toLowerCase());
}

/**
 * ProblemUnderstanding fallback mapping fragment.
 * Returns capability hints when message looks like positioning.
 */
export function mapPositioningProblem(message: string): {
  realProblem: string;
  capabilities: string[];
} | null {
  if (!detectPositioningIntent(message)) return null;
  return {
    realProblem: "positioning_strategy",
    capabilities: [
      "positioning",
      "brand",
      "market_analysis",
      "category_analysis",
      "customer_portrait",
      "price_positioning",
      "competitor_analysis",
      "differentiation",
      "brand_tonality",
    ],
  };
}
