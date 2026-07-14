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
    label: "品牌定位部",
    title: "品牌定位委员会",
    subtitle: "回答：在用户心智里，你应该成为谁。",
    meetingCta: "进入品牌战略会议",
    pathSegment: "positioning",
  },
  market: {
    key: "market",
    department: "market",
    label: "市场研究部",
    title: "市场机会评估",
    subtitle: "回答：这个市场值不值得做、窗口在哪里。",
    meetingCta: "进入市场分析会",
    pathSegment: "market",
  },
  business: {
    key: "business",
    department: "business",
    label: "商业战略部",
    title: "商业模式评审",
    subtitle: "回答：怎么赚钱、哪里最危险、先验证什么。",
    meetingCta: "进入商业战略会议",
    pathSegment: "business",
  },
  org: {
    key: "org",
    department: "org",
    label: "组织设计部",
    title: "组织与股权设计",
    subtitle: "回答：控制权、激励与治理如何支撑扩张。",
    meetingCta: "进入组织设计会议",
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
  options?: { autoStart?: boolean },
): string {
  const board = DEPARTMENT_BOARDS[key];
  const params = new URLSearchParams();
  params.set("topic", topic || board.title);
  params.set("dept", board.department);
  if (options?.autoStart !== false) {
    // 部门看板默认带 autoStart，进入会议后自动打开会前确认流
    params.set("autoStart", "1");
  }
  return `/projects/${projectId}/advisor?${params.toString()}`;
}

export function getDepartmentAgentCode(key: DepartmentBoardKey) {
  return getForceAgent(DEPARTMENT_BOARDS[key].department);
}

/** 把内部产品代号换成用户可读部门名 */
export function stripAgentProductNames(text: string): string {
  return text
    .replace(/\bM-PNT\b/g, "品牌定位部")
    .replace(/\bM-MKT\b/g, "市场研究部")
    .replace(/\bM-BIZ\b/g, "商业战略部")
    .replace(/\bM-ED\b/g, "组织设计部")
    .replace(/m-pnt/gi, "品牌定位")
    .replace(/m-mkt/gi, "市场研究")
    .replace(/m-biz/gi, "商业模式")
    .replace(/m-ed/gi, "组织股权");
}
