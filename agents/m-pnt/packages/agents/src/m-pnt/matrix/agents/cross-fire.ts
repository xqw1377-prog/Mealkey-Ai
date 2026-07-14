/**
 * Cross-Fire Agent V3 — 基于评分数据的观点沟通
 *
 * 不再使用 if-else 硬编码大师语录。
 * 攻击文本从 TheoryView.direction_scores 的评分数据中动态生成，
 * 反映"谁在哪个维度给了低分"的真实分歧。
 */
import type {
  CrossFireResult,
  MatrixInputPackage,
  TheoryAgentId,
  TheoryChallenge,
  TheoryView,
  RiskLevel,
  DirectionScore,
} from "../types";

export async function runCrossFireAgent(
  pkg: MatrixInputPackage,
  views: [TheoryView, TheoryView, TheoryView],
): Promise<CrossFireResult> {
  const [ries, trout, ye] = views;
  const byId: Record<TheoryAgentId, TheoryView> = { ries, trout, ye_maozhong: ye };

  const prefs = [
    { id: "ries" as TheoryAgentId, label: "里斯定位", view: ries },
    { id: "trout" as TheoryAgentId, label: "特劳特定位", view: trout },
    { id: "ye_maozhong" as TheoryAgentId, label: "叶茂中冲突营销", view: ye },
  ];

  const conflicts: string[] = [];
  const hard_consensus: string[] = [];
  const soft_consensus: string[] = [];
  const eliminate: string[] = [];
  const irreducible: string[] = [];

  // ─── 1) 竞争：暴露分裂 ─────────────────────────────────────
  const prefIds = prefs.map((p) => p.view.preferred_candidate_id).filter(Boolean) as string[];
  const uniquePref = new Set(prefIds);

  if (uniquePref.size === 1) {
    hard_consensus.push(`三方都推「${ries.preferred_direction}」——意见一致但各自理由不同，仍需关注潜在风险。`);
  } else if (uniquePref.size === 2) {
    const counts = countBy(prefIds);
    const majorityId = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const majorityLabel = prefs.find(p => p.view.preferred_candidate_id === majorityId)?.label || "";
    const minorityLabel = prefs.find(p => p.view.preferred_candidate_id !== majorityId)?.label || "";
    soft_consensus.push(`${majorityLabel}与${minorityLabel}意见分裂：${majorityLabel}倾向多数方向，但${minorityLabel}坚持己见。`);
    conflicts.push(...extractSplitConflicts(prefs));
  } else {
    conflicts.push(`三足鼎立：三人各推一个方向。里斯认为他的方向最能抢占心智第一，特劳特认为他的方向竞争空位最锋利，叶茂中认为他的方向传播落地最强。`);
    irreducible.push("三人各推各的，必须经过否决链决出胜负。禁止和稀泥。");
  }

  // ─── 2) 辩论：基于评分差异生成攻击 ─────────────────────────
  const challenges = generateChallenges(prefs, byId, pkg);

  // ─── 3) 共识/淘汰（基于评分汇总） ─────────────────────────
  for (const c of pkg.candidates) {
    const scoreSummary = summarizeScores(c.name, views);

    if (scoreSummary.allNotRecommend) {
      eliminate.push(`${c.name}——三方一致不推荐`);
    } else if (scoreSummary.twoNotRecommend) {
      eliminate.push(`${c.name}——两方不推荐，基本出局`);
    }

    if (scoreSummary.allRecommend) {
      hard_consensus.push(`三方都对「${c.name}」给出推荐——相当罕见`);
    } else if (scoreSummary.twoRecommend) {
      soft_consensus.push(`两方推荐「${c.name}」，另一方有保留`);
    }

    if (scoreSummary.highVariance) {
      conflicts.push(`「${c.name}」评分分歧大——最高相差${scoreSummary.variance}分，说明不同理论体系对其判断差异显著`);
    }
  }

  // 双票拒绝
  const rejectCounts = new Map<string, number>();
  for (const v of views) {
    for (const r of v.rejected_directions) {
      rejectCounts.set(r.name, (rejectCounts.get(r.name) || 0) + 1);
    }
  }
  for (const [name, count] of rejectCounts) {
    if (count >= 2 && !eliminate.some((e) => e.startsWith(name))) {
      eliminate.push(`${name}（两方明确拒绝）`);
    }
  }

  // R4 否决
  for (const v of views) {
    for (const r of v.main_risks.filter((x) => x.severity === "R4")) {
      irreducible.push(`${labelOf(v.agent_id)}判定：${r.risk}（R4——不可接受）`);
      conflicts.push(`R4否决: ${labelOf(v.agent_id)}认定${r.risk}`);
    }
  }

  // 话术统一度
  const mentals = new Set(views.map((v) => v.key_mental_position));
  if (mentals.size === 1) {
    hard_consensus.push(`三方在一句话定位上一致：「${views[0].key_mental_position}」`);
  } else if (mentals.size === 2) {
    soft_consensus.push("两方话术接近，第三方表述不同——需统一成一句可转述的话");
  } else {
    conflicts.push("三套话术各说各话——必须收敛到一句");
  }

  const game_summary = buildDebateSummary(uniquePref.size, challenges, hard_consensus, soft_consensus, eliminate, views);
  const consensus = [...hard_consensus, ...soft_consensus];

  return {
    agent_id: "cross_fire",
    conflicts: conflicts.length > 0 ? conflicts : ["三方无激烈冲突，但分歧仍在"],
    consensus,
    hard_consensus,
    soft_consensus,
    challenges,
    eliminate,
    irreducible,
    game_summary,
    notes: "辩论基于评分数据生成。最终决策权在Synthesis，不在任何一位大师手中。",
  };
}

// ─── 基于评分数据的攻击生成 ───────────────────────────────────

interface ScoreSummary {
  allNotRecommend: boolean;
  twoNotRecommend: boolean;
  allRecommend: boolean;
  twoRecommend: boolean;
  highVariance: boolean;
  variance: number;
}

function summarizeScores(candidateName: string, views: TheoryView[]): ScoreSummary {
  const scores = views.map(v => {
    const ds = v.direction_scores.find(d => d.name === candidateName);
    return { score: ds?.theory_score ?? 0, recommend: ds?.theory_recommend ?? "neutral" };
  });

  const notRecs = scores.filter(s => s.recommend === "not_recommend").length;
  const recs = scores.filter(s => s.recommend === "strong_recommend" || s.recommend === "recommend").length;
  const numericScores = scores.map(s => s.score);
  const variance = Math.max(...numericScores) - Math.min(...numericScores);

  return {
    allNotRecommend: notRecs === 3,
    twoNotRecommend: notRecs === 2,
    allRecommend: recs === 3,
    twoRecommend: recs === 2,
    highVariance: variance >= 25,
    variance,
  };
}

function extractSplitConflicts(prefs: Array<{ id: TheoryAgentId; label: string; view: TheoryView }>): string[] {
  const result: string[] = [];
  for (let i = 0; i < prefs.length; i++) {
    for (let j = i + 1; j < prefs.length; j++) {
      if (prefs[i].view.preferred_candidate_id !== prefs[j].view.preferred_candidate_id) {
        result.push(
          `${prefs[i].label}推「${prefs[i].view.preferred_direction}」vs ${prefs[j].label}推「${prefs[j].view.preferred_direction}」`,
        );
      }
    }
  }
  return result;
}

function generateChallenges(
  prefs: Array<{ id: TheoryAgentId; label: string; view: TheoryView }>,
  byId: Record<TheoryAgentId, TheoryView>,
  pkg: MatrixInputPackage,
): TheoryChallenge[] {
  const challenges: TheoryChallenge[] = [];
  const pairs: Array<[TheoryAgentId, TheoryAgentId]> = [
    ["ries", "trout"], ["ries", "ye_maozhong"],
    ["trout", "ries"], ["trout", "ye_maozhong"],
    ["ye_maozhong", "ries"], ["ye_maozhong", "trout"],
  ];

  for (const [from, to] of pairs) {
    const attacker = byId[from];
    const defender = byId[to];

    if (attacker.preferred_candidate_id && defender.preferred_candidate_id &&
        attacker.preferred_candidate_id === defender.preferred_candidate_id) {
      challenges.push(buildAgreeBut(from, to, attacker, defender, pkg));
      continue;
    }

    challenges.push(buildDebate(from, to, attacker, defender, pkg));
  }

  return challenges;
}

function buildDebate(
  from: TheoryAgentId, to: TheoryAgentId,
  attacker: TheoryView, defender: TheoryView,
  pkg: MatrixInputPackage,
): TheoryChallenge {
  const target = defender.preferred_direction;
  const severity = computeSeverity(from, to, attacker, defender);

  // 从评分数据中提取攻击点
  const attack = generateDataDrivenAttack(from, to, attacker, defender, pkg);

  return {
    from, to,
    target_direction: target,
    attack,
    defense_hint: generateDataDrivenDefense(to, defender),
    severity,
  };
}

function buildAgreeBut(
  from: TheoryAgentId, to: TheoryAgentId,
  attacker: TheoryView, defender: TheoryView,
  pkg: MatrixInputPackage,
): TheoryChallenge {
  return {
    from, to,
    target_direction: defender.preferred_direction,
    attack: `方向一致但视角不同：${labelOf(from)}的评分侧重与${labelOf(to)}不同，对「${defender.preferred_direction}」的关注点存在差异。`,
    defense_hint: `${labelOf(to)}：方向一致，但${labelOf(from)}的评估角度已收到。`,
    severity: "R1" as RiskLevel,
  };
}

function generateDataDrivenAttack(
  from: TheoryAgentId, to: TheoryAgentId,
  attacker: TheoryView, defender: TheoryView,
  pkg: MatrixInputPackage,
): string {
  // 找 defender 首选方向在 attacker 评分体系中的低分维度
  const defenderScore = attacker.direction_scores.find(
    d => d.name === defender.preferred_direction,
  );

  // 找 attacker 首选方向在 defender 评分体系中的低分维度（互怼弹药）
  const attackerScore = defender.direction_scores.find(
    d => d.name === attacker.preferred_direction,
  );

  const parts: string[] = [];
  const fromLabel = shortLabelOf(from);
  const toLabel = shortLabelOf(to);

  // 弹药 1：对方首选在我的体系下评分低
  if (defenderScore && defenderScore.theory_score < 60) {
    parts.push(`从我的视角看，「${defender.preferred_direction}」仅得 ${defenderScore.theory_score} 分`);
  }

  // 弹药 2：我的首选在你的体系下评分低（反制）
  if (attackerScore && attackerScore.theory_score < 60) {
    parts.push(`反倒是你给我的方向只打了 ${attackerScore.theory_score} 分`);
  }

  // 弹药 3：评分差距
  if (defenderScore && attackerScore) {
    const gap = defenderScore.theory_score - attackerScore.theory_score;
    if (gap < -15) {
      parts.push(`你选的方向在我的维度上比你的差${Math.abs(gap)}分`);
    }
  }

  // 弹药 4：基于理论立场的差异
  const stanceFriction = getStanceFriction(from, to);
  if (stanceFriction) {
    parts.push(stanceFriction);
  }

  if (parts.length > 0) {
    return `【${fromLabel}→${toLabel}】${parts.join("。")}。`;
  }

  return `【${fromLabel}→${toLabel}】我对「${defender.preferred_direction}」的评估与你的选择存在分歧。`;
}

function generateDataDrivenDefense(
  to: TheoryAgentId,
  defender: TheoryView,
): string {
  const selfScore = defender.theory_recommend === "strong_recommend" ? "很高" :
    defender.theory_recommend === "recommend" ? "较高" : "一般";
  return `${shortLabelOf(to)}回击：我的评估基于我的理论框架——「${defender.preferred_direction}」在我的体系下推荐等级为${selfScore}（${defender.theory_recommend}）。`;
}

function computeSeverity(
  from: TheoryAgentId, _to: TheoryAgentId,
  attacker: TheoryView, defender: TheoryView,
): RiskLevel {
  if (attacker.main_risks.some((r) => r.severity === "R4")) return "R4";
  if (defender.theory_recommend === "not_recommend") return "R3";

  // 从评分数据判断冲突严重程度
  const defenderScore = attacker.direction_scores.find(
    d => d.name === defender.preferred_direction,
  );
  if (defenderScore && defenderScore.theory_score < 40) return "R3";
  if (defenderScore && defenderScore.theory_score < 55) return "R2";

  return "R1";
}

function getStanceFriction(from: TheoryAgentId, to: TheoryAgentId): string | null {
  // 理论立场的基本摩擦——不说教，点到为止
  const frictions: Record<string, Record<string, string>> = {
    ries: {
      trout: "你的竞争分析很重要，但我的问题始终是——它能成为第一吗？",
      ye_maozhong: "冲突能带来传播，但不成为第一的冲突撑不起品牌。",
    },
    trout: {
      ries: "你说第一——但没有竞争分析的第一是自封的。",
      ye_maozhong: "冲突不是目的，差异化才是。你的冲突能建立第一联想吗？",
    },
    ye_maozhong: {
      ries: "你的第一需要多少预算打进心智？消费者不在乎谁是第一，他们只在乎哪个适合自己。",
      trout: "你的区隔再锋利，消费者记不住、传不开、做不动，有什么用？",
    },
  };
  return frictions[from]?.[to] ?? null;
}

// ─── 辩论叙事 ─────────────────────────────────────────────────

function buildDebateSummary(
  uniquePref: number,
  challenges: TheoryChallenge[],
  hard: string[],
  soft: string[],
  eliminate: string[],
  views: TheoryView[],
): string {
  const phase1 = uniquePref === 1
    ? "【开场】三方意见一致，但各自给出的评分依据不同。"
    : uniquePref === 2
      ? "【开场】两方方向一致，第三方坚持己见——分歧已经暴露。"
      : "【开场】三足鼎立，各推各的方向。";

  const scoreSummary = views.map(v =>
    `${shortLabelOf(v.agent_id)}首选「${v.preferred_direction}」评分 ${v.direction_scores.find(d => d.name === v.preferred_direction)?.theory_score ?? "?"}/${v.theory_recommend}`,
  ).join("；");

  const phase2 = challenges.length > 0
    ? `【辩论】共 ${challenges.length} 轮观点碰撞。基于评分差异生成：${scoreSummary}。`
    : "【辩论】无明显激烈冲突。";

  const phase3 = hard.length > 0
    ? `【共识】${hard.length} 条硬共识。` + (soft.length > 0 ? `${soft.length} 条软共识。` : "")
    : soft.length > 0
      ? `【共识】${soft.length} 条软共识，无硬共识。`
      : "【共识】零共识。";

  const elimNote = eliminate.length > 0
    ? `【淘汰】${eliminate.join("；")}。`
    : "";

  const finalNote = "【决策】最终取舍由 Synthesis 完成——禁止平均主义。";

  return `${phase1}${phase2}${phase3}${elimNote}${finalNote}`;
}

// ─── 工具函数 ─────────────────────────────────────────────────

function labelOf(id: TheoryAgentId): string {
  switch (id) {
    case "ries": return "里斯定位";
    case "trout": return "特劳特定位";
    case "ye_maozhong": return "叶茂中冲突营销";
  }
}

function shortLabelOf(id: TheoryAgentId): string {
  switch (id) {
    case "ries": return "Ries";
    case "trout": return "Trout";
    case "ye_maozhong": return "Ye";
  }
}

function countBy(ids: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const id of ids) m.set(id, (m.get(id) || 0) + 1);
  return m;
}
