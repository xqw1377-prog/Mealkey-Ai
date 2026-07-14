/**
 * Memory Engine V1 - 6层记忆结构
 * 
 * 六种记忆:
 * 1. User Memory - 用户长期能力
 * 2. Project Memory - 项目状态
 * 3. Decision Memory - 历史判断
 * 4. Preference Memory - 用户偏好
 * 5. Failure Memory - 失败经验
 * 6. Insight Memory - 认知提升
 */

// ─── 记忆层级 ───

export type MemoryLayer =
  | "user"        // 用户长期能力
  | "project"     // 项目状态
  | "decision"    // 历史判断
  | "preference"  // 用户偏好
  | "failure"     // 失败经验
  | "insight";    // 认知提升

// ─── 记忆项 ───

export interface MemoryItem {
  id: string;
  layer: MemoryLayer;
  userId: string;
  projectId?: string;
  
  // 内容
  key: string;
  value: unknown;
  context?: string;
  
  // 评分
  importance: number;    // 0-1
  confidence: number;    // 0-1
  recency: number;       // 0-1 (自动计算)
  
  // 元数据
  source: "user" | "ai" | "system" | "feedback";
  tags: string[];
  
  // 时间
  createdAt: Date;
  updatedAt: Date;
}

// ─── 记忆评分 ───

export interface MemoryScore {
  importance: number;    // 0-1
  confidence: number;    // 0-1
  recency: number;       // 0-1
  weight: number;        // importance × confidence × recency
}

// ─── 记忆上下文（供 Agent 使用）───

export interface MemoryContext {
  // 用户画像
  userProfile: UserProfile;
  
  // 相关记忆
  memories: MemoryItem[];
  
  // 相似决策
  similarDecisions: MemoryItem[];
  
  // 失败经验
  failureLessons: MemoryItem[];
  
  // 认知提升
  insights: MemoryItem[];
  
  // 摘要
  summary: string;
}

// ─── 用户画像 ───

export interface UserProfile {
  userId: string;
  
  // 能力评估
  capabilities: {
    product: number;       // 产品研发 0-100
    operation: number;     // 运营管理
    brand: number;         // 品牌建设
    finance: number;       // 财务思维
    management: number;    // 团队管理
  };
  
  // 偏好
  preferences: {
    investmentStyle: "conservative" | "moderate" | "aggressive";
    riskTolerance: "low" | "medium" | "high";
    expansionGoal: "stable" | "growth" | "aggressive";
  };
  
  // 经验
  experience: {
    years: number;
    domains: string[];     // ["湘菜", "火锅"]
    roles: string[];       // ["厨师", "店长", "老板"]
  };
  
  // 信念
  beliefs: string[];
  
  // 综合分数
  overallScore: number;
}

// ─── 记忆提取器 ───

export interface MemoryExtractor {
  extract(conversation: Conversation): MemoryItem[];
  shouldSave(item: MemoryItem): boolean;
  calculateWeight(item: MemoryItem): MemoryScore;
}

export interface Conversation {
  userId: string;
  projectId?: string;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

// ─── 记忆检索器 ───

export interface MemoryRetriever {
  getForProject(projectId: string): Promise<MemoryContext>;
  getForUser(userId: string): Promise<MemoryContext>;
  search(query: string, limit?: number): Promise<MemoryItem[]>;
  findSimilarDecisions(scenario: string): Promise<MemoryItem[]>;
}

// ─── 记忆存储 ───

export interface MemoryStorage {
  save(item: MemoryItem): Promise<void>;
  get(id: string): Promise<MemoryItem | null>;
  query(filter: MemoryFilter): Promise<MemoryItem[]>;
  update(id: string, updates: Partial<MemoryItem>): Promise<void>;
  delete(id: string): Promise<void>;
}

export interface MemoryFilter {
  userId?: string;
  projectId?: string;
  layer?: MemoryLayer;
  tags?: string[];
  minImportance?: number;
  limit?: number;
  since?: Date;
}
