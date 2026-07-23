/**
 * Project OS 类型定义
 * 
 * Project 是所有智能资产的长期载体
 */

// ─── 项目阶段 ───

export type ProjectStage =
  | "idea"          // 想法阶段
  | "positioning"   // 定位阶段
  | "location"      // 选址阶段
  | "setup"         // 筹备阶段
  | "opening"       // 开业阶段
  | "growth"        // 增长阶段
  | "optimization"  // 优化阶段
  | "paused"        // 暂停
  | "closed";       // 关闭

// ─── 项目状态 ───

export type ProjectStatus = "active" | "paused" | "closed";

// ─── 项目基础信息 ───

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  status: ProjectStatus;
  stage: ProjectStage;

  // 基本信息
  city: string | null;
  district: string | null;
  category: string | null;

  // 经营数据
  profile: ProjectProfile | null;

  // 时间
  createdAt: Date;
  updatedAt: Date;
}

// ─── 项目画像 ───

export interface ProjectProfile {
  // 基础
  name?: string;               // 项目名称
  city?: string;               // 城市
  district?: string;           // 区域
  category?: string;           // 品类

  // 物理属性
  area?: number;               // 面积 ㎡
  seats?: number;              // 座位数
  floor?: number;              // 楼层

  // 商业属性
  investment?: number;         // 投资预算（万）
  monthlyRent?: number;        // 月租（万）
  targetRevenue?: number;      // 目标月营收（万）

  // 定位
  priceRange?: string;         // 价格带
  targetCustomers?: string;    // 目标客群
  positioning?: string;        // 品牌定位

  // 风险
  biggestRisk?: string;        // 最大风险
  riskLevel?: "low" | "medium" | "high";

  // 扩展
  [key: string]: unknown;
}

// ─── 决策类型 ───

export type DecisionType =
  | "positioning"    // 定位决策
  | "location"       // 选址决策
  | "investment"     // 投资决策
  | "product"        // 产品决策
  | "pricing"        // 定价决策
  | "marketing"      // 营销决策
  | "expansion"      // 扩张决策
  | "risk";          // 风险决策

// ─── 决策记录 ───

export interface Decision {
  id: string;
  projectId: string;
  type: DecisionType;
  title: string;
  summary: string;
  content: DecisionContent;
  outcome: DecisionOutcome | null;
  learning: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DecisionContent {
  reasoning: string;           // 推理过程
  confidence: number;          // 0-100
  evidence: {
    knowledge: string[];       // 引用的知识规则
    cases: string[];           // 引用的案例
    analysis: string;          // 分析过程
  };
  risks: RiskItem[];
  nextSteps: string[];
}

export interface RiskItem {
  level: "low" | "medium" | "high";
  description: string;
  mitigation?: string;
}

export interface DecisionOutcome {
  status: "success" | "failure" | "partial" | "pending";
  metrics?: Record<string, number>;
  description?: string;
  recordedAt: Date;
}

// ─── 项目记忆 ───

export interface ProjectMemory {
  id: string;
  projectId: string;
  key: string;
  value: unknown;
  source: "user" | "ai" | "system";
  importance: number;          // 0-1
  createdAt: Date;
}

// ─── 报告类型 ───

export type ReportType =
  | "market_analysis"      // 市场分析
  | "feasibility"          // 可行性分析
  | "risk_assessment"      // 风险评估
  | "financial_model"      // 财务模型
  | "brand_strategy"       // 品牌战略
  | "monthly_review"       // 月度复盘
  | "recommendation";      // 建议报告

// ─── 报告 ───

export interface Report {
  id: string;
  projectId: string;
  type: ReportType;
  title: string;
  summary: string | null;
  content: ReportContent;
  createdAt: Date;
}

export interface ReportContent {
  sections: ReportSection[];
  metadata?: Record<string, unknown>;
}

export interface ReportSection {
  title: string;
  content: string;
  data?: Record<string, unknown>;
}

// ─── 时间线事件 ───

export type EventType =
  | "stage_change"     // 阶段变更
  | "decision_made"    // 决策做出
  | "milestone"        // 里程碑
  | "user_action"      // 用户行动
  | "ai_insight"       // AI洞察
  | "report_generated";// 报告生成

export interface TimelineEvent {
  id: string;
  projectId: string;
  type: EventType;
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// ─── 项目上下文（供 Agent 使用）───

export interface ProjectContext {
  project: Project;
  profile: ProjectProfile | null;
  decisions: Decision[];
  memories: ProjectMemory[];
  reports: Report[];
  timeline: TimelineEvent[];
  currentStage: ProjectStage;
  activeGoals: string[];
  pendingActions: string[];
}

// ─── 创建项目输入 ───

export interface CreateProjectInput {
  ownerId: string;
  name: string;
  city?: string;
  district?: string;
  category?: string;
  profile?: ProjectProfile;
}

// ─── 更新项目输入 ───

export interface UpdateProjectInput {
  name?: string;
  stage?: ProjectStage;
  status?: ProjectStatus;
  city?: string;
  district?: string;
  category?: string;
  profile?: Partial<ProjectProfile>;
}

// ─── 存储接口 ───

export interface ProjectStorage {
  // CRUD
  create(input: CreateProjectInput): Promise<Project>;
  get(id: string): Promise<Project | null>;
  update(id: string, input: UpdateProjectInput): Promise<Project>;
  list(ownerId: string): Promise<Project[]>;
  delete(id: string): Promise<void>;

  // 决策
  addDecision(projectId: string, decision: Omit<Decision, "id" | "createdAt" | "updatedAt">): Promise<Decision>;
  getDecisions(projectId: string, type?: DecisionType): Promise<Decision[]>;
  updateDecision(decisionId: string, outcome: DecisionOutcome): Promise<void>;

  // 记忆
  addMemory(projectId: string, memory: Omit<ProjectMemory, "id" | "createdAt">): Promise<ProjectMemory>;
  getMemories(projectId: string): Promise<ProjectMemory[]>;
  getMemoryByKey(projectId: string, key: string): Promise<ProjectMemory | null>;

  // 报告
  addReport(projectId: string, report: Omit<Report, "id" | "createdAt">): Promise<Report>;
  getReports(projectId: string, type?: ReportType): Promise<Report[]>;

  // 时间线
  addEvent(projectId: string, event: Omit<TimelineEvent, "id" | "createdAt">): Promise<TimelineEvent>;
  getTimeline(projectId: string, limit?: number): Promise<TimelineEvent[]>;
}

// ─── 阶段转换规则 ───

export interface StageTransition {
  from: ProjectStage;
  to: ProjectStage;
  condition: string;
  requiredAssets: string[];
}

export const STAGE_TRANSITIONS: StageTransition[] = [
  {
    from: "idea",
    to: "positioning",
    condition: "完成市场验证和定位分析",
    requiredAssets: ["market_analysis", "positioning_decision"]
  },
  {
    from: "positioning",
    to: "location",
    condition: "定位确定，开始选址",
    requiredAssets: ["brand_position", "target_customer"]
  },
  {
    from: "location",
    to: "setup",
    condition: "选址确定，开始筹备",
    requiredAssets: ["location_decision", "lease_signed"]
  },
  {
    from: "setup",
    to: "opening",
    condition: "筹备完成，准备开业",
    requiredAssets: ["team_ready", "menu_finalized"]
  },
  {
    from: "opening",
    to: "growth",
    condition: "开业稳定，开始增长",
    requiredAssets: ["operations_stable", "initial_feedback"]
  },
  {
    from: "growth",
    to: "optimization",
    condition: "增长稳定，开始优化",
    requiredAssets: ["growth_metrics", "expansion_plan"]
  }
];
