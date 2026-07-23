import { claimMatchesTheme } from "../reasoning/helpers";
import type { EngineAnalysis, EngineContext } from "./types";

export function analyzeProductIntelligence({
  evidence,
}: EngineContext): EngineAnalysis {
  const productPositive = evidence.filter(
    (item) =>
      (claimMatchesTheme(item.claim, "product", item.theme) || item.theme === "product") &&
      item.sentiment === "positive",
  );
  const productNegative = evidence.filter(
    (item) =>
      (claimMatchesTheme(item.claim, "product", item.theme) || item.theme === "product") &&
      item.sentiment === "negative",
  );
  const mentions = productPositive.length + productNegative.length;
  const level =
    productNegative.length >= 2 ? "attention" : productPositive.length >= 2 ? "healthy" : mentions > 0 ? "observe" : "observe";

  return {
    dimension: "product",
    level,
    finding:
      productNegative.length > productPositive.length
        ? "产品稳定性开始出现波动"
        : productPositive.length > 0
          ? "招牌产品仍在形成正向记忆点"
          : "当前样本不足以判断产品竞争力",
    meaning:
      productNegative.length > productPositive.length
        ? "如果负向继续增加，菜单吸引力和招牌记忆会被削弱"
        : productPositive.length > 0
          ? "产品当前不是主要拖累项，但仍需观察新品与第二增长点"
          : "产品维度仍缺少足够样本支撑深入诊断",
    observed:
      mentions > 0
        ? `产品相关正向 ${productPositive.length} 条，负向 ${productNegative.length} 条`
        : "当前样本中产品讨论较少",
    confidence: Math.min(0.82, 0.35 + mentions * 0.12),
    evidenceIds: productPositive
      .concat(productNegative)
      .map((item, index) => item.id || `product-${index}`)
      .slice(0, 6),
    watchHint: "结合菜单销量与评论高频菜名，判断是否存在爆品衰减",
    hypotheses: [
      {
        statement: "招牌产品仍是当前门店的主要记忆资产",
        probability: productPositive.length >= productNegative.length ? 0.62 : 0.28,
        supportingEvidence: productPositive.map((item) => item.id || item.claim).slice(0, 4),
        contradictEvidence: productNegative.map((item) => item.id || item.claim).slice(0, 2),
        validationPlan: ["比对招牌菜提及频率与门店主推菜是否一致"],
      },
      {
        statement: "新品或非招牌产品尚未形成第二增长点",
        probability: 0.46,
        supportingEvidence: productNegative.map((item) => item.id || item.claim).slice(0, 2),
        validationPlan: ["检查评论中是否反复只提及少数招牌菜"],
      },
    ],
    rawEvidence: productPositive.concat(productNegative).slice(0, 6),
  };
}
