/**
 * DecisionCase.status ↔ MKDecisionStatus
 */
import type { DecisionCaseStatusV1 } from "@/server/founder-layer/contracts/decision-intelligence-data-contract";
import type { MKDecisionStatus } from "@/server/founder-layer/contracts/mk-decision";

export function caseStatusToMkStatus(
  status: DecisionCaseStatusV1,
): MKDecisionStatus {
  switch (status) {
    case "DISCOVERED":
      return "DRAFT";
    case "ANALYZING":
      return "ANALYSIS";
    case "DELIBERATING":
      return "COUNCIL_REVIEW";
    case "DECIDED":
      return "APPROVED";
    case "EXECUTING":
      return "EXECUTING";
    case "LEARNING":
      return "LEARNED";
    default:
      return "DRAFT";
  }
}

export function mkStatusToCaseStatus(
  status: MKDecisionStatus,
): DecisionCaseStatusV1 {
  switch (status) {
    case "DRAFT":
      return "DISCOVERED";
    case "ANALYSIS":
      return "ANALYZING";
    case "COUNCIL_REVIEW":
      return "DELIBERATING";
    case "APPROVED":
      return "DECIDED";
    case "EXECUTING":
    case "VALIDATING":
      return "EXECUTING";
    case "LEARNED":
    case "ARCHIVED":
      return "LEARNING";
    default:
      return "DISCOVERED";
  }
}
