/**
 * M-PNT 六步价值路径 — 老板可见主叙事
 * 文档：docs/M_PNT_SIX_STEP_VALUE_PATH_FREEZE.md
 */

export enum MpntJourneyStep {
  INTAKE = "INTAKE",
  MARKET_RESEARCH = "MARKET_RESEARCH",
  THREE_ADVISORS = "THREE_ADVISORS",
  WAR_ROOM = "WAR_ROOM",
  STRATEGY_LOCK = "STRATEGY_LOCK",
  EXECUTION_PATH = "EXECUTION_PATH",
}

export const MPNT_JOURNEY_ORDER: MpntJourneyStep[] = [
  MpntJourneyStep.INTAKE,
  MpntJourneyStep.MARKET_RESEARCH,
  MpntJourneyStep.THREE_ADVISORS,
  MpntJourneyStep.WAR_ROOM,
  MpntJourneyStep.STRATEGY_LOCK,
  MpntJourneyStep.EXECUTION_PATH,
];

export const MPNT_JOURNEY_LABEL: Record<
  MpntJourneyStep,
  { no: string; title: string; feel: string }
> = {
  [MpntJourneyStep.INTAKE]: {
    no: "01",
    title: "说清楚",
    feel: "你的店是谁",
  },
  [MpntJourneyStep.MARKET_RESEARCH]: {
    no: "02",
    title: "调研",
    feel: "先看市场事实",
  },
  [MpntJourneyStep.THREE_ADVISORS]: {
    no: "03",
    title: "七顾问",
    feel: "七席专家各自出定位方案",
  },
  [MpntJourneyStep.WAR_ROOM]: {
    no: "04",
    title: "开会",
    feel: "质询后拍板",
  },
  [MpntJourneyStep.STRATEGY_LOCK]: {
    no: "05",
    title: "确认",
    feel: "定位定了",
  },
  [MpntJourneyStep.EXECUTION_PATH]: {
    no: "06",
    title: "怎么干",
    feel: "落地路径",
  },
};

export type AdvisorId = "ries" | "trout" | "ye" | "huayehu" | "kotler" | "growth" | "culture";

/** 对外去真名：心智官 / 空位官 / 冲突官 / 符号官 / 细分官 / 增长官 / 文化官 */
export const ADVISOR_META: Record<
  AdvisorId,
  { name: string; model: string; question: string; code: string }
> = {
  ries: {
    name: "心智官",
    code: "MK-MIND",
    model: "心智第一 · 聚焦",
    question: "客人脑中第一个想起谁？",
  },
  trout: {
    name: "空位官",
    code: "MK-RIVAL",
    model: "竞争空位 · 区隔",
    question: "相对对手凭什么被选？",
  },
  ye: {
    name: "冲突官",
    code: "MK-CLASH",
    model: "冲突记忆 · 成交",
    question: "什么冲突让人记住并进店？",
  },
  huayehu: {
    name: "符号官",
    code: "MK-SYMBOL",
    model: "超级符号 · 文化母体",
    question: "用什么符号让品牌寄生在文化母体中？",
  },
  kotler: {
    name: "细分官",
    code: "MK-STP",
    model: "细分 · 目标 · 定位",
    question: "市场怎么切？选哪块？怎么定？",
  },
  growth: {
    name: "增长官",
    code: "MK-GROWTH",
    model: "飞轮 · 增长 · 复利",
    question: "怎么让增长飞轮转起来？",
  },
  culture: {
    name: "文化官",
    code: "MK-CULTURE",
    model: "文化战略 · 意识形态",
    question: "什么社会矛盾让品牌成为文化符号？",
  },
};

/** 市场调研包 — 步 2 用户可感产出（含机构级长报告） */
export type MarketResearchPack = {
  packId: string;
  status: "draft" | "ready" | "confirmed";
  headline: string;
  categoryTrend: string;
  consumerShift: string;
  competitiveLandscape: string;
  whitespace: string;
  risks: string[];
  evidenceNotes: string[];
  generatedAt: string;
  confirmedAt?: string;
  /** 调研范围：区域/业态/品类/竞对/品牌现状 */
  scope?: {
    city: string;
    district?: string;
    category: string;
    businessFormat: string;
    brandName: string;
    brandStage: string;
    brandStatusNote: string;
    rivals: string[];
  };
  /** 采集模式 */
  collectionMode?: "live_crawl" | "local_intel" | "hybrid";
  /** V2：文化母体 / 符号集 / 人口细分 / 增长杠杆 / 社会矛盾 / 预算 / 现有符号 / 价格弹性 */
  culturalCode?: string;
  symbolSet?: string[];
  demographicTiers?: Array<{ name: string; size: string; growth: string }>;
  growthLevers?: string[];
  socialContradiction?: string;
  brandBudget?: number;
  brandStage?: string;
  existingSymbols?: string[];
  priceElasticity?: string;
  /** 三柱覆盖：区域 / 竞对 / 用户门店 */
  pillarCoverage?: {
    evaluatedAt: string;
    allOk: boolean;
    missing: string[];
    summary: string;
    pillars: Array<{
      id: "region" | "competitor" | "store_user";
      label: string;
      ok: boolean;
      hitCount: number;
      requiredHits: number;
      detail: string;
    }>;
  };
  /** 定位公司框架完整报告（Markdown） */
  reportMarkdown?: string;
  /** 竞对摘要（心智词 + 证据句 + 空位威胁） */
  competitorBriefs?: Array<{
    name: string;
    mentalPosition?: string;
    evidenceSentence?: string;
    threatToWhitespace?: string;
    summary: string;
    dataQuality: string;
  }>;
  /** 可追溯来源 */
  sources?: Array<{
    title: string;
    url: string;
    snippet: string;
    source: string;
    query?: string;
  }>;
  /** 一手店访证据计划（公开检索不够时的待办） */
  storeVisitPlan?: {
    title: string;
    honestyNote: string;
    tasks: Array<{
      rivalName: string;
      mentalHypothesis: string;
      checklist: string[];
      whyMatters: string;
      status: "pending" | "filled";
      filledNote?: string;
      observedMentalWord?: string;
      observedEvidence?: string;
      observedThreat?: string;
      filledAt?: string;
      attachments?: Array<{
        assetId: string;
        kind: "image" | "audio";
        publicUrl: string;
        fileName: string;
        title?: string;
        transcript?: string;
      }>;
    }>;
    markdown: string;
  };
  /** 店访后：假说 vs 现场 + 空位修正建议 */
  storeVisitInsight?: {
    generatedAt: string;
    compares: Array<{
      rivalName: string;
      hypothesisMental: string;
      observedMental: string;
      observedEvidence: string;
      verdict: "confirmed" | "partial" | "overturned" | "unknown";
      deltaNote: string;
    }>;
    whitespaceSuggestion: {
      severity: "keep" | "sharpen" | "pivot" | "abandon_overlap";
      currentWhitespace: string;
      suggestedWhitespace: string;
      rationale: string;
      actions: string[];
    };
    markdown: string;
  };
};

/** 单顾问定位策略卡 — 步 3（必须像策略，不像散文） */
export type AdvisorStrategyCard = {
  advisorId: AdvisorId;
  /** 锋利一句话（可上墙） */
  oneLiner: string;
  /** 完整定位陈述（For/Who/Is/That/Because/Unlike 合成句） */
  positioningStatement: string;
  /** 品类参照框架 */
  frameOfReference: string;
  forWhom: string;
  /** 客人要解决的事（一句，禁空话） */
  jobToBeDone: string;
  battlefield: string;
  /** 相对谁的差异 */
  pointOfDifference: string;
  /** 兼容旧字段 = pointOfDifference */
  differentiation: string;
  /** 可信理由（Reason to Believe） */
  proof: string;
  /** 必须牺牲什么（定位的代价） */
  sacrifice: string;
  doNotDo: string;
  risk: string;
  /** 方法论一句，禁止长篇正确的废话 */
  rationale: string;
  /** 落地证明计划（旧卷宗可能缺失，读取时需兜底） */
  proofPlan?: {
    menu: string;
    script: string;
    scene: string;
  };
  /** 专家案卷：商规/维度记分卡 + 否决 */
  theoryDossier?: TheoryDossier;
  /**
   * 该席独立大师方案（互不合并）
   * 心智官=命名/品类/一词；空位官=战法/对照；冲突官=钉锤/战役
   */
  masterScheme?: import("./master-scheme-engine").AdvisorMasterScheme;
};

/** 专家理论案卷（心智商规 / 竞争维 / 冲突维） */
export type TheoryDossier = {
  agentName: string;
  totalScore: number;
  recommend: string;
  preferredDirection: string;
  why: string;
  coreLogic: string;
  keyMentalPosition: string;
  dimensionBreakdown: Array<{
    name: string;
    score?: number;
    note: string;
    pass?: boolean;
  }>;
  directionScores: Array<{
    name: string;
    theory_score: number;
    theory_recommend: string;
  }>;
  risks: Array<{ risk: string; severity: string }>;
  rejected: Array<{ name: string; reason: string }>;
};

/** Cross-Fire 交火纪要（会议室开火弹药） */
export type CrossFireBrief = {
  conflicts: string[];
  hardConsensus: string[];
  softConsensus: string[];
  challenges: Array<{
    from: string;
    to: string;
    targetDirection: string;
    attack: string;
    defenseHint: string;
    severity: string;
  }>;
  eliminate: string[];
  irreducible: string[];
  gameSummary: string;
};

export type AdvisorStrategySet = {
  setId: string;
  status: "draft" | "ready" | "debated";
  strategies: AdvisorStrategyCard[];
  conflictSummary: string;
  generatedAt: string;
  /** Protocol P5：Option A/B/C 战略选择卡 */
  strategyOptions?: {
    setId: string;
    options: Array<{
      optionId: "A" | "B" | "C";
      advisorId: AdvisorId;
      seatName: string;
      title: string;
      claim: string;
      advantage: string;
      risk: string;
      sacrifice: string;
    }>;
    mutualExclusionNote: string;
    compiledAt: string;
  };
  /** llm_hybrid | heuristic；仅灾难时 template_fallback */
  theoryMode?: "llm_hybrid" | "heuristic" | "template_fallback";
  crossFire?: CrossFireBrief;
  synthesisNote?: string;
  /** 供辩论改策后重算各席 masterScheme */
  schemeContext?: {
    brandName: string;
    category: string;
    city: string;
    who: string;
    need: string;
    edge: string;
    rivals: string[];
    whitespace: string;
    categoryTrend: string;
    consumerShift: string;
    competitiveLandscape: string;
    headline: string;
  };
  /** 大师方案是否经 LLM invent */
  masterSchemeMode?: "llm_hybrid" | "heuristic";
};

export type WarRoomAgendaPhase =
  | "call_to_order"
  | "pitch"
  | "crossfire"
  | "rebuttal"
  | "revise"
  | "chair_synthesis"
  | "founder_vote"
  | "resolution";

/** 四方会议共识 — 步 4 */
export type WarRoomTurn = {
  speaker: AdvisorId | "user" | "host";
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

export type WarRoomConsensus = {
  roomId: string;
  status: "open" | "debating" | "awaiting_user" | "agreed";
  currentAgenda?: WarRoomAgendaPhase;
  agendaTitle?: string;
  turns: WarRoomTurn[];
  /** 是否已完成至少一轮质询→反驳→改策 */
  debateRoundCompleted?: boolean;
  /** 老板拍板前的一页纸决策卡 */
  decisionCard?: FounderDecisionCard;
  userPreference?: AdvisorId | "blend";
  blendNote?: string;
  consensusOneLiner?: string;
  consensusStatement?: {
    forAudience: string;
    whoNeed: string;
    ourBrandIs: string;
    thatValue: string;
    because: string;
    unlike: string;
  };
  /** 对外唯一心智词（词权） */
  ownedWord?: string;
  /** 落选席强制并入终稿的约束 */
  minorityConstraints?: string[];
  agreedAt?: string;
};

/** 一页纸决策卡 — 会上给老板对照拍板 */
export type FounderDecisionOption = {
  advisorId: AdvisorId;
  seatName: string;
  seatCode: string;
  oneLiner: string;
  sacrifice: string;
  thisWeekProof: string;
  /** 选它意味着什么 */
  ifChoose: string;
  /** 不选的代价/风险 */
  ifNot: string;
};

export type FounderDecisionCard = {
  title: string;
  subtitle: string;
  question: string;
  options: FounderDecisionOption[];
  blendHint: string;
  rule: string;
  /** 可打印/可贴报告的 Markdown */
  markdown: string;
};

/** 执行路径 — 步 6 */
export type ExecutionMilestone = {
  milestoneId: string;
  weekStart: number;
  weekEnd: number;
  title: string;
  actions: string[];
  ownerHint: string;
  doneWhen: string;
};

/** 店员交付包 — 可贴吧台/可对店员培训 */
export type StaffDeliveryPack = {
  oneLiner: string;
  greetScript: string;
  doNotSay: string;
  wallCard: string;
  menuProof: string;
  sceneProof: string;
  seatLabel?: string;
  markdown: string;
};

export type ExecutionRoadmap = {
  roadmapId: string;
  status: "draft" | "ready" | "accepted";
  horizonDays: number;
  positioningOneLiner: string;
  milestones: ExecutionMilestone[];
  /** 店员可念：一句话 + 迎客脚本 + 不做清单 */
  staffDelivery?: StaffDeliveryPack;
  generatedAt: string;
  acceptedAt?: string;
};

export type MpntJourneyAssets = {
  marketResearch?: MarketResearchPack;
  advisorStrategies?: AdvisorStrategySet;
  warRoom?: WarRoomConsensus;
  /** Protocol P0：项目启动挑战简报 */
  challengeBrief?: {
    briefId: string;
    projectLabel: string;
    strategicGoal: string;
    goalKind:
      | "profit"
      | "scale"
      | "capital"
      | "regional"
      | "personal_ip"
      | "other";
    coreChallenge: string;
    compiledAt: string;
  };
  /** Protocol P3：Human Truth（调研合成可见） */
  humanTruth?: {
    truthId: string;
    behavior: string;
    contradiction: string;
    unmetNeed: string;
    strategicOpportunity: string;
    bannedAlone?: string[];
    compiledAt: string;
  };
  /** Protocol P1：企业现实图 */
  realityMap?: {
    mapId: string;
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
    fightReadiness: "ready" | "conditional" | "not_ready";
    note: string;
    compiledAt: string;
  };
  /** 步 5：用户已确认策略报告（可先于旧门禁冻结） */
  strategyConfirmedAt?: string;
  /** 步 5：可阅读的定位策略报告 Markdown */
  strategyReportMarkdown?: string;
  executionRoadmap?: ExecutionRoadmap;
};

/** 旧内部阶段 → 六步主叙事 */
export function mapStageToJourneyStep(stage: string): MpntJourneyStep {
  switch (stage) {
    case "DISCOVERY":
    case "BRAND_BRIEF":
      return MpntJourneyStep.INTAKE;
    case "CATEGORY_ANALYSIS":
    case "CONSUMER_INSIGHT":
    case "COMPETITIVE_MAPPING":
      return MpntJourneyStep.MARKET_RESEARCH;
    case "POSITIONING_DESIGN":
      return MpntJourneyStep.THREE_ADVISORS;
    case "POSITION_VALIDATION":
      return MpntJourneyStep.WAR_ROOM;
    case "FINAL_STRATEGY":
      return MpntJourneyStep.STRATEGY_LOCK;
    default:
      return MpntJourneyStep.INTAKE;
  }
}
