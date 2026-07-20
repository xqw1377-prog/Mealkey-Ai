/**
 * Founder OS 决策委员会会议引擎 V1.0
 *
 * 真正「开会」而非七个 AI 分别回答：
 * 议题识别 → 专业调查 → 独立观点 → 质询碰撞 → 冲突图 → 决议板 → 少数意见 → Founder → 学习
 * V2.0 升级：集成跨角色质询引擎 + 情景分析 + 常委战绩追踪
 */

import {
  agendaToCasePacket,
  buildAgendaBrief,
  CDO_CONTRACT,
} from "./cdo";
import { memoryFromBrief } from "./decision-memory";
import { applyFounderOverride, buildDecisionBrief } from "./decision-brief";
import { getDecisionType } from "./catalog";
import {
  classifyDecisionIssue,
  type DecisionIssue,
} from "./issue-classifier";
import { buildChallengeFromPersona, getPersonaV2 } from "./persona-v2";
import { buildCouncilRuntimePrompt } from "./prompt-stack";
import { attachWeights, resolveCouncilDecision } from "./resolution";
import {
  generateExaminationPacket,
  renderExaminationBlock,
} from "./cross-examination";
import { runScenarioAnalysis, renderScenarioBlock } from "./scenario-engine";
import {
  recordCouncilDecision,
  renderTrackRecordBlock,
  buildCalibrationHint,
} from "./track-record";
import { type DecisionTrace, type MKInsight } from "./mk-insight";
import type {
  AgendaBrief,
  CasePacket,
  CouncilOpinion,
  CouncilPosition,
  CouncilRoleId,
  DecisionBrief,
  DecisionMemory,
  DecisionResolution,
  EvidencePacket,
  ExpertReport,
  IssueLevel,
  RecommendedAction,
} from "./types";

export type CouncilMeetingRound = 1 | 2 | 3;

export type CouncilMeetingPhase =
  | "classified"
  | "awaiting_experts"
  | "round1_prompts_ready"
  | "round1_matrix_ready"
  | "round2_challenges_ready"
  | "round2_conflicts_ready"
  | "round3_resolution"
  | "awaiting_founder"
  | "closed";

/** Round1 独立观点矩阵 */
export interface StanceMatrix {
  support: CouncilRoleId[];
  oppose: CouncilRoleId[];
  conditional: CouncilRoleId[];
  rows: Array<{
    member: CouncilRoleId;
    position: CouncilPosition;
    judgment: string;
    bias: string;
  }>;
}

/** Round2 冲突图 */
export interface ConflictEntry {
  topic: string;
  agentA: CouncilRoleId;
  agentB: CouncilRoleId;
  evidenceA: string[];
  evidenceB: string[];
  challenge: string;
  resolution?: string;
}

/** Founder 决策板（董事会材料） */
export interface DecisionBoard {
  title: string;
  consensus: string[];
  biggestDispute: string;
  minorityReport: string[];
  recommendedAction: RecommendedAction;
  conditions: string[];
  risks: string[];
  validation: Array<{ task: string; metric: string }>;
  founderChoices: Array<"接受委员会" | "修改方案" | "推翻委员会">;
  supportBullets: string[];
}

/** 学习校准快照 */
export interface ExpertCalibrationHint {
  member: CouncilRoleId;
  notedForReview: boolean;
  reason: string;
}

export interface CouncilMeetingSession {
  sessionId: string;
  phase: CouncilMeetingPhase;
  issue: DecisionIssue;
  agenda: AgendaBrief;
  casePacket: CasePacket;
  roster: CouncilRoleId[];
  requiredEngines: string[];
  expertReports: ExpertReport[];
  /** MKInsight 真源；ExpertReport 为其兼容投影 */
  insights?: MKInsight[];
  /** Decision Trace 草案（关闭时补全） */
  decisionTrace?: DecisionTrace;
  evidencePacket?: EvidencePacket;
  round1Prompts: Partial<Record<CouncilRoleId, string>>;
  round1Opinions: CouncilOpinion[];
  stanceMatrix?: StanceMatrix;
  challenges: string[];
  round2Prompts: Partial<Record<CouncilRoleId, string>>;
  conflicts: ConflictEntry[];
  opinions: CouncilOpinion[];
  resolutionDetail?: DecisionResolution;
  board?: DecisionBoard;
  minorityReport: string[];
  brief?: DecisionBrief;
  memory?: DecisionMemory;
  calibrationHints: ExpertCalibrationHint[];
  cdoNote: string;
  /** V2 扩展：跨角色质询包 */
  examinationPacket?: ReturnType<typeof generateExaminationPacket>;
  /** V2 扩展：情景分析结果 */
  scenarioResults?: Record<CouncilRoleId, ReturnType<typeof runScenarioAnalysis>>;
}

function buildId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}`;
  return `${prefix}-${rand}`;
}

const CHALLENGE_PAIRS: Array<[CouncilRoleId, CouncilRoleId]> = [
  ["BMO", "CBO"],
  ["CMO", "BMO"],
  ["CFO", "BMO"],
  ["COO", "BMO"],
  ["CSO", "CFO"],
  ["CRO", "CSO"],
  ["CBO", "CMO"],
];

function collectEvidenceIds(
  op: CouncilOpinion,
  packet?: EvidencePacket,
): string[] {
  const fromOp = op.evidence_used ?? [];
  if (fromOp.length) return fromOp;
  const engineHint =
    op.member === "CMO"
      ? "M-MKT"
      : op.member === "CBO"
        ? "M-PNT"
        : op.member === "BMO"
          ? "M-BIZ"
          : op.member === "CFO" || op.member === "CRO"
            ? "M-ED"
            : undefined;
  return (packet?.items ?? [])
    .filter((i) => !engineHint || i.sourceAgent === engineHint)
    .slice(0, 2)
    .map((i) => i.evidenceId);
}

/** 构建独立观点矩阵 */
export function buildStanceMatrix(opinions: CouncilOpinion[]): StanceMatrix {
  const support: CouncilRoleId[] = [];
  const oppose: CouncilRoleId[] = [];
  const conditional: CouncilRoleId[] = [];
  const rows = opinions.map((o) => {
    if (o.position === "support") support.push(o.member);
    else if (o.position === "oppose") oppose.push(o.member);
    else conditional.push(o.member);
    return {
      member: o.member,
      position: o.position,
      judgment: o.judgment || o.summary,
      bias: getPersonaV2(o.member).natural_bias,
    };
  });
  return { support, oppose, conditional, rows };
}

/** 渲染矩阵文本（董事会材料用） */
export function renderStanceMatrixText(matrix: StanceMatrix): string {
  const header = "席位\t支持\t反对\t条件";
  const lines = matrix.rows.map((r) => {
    const s = r.position === "support" ? "✓" : "";
    const o = r.position === "oppose" ? "✓" : "";
    const c = r.position === "conditional" ? "✓" : "";
    return `${r.member}\t${s}\t${o}\t${c}`;
  });
  return [header, ...lines].join("\n");
}

/** 从对立立场构建 Conflict Map（必须挂 Evidence ID） */
export function buildConflictMap(
  opinions: CouncilOpinion[],
  challenges: string[],
  evidencePacket?: EvidencePacket,
): ConflictEntry[] {
  const byMember = new Map(opinions.map((o) => [o.member, o]));
  const conflicts: ConflictEntry[] = [];

  for (const [a, b] of CHALLENGE_PAIRS) {
    const oa = byMember.get(a);
    const ob = byMember.get(b);
    if (!oa || !ob) continue;
    if (oa.position === ob.position && oa.position === "support") continue;
    if (oa.position === "oppose" && ob.position === "oppose") continue;

    const challenge =
      challenges.find((c) => c.includes(`${a}→${b}`)) ??
      buildChallengeFromPersona(a, b);

    conflicts.push({
      topic: `${getPersonaV2(a).natural_bias} vs ${getPersonaV2(b).natural_bias}`,
      agentA: a,
      agentB: b,
      evidenceA: collectEvidenceIds(oa, evidencePacket),
      evidenceB: collectEvidenceIds(ob, evidencePacket),
      challenge: `${challenge}（须引用 Evidence ID）`,
      resolution: undefined,
    });
  }
  return conflicts;
}

/** 少数意见：反对票 + 红线 + minority_report 标记 */
export function extractMinorityReport(opinions: CouncilOpinion[]): string[] {
  const out: string[] = [];
  for (const o of opinions) {
    if (o.position === "oppose") {
      out.push(`[${o.member}/反对] ${o.judgment || o.summary}`);
    }
    if (o.veto) {
      out.push(`[${o.member}/红线] ${o.veto_reason || o.summary}`);
    }
    if (o.minority_report) {
      out.push(`[${o.member}/保留] ${o.summary}`);
    }
  }
  return [...new Set(out)];
}

/** 组装 Founder Decision Board */
export function buildDecisionBoard(input: {
  title: string;
  opinions: CouncilOpinion[];
  resolution: DecisionResolution;
  conflicts: ConflictEntry[];
  minorityReport: string[];
}): DecisionBoard {
  const matrix = buildStanceMatrix(input.opinions);
  const consensus = [
    ...matrix.support.map((m) => `${m} ✓`),
    ...matrix.conditional.map((m) => `${m}（条件）`),
  ];
  const biggest =
    input.conflicts[0]?.topic ??
    (matrix.oppose.length
      ? `反对席：${matrix.oppose.join("、")}`
      : "暂无尖锐对立");

  const validation = [
    {
      task: input.resolution.execution_bet?.validation_cycle ?? "默认验证周期",
      metric: input.resolution.execution_bet?.kill_metric ?? "杀出线指标",
    },
    ...input.opinions
      .filter((o) => o.needs_validation)
      .slice(0, 2)
      .map((o) => ({
        task: `${o.member} 验证项`,
        metric: o.needs_validation!,
      })),
  ];

  return {
    title: input.title,
    consensus,
    biggestDispute: biggest,
    minorityReport: input.minorityReport,
    recommendedAction: input.resolution.recommended_action,
    conditions: input.resolution.required_conditions,
    risks: input.opinions.flatMap((o) => o.risks).slice(0, 5),
    validation,
    founderChoices: ["接受委员会", "修改方案", "推翻委员会"],
    supportBullets: input.resolution.majority_view.slice(0, 6),
  };
}

/** 学习层：标记需复盘的席位（少数意见 / 红线） */
export function buildCalibrationHints(
  opinions: CouncilOpinion[],
): ExpertCalibrationHint[] {
  return opinions
    .filter((o) => o.position === "oppose" || o.veto)
    .map((o) => ({
      member: o.member,
      notedForReview: true,
      reason: o.veto
        ? `红线否决：${o.veto_reason || o.summary}`
        : `少数意见：${o.judgment || o.summary}`,
    }));
}

/**
 * CDO：议题识别 + 召集
 * 流程：老板问题 → Issue Classification → Agenda → Session
 */
export function conveneCouncilMeeting(input: {
  topic: string;
  whyNow?: string;
  objective?: string;
  constraints?: string[];
  deadline?: string;
  forceLevel?: IssueLevel;
  caseId?: string;
  /** 强制花名册（决策室专项会 / 重大决策全员） */
  forceRoster?: CouncilRoleId[];
}): CouncilMeetingSession {
  const issue = classifyDecisionIssue({
    question: input.topic,
    decisionDeadline: input.deadline,
    forceLevel: input.forceLevel,
  });

  const agenda = buildAgendaBrief({
    topic: input.topic,
    whyNow: input.whyNow,
    objective: input.objective,
    constraints: input.constraints,
    deadline: input.deadline,
    decisionType: issue.decisionType,
    forceLevel: issue.importance,
  });

  // 用议题识别的花名册覆盖（更贴 L1/L2 裁剪）；可被 forceRoster 覆盖
  const roster =
    input.forceRoster && input.forceRoster.length > 0
      ? [...new Set(input.forceRoster)]
      : issue.suggestedRoster;
  agenda.roster = roster;
  agenda.requiredEngines = issue.relatedAgents;
  agenda.conveneCouncil = roster.length > 0;
  agenda.level = issue.importance;
  agenda.founderRequired = issue.importance === "L3" || issue.importance === "L4";

  const casePacket = agendaToCasePacket(agenda, input.caseId);

  return {
    sessionId: buildId("FDC"),
    phase: agenda.conveneCouncil ? "awaiting_experts" : "closed",
    issue,
    agenda,
    casePacket,
    roster: agenda.roster,
    requiredEngines: agenda.requiredEngines,
    expertReports: [],
    round1Prompts: {},
    round1Opinions: [],
    challenges: [],
    round2Prompts: {},
    conflicts: [],
    opinions: [],
    minorityReport: [],
    calibrationHints: [],
    cdoNote: `${CDO_CONTRACT.chinese}：${issue.type}/${issue.importance} · ${issue.whyClassified.join("；")} · 花名册 ${agenda.roster.join(",")}`,
  };
}

export function prepareRound1(
  session: CouncilMeetingSession,
  expertReports: ExpertReport[],
  evidencePacket?: EvidencePacket,
  insights?: MKInsight[],
): CouncilMeetingSession {
  const round1Prompts: Partial<Record<CouncilRoleId, string>> = {};
  for (const roleId of session.roster) {
    const scenarioResults = runScenarioAnalysis(roleId, session.agenda.topic);
    const scenarioBlock = renderScenarioBlock(roleId, scenarioResults);
    const trackRecordBlock = renderTrackRecordBlock(roleId);

    round1Prompts[roleId] =
      buildCouncilRuntimePrompt({
        roleId,
        casePacket: session.casePacket,
        expertReports,
        evidencePacket,
        insights,
        round: 1,
      }) +
      "\n\n" +
      scenarioBlock +
      "\n\n" +
      trackRecordBlock +
      "\n\n# Round1 硬规则\n禁止查看或引用其他常委观点。只输出独立判断。避免互相迎合。\n";
  }
  return {
    ...session,
    expertReports,
    insights: insights?.length ? insights : session.insights,
    evidencePacket,
    round1Prompts,
    phase: "round1_prompts_ready",
    cdoNote: `${session.cdoNote} | Round1 独立陈述 Prompt 就绪（禁止互看）${
      insights?.length ? ` · MKInsight×${insights.length}` : ""
    }`,
  };
}

/** 提交 Round1 意见 → 观点矩阵 */
export function submitRound1Opinions(
  session: CouncilMeetingSession,
  opinions: CouncilOpinion[],
): CouncilMeetingSession {
  const filtered = opinions.filter((o) => session.roster.includes(o.member));
  const stanceMatrix = buildStanceMatrix(filtered);
  // 记录决策到战迹
  for (const op of filtered) {
    recordCouncilDecision({
      caseId: session.casePacket.caseId,
      topic: session.agenda.topic,
      member: op.member,
      position: op.position,
      confidence: op.confidence,
      judgment: op.judgment || op.summary,
      top_risk: op.top_risk || "",
      prediction: op.prediction,
    });
  }
  return {
    ...session,
    round1Opinions: filtered,
    opinions: filtered,
    stanceMatrix,
    phase: "round1_matrix_ready",
    cdoNote: `${session.cdoNote} | 观点矩阵 支持${stanceMatrix.support.length}/反对${stanceMatrix.oppose.length}/条件${stanceMatrix.conditional.length}`,
  };
}

export function prepareRound2(
  session: CouncilMeetingSession,
  round1Opinions?: CouncilOpinion[],
): CouncilMeetingSession {
  const opinions = round1Opinions ?? session.round1Opinions;
  let next = session;
  if (round1Opinions) {
    next = submitRound1Opinions(session, round1Opinions);
  }

  const rosterSet = new Set(next.roster);
  const challenges: string[] = [];

  // V2 升级：使用跨角色质询引擎生成质询
  const examinationPacket = generateExaminationPacket({
    roster: next.roster,
    opinions,
    evidencePacket: next.evidencePacket,
  });

  // 记录质询到 challenges 列表
  for (const ce of examinationPacket) {
    const ev = ce.targetEvidenceId ? `（依据 ${ce.targetEvidenceId}）` : "";
    const sev = ce.severity === "high" ? "🔥" : "📌";
    challenges.push(
      `${sev} [${ce.from}→${ce.to}] ${ce.question}${ev} — 冲突轴：${ce.conflictAxis}`,
    );
  }

  // 补充传统角色自检
  for (const [from, to] of CHALLENGE_PAIRS) {
    if (!rosterSet.has(from) || !rosterSet.has(to)) continue;
    const alreadyIncluded = challenges.some((c) => c.includes(`${from}→${to}`));
    if (!alreadyIncluded) {
      const target = opinions.find((o) => o.member === to);
      const ev = target?.evidence_used?.[0] ?? "E-PENDING";
      challenges.push(
        `${buildChallengeFromPersona(from, to)} — 请针对对方依据 ${ev} 提出质疑，并给出己方 Evidence ID`,
      );
    }
  }

  for (const roleId of next.roster) {
    const p = getPersonaV2(roleId);
    const q = p.question_bank[0];
    if (q) challenges.push(`[${roleId} 自检] ${q.id}: ${q.question}`);
  }

  const peerSummary = opinions
    .map((o) => {
      const bias = getPersonaV2(o.member).natural_bias;
      const ev = (o.evidence_used ?? []).join(",") || "无ID";
      return `- [${o.member}/${bias}/${o.position}] ${o.judgment || o.summary} | evidence=${ev}`;
    })
    .join("\n");

  const round2Prompts: Partial<Record<CouncilRoleId, string>> = {};
  for (const roleId of next.roster) {
    const mine = challenges.filter(
      (c) => c.includes(`${roleId}→`) || c.includes(`[${roleId}`),
    );
    // 构建质询文本
    const examBlock = renderExaminationBlock(roleId, examinationPacket);
    // 校准提示
    const calibrationHint = buildCalibrationHint(roleId);

    round2Prompts[roleId] =
      buildCouncilRuntimePrompt({
        roleId,
        casePacket: next.casePacket,
        expertReports: next.expertReports,
        evidencePacket: next.evidencePacket,
        peerOpinionsSummary: peerSummary,
        challengePacket: mine.length ? mine : challenges.slice(0, 4),
        round: 2,
      }) +
      "\n\n" +
      examBlock +
      "\n\n## 校准提示\n" +
      calibrationHint;
  }

  const conflicts = buildConflictMap(opinions, challenges, next.evidencePacket);

  // 生成情景分析
  const scenarioResults: Record<CouncilRoleId, ReturnType<typeof runScenarioAnalysis>> = {} as Record<CouncilRoleId, ReturnType<typeof runScenarioAnalysis>>;
  for (const role of next.roster) {
    scenarioResults[role] = runScenarioAnalysis(role, next.agenda.topic);
  }

  return {
    ...next,
    challenges,
    round2Prompts,
    conflicts,
    examinationPacket,
    scenarioResults,
    phase: "round2_challenges_ready",
    cdoNote: `${next.cdoNote} | Round2 质询 ${challenges.length} · 冲突 ${conflicts.length} · 情景分析 ${Object.keys(scenarioResults).length}`,
  };
}

/** 记录冲突消解说明（可选） */
export function resolveConflicts(
  session: CouncilMeetingSession,
  resolutions: Array<{ agentA: CouncilRoleId; agentB: CouncilRoleId; resolution: string }>,
): CouncilMeetingSession {
  const conflicts = session.conflicts.map((c) => {
    const hit = resolutions.find(
      (r) => r.agentA === c.agentA && r.agentB === c.agentB,
    );
    return hit ? { ...c, resolution: hit.resolution } : c;
  });
  return {
    ...session,
    conflicts,
    phase: "round2_conflicts_ready",
  };
}

export function closeCouncilMeeting(
  session: CouncilMeetingSession,
  finalOpinions: CouncilOpinion[],
  opts?: {
    founderConfirmed?: boolean;
    founderAction?: RecommendedAction;
    founderOverride?: {
      whyDisagree: string[];
      coreJudgment?: string;
      acceptedRisks?: string[];
      validationMethod?: string;
    };
  },
): CouncilMeetingSession {
  const opinions = attachWeights(finalOpinions, session.casePacket.decisionType);
  const resolution = resolveCouncilDecision({
    decisionType: session.casePacket.decisionType,
    opinions,
    level: session.agenda.level,
    founderConfirmed: opts?.founderConfirmed ?? !session.agenda.founderRequired,
  });

  const minorityReport = extractMinorityReport(opinions);
  // 强制保留少数意见到 resolution
  resolution.minority_report = [
    ...new Set([...resolution.minority_report, ...minorityReport]),
  ];

  const board = buildDecisionBoard({
    title: session.agenda.topic,
    opinions,
    resolution,
    conflicts: session.conflicts,
    minorityReport,
  });

  let brief = buildDecisionBrief({
    casePacket: session.casePacket,
    evidencePacket: session.evidencePacket,
    expertReports: session.expertReports,
    councilOpinions: opinions,
    resolution,
  });

  if (opts?.founderAction && opts.founderOverride) {
    brief = applyFounderOverride({
      brief,
      founderAction: opts.founderAction,
      whyDisagree: opts.founderOverride.whyDisagree,
      coreJudgment: opts.founderOverride.coreJudgment,
      acceptedRisks: opts.founderOverride.acceptedRisks,
      validationMethod: opts.founderOverride.validationMethod,
    });
  }

  const memory = memoryFromBrief(brief);
  const calibrationHints = buildCalibrationHints(opinions);
  const needsFounder =
    session.agenda.founderRequired &&
    !opts?.founderConfirmed &&
    !opts?.founderAction;

  return {
    ...session,
    opinions,
    stanceMatrix: buildStanceMatrix(opinions),
    resolutionDetail: resolution,
    board,
    minorityReport,
    brief,
    memory,
    calibrationHints,
    phase: needsFounder ? "awaiting_founder" : "closed",
    cdoNote: `${session.cdoNote} | 决议板 ${resolution.recommended_action} | 少数意见 ${minorityReport.length} | Memory ${memory.memoryId}`,
  };
}

export function runCouncilMeetingSync(input: {
  topic: string;
  expertReports: ExpertReport[];
  opinions: CouncilOpinion[];
  evidencePacket?: EvidencePacket;
  forceLevel?: IssueLevel;
  founderConfirmed?: boolean;
}): CouncilMeetingSession {
  let session = conveneCouncilMeeting({
    topic: input.topic,
    forceLevel: input.forceLevel,
  });
  if (!session.agenda.conveneCouncil) {
    return {
      ...session,
      phase: "closed",
      cdoNote: "无常委花名册，跳过会议",
    };
  }
  session = prepareRound1(session, input.expertReports, input.evidencePacket);
  session = prepareRound2(session, input.opinions);
  return closeCouncilMeeting(session, input.opinions, {
    founderConfirmed: input.founderConfirmed,
  });
}

export function describeMeetingPlan(session: CouncilMeetingSession): string {
  const dt = getDecisionType(session.casePacket.decisionType);
  return [
    `FDC Session ${session.sessionId}`,
    `Issue: ${session.issue.type} / ${session.issue.importance}`,
    `Phase: ${session.phase}`,
    `Level: ${session.agenda.level} · Type: ${dt.name}`,
    `Roster: ${session.roster.join(", ") || "—"}`,
    `Engines: ${session.requiredEngines.join(", ")}`,
    `Biases: ${session.roster.map((r) => `${r}=${getPersonaV2(r).natural_bias}`).join(" · ")}`,
    session.stanceMatrix
      ? `Matrix: 支持${session.stanceMatrix.support.length} 反对${session.stanceMatrix.oppose.length} 条件${session.stanceMatrix.conditional.length}`
      : "",
    session.board
      ? `Board: ${session.board.recommendedAction} · 争议=${session.board.biggestDispute}`
      : "",
    session.examinationPacket
      ? `质询包：${session.examinationPacket.length} 条交叉质询`
      : "",
    session.cdoNote,
  ]
    .filter(Boolean)
    .join("\n");
}

export type { DecisionIssue };
export { classifyDecisionIssue } from "./issue-classifier";
