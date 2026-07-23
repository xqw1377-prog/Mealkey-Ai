import { claimMatchesTheme, clip } from "../reasoning/helpers";
import type { EngineAnalysis, EngineContext } from "./types";

export function analyzeCustomerIntelligence({
  evidence,
}: EngineContext): EngineAnalysis {
  const negative = evidence.filter((item) => item.sentiment === "negative");
  const positive = evidence.filter((item) => item.sentiment === "positive");
  const neutral = evidence.filter((item) => item.sentiment === "neutral");
  const wait = evidence.filter(
    (item) => claimMatchesTheme(item.claim, "wait", item.theme) || item.theme === "wait",
  );
  const product = evidence.filter(
    (item) => claimMatchesTheme(item.claim, "product", item.theme) || item.theme === "product",
  );
  const env = evidence.filter(
    (item) =>
      claimMatchesTheme(item.claim, "environment", item.theme) || item.theme === "environment",
  );
  const negativeRate = evidence.length
    ? Math.round((negative.length / evidence.length) * 100)
    : 0;
  const level =
    negativeRate >= 45 ? "risk" : negativeRate >= 25 ? "attention" : positive.length > 0 ? "healthy" : "observe";

  const observed =
    negativeRate >= 25
      ? `顾客负面反馈占比约 ${negativeRate}%，其中等待与服务类抱怨最明显`
      : `顾客正向与中性反馈占主导，当前整体评价仍然稳定`;

  return {
    dimension: "customer",
    level,
    finding:
      level === "risk" || level === "attention"
        ? "顾客认可产品，但服务体验正在削弱整体满意度"
        : "顾客对门店的基础印象仍然稳定",
    meaning:
      level === "risk" || level === "attention"
        ? "如果等待和服务抱怨继续上升，复购与口碑会先受损"
        : "顾客认知侧暂未出现明显失控变化",
    observed,
    confidence: Math.min(0.9, 0.42 + evidence.length * 0.05),
    evidenceIds: evidence.map((item, index) => item.id || `customer-${index}`).slice(0, 6),
    watchHint: "先看顾客声音墙，再决定是否进入服务诊断",
    hypotheses: [
      {
        statement: "顾客期待与高峰服务体验之间出现落差",
        probability: 0.68,
        supportingEvidence: wait.map((item) => item.id || item.claim).slice(0, 4),
        contradictEvidence: env
          .concat(product)
          .map((item) => item.id || item.claim)
          .slice(0, 2),
        validationPlan: ["复核近7天负向评论中的等待与服务场景占比"],
      },
      {
        statement: "品牌承诺偏高，体验落差被放大",
        probability: 0.24,
        supportingEvidence: env.map((item) => item.id || item.claim).slice(0, 2),
        validationPlan: ["对比宣传关键词与顾客实际评价关键词是否一致"],
      },
    ],
    rawEvidence: negative.concat(positive, neutral).slice(0, 6),
  };
}

export function buildCustomerRealityMap(evidence: EngineContext["evidence"]) {
  const likes = evidence
    .filter((item) => item.sentiment === "positive")
    .slice(0, 3)
    .map((item) => clip(item.claim, 36));
  const hesitates = evidence
    .filter((item) => item.sentiment === "neutral")
    .slice(0, 3)
    .map((item) => clip(item.claim, 36));
  const leaves = evidence
    .filter((item) => item.sentiment === "negative")
    .slice(0, 3)
    .map((item) => clip(item.claim, 36));

  return { likes, hesitates, leaves };
}
