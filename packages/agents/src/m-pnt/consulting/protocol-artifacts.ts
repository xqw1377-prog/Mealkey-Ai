/**
 * M-PNT Brand Strategy Protocol V1 — P0 / P3 / P5 资产
 * 挂在六步路径下，不另开老板进度条。
 */
import type { BrandBasicsProfile, BrandBrief, ConsumerInsight } from "./types";
import type {
  AdvisorId,
  AdvisorStrategyCard,
  AdvisorStrategySet,
} from "./journey-types";
import { ADVISOR_META } from "./journey-types";

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/** P0 · Brand Challenge Brief */
export type BrandChallengeBrief = {
  briefId: string;
  projectLabel: string;
  /** 赚钱 / 连锁规模 / 资本 / 区域王者 / 个人IP / 其他 */
  strategicGoal: string;
  goalKind:
    | "profit"
    | "scale"
    | "capital"
    | "regional"
    | "personal_ip"
    | "other";
  /** 本轮唯一战略问题 */
  coreChallenge: string;
  compiledAt: string;
};

/** P3 · Human Truth（行为→矛盾→未满足→机会） */
export type HumanTruth = {
  truthId: string;
  behavior: string;
  contradiction: string;
  unmetNeed: string;
  strategicOpportunity: string;
  /** 禁止单独使用的弱口号（检测用） */
  bannedAlone?: string[];
  compiledAt: string;
};

/** P5 · 战略选项（三策映射） */
export type StrategyOption = {
  optionId: "A" | "B" | "C";
  advisorId: AdvisorId;
  seatName: string;
  title: string;
  claim: string;
  advantage: string;
  risk: string;
  sacrifice: string;
};

export type StrategyOptionSet = {
  setId: string;
  options: StrategyOption[];
  mutualExclusionNote: string;
  compiledAt: string;
};

const GOAL_PATTERNS: Array<{
  kind: BrandChallengeBrief["goalKind"];
  label: string;
  re: RegExp;
}> = [
  { kind: "scale", label: "规模连锁品牌", re: /连锁|多店|百店|开店|扩张|规模/ },
  { kind: "capital", label: "资本品牌", re: /融资|资本|估值|IPO|投资人/ },
  { kind: "regional", label: "区域王者", re: /区域|本地|王者|第一|霸主|城市/ },
  { kind: "personal_ip", label: "个人IP品牌", re: /IP|网红|个人|创始人品牌|KOL/ },
  { kind: "profit", label: "赚钱型品牌", re: /利润|赚钱|盈利|回本|现金流|毛利/ },
];

export function inferGoalKind(text: string): {
  kind: BrandChallengeBrief["goalKind"];
  label: string;
} {
  const t = text || "";
  for (const g of GOAL_PATTERNS) {
    if (g.re.test(t)) return { kind: g.kind, label: g.label };
  }
  return { kind: "other", label: "待明确战略目标" };
}

/** P1 · Business Reality Map（轻量 SWOT，须可指经营事实） */
export type BusinessRealityMap = {
  mapId: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  fightReadiness: "ready" | "conditional" | "not_ready";
  note: string;
  compiledAt: string;
};

export function buildBusinessRealityMap(input: {
  basics?: BrandBasicsProfile | null;
  brief?: BrandBrief | null;
}): BusinessRealityMap {
  const v = input.basics?.values;
  const strengths = [
    v?.advantages,
    input.brief?.founderBelief,
    v?.storeScale ? `已有规模：${v.storeScale}` : undefined,
  ].filter((x): x is string => Boolean(x?.trim() && x.trim().length >= 4));

  const weaknesses = [
    v?.mainPain,
    !v?.slogan || v.slogan === "暂无"
      ? "对外可复述口号缺失"
      : undefined,
    !(v?.competitors || "").trim() ? "竞品集合未采集" : undefined,
  ].filter((x): x is string => Boolean(x?.trim()));

  const opportunities = [
    input.brief?.customerNeed
      ? `未满足需求：${input.brief.customerNeed}`
      : undefined,
    v?.businessGoal ? `目标窗口：${v.businessGoal}` : undefined,
  ].filter((x): x is string => Boolean(x?.trim()));

  const threats = [
    v?.competitors ? `竞品压力：${v.competitors}` : "品类惯性与低价替代",
    "无差异叙事时落入红海",
  ];

  const fightReadiness =
    strengths.length >= 1 && opportunities.length >= 1
      ? weaknesses.length >= 2
        ? "conditional"
        : "ready"
      : "not_ready";

  return {
    mapId: createId("reality"),
    strengths: strengths.length ? strengths : ["（待补：可核实优势）"],
    weaknesses: weaknesses.length ? weaknesses : ["（待补：真实短板）"],
    opportunities: opportunities.length
      ? opportunities
      : ["（待补：战略机会）"],
    threats,
    fightReadiness,
    note:
      fightReadiness === "ready"
        ? "具备打这场心智战的基本资格。"
        : fightReadiness === "conditional"
          ? "可打，但须先补短板与证据。"
          : "资格不足，先补经营事实再定位。",
    compiledAt: new Date().toISOString(),
  };
}

export function buildBrandChallengeBrief(input: {
  basics?: BrandBasicsProfile | null;
  brief?: BrandBrief | null;
  projectName?: string;
  city?: string;
}): BrandChallengeBrief {
  const v = input.basics?.values;
  const goalText = [
    v?.businessGoal,
    v?.mainPain,
    input.brief?.brandAmbition,
    input.brief?.businessContext,
  ]
    .filter(Boolean)
    .join("；");
  const { kind, label } = inferGoalKind(goalText);
  const category =
    v?.category || input.brief?.categoryDefinition || "目标品类";
  const city =
    input.city ||
    v?.region ||
    "目标城市";
  const brand = v?.brandName || input.projectName || "本品牌";
  const pain = v?.mainPain || "如何避开红海同质化？";

  return {
    briefId: createId("challenge"),
    projectLabel: `${city}${category} · ${brand}`.replace(/\s+/g, ""),
    strategicGoal: label === "待明确战略目标" && goalText
      ? goalText.slice(0, 80)
      : label,
    goalKind: kind,
    coreChallenge: `在「${category}」里，${pain}`.slice(0, 160),
    compiledAt: new Date().toISOString(),
  };
}

const WEAK_SLOGANS = [
  /年轻人喜欢/,
  /喜欢年轻化/,
  /追求品质/,
  /注重品质/,
  /好吃就行/,
];

function pickTruthSegment(
  candidates: Array<string | undefined | null>,
  minLen: number,
  fallback: string,
): string {
  for (const raw of candidates) {
    const text = (raw || "").trim();
    if (text.length >= minLen) return text;
  }
  return fallback;
}

export function buildHumanTruthFromInsight(
  insight: ConsumerInsight,
): HumanTruth {
  const persona = insight.primaryPersona || insight.targetCustomer || "目标用户";
  const occasion = insight.occasions?.[0] || "核心消费场合";
  const behavior = pickTruthSegment(
    [
      `「${persona}」在「${occasion}」场景下反复做选择，默认依赖熟店/习惯路径。`,
    ],
    12,
    "目标用户在核心场合反复做选择，默认依赖熟店与习惯路径。",
  );
  const contradiction = pickTruthSegment(
    [
      insight.barriers?.[0],
      "喜欢品类体验，却拒绝老式不确定或油腻踩雷的到店感受",
    ],
    8,
    "喜欢品类体验，却拒绝老式不确定或油腻踩雷的到店感受",
  );
  // 短词如「确定感」不能抢占兜底句，否则会误拦工具调研
  const unmetNeed = pickTruthSegment(
    [
      insight.unmetNeeds?.[0],
      insight.insightStatement,
      "既要确定感，又要场景匹配的可复述理由",
    ],
    8,
    "既要确定感，又要场景匹配的可复述理由",
  );
  const strategicOpportunity = pickTruthSegment(
    [
      insight.emotionalJob && insight.functionalJob
        ? `把「${insight.functionalJob}」做成可预期体验，并兑现「${insight.emotionalJob}」。`
        : undefined,
      `围绕未满足需求「${unmetNeed.slice(0, 40)}」占住可传播的心智空位。`,
    ],
    8,
    "围绕未满足需求占住可传播的心智空位。",
  );

  return {
    truthId: createId("truth"),
    behavior,
    contradiction,
    unmetNeed,
    strategicOpportunity,
    bannedAlone: ["年轻人喜欢", "高品质", "年轻化"],
    compiledAt: new Date().toISOString(),
  };
}

export function assertHumanTruthReady(truth: HumanTruth | undefined): void {
  if (!truth) throw new Error("缺少 Human Truth，不能当作洞察完成");
  const missing: string[] = [];
  if ((truth.behavior || "").trim().length < 12) missing.push("行为");
  if ((truth.contradiction || "").trim().length < 8) missing.push("隐藏矛盾");
  if ((truth.unmetNeed || "").trim().length < 8) missing.push("未满足需求");
  if ((truth.strategicOpportunity || "").trim().length < 8) {
    missing.push("战略机会");
  }
  const blob = `${truth.behavior}${truth.contradiction}${truth.unmetNeed}${truth.strategicOpportunity}`;
  const onlyWeak =
    WEAK_SLOGANS.some((re) => re.test(blob)) &&
    !(
      /但|却|拒绝|矛盾|不敢|怕|一边|另一边/.test(truth.contradiction) ||
      truth.contradiction.length >= 16
    );
  if (onlyWeak) {
    missing.push("禁止单独使用「年轻人喜欢/高品质」类口号");
  }
  if (missing.length) {
    throw new Error(`Human Truth 未齐，待补：${missing.join("；")}`);
  }
}

/**
 * 挂载 Human Truth 草稿。不在此处 assert——
 * 硬校验留给签字/完结门禁；否则短 unmetNeed 会在「开始工具调研」前误杀联网采集。
 */
export function enrichConsumerInsightWithHumanTruth(
  insight: ConsumerInsight,
): ConsumerInsight {
  const humanTruth = buildHumanTruthFromInsight(insight);
  return {
    ...insight,
    humanTruth,
    insightStatement:
      insight.insightStatement ||
      `${humanTruth.contradiction} → 机会：${humanTruth.strategicOpportunity}`,
  };
}

const OPTION_IDS = ["A", "B", "C"] as const;

export function buildStrategyOptionsFromAdvisors(
  set: AdvisorStrategySet,
): StrategyOptionSet {
  const options: StrategyOption[] = set.strategies
    .slice(0, 3)
    .map((s, i) => cardToOption(s, OPTION_IDS[i] || "A"));

  return {
    setId: createId("optset"),
    options,
    mutualExclusionNote:
      set.conflictSummary ||
      "三策互斥：不能同时为真——选一条当主航道，其余降为约束或后置。",
    compiledAt: new Date().toISOString(),
  };
}

function cardToOption(
  s: AdvisorStrategyCard,
  optionId: "A" | "B" | "C",
): StrategyOption {
  const meta = ADVISOR_META[s.advisorId];
  return {
    optionId,
    advisorId: s.advisorId,
    seatName: meta.name,
    title: `Option ${optionId} · ${meta.name}`,
    claim: s.oneLiner,
    advantage:
      s.pointOfDifference ||
      s.differentiation ||
      s.battlefield ||
      "差异点待强化",
    risk: s.risk || "教育/竞争风险待评估",
    sacrifice: s.sacrifice || s.doNotDo || "必须写清牺牲",
  };
}

export function attachStrategyOptions(
  set: AdvisorStrategySet,
): AdvisorStrategySet {
  return {
    ...set,
    strategyOptions: buildStrategyOptionsFromAdvisors(set),
  };
}
