/**
 * 跑三席思维引擎 → 咨询策略集 + 可接 Cross-Fire 的 TheoryView
 */
import type {
  CrossFireResult,
  TheoryChallenge,
  TheoryLLMAdapter,
  TheoryView,
} from "../types";
import { runCrossFireAgent } from "../agents/cross-fire";
import { runSynthesisAgent } from "../agents/synthesis";
import type { BrandStrategyProject } from "../../consulting/types";
import type {
  AdvisorStrategyCard,
  AdvisorStrategySet,
  CrossFireBrief,
  MarketResearchPack,
  TheoryDossier,
} from "../../consulting/journey-types";
import { runMindEngine } from "./mind-engine";
import { runRivalEngine } from "./rival-engine";
import { runClashEngine } from "./clash-engine";
import {
  SEAT_PUBLIC,
  type SeatVerdict,
  type ThinkingEngineResult,
  type ThinkingFactPack,
} from "./protocol";

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function buildThinkingFactPack(
  project: BrandStrategyProject,
  research: MarketResearchPack,
  city?: string,
): ThinkingFactPack {
  const brief = project.assets.brandBrief;
  const researchRivals = (research.competitorBriefs || [])
    .map((b) => b.name)
    .filter(Boolean);
  const briefRivals = brief?.competitiveSet || [];
  const rivals =
    researchRivals.length > 0
      ? researchRivals.slice(0, 4)
      : briefRivals.length > 0
        ? briefRivals.slice(0, 4)
        : ["周边同质馆", "连锁快餐"];

  const evidenceSnippets: string[] = [];
  for (const s of research.sources || []) {
    const snip = (s.snippet || s.title || "").trim();
    if (snip.length >= 12) evidenceSnippets.push(snip.slice(0, 100));
  }
  for (const n of research.evidenceNotes || []) {
    if ((n || "").trim().length >= 12) evidenceSnippets.push(n.trim().slice(0, 100));
  }
  for (const b of research.competitorBriefs || []) {
    const line = (b.evidenceSentence || b.summary || "").trim();
    if (line.length >= 12) {
      evidenceSnippets.push(`${b.name}：${line}`.slice(0, 100));
    }
  }

  const edgeFromVisit = (research.storeVisitPlan?.tasks || [])
    .filter((t) => t.status === "filled" && (t.observedEvidence || t.filledNote))
    .map((t) => t.observedEvidence || t.filledNote || "")
    .find((x) => x.trim().length >= 8);

  return {
    brandLabel: brief?.categoryDefinition
      ? `${brief.categoryDefinition}馆`
      : "本店",
    category: brief?.categoryDefinition || research.scope?.category || "餐饮",
    city: city || research.scope?.city || "目标城市",
    who: brief?.targetCustomer || "带娃家庭 / 附近高频到店客人",
    need: (brief?.customerNeed || "吃得放心、可预期").replace(/。$/, ""),
    edge: (
      edgeFromVisit ||
      brief?.founderBelief ||
      "一线能把出品做稳"
    ).replace(/。$/, ""),
    rivals,
    whitespace: (research.whitespace || "未被占领的场景心智").replace(/。$/, ""),
    researchHeadline: research.headline,
    categoryTrend: research.categoryTrend,
    consumerShift: research.consumerShift,
    competitiveLandscape: research.competitiveLandscape,
    risks: research.risks || [],
    strengths: [
      brief?.founderBelief || "一线稳出品",
      research.whitespace ? `空位：${research.whitespace.slice(0, 24)}` : "",
      "品牌",
      "运营",
    ].filter(Boolean) as string[],
    weaknesses: ["资源有限，不能多线开战"],
    constraints: ["三席必须互斥", "输出须指导菜单与话术", "proof 须挂证据而非口号"],
    competitorBriefs: (research.competitorBriefs || []).slice(0, 5).map((b) => ({
      name: b.name,
      mentalPosition: b.mentalPosition,
      evidenceSentence: b.evidenceSentence,
      threatToWhitespace: b.threatToWhitespace,
      summary: b.summary,
    })),
    evidenceSnippets: evidenceSnippets.slice(0, 8),
  };
}

function verdictToTheoryView(v: SeatVerdict): TheoryView {
  const agentId =
    v.advisorId === "ye" ? "ye_maozhong" : (v.advisorId as "ries" | "trout");
  const all = [v.preferred, ...v.alternatives];
  return {
    agent_id: agentId,
    agent_name: `${v.publicName}（${v.code}）`,
    preferred_direction: v.preferred.name,
    preferred_candidate_id: v.preferred.id,
    why_this_direction: v.whyThis,
    rejected_directions: v.rejected,
    core_strategic_logic: [
      v.coreLogic,
      ...v.reasoningTrace.map((t) => `${t.step}${t.judgment}`),
    ].join("｜"),
    key_mental_position: v.keyMentalPosition,
    main_risks: v.risks,
    direction_scores: all.map((d) => {
      const isPref = d.id === v.preferred.id;
      return {
        name: d.name,
        theory_score: isPref ? v.totalScore : Math.max(30, v.totalScore - 18),
        theory_recommend: isPref ? v.recommend : "neutral",
      };
    }),
    dimension_breakdown: v.lawChecks.map((c) => ({
      name: c.law,
      score: c.delta,
      note: c.note,
      pass: c.pass,
    })),
    theory_recommend: v.recommend,
    recommendation_level: v.recommend,
    confidence: v.confidence,
  };
}

function toDossier(v: SeatVerdict): TheoryDossier {
  return {
    agentName: `${v.publicName} · ${v.code}`,
    totalScore: v.totalScore,
    recommend: v.recommend,
    preferredDirection: v.preferred.name,
    why: v.whyThis,
    coreLogic: v.coreLogic,
    keyMentalPosition: v.keyMentalPosition,
    dimensionBreakdown: v.lawChecks.map((c) => ({
      name: c.law,
      score: c.delta,
      note: c.note,
      pass: c.pass,
    })),
    directionScores: [v.preferred, ...v.alternatives].map((d) => ({
      name: d.name,
      theory_score: d.id === v.preferred.id ? v.totalScore : Math.max(30, v.totalScore - 18),
      theory_recommend: d.id === v.preferred.id ? v.recommend : "neutral",
    })),
    risks: v.risks.map((r) => ({ risk: r.risk, severity: r.severity })),
    rejected: v.rejected,
  };
}

function verdictToCard(v: SeatVerdict): AdvisorStrategyCard {
  const s = v.strategy;
  return {
    advisorId: v.advisorId,
    oneLiner: s.oneLiner,
    positioningStatement: s.positioningStatement,
    frameOfReference: s.frameOfReference,
    forWhom: s.forWhom,
    jobToBeDone: s.jobToBeDone,
    battlefield: s.battlefield,
    pointOfDifference: s.pointOfDifference,
    differentiation: s.pointOfDifference,
    proof: s.proof,
    sacrifice: s.sacrifice,
    doNotDo: s.doNotDo,
    risk: s.risk,
    rationale: s.rationale,
    proofPlan: s.proofPlan,
    theoryDossier: {
      ...toDossier(v),
      // 把推理迹压进 coreLogic 供案卷可见
      coreLogic: [
        v.coreLogic,
        ...v.reasoningTrace.map((t) => `${t.step} ${t.judgment}`),
      ].join("\n"),
    },
  };
}

function enrichCrossFireWithAmmo(
  base: CrossFireResult,
  seats: ThinkingEngineResult["seats"],
): CrossFireResult {
  const ammoChallenges: TheoryChallenge[] = [];
  const list = [seats.ries, seats.trout, seats.ye];
  for (const from of list) {
    for (const a of from.attackAmmo) {
      const to =
        a.targetSeat === "ye"
          ? seats.ye
          : a.targetSeat === "trout"
            ? seats.trout
            : seats.ries;
      ammoChallenges.push({
        from:
          from.advisorId === "ye"
            ? "ye_maozhong"
            : (from.advisorId as "ries" | "trout"),
        to:
          a.targetSeat === "ye"
            ? "ye_maozhong"
            : (a.targetSeat as "ries" | "trout"),
        target_direction: to.preferred.name,
        attack: a.attack,
        defense_hint: a.defenseHint,
        severity: a.severity,
      });
    }
  }
  // 引擎弹药优先；再补矩阵原有交火
  const merged = [...ammoChallenges, ...(base.challenges || [])];
  const seen = new Set<string>();
  const challenges = merged.filter((c) => {
    const k = `${c.from}->${c.to}:${c.attack.slice(0, 24)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return {
    ...base,
    challenges,
    game_summary:
      base.game_summary ||
      `三席互斥：${SEAT_PUBLIC.ries.name}押「${seats.ries.preferred.name}」；${SEAT_PUBLIC.trout.name}押「${seats.trout.preferred.name}」；${SEAT_PUBLIC.ye.name}押「${seats.ye.preferred.name}」。`,
  };
}

function toCrossFireBrief(cross: CrossFireResult): CrossFireBrief {
  return {
    conflicts: cross.conflicts || [],
    hardConsensus: cross.hard_consensus || [],
    softConsensus: cross.soft_consensus || [],
    challenges: (cross.challenges || []).map((c) => ({
      from: c.from,
      to: c.to,
      targetDirection: c.target_direction,
      attack: c.attack,
      defenseHint: c.defense_hint,
      severity: c.severity,
    })),
    eliminate: cross.eliminate || [],
    irreducible: cross.irreducible || [],
    gameSummary: cross.game_summary || "",
  };
}

/** LLM 可选：有 adapter 时三席并行 LLM invent，失败回退模板 */
export async function runThreeSeatThinkingEngines(
  project: BrandStrategyProject,
  research: MarketResearchPack,
  city?: string,
  options?: { llm?: TheoryLLMAdapter },
): Promise<{
  engine: ThinkingEngineResult;
  set: AdvisorStrategySet;
}> {
  const factPack = buildThinkingFactPack(project, research, city);
  const llm = options?.llm;
  const [ries, trout, ye] = await Promise.all([
    runMindEngine(factPack, { llm }),
    runRivalEngine(factPack, { llm }),
    runClashEngine(factPack, { llm }),
  ]);

  const usedLlm =
    Boolean(llm) &&
    [ries, trout, ye].some((v) =>
      v.reasoningTrace.some((t) => /LLM invent/.test(t.judgment)),
    );

  const engine: ThinkingEngineResult = {
    factPack,
    seats: { ries, trout, ye },
    mode: usedLlm ? "llm_hybrid" : "heuristic",
  };

  const views = {
    ries: verdictToTheoryView(ries),
    trout: verdictToTheoryView(trout),
    ye_maozhong: verdictToTheoryView(ye),
  };

  // 用三席自造方向作为候选包，供 synthesis / cross-fire 对齐
  const pkg = {
    project: {
      name: project.projectId,
      category: factPack.category,
      city: factPack.city,
      stage: "positioning",
    },
    owner: {
      experience: factPack.edge,
      strengths: factPack.strengths,
      weaknesses: factPack.weaknesses,
    },
    previousSummary: factPack.researchHeadline,
    candidates: [ries.preferred, trout.preferred, ye.preferred].map((d) => ({
      id: d.id,
      name: d.name,
      oneLiner: d.oneLiner,
      type: d.type,
      focus: d.focus,
    })),
    constraints: factPack.constraints,
  };

  let cross = await runCrossFireAgent(pkg, [
    views.ries,
    views.trout,
    views.ye_maozhong,
  ]);
  cross = enrichCrossFireWithAmmo(cross, engine.seats);
  const synthesis = await runSynthesisAgent(pkg, views, cross);
  const brief = toCrossFireBrief(cross);

  const strategies = [
    verdictToCard(ries),
    verdictToCard(trout),
    verdictToCard(ye),
  ];

  const set: AdvisorStrategySet = {
    setId: createId("adv"),
    status: "ready",
    strategies,
    conflictSummary: [
      `${SEAT_PUBLIC.ries.name}押「${ries.preferred.name}」（${ries.totalScore}分）；`,
      `${SEAT_PUBLIC.trout.name}押「${trout.preferred.name}」（${trout.totalScore}分）；`,
      `${SEAT_PUBLIC.ye.name}押「${ye.preferred.name}」（${ye.totalScore}分）。`,
      brief.gameSummary ? `${brief.gameSummary}；` : "",
      "三案不能同时当主航道——会议室必须选一个主轴，其余降为约束。",
    ].join(""),
    generatedAt: new Date().toISOString(),
    theoryMode: engine.mode === "llm_hybrid" ? "llm_hybrid" : "heuristic",
    crossFire: brief,
    synthesisNote:
      synthesis.why_choose_this || synthesis.final_recommended_position,
  };

  return { engine, set };
}

export { SEAT_PUBLIC };
export {
  evidenceBackedProof,
  ownedMentalWord,
  unlikeCompetitorLine,
  wordOwnershipClaim,
} from "./fact-evidence";
