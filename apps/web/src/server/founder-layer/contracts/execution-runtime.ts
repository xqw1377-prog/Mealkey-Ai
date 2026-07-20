/**
 * M-EXEC Execution Runtime V2 — 契约
 * 非第五顾问席；偏航报告与决策执行读模型。
 */

export type DeviationSeverity = "low" | "medium" | "high";

export type DeviationKind =
  | "metric_miss"
  | "strategy_mismatch"
  | "time_slip"
  | "evidence_invalidated";

export type DeviationCommittee =
  | "brand"
  | "market"
  | "business"
  | "capital"
  | "council";

/** 经营假设偏航（非 DevOps） */
export type DeviationReport = {
  reportId: string;
  projectId: string;
  decisionId: string;
  validationTaskId?: string;
  kind: DeviationKind;
  severity: DeviationSeverity;
  summary: string;
  /** 建议复议议题；不得自行终局改战略 */
  suggestedCouncilTopic: string;
  suggestCommittee?: DeviationCommittee;
  createdAt: string;
};

/** DecisionExecution 读模型 — 由 profile 投影，非平行主表 */
export type DecisionExecutionView = {
  id: string;
  decisionId: string;
  projectId: string;
  objective: string;
  status: "planned" | "running" | "at_risk" | "done" | "validated";
  actions: Array<{
    actionId: string;
    title: string;
    owner?: string;
    status: string;
    dueInDays?: number;
  }>;
  validationTaskIds: string[];
  lastDeviation?: DeviationReport | null;
  suggestedNextMeeting?: { topic: string; reason: string } | null;
};

export type ActionLifecycleStatus = "planned" | "doing" | "done" | "blocked";
