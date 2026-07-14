/**
 * Mission 理解 — 用户一句话目标 → 三个问题 + 顾问邀请 → 开会
 */
import { detectDepartmentFromTopic, type MeetingDepartment } from "./meeting";
import { getExpertsForDepartment } from "./meeting-deliberation";
import { buildMeetingHref } from "./meeting";

export type MissionUnderstanding = {
  rawGoal: string;
  understoodGoal: string;
  questions: string[];
  invitedExperts: Array<{ displayName: string; duty: string }>;
  department: MeetingDepartment;
  meetingTitle: string;
  meetingHref: (projectId: string) => string;
};

const DEPARTMENT_TITLE: Record<MeetingDepartment, string> = {
  general: "战略评审会议",
  market: "市场机会评估会",
  brand: "品牌战略会议",
  business: "商业战略会议",
  org: "组织设计会议",
};

export function understandMissionGoal(rawGoal: string): MissionUnderstanding {
  const goal = rawGoal.trim() || "推进当前最重要的经营目标";
  const department = detectDepartmentFromTopic(goal);

  let understoodGoal = goal;
  if (/100|百家|连锁|扩张|加盟|复制/.test(goal)) {
    understoodGoal = goal.includes("店")
      ? goal.replace(/^我想/, "").replace(/^希望/, "") || "打造可复制的连锁品牌"
      : `围绕「${goal}」推进可复制扩张`;
  } else if (/定位|品牌|年轻/.test(goal)) {
    understoodGoal = `校准品牌认知，使「${goal}」可被用户记住`;
  } else if (/市场|城市|开店/.test(goal)) {
    understoodGoal = `判断市场是否支持：${goal}`;
  } else if (/股权|合伙|激励|组织/.test(goal)) {
    understoodGoal = `设计能支撑目标的组织与股权结构：${goal}`;
  } else {
    understoodGoal = `把「${goal}」压成可验证的经营路径`;
  }

  const questions =
    department === "brand"
      ? ["用户现在如何记住你？", "品类与差异是否清晰？", "定位能否支撑增长？"]
      : department === "market"
        ? ["市场窗口是否真实存在？", "竞争密度是否可承受？", "进入方式是否匹配能力？"]
        : department === "org"
          ? ["控制权边界是否清晰？", "关键人才激励是否到位？", "组织能否承接扩张？"]
          : [
              "市场是否支持这个目标？",
              "品牌是否可复制、可记忆？",
              "组织与模型是否准备完成？",
            ];

  // 战略扩张类默认多部门顾问席（用户感知团队，不感知 Agent）
  const multiDept = /100|连锁|扩张|加盟|复制|店/.test(goal);
  const seats = multiDept
    ? [
        ...getExpertsForDepartment("market").slice(0, 1),
        ...getExpertsForDepartment("brand").slice(0, 1),
        ...getExpertsForDepartment("business").slice(0, 1),
        ...getExpertsForDepartment("org").slice(0, 1),
      ]
    : getExpertsForDepartment(department).slice(0, 4);

  const meetingTitle = multiDept ? "扩张战略评估任务" : DEPARTMENT_TITLE[department];
  const topic = multiDept
    ? `是否启动：${understoodGoal.replace(/^打造/, "").replace(/^围绕/, "")}`
    : understoodGoal;

  const missionQuestions = multiDept
    ? [
        "市场机会是否存在？",
        "品牌是否具备扩张基础？",
        "商业模型是否支持？",
        "组织是否承载？",
      ]
    : questions;

  const invitedExperts = multiDept
    ? [
        { displayName: "市场顾问", duty: "分析行业空间" },
        { displayName: "品牌顾问", duty: "分析品牌定位" },
        { displayName: "商业顾问", duty: "分析扩张模型" },
        { displayName: "组织顾问", duty: "分析管理能力" },
      ]
    : seats.map((s) => ({ displayName: s.displayName, duty: s.duty }));

  return {
    rawGoal: goal,
    understoodGoal: multiDept ? `目标：${goal}` : understoodGoal,
    questions: missionQuestions,
    invitedExperts,
    department: multiDept ? "general" : department,
    meetingTitle,
    meetingHref: (projectId: string) => {
      const href = buildMeetingHref(projectId, topic, multiDept ? "general" : department);
      return href.includes("?") ? `${href}&autoStart=1` : `${href}?autoStart=1`;
    },
  };
}
