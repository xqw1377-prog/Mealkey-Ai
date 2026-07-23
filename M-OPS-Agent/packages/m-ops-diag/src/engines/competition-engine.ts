import { claimMatchesTheme } from "../reasoning/helpers";
import type { EngineAnalysis, EngineContext } from "./types";

export function analyzeCompetitionIntelligence({
  evidence,
}: EngineContext): EngineAnalysis {
  const market = evidence.filter(
    (item) =>
      claimMatchesTheme(item.claim, "competition", item.theme) || item.theme === "competition",
  );
  const level =
    market.length >= 3 ? "attention" : market.length >= 1 ? "observe" : "healthy";

  return {
    dimension: "competition",
    level,
    finding:
      market.length > 0
        ? "周边竞争环境出现新线索"
        : "当前没有足够证据证明竞争位置正在变化",
    meaning:
      market.length > 0
        ? "价格带与区域选择权可能正在重排"
        : "竞争维度当前更多是待采集区，而非明确问题",
    observed:
      market.length > 0 ? `发现 ${market.length} 条周边竞争或活动线索` : "暂未采到明确竞品变化证据",
    confidence: market.length > 0 ? Math.min(0.72, 0.3 + market.length * 0.15) : 0.28,
    evidenceIds: market.map((item, index) => item.id || `competition-${index}`),
    watchHint: "地图与竞品抓取完成后再升级竞争判断",
    hypotheses: [
      {
        statement: "同价格带竞争正在加剧，顾客价格认知可能被重写",
        probability: market.length >= 2 ? 0.56 : 0.31,
        supportingEvidence: market.map((item) => item.id || item.claim).slice(0, 4),
        validationPlan: ["对比周边新店的价格、评分与主打场景变化"],
      },
    ],
    rawEvidence: market.slice(0, 6),
  };
}
