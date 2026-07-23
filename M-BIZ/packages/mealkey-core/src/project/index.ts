/**
 * Project OS - 餐饮项目操作系统
 * 
 * 所有智能资产的长期载体
 */

// ─── 类型导出 ───

export type {
  Project,
  ProjectStage,
  ProjectStatus,
  ProjectProfile,
  ProjectContext,
  CreateProjectInput,
  UpdateProjectInput,
  Decision,
  DecisionType,
  DecisionContent,
  DecisionOutcome,
  RiskItem,
  ProjectMemory,
  Report,
  ReportType,
  ReportContent,
  ReportSection,
  TimelineEvent,
  EventType,
  ProjectStorage,
  StageTransition,
} from "./types";

// ─── 服务导出 ───

export { ProjectService } from "./service";
export { LifecycleManager, STAGES, TRANSITIONS } from "./lifecycle";
export { ProjectContextBuilder } from "./context";
