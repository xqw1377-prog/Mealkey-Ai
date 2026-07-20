/**
 * M-PNT 矩阵知识库 — 统一导出
 */
export type {
  TheorySource,
  TheoryRule,
  CaseAsset,
  LawCheckResult,
} from "./types";

export { riesRules } from "./ries-rules";
export { troutRules } from "./trout-rules";
export { yeRules } from "./ye-rules";
export { caseAssets } from "./cases";

export {
  allRules,
  allCases,
  KNOWLEDGE_STATS,
  getTheoryKnowledge,
  getRules,
  getCases,
  getCaseByTags,
} from "./loader";

export { matchRulesToText, rulesToLawChecks } from "./apply-rules";
