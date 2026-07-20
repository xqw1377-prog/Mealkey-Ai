/**
 * Opportunity Runtime Score — O1 纯函数入口（与 contracts 对齐）
 */

export {
  buildOpportunity,
  computeOpportunityScore,
  suggestOpportunityStatusFromScore,
} from "../../contracts/opportunity-runtime";

export type {
  Opportunity,
  OpportunityScoreFactors,
  OpportunitySource,
  OpportunityStatus,
  OpportunitySuggestExpert,
  OpportunityType,
} from "../../contracts/opportunity-runtime";
