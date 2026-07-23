import type {
  CrossFireResult,
  MatrixInputPackage,
  TheoryAgentId,
  TheoryChallenge,
  TheoryView,
  RiskLevel,
} from "../types";

/**
 * Cross-Fire Agent — 三理论竞争 · 博弈 · 共识
 *
 * 阶段：
 *  1) 竞争：对比三票偏好，暴露立场分裂
 *  2) 博弈：每个理论 Agent 攻击另两个的首选（站在自己理论体系上开火）
 *  3) 共识：硬共识（三方一致）/ 软共识（两方一致）/ 淘汰 / 不可调和
 *
 * 禁止：把三票平均成「都对一点」的假共识。
 */
export async function runCrossFireAgent(
  pkg: MatrixInputPackage,
  views: [TheoryView, TheoryView, TheoryView],
): Promise<CrossFireResult> {
  const [ries, trout, ye] = views;
  const byId: Record<TheoryAgentId, TheoryView> = {
    ries,
    trout,
    ye_maozhong: ye,
  };

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

  // ─── 1) 竞争：偏好地图 ─────────────────────────────────────
  const prefIds = prefs.map((p) => p.view.preferred_candidate_id).filter(Boolean) as string[];
  const uniquePref = new Set(prefIds);

  if (uniquePref.size === 1) {
    hard_consensus.push(
      `三方竞争后偏好收敛：一致主推「${ries.preferred_direction}」（仍须过 R4/落地否决）`,
    );
  } else if (uniquePref.size === 2) {
    const counts = countBy(prefIds);
    const majorityId = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
    const majorityName =
      pkg.candidates.find((c) => c.id === majorityId)?.name || majorityId;
    soft_consensus.push(
      `软共识：两方倾向「${majorityName}」；第三方仍持异议（禁止直接当最终共识）`,
    );
    conflicts.push(
      `竞争分裂：Ries→${ries.preferred_direction}｜Trout→${trout.preferred_direction}｜Ye→${ye.preferred_direction}`,
    );
  } else {
    conflicts.push(
      `全面竞争：三票各推不同方向 — Ries「${ries.preferred_direction}」vs Trout「${trout.preferred_direction}」vs Ye「${ye.preferred_direction}」`,
    );
    irreducible.push("三方首选互斥，必须经博弈攻击与否决规则取舍，禁止和稀泥平均");
  }

  // ─── 2) 博弈：互相攻击 ─────────────────────────────────────
  const challenges: TheoryChallenge[] = [];
  const pairs: Array<[TheoryAgentId, TheoryAgentId]> = [
    ["ries", "trout"],
    ["ries", "ye_maozhong"],
    ["trout", "ries"],
    ["trout", "ye_maozhong"],
    ["ye_maozhong", "ries"],
    ["ye_maozhong", "trout"],
  ];

  for (const [from, to] of pairs) {
    const attacker = byId[from];
    const defender = byId[to];
    // 只攻击「对方首选 ≠ 己方首选」时才开火；同偏好则跳过无效攻击
    if (
      attacker.preferred_candidate_id &&
      defender.preferred_candidate_id &&
      attacker.preferred_candidate_id === defender.preferred_candidate_id
    ) {
      continue;
    }
    challenges.push(buildChallenge(from, to, attacker, defender, pkg));
  }

  // 同偏好时的理论体系内批判（仍可指出风险）
  if (uniquePref.size === 1) {
    for (const p of prefs) {
      const r3plus = p.view.main_risks.filter((r) =>
        ["R2", "R3", "R4"].includes(r.severity),
      );
      if (r3plus.length) {
        conflicts.push(
          `${p.label} 虽同意主方向，但仍以本理论开火：${r3plus[0].risk}`,
        );
      }
    }
  }

  // ─── 3) 共识 / 淘汰 ────────────────────────────────────────
  // 推荐等级硬共识
  for (const c of pkg.candidates) {
    const recs = views.map((v) => {
      const ds = v.direction_scores.find((d) => d.name === c.name);
      return ds?.theory_recommend;
    });
    if (recs.every((r) => r === "not_recommend")) {
      eliminate.push(`${c.name}（三方 not_recommend 硬共识淘汰）`);
    } else if (recs.filter((r) => r === "not_recommend").length === 2) {
      eliminate.push(`${c.name}（两票 not_recommend 软淘汰，Synthesis 默认降权）`);
    }
    if (
      recs.every(
        (r) => r === "strong_recommend" || r === "recommend",
      )
    ) {
      hard_consensus.push(`${c.name}：三方均至少 recommend（方向级硬共识）`);
    } else if (
      recs.filter((r) => r === "strong_recommend" || r === "recommend").length ===
      2
    ) {
      soft_consensus.push(`${c.name}：两方 recommend 级支持（软共识）`);
    }
  }

  // 拒绝列表双票+
  const rejectCounts = new Map<string, number>();
  for (const v of views) {
    for (const r of v.rejected_directions) {
      rejectCounts.set(r.name, (rejectCounts.get(r.name) || 0) + 1);
    }
  }
  for (const [name, count] of rejectCounts) {
    if (count >= 2 && !eliminate.some((e) => e.startsWith(name))) {
      eliminate.push(`${name}（≥2 方明确拒绝）`);
    }
  }

  // R4
  for (const v of views) {
    for (const r of v.main_risks.filter((x) => x.severity === "R4")) {
      conflicts.push(`${labelOf(v.agent_id)} 打出 R4 否决牌：${r.risk}`);
      irreducible.push(
        `${labelOf(v.agent_id)} 的 R4 禁止该相关方向直接 primary`,
      );
    }
  }

  // 心智话术
  const mentals = new Set(views.map((v) => v.key_mental_position));
  if (mentals.size === 1) {
    hard_consensus.push(`心智话术硬共识：「${views[0].key_mental_position}」`);
  } else if (mentals.size === 2) {
    soft_consensus.push("心智话术两方接近、一方不同，须统一一句可转述版本");
  } else {
    conflicts.push("心智话术三方各说各话，博弈后必须收敛为一句");
  }

  const game_summary = buildGameSummary({
    uniquePref: uniquePref.size,
    challenges,
    hard: hard_consensus,
    soft: soft_consensus,
    eliminate,
    ries,
    trout,
    ye,
  });

  const consensus = [...hard_consensus, ...soft_consensus];

  return {
    agent_id: "cross_fire",
    conflicts:
      conflicts.length > 0
        ? conflicts
        : ["竞争面暂无尖锐分裂，但博弈攻击仍保留理论风险火力"],
    consensus,
    hard_consensus,
    soft_consensus,
    challenges,
    eliminate,
    irreducible,
    game_summary,
    notes:
      "流程=竞争暴露分裂 → 博弈相互攻击 → 硬/软共识与淘汰。最终 primary 权在 Synthesis，不在任一理论 Agent，禁止平均三票。",
  };
}

function buildChallenge(
  from: TheoryAgentId,
  to: TheoryAgentId,
  attacker: TheoryView,
  defender: TheoryView,
  pkg: MatrixInputPackage,
): TheoryChallenge {
  const target = defender.preferred_direction;
  const targetCand = pkg.candidates.find(
    (c) =>
      c.id === defender.preferred_candidate_id || c.name === target,
  );

  const attack = attackLine(from, to, attacker, defender, targetCand?.oneLiner || target);
  const defense_hint = defenseLine(to, defender);
  const severity = pickSeverity(from, attacker, defender);

  return {
    from,
    to,
    target_direction: target,
    attack,
    defense_hint,
    severity,
  };
}

/** 站在攻击方理论体系上开火 */
function attackLine(
  from: TheoryAgentId,
  _to: TheoryAgentId,
  attacker: TheoryView,
  defender: TheoryView,
  targetOneLiner: string,
): string {
  switch (from) {
    case "ries":
      return `【里斯定位】攻击 ${labelOf(defender.agent_id)} 的「${targetOneLiner}」：在心智第一与战略聚焦尺度下，该方向${
        /第一|首选|心智|占位/.test(targetOneLiner)
          ? "看似有占位，但仍可能切口过窄、难成可长期强化的领导概念"
          : "聚焦不足或难称心智第一，长期占位不成立"
      }。里斯侧主推「${attacker.preferred_direction}」。`;
    case "trout":
      return `【特劳特定位】攻击 ${labelOf(defender.agent_id)} 的「${targetOneLiner}」：在竞争空位与第一联想尺度下，该方向${
        /对立|区隔|不|只|空位/.test(targetOneLiner)
          ? "有区隔苗头，但仍可能不够锋利、易被换皮跟进"
          : "缺少可感知空位，更像「更好」而非竞争中的不同"
      }。特劳特侧主推「${attacker.preferred_direction}」。`;
    case "ye_maozhong":
      return `【叶茂中冲突营销】攻击 ${labelOf(defender.agent_id)} 的「${targetOneLiner}」：在冲突记忆与可成交尺度下，该方向${
        /冲突|对立|不|只|打破|而非/.test(targetOneLiner)
          ? "有冲突结构，但须证明能传播、能进店、30 天能验证"
          : "冲突点偏弱或只有正确口号，记不住也带不动成交"
      }。冲突营销侧主推「${attacker.preferred_direction}」。`;
  }
}

function defenseLine(to: TheoryAgentId, defender: TheoryView): string {
  switch (to) {
    case "ries":
      return `里斯防守：若能持续强化同一心智第一概念，仍可争领导占位（${defender.theory_recommend}）`;
    case "trout":
      return `特劳特防守：若空位/第一联想不可轻易替换，跟进成本上升（${defender.theory_recommend}）`;
    case "ye_maozhong":
      return `冲突营销防守：若冲突能被最小动作验证并带动成交，否决可解除（${defender.theory_recommend}）`;
  }
}

function pickSeverity(
  from: TheoryAgentId,
  attacker: TheoryView,
  defender: TheoryView,
): RiskLevel {
  if (attacker.main_risks.some((r) => r.severity === "R4")) return "R4";
  if (defender.theory_recommend === "not_recommend") return "R3";
  if (from === "ye_maozhong" && defender.theory_recommend === "strong_recommend") {
    return "R2"; // 落地视角挑战理想主义强推
  }
  if (from === "trout" && defender.agent_id === "ries") return "R2";
  if (from === "ries" && defender.agent_id === "trout") return "R2";
  return "R1";
}

function buildGameSummary(args: {
  uniquePref: number;
  challenges: TheoryChallenge[];
  hard: string[];
  soft: string[];
  eliminate: string[];
  ries: TheoryView;
  trout: TheoryView;
  ye: TheoryView;
}): string {
  const phase1 =
    args.uniquePref === 1
      ? "竞争阶段：三方首选一度对齐"
      : args.uniquePref === 2
        ? "竞争阶段：两方结盟、一方异议"
        : "竞争阶段：三方鼎立、互不相让";
  const phase2 = `博弈阶段：共发出 ${args.challenges.length} 次跨理论攻击（Ries⇄Trout⇄Ye）`;
  const phase3 =
    args.hard.length > 0
      ? `共识阶段：形成 ${args.hard.length} 条硬共识` +
        (args.soft.length ? `、${args.soft.length} 条软共识` : "")
      : args.soft.length > 0
        ? `共识阶段：仅有 ${args.soft.length} 条软共识，尚无硬共识`
        : "共识阶段：未形成可用共识，交由 Synthesis 按否决链取舍";
  const elim =
    args.eliminate.length > 0
      ? `；淘汰池 ${args.eliminate.length} 项`
      : "";
  return `${phase1} → ${phase2} → ${phase3}${elim}。票面：Ries[${args.ries.theory_recommend}/${args.ries.preferred_direction}] · Trout[${args.trout.theory_recommend}/${args.trout.preferred_direction}] · Ye[${args.ye.theory_recommend}/${args.ye.preferred_direction}]`;
}

function labelOf(id: TheoryAgentId): string {
  switch (id) {
    case "ries":
      return "里斯定位";
    case "trout":
      return "特劳特定位";
    case "ye_maozhong":
      return "叶茂中冲突营销";
  }
}

function countBy(ids: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const id of ids) m.set(id, (m.get(id) || 0) + 1);
  return m;
}
