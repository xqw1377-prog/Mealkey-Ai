/**
 * Claim Contract — Evidence → Claim → Decision 中间层
 * Claim = 有证据支撑的专业判断，尚不是可执行企业决策。
 */

export type ClaimDomain =
  | "market"
  | "brand"
  | "business"
  | "capital"
  | "mixed";

export type ClaimStatus = "draft" | "supported" | "contested" | "retired";

export interface Claim {
  claimId: string;
  projectId?: string;
  missionId?: string;
  /** 判断句，例如：长沙存在高端湘菜价格窗口 */
  statement: string;
  domain: ClaimDomain;
  /** 支撑该 Claim 的 Evidence IDs */
  evidenceRefs: string[];
  confidence: number;
  sourceAgent?: "M-MKT" | "M-PNT" | "M-BIZ" | "M-ED" | "CHIEF";
  status: ClaimStatus;
  createdAt: string;
}
