import type {
  CrossFireResult,
  DecisionRecommend,
  MatrixInputPackage,
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
