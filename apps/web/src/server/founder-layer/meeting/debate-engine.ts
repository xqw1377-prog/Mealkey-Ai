/**
 * Debate Engine V1 — Conflict Detector / Challenge Router / Synthesis / What-If
 */

import {
  buildConflictMatrix,
} from "./conflict-matrix";
import type {
  ChallengeType,
  DebateChallenge,
  DebateConflict,
  DebateRound,
  DebateSession,
  DecisionProposal,
  ScenarioTest,
} from "../contracts/debate-session";
import {
  AGENT_FROM_COMMITTEE,
  COMMITTEE_FROM_AGENT,
  DEBATE_CHALLENGE_ROUTES,
} from "../contracts/debate-session";
import type { FounderDecision } from "../contracts/decision";
import type { ConflictMatrix } from "../contracts/debate";

function buildId(prefix: string) {
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}`;
  return `${prefix}-${rand}`;
}

function clip(text: string, max = 100): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function evidenceIds(decision: FounderDecision): string[] {
  return decision.evidence
    .map((item) => item.evidenceId)
    .filter((id): id is string => Boolean(id));
}

function byAgent(decisions: FounderDecision[]) {
  return new Map(decisions.map((d) => [d.sourceAgent, d]));
}

/** D1: Conflict Detector — 立场 / 证据缺口 / 假设冲突 */
export function detectDebateConflicts(input: {
  decisions: FounderDecision[];
  matrix: ConflictMatrix;
}): DebateConflict[] {
  const conflicts: DebateConflict[] = [];
  const map = byAgent(input.decisions);

  if (input.matrix.primary) {
    const p = input.matrix.primary;
    conflicts.push({
      conflictId: buildId("CF"),
      topic: p.topic,
      severity: p.sideB.polarity === "--" ? "high" : "medium",
      committees: [...new Set([...p.sideA.agents, ...p.sideB.agents])].map(
        (a) => COMMITTEE_FROM_AGENT[a],
      ),
      evidenceRefs: p.drivingEvidenceIds,
      summary: `${p.topic}：${p.sideA.claim} vs ${p.sideB.claim}`,
    });
  }

  const supports = input.decisions.filter((d) => d.stance === "support");
  const opposes = input.decisions.filter((d) => d.stance === "oppose");
  if (supports.length && opposes.length && !input.matrix.primary) {
    conflicts.push({
      conflictId: buildId("CF"),
      topic: "综合行动节奏",
      severity: "high",
      committees: [...supports, ...opposes].map((d) => COMMITTEE_FROM_AGENT[d.sourceAgent]),
      evidenceRefs: [...supports, ...opposes].flatMap(evidenceIds).slice(0, 6),
      summary: "支持推进与反对/暂缓形成立场冲突",
    });
  }

  // Assumption conflict: market support + business insufficient evidence
  const mkt = map.get("M-MKT");
  const biz = map.get("M-BIZ");
  if (mkt?.stance === "support" && (biz?.stance === "oppose" || biz?.evidenceSufficient === false)) {
    conflicts.push({
      conflictId: buildId("CF"),
      topic: "机会假设 vs 盈利假设",
      severity: "high",
      committees: ["market", "business"],
      evidenceRefs: [...evidenceIds(mkt), ...(biz ? evidenceIds(biz) : [])].slice(0, 4),
      summary: "市场假设需求强，商业假设利润/复制弱",
    });
  }

  // Evidence gap conflict
  for (const d of input.decisions) {
    if (d.evidenceGap && d.evidenceGap.length > 0 && d.stance === "support") {
      conflicts.push({
        conflictId: buildId("CF"),
        topic: `${COMMITTEE_FROM_AGENT[d.sourceAgent]}证据缺口`,
        severity: "medium",
        committees: [COMMITTEE_FROM_AGENT[d.sourceAgent]],
        evidenceRefs: evidenceIds(d),
        summary: clip(d.evidenceGap[0] || "关键事实不足仍给出支持立场", 120),
      });
    }
  }

  // de-dupe by topic
  const seen = new Set<string>();
  return conflicts.filter((c) => {
    if (seen.has(c.topic)) return false;
    seen.add(c.topic);
    return true;
  }).slice(0, 6);
}

function pickChallengeType(
  from: FounderDecision,
  target: FounderDecision,
): ChallengeType {
  if (target.evidenceGap?.length || target.evidenceSufficient === false) return "evidence";
  if (from.risks.length > 0 && (target.stance === "support" || target.stance === "conditional")) {
    return "risk";
  }
  if (/假设|如果|只要|认为/.test(target.judgement) || target.assumptions?.length) {
    return "assumption";
  }
  return "logic";
}

function committeeLabel(agent: FounderDecision["sourceAgent"]): string {
  const map: Record<FounderDecision["sourceAgent"], string> = {
    "M-MKT": "市场委员会",
    "M-PNT": "品牌委员会",
    "M-BIZ": "商业委员会",
    "M-ED": "资本委员会",
  };
  return map[agent];
}

function challengeStatement(
  type: ChallengeType,
  from: FounderDecision,
  target: FounderDecision,
  topic: string,
  targetEvidenceId?: string,
): string {
  const targetEv =
    (targetEvidenceId
      ? target.evidence.find((e) => e.evidenceId === targetEvidenceId)
      : undefined) || target.evidence.find((e) => e.evidenceId);
  const eid = targetEv?.evidenceId || targetEvidenceId;
  const targetName = committeeLabel(target.sourceAgent);
  const cite = eid ? `针对证据 ${eid}` : "针对其核心判断";

  switch (type) {
    case "evidence":
      return eid
        ? `${cite}：${targetName}引用的 ${eid}（${clip(targetEv?.content || "依据", 28)}）不足以支撑「${clip(topic, 16)}」；${clip(target.evidenceGap?.[0] || from.risks[0] || "样本/适用范围存疑", 40)}`
        : `${targetName}对「${clip(topic, 16)}」的证据链不完整：${clip(target.evidenceGap?.[0] || "缺少可核验事实", 48)}`;
    case "assumption":
      return `${cite}：${targetName}隐含假设「${clip(target.assumptions?.[0] || target.judgement, 36)}」未经验证`;
    case "risk":
      return `${cite}：若按${targetName}推进，关键风险是：${clip(from.risks[0] || "执行失控", 48)}`;
    case "logic":
    default:
      return `${cite}：${targetName}的推理「${clip(target.judgement, 32)}」不能直接推出可执行动作；${clip(from.judgement, 36)}`;
  }
}

/** D2: Challenge Router — 按专业关系路由挑战，必须点名对方 Evidence ID */
export function routeDebateChallenges(input: {
  decisions: FounderDecision[];
  matrix: ConflictMatrix;
  conflicts: DebateConflict[];
}): DebateChallenge[] {
  const map = byAgent(input.decisions);
  const topic = input.matrix.primary?.topic || input.conflicts[0]?.topic || "当前议题";
  const challenges: DebateChallenge[] = [];

  for (const from of input.decisions) {
    const fromCommittee = COMMITTEE_FROM_AGENT[from.sourceAgent];
    const preferred = DEBATE_CHALLENGE_ROUTES[fromCommittee];
    let target: FounderDecision | undefined;

    for (const committee of preferred) {
      const agent = AGENT_FROM_COMMITTEE[committee];
      const candidate = map.get(agent);
      if (!candidate) continue;
      if (candidate.sourceAgent === from.sourceAgent) continue;
      if (
        (from.stance === "support" && candidate.stance === "oppose") ||
        (from.stance === "oppose" && candidate.stance === "support") ||
        (from.stance === "conditional" && candidate.stance === "support") ||
        candidate.evidenceSufficient === false
      ) {
        target = candidate;
        break;
      }
      target = target || candidate;
    }

    if (!target) {
      target = input.decisions.find((d) => d.sourceAgent !== from.sourceAgent);
    }
    if (!target) continue;

    const targetEvidenceId =
      evidenceIds(target)[0] ||
      target.evidence.find((e) => e.evidenceId)?.evidenceId ||
      undefined;
    const challengeType = pickChallengeType(from, target);
    const targetClaimId = `claim:${target.sourceAgent}`;
    challenges.push({
      challengeId: buildId("CH"),
      fromCommittee,
      fromAgent: from.sourceAgent,
      targetCommittee: COMMITTEE_FROM_AGENT[target.sourceAgent],
      targetAgent: target.sourceAgent,
      targetClaimId,
      targetEvidenceId,
      challengeType,
      statement: challengeStatement(challengeType, from, target, topic, targetEvidenceId),
      evidenceRefs: evidenceIds(from).slice(0, 2),
    });
  }

  return challenges;
}

/** Round3: Decision Proposal — 解决冲突，不是总结 */
export function synthesizeDecisionProposal(input: {
  decisions: FounderDecision[];
  matrix: ConflictMatrix;
  conflicts: DebateConflict[];
  challenges: DebateChallenge[];
  recommendation?: string;
}): DecisionProposal {
  const tradeoffs = (input.matrix.tradeoffs ?? []).map(
    (t) => `保留「${t.keep}」，暂缓「${t.giveUp}」`,
  );
  const conditions = [
    ...new Set(input.decisions.flatMap((d) => d.nextSteps).filter(Boolean)),
  ].slice(0, 4);
  const risksAccepted = input.decisions
    .filter((d) => d.stance === "support" || d.stance === "conditional")
    .flatMap((d) => d.risks)
    .filter(Boolean)
    .slice(0, 3);

  const hasHighConflict = input.conflicts.some((c) => c.severity === "high");
  const bizOppose = input.decisions.some(
    (d) => d.sourceAgent === "M-BIZ" && (d.stance === "oppose" || d.stance === "conditional"),
  );
  const mktSupport = input.decisions.some(
    (d) => d.sourceAgent === "M-MKT" && d.stance === "support",
  );
  const edOppose = input.decisions.some(
    (d) => d.sourceAgent === "M-ED" && d.stance === "oppose",
  );
  const judgementBlob = input.decisions.map((d) => d.judgement).join(" ");
  const riskBlob = input.decisions.flatMap((d) => d.risks).join(" ");
  const dilutionTopic = /稀释|控制权|融资|股权/.test(`${judgementBlob}${riskBlob}`);
  const supplyTopic = /供应链|跨城|复制|标准化/.test(`${judgementBlob}${riskBlob}`);
  const franchiseTopic = /加盟|开店|扩张/.test(`${judgementBlob}${riskBlob}`);

  const decision =
    edOppose && dilutionTopic
      ? "拒绝无边界稀释；先锁控制权底线与稀释上限，再谈扩张融资"
      : mktSupport && bizOppose && franchiseTopic
        ? "未来90天不开放加盟；先完成直营复制验证，再评估扩张强度"
        : bizOppose && supplyTopic
          ? "暂缓跨城复制；先完成供应链与单店复制验证，再放大动作"
          : hasHighConflict
            ? input.recommendation || "带条件推进：先完成关键验证再放大动作"
            : input.recommendation || "按共识推进，并绑定验证任务";

  const whyNow = input.matrix.primary
    ? `市场与能力在「${input.matrix.primary.topic}」上冲突：${input.matrix.primary.sideA.claim}，同时 ${input.matrix.primary.sideB.claim}`
    : input.conflicts[0]?.summary || "委员会存在可执行分歧，需用验证换确定性";

  const validationPlan =
    conditions[0] ||
    input.decisions.find((d) => d.validation)?.validation ||
    "90天验证关键假设后再决定是否放大";

  return {
    decision: clip(decision, 140),
    whyNow: clip(whyNow, 160),
    tradeoffs: tradeoffs.length
      ? tradeoffs
      : ["保留市场窗口感知，放弃无条件加速"],
    conditions: conditions.length ? conditions : ["完成验证任务", "风险触发则停止"],
    risksAccepted: risksAccepted.length
      ? risksAccepted.map((r) => clip(r, 60))
      : ["可能错过部分短期窗口"],
    validationPlan: clip(validationPlan, 120),
  };
}

/** 反事实压力测试 What-If */
export function buildScenarioTests(input: {
  decisions: FounderDecision[];
  proposal: DecisionProposal;
  matrix: ConflictMatrix;
}): ScenarioTest[] {
  const tests: ScenarioTest[] = [];
  const mkt = input.decisions.find((d) => d.sourceAgent === "M-MKT");
  const biz = input.decisions.find((d) => d.sourceAgent === "M-BIZ");
  const ed = input.decisions.find((d) => d.sourceAgent === "M-ED");

  tests.push({
    scenarioId: buildId("SC"),
    scenario: "如果市场判断错误",
    trigger: mkt?.evidence[0]?.content
      ? `市场依据失效：${clip(mkt.evidence[0].content, 40)}`
      : "需求/窗口判断被证伪",
    impact: "现金流压力上升、库存与租金承压、品牌扩张叙事崩塌",
    mitigation: "先区域小样本测试；设退出线；验证未过不开放加盟",
  });

  tests.push({
    scenarioId: buildId("SC"),
    scenario: "如果复制能力不足仍扩张",
    trigger: biz?.risks[0] || "标准化/人效/供应链未达复制门槛",
    impact: "服务下降、口碑稀释、单店亏损放大",
    mitigation: input.proposal.conditions[0] || "先完成直营复制指标再谈店数",
  });

  if (ed) {
    tests.push({
      scenarioId: buildId("SC"),
      scenario: "如果融资/控制权约束被触发",
      trigger: ed.risks[0] || "稀释或控制权边界突破",
      impact: "决策权旁落、扩张节奏被迫中断",
      mitigation: ed.nextSteps[0] || "先锁控制权与预算上限，再放大投入",
    });
  }

  return tests.slice(0, 3);
}

function round1(decisions: FounderDecision[]): DebateRound {
  return {
    round: 1,
    kind: "independent",
    title: "Round 1 · 独立判断",
    items: decisions.map((d) => ({
      agent: d.sourceAgent,
      committee: COMMITTEE_FROM_AGENT[d.sourceAgent],
      claimId: `claim:${d.sourceAgent}`,
      claim: clip(d.judgement, 80),
      position: d.stance || "neutral",
      confidence: d.confidence,
      evidenceRefs: evidenceIds(d).slice(0, 3),
      summary: clip(d.reasoning || d.judgement, 100),
    })),
  };
}

function round2(
  decisions: FounderDecision[],
  challenges: DebateChallenge[],
  conflicts: DebateConflict[],
): DebateRound {
  return {
    round: 2,
    kind: "challenge",
    title: "Round 2 · 压力测试（挑战）",
    items: challenges.map((ch) => {
      const from = decisions.find((d) => d.sourceAgent === ch.fromAgent);
      return {
        agent: ch.fromAgent,
        committee: ch.fromCommittee,
        claimId: `challenge:${ch.challengeId}`,
        claim: clip(`挑战 ${committeeLabel(ch.targetAgent)}：${ch.statement}`, 80),
        position:
          from?.stance === "support"
            ? "conditional"
            : from?.stance || "conditional",
        confidence: from?.confidence ?? 0.65,
        evidenceRefs: ch.evidenceRefs || (from ? evidenceIds(from).slice(0, 2) : []),
        summary: `${ch.challengeType} → ${ch.targetCommittee}`,
      };
    }),
    challenges,
    conflicts,
  };
}

function round3(proposal: DecisionProposal, scenarioTests: ScenarioTest[]): DebateRound {
  return {
    round: 3,
    kind: "synthesis",
    title: "Round 3 · 解决冲突（提案）",
    items: [
      {
        agent: "M-BIZ",
        committee: "business",
        claim: proposal.decision,
        position: "conditional",
        confidence: 0.72,
        evidenceRefs: [],
        summary: proposal.whyNow,
      },
      {
        agent: "M-MKT",
        committee: "market",
        claim: clip(proposal.tradeoffs[0] || proposal.decision, 80),
        position: "conditional",
        confidence: 0.7,
        evidenceRefs: [],
        summary: `接受风险：${proposal.risksAccepted[0] || "窗口部分错过"}`,
      },
      {
        agent: "M-ED",
        committee: "capital",
        claim: clip(proposal.validationPlan, 80),
        position: "conditional",
        confidence: 0.68,
        evidenceRefs: [],
        summary: scenarioTests[0]
          ? `若 ${scenarioTests[0].scenario} → ${clip(scenarioTests[0].mitigation, 40)}`
          : "绑定验证与退出条件",
      },
    ],
  };
}

/** 构建完整 Debate Session（三轮压力测试） */
export function buildDebateSession(input: {
  missionId: string;
  decisions: FounderDecision[];
  recommendation?: string;
  decisionId?: string;
}): DebateSession {
  const now = new Date().toISOString();
  const matrix = buildConflictMatrix({
    missionId: input.missionId,
    decisions: input.decisions,
  });
  const conflicts = detectDebateConflicts({
    decisions: input.decisions,
    matrix,
  });
  const challenges = routeDebateChallenges({
    decisions: input.decisions,
    matrix,
    conflicts,
  });
  const proposal = synthesizeDecisionProposal({
    decisions: input.decisions,
    matrix,
    conflicts,
    challenges,
    recommendation: input.recommendation,
  });
  const scenarioTests = buildScenarioTests({
    decisions: input.decisions,
    proposal,
    matrix,
  });

  return {
    debateId: buildId("DB"),
    missionId: input.missionId,
    decisionId: input.decisionId,
    status: "synthesis",
    rounds: [
      round1(input.decisions),
      round2(input.decisions, challenges, conflicts),
      round3(proposal, scenarioTests),
    ],
    conflictMatrix: matrix,
    conflicts,
    challenges,
    proposal,
    scenarioTests,
    createdAt: now,
    updatedAt: now,
  };
}
