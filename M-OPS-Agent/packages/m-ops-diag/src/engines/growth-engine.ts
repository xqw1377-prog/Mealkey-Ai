import { claimMatchesTheme } from "../reasoning/helpers";
import type { EngineAnalysis, EngineContext } from "./types";

export function analyzeGrowthIntelligence({
  evidence,
}: EngineContext): EngineAnalysis {
  const growth = evidence.filter(
    (item) =>
      claimMatchesTheme(item.claim, "growth", item.theme) ||
      item.theme === "growth" ||
      item.source.toLowerCase().includes("xiaohongshu") ||
      item.source.includes("小红书") ||
      item.source.toLowerCase().includes("douyin") ||
      item.source.includes("抖音"),
  );
  const positive = growth.filter((item) => item.sentiment === "positive");
  const level =
    growth.length >= 2 && positive.length > 0 ? "healthy" : growth.length >= 1 ? "observe" : "observe";

  return {
    dimension: "growth",
    level,
    finding:
      growth.length > 0
        ? "外部内容场景中出现可关注的增长线索"
        : "暂未形成强增长机会证据",
    meaning:
      growth.length > 0
        ? "可继续观察聚餐、推荐与打卡场景，判断是否值得放大"
        : "增长维度当前以观察为主，不宜强行给机会判断",
    observed: growth.length > 0 ? `发现 ${growth.length} 条传播或聚餐场景线索` : "增长机会信号尚弱",
    confidence: growth.length > 0 ? Math.min(0.72, 0.32 + growth.length * 0.14) : 0.3,
    evidenceIds: growth.map((item, index) => item.id || `growth-${index}`).slice(0, 6),
    watchHint: "继续跟踪小红书/抖音场景词变化",
    hypotheses: [
      {
        statement: "顾客正在把门店放进新的聚餐或打卡场景中",
        probability: positive.length > 0 ? 0.58 : 0.34,
        supportingEvidence: growth.map((item) => item.id || item.claim).slice(0, 4),
        validationPlan: ["对比近30天内容关键词，看是否形成稳定新场景"],
      },
    ],
    opportunity: growth.length > 0,
    rawEvidence: growth.slice(0, 6),
  };
}
