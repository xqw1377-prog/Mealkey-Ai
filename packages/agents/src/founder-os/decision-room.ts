/**
 * 决策室产品编排 — 重大决策 / 专项会议
 * 封装会议引擎 + 启发式意见，供 Web API 与 UI 消费。
 */

import { FULL_COUNCIL_ROSTER } from "./cdo";
import {
  buildHeuristicOpinions,
  buildStubEvidencePacket,
  buildStubExpertReports,
} from "./heuristic-opinions";
import { getRoleContract } from "./catalog";
import {
  closeCouncilMeeting,
  conveneCouncilMeeting,
  prepareRound1,
  prepareRound2,
  type CouncilMeetingSession,
} from "./meeting-engine";
import type {
  CouncilOpinion,
  CouncilRoleId,
  EvidencePacket,
  ExpertReport,
  IssueLevel,
  RecommendedAction,
} from "./types";
import {
  assertAgendaReady,
  evaluateAgendaReadiness,
  upsertAgendaBrief,
} from "./agenda-brief";
import { buildDecisionTrace, type MKInsight } from "./mk-insight";

export type DecisionRoomMode = "major" | "special";

export const DECISION_ROOM_PRESETS = [
  {
    id: "expand_city",
    label: "要不要进入新城市",
    topic: "我们要不要进入新城市扩张？",
    forceLevel: "L3" as IssueLevel,
  },
  {
    id: "second_store",
    label: "要不要开第二家店",
    topic: "我现在要不要开第二家店？",
    forceLevel: "L2" as IssueLevel,
  },
  {
    id: "fundraising",
    label: "要不要融资",
    topic: "我们现在要不要融资？控股权如何安排？",
    forceLevel: "L4" as IssueLevel,
  },
  {
    id: "franchise",
    label: "要不要加盟扩张",
    topic: "品牌要不要开放加盟？",
    forceLevel: "L3" as IssueLevel,
  },
  {
    id: "rebrand",
    label: "要不要品牌升级/重定位",
    topic: "我们要不要做品牌升级或重定位？",
    forceLevel: "L3" as IssueLevel,
  },
] as const;

const L4_REQUIRED: CouncilRoleId[] = ["CFO", "CRO", "CSO"];

export function listCouncilSeats(): Array<{
  id: CouncilRoleId;
  name: string;
  bias: string;
  mission: string;
}> {
  return FULL_COUNCIL_ROSTER.map((id) => {
    const role = getRoleContract(id);
    return {
      id,
      name: role.role_name,
      bias: role.core_question,
      mission: role.mission,
    };
  });
}

export function validateSpecialRoster(input: {
  roster: CouncilRoleId[];
  level?: IssueLevel;
}): { ok: boolean; errors: string[]; roster: CouncilRoleId[] } {
  const unique = [...new Set(input.roster)];
  const errors: string[] = [];
  if (unique.length < 2) errors.push("专项会议至少邀请 2 位常委");
  if (unique.length > 7) errors.push("最多 7 位常委");
  if (input.level === "L4") {
    for (const r of L4_REQUIRED) {
      if (!unique.includes(r)) {
        errors.push(`L4 生死级议题必须包含 ${r}`);
      }
    }
  }
  return { ok: errors.length === 0, errors, roster: unique };
}

/**
 * 打开决策室：议题识别 + 组会花名册 + Round1 Prompt 就绪
 */
export function openDecisionRoom(input: {
  topic: string;
  mode: DecisionRoomMode;
  whyNow?: string;
  decisionQuestion?: string;
  constraints?: string;
  successLooksLike?: string;
  /** 显式确认可在仅有 stub 报告时开会 */
  allowStubReports?: boolean;
  /** 证据缺口较多时显式确认带着缺口开会 */
  allowGaps?: boolean;
  forceLevel?: IssueLevel;
  /** 专项会自选花名册；重大决策可强制全员 */
  roster?: CouncilRoleId[];
  caseId?: string;
  /** 真实 ExpertReport；缺省则用占位 */
  expertReports?: ExpertReport[];
  /** MKInsight 真源（优先）；无则由 ExpertReport 投影 */
  insights?: MKInsight[];
  evidencePacket?: EvidencePacket;
}): CouncilMeetingSession {
  const brief = upsertAgendaBrief(undefined, {
    topic: input.topic,
    whyNow: input.whyNow || "",
    decisionQuestion: input.decisionQuestion || input.topic,
    constraints: input.constraints || "",
    successLooksLike: input.successLooksLike || "",
  });
  const substanceCount = (input.expertReports || []).filter((r) => {
    if (!r) return false;
    if (/占位/.test(r.headline || "")) return false;
    const text = (r.sections || [])
      .map((s) => s.content || s.title || "")
      .join("");
    if (/占位/.test(text)) return false;
    return text.trim().length >= 40;
  }).length;
  const readiness = evaluateAgendaReadiness({
    brief,
    substanceReportCount: substanceCount,
    allowStub: Boolean(input.allowStubReports),
    evidenceItemCount: input.evidencePacket?.items?.length,
    evidenceGaps: input.evidencePacket?.gaps,
    allowGaps: Boolean(input.allowGaps),
  });
  assertAgendaReady(readiness);

  const forceRoster =
    input.mode === "major"
      ? [...FULL_COUNCIL_ROSTER]
      : input.roster;

  if (input.mode === "special" && forceRoster) {
    const check = validateSpecialRoster({
      roster: forceRoster,
      level: input.forceLevel,
    });
    if (!check.ok) {
      throw new Error(check.errors.join("；"));
    }
  }

  let session = conveneCouncilMeeting({
    topic: input.topic,
    whyNow: input.whyNow,
    forceLevel:
      input.forceLevel ??
      (input.mode === "major" ? "L3" : undefined),
    caseId: input.caseId,
    forceRoster,
  });

  // 重大决策：确保七常委全员（即使分类器裁剪）
  if (input.mode === "major") {
    session = {
      ...session,
      roster: [...FULL_COUNCIL_ROSTER],
      agenda: {
        ...session.agenda,
        roster: [...FULL_COUNCIL_ROSTER],
        conveneCouncil: true,
        founderRequired: true,
        level:
          session.agenda.level === "L1" || session.agenda.level === "L2"
            ? "L3"
            : session.agenda.level,
      },
      phase: "awaiting_experts",
      cdoNote: `${session.cdoNote} | 决策室·重大决策·七常委全员`,
    };
  } else if (forceRoster?.length) {
    session = {
      ...session,
      roster: forceRoster,
      agenda: {
        ...session.agenda,
        roster: forceRoster,
        conveneCouncil: true,
      },
      phase: "awaiting_experts",
      cdoNote: `${session.cdoNote} | 决策室·专项会议·${forceRoster.join(",")}`,
    };
  }

  const stubReports = buildStubExpertReports({
    caseId: session.casePacket.caseId,
    topic: input.topic,
    engines: session.requiredEngines,
  });
  const reports = mergeExpertReports(stubReports, input.expertReports);
  const evidence =
    input.evidencePacket ??
    buildStubEvidencePacket({
      caseId: session.casePacket.caseId,
      engines: session.requiredEngines,
    });

  const realCount = (input.expertReports || []).length;
  const insightCount = (input.insights || []).length;
  if (realCount > 0 || insightCount > 0) {
    session = {
      ...session,
      cdoNote: `${session.cdoNote} | 已挂载 ${realCount} 份 ExpertReport${
        insightCount ? ` · MKInsight×${insightCount}` : ""
      }`,
    };
  }
  if (readiness.summary && /证据/.test(readiness.summary)) {
    session = {
      ...session,
      cdoNote: `${session.cdoNote} | ${readiness.summary}`,
    };
  }

  return prepareRound1(session, reports, evidence, input.insights);
}

/** 真实报告优先，同 engineId 覆盖占位 */
function mergeExpertReports(
  stubs: ExpertReport[],
  real?: ExpertReport[],
): ExpertReport[] {
  if (!real?.length) return stubs;
  const byEngine = new Map<string, ExpertReport>();
  for (const r of stubs) byEngine.set(r.engineId, r);
  for (const r of real) byEngine.set(r.engineId, r);
  return [...byEngine.values()];
}

/** 推进一步：Round1 意见 → Round2 冲突 */
export function advanceDecisionRoomToDebate(
  session: CouncilMeetingSession,
  opinions?: CouncilOpinion[],
): CouncilMeetingSession {
  const resolved =
    opinions && opinions.length > 0
      ? opinions
      : buildHeuristicOpinions({
          roster: session.roster,
          topic: session.agenda.topic,
          evidencePacket: session.evidencePacket,
          expertReports: session.expertReports,
        });
  return prepareRound2(session, resolved);
}

/** 形成决策板（仍可等 Founder） */
export function advanceDecisionRoomToBoard(
  session: CouncilMeetingSession,
): CouncilMeetingSession {
  const opinions =
    session.opinions.length > 0
      ? session.opinions
      : buildHeuristicOpinions({
          roster: session.roster,
          topic: session.agenda.topic,
          evidencePacket: session.evidencePacket,
          expertReports: session.expertReports,
        });

  let next = session;
  if (!session.stanceMatrix || session.conflicts.length === 0) {
    next = prepareRound2(session, opinions);
  }
  return closeCouncilMeeting(next, next.opinions.length ? next.opinions : opinions, {
    founderConfirmed: false,
  });
}

/** Founder 最终裁决 */
export function founderCloseDecisionRoom(
  session: CouncilMeetingSession,
  input: {
    choice: "接受委员会" | "修改方案" | "推翻委员会";
    note?: string;
  },
): CouncilMeetingSession {
  const action: RecommendedAction =
    input.choice === "接受委员会"
      ? session.board?.recommendedAction || "执行"
      : input.choice === "推翻委员会"
        ? "推翻"
        : "暂缓";

  const opinions =
    session.opinions.length > 0
      ? session.opinions
      : buildHeuristicOpinions({
          roster: session.roster,
          topic: session.agenda.topic,
          evidencePacket: session.evidencePacket,
          expertReports: session.expertReports,
        });

  const closed = closeCouncilMeeting(session, opinions, {
    founderConfirmed: true,
    founderAction: action,
    founderOverride:
      input.choice === "接受委员会"
        ? undefined
        : {
            whyDisagree: [
              input.note ||
                (input.choice === "推翻委员会"
                  ? "创始人推翻委员会建议"
                  : "创始人修改方案后推进"),
            ],
            coreJudgment: input.note,
          },
  });

  return {
    ...closed,
    decisionTrace: buildDecisionTrace({
      caseId: closed.casePacket.caseId,
      insights: closed.insights || [],
      opinions: closed.opinions,
      resolution: closed.resolutionDetail,
      outcomeStatus: "pending",
      outcomeNote: input.note,
    }),
  };
}

/** 一键跑通到决策板（冒烟 / 快速路径） */
export function runDecisionRoomToBoard(input: {
  topic: string;
  mode: DecisionRoomMode;
  whyNow?: string;
  decisionQuestion?: string;
  constraints?: string;
  successLooksLike?: string;
  allowStubReports?: boolean;
  roster?: CouncilRoleId[];
  forceLevel?: IssueLevel;
  expertReports?: ExpertReport[];
  insights?: MKInsight[];
  evidencePacket?: EvidencePacket;
}): CouncilMeetingSession {
  let session = openDecisionRoom({
    ...input,
    // 测试/快速路径：未传 Brief 时填齐最小议程，仍须显式允许 stub
    whyNow: input.whyNow || "决策窗口临近，必须本轮拍板",
    decisionQuestion: input.decisionQuestion || input.topic,
    constraints: input.constraints || "资源与风险有上限，不能无限试错",
    successLooksLike:
      input.successLooksLike || "90 天内有可验证结果或明确停损",
    allowStubReports: input.allowStubReports ?? false,
  });
  session = advanceDecisionRoomToDebate(session);
  return advanceDecisionRoomToBoard(session);
}

export function decisionRoomPhaseLabel(
  phase: CouncilMeetingSession["phase"],
): string {
  const map: Record<CouncilMeetingSession["phase"], string> = {
    classified: "议题已识别",
    awaiting_experts: "等待专业输入",
    round1_prompts_ready: "独立陈述就绪",
    round1_matrix_ready: "观点矩阵",
    round2_challenges_ready: "质询碰撞",
    round2_conflicts_ready: "冲突图",
    round3_resolution: "形成决议",
    awaiting_founder: "待创始人裁决",
    closed: "已关闭",
  };
  return map[phase] || phase;
}
