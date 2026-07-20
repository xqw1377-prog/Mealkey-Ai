/**
 * @mealkey/knowledge-engine
 *
 * MealKey 餐饮经营知识引擎 — 五层架构
 *
 * 1. FACT — 事实知识
 * 2. RULE — 经营规则 (50+)
 * 3. CASE — 案例库 (20+)
 * 4. MODEL — 经营模型 (7)
 * 5. EXPERIENCE — 大师经验 (22)
 */

// ─── 存储无关引擎（薄壳）───

export { KnowledgeEngine } from "./engine";
export type { KnowledgeStorageAdapter, KnowledgeEntry, KnowledgeLayer, SearchOptions } from "./engine";

// ─── 类型定义（rich types，供 core 使用）───

export type {
  KnowledgeType,
  KnowledgeCard,
  KnowledgeContent,
  Condition,
  DecisionRule,
  CaseStudy,
  CaseEvent,
  BusinessModel,
  ModelParameter,
  MasterExperience,
  KnowledgeQuery,
  KnowledgeSearchResult,
  KnowledgeStorage,
} from "./types";

// ─── 内置知识数据 ───

export { DECISION_RULES, matchRules } from "./rules";
export { EXTENDED_RULES } from "./rules/extended";

export { CASE_STUDIES, findSimilarCases, findAllSimilarCases, ALL_CASES } from "./cases";
export { EXTENDED_CASES } from "./cases/extended";
export { VOLUME3_CASES } from "./cases/volume-3";

export { MASTER_EXPERIENCES, queryMasterWisdom } from "./master";
export { EXTENDED_EXPERIENCES } from "./master/extended";

export { BUSINESS_MODELS, findModelsByScenario, findModelById } from "./models";
export { EXTENDED_MODELS } from "./models/extended";

// ─── 定位理论蒸馏知识（M-PNT 领域知识）───

export {
  POSITIONING_FACTS,
  POSITIONING_RULES,
  matchPositioningRules,
  POSITIONING_CASES,
  findPositioningCases,
  POSITIONING_MODELS,
  POSITIONING_EXPERIENCES,
  queryPositioningWisdom,
  searchPositioningKnowledge,
} from "./positioning";

// ─── 联网搜索能力（Web Search）───

export {
  WebSearchManager,
  getWebSearch,
  resetWebSearch,
  parseDuckDuckGoHtml,
  parseBingHtml,
} from "./web-search";
export type { WebSearchResult, WebSearchOptions } from "./web-search";

// ─── 品类分析模板 ───

export { CATEGORY_PROFILES, getCategoryProfile, getCategoryBenchmarks } from "./category-profiles";
export type { CategoryProfile } from "./category-profiles";

// ─── 视觉分析（多模态）───

export { VisionAnalyzer, getVisionAnalyzer } from "./vision";
export type { VisionAnalysisResult, OCRAdapter, VisionLLMAdapter } from "./vision";

// ─── M-MKT 市场情报蒸馏知识 ───

export {
  MARKET_INTELLIGENCE_RULES,
  MARKET_ENTRY_CASES,
  searchMarketRules,
  matchMarketRules,
  findMarketCases,
} from "./market-intelligence";

// ─── M-BIZ 商业模式蒸馏知识 ───

export {
  BUSINESS_MODEL_RULES,
  BUSINESS_MODEL_CASES,
  searchBizRules,
  matchBizRules,
  findBizCases,
} from "./business-model";

// ─── M-ED 股权治理蒸馏知识 ───

export {
  EQUITY_GOVERNANCE_RULES,
  EQUITY_GOVERNANCE_CASES,
  searchEquityRules,
  matchEquityRules,
  findEquityCases,
} from "./equity-governance";
