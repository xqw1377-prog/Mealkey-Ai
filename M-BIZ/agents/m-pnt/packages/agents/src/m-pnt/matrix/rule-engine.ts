/**
 * 规则引擎（精简版）
 *
 * MealKey LLM 模式下，规则引擎退化为：
 * 1. 结构化校验器——验证 LLM 输出的格式和字段完整性
 * 2. 回落发生器——LLM 失败时兜底
 * 3. 评分映射器——LLM 输出的理论推荐等级映射为决策等级
 */
import type { MatrixInputPackage, RiskLevel, TheoryRecommend, DirectionScore } from "./types";
import { getCompetitionData, isInWhiteSpot } from "./market-intel";

// ─── 评分结果结构 ───────────────────────────────────────────────

export interface DimensionScore {
  dimension: string;
  score: number;
  conclusion: string;
  risk?: { risk: string; severity: RiskLevel };
  debateNote?: string;
}

export interface EvaluatedResult {
  dimensions: DimensionScore[];
  totalScore: number;
  theory_recommend: TheoryRecommend;
  reasoning: string;
  risks: Array<{ risk: string; severity: RiskLevel }>;
  confidence: number;
}

// ─── LLM 输出校验 ───────────────────────────────────────────────

export interface ValidatedTheoryView {
  /** 校验是否通过 */
  valid: boolean;
  /** 字段级别问题 */
  issues: string[];
  /** 修正后的数据 */
  corrected: {
    preferred_direction: string;
    theory_recommend: TheoryRecommend;
    direction_scores: DirectionScore[];
    risks: Array<{ risk: string; severity: RiskLevel }>;
  };
}

/**
 * 校验并修正 LLM 输出的 TheoryView
 */
export function validateTheoryView(raw: Record<string, unknown>): ValidatedTheoryView {
  const issues: string[] = [];

  const preferred = String(raw.preferred_direction || raw.preferred || "");
  if (!preferred) issues.push("缺少 preferred_direction");

  const rec = normalizeRecommend(String(raw.theory_recommend || raw.recommendation_level || "neutral"));
  const scores = Array.isArray(raw.direction_scores) ? raw.direction_scores.map((s: any) => ({
    name: String(s.name || ""),
    theory_score: clampScore(Number(s.theory_score) || 50),
    theory_recommend: normalizeRecommend(String(s.theory_recommend || "neutral")),
  })) : [];
  const risks = Array.isArray(raw.main_risks) ? raw.main_risks.map((r: any) => ({
    risk: String(r.risk || ""),
    severity: normalizeRisk(String(r.severity || "R1")),
  })).filter((r) => r.risk) : [];

  return {
    valid: issues.length === 0,
    issues,
    corrected: {
      preferred_direction: preferred || "候选方向A",
      theory_recommend: rec,
      direction_scores: scores,
      risks,
    },
  };
}

// ─── 回落评估（极简版） ─────────────────────────────────────────

/**
 * 无 LLM 时的极简评估
 */
export function evaluateByRules(
  candidate: MatrixInputPackage["candidates"][0],
  pkg: MatrixInputPackage,
  _rules: any[],
  _cases: any[],
): EvaluatedResult {
  const t = `${candidate.oneLiner} ${candidate.name} ${candidate.focus}`;
  const dimensions: DimensionScore[] = [];
  const risks: Array<{ risk: string; severity: RiskLevel }> = [];

  // 第一检查
  if (/第一|首选|领导/.test(t)) {
    const comp = getCompetitionData(pkg.project.category || "", pkg.project.city || "");
    if (comp && comp.saturation === "极高" && comp.leaders.length >= 2) {
      const ws = isInWhiteSpot(candidate.oneLiner, pkg.project.category || "", pkg.project.city || "");
      if (!ws.isWhite) {
        dimensions.push({ dimension: "领导地位", score: 35, conclusion: `品类已有领导者，声称第一不现实`, risk: { risk: "与心智领导者冲突", severity: "R3" }, debateNote: "里斯不认可" });
        risks.push({ risk: "与心智领导者冲突", severity: "R3" });
      } else {
        dimensions.push({ dimension: "领导地位", score: 70, conclusion: `落在空白区「${ws.matchSpot}」`, debateNote: "有潜力" });
      }
    } else {
      dimensions.push({ dimension: "领导地位", score: 78, conclusion: "有争夺第一机会" });
    }
  } else if (/场景/.test(t)) {
    dimensions.push({ dimension: "定位本质", score: 65, conclusion: "场景定位可行" });
  } else {
    dimensions.push({ dimension: "定位本质", score: 45, conclusion: "定位不够清晰" });
  }

  // 差异化检查
  if (/对立|区隔|不做|只|不同/.test(t)) {
    dimensions.push({ dimension: "差异化", score: 85, conclusion: "差异化锋利" });
  } else if (/更好|更优/.test(t)) {
    dimensions.push({ dimension: "差异化", score: 30, conclusion: "更好不是不同", risk: { risk: "缺乏差异化", severity: "R3" } });
    risks.push({ risk: "缺乏差异化", severity: "R3" });
  } else {
    dimensions.push({ dimension: "差异化", score: 55, conclusion: "差异化一般" });
  }

  // 聚焦检查
  if (/只|不做|专/.test(t)) {
    dimensions.push({ dimension: "聚焦度", score: 85, conclusion: "聚焦清晰" });
  } else if (/一站式|全面|所有/.test(t)) {
    dimensions.push({ dimension: "聚焦度", score: 25, conclusion: "聚焦不足", risk: { risk: "定位过宽", severity: "R3" } });
    risks.push({ risk: "定位过宽", severity: "R3" });
  } else {
    dimensions.push({ dimension: "聚焦度", score: 55, conclusion: "聚焦一般" });
  }

  // 场景绑定检查
  if (/周末|聚餐|午餐|夜宵|下班|日常|局/.test(t)) {
    dimensions.push({ dimension: "场景绑定", score: 82, conclusion: "场景具体可感知" });
  } else if (/场景/.test(t)) {
    dimensions.push({ dimension: "场景绑定", score: 60, conclusion: "有场景但不够具体" });
  } else {
    dimensions.push({ dimension: "场景绑定", score: 35, conclusion: "缺少场景绑定" });
  }

  // 执行性检查
  const budget = Number(pkg.project.budget) || 0;
  const hasStrength = (pkg.owner.strengths || []).length > 0;
  if (/高端|精致/.test(candidate.oneLiner) && budget > 0 && budget < 80) {
    dimensions.push({ dimension: "可执行性", score: 25, conclusion: `预算${budget}万难支撑高端定位`, risk: { risk: "资源不匹配", severity: "R4" } });
    risks.push({ risk: "资源不匹配", severity: "R4" });
  } else if (hasStrength) {
    dimensions.push({ dimension: "可执行性", score: 75, conclusion: "有落地基础" });
  } else {
    dimensions.push({ dimension: "可执行性", score: 50, conclusion: "需补充经营者信息" });
  }

  const total = clampScore(Math.round(dimensions.reduce((s, d) => s + d.score, 0) / dimensions.length));
  const rec = toRecommend(total);

  return {
    dimensions,
    totalScore: total,
    theory_recommend: rec,
    reasoning: `综合评估 ${total}/100。${dimensions.filter(d => d.score >= 70).map(d => d.dimension + "(" + d.score + "分)").join("、")}`,
    risks,
    confidence: Math.min(0.9, 0.4 + total / 180),
  };
}

// ─── 映射函数 ───────────────────────────────────────────────────

export function toRecommend(score: number): TheoryRecommend {
  if (score >= 80) return "strong_recommend";
  if (score >= 62) return "recommend";
  if (score >= 45) return "neutral";
  return "not_recommend";
}

export function normalizeRecommend(r: string): TheoryRecommend {
  const map: Record<string, TheoryRecommend> = {
    "strong_recommend": "strong_recommend",
    "recommend": "recommend",
    "neutral": "neutral",
    "not_recommend": "not_recommend",
    "not recommended": "not_recommend",
    "weak_recommend": "neutral",
  };
  return map[r.toLowerCase()] || "neutral";
}

function normalizeRisk(r: string): RiskLevel {
  const map: Record<string, RiskLevel> = { "r1": "R1", "r2": "R2", "r3": "R3", "r4": "R4" };
  return map[r.toLowerCase()] || "R1";
}

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
