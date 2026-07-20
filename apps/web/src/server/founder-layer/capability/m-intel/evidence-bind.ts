/**
 * Evidence 主体绑定话术 — 商圈+变化+对本店影响
 */
import type { DecisionDataGapV1 } from "@/server/founder-layer/contracts/decision-intel-data";
import { queryMintelRegional, type MintelAnchorInput } from "./anchor-gate";

export type SubjectBoundEvidenceDraft = {
  content: string;
  subjectLabel: string;
  domain: "trade_area" | "competition" | "consumer" | "category";
  canClaimRegional: true;
};

export type SubjectBoundEvidenceGap = {
  canClaimRegional: false;
  reason: string;
  gaps: DecisionDataGapV1;
};

/**
 * 组装主体绑定证据句。无锚点 → 只返回 gap，不编造区域数字。
 */
export function assembleSubjectBoundEvidence(input: MintelAnchorInput & {
  change: string;
  impactOnStore: string;
  domain?: SubjectBoundEvidenceDraft["domain"];
}): SubjectBoundEvidenceDraft | SubjectBoundEvidenceGap {
  const gate = queryMintelRegional(input);
  if (!gate.ok) {
    return {
      canClaimRegional: false,
      reason: gate.reason,
      gaps: gate.gaps,
    };
  }

  const change = (input.change || "").replace(/\s+/g, " ").trim();
  const impact = (input.impactOnStore || "").replace(/\s+/g, " ").trim();
  if (!change || !impact) {
    return {
      canClaimRegional: false,
      reason: "缺少变化描述或对本店影响，无法组装证据",
      gaps: {
        topic: input.topic || "区域市场证据",
        gaps: [
          {
            gapId: "gap_mintel_change",
            question: "你观察到的区域/客群变化是什么？",
            reason: "证据需要「变化」而不只是空话",
          },
        ],
      },
    };
  }

  return {
    canClaimRegional: true,
    subjectLabel: gate.subjectLabel,
    domain: input.domain || "trade_area",
    content: `${gate.subjectLabel}：${change}；对本店影响：${impact}`,
  };
}
