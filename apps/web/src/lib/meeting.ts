/**
 * Founder OS Meeting System — 前端运行时模型（对齐 docs/FOUNDER_OS_MEETING_SYSTEM_V1.md）
 */

export type MeetingLifecycle =
  | "INIT"
  | "PREPARE"
  | "OPEN"
  | "DISCUSS"
  | "DEBATE"
  | "SYNTHESIS"
  | "USER_CONFIRM"
  | "DECISION"
  | "VALIDATE"
  | "MEMORY_UPDATE"
  | "ABANDONED";

export type MeetingDepartment = "general" | "market" | "brand" | "business" | "org";

export type ExpertSeat = {
  roleId: string;
  displayName: string;
  duty: string;
  focus: string[];
};

export type ExpertStatement = {
  id: string;
  roleId: string;
  displayName: string;
  round: 1 | 2 | 3;
  stance: "support" | "oppose" | "conditional" | "neutral";
  claim: string;
  reasons: string[];
};

export type MeetingConflict = {
  id: string;
  issue: string;
  positionA: string;
  positionB: string;
  conflictLabel: string;
};

export type ConsensusDraft = {
  summary: string;
  proposedDecision: string;
  coreReasons: string[];
  nextActions: string[];
  validationPlan?: string;
};

export type DecisionCard = {
  problem: string;
  consensus: string;
  coreReasons: string[];
  nextSteps: string[];
  validationDays: number;
  owner: string;
  status: "executing" | "validating" | "done" | "abandoned";
};

export type MeetingSeedInput = {
  topic: string;
  title?: string;
  department?: MeetingDepartment;
  knownFacts?: string[];
  unknownGaps?: string[];
  judgements?: string[];
  meetingDecision?: string;
  decisionNextStep?: string;
  challenge?: string;
};

export const GENERAL_EXPERTS: ExpertSeat[] = [
  {
    roleId: "expert.biz_model",
    displayName: "商业模式顾问",
    duty: "赚钱逻辑",
    focus: ["收入", "成本", "盈利", "可持续"],
  },
  {
    roleId: "expert.market",
    displayName: "市场顾问",
    duty: "外部机会",
    focus: ["用户", "趋势", "竞争"],
  },
  {
    roleId: "expert.ops",
    displayName: "运营顾问",
    duty: "落地能力",
    focus: ["标准化", "人员", "供应链"],
  },
  {
    roleId: "expert.finance",
    displayName: "财务顾问",
    duty: "风险",
    focus: ["现金", "投入", "回报"],
  },
];

export const DEPARTMENT_MEETING_TITLE: Record<MeetingDepartment, string> = {
  general: "商业战略会议",
  market: "市场机会评估会",
  brand: "品牌定位委员会",
  business: "商业模式评审会",
  org: "组织与股权设计会",
};

export function lifecycleLabel(lifecycle: MeetingLifecycle): string {
  const map: Record<MeetingLifecycle, string> = {
    INIT: "初始化",
    PREPARE: "会前准备",
    OPEN: "会议开场",
    DISCUSS: "独立判断",
    DEBATE: "互相挑战",
    SYNTHESIS: "形成共识",
    USER_CONFIRM: "等待你的决定",
    DECISION: "决策已确认",
    VALIDATE: "验证中",
    MEMORY_UPDATE: "已写入记忆",
    ABANDONED: "已中止",
  };
  return map[lifecycle];
}

export function detectDepartmentFromTopic(topic: string): MeetingDepartment {
  const t = topic.toLowerCase();
  if (/定位|品牌|心智|品类/.test(t)) return "brand";
  if (/市场|城市|竞争|窗口|用户洞察/.test(t)) return "market";
  if (/股权|组织|激励|控制权|治理/.test(t)) return "org";
  if (/加盟|扩张|商业模式|盈利|复制|直营/.test(t)) return "business";
  return "general";
}

export function detectConflict(
  topic: string,
  statements: ExpertStatement[],
  challenge?: string,
): MeetingConflict | null {
  const support = statements.filter((s) => s.stance === "support" || s.stance === "conditional");
  const oppose = statements.filter((s) => s.stance === "oppose");

  if (challenge && /vs|VS|对|还是/.test(challenge)) {
    const parts = challenge.split(/vs|VS|对|还是/).map((p) => p.trim()).filter(Boolean);
    if (parts.length >= 2) {
      return {
        id: "conflict-challenge",
        issue: topic,
        positionA: parts[0]!.slice(0, 24),
        positionB: parts[1]!.slice(0, 24),
        conflictLabel: `${parts[0]!.slice(0, 12)} vs ${parts[1]!.slice(0, 12)}`,
      };
    }
  }

  if (oppose.length === 0 || support.length === 0) {
    if (/加盟|扩张|复制|增长/.test(topic)) {
      return {
        id: "conflict-default-expand",
        issue: topic,
        positionA: "抓住市场窗口",
        positionB: "先补齐复制能力",
        conflictLabel: "市场窗口 vs 复制能力",
      };
    }
    return null;
  }

  return {
    id: "conflict-stances",
    issue: topic,
    positionA: support[0]?.claim.slice(0, 28) || "推进",
    positionB: oppose[0]?.claim.slice(0, 28) || "暂缓",
    conflictLabel: "推进时机 vs 能力准备",
  };
}

export function buildConsensusDraft(input: MeetingSeedInput): ConsensusDraft {
  const proposed =
    input.meetingDecision &&
    input.meetingDecision !== "待会议收束" &&
    input.meetingDecision !== "待形成首轮经营判断"
      ? input.meetingDecision
      : "先完成关键能力验证，再决定是否加速扩张";

  return {
    summary: proposed,
    proposedDecision: proposed,
    coreReasons: (input.judgements ?? []).slice(0, 3),
    nextActions: input.decisionNextStep ? [input.decisionNextStep] : ["形成可验证的下一步动作"],
    validationPlan: "90天验证",
  };
}

export function toDecisionCard(topic: string, draft: ConsensusDraft): DecisionCard {
  return {
    problem: topic,
    consensus: draft.proposedDecision,
    coreReasons: draft.coreReasons.length ? draft.coreReasons : [draft.summary],
    nextSteps: draft.nextActions,
    validationDays: 90,
    owner: "老板",
    status: "validating",
  };
}

export function buildMeetingHref(
  projectId: string,
  topic?: string | null,
  department?: MeetingDepartment,
): string {
  const params = new URLSearchParams();
  if (topic) params.set("topic", topic);
  if (department && department !== "general") params.set("dept", department);
  const q = params.toString();
  return q ? `/projects/${projectId}/advisor?${q}` : `/projects/${projectId}/advisor`;
}

/** @deprecated 请优先用 runDeliberationRound；保留兼容 */
export function buildSeedStatements(input: MeetingSeedInput): ExpertStatement[] {
  const judgements = (input.judgements ?? []).filter(Boolean);
  if (judgements.length === 0 && input.meetingDecision) {
    judgements.push(input.meetingDecision);
  }
  const experts = GENERAL_EXPERTS;

  return experts.slice(0, Math.max(2, Math.min(4, judgements.length || 3))).map((expert, index) => {
    const raw = judgements[index] || judgements[0] || input.challenge || "需要更多事实再下判断。";
    const claim = raw.length > 40 ? `${raw.slice(0, 38)}…` : raw;
    const oppose = /风险|不足|暂缓|未|不够|缺/.test(raw);
    return {
      id: `seed-${expert.roleId}`,
      roleId: expert.roleId,
      displayName: expert.displayName,
      round: 1 as const,
      stance: (oppose ? "oppose" : index % 2 === 0 ? "conditional" : "support") as ExpertStatement["stance"],
      claim,
      reasons: [raw],
    };
  });
}
