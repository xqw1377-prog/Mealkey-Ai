/**
 * BrandBrief 访谈引擎 — 精简五问 → 编译 BrandBrief
 * AI 时代原则：只问不可推断的信号，其余由系统补全。
 */
import type {
  BrandBrief,
  BriefInterviewLayer,
  BriefInterviewSession,
} from "./types";

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * 精简题库：每层只问 1 个高信号问题（共 5 题）
 * 旧题 id 仍可被 compile 兼容读取（若历史会话有答案）。
 */
export const BRIEF_QUESTION_BANK: Record<
  BriefInterviewLayer,
  Array<{ id: string; prompt: string; mapsTo: keyof BrandBrief | "competitiveSetItem" }>
> = {
  enterprise: [
    {
      id: "ent_why",
      prompt: "客人找你们，最想解决什么麻烦？",
      mapsTo: "businessContext",
    },
  ],
  category: [
    {
      id: "cat_self",
      prompt: "你们更像哪一类店？",
      mapsTo: "categoryDefinition",
    },
  ],
  customer: [
    {
      id: "cus_who",
      prompt: "真正掏钱最多的是谁、什么场合？",
      mapsTo: "targetCustomer",
    },
  ],
  competition: [
    {
      id: "cmp_who",
      prompt: "抢客人最凶的对手是谁？",
      mapsTo: "competitiveSetItem",
    },
  ],
  founder: [
    {
      id: "fnd_edge",
      prompt: "你们最难被抄走的一点是什么？",
      mapsTo: "founderBelief",
    },
  ],
};

export const BRIEF_LAYER_ORDER: BriefInterviewLayer[] = [
  "enterprise",
  "category",
  "customer",
  "competition",
  "founder",
];

/** 一层一题，答完即推进 */
const LAYER_MIN_COMPLETENESS = 1;

export function createBriefInterviewSession(
  brandProjectId: string,
): BriefInterviewSession {
  const layer: BriefInterviewLayer = "enterprise";
  return {
    brandProjectId,
    layer,
    answers: {},
    openQuestions: BRIEF_QUESTION_BANK[layer].map((q) => q.id),
    completeness: 0,
    status: "in_progress",
  };
}

export function getCurrentLayerQuestions(layer: BriefInterviewLayer) {
  return BRIEF_QUESTION_BANK[layer];
}

export function answerBriefQuestion(
  session: BriefInterviewSession,
  questionId: string,
  answer: string,
): BriefInterviewSession {
  const trimmed = answer.trim();
  if (!trimmed) return session;

  const answers = { ...session.answers, [questionId]: trimmed };
  const layerQuestions = BRIEF_QUESTION_BANK[session.layer];
  const answered = layerQuestions.filter((q) => answers[q.id]?.trim()).length;
  const completeness = layerQuestions.length
    ? answered / layerQuestions.length
    : 0;

  const openQuestions = layerQuestions
    .filter((q) => !answers[q.id]?.trim())
    .map((q) => q.id);

  return {
    ...session,
    answers,
    completeness,
    openQuestions,
    status: "in_progress",
  };
}

export function tryAdvanceBriefLayer(
  session: BriefInterviewSession,
): BriefInterviewSession {
  if (session.completeness < LAYER_MIN_COMPLETENESS) {
    return session;
  }

  const idx = BRIEF_LAYER_ORDER.indexOf(session.layer);
  if (idx < 0) return session;

  if (idx >= BRIEF_LAYER_ORDER.length - 1) {
    return {
      ...session,
      completeness: 1,
      openQuestions: [],
      status: "ready_to_compile",
    };
  }

  const next = BRIEF_LAYER_ORDER[idx + 1]!;
  return {
    ...session,
    layer: next,
    completeness: 0,
    openQuestions: BRIEF_QUESTION_BANK[next].map((q) => q.id),
    status: "in_progress",
  };
}

function joinAnswers(
  answers: Record<string, string>,
  ids: string[],
): string {
  return ids
    .map((id) => answers[id]?.trim())
    .filter(Boolean)
    .join(" / ");
}

/**
 * 将访谈答案编译为 BrandBrief（旧五问路径兼容）。
 * 缺信号保持 draft；禁止注入假对手/假定位文案。
 */
export function compileBrandBrief(
  session: BriefInterviewSession,
  version = 1,
): BrandBrief {
  const a = session.answers;
  const why = (a.ent_why || "").trim();
  const cat = (a.cat_self || a.cat_consumer || "").trim();
  const who = (a.cus_who || "").trim();
  const rival = (a.cmp_who || "").trim();
  const edge = (a.fnd_edge || a.fnd_asset || a.cmp_win || "").trim();

  const businessContext = joinAnswers(a, ["ent_why", "ent_3y"]) || why;
  const categoryDefinition = joinAnswers(a, ["cat_self", "cat_consumer"]) || cat;
  const targetCustomer = who;
  const customerNeed =
    joinAnswers(a, ["cus_choose", "cus_leave"]) ||
    (why ? `解决：${why}` : "");
  const brandAmbition =
    joinAnswers(a, ["ent_become", "cat_change"]) ||
    (who ? `成为${who}的默认选择` : "");
  const founderBelief =
    joinAnswers(a, ["cmp_win", "fnd_edge", "fnd_asset"]) || edge;

  const competitiveSet = [
    rival,
    ...(a.cmp_set || "")
      .split(/[,，、;；\n]/)
      .map((s) => s.trim())
      .filter(Boolean),
  ].filter(Boolean) as string[];

  const gaps: string[] = [];
  if (!why) gaps.push("ent_why");
  if (!categoryDefinition) gaps.push("categoryDefinition");
  if (!targetCustomer) gaps.push("targetCustomer");
  if (!customerNeed) gaps.push("customerNeed");
  if (competitiveSet.length === 0) gaps.push("competitiveSet");
  if (!brandAmbition) gaps.push("brandAmbition");
  if (!founderBelief) gaps.push("founderBelief");
  if (!businessContext) gaps.push("businessContext");

  return {
    briefId: createId("brief"),
    version,
    status: gaps.length === 0 ? "complete" : "draft",
    businessContext,
    categoryDefinition,
    targetCustomer,
    customerNeed,
    competitiveSet,
    brandAmbition,
    founderBelief,
    rawAnswers: { ...a },
    gaps,
    compiledAt: new Date().toISOString(),
  };
}
