/**
 * 场景会话入口：经营场景 → Issue/Agenda → 可接会议引擎
 */

import { classifyDecisionIssue, type DecisionIssue } from "../issue-classifier";
import { conveneCouncilMeeting, type CouncilMeetingSession } from "../meeting-engine";
import type { IssueLevel } from "../types";
import {
  classifyOperatingScenario,
  getScenario,
  planScenarioRun,
  type OperatingScenarioId,
  type ScenarioPlan,
} from "./catalog";

export interface ScenarioSession {
  scenarioId: OperatingScenarioId;
  plan: ScenarioPlan;
  issue: DecisionIssue;
  meeting?: CouncilMeetingSession;
  intakeTemplate: Record<string, string>;
  nextSteps: string[];
}

const INTAKE: Record<OperatingScenarioId, Record<string, string>> = {
  startup_launch: {
    concept: "品牌概念",
    city: "城市",
    investment: "投资额",
    ambition: "目标（如3年100店）",
  },
  expansion: {
    revenue: "营业额",
    gross_margin: "毛利",
    repurchase: "复购",
    reviews: "评价",
    labor: "人工",
    rent: "租金",
  },
  brand_upgrade: {
    current_perception: "当前认知",
    competitors: "竞争位置",
    ambition: "心智目标",
  },
  new_product: {
    product: "新品描述",
    price: "拟售价",
    margin: "目标毛利",
    region: "测试区域",
  },
  ops_anomaly: {
    signal: "异常信号",
    store: "门店",
    since: "起止时间",
  },
  fundraising_equity: {
    amount: "融资金额",
    equity_pct: "出让比例",
    investor: "投资人画像",
  },
};

/**
 * 打开经营场景：分类 → 计划 →（可选）直接召集会议
 */
export function openScenarioSession(input: {
  question: string;
  scenarioId?: OperatingScenarioId;
  escalateCouncil?: boolean;
  conveneNow?: boolean;
  forceLevel?: IssueLevel;
  signals?: string[];
}): ScenarioSession {
  const classified = input.scenarioId
    ? {
        scenarioId: input.scenarioId,
        why: [`显式指定场景 ${input.scenarioId}`],
      }
    : classifyOperatingScenario({
        question: input.question,
        signals: input.signals,
      });

  const plan = planScenarioRun(classified.scenarioId, {
    escalateCouncil: input.escalateCouncil,
  });

  const issue = classifyDecisionIssue({
    question: input.question,
    forceLevel: input.forceLevel ?? plan.level,
  });

  // 场景覆盖引擎与级别
  issue.relatedAgents = plan.engines;
  issue.importance = plan.level;
  issue.councilLevel = plan.level;
  issue.decisionType = plan.scenario.decision_type;
  if (plan.roster.length) issue.suggestedRoster = plan.roster;
  issue.whyClassified = [
    ...classified.why,
    ...plan.why,
    ...issue.whyClassified,
  ];

  let meeting: CouncilMeetingSession | undefined;
  if (input.conveneNow !== false && plan.conveneCouncil) {
    meeting = conveneCouncilMeeting({
      topic: input.question,
      forceLevel: plan.level,
      whyNow: `经营场景：${plan.scenario.name}`,
    });
    // 用场景计划覆盖花名册与引擎
    meeting = {
      ...meeting,
      roster: plan.roster,
      requiredEngines: plan.engines,
      agenda: {
        ...meeting.agenda,
        level: plan.level,
        roster: plan.roster,
        requiredEngines: plan.engines,
        decisionType: plan.scenario.decision_type,
        conveneCouncil: true,
        founderRequired: plan.founderRequired,
      },
      casePacket: {
        ...meeting.casePacket,
        decisionType: plan.scenario.decision_type,
        requiredAgents: plan.engines,
      },
      cdoNote: `${meeting.cdoNote} | 场景 ${plan.scenario.id} · ${plan.councilName}`,
    };
  }

  const scenario = getScenario(classified.scenarioId);
  const nextSteps = [
    `收集立项/输入字段：${Object.keys(INTAKE[classified.scenarioId]).join("、")}`,
    `调度 Expert Engines：${plan.engines.join(", ")}`,
    plan.conveneCouncil
      ? `组织 ${plan.councilName}（${plan.level}）`
      : "先出专业报告，必要时 escalateCouncil",
    plan.founderRequired ? "提交 Founder Decision Board" : "决议后进入验证",
  ];

  return {
    scenarioId: classified.scenarioId,
    plan,
    issue,
    meeting,
    intakeTemplate: INTAKE[classified.scenarioId],
    nextSteps: [
      ...nextSteps,
      scenario.resolution_hint
        ? `决议形态：${scenario.resolution_hint}`
        : "",
    ].filter(Boolean),
  };
}
