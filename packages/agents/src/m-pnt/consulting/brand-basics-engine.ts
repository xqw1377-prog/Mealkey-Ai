/**
 * Brand Basics + Adaptive Follow-up
 *
 * Round A：固定必须字段（品牌基础档案）——没有这些，后续产出无差异、无价值。
 * Round B：基于档案缺口 + 定位任务，规则生成追问（must/should），不得用默认文案填空。
 */
import type {
  AdaptiveFollowupQuestion,
  AdaptiveFollowupSession,
  BrandBasicsFieldKey,
  BrandBasicsProfile,
  BrandBasicsValues,
  BrandBrief,
} from "./types";

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function nowIso() {
  return new Date().toISOString();
}

function trim(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** 过短或明显占位，不算有效答案 */
function isMeaningful(v: unknown, min = 2): boolean {
  const s = trim(v);
  if (s.length < min) return false;
  const placeholders = ["暂无", "不知道", "无", "没有", "待定", "TBD", "-", "—", "n/a"];
  return !placeholders.includes(s.toLowerCase());
}

export type BrandBasicsFieldDef = {
  key: BrandBasicsFieldKey;
  label: string;
  prompt: string;
  placeholder: string;
  /** must = 不齐不得进入追问/编译 */
  requirement: "must" | "should";
  minLength: number;
};

/** Round A：定位咨询必须先收齐的基础档案 */
export const BRAND_BASICS_FIELDS: BrandBasicsFieldDef[] = [
  {
    key: "brandName",
    label: "品牌名",
    prompt: "对外使用的品牌名称是什么？",
    placeholder: "例如：味本源·烤鱼",
    requirement: "must",
    minLength: 2,
  },
  {
    key: "storeScale",
    label: "门店规模",
    prompt: "现在有几家店？直营还是加盟？",
    placeholder: "例如：直营 2 家，筹备第 3 家",
    requirement: "must",
    minLength: 1,
  },
  {
    key: "annualRevenue",
    label: "年营收",
    prompt: "大致年营收或单店月均流水（量级即可）？",
    placeholder: "例如：单店月均 35–45 万",
    requirement: "must",
    minLength: 1,
  },
  {
    key: "category",
    label: "品类",
    prompt: "客人会把你们归到哪一类？",
    placeholder: "例如：烤鱼 / 精酿餐吧 / 社区快餐",
    requirement: "must",
    minLength: 2,
  },
  {
    key: "currentPositioning",
    label: "当前定位",
    prompt: "你现在怎么向客人一句话介绍自己？",
    placeholder: "例如：适合聚会的鲜椒烤鱼",
    requirement: "must",
    minLength: 4,
  },
  {
    key: "region",
    label: "区域",
    prompt: "主战场在哪个城市/商圈？",
    placeholder: "例如：成都 · 高新区写字楼商圈",
    requirement: "must",
    minLength: 2,
  },
  {
    key: "avgTicket",
    label: "客单价",
    prompt: "人均消费大概多少？",
    placeholder: "例如：人均 85–100 元",
    requirement: "must",
    minLength: 1,
  },
  {
    key: "slogan",
    label: "广告语",
    prompt: "有没有正在用的广告语/主视觉口号？（没有就写「暂无」）",
    placeholder: "例如：鲜椒一锅，越吃越上瘾",
    requirement: "should",
    minLength: 1,
  },
  {
    key: "competitors",
    label: "竞争对手",
    prompt: "抢客人最凶的 2–3 个对手是谁？（店名）",
    placeholder: "例如：江边城外、探鱼、隔壁老字号烤鱼",
    requirement: "must",
    minLength: 2,
  },
  {
    key: "advantages",
    label: "优势",
    prompt: "相对对手，你们最难被抄走的一点是什么？",
    placeholder: "例如：鲜椒配方 + 翻台节奏稳定",
    requirement: "must",
    minLength: 4,
  },
  {
    key: "businessGoal",
    label: "本轮目标",
    prompt: "这轮定位咨询，最想先做成哪一件？",
    placeholder: "例如：先把心智说清楚，再扩店",
    requirement: "must",
    minLength: 4,
  },
  {
    key: "mainPain",
    label: "当前痛点",
    prompt: "店里现在最头疼、且和品牌有关的一件事？",
    placeholder: "例如：客人说好吃但记不住我们",
    requirement: "must",
    minLength: 4,
  },
];

export function createEmptyBrandBasics(): BrandBasicsProfile {
  return {
    artifactId: createId("basics"),
    status: "draft",
    values: {},
    missingMust: BRAND_BASICS_FIELDS.filter((f) => f.requirement === "must").map(
      (f) => f.key,
    ),
    missingShould: BRAND_BASICS_FIELDS.filter((f) => f.requirement === "should").map(
      (f) => f.key,
    ),
    updatedAt: nowIso(),
  };
}

export function analyzeBrandBasicsGaps(values: BrandBasicsValues): {
  missingMust: BrandBasicsFieldKey[];
  missingShould: BrandBasicsFieldKey[];
} {
  const missingMust: BrandBasicsFieldKey[] = [];
  const missingShould: BrandBasicsFieldKey[] = [];
  for (const field of BRAND_BASICS_FIELDS) {
    // slogan「暂无」算已填 should
    const filled =
      field.key === "slogan"
        ? trim(values.slogan) === "暂无" || isMeaningful(values.slogan, 1)
        : isMeaningful(values[field.key], field.minLength);
    if (!filled) {
      if (field.requirement === "must") missingMust.push(field.key);
      else missingShould.push(field.key);
    }
  }
  return { missingMust, missingShould };
}

export function upsertBrandBasics(
  existing: BrandBasicsProfile | undefined,
  patch: BrandBasicsValues,
): BrandBasicsProfile {
  const base = existing || createEmptyBrandBasics();
  const values: BrandBasicsValues = { ...base.values };
  for (const [k, v] of Object.entries(patch)) {
    if (typeof v === "string") {
      values[k as BrandBasicsFieldKey] = v.trim();
    }
  }
  const gaps = analyzeBrandBasicsGaps(values);
  const complete = gaps.missingMust.length === 0;
  return {
    ...base,
    values,
    missingMust: gaps.missingMust,
    missingShould: gaps.missingShould,
    status: complete ? "complete" : "draft",
    updatedAt: nowIso(),
    completedAt: complete ? base.completedAt || nowIso() : undefined,
  };
}

export function brandBasicsSummaryText(basics: BrandBasicsProfile): string {
  const v = basics.values;
  const parts = [
    v.brandName && `品牌：${v.brandName}`,
    v.category && `品类：${v.category}`,
    v.region && `区域：${v.region}`,
    v.storeScale && `规模：${v.storeScale}`,
    v.avgTicket && `客单：${v.avgTicket}`,
    v.annualRevenue && `营收：${v.annualRevenue}`,
    v.currentPositioning && `自述定位：${v.currentPositioning}`,
    v.competitors && `对手：${v.competitors}`,
    v.advantages && `优势：${v.advantages}`,
    v.businessGoal && `目标：${v.businessGoal}`,
    v.mainPain && `痛点：${v.mainPain}`,
  ].filter(Boolean);
  return parts.join("；");
}

function splitCompetitors(raw: string): string[] {
  return raw
    .split(/[,，、;；/\n]+/)
    .map((s) => s.trim())
    .filter((s) => isMeaningful(s, 2));
}

/**
 * Round B：基于基础档案缺口，生成定位咨询还需要的追问。
 * 规则优先：同一输入应产出稳定、可审计的问题集。
 */
export function generateAdaptiveFollowups(input: {
  brandProjectId: string;
  basics: BrandBasicsProfile;
}): AdaptiveFollowupSession {
  const v = input.basics.values;
  const questions: AdaptiveFollowupQuestion[] = [];
  const push = (q: Omit<AdaptiveFollowupQuestion, "id"> & { id?: string }) => {
    questions.push({
      ...q,
      id: q.id || createId("fq"),
    });
  };

  const rivals = splitCompetitors(v.competitors || "");
  const positioning = trim(v.currentPositioning);
  const advantage = trim(v.advantages);
  const pain = trim(v.mainPain);
  const ticket = trim(v.avgTicket);
  const slogan = trim(v.slogan);

  push({
    id: "fq_occasion",
    prompt: "客人最常在什么场合来你们店？（例如：工作日午餐 / 朋友小聚 / 家庭周末）",
    whyNeeded: "定位必须钉死主场景，否则品类与传播会漂。",
    priority: "must",
    triggeredBy: ["currentPositioning", "avgTicket"],
    mapsTo: "occasion",
  });

  push({
    id: "fq_choose_reason",
    prompt: "在同等价位里，客人为什么选你们而不是隔壁？请用可观察的事实说。",
    whyNeeded: "把「优势」落到客人决策语言，才能写定位 because。",
    priority: "must",
    triggeredBy: ["advantages", "competitors"],
    mapsTo: "customerNeed",
  });

  if (rivals.length < 2) {
    push({
      id: "fq_rival_second",
      prompt: "除了已提到的对手，还有谁经常被客人拿来对比？（再给 1–2 个店名）",
      whyNeeded: "竞争集太少，地图与差异化会失真。",
      priority: "must",
      triggeredBy: ["competitors"],
      mapsTo: "competitiveSetItem",
    });
  }

  push({
    id: "fq_rival_win",
    prompt: `${rivals[0] || "主要对手"}最容易抢走你们客人的一点是什么？`,
    whyNeeded: "知道对手赢面，才能定义 unlike 与空位。",
    priority: "must",
    triggeredBy: ["competitors"],
    mapsTo: "competitiveSetItem",
  });

  if (
    positioning.length < 12 ||
    /好吃|性价比|服务好|氛围好|品质/.test(positioning)
  ) {
    push({
      id: "fq_one_liner",
      prompt: "如果只能让陌生客人记住四个字到一句话，你希望他们记住什么？",
      whyNeeded: "当前自述定位偏泛，需要可传播的心智钉。",
      priority: "must",
      triggeredBy: ["currentPositioning"],
      mapsTo: "brandAmbition",
    });
  }

  if (
    advantage.length < 10 ||
    /好吃|服务|性价比|环境|新鲜/.test(advantage)
  ) {
    push({
      id: "fq_moat",
      prompt: "假如对手抄菜单、抄装修，还有哪一件他们三个月内抄不走？",
      whyNeeded: "优势表述偏通用，定位需要可防御资产。",
      priority: "must",
      triggeredBy: ["advantages"],
      mapsTo: "founderBelief",
    });
  } else {
    push({
      id: "fq_moat_soft",
      prompt: "这条优势，客人进店前就能感知到吗？还是只有吃完才知道？",
      whyNeeded: "区分传播可感知点 vs 履约证明点。",
      priority: "should",
      triggeredBy: ["advantages"],
      mapsTo: "founderBelief",
    });
  }

  if (pain.length > 0) {
    push({
      id: "fq_switch",
      prompt: "最近一次丢掉的客人/差评，最可能是因为什么？",
      whyNeeded: "痛点要落到可验证的流失原因，才能做战场取舍。",
      priority: "must",
      triggeredBy: ["mainPain"],
      mapsTo: "switchTrigger",
    });
  }

  if (!isMeaningful(slogan, 2) || slogan === "暂无") {
    push({
      id: "fq_refuse",
      prompt: "你们明确不想成为什么样的店？（例如：不做低价卷、不做网红打卡）",
      whyNeeded: "没有广告语时，用「拒绝成为」锁定战略边界。",
      priority: "should",
      triggeredBy: ["slogan", "businessGoal"],
      mapsTo: "brandAmbition",
    });
  }

  if (!/\d/.test(ticket)) {
    push({
      id: "fq_price_band",
      prompt: "你们和主要对手比，价格是明显更贵、持平，还是更便宜？大概差多少？",
      whyNeeded: "客单价表述缺数字，价格带会影响战场选择。",
      priority: "should",
      triggeredBy: ["avgTicket", "competitors"],
      mapsTo: "businessContext",
    });
  }

  const must = questions.filter((q) => q.priority === "must");
  const should = questions.filter((q) => q.priority === "should");
  const capped = [...must, ...should].slice(0, 8);

  return {
    sessionId: createId("afu"),
    brandProjectId: input.brandProjectId,
    status: "in_progress",
    questions: capped,
    answers: {},
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

export function answerAdaptiveFollowup(
  session: AdaptiveFollowupSession,
  questionId: string,
  answer: string,
): AdaptiveFollowupSession {
  const trimmed = answer.trim();
  if (!trimmed || !isMeaningful(trimmed, 2)) return session;

  const answers = { ...session.answers, [questionId]: trimmed };
  const mustIds = session.questions
    .filter((q) => q.priority === "must")
    .map((q) => q.id);
  const mustDone = mustIds.every((id) => isMeaningful(answers[id], 2));

  return {
    ...session,
    answers,
    status: mustDone ? "ready_to_compile" : "in_progress",
    updatedAt: nowIso(),
  };
}

export function adaptiveFollowupProgress(session: AdaptiveFollowupSession): {
  answered: number;
  total: number;
  mustAnswered: number;
  mustTotal: number;
  current: AdaptiveFollowupQuestion | null;
} {
  const must = session.questions.filter((q) => q.priority === "must");
  const answered = session.questions.filter((q) =>
    isMeaningful(session.answers[q.id], 2),
  ).length;
  const mustAnswered = must.filter((q) =>
    isMeaningful(session.answers[q.id], 2),
  ).length;
  const current =
    session.questions.find((q) => !isMeaningful(session.answers[q.id], 2)) ||
    null;
  return {
    answered,
    total: session.questions.length,
    mustAnswered,
    mustTotal: must.length,
    current,
  };
}

/**
 * 由基础档案 + 追问编译 BrandBrief。
 * 缺 must 字段或追问时保持 draft，绝不注入假对手/假定位。
 */
export function compileBrandBriefFromBasics(input: {
  basics: BrandBasicsProfile;
  followups?: AdaptiveFollowupSession | null;
  version?: number;
}): BrandBrief {
  const gaps: string[] = [];
  const basicsGaps = analyzeBrandBasicsGaps(input.basics.values);
  for (const k of basicsGaps.missingMust) {
    gaps.push(`basics.${k}`);
  }

  const v = input.basics.values;
  const fu = input.followups;
  const a = fu?.answers || {};

  if (fu) {
    for (const q of fu.questions.filter((x) => x.priority === "must")) {
      if (!isMeaningful(a[q.id], 2)) gaps.push(`followup.${q.id}`);
    }
  } else {
    gaps.push("followups.missing");
  }

  const rivals = [
    ...splitCompetitors(v.competitors || ""),
    ...splitCompetitors(a.fq_rival_second || ""),
  ];
  const competitiveSet = Array.from(new Set(rivals));
  if (competitiveSet.length === 0) {
    gaps.push("competitiveSet");
  }

  const occasion = trim(a.fq_occasion);
  const choose = trim(a.fq_choose_reason);
  const oneLiner = trim(a.fq_one_liner);
  const moat = trim(a.fq_moat || a.fq_moat_soft);
  const switchTrigger = trim(a.fq_switch);
  const refuse = trim(a.fq_refuse);
  const priceBand = trim(a.fq_price_band);
  const rivalWin = trim(a.fq_rival_win);

  const businessContext = [
    v.brandName && `品牌「${v.brandName}」`,
    v.region && `主战场${v.region}`,
    v.storeScale && `规模${v.storeScale}`,
    v.annualRevenue && `营收量级${v.annualRevenue}`,
    v.avgTicket && `客单${v.avgTicket}`,
    priceBand && `价格带：${priceBand}`,
    v.businessGoal && `本轮目标：${v.businessGoal}`,
    v.mainPain && `当前痛点：${v.mainPain}`,
  ]
    .filter(Boolean)
    .join("；");

  const categoryDefinition = trim(v.category);
  const targetCustomer = occasion ? `${occasion}的到店客人` : "";
  const customerNeed =
    choose ||
    (trim(v.currentPositioning)
      ? `客人要的是：${trim(v.currentPositioning)}`
      : "");
  const brandAmbition =
    oneLiner ||
    refuse ||
    (trim(v.slogan) !== "暂无" ? trim(v.slogan) : "") ||
    trim(v.currentPositioning);
  const founderBelief = moat || trim(v.advantages);

  if (!businessContext) gaps.push("businessContext");
  if (!categoryDefinition) gaps.push("categoryDefinition");
  if (!targetCustomer) gaps.push("targetCustomer");
  if (!customerNeed) gaps.push("customerNeed");
  if (!brandAmbition) gaps.push("brandAmbition");
  if (!founderBelief) gaps.push("founderBelief");

  const rawAnswers: Record<string, string> = {
    ...Object.fromEntries(
      Object.entries(v).filter(([, val]) => typeof val === "string" && val),
    ),
    ...a,
    rivalWin,
    switchTrigger,
  };

  return {
    briefId: createId("brief"),
    version: input.version ?? 1,
    status: gaps.length === 0 ? "complete" : "draft",
    businessContext: businessContext || "",
    categoryDefinition: categoryDefinition || "",
    targetCustomer: targetCustomer || "",
    customerNeed: customerNeed || "",
    competitiveSet,
    brandAmbition: brandAmbition || "",
    founderBelief: founderBelief || "",
    rawAnswers,
    gaps,
    compiledAt: nowIso(),
  };
}
