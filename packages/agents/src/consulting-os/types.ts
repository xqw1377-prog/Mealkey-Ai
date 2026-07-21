/**
 * 四 Agent 共享：六步咨询价值路径内核
 * 文档：docs/CONSULTING_SIX_STEP_AGENTS_FREEZE.md
 */

import type {
  AdaptiveFollowupSession,
  ModuleBasicsProfile,
} from "./intake/core";

export type ConsultingAgentKind = "m-mkt" | "m-biz" | "m-ed";

export enum SixStepId {
  INTAKE = "INTAKE",
  RESEARCH = "RESEARCH",
  ADVISORS = "ADVISORS",
  WAR_ROOM = "WAR_ROOM",
  STRATEGY_LOCK = "STRATEGY_LOCK",
  EXECUTION_PATH = "EXECUTION_PATH",
}

export const SIX_STEP_ORDER: SixStepId[] = [
  SixStepId.INTAKE,
  SixStepId.RESEARCH,
  SixStepId.ADVISORS,
  SixStepId.WAR_ROOM,
  SixStepId.STRATEGY_LOCK,
  SixStepId.EXECUTION_PATH,
];

export type StepLabel = { no: string; title: string; feel: string };

export type IntakeQuestion = {
  id: string;
  prompt: string;
  choices: Array<{ label: string; text: string }>;
};

export type AdvisorPersona = {
  id: string;
  name: string;
  model: string;
  question: string;
  initial: string;
  toneClass: string;
};

export type ResearchPack = {
  packId: string;
  status: "draft" | "ready" | "confirmed";
  headline: string;
  sections: Array<{ title: string; body: string }>;
  risks: string[];
  generatedAt: string;
  confirmedAt?: string;
  /** 扫描范围卡（M-MKT 等加厚用） */
  scope?: {
    city: string;
    category: string;
    intent: string;
    constraint: string;
  };
  competitorBriefs?: Array<{ name: string; play: string; threat: string }>;
  fullMarkdown?: string;
  collectionMode?: "engine" | "heuristic" | "hybrid";
  sources?: string[];
  /**
   * 外呼/引擎不可用时的明示降级说明。
   * 有值时 UI 必须展示；且不得与 collectionMode=engine 同时出现。
   */
  degradationNote?: string;
};

/** 进入/模式/治理等席位方案包（各 Agent 自填结构） */
export type AdvisorPlaybook = {
  title?: string;
  entryMode?: string;
  sceneCut?: string;
  menuPilot?: string[];
  killLine?: string;
  weekProof?: string;
  sacrifice?: string;
  scorecard?: Array<{ label: string; score: number; note: string }>;
  scripts?: {
    storefront?: string;
    staffBrief?: string;
    forbidden?: string[];
  };
  marketingMoves?: string[];
  crossFireAmmo?: string;
  /** 允许席位引擎挂完整对象 */
  [key: string]: unknown;
};

export type AdvisorStrategyCard = {
  advisorId: string;
  oneLiner: string;
  battlefield: string;
  differentiation: string;
  proof: string;
  doNotDo: string;
  risk: string;
  rationale: string;
  /** M-MKT 进入方案包等 */
  entryScheme?: AdvisorPlaybook & {
    seatId?: string;
    title: string;
    entryMode: string;
    sceneCut: string;
    menuPilot: string[];
    killLine: string;
    weekProof: string;
    sacrifice: string;
    scorecard: Array<{ label: string; score: number; note: string }>;
    scripts: {
      storefront: string;
      staffBrief: string;
      forbidden: string[];
    };
    marketingMoves: string[];
    crossFireAmmo: string;
  };
  /** M-BIZ 四官模式方案包 */
  modeScheme?: {
    seatId?: string;
    title: string;
    northStar: string;
    proofPlan: string[];
    killLine: string;
    weekProof: string;
    sacrifice: string;
    scorecard: Array<{ label: string; score: number; note: string }>;
    scripts: {
      allHands: string;
      weeklyReview: string;
      forbidden: string[];
    };
    operatingMoves: string[];
    crossFireAmmo: string;
  };
  /** M-ED 四方治理方案包 */
  governScheme?: {
    seatId?: string;
    title: string;
    lockFirst: string;
    mustSign: string[];
    killLine: string;
    weekProof: string;
    sacrifice: string;
    scorecard: Array<{ label: string; score: number; note: string }>;
    scripts: {
      founderBrief: string;
      counselBrief: string;
      forbidden: string[];
    };
    nextMoves: string[];
    crossFireAmmo: string;
  };
  crossFireNote?: string;
};

export type AdvisorStrategySet = {
  setId: string;
  status: "draft" | "ready";
  strategies: AdvisorStrategyCard[];
  conflictSummary: string;
  /** 交火一句话（进会议室前可见） */
  gameSummary?: string;
  generatedAt: string;
};

/** 轻量议程相位（对齐 M-PNT，含反驳/改策） */
export type WarRoomAgendaPhase =
  | "call_to_order"
  | "pitch"
  | "crossfire"
  | "rebuttal"
  | "revise"
  | "chair_synthesis"
  | "founder_vote"
  | "resolution";

export type WarRoomTurn = {
  speaker: string;
  kind:
    | "pitch"
    | "challenge"
    | "rebuttal"
    | "revise"
    | "vote"
    | "synthesis"
    | "decision"
    | "host";
  text: string;
  at: string;
  agendaPhase?: WarRoomAgendaPhase;
  agendaLabel?: string;
};

/** 一页纸决策卡 — 拍板前对照 */
export type FounderDecisionOption = {
  advisorId: string;
  seatName: string;
  seatCode: string;
  oneLiner: string;
  sacrifice: string;
  thisWeekProof: string;
  ifChoose: string;
  /** 不选的代价 */
  ifNot?: string;
};

export type FounderDecisionCard = {
  title: string;
  subtitle: string;
  question: string;
  options: FounderDecisionOption[];
  blendHint: string;
  rule: string;
};

export type WarRoomConsensus = {
  roomId: string;
  status: "open" | "awaiting_user" | "agreed";
  currentAgenda?: WarRoomAgendaPhase;
  agendaTitle?: string;
  turns: WarRoomTurn[];
  decisionCard?: FounderDecisionCard;
  userPreference?: string;
  blendNote?: string;
  consensusOneLiner?: string;
  consensusBullets?: string[];
  agreedAt?: string;
};

export type ExecutionMilestone = {
  milestoneId: string;
  weekStart: number;
  weekEnd: number;
  title: string;
  actions: string[];
  ownerHint: string;
  doneWhen: string;
};

/** 可贴墙的执行交付包（M-MKT 进入作战卡等） */
export type ExecutionDeliveryPack = {
  oneLiner: string;
  cityScene?: string;
  menuPilot?: string;
  successMetrics?: string;
  killLine?: string;
  staffBrief?: string;
  doNotDo: string;
  wallCard: string;
  markdown: string;
  seatLabel?: string;
};

export type ExecutionRoadmap = {
  roadmapId: string;
  status: "draft" | "ready" | "accepted";
  horizonDays: number;
  positioningOneLiner: string;
  milestones: ExecutionMilestone[];
  generatedAt: string;
  acceptedAt?: string;
  entryPack?: ExecutionDeliveryPack;
  /** M-BIZ 模式作战卡 */
  modePack?: ExecutionDeliveryPack;
  /** M-ED 协议清单包 */
  governancePack?: ExecutionDeliveryPack;
};

/** 决策级交付包 — 反玩具感硬门槛 */
export type DecisionArtifact = {
  governingQuestion: string;
  recommendation: string;
  tradeoffAccepted: string;
  whyThis: string[];
  killCriteria: string[];
  mondayMoves: string[];
  evidenceUsed: string[];
  whatWeWontDo: string[];
  builtAt: string;
};

/** 席位冻结合同（当前 M-BIZ Mode Contract；结构与 m-biz/types.ModeContract 对齐） */
export type ModeDeliveryContract = {
  contractId: string;
  version: number;
  status: "draft" | "proposed" | "frozen";
  oneLiner: string;
  northStar: string;
  priorityAxis?: string;
  tradeoffAccepted: string;
  killCriteria: string[];
  mondayMoves: string[];
  evidenceUsed: string[];
  whatWeWontDo: string[];
  wallCard?: string;
  modePackMarkdown?: string;
  rejectedAlternatives: Array<{ summary: string; reason: string }>;
  seatId?: string;
  seatLabel?: string;
  frozenAt?: string;
};

/** M-MKT 市场进入决策合同（结构与 m-mkt/types.EntryContract 对齐） */
export type EntryDeliveryContract = {
  contractId: string;
  version: number;
  status: "draft" | "proposed" | "frozen";
  oneLiner: string;
  entryMode: string;
  cityScene?: string;
  menuPilot?: string;
  successMetrics?: string;
  tradeoffAccepted: string;
  killCriteria: string[];
  mondayMoves: string[];
  evidenceUsed: string[];
  whatWeWontDo: string[];
  wallCard?: string;
  entryPackMarkdown?: string;
  rejectedAlternatives: Array<{ summary: string; reason: string }>;
  seatId?: string;
  seatLabel?: string;
  frozenAt?: string;
};

/** M-ED 股权治理决策合同 */
export type GovernanceDeliveryContract = {
  contractId: string;
  version: number;
  status: "draft" | "proposed" | "frozen";
  oneLiner: string;
  lockFirst: string;
  controlFloor?: string;
  mustSign?: string;
  vestingNote?: string;
  tradeoffAccepted: string;
  killCriteria: string[];
  mondayMoves: string[];
  evidenceUsed: string[];
  whatWeWontDo: string[];
  wallCard?: string;
  governancePackMarkdown?: string;
  rejectedAlternatives: Array<{ summary: string; reason: string }>;
  seatId?: string;
  seatLabel?: string;
  frozenAt?: string;
};

export type AgentConsultingProject = {
  agentId: ConsultingAgentKind;
  projectId: string;
  consultingId: string;
  intakeAnswers: Record<string, string>;
  intakeStatus: "in_progress" | "complete";
  assets: {
    /** Round A：模块基础档案（对齐 M-PNT） */
    basics?: ModuleBasicsProfile;
    /** Round B：自适应追问 */
    adaptiveFollowups?: AdaptiveFollowupSession;
    research?: ResearchPack;
    advisors?: AdvisorStrategySet;
    warRoom?: WarRoomConsensus;
    decisionArtifact?: DecisionArtifact;
    strategyReportMarkdown?: string;
    strategyConfirmedAt?: string;
    executionRoadmap?: ExecutionRoadmap;
    /** M-BIZ：商业模式主航道合同 */
    modeContract?: ModeDeliveryContract;
    /** M-MKT：市场进入决策合同 */
    entryContract?: EntryDeliveryContract;
    /** M-ED：股权治理决策合同 */
    governanceContract?: GovernanceDeliveryContract;
    /** 签字交付状态（对齐 M-PNT reportOutline.signOffStatus） */
    signOffStatus?: "draft" | "in_review" | "signed";
    signedBy?: string;
    signedAt?: string;
    signOffNote?: string;
    /** 席位一手事实账本（可审计；签字硬门） */
    primaryFacts?: Array<{
      factId: string;
      claim: string;
      sourceRef: string;
      related: "research" | "war_room" | "decision";
      capturedAt: string;
    }>;
    /**
     * 领域证据账本（M-MKT/M-BIZ/M-ED 各自结构，JSON 存档）
     * 对标 M-PNT EvidenceLedger —— 确认调研后写入。
     */
    domainLedger?: Record<string, unknown>;
    /** 领域强度快照（确认调研/策略时刷新） */
    domainStrength?: {
      overall: number;
      grade: "A" | "B" | "C" | "D";
      readyForCouncil: boolean;
      gaps: string[];
      summary: string;
      agentId: ConsultingAgentKind;
    };
  };
  updatedAt: string;
};

export type AgentConsultingBlueprint = {
  agentId: ConsultingAgentKind;
  productName: string;
  committeeName: string;
  reportTitle: string;
  stepLabels: Record<SixStepId, StepLabel>;
  intakeQuestions: IntakeQuestion[];
  advisors: AdvisorPersona[];
  buildResearch: (answers: Record<string, string>, ctx: { city?: string; name?: string }) => ResearchPack;
  buildAdvisors: (answers: Record<string, string>, research: ResearchPack) => AdvisorStrategySet;
  buildWarRoom: (advisors: AdvisorStrategySet) => WarRoomConsensus;
  applyVote: (
    room: WarRoomConsensus,
    advisors: AdvisorStrategySet,
    preference: string,
    blendNote?: string,
  ) => WarRoomConsensus;
  buildReportMarkdown: (input: {
    projectName?: string;
    city?: string;
    answers: Record<string, string>;
    research?: ResearchPack;
    advisors?: AdvisorStrategySet;
    warRoom: WarRoomConsensus;
  }) => string;
  buildRoadmap: (oneLiner: string, answers: Record<string, string>) => ExecutionRoadmap;
};

export type JourneyNextAction =
  | "intake.continue"
  | "research.run"
  | "research.confirm"
  | "advisors.run"
  | "warroom.open"
  | "warroom.vote"
  | "strategy.confirmReport"
  | "execution.generate"
  | "execution.accept"
  | "done";

export type JourneyNextStep = {
  step: SixStepId;
  label: StepLabel;
  title: string;
  detail: string;
  actionId: JourneyNextAction;
  ctaLabel: string;
};

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function createAgentConsultingProject(
  agentId: ConsultingAgentKind,
  projectId: string,
): AgentConsultingProject {
  return {
    agentId,
    projectId,
    consultingId: createId("ac"),
    intakeAnswers: {},
    intakeStatus: "in_progress",
    assets: {},
    updatedAt: new Date().toISOString(),
  };
}

export function resolveSixStepNext(
  project: AgentConsultingProject,
  blueprint: AgentConsultingBlueprint,
): JourneyNextStep {
  const labels = blueprint.stepLabels;
  const a = project.assets;

  const basicsDone = project.assets.basics?.status === "complete";
  const followupsReady =
    project.assets.adaptiveFollowups?.status === "ready_to_compile" ||
    project.assets.adaptiveFollowups?.status === "compiled";

  if (
    project.intakeStatus !== "complete" ||
    !basicsDone ||
    !followupsReady
  ) {
    return {
      step: SixStepId.INTAKE,
      label: labels[SixStepId.INTAKE],
      title: !basicsDone
        ? "先收齐基础档案"
        : !followupsReady
          ? "回答定位式动态追问"
          : "继续信息采集",
      detail:
        "固定基础档案 + 动态追问必须齐；信息不清不能进调研（对齐品牌定位采集标准）。",
      actionId: "intake.continue",
      ctaLabel: "继续信息采集",
    };
  }

  if (!a.research || a.research.status === "draft") {
    return {
      step: SixStepId.RESEARCH,
      label: labels[SixStepId.RESEARCH],
      title: "联网/引擎调研补全",
      detail: "基于厚档案扫描市场/模式/结构——启发式 alone 不能确认。",
      actionId: "research.run",
      ctaLabel: "开始工具调研",
    };
  }
  if (a.research.status !== "confirmed") {
    const mode = a.research.collectionMode || "heuristic";
    const sources = a.research.sources?.length || 0;
    const toolWeak =
      mode === "heuristic" && sources < 2;
    if (toolWeak) {
      return {
        step: SixStepId.RESEARCH,
        label: labels[SixStepId.RESEARCH],
        title: "调研信号不足，请重跑采集",
        detail: `当前模式 ${mode}，来源 ${sources} 条。需 hybrid/engine 或 ≥2 条可追溯来源。`,
        actionId: "research.run",
        ctaLabel: "重新调研采集",
      };
    }
    return {
      step: SixStepId.RESEARCH,
      label: labels[SixStepId.RESEARCH],
      title: "确认调研，生成顾问案卷",
      detail: a.research.headline,
      actionId: "research.confirm",
      ctaLabel: "确认调研并出顾问案卷",
    };
  }

  if (!a.advisors) {
    return {
      step: SixStepId.ADVISORS,
      label: labels[SixStepId.ADVISORS],
      title: "多位顾问各出一策",
      detail: "他们会打架——这是正常的。",
      actionId: "advisors.run",
      ctaLabel: "看顾问方案",
    };
  }

  // 案卷已出、会议室未开：先停在顾问步，再开会
  if (!a.warRoom) {
    return {
      step: SixStepId.ADVISORS,
      label: labels[SixStepId.ADVISORS],
      title: "先读互斥案卷，再进会议室",
      detail: a.advisors.conflictSummary,
      actionId: "warroom.open",
      ctaLabel: "读完了，开会",
    };
  }
  if (a.warRoom.status === "open") {
    return {
      step: SixStepId.WAR_ROOM,
      label: labels[SixStepId.WAR_ROOM],
      title: "进入战略会议室",
      detail: "听完挑战后由你拍板。",
      actionId: "warroom.open",
      ctaLabel: "开会",
    };
  }
  if (a.warRoom.status !== "agreed") {
    return {
      step: SixStepId.WAR_ROOM,
      label: labels[SixStepId.WAR_ROOM],
      title: "请你表态拍板",
      detail: "没有你确认，方案不能锁定。",
      actionId: "warroom.vote",
      ctaLabel: "我来拍板",
    };
  }

  if (!a.strategyConfirmedAt) {
    return {
      step: SixStepId.STRATEGY_LOCK,
      label: labels[SixStepId.STRATEGY_LOCK],
      title: `确认${blueprint.reportTitle}`,
      detail: a.warRoom.consensusOneLiner || "把会议共识写成可签字报告。",
      actionId: "strategy.confirmReport",
      ctaLabel: "确认报告并生成执行路径",
    };
  }

  if (!a.executionRoadmap) {
    return {
      step: SixStepId.EXECUTION_PATH,
      label: labels[SixStepId.EXECUTION_PATH],
      title: "生成执行路径",
      detail: "时间节点 + 谁干什么 + 怎样算完成。",
      actionId: "execution.generate",
      ctaLabel: "生成执行路径",
    };
  }
  if (a.executionRoadmap.status !== "accepted") {
    return {
      step: SixStepId.EXECUTION_PATH,
      label: labels[SixStepId.EXECUTION_PATH],
      title: "确认落地执行方案",
      detail: `共 ${a.executionRoadmap.milestones.length} 个节点。`,
      actionId: "execution.accept",
      ctaLabel: "确认执行路径，完成咨询",
    };
  }

  return {
    step: SixStepId.EXECUTION_PATH,
    label: labels[SixStepId.EXECUTION_PATH],
    title: "本轮咨询完成",
    detail: "策略已确认，执行路径已就绪。",
    actionId: "done",
    ctaLabel: "完成",
  };
}

export function answerIntake(
  project: AgentConsultingProject,
  blueprint: AgentConsultingBlueprint,
  questionId: string,
  answer: string,
): AgentConsultingProject {
  const intakeAnswers = {
    ...project.intakeAnswers,
    [questionId]: answer.trim(),
  };
  const done = blueprint.intakeQuestions.every((q) =>
    Boolean(intakeAnswers[q.id]?.trim()),
  );
  return {
    ...project,
    intakeAnswers,
    intakeStatus: done ? "complete" : "in_progress",
    updatedAt: new Date().toISOString(),
  };
}

export function confirmResearchPack(pack: ResearchPack): ResearchPack {
  return { ...pack, status: "confirmed", confirmedAt: new Date().toISOString() };
}

export function acceptRoadmap(roadmap: ExecutionRoadmap): ExecutionRoadmap {
  return {
    ...roadmap,
    status: "accepted",
    acceptedAt: new Date().toISOString(),
  };
}

export function nowIso() {
  return new Date().toISOString();
}

export { createId };
