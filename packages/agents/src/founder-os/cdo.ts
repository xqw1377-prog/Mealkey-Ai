/**
 * CDO — 决策秘书长
 * 管流程、选人、分级；不投票、不表达经营立场。
 */

import { getDecisionType } from "./catalog";
import { classifyDecisionType } from "./prompt-stack";
import type {
  AgendaBrief,
  CasePacket,
  CouncilRoleId,
  DecisionTypeId,
  IssueLevel,
  MeetingStageId,
} from "./types";

const ALL_ROLES: CouncilRoleId[] = [
  "CSO",
  "CMO",
  "CBO",
  "BMO",
  "CFO",
  "COO",
  "CRO",
];

const TYPE_DEFAULT_LEVEL: Record<DecisionTypeId, IssueLevel> = {
  store_expansion: "L2",
  new_city_expansion: "L3",
  new_brand: "L3",
  fundraising: "L4",
  restructuring: "L4",
};

const L2_ROSTER: Record<string, CouncilRoleId[]> = {
  // L2 = 3–5 席；开第二家店取 5 席核心
  store_expansion: ["CSO", "CMO", "CBO", "BMO", "CFO"],
  new_brand: ["CSO", "CMO", "CBO", "BMO"],
  default: ["CSO", "BMO", "CFO", "COO"],
};

const STAGE_ORDER: MeetingStageId[] = [
  "agenda",
  "expert_input",
  "deliberation",
  "cross_examination",
  "resolution",
];

function buildId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}`;
  return `${prefix}-${rand}`;
}

export function classifyIssueLevel(
  decisionType: DecisionTypeId,
  opts?: { forceLevel?: IssueLevel; founderForceCouncil?: boolean },
): IssueLevel {
  if (opts?.forceLevel) return opts.forceLevel;
  const base = TYPE_DEFAULT_LEVEL[decisionType] ?? "L2";
  if (opts?.founderForceCouncil && base === "L1") return "L2";
  return base;
}

export function selectCouncilRoster(
  level: IssueLevel,
  decisionType: DecisionTypeId,
): CouncilRoleId[] {
  if (level === "L1") return [];
  if (level === "L2") {
    return L2_ROSTER[decisionType] ?? L2_ROSTER.default!;
  }
  return [...ALL_ROLES];
}

export function shouldConveneCouncil(level: IssueLevel): boolean {
  return level !== "L1";
}

export function founderRequired(level: IssueLevel): boolean {
  return level === "L3" || level === "L4";
}

/** CDO：从自然语言议题生成 Agenda Brief（Stage 1） */
export function buildAgendaBrief(input: {
  topic: string;
  whyNow?: string;
  objective?: string;
  constraints?: string[];
  questionsToAnswer?: string[];
  deadline?: string;
  decisionType?: DecisionTypeId;
  forceLevel?: IssueLevel;
}): AgendaBrief {
  const decisionType =
    input.decisionType ?? classifyDecisionType(input.topic);
  const level = classifyIssueLevel(decisionType, {
    forceLevel: input.forceLevel,
  });
  const dt = getDecisionType(decisionType);
  const roster = selectCouncilRoster(level, decisionType);

  return {
    briefId: buildId("AB"),
    topic: input.topic,
    whyNow: input.whyNow,
    objective: input.objective ?? `就「${input.topic}」形成可执行决议`,
    constraints: input.constraints ?? [],
    questionsToAnswer:
      input.questionsToAnswer ??
      roster.map((r) => {
        const q: Record<CouncilRoleId, string> = {
          CSO: "这件事是否值得做？",
          CMO: "有没有真实需求？",
          CBO: "为什么用户会选你？",
          BMO: "这个模式成立吗？",
          CFO: "钱够不够，值不值？",
          COO: "现实中能跑吗？",
          CRO: "最坏情况是什么？",
        };
        return `[${r}] ${q[r]}`;
      }),
    deadline: input.deadline,
    level,
    decisionType,
    roster,
    requiredEngines: level === "L1" ? dt.default_required_agents.slice(0, 1) : dt.default_required_agents,
    conveneCouncil: shouldConveneCouncil(level),
    founderRequired: founderRequired(level),
  };
}

export function agendaToCasePacket(agenda: AgendaBrief, caseId?: string): CasePacket {
  return {
    caseId: caseId ?? buildId("D"),
    question: agenda.topic,
    objective: agenda.objective,
    decisionType: agenda.decisionType,
    constraints: agenda.constraints,
    deadline: agenda.deadline,
    background: agenda.whyNow ? [agenda.whyNow] : [],
    requiredAgents: agenda.requiredEngines,
  };
}

export function advanceMeetingStage(
  current: MeetingStageId,
): MeetingStageId | "done" {
  const i = STAGE_ORDER.indexOf(current);
  if (i < 0 || i >= STAGE_ORDER.length - 1) return "done";
  return STAGE_ORDER[i + 1]!;
}

export function meetingStageLabel(id: MeetingStageId): string {
  const map: Record<MeetingStageId, string> = {
    agenda: "议题定义",
    expert_input: "专业输入",
    deliberation: "常委审议",
    cross_examination: "交叉质询",
    resolution: "形成决议",
  };
  return map[id];
}

export const CDO_CONTRACT = {
  role_id: "CDO",
  chinese: "决策秘书长",
  is_council_member: false,
  mission: "管理决策流程，而不是参与观点。",
  forbidden: [
    "表达经营立场或投票",
    "用常识冒充 Expert Report",
    "L3/L4 跳过交叉质询直接出决议",
  ],
} as const;

export { STAGE_ORDER, ALL_ROLES as FULL_COUNCIL_ROSTER };
