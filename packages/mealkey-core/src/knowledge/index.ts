/**
 * Knowledge Engine — 餐饮经营知识引擎
 *
 * 五层架构:
 * 1. FACT — 事实知识库
 * 2. RULE — 经营规则库
 * 3. CASE — 案例库
 * 4. MODEL — 经营模型库
 * 5. EXPERIENCE — 大师经验层
 *
 * 对齐 Protocol 1: KnowledgeContext (rules, cases, models)
 */

// ─── 本地实现（依赖存储接口）───

export { KnowledgeEngine } from "./engine";
export { PrismaKnowledgeStorage } from "./prisma-storage";

// ─── 类型 + 数据（从 @mealkey/knowledge-engine 导入）───

export type {
  KnowledgeCard,
  KnowledgeType,
  KnowledgeQuery,
  KnowledgeSearchResult,
  KnowledgeStorage,
  KnowledgeContent,
  DecisionRule,
  CaseStudy,
  BusinessModel,
  MasterExperience,
  Condition,
} from "@mealkey/knowledge-engine";

export {
  DECISION_RULES,
  matchRules,
  EXTENDED_RULES,
  CASE_STUDIES,
  findSimilarCases,
  findAllSimilarCases,
  ALL_CASES,
  EXTENDED_CASES,
  VOLUME3_CASES,
  MASTER_EXPERIENCES,
  queryMasterWisdom,
  EXTENDED_EXPERIENCES,
  BUSINESS_MODELS,
  findModelsByScenario,
  findModelById,
  EXTENDED_MODELS,
  CATEGORY_PROFILES,
  getCategoryProfile,
  getCategoryBenchmarks,
} from "@mealkey/knowledge-engine";
export type { CategoryProfile } from "@mealkey/knowledge-engine";
