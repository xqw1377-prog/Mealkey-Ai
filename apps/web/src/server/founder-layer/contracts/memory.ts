/**
 * Founder OS Memory Engine V1 — 契约
 * 资产：企业事实 / 决策历史 / 成败模式 / 老板偏好 / 行业认知摘要
 * 目标：写得进去、读得出来、下一次判断能用
 */

/** 四层模型（Memory Runtime V1） */
export type MemoryLayer = "FOUNDER" | "COMPANY" | "PROJECT" | "INDUSTRY";

/** 写入价值分级：0 不存 · 1 事实 · 2 判断 · 3 规律（须复现） */
export type MemoryValueLevel = 0 | 1 | 2 | 3;

export type FounderMemoryWriteType =
  | "fact"
  | "decision"
  | "preference"
  | "meeting"
  | "learning";

export type FounderMemoryDomain =
  | "brand"
  | "market"
  | "business"
  | "organization"
  | "mixed";

export type FounderMemorySource =
  | "company_context"
  | "agent_decision"
  | "meeting_engine"
  | "decision_engine"
  | "user_feedback"
  | "validation_os"
  | "growth_engine";

export interface FounderMemoryWrite {
  writeId: string;
  projectId: string;
  missionId?: string;
  type: FounderMemoryWriteType;
  domain?: FounderMemoryDomain;
  summary: string;
  payload: Record<string, unknown>;
  source: FounderMemorySource;
  createdAt: string;
  /** M1：四层记忆；持久化时亦写入 payload.memoryLayer */
  memoryLayer?: MemoryLayer;
  /** M1：价值分级；0 不应 persist */
  valueLevel?: MemoryValueLevel;
}

export type {
  FounderMemorySnapshot,
  MemoryFact,
  MemoryDecisionSummary,
  MemoryPreference,
  MemoryPattern,
} from "./mission";
