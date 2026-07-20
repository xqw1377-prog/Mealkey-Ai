/**
 * Restaurant Brain V1 — Entity Contract（冻结）
 *
 * 核心原则：事实（Fact）与判断（Decision）分离。
 * Brain 不存「答案」，存：是什么 / 发生了什么 / 决定了什么 / 结果 / 学到了什么。
 *
 * 权威：docs/MEALKEY_RESTAURANT_BRAIN_PRISMA_ENTITY_V1.md
 */

export type RestaurantStatus = "active" | "archived" | "paused";

export type RestaurantStage =
  | "idea"
  | "opening"
  | "growth"
  | "mature"
  | "expansion"
  | "unknown";

/** 根实体 — 所有 Brain 数据挂在此下；V1 与 projectId 1:1 */
export type Restaurant = {
  id: string;
  projectId: string;
  ownerId: string;
  name: string;
  status: RestaurantStatus;
  createdAt: string;
  updatedAt: string;
};

/** 事实：这家店是谁 */
export type RestaurantProfile = {
  id?: string;
  restaurantId: string;
  category: string;
  stage: RestaurantStage;
  city?: string;
  storeCount: number;
  priceRange?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
};

/** 事实：品牌认知（M-PNT） */
export type BrandProfile = {
  id?: string;
  restaurantId: string;
  positioning?: string;
  targetCustomer?: string;
  consumptionScene?: string;
  brandPromise?: string;
  competitiveAdvantage?: string;
  brandRisk?: string;
  confidence: number;
  updatedAt?: string;
};

/** 事实：经营数字（M-BIZ） */
export type BusinessProfile = {
  id?: string;
  restaurantId: string;
  monthlyRevenue?: number;
  grossMargin?: number;
  netMargin?: number;
  averageTicket?: number;
  dailyOrders?: number;
  laborRatio?: number;
  rentRatio?: number;
  businessModel?: string;
  updatedAt?: string;
};

/** 事实：经营者能力（非评价店） */
export type CapabilityProfile = {
  id?: string;
  restaurantId: string;
  strategyScore: number;
  marketScore: number;
  productScore: number;
  financeScore: number;
  operationScore: number;
  organizationScore: number;
  overallScore: number;
  confidence: number;
  updatedAt?: string;
};

/** 事实：老板画像 */
export type FounderProfile = {
  id?: string;
  restaurantId: string;
  experience?: string;
  decisionStyle?: string;
  riskPreference?: string;
  strengths?: string[];
  weaknesses?: string[];
  blindSpots?: string[];
  growthTrend?: unknown;
  updatedAt?: string;
};

export type DecisionRecordStatus =
  | "open"
  | "executing"
  | "validated"
  | "archived";

/**
 * 判断记录（不是事实表）
 * 存：问题、当时上下文快照、选择、AI/常委意见、预期、实际、是否已生成学习
 */
export type DecisionRecord = {
  id: string;
  restaurantId: string;
  mkDecisionId?: string;
  type: string;
  question: string;
  context?: Record<string, unknown>;
  options?: string[];
  chosenOption?: string;
  aiAssessment?: unknown;
  councilResult?: unknown;
  expectedOutcome?: unknown;
  actualOutcome?: unknown;
  learningGenerated: boolean;
  status: DecisionRecordStatus;
  createdAt: string;
  updatedAt?: string;
};

/** 执行记录（M-EXEC） */
export type ActionRecord = {
  id: string;
  restaurantId: string;
  decisionId?: string;
  action: string;
  owner?: string;
  deadline?: string;
  status: "pending" | "doing" | "done" | "blocked" | "cancelled";
  result?: unknown;
  createdAt: string;
  updatedAt?: string;
};

/** 学习记录（进化燃料） */
export type LearningRecord = {
  id: string;
  restaurantId: string;
  sourceType: string;
  sourceId?: string;
  pattern: string;
  insight: string;
  confidence: number;
  appliedCount: number;
  createdAt: string;
  updatedAt?: string;
};

/** 进化状态 */
export type EvolutionState = {
  id?: string;
  restaurantId: string;
  understandingScore: number;
  dataCompleteness: number;
  decisionCount: number;
  learningCount: number;
  actionCount: number;
  lastEvolutionAt?: string;
  updatedAt?: string;
};

/** 聚合读模型（Repository 组装） */
export type RestaurantBrainSnapshot = {
  restaurant: Restaurant;
  profile: RestaurantProfile;
  brand: BrandProfile;
  business: BusinessProfile;
  capability: CapabilityProfile;
  founder: FounderProfile;
  recentDecisions: DecisionRecord[];
  recentActions: ActionRecord[];
  recentLearnings: LearningRecord[];
  evolution: EvolutionState;
};

/**
 * Agent 统一出口协议（冻结）
 * Agent 不查库，只拿此结构。
 */
export type AgentRestaurantContext = {
  identity: {
    name: string;
    category: string;
    stage: string;
    storeCount: number;
    city?: string;
  };
  business: {
    revenue?: number;
    margin?: number;
    averageTicket?: number;
  };
  brand: {
    positioning?: string;
    risk?: string;
    targetCustomer?: string;
  };
  capability: {
    scores: {
      strategy: number;
      market: number;
      product: number;
      finance: number;
      operation: number;
      organization: number;
      overall: number;
    };
    confidence: number;
  };
  founder: {
    style?: string;
    riskPreference?: string;
    blindSpots: string[];
  };
  history: {
    recentDecisions: Array<{
      question: string;
      chosen?: string;
      actual?: unknown;
      learningHint?: boolean;
    }>;
  };
  learning: {
    patterns: Array<{ pattern: string; insight: string; confidence: number }>;
  };
  evolution: {
    understandingScore: number;
    dataCompleteness: number;
  };
  /** prompt 短文 */
  priorBlock: string;
  unknowns: string[];
};

// ─── 兼容别名（旧 DNA / Memory 命名 → 新契约）────────────────

/** @deprecated 使用 BrandProfile */
export type BrandDnaFields = BrandProfile;
/** @deprecated 使用 BusinessProfile */
export type BusinessContext = BusinessProfile;
/** @deprecated 使用 LearningRecord */
export type LearningMemory = LearningRecord;
/** @deprecated 使用 ActionRecord */
export type ActionMemory = ActionRecord;

export type DnaLayer =
  | "brand"
  | "business"
  | "market"
  | "organization"
  | "founder";

export type DnaSource =
  | "onboarding"
  | "consulting"
  | "meeting"
  | "decision"
  | "validation"
  | "conversation"
  | "import"
  | "manual"
  | "pos"
  | "platform";
