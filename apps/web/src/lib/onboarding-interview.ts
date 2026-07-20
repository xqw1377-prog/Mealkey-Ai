/**
 * Business Identity 登录速写（Decision Experience V1）
 * 权威：docs/MEALKEY_DECISION_EXPERIENCE_V1.md
 */

import {
  FOCUS_LABEL,
  HORIZON_LABEL,
  SCOPE_LABEL,
  identityExternalReady,
  parseLocationLine,
  storeCountFromBand,
  type BusinessIdentityV1,
  type BusinessScopeKind,
  type DecisionFocusKind,
  type DecisionHorizonV1,
} from "@/server/founder-layer/contracts/business-identity";

export type InterviewAnswers = {
  scope: BusinessScopeKind | "";
  objectName: string;
  brandName: string;
  location: string;
  storeCountBand: "1" | "2-5" | "5+" | "";
  focus: DecisionFocusKind | "";
  decisionHorizon: DecisionHorizonV1 | "";
  biggestProblem: string;
};

export type IdentityUnderstanding = {
  objectName: string;
  brandName: string;
  locationLine: string;
  stageLabel: string;
  focusLabel: string;
  watchLines: string[];
  oneLiner: string;
  externalIntelReady: boolean;
};

export type EnterpriseUnderstanding = IdentityUnderstanding & {
  brandName: string;
  judgement: string;
  confirmQuestions: string[];
};

type ChoiceOption = { value: string; label: string };

export type InterviewQuestion =
  | {
      id: keyof InterviewAnswers;
      prompt: string;
      kind: "text";
      placeholder: string;
    }
  | {
      id: keyof InterviewAnswers;
      prompt: string;
      kind: "choice";
      options: ChoiceOption[];
    };

export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    id: "scope",
    prompt: "你的经营对象？",
    kind: "choice",
    options: [
      { value: "store", label: SCOPE_LABEL.store },
      { value: "brand", label: SCOPE_LABEL.brand },
      { value: "multi_brand", label: SCOPE_LABEL.multi_brand },
      { value: "region", label: SCOPE_LABEL.region },
    ],
  },
  {
    id: "objectName",
    prompt: "叫什么？",
    kind: "text",
    placeholder: "例如：南门小馆 / 最湘宴",
  },
  {
    id: "brandName",
    prompt: "品牌名称？（若上面已是品牌名，可再确认一次）",
    kind: "text",
    placeholder: "例如：最湘宴",
  },
  {
    id: "location",
    prompt: "主要在哪个城市 / 区域？或门店地址",
    kind: "text",
    placeholder: "例如：长沙 · 岳麓区 或 长沙市雨花区xx路",
  },
  {
    id: "storeCountBand",
    prompt: "现在规模？",
    kind: "choice",
    options: [
      { value: "1", label: "1 家" },
      { value: "2-5", label: "2–5 家" },
      { value: "5+", label: "5 家以上" },
    ],
  },
  {
    id: "focus",
    prompt: "你最关注什么？",
    kind: "choice",
    options: [
      { value: "growth", label: FOCUS_LABEL.growth },
      { value: "profit", label: FOCUS_LABEL.profit },
      { value: "org", label: FOCUS_LABEL.org },
      { value: "product", label: FOCUS_LABEL.product },
      { value: "expansion", label: FOCUS_LABEL.expansion },
    ],
  },
  {
    id: "decisionHorizon",
    prompt: "做经营决定时，你通常看多远？",
    kind: "choice",
    options: [
      { value: "short", label: HORIZON_LABEL.short },
      { value: "mid", label: HORIZON_LABEL.mid },
      { value: "long", label: HORIZON_LABEL.long },
    ],
  },
  {
    id: "biggestProblem",
    prompt: "现在最困扰你的事情？",
    kind: "text",
    placeholder: "例如：要不要开第二家 / 人效吃掉利润",
  },
];

export const EMPTY_INTERVIEW_ANSWERS: InterviewAnswers = {
  scope: "",
  objectName: "",
  brandName: "",
  location: "",
  storeCountBand: "",
  focus: "",
  decisionHorizon: "",
  biggestProblem: "",
};

export function answerDisplayLabel(
  id: keyof InterviewAnswers,
  value: string,
): string {
  if (id === "scope" && value in SCOPE_LABEL) {
    return SCOPE_LABEL[value as BusinessScopeKind];
  }
  if (id === "focus" && value in FOCUS_LABEL) {
    return FOCUS_LABEL[value as DecisionFocusKind];
  }
  if (id === "storeCountBand") {
    if (value === "1") return "1 家";
    if (value === "2-5") return "2–5 家";
    if (value === "5+") return "5 家以上";
  }
  if (id === "decisionHorizon" && value in HORIZON_LABEL) {
    return HORIZON_LABEL[value as DecisionHorizonV1];
  }
  return value;
}

export function buildBusinessIdentity(
  answers: InterviewAnswers,
  now = new Date(),
): BusinessIdentityV1 {
  const loc = parseLocationLine(answers.location);
  const band =
    answers.storeCountBand === "2-5" || answers.storeCountBand === "5+"
      ? answers.storeCountBand
      : "1";
  const brand =
    answers.brandName.trim() || answers.objectName.trim() || "未命名品牌";
  const objectName = answers.objectName.trim() || brand;
  const draft: BusinessIdentityV1 = {
    schemaVersion: 1,
    scope: (answers.scope || "store") as BusinessScopeKind,
    objectName,
    brandName: brand,
    city: loc.city,
    district: loc.district,
    address: loc.address,
    storeCountBand: band,
    storeCountApprox: storeCountFromBand(band),
    focus: (answers.focus || "growth") as DecisionFocusKind,
    decisionHorizon:
      answers.decisionHorizon === "short" ||
      answers.decisionHorizon === "long"
        ? answers.decisionHorizon
        : "mid",
    biggestProblem: answers.biggestProblem.trim(),
    externalIntelReady: false,
    completedAt: now.toISOString(),
    source: "identity_intake_v1",
  };
  draft.externalIntelReady = identityExternalReady(draft);
  return draft;
}

export function buildIdentityUnderstanding(
  answers: InterviewAnswers,
): IdentityUnderstanding {
  const id = buildBusinessIdentity(answers);
  const stores = id.storeCountApprox;
  const problem = id.biggestProblem;
  const expanding =
    id.focus === "expansion" ||
    /第二|扩张|开店|加盟|复制|连锁/.test(problem);

  const stageLabel =
    stores <= 1
      ? expanding
        ? "单店 · 扩张酝酿期"
        : "单店增长期"
      : stores <= 5
        ? expanding
          ? "多店 · 复制准备期"
          : "多店打磨期"
        : "区域规模化期";

  const focusLabel = FOCUS_LABEL[id.focus];
  const watchLines: string[] = [];
  if (id.focus === "profit" || /利润|成本|亏损/.test(problem)) {
    watchLines.push("利润风险");
  } else {
    watchLines.push("增长机会");
  }
  if (id.focus === "profit" || id.focus === "growth") {
    watchLines.push(id.focus === "profit" ? "增长机会" : "利润风险");
  }
  if (expanding || id.focus === "expansion" || id.focus === "org") {
    watchLines.push("扩张条件");
  }
  if (watchLines.length < 2) watchLines.push("组织能力");

  const locationLine = [id.city, id.district || id.address]
    .filter(Boolean)
    .join(" · ");

  return {
    objectName: id.objectName,
    brandName: id.brandName,
    locationLine: locationLine || "位置待补",
    stageLabel,
    focusLabel,
    watchLines: [...new Set(watchLines)].slice(0, 3),
    oneLiner: `我会按「${SCOPE_LABEL[id.scope]}」帮你盯 ${id.objectName}。`,
    externalIntelReady: id.externalIntelReady,
  };
}

/** @deprecated 兼容旧名 */
export function buildEnterpriseUnderstanding(
  answers: InterviewAnswers,
): EnterpriseUnderstanding {
  const u = buildIdentityUnderstanding(answers);
  const problem = answers.biggestProblem.trim();
  const judgement =
    /扩张|第二|开店/.test(problem)
      ? "你的核心挑战不是开店速度，而是模型与组织是否支持第二增长曲线。"
      : /利润|成本|亏损/.test(problem)
        ? "你的核心挑战更像单店是否真正赚钱，而不是扩张口号。"
        : `当前重点在「${u.focusLabel}」——我们会先帮你盯住今日该关注的事。`;

  return {
    ...u,
    judgement,
    confirmQuestions: [
      "品牌与地理信息是否准确？",
      "当前最困扰的事是否仍是第一优先？",
      "有没有刚发生的经营变化需要马上告诉系统？",
    ],
  };
}

export type GrowthPlan = {
  day30: string;
  day60: string;
  day90: string;
  startedAt: string;
  decisionSummary: string;
  horizonDays: number;
};

export function buildGrowthPlan(input: {
  judgement: string;
  action?: string;
  problem?: string;
}): GrowthPlan {
  const text = `${input.judgement} ${input.action || ""} ${input.problem || ""}`;
  const expanding = /扩张|加盟|复制|连锁|开店|第二/.test(text);
  return {
    day30: expanding ? "完成店长/组织关键观察清单" : "完成验证所需的关键标准动作",
    day60: expanding ? "完成单店利润与现金缓冲复核" : "完成中期验证数据复盘",
    day90: expanding ? "重新评估是否启动第二店" : "复盘验证结果并决定下一步",
    startedAt: new Date().toISOString(),
    decisionSummary: input.judgement.slice(0, 120),
    horizonDays: 90,
  };
}

export function daysRemainingInPlan(plan: GrowthPlan, now = new Date()): number {
  const started = new Date(plan.startedAt).getTime();
  if (Number.isNaN(started)) return plan.horizonDays;
  const elapsed = Math.floor((now.getTime() - started) / (24 * 60 * 60 * 1000));
  return Math.max(0, plan.horizonDays - elapsed);
}

/** 从 project.profile 读取经营身份 */
export function readBusinessIdentityFromProfile(
  profile: unknown,
): BusinessIdentityV1 | null {
  if (!profile || typeof profile !== "object") return null;
  const bi = (profile as Record<string, unknown>).businessIdentity;
  if (!bi || typeof bi !== "object") return null;
  const o = bi as Record<string, unknown>;
  if (o.schemaVersion !== 1) return null;
  if (typeof o.brandName !== "string" || typeof o.city !== "string") return null;
  return bi as BusinessIdentityV1;
}
