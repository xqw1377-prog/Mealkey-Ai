/**
 * 七席思维协议（去真名 V2）
 *
 * 席位代号（对外）：
 * - 心智官 MK-MIND      （内部 id: ries）       心智占位学派
 * - 空位官 MK-RIVAL     （内部 id: trout）      竞争空位学派
 * - 冲突官 MK-CLASH     （内部 id: ye）         冲突营销学派
 * - 符号官 MK-SYMBOL    （内部 id: huayehu）    超级符号学派（华与华）
 * - 细分官 MK-STP       （内部 id: kotler）     科特勒 STP 学派
 * - 增长官 MK-GROWTH    （内部 id: growth）     增长飞轮学派
 * - 文化官 MK-CULTURE   （内部 id: culture）    文化战略学派（Douglas Holt）
 *
 * 协议：FactPack → ReasoningTrace → SeatVerdict（案卷）
 * 禁止：用名人真名；禁止只对固定 A/B/C 模板打分而不造策。
 */

export type SeatCode =
  | "MK-MIND"
  | "MK-RIVAL"
  | "MK-CLASH"
  | "MK-SYMBOL"
  | "MK-STP"
  | "MK-GROWTH"
  | "MK-CULTURE";

export type SeatAdvisorId =
  | "ries"
  | "trout"
  | "ye"
  | "huayehu"
  | "kotler"
  | "growth"
  | "culture";

export const SEAT_PUBLIC: Record<
  SeatAdvisorId,
  {
    code: SeatCode;
    name: string;
    model: string;
    question: string;
    initial: string;
    theoryLabel: string;
  }
> = {
  ries: {
    code: "MK-MIND",
    name: "心智官",
    model: "心智第一 · 聚焦",
    question: "客人脑中第一个想起谁？",
    initial: "心",
    theoryLabel: "心智占位学派",
  },
  trout: {
    code: "MK-RIVAL",
    name: "空位官",
    model: "竞争空位 · 区隔",
    question: "相对对手凭什么被选？",
    initial: "空",
    theoryLabel: "竞争空位学派",
  },
  ye: {
    code: "MK-CLASH",
    name: "冲突官",
    model: "冲突记忆 · 成交",
    question: "什么冲突让人记住并进店？",
    initial: "冲",
    theoryLabel: "冲突营销学派",
  },
  huayehu: {
    code: "MK-SYMBOL",
    name: "符号官",
    model: "超级符号 · 文化母体",
    question: "用什么符号让品牌寄生在文化母体中？",
    initial: "符",
    theoryLabel: "超级符号学派",
  },
  kotler: {
    code: "MK-STP",
    name: "细分官",
    model: "细分 · 目标 · 定位",
    question: "市场怎么切？选哪块？怎么定？",
    initial: "细",
    theoryLabel: "科特勒 STP 学派",
  },
  growth: {
    code: "MK-GROWTH",
    name: "增长官",
    model: "飞轮 · 增长 · 复利",
    question: "怎么让增长飞轮转起来？",
    initial: "增",
    theoryLabel: "增长飞轮学派",
  },
  culture: {
    code: "MK-CULTURE",
    name: "文化官",
    model: "文化战略 · 意识形态",
    question: "什么社会矛盾让品牌成为文化符号？",
    initial: "文",
    theoryLabel: "文化战略学派",
  },
};

/** 咨询事实包 — 七席共享，禁止各席改写事实 */
export type ThinkingFactPack = {
  brandLabel: string;
  category: string;
  city: string;
  who: string;
  need: string;
  edge: string;
  rivals: string[];
  whitespace: string;
  researchHeadline: string;
  categoryTrend: string;
  consumerShift: string;
  competitiveLandscape: string;
  risks: string[];
  strengths: string[];
  weaknesses: string[];
  constraints: string[];
  /** 竞对心智摘要（来自调研 competitorBriefs） */
  competitorBriefs?: Array<{
    name: string;
    mentalPosition?: string;
    evidenceSentence?: string;
    threatToWhitespace?: string;
    summary: string;
  }>;
  /** 可追溯证据短句（来源 snippet / 证据笔记） */
  evidenceSnippets?: string[];
  /** V2 扩展字段 — 文化母体 / 符号 / 细分数据 */
  culturalCode?: string;
  symbolSet?: string[];
  demographicTiers?: Array<{ name: string; size: string; growth: string }>;
  growthLevers?: string[];
  socialContradiction?: string;
  brandBudget?: number;
  brandStage?: string;
  existingSymbols?: string[];
  priceElasticity?: string;
};

export type LawCheck = {
  law: string;
  pass: boolean;
  delta: number;
  note: string;
};

export type InventedDirection = {
  id: string;
  name: string;
  oneLiner: string;
  type: string;
  focus: string;
  /** 引擎自造理由 */
  inventReason: string;
};

export type ReasoningStep = {
  step: string;
  judgment: string;
  evidence?: string;
};

export type SeatStrategySheet = {
  oneLiner: string;
  positioningStatement: string;
  frameOfReference: string;
  forWhom: string;
  jobToBeDone: string;
  battlefield: string;
  pointOfDifference: string;
  proof: string;
  sacrifice: string;
  doNotDo: string;
  risk: string;
  rationale: string;
  proofPlan: { menu: string; script: string; scene: string };
};

export type SeatVerdict = {
  advisorId: SeatAdvisorId;
  code: SeatCode;
  publicName: string;
  preferred: InventedDirection;
  alternatives: InventedDirection[];
  rejected: Array<{ name: string; reason: string }>;
  totalScore: number;
  recommend: "strong_recommend" | "recommend" | "neutral" | "not_recommend";
  lawChecks: LawCheck[];
  reasoningTrace: ReasoningStep[];
  coreLogic: string;
  whyThis: string;
  keyMentalPosition: string;
  risks: Array<{ risk: string; severity: "R1" | "R2" | "R3" | "R4" }>;
  strategy: SeatStrategySheet;
  confidence: number;
  /** 对其他六席的开火弹药（交火用）V2 */
  attackAmmo: Array<{
    targetSeat: SeatAdvisorId;
    attack: string;
    defenseHint: string;
    severity: "R1" | "R2" | "R3" | "R4";
  }>;
  /** V2：证据链引用 */
  evidenceFootnotes?: string[];
  /** V2：30天可验证假设 */
  verifiableHypothesis?: string;
};

export type ThinkingEngineResult = {
  factPack: ThinkingFactPack;
  seats: {
    ries: SeatVerdict;
    trout: SeatVerdict;
    ye: SeatVerdict;
  };
  mode: "heuristic" | "llm_hybrid";
};

export function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function toRecommend(
  score: number,
): SeatVerdict["recommend"] {
  if (score >= 82) return "strong_recommend";
  if (score >= 68) return "recommend";
  if (score >= 55) return "neutral";
  return "not_recommend";
}

export function stmt(parts: {
  who: string;
  job: string;
  brand: string;
  frame: string;
  pod: string;
  because: string;
  unlike: string;
}): string {
  return `对于${parts.who}，当他们需要「${parts.job}」时，${parts.brand}是「${parts.frame}」里那个「${parts.pod}」的选择，因为${parts.because}；不像${parts.unlike}。`;
}

export function clipWord(s: string, max = 10): string {
  const t = (s || "").replace(/。$/, "").trim();
  if (t.length <= max) return t || "核心场景";
  return t.slice(0, max);
}
