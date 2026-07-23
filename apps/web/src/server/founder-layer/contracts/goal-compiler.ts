/**
 * Goal Compiler V1 契约 — 经营目标编译（Mobile Phase 1）
 * 真源文档：docs/MEALKEY_GOAL_COMPILER_V1.md · MEALKEY_BUSINESS_OBJECT_MODEL_V1.md
 * 禁止：平行 Prisma Decision 大表；Compile 直出 APPROVED。
 */

export const GOAL_COMPILER_VERSION = "v1" as const;

export type CompileTrigger =
  | "utterance"
  | "file"
  | "observe"
  | "continue"
  | "confirm_slot";

export type IntentFamily =
  | "launch_store"
  | "improve_profit"
  | "diagnose_performance"
  | "expand_store"
  | "positioning"
  | "menu_optimize"
  | "other_operating";

export type GoalSlotValue = string | number | boolean | "unknown";

export type GoalStatus =
  | "draft"
  | "active"
  | "blocked"
  | "completed"
  | "abandoned";

export type TaskNodeStatus =
  | "pending"
  | "active"
  | "blocked"
  | "done"
  | "skipped";

export type CompileInputV1 = {
  restaurantRef: string;
  trigger: CompileTrigger;
  utterance?: string;
  fileRefs?: Array<{
    id: string;
    kind: "xlsx" | "csv" | "image" | "pdf" | "doc" | "chat_export" | "other";
    label?: string;
  }>;
  signalId?: string;
  goalId?: string;
  slotPatches?: Record<string, string | number | boolean>;
  locale?: string;
};

export type IntentExtractionV1 = {
  intentFamily: IntentFamily;
  confidence: number;
  rawSummary: string;
  derivedFromFile?: boolean;
  needsClarify: boolean;
};

export type GoalObjectV1 = {
  goalId: string;
  intentRaw: string;
  goalType: IntentFamily;
  title: string;
  successCriteria?: string;
  slots: Record<string, GoalSlotValue>;
  status: GoalStatus;
  progress: number;
  currentStage?: string;
  restaurantRef: string;
  parentGoalId?: string;
  createdAt: string;
  updatedAt: string;
};

export type TaskNodeV1 = {
  id: string;
  title: string;
  purpose: string;
  dependsOn: string[];
  status: TaskNodeStatus;
  capabilityHints: string[];
  decisionRequired: boolean;
  artifactTypes: string[];
};

export type TaskGraphV1 = {
  goalId: string;
  nodes: TaskNodeV1[];
  entryNodeId: string;
};

export type BusinessAssetV1 = {
  assetId: string;
  restaurantRef: string;
  goalId?: string;
  decisionId?: string;
  type:
    | "positioning"
    | "financial_model"
    | "menu_model"
    | "site_model"
    | "plan"
    | "report"
    | "other";
  title: string;
  version: string;
  /** 结构化正文或 markdown */
  body: string;
  status: "draft" | "active" | "superseded" | "archived";
  createdAt: string;
  /** 按内容自动归类（对齐资料中心分类 slug） */
  categorySlug?: string;
  categoryLabel?: string;
};

export type CompileNextActionKind =
  | "ask_slot"
  | "continue_stage"
  | "open_decision_room"
  | "review_artifact";

/** Behavior Engine 五态（交互投影，非新 Runtime） */
export type BehaviorStateV1 =
  | "explore"
  | "diagnose"
  | "plan"
  | "execute"
  | "reflect";

export type ChoicePromptV1 = {
  slot: string;
  prompt: string;
  options: Array<{ label: string; value: string }>;
};

export type FollowUpActionV1 = {
  label: string;
  utterance: string;
};

export type InteractionHintsV1 = {
  behaviorState: BehaviorStateV1;
  behaviorLabel: string;
  choicePrompts: ChoicePromptV1[];
  /** 宪法 P6：能力提升入口（陪练等） */
  followUps?: FollowUpActionV1[];
};

export type CompileOutputV1 = {
  goal: GoalObjectV1;
  taskGraph: TaskGraphV1;
  bossSummary: string;
  artifacts: BusinessAssetV1[];
  pendingDecisions: Array<{
    title: string;
    reason: string;
    candidateId?: string;
  }>;
  questions: Array<{
    slot: string;
    prompt: string;
  }>;
  nextAction: {
    kind: CompileNextActionKind;
    label: string;
  };
  /** 交互宪法 / Behavior Engine 投影 */
  interactionHints?: InteractionHintsV1;
  trace: {
    intentConfidence: number;
    providersUsed: string[];
    degraded: boolean;
    mode: "explore" | "compile" | "continue" | "clarify";
  };
};

/** profile 侧车键 — 单落点，禁平行表 */
export const PROFILE_MOBILE_AGENT_KEY = "mobileAgent" as const;

export type MobileAgentTurnV1 = {
  id: string;
  role: "user" | "assistant";
  text: string;
  createdAt: string;
  artifactIds?: string[];
  /** 按当轮内容自动归类（用于侧栏/知识归档，非 SSOT） */
  categorySlug?: string;
  categoryLabel?: string;
};

export type MobileAgentPendingDecisionV1 = {
  title: string;
  reason: string;
  candidateId?: string;
};

/** Phase 1 种子验证事件名（冻结判据映射） */
export type MobileSeedEventName =
  | "mobile.will_return"
  | "mobile.context_reused"
  | "mobile.asset_produced"
  | "mobile.goal_active"
  | "mobile.memory_signal";

export type MobileAgentSeedEventV1 = {
  name: MobileSeedEventName;
  at: string;
  payload?: Record<string, unknown>;
};

export type MobileAgentSeedMetricsV1 = {
  events: MobileAgentSeedEventV1[];
  compileCount: number;
  assetCount: number;
  returnCount: number;
  lastCompileAt?: string;
};

/** Skill Engine 进行中陪练（profile 侧车，非平行表） */
export type MobileAgentActiveDrillV1 = {
  drillId: string;
  role: "owner" | "manager" | "server" | "chef";
  title: string;
  startedAt: string;
  status: "awaiting_answer" | "completed";
  attemptCount: number;
  lastScore?: number;
  lastLevel?: number;
};

export type MobileAgentStateV1 = {
  version: typeof GOAL_COMPILER_VERSION;
  activeGoal: GoalObjectV1 | null;
  taskGraph: TaskGraphV1 | null;
  assets: BusinessAssetV1[];
  turns: MobileAgentTurnV1[];
  /** 最近一轮待补槽（刷新后仍可追问） */
  pendingQuestions: Array<{ slot: string; prompt: string }>;
  /** 编译产出的决策候选（进决策室，非终局） */
  pendingDecisions: MobileAgentPendingDecisionV1[];
  /** Pattern / focus hints（非聊天 SSOT） */
  memoryHints: {
    focus: string[];
    lastIntent?: IntentFamily;
  };
  /** Phase 1 种子验证侧车（禁平行 Prisma 表） */
  seedMetrics?: MobileAgentSeedMetricsV1;
  /** Skill Engine 陪练会话 */
  activeDrill?: MobileAgentActiveDrillV1 | null;
  /** 最近一轮交互提示（选项追问 / 行为态） */
  interactionHints?: InteractionHintsV1 | null;
  updatedAt: string;
};

export function emptyMobileAgentState(): MobileAgentStateV1 {
  return {
    version: GOAL_COMPILER_VERSION,
    activeGoal: null,
    taskGraph: null,
    assets: [],
    turns: [],
    pendingQuestions: [],
    pendingDecisions: [],
    memoryHints: { focus: [] },
    seedMetrics: {
      events: [],
      compileCount: 0,
      assetCount: 0,
      returnCount: 0,
    },
    activeDrill: null,
    interactionHints: null,
    updatedAt: new Date().toISOString(),
  };
}

export function newGoalId(): string {
  return `goal_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function newAssetId(): string {
  return `asset_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function newTurnId(): string {
  return `turn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
