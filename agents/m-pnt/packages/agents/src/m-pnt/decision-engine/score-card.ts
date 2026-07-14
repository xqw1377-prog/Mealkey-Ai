/**
 * M-PNT Decision Engine V1 — 六维评分卡
 *
 * 显式化《专业模型 V1.0.1》的六维评分框架。
 * 每一维度的评分函数独立、可测试。
 */
import type { PositionCandidate, MatrixInputPackage, RiskLevel } from "../matrix/types";
import type { TheorySource, DimensionDef, DimensionScore, DimensionId } from "./types";
import { getCompetitionData, isInWhiteSpot, getMentalWords } from "../matrix/market-intel";

// ─── 维度权重定义 ─────────────────────────────────────────────

export const DEFAULT_WEIGHTS: Record<DimensionId, number> = {
  mental_uniqueness: 25,
  competitive_strength: 20,
  customer_fit: 15,
  executability: 15,
  long_term_defense: 15,
  risk_controllability: 10,
};

/**
 * 按理论体系调整的权重
 * Ries 侧重心智独特性 + 长期壁垒
 * Trout 侧重竞争优势强度 + 客群匹配度
 * Ye 侧重可执行性 + 风险可控性
 */
export const THEORY_WEIGHTS: Record<TheorySource, Partial<Record<DimensionId, number>>> = {
  ries: {
    mental_uniqueness: 30,
    competitive_strength: 15,
    customer_fit: 15,
    executability: 10,
    long_term_defense: 20,
    risk_controllability: 10,
  },
  trout: {
    mental_uniqueness: 20,
    competitive_strength: 25,
    customer_fit: 15,
    executability: 10,
    long_term_defense: 15,
    risk_controllability: 15,
  },
  ye_maozhong: {
    mental_uniqueness: 20,
    competitive_strength: 15,
    customer_fit: 15,
    executability: 20,
    long_term_defense: 10,
    risk_controllability: 20,
  },
};

export function getWeights(theoryId: TheorySource): Record<DimensionId, number> {
  const adj = THEORY_WEIGHTS[theoryId];
  const weights = { ...DEFAULT_WEIGHTS };
  for (const [dim, w] of Object.entries(adj)) {
    weights[dim as DimensionId] = w;
  }
  return weights;
}

// ─── 维度评分函数 ─────────────────────────────────────────────

/**
 * 1. 心智独特性 — 25分
 *
 * 检查候选方向是否在心智中占据一个独特位置。
 * Ries: 优先看"第一"机会
 * Trout: 优先看"不同"程度
 * Ye: 优先看"冲突"感
 */
export function scoreMentalUniqueness(
  candidate: PositionCandidate,
  pkg: MatrixInputPackage,
  theoryId: TheorySource,
): DimensionScore {
  const t = `${candidate.oneLiner} ${candidate.name} ${candidate.focus}`;
  const category = pkg.project.category || "";
  const city = pkg.project.city || "";

  // 检查是否落在已知空白区
  const ws = isInWhiteSpot(candidate.oneLiner, category, city);
  const whiteSpotBonus = ws.isWhite ? 15 : 0;

  // 检查是否"第一"表达
  const hasFirstClaim = /第一|首选|领导|开创/.test(t);
  // 检查是否"不同"表达
  const hasDifferentClaim = /对立|区隔|不做|只|不同|不是/.test(t);
  // 检查是否有"冲突"表达
  const hasConflictClaim = /冲突|焦虑|痛点|忍受|将就|以前/.test(t);

  let baseScore = 40; // 基础分
  const reasons: string[] = [];

  if (whiteSpotBonus > 0) {
    baseScore += whiteSpotBonus;
    reasons.push(`落在心智空白区「${ws.matchSpot}」`);
  }

  // 按理论偏好加分
  if (theoryId === 'ries' && hasFirstClaim) {
    baseScore += 20;
    reasons.push("有明确的第一占位表达（Ries 偏好）");
  } else if (theoryId === 'trout' && hasDifferentClaim) {
    baseScore += 18;
    reasons.push("有清晰的差异化区隔（Trout 偏好）");
  } else if (theoryId === 'ye_maozhong' && hasConflictClaim) {
    baseScore += 18;
    reasons.push("有冲突结构，易于传播记忆（Ye 偏好）");
  }

  // 一般加分
  if (hasFirstClaim) baseScore += 8;
  if (hasDifferentClaim) baseScore += 6;
  if (hasConflictClaim) baseScore += 5;

  // 场景具体性加分
  if (/周末|聚餐|午餐|夜宵|下班|日常|局|一人|家庭/.test(t)) {
    baseScore += 8;
    reasons.push("场景具体可感知");
  }

  // 与领导者正面冲突扣分
  if (hasFirstClaim && !ws.isWhite) {
    const comp = getCompetitionData(category, city);
    if (comp && comp.leaders.length >= 2) {
      baseScore -= 20;
      reasons.push("声称第一但与已知领导者冲突");
    }
  }

  const score = Math.max(0, Math.min(100, baseScore));

  return {
    score,
    reason: reasons.length > 0
      ? `心智独特性评分 ${score}/100：${reasons.join("；")}`
      : `心智独特性评分 ${score}/100：基础独特度一般`,
    risk: score < 40
      ? { risk: "心智独特性不足，消费者难以区分", severity: score < 25 ? "R3" as RiskLevel : "R2" as RiskLevel }
      : undefined,
  };
}

/**
 * 2. 竞争优势强度 — 20分
 *
 * Trout 视角权重最高（25）。
 * 检查竞争空位、差异化锋利度、第一联想潜力。
 */
export function scoreCompetitiveStrength(
  candidate: PositionCandidate,
  pkg: MatrixInputPackage,
  theoryId: TheorySource,
): DimensionScore {
  const t = `${candidate.oneLiner} ${candidate.name} ${candidate.focus}`;
  const category = pkg.project.category || "";
  const city = pkg.project.city || "";

  const comp = getCompetitionData(category, city);
  let baseScore = 35;

  if (!comp) {
    return { score: 45, reason: "缺少品类竞争数据，无法精确评估" };
  }

  const reasons: string[] = [];

  // 竞争饱和度
  if (comp.saturation === "低" || comp.saturation === "中") {
    baseScore += 15;
    reasons.push(`竞争饱和度${comp.saturation}，窗口期较好`);
  } else if (comp.saturation === "高") {
    baseScore += 5;
    reasons.push("竞争饱和但有空位可能");
  } else {
    baseScore -= 5;
    reasons.push("竞争极度饱和");
  }

  // 空白区匹配
  const ws = isInWhiteSpot(candidate.oneLiner, category, city);
  if (ws.isWhite) {
    baseScore += 18;
    reasons.push(`匹配心智空白区「${ws.matchSpot}」`);
  }

  // 差异化锋利度
  if (/对立|区隔|不做|只|不同|不是/.test(t)) {
    baseScore += 12;
    reasons.push("差异化表述锋利");
  }

  // 第一联想潜力
  if (/场景|周末|聚餐|夜宵|午餐|日常/.test(t)) {
    baseScore += 8;
    reasons.push("场景绑定强，第一联想潜力高");
  }

  // 侧翼战（避开领导者核心阵地）
  const hasLeaderConflict = hasLeaderKeywordConflict(t, comp.leaders);
  if (!hasLeaderConflict) {
    baseScore += 8;
    reasons.push("避开与心智领导者正面冲突");
  } else {
    baseScore -= 10;
    reasons.push("可能与心智领导者位置重叠");
  }

  const score = Math.max(0, Math.min(100, baseScore));

  return {
    score,
    reason: reasons.length > 0
      ? `竞争优势评分 ${score}/100：${reasons.join("；")}`
      : `竞争优势评分 ${score}/100：无明显竞争位置`,
    risk: score < 35
      ? { risk: "竞争位置薄弱，难以建立第一联想", severity: "R3" as RiskLevel }
      : undefined,
  };
}

/**
 * 3. 客群匹配度 — 15分
 *
 * 检查候选方向的目标客群是否清晰、匹配经营者资源。
 */
export function scoreCustomerFit(
  candidate: PositionCandidate,
  pkg: MatrixInputPackage,
  _theoryId: TheorySource,
): DimensionScore {
  const t = `${candidate.oneLiner} ${candidate.name}`;
  const strengths = pkg.owner.strengths || [];
  const weaknesses = pkg.owner.weaknesses || [];

  let baseScore = 40;
  const reasons: string[] = [];

  // 客群清晰度
  if (/家庭|年轻人|白领|学生|亲子|老人|女性|情侣|商务/.test(t)) {
    baseScore += 18;
    reasons.push("目标客群清晰可感知");
  }

  // 场景绑定客群
  if (/周末|聚餐|午餐|夜宵|下班|日常|一人|约会/.test(t)) {
    baseScore += 12;
    reasons.push("客群与场景绑定，第一联想路径清晰");
  }

  // 与经营者优势匹配
  const strengthMatch = strengths.some(s => t.includes(s.slice(0, 2)));
  if (strengthMatch) {
    baseScore += 10;
    reasons.push("与经营者优势匹配");
  }

  // 客群过宽扣分
  if (/一站式|全面|所有| everyone/.test(t)) {
    baseScore -= 15;
    reasons.push("客群定位过宽");
  }

  // 创始人盲区匹配检查
  const weaknessRelevant = weaknesses.some(w =>
    /品牌|表达|运营/.test(w) && /高端|精致/.test(t),
  );
  if (weaknessRelevant) {
    baseScore -= 8;
    reasons.push("定位要求与经营者盲区冲突");
  }

  const score = Math.max(0, Math.min(100, baseScore));

  return {
    score,
    reason: `客群匹配度评分 ${score}/100：${reasons.join("；") || "客群定位一般"}`,
    risk: score < 35
      ? { risk: "目标客群不够清晰或与资源不匹配", severity: "R3" as RiskLevel }
      : undefined,
  };
}

/**
 * 4. 可执行性 — 15分
 *
 * Ye 视角权重最高（20）。
 * 检查预算、资源、经验是否能支撑定位。
 */
export function scoreExecutability(
  candidate: PositionCandidate,
  pkg: MatrixInputPackage,
  _theoryId: TheorySource,
): DimensionScore {
  const t = `${candidate.oneLiner} ${candidate.name}`;
  const budget = Number(pkg.project.budget) || 0;
  const strengths = pkg.owner.strengths || [];
  const hasExperience = (pkg.owner.experience || "").length > 0;

  let baseScore = 40;
  const reasons: string[] = [];

  // 预算检查
  if (budget <= 0) {
    // 无预算信息
  } else if (budget < 40) {
    baseScore -= 12;
    reasons.push(`预算${budget}万偏低`);
    if (/高端|精致|连锁/.test(t)) {
      baseScore -= 20;
      reasons.push("高端/精致定位与低预算冲突");
    }
  } else if (budget >= 80) {
    baseScore += 12;
    reasons.push(`预算${budget}万较充足`);
  } else {
    baseScore += 5;
    reasons.push(`预算${budget}万适中`);
  }

  // 经营者优势
  if (strengths.length >= 2) {
    baseScore += 10;
    reasons.push("经营者有可落地优势");
  } else if (strengths.length === 1) {
    baseScore += 4;
  }

  // 经验
  if (hasExperience) {
    baseScore += 8;
    reasons.push("有餐饮从业经验");
  }

  // 定位复杂度
  if (/连锁|多店|品牌体系/.test(t)) {
    baseScore -= 5;
    reasons.push("定位要求较高执行能力");
  }

  // 标准化潜力
  if (/单品|套餐|标准化|去厨师/.test(t)) {
    baseScore += 8;
    reasons.push("有标准化潜力，可复制");
  }

  const score = Math.max(0, Math.min(100, baseScore));

  return {
    score,
    reason: `可执行性评分 ${score}/100：${reasons.join("；") || "可执行性一般"}`,
    risk: score < 30
      ? { risk: `预算${budget}万难以支撑定位执行`, severity: "R4" as RiskLevel }
      : score < 45
        ? { risk: "执行资源不足，需补充能力或调整定位", severity: "R3" as RiskLevel }
        : undefined,
  };
}

/**
 * 5. 长期壁垒 — 15分
 *
 * Ries 视角权重最高（20）。
 * 检查定位是否可防御、竞品是否容易复制。
 */
export function scoreLongTermDefense(
  candidate: PositionCandidate,
  pkg: MatrixInputPackage,
  _theoryId: TheorySource,
): DimensionScore {
  const t = `${candidate.oneLiner} ${candidate.name} ${candidate.focus}`;
  const strengths = pkg.owner.strengths || [];

  let baseScore = 35;
  const reasons: string[] = [];

  // 心智第一壁垒
  if (/第一|首选|领导/.test(t)) {
    baseScore += 15;
    reasons.push("第一位置壁垒最高");
  }

  // 供应链/配方壁垒
  const hasSupplyChain = strengths.some(s => /供应链|食材|配方|工艺|技术/.test(s));
  if (hasSupplyChain) {
    baseScore += 15;
    reasons.push("供应链/配方壁垒");
  }

  // 场景壁垒（场景一旦绑定难以替代）
  if (/周末|聚餐|夜宵|日常|家庭/.test(t)) {
    baseScore += 10;
    reasons.push("场景绑定建立消费者习惯壁垒");
  }

  // 品牌文化壁垒
  if (/文化|情感|记忆|故事|符号/.test(t)) {
    baseScore += 10;
    reasons.push("文化与情感壁垒");
  }

  // 容易被复制的定位扣分
  if (/性价比|实惠|新鲜|好吃|地道/.test(t)) {
    baseScore -= 8;
    reasons.push("通用价值主张，竞品易复制");
  }

  const score = Math.max(0, Math.min(100, baseScore));

  return {
    score,
    reason: `长期壁垒评分 ${score}/100：${reasons.join("；") || "长期壁垒一般"}`,
    risk: score < 30
      ? { risk: "定位容易被竞品复制，缺乏长期壁垒", severity: "R3" as RiskLevel }
      : undefined,
  };
}

/**
 * 6. 风险可控性 — 10分
 *
 * Ye 视角权重最高（20）。
 * 检查定位的主要风险是否可控。
 */
export function scoreRiskControllability(
  candidate: PositionCandidate,
  pkg: MatrixInputPackage,
  _theoryId: TheorySource,
): DimensionScore {
  const t = `${candidate.oneLiner} ${candidate.name}`;
  const budget = Number(pkg.project.budget) || 0;
  const weaknesses = pkg.owner.weaknesses || [];

  let baseScore = 50;
  const reasons: string[] = [];
  const risks: Array<{ risk: string; severity: RiskLevel }> = [];

  // 预算风险
  if (budget > 0 && budget < 40) {
    baseScore -= 15;
    risks.push({ risk: "预算有限，抗风险能力弱", severity: "R3" });
    reasons.push("预算紧张");
  }

  // 品牌盲区
  if (weaknesses.some(w => /品牌|表达/.test(w))) {
    baseScore -= 8;
    reasons.push("品牌表达是盲区");
  }

  // 定位风险（过宽/过泛）
  if (/一站式|全面|所有人/.test(t)) {
    baseScore -= 12;
    risks.push({ risk: "定位过宽，无法建立有效心智", severity: "R3" });
    reasons.push("定位过宽");
  }

  // 高端市场风险
  if (/高端|精致/.test(t) && (budget === 0 || budget < 80)) {
    baseScore -= 10;
    risks.push({ risk: "高端定位需要更大资源投入", severity: "R3" });
    reasons.push("高端定位资源不匹配");
  }

  // 正面冲突风险
  if (/第一|领导/.test(t)) {
    baseScore -= 5;
    risks.push({ risk: "正面争夺第一位置，可能触发竞品反击", severity: "R2" });
  }

  // 验证可行性
  if (/场景|周末|聚餐|午餐|一人/.test(t)) {
    baseScore += 10;
    reasons.push("可设计30天最小验证方案");
  }

  const score = Math.max(0, Math.min(100, baseScore));

  return {
    score,
    reason: `风险可控性评分 ${score}/100：${reasons.join("；") || "风险可控性一般"}`,
    risk: risks.length > 0 ? risks[0] : undefined,
  };
}

// ─── 所有维度注册表 ───────────────────────────────────────────

export const DEFAULT_DIMENSIONS: DimensionDef[] = [
  { id: 'mental_uniqueness',    name: '心智独特性',   weight: 25, scoreFn: scoreMentalUniqueness,
    theoryWeights: { ries: 30, trout: 20, ye_maozhong: 20 } },
  { id: 'competitive_strength', name: '竞争优势强度', weight: 20, scoreFn: scoreCompetitiveStrength,
    theoryWeights: { ries: 15, trout: 25, ye_maozhong: 15 } },
  { id: 'customer_fit',         name: '客群匹配度',   weight: 15, scoreFn: scoreCustomerFit },
  { id: 'executability',        name: '可执行性',     weight: 15, scoreFn: scoreExecutability,
    theoryWeights: { ries: 10, trout: 10, ye_maozhong: 20 } },
  { id: 'long_term_defense',    name: '长期壁垒',     weight: 15, scoreFn: scoreLongTermDefense,
    theoryWeights: { ries: 20, trout: 15, ye_maozhong: 10 } },
  { id: 'risk_controllability', name: '风险可控性',   weight: 10, scoreFn: scoreRiskControllability,
    theoryWeights: { ries: 10, trout: 15, ye_maozhong: 20 } },
];

// ─── 工具函数 ─────────────────────────────────────────────────

function hasLeaderKeywordConflict(
  oneLiner: string,
  leaders: Array<{ brand: string; position: string }>,
): boolean {
  const leaderKws = leaders.flatMap(l => l.position.split(/[·\+\s]/));
  return leaderKws.some(kw =>
    kw.length > 1 && oneLiner.includes(kw),
  );
}
