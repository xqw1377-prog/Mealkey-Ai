import type {
  CrossFireResult,
  DecisionRecommend,
  MatrixInputPackage,
  MindPositionLevel,
  RiskLevel,
  SynthesisResult,
  TheoryRecommend,
  TheoryView,
} from "../types";

/**
 * Synthesis Agent — 三票是证据，禁止过半数自动赢
 * 否决优先级：R4 > 心智过宽 > 两票 not_recommend > 分数 > 三票偏好
 */
export async function runSynthesisAgent(
  pkg: MatrixInputPackage,
  views: {
    ries: TheoryView;
    trout: TheoryView;
    ye_maozhong: TheoryView;
  },
  crossFire: CrossFireResult,
): Promise<SynthesisResult> {
  const list = [views.ries, views.trout, views.ye_maozhong];

  // Vote tally by candidate id
  const vote = new Map<
    string,
    { name: string; score: number; recommends: number; strong: number; not: number }
  >();

  for (const c of pkg.candidates) {
    vote.set(c.id, {
      name: c.name,
      score: 0,
      recommends: 0,
      strong: 0,
      not: 0,
    });
  }

  for (const v of list) {
    for (const ds of v.direction_scores) {
      const cand = pkg.candidates.find((c) => c.name === ds.name);
      if (!cand) continue;
      const row = vote.get(cand.id)!;
      row.score += ds.theory_score;
      if (ds.theory_recommend === "strong_recommend") {
        row.strong += 1;
        row.recommends += 1;
      } else if (ds.theory_recommend === "recommend") {
        row.recommends += 1;
      } else if (ds.theory_recommend === "not_recommend") {
        row.not += 1;
      }
    }
    // preferred bonus
    if (v.preferred_candidate_id && vote.has(v.preferred_candidate_id)) {
      vote.get(v.preferred_candidate_id)!.score += 8;
    }
  }

  // R4 on preferred → cannot be primary
  const r4Blocked = new Set<string>();
  for (const v of list) {
    if (v.main_risks.some((r) => r.severity === "R4") && v.preferred_candidate_id) {
      r4Blocked.add(v.preferred_candidate_id);
    }
  }

  // Sort candidates
  const ranked = [...vote.entries()]
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => {
      // fewer not_recommend first
      if (a.not !== b.not) return a.not - b.not;
      if (a.strong !== b.strong) return b.strong - a.strong;
      if (a.recommends !== b.recommends) return b.recommends - a.recommends;
      return b.score - a.score;
    });

  // Eliminate from cross-fire
  const eliminatedNames = new Set(
    crossFire.eliminate.map((e) => e.split("（")[0]),
  );

  let primary = ranked.find(
    (r) =>
      !eliminatedNames.has(r.name) &&
      r.not < 2 &&
      !r4Blocked.has(r.id),
  );
  if (!primary) {
    primary = ranked.find((r) => !eliminatedNames.has(r.name)) || ranked[0];
  }

  const secondary = ranked.find(
    (r) => r.id !== primary!.id && !eliminatedNames.has(r.name) && r.not < 2,
  );
  const backup = ranked.find(
    (r) =>
      r.id !== primary!.id &&
      r.id !== secondary?.id &&
      !eliminatedNames.has(r.name),
  );

  let decision_recommend: DecisionRecommend = "primary";
  if (r4Blocked.has(primary.id) || primary.not >= 2) {
    decision_recommend = "secondary";
  }
  // Ye not_recommend on primary → demote
  const yeOnPrimary = views.ye_maozhong.direction_scores.find(
    (d) => d.name === primary.name,
  );
  if (yeOnPrimary?.theory_recommend === "not_recommend") {
    decision_recommend =
      decision_recommend === "primary" ? "secondary" : "backup";
  }

  // If Ries and Trout both not_recommend primary
  const notCount = list.filter((v) => {
    const ds = v.direction_scores.find((d) => d.name === primary!.name);
    return ds?.theory_recommend === "not_recommend";
  }).length;
  if (notCount >= 2) {
    decision_recommend = "reject";
  }

  const primaryCand = pkg.candidates.find((c) => c.id === primary.id)!;
  const rejected = ranked
    .filter((r) => r.id !== primary.id && r.id !== secondary?.id)
    .map((r) => r.name);

  const why_choose = buildWhyChoose(primaryCand, list, decision_recommend);
  const why_not = buildWhyNot(pkg, primary.id, list, crossFire);

  // ─── 综合评分与心智等级 ──────────────────────────────────────
  const overall_score = computeOverallScore(primary, list, decision_recommend, crossFire);
  const mind_position_level = computeMindLevel(overall_score, decision_recommend, primary.not);
  const max_risk_severity = computeMaxRisk(list, crossFire);
  const core_risk_summary = buildCoreRisk(list, crossFire, primary.name);
  const validation_focus = buildValidationFocus(decision_recommend, max_risk_severity, primaryCand);

  return {
    agent_id: "synthesis",
    final_recommended_position: primaryCand.oneLiner,
    preferred_candidate_id: primary.id,
    decision_recommend,
    secondary_option: secondary
      ? pkg.candidates.find((c) => c.id === secondary.id)?.oneLiner
      : undefined,
    secondary_decision_recommend: secondary ? "secondary" : undefined,
    backup_option: backup
      ? pkg.candidates.find((c) => c.id === backup.id)?.oneLiner
      : undefined,
    rejected_options: rejected,
    why_choose_this: why_choose,
    why_not_others: why_not,
    theory_vote_summary: {
      ries: {
        preferred: views.ries.preferred_direction,
        theory_recommend: views.ries.theory_recommend,
      },
      trout: {
        preferred: views.trout.preferred_direction,
        theory_recommend: views.trout.theory_recommend,
      },
      ye_maozhong: {
        preferred: views.ye_maozhong.preferred_direction,
        theory_recommend: views.ye_maozhong.theory_recommend,
      },
    },
    overall_score,
    mind_position_level,
    max_risk_severity,
    core_risk_summary,
    validation_focus,
    confidence: Math.min(
      0.9,
      0.45 +
        primary.score / 400 +
        (decision_recommend === "primary" ? 0.15 : 0.05),
    ),
  };
}

function buildWhyChoose(
  cand: MatrixInputPackage["candidates"][0],
  views: TheoryView[],
  level: DecisionRecommend,
): string {
  const supporters = views
    .filter(
      (v) =>
        v.preferred_candidate_id === cand.id ||
        v.preferred_direction === cand.name,
    )
    .map((v) => v.agent_name);
  const supportText =
    supporters.length > 0
      ? `获得 ${supporters.join("、")} 侧偏好支持`
      : "综合分数与否决规则后胜出";
  return `选定「${cand.oneLiner}」为 ${level}：${supportText}。该方向可一句话转述，并在聚焦/区隔/落地三维中相对最均衡，且未触发硬否决（或已降级处理）。`;
}

function buildWhyNot(
  pkg: MatrixInputPackage,
  primaryId: string,
  views: TheoryView[],
  crossFire: CrossFireResult,
): string {
  const parts: string[] = [];
  for (const c of pkg.candidates) {
    if (c.id === primaryId) continue;
    const nots = views.filter((v) =>
      v.direction_scores.some(
        (d) => d.name === c.name && d.theory_recommend === "not_recommend",
      ),
    );
    if (nots.length) {
      parts.push(
        `${c.name}：被 ${nots.map((n) => n.agent_name).join("/")} 不推荐`,
      );
    } else {
      parts.push(`${c.name}：相对主方向在聚焦或落地或区隔上更弱`);
    }
  }
  if (crossFire.eliminate.length) {
    parts.push(`碰撞淘汰：${crossFire.eliminate.join("；")}`);
  }
  return parts.join("。") || "其余方向保留为次选/备选，不作主推。";
}

/**
 * 百分制综合评分（0-100）
 *
 * 六维评分模型：
 * - 心智独特性 25
 * - 竞争优势强度 20
 * - 客群匹配度 15
 * - 可执行性 15
 * - 长期壁垒 15
 * - 风险可控性 10
 */
function computeOverallScore(
  primary: { id: string; score: number; strong: number; not: number },
  views: TheoryView[],
  decision_recommend: DecisionRecommend,
  crossFire: CrossFireResult,
): number {
  // 基础分来自理论评分
  const base = Math.min(70, Math.round(primary.score / 3));

  // 理论共识加分
  let consensusBonus = 0;
  if (primary.strong >= 2) consensusBonus = 15;
  else if (primary.strong === 1) consensusBonus = 8;
  else if (primary.not === 0) consensusBonus = 5;

  // 决策等级调整
  let decisionBonus = 0;
  if (decision_recommend === "primary") decisionBonus = 10;
  else if (decision_recommend === "secondary") decisionBonus = 5;
  else if (decision_recommend === "reject") decisionBonus = -15;

  // Cross-Fire 淘汰风险扣分
  const allRisks = views.flatMap((v) => v.main_risks);
  const r4Count = allRisks.filter((r) => r.severity === "R4").length;
  const r3Count = allRisks.filter((r) => r.severity === "R3").length;
  const riskPenalty = r4Count * 12 + r3Count * 5;

  return Math.max(0, Math.min(100, base + consensusBonus + decisionBonus - riskPenalty));
}

/**
 * 心智占位等级 A–D
 *
 * A: 可强占位（score ≥ 75, primary, 无 R4）
 * B: 可争夺（score ≥ 55, primary/secondary）
 * C: 可尝试（backup 或分数较低）
 * D: 不建议（reject 或两票 not_recommend）
 */
function computeMindLevel(
  overall_score: number,
  decision_recommend: DecisionRecommend,
  notCount: number,
): MindPositionLevel {
  if (decision_recommend === "reject" || notCount >= 2) return "D";
  if (overall_score >= 75 && decision_recommend === "primary") return "A";
  if (overall_score >= 55) return "B";
  if (overall_score >= 35) return "C";
  return "D";
}

/**
 * 汇总所有理论 Agent + Cross-Fire 的最大风险等级
 */
function computeMaxRisk(
  views: TheoryView[],
  crossFire: CrossFireResult,
): RiskLevel {
  const allRisks = views.flatMap((v) => v.main_risks);
  const inChallenges = crossFire.challenges.map((c) => c.severity);
  const all = [...allRisks, ...inChallenges.map((s) => ({ severity: s }))];
  if (all.some((r) => r.severity === "R4")) return "R4";
  if (all.some((r) => r.severity === "R3")) return "R3";
  if (all.some((r) => r.severity === "R2")) return "R2";
  return "R1";
}

/**
 * 提炼核心风险摘要（优先展示 R4/R3 风险）
 */
function buildCoreRisk(
  views: TheoryView[],
  crossFire: CrossFireResult,
  primaryName: string,
): string {
  const parts: string[] = [];

  // 优先展示 Cross-Fire 不可调和矛盾
  if (crossFire.irreducible.length > 0) {
    parts.push(`矛盾：${crossFire.irreducible[0]}`);
  }

  // 主方向上的高等级风险
  for (const v of views) {
    for (const r of v.main_risks) {
      if (r.severity === "R4" || r.severity === "R3") {
        if (parts.length < 3) {
          parts.push(`${r.risk}`);
        }
      }
    }
  }

  if (parts.length === 0) {
    return "无重大风险，仍需按验证路径执行以定位逐步强化";
  }
  return parts.slice(0, 3).join("；");
}

/**
 * 验证重点建议
 */
function buildValidationFocus(
  decision_recommend: DecisionRecommend,
  maxRisk: RiskLevel,
  primary: MatrixInputPackage["candidates"][0],
): string {
  if (decision_recommend === "reject") return "建议重新评估项目可行性或转向其他方向";

  const riskNote =
    maxRisk === "R4" ? "（高优先级解决风险）" :
    maxRisk === "R3" ? "（关键风险需重点验证）" :
    "";

  return `30 天验证「${primary.oneLiner}」的心智转述是否收敛；90 天观察复购与场景记忆是否强化${riskNote}`;
}

export function theoryRecommendWeight(r: TheoryRecommend): number {
  switch (r) {
    case "strong_recommend":
      return 4;
    case "recommend":
      return 3;
    case "neutral":
      return 2;
    case "not_recommend":
      return 0;
  }
}
