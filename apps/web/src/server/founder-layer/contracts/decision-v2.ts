/**
 * Founder OS Decision Contract V2 — 企业行动协议
 *
 * 注意：席位 Adapter 输出仍为 contracts/decision.ts 的 FounderDecision（席位判断）。
 * 本文件定义的是整场会议收口后的「可执行商业决策」对象。
 */

import type { Claim } from "./claim";
import type { FounderAgentName } from "./mission";

export type DecisionIntent =
  | "ENTER_MARKET"
  | "POSITION_BRAND"
  | "BUILD_MODEL"
  | "RAISE_CAPITAL"
  | "EXPAND"
  | "OPTIMIZE"
  | "STOP";

export type DecisionStatus =
  | "DRAFT"
  | "DEBATING"
  | "READY_FOR_APPROVAL"
  | "VALIDATION_REQUIRED"
  | "APPROVED"
  | "EXECUTING"
  | "VALIDATED"
  | "FAILED"
  | "REVISED";

export type CommitteeId = "market" | "brand" | "business" | "capital";

export type CommitteePosition = "support" | "oppose" | "conditional" | "neutral";

export interface EvidenceRef {
  evidenceId: string;
  role: "supports" | "weakens" | "context";
  excerpt?: string;
}

export interface CommitteeView {
  committee: CommitteeId;
  agent: FounderAgentName;
  claimRefs: string[];
  position: CommitteePosition;
  reason: string;
  evidenceRefs: string[];
}

export interface DecisionRisk {
  riskId: string;
  statement: string;
  severity: "low" | "medium" | "high";
  ownerCommittee?: CommitteeId;
  evidenceRefs?: string[];
  mitigation?: string;
}

export interface DecisionAction {
  actionId: string;
  statement: string;
  owner: string;
  dueInDays?: number;
  dependsOn?: string[];
}

export interface ValidationPlanContract {
  goal: string;
  hypothesis: string;
  metrics: string[];
  period: string;
  successCriteria: string;
  killCriteria?: string;
  /** 关联 Validation OS 任务 ID（若已生成） */
  taskId?: string;
}

export interface DecisionTension {
  topic: string;
  supporters: string[];
  opponents: string[];
  criticalEvidence: string[];
  question?: string;
}

export interface DecisionGateResult {
  ready: boolean;
  status: DecisionStatus;
  reason: string;
  missingEvidenceDomains?: CommitteeId[];
  tensions?: DecisionTension[];
}

/** 董事会一页纸 Decision Memo */
export interface DecisionMemo {
  title: string;
  decision: string;
  whyNow: string;
  tradeoffs: string[];
  conditions: string[];
  validation: string;
  killCriteria: string;
  stopLine: string;
  evidenceIds: string[];
}

/**
 * Decision Contract V2 — 企业行动协议
 * 回答：为什么做 / 做什么 / 何时 / 投入与风险 / 如何验证 / 何时停止
 */
export interface FounderDecisionContract {
  decisionId: string;
  projectId: string;
  missionId: string;

  intent: DecisionIntent;
  /** 支撑决策的 Claim IDs */
  claimRefs: string[];
  /** 可执行决策语句 */
  decision: string;

  evidenceRefs: EvidenceRef[];
  confidence: number;

  claims: Claim[];
  committeeViews: CommitteeView[];
  tensions: DecisionTension[];

  risks: DecisionRisk[];
  actions: DecisionAction[];
  validationPlan: ValidationPlanContract;
  /** 董事会可批一页纸 */
  memo: DecisionMemo;

  status: DecisionStatus;
  gate: DecisionGateResult;

  /** 兼容旧 FinalDecision 字段 */
  problem: string;
  createdAt: string;
  updatedAt: string;
}

export const INTENT_LABEL: Record<DecisionIntent, string> = {
  ENTER_MARKET: "进入市场",
  POSITION_BRAND: "品牌定位",
  BUILD_MODEL: "商业模型",
  RAISE_CAPITAL: "融资",
  EXPAND: "扩张",
  OPTIMIZE: "优化",
  STOP: "停止",
};

export const STATUS_LABEL: Record<DecisionStatus, string> = {
  DRAFT: "草稿",
  DEBATING: "四席讨论中",
  READY_FOR_APPROVAL: "待你确认",
  VALIDATION_REQUIRED: "证据不足，需先验证",
  APPROVED: "已批准",
  EXECUTING: "执行中",
  VALIDATED: "验证成功",
  FAILED: "失败",
  REVISED: "已修订",
};

export const COMMITTEE_LABEL: Record<CommitteeId, string> = {
  market: "市场委员会",
  brand: "品牌委员会",
  business: "商业委员会",
  capital: "资本委员会",
};
