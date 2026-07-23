/**
 * Knowledge Engine 类型定义
 * 
 * 五层架构:
 * 1. Knowledge Base - 事实知识库
 * 2. Rule Engine - 经营规则库
 * 3. Case Engine - 案例库
 * 4. Model Engine - 经营模型库
 * 5. Master Layer - 大师经验层
 */

// ─── 知识类型枚举 ───

export type KnowledgeType = 
  | "FACT"        // 事实
  | "RULE"        // 规则
  | "CASE"        // 案例
  | "MODEL"       // 模型
  | "EXPERIENCE"  // 经验
  | "INSIGHT";    // 洞察

// ─── Knowledge Card 标准格式 ───

export interface KnowledgeCard {
  id: string;
  type: KnowledgeType;
  title: string;
  summary: string;
  content: KnowledgeContent;
  category: string;
  scenario: string[];
  confidence: number;        // 0-1
  source: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeContent {
  // 通用字段
  question?: string;
  answer?: string;
  
  // 规则字段
  conditions?: Condition[];
  judgement?: string;
  recommendation?: string;
  risk?: string;
  
  // 案例字段
  problem?: string;
  solution?: string;
  result?: string;
  lesson?: string;
  
  // 模型字段
  formula?: string;
  inputs?: string[];
  outputs?: string[];
  
  // 经验字段
  scenario?: string;
  wisdom?: string;
  application?: string;
  
  // 扩展
  [key: string]: unknown;
}

// ─── 条件定义 ───

export interface Condition {
  field: string;
  operator: "=" | "!=" | ">" | "<" | ">=" | "<=" | "contains" | "in";
  value: unknown;
  logic?: "AND" | "OR";
}

// ─── Decision Rule ───

export interface DecisionRule {
  id: string;
  scenario: string;
  description: string;
  conditions: Condition[];
  judgement: string;
  risk: "low" | "medium" | "high";
  recommendation: string;
  weight: number;            // 权重 0-1
  exceptions?: string[];     // 例外情况
  source: string;
}

// ─── Case Study ───

export interface CaseStudy {
  id: string;
  title: string;
  industry: string;
  category: string;
  
  // 基本信息
  basics: {
    city?: string;
    area?: number;
    investment?: number;
    category?: string;
  };
  
  // 发展过程
  timeline: CaseEvent[];
  
  // 结果
  outcome: {
    status: "success" | "failure" | "neutral";
    revenue?: number;
    profit?: number;
    duration?: string;
  };
  
  // 经验教训
  lessons: string[];
  
  // 适用场景
  applicableScenarios: string[];
  
  source: string;
  confidence: number;
}

export interface CaseEvent {
  date: string;
  event: string;
  action: string;
  result: string;
}

// ─── Business Model ───

export interface BusinessModel {
  id: string;
  name: string;
  category: string;
  description: string;
  
  // 模型参数
  parameters: ModelParameter[];
  
  // 计算公式
  formula: string;
  
  // 基准值
  benchmarks: Record<string, number>;
  
  // 适用场景
  applicableScenarios: string[];
  
  source: string;
}

export interface ModelParameter {
  name: string;
  description: string;
  unit: string;
  defaultValue?: number;
  range?: [number, number];
}

// ─── Master Experience ───

export interface MasterExperience {
  id: string;
  topic: string;
  question: string;
  
  // 大师判断
  wisdom: string;
  
  // 适用场景
  scenario: string;
  
  // 判断依据
  reasoning: string;
  
  // 风险提示
  risks: string[];
  
  // 应用建议
  application: string;
  
  // 来源
  master: string;  // 大师来源
  source: string;
  confidence: number;
}

// ─── 查询接口 ───

export interface KnowledgeQuery {
  query: string;
  type?: KnowledgeType;
  category?: string;
  scenario?: string;
  limit?: number;
  minConfidence?: number;
}

export interface KnowledgeSearchResult {
  card: KnowledgeCard;
  relevance: number;
  matchedFields: string[];
}

// ─── 存储接口 ───

export interface KnowledgeStorage {
  // 基础操作
  save(card: KnowledgeCard): Promise<void>;
  get(id: string): Promise<KnowledgeCard | null>;
  update(id: string, updates: Partial<KnowledgeCard>): Promise<void>;
  delete(id: string): Promise<void>;
  
  // 查询
  search(query: KnowledgeQuery): Promise<KnowledgeSearchResult[]>;
  listByType(type: KnowledgeType, limit?: number): Promise<KnowledgeCard[]>;
  listByCategory(category: string, limit?: number): Promise<KnowledgeCard[]>;
  
  // 规则专用
  findMatchingRules(facts: Record<string, unknown>): Promise<DecisionRule[]>;
  
  // 案例专用
  findSimilarCases(context: Record<string, unknown>): Promise<CaseStudy[]>;
}
