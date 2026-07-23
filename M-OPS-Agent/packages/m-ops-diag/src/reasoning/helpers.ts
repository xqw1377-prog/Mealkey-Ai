import type {
  DiagnosisEvidenceItem,
  DiagnosisSignal,
  DiagnosisSignalSeverity,
  HealthDeltaDirection,
  HealthDimension,
  HealthLevel,
  RestaurantHealthSnapshot,
} from "../contracts";
import type { EvidenceSourceType } from "../knowledge";
import {
  claimMatchesTheme,
  getCompetitionRe,
  getEnvRe,
  getGrowthRe,
  getProductRe,
  getWaitRe,
} from "./patterns";

/** @deprecated 请优先用 claimMatchesTheme；保留为兼容导出 */
export const WAIT_RE = getWaitRe();
export const PRODUCT_RE = getProductRe();
export const ENV_RE = getEnvRe();
export const COMPETITION_RE = getCompetitionRe();
export const GROWTH_RE = getGrowthRe();

export { claimMatchesTheme, getPatternLibrary, setPatternLibrary, resetPatternLibrary } from "./patterns";

export function clip(s: string, n: number) {
  const t = s.trim();
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
}

export function levelScore(level: HealthLevel): number {
  switch (level) {
    case "healthy":
      return 0;
    case "observe":
      return 1;
    case "attention":
      return 2;
    case "risk":
      return 3;
    case "critical":
      return 4;
  }
}

export function compareHealthLevels(
  previous: HealthLevel | undefined,
  current: HealthLevel,
): HealthDeltaDirection {
  if (!previous) return "flat";
  const diff = levelScore(current) - levelScore(previous);
  return diff > 0 ? "down" : diff < 0 ? "up" : "flat";
}

export function severityFromState(
  level: HealthLevel,
  magnitude: number,
): DiagnosisSignalSeverity {
  if (level === "critical") return "CRITICAL";
  if (level === "risk" || magnitude >= 2) return "HIGH";
  if (level === "attention" || magnitude >= 1) return "MEDIUM";
  return "LOW";
}

export function focusFromDimension(
  dimension: HealthDimension,
): "service" | "product" | "traffic" | "competition" | "cost" | "overall" {
  switch (dimension) {
    case "product":
      return "product";
    case "competition":
      return "competition";
    case "growth":
      return "traffic";
    case "operation":
      return "cost";
    case "service":
    case "customer":
    default:
      return "service";
  }
}

export function signalTypeFromDimension(
  dimension: HealthDimension,
): DiagnosisSignal["type"] {
  switch (dimension) {
    case "product":
      return "PRODUCT";
    case "service":
      return "SERVICE";
    case "operation":
      return "OPERATION";
    case "competition":
      return "COMPETITION";
    case "growth":
      return "GROWTH";
    case "customer":
    default:
      return "CUSTOMER";
  }
}

export function titleFromDimension(
  dimension: HealthDimension,
  direction: HealthDeltaDirection,
): string {
  const directionText = direction === "down" ? "下降" : direction === "up" ? "改善" : "波动";
  switch (dimension) {
    case "customer":
      return `顾客健康${directionText}`;
    case "product":
      return `产品健康${directionText}`;
    case "service":
      return `服务体验${directionText}`;
    case "operation":
      return `运营效率${directionText}`;
    case "competition":
      return "竞争压力变化";
    case "growth":
      return direction === "up" ? "增长机会增强" : "增长机会波动";
  }
}

export function decisionTopicFromDimension(dimension: HealthDimension): string {
  switch (dimension) {
    case "customer":
      return "顾客认知变化是否需要处理";
    case "product":
      return "是否需要调整产品结构";
    case "service":
      return "是否优化服务流程";
    case "operation":
      return "是否检查高峰承载能力";
    case "competition":
      return "是否重新判断竞争位置";
    case "growth":
      return "是否抓住新的增长机会";
  }
}

export function impactFromDimension(dimension: HealthDimension): string {
  switch (dimension) {
    case "customer":
      return "可能影响复购与顾客口碑";
    case "product":
      return "可能削弱招牌记忆与菜单吸引力";
    case "service":
      return "可能扩大差评并影响晚餐高峰转化";
    case "operation":
      return "可能限制高峰产能与营业额承接";
    case "competition":
      return "可能削弱价格带与周边竞争位置";
    case "growth":
      return "可能影响内容传播与新客增长承接";
  }
}

export function findPrevLevel(
  snapshot: RestaurantHealthSnapshot | undefined,
  dimension: HealthDimension,
): HealthLevel | undefined {
  return snapshot?.dimensions.find((item) => item.dimension === dimension)?.level;
}

export function makeDeltaSummary(args: {
  metric: string;
  previousLevel?: HealthLevel;
  currentLevel: HealthLevel;
  observed: string;
}) {
  if (!args.previousLevel) {
    return `首次建档：${args.observed}`;
  }
  if (args.previousLevel === args.currentLevel) {
    return `${args.metric}维持${args.currentLevel}，${args.observed}`;
  }
  return `${args.metric}由 ${args.previousLevel} 变为 ${args.currentLevel}，${args.observed}`;
}

export function sourceTypeFromEvidence(source: string): EvidenceSourceType {
  const normalized = source.toLowerCase();
  if (normalized.includes("dianping") || source.includes("大众点评")) return "DIANPING";
  if (normalized.includes("xiaohongshu") || source.includes("小红书")) return "XHS";
  if (normalized.includes("douyin") || source.includes("抖音")) return "DOUYIN";
  if (normalized.includes("map") || source.includes("地图")) return "MAP";
  if (normalized.includes("pos")) return "POS";
  return "REVIEW";
}

export function calcImpactScore(input: {
  severity: number;
  affectedUsers: number;
  trendVelocity: number;
  confidence: number;
  solveCost: number;
}) {
  return Math.round(
    (input.severity *
      input.affectedUsers *
      input.trendVelocity *
      Math.max(1, Math.round(input.confidence * 10))) /
      Math.max(1, input.solveCost),
  );
}

export function topEvidenceIds(
  evidence: DiagnosisEvidenceItem[],
  predicate: (item: DiagnosisEvidenceItem) => boolean,
  limit = 6,
) {
  return evidence
    .filter(predicate)
    .map((item, index) => item.id || `ev-${index}`)
    .slice(0, limit);
}
