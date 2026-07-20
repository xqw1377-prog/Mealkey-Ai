/**
 * 议题识别 Engine — 老板自然语言 → DecisionIssue
 * 缺失这一步，AI 只会「分别回答」，不会「开会」。
 */

import { classifyDecisionType } from "./prompt-stack";
import type {
  CouncilRoleId,
  DecisionTypeId,
  IssueLevel,
} from "./types";

export type IssueDomain =
  | "STRATEGY"
  | "MARKET"
  | "BRAND"
  | "BUSINESS"
  | "CAPITAL"
  | "OPERATION"
  | "RISK";

export interface DecisionIssue {
  id: string;
  question: string;
  type: IssueDomain;
  importance: IssueLevel;
  decisionType: DecisionTypeId;
  relatedAgents: string[];
  councilLevel: IssueLevel;
  suggestedRoster: CouncilRoleId[];
  decisionDeadline?: string;
  whyClassified: string[];
}

function buildId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}`;
  return `${prefix}-${rand}`;
}

/** 领域 → 默认常委（L1/L2 裁剪用） */
const DOMAIN_CORE_ROSTER: Record<IssueDomain, CouncilRoleId[]> = {
  STRATEGY: ["CSO", "CMO", "BMO", "CFO"],
  MARKET: ["CMO", "BMO", "CBO", "COO"],
  BRAND: ["CBO", "CMO", "CSO", "BMO"],
  BUSINESS: ["BMO", "CFO", "COO", "CMO"],
  CAPITAL: ["CFO", "CSO", "CRO", "BMO"],
  OPERATION: ["COO", "BMO", "CFO", "CMO"],
  RISK: ["CRO", "CFO", "COO", "CSO"],
};

const DOMAIN_ENGINES: Record<IssueDomain, string[]> = {
  STRATEGY: ["M-MKT", "M-BIZ", "M-PNT"],
  MARKET: ["M-MKT", "M-PNT"],
  BRAND: ["M-PNT", "M-MKT"],
  BUSINESS: ["M-BIZ", "M-MKT"],
  CAPITAL: ["M-ED", "M-BIZ"],
  OPERATION: ["M-BIZ", "M-MKT"],
  RISK: ["M-ED", "M-BIZ", "M-PNT"],
};

/**
 * 从自然语言识别议题领域（可与 decisionType 并存）
 */
export function classifyIssueDomain(question: string): {
  type: IssueDomain;
  why: string[];
} {
  const q = question.trim();
  const why: string[] = [];

  if (/加盟|特许|联营/.test(q)) {
    why.push("含加盟/特许语义 → 战略+资本结构议题");
    return { type: "STRATEGY", why };
  }
  if (/融资|估值|稀释|卖公司|出售股权|出让控股权/.test(q)) {
    why.push("含融资/控股权语义 → 资本议题");
    return { type: "CAPITAL", why };
  }
  if (/定位|品牌|心智|第二品牌|子品牌/.test(q)) {
    why.push("含品牌/定位语义 → 品牌议题");
    return { type: "BRAND", why };
  }
  if (/菜单|涨价|降价|价格调整|SKU|单品/.test(q)) {
    why.push("含菜单/价格语义 → 经营日常（市场+商业）");
    return { type: "MARKET", why };
  }
  if (/合规|食安|法律|风险|舆情/.test(q)) {
    why.push("含合规/风险语义 → 风险议题");
    return { type: "RISK", why };
  }
  if (/店长|SOP|培训|排班|供应链|复制|第.?家店还能/.test(q)) {
    why.push("含执行/复制语义 → 运营议题");
    return { type: "OPERATION", why };
  }
  if (/赚钱|回本|毛利|单店模型|单位经济|商业模式/.test(q)) {
    why.push("含赚钱/模型语义 → 商业议题");
    return { type: "BUSINESS", why };
  }
  if (/市场|用户|需求|客群|城市|开店|扩店|进入/.test(q)) {
    why.push("含市场/扩张语义 → 市场或战略");
    if (/新城市|进入.+市|全国|开城/.test(q)) {
      why.push("新城市/开城 → 战略级");
      return { type: "STRATEGY", why };
    }
    return { type: "MARKET", why };
  }
  if (/转型|战略|方向|战场/.test(q)) {
    why.push("含战略方向语义");
    return { type: "STRATEGY", why };
  }

  why.push("默认归入商业经营议题");
  return { type: "BUSINESS", why };
}

function inferImportance(
  decisionType: DecisionTypeId,
  domain: IssueDomain,
  question: string,
  forceLevel?: IssueLevel,
): IssueLevel {
  if (forceLevel) return forceLevel;
  if (/菜单|涨价|降价|价格|文案|单品/.test(question) && !/融资|城市|加盟/.test(question)) {
    return "L1";
  }
  if (decisionType === "fundraising" || decisionType === "restructuring") return "L4";
  if (decisionType === "new_city_expansion" || decisionType === "new_brand") return "L3";
  if (/加盟/.test(question)) return "L3";
  if (domain === "CAPITAL" || domain === "RISK") return "L3";
  if (decisionType === "store_expansion") return "L2";
  return "L2";
}

function rosterForLevel(
  level: IssueLevel,
  domain: IssueDomain,
  decisionType: DecisionTypeId,
): CouncilRoleId[] {
  const core = DOMAIN_CORE_ROSTER[domain];
  if (level === "L1") return core.slice(0, 2);
  if (level === "L2") {
    if (decisionType === "store_expansion") {
      return ["CSO", "CMO", "CBO", "BMO", "CFO", "COO"].slice(0, 5) as CouncilRoleId[];
    }
    if (decisionType === "new_brand") return ["CSO", "CMO", "CBO", "BMO"];
    return core.slice(0, Math.min(5, Math.max(3, core.length)));
  }
  // L3/L4
  return ["CSO", "CMO", "CBO", "BMO", "CFO", "COO", "CRO"];
}

/**
 * 议题识别主入口：自然语言 → DecisionIssue
 */
export function classifyDecisionIssue(input: {
  question: string;
  decisionDeadline?: string;
  forceLevel?: IssueLevel;
  id?: string;
}): DecisionIssue {
  const { type, why } = classifyIssueDomain(input.question);
  let decisionType = classifyDecisionType(input.question);

  // 加盟特判：战略级，常挂 BIZ/ED/PNT
  if (/加盟|特许/.test(input.question)) {
    decisionType = "store_expansion";
    why.push("加盟场景：decisionType=store_expansion，级别抬至战略审议");
  }

  const importance = inferImportance(
    decisionType,
    type,
    input.question,
    input.forceLevel,
  );
  const suggestedRoster = rosterForLevel(importance, type, decisionType);
  let relatedAgents = DOMAIN_ENGINES[type];
  if (/加盟/.test(input.question)) {
    relatedAgents = ["M-BIZ", "M-ED", "M-PNT"];
  }

  return {
    id: input.id ?? buildId("ISSUE"),
    question: input.question,
    type,
    importance,
    decisionType,
    relatedAgents,
    councilLevel: importance,
    suggestedRoster,
    decisionDeadline: input.decisionDeadline,
    whyClassified: why,
  };
}
