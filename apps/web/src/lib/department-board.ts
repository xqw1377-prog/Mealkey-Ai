/**
 * 四部门看板配置 — 前台永远是「部门/专家」，不是 M-XX 产品名
 */
import type { ExpertSeat, MeetingDepartment } from "./meeting";
import { buildMeetingHref } from "./meeting";
import { getExpertsForDepartment, getForceAgent } from "./meeting-deliberation";

export type DepartmentBoardKey = "brand" | "market" | "business" | "org";

export type DepartmentBoardConfig = {
  key: DepartmentBoardKey;
  department: MeetingDepartment;
  label: string;
  title: string;
  subtitle: string;
  meetingCta: string;
  pathSegment: "positioning" | "market" | "business" | "equity";
};

export const DEPARTMENT_BOARDS: Record<DepartmentBoardKey, DepartmentBoardConfig> = {
  brand: {
    key: "brand",
    department: "brand",
    label: "品牌",
    title: "品牌定位",
    subtitle: "在顾客心里，你应该是谁。",
    meetingCta: "决策室谈品牌",
    pathSegment: "positioning",
  },
  market: {
    key: "market",
    department: "market",
    label: "市场",
    title: "市场机会",
    subtitle: "值不值得做，窗口在哪。",
    meetingCta: "决策室谈市场",
    pathSegment: "market",
  },
  business: {
    key: "business",
    department: "business",
    label: "商业",
    title: "商业模式",
    subtitle: "怎么赚钱，先验证什么。",
    meetingCta: "决策室谈生意",
    pathSegment: "business",
  },
  org: {
    key: "org",
    department: "org",
    label: "组织",
    title: "组织与股权",
    subtitle: "谁说了算，怎么激励。",
    meetingCta: "决策室谈组织",
    pathSegment: "equity",
  },
};

export function getDepartmentBoard(key: DepartmentBoardKey): DepartmentBoardConfig {
  return DEPARTMENT_BOARDS[key];
}

export function getDepartmentExperts(key: DepartmentBoardKey): ExpertSeat[] {
  return getExpertsForDepartment(DEPARTMENT_BOARDS[key].department);
}

export function getDepartmentMeetingHref(
  projectId: string,
  key: DepartmentBoardKey,
  topic?: string | null,
  options?: { autoStart?: boolean; autoSend?: boolean },
): string {
  const board = DEPARTMENT_BOARDS[key];
  return buildMeetingHref(projectId, topic || board.title, board.department, {
    // 部门看板默认直接拉起 Founder 会议发起链
    autoStart: options?.autoStart !== false,
    autoSend: options?.autoSend,
  });
}

export function getDepartmentAgentCode(key: DepartmentBoardKey) {
  return getForceAgent(DEPARTMENT_BOARDS[key].department);
}

/** 把内部产品代号换成用户可读部门名 */
export function stripAgentProductNames(text: string): string {
  return text
    .replace(/\bM-PNT\b/g, "品牌")
    .replace(/\bM-MKT\b/g, "市场")
    .replace(/\bM-BIZ\b/g, "商业")
    .replace(/\bM-ED\b/g, "组织")
    .replace(/m-pnt/gi, "品牌")
    .replace(/m-mkt/gi, "市场")
    .replace(/m-biz/gi, "商业")
    .replace(/m-ed/gi, "组织");
}
