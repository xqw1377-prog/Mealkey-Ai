/**
 * 经营状态机 — 这是 MealKey 从「AI 工具」变为「AI 经营操作系统」的核心。
 *
 * 当前架构：
 *   用户输入 → 识别意图 → 回答 → 结束
 *
 * 目标架构：
 *   用户输入 → 识别信号 → 判定当前经营阶段 → 根据状态机自动决定
 *   下一步该做什么 → 执行完更新状态 → 主动推进到下一阶段
 *
 * 企业不是一堆独立的决策，而是一个从「想法」到「规模化」的生命周期。
 * 每个阶段有必须完成的任务，任务没完成就不能进入下一阶段。
 */

import type { DecisionTypeId, CouncilRoleId, IssueLevel } from "./types";

// ═══════════════════════════════════════════════
// 经营阶段定义
// ═══════════════════════════════════════════════

export type BusinessStage =
  | "IDEA"              // 有想法，尚未验证
  | "POSITIONING"       // 品牌定位阶段
  | "PROTOTYPE"         // 首店/原型验证
  | "STORE_READY"       // 单店模型跑通，可复制
  | "EARLY_EXPANSION"   // 早期扩张（2-5家）
  | "SCALE"             // 规模化（5家以上）
  | "MATURE";           // 成熟经营

export interface StageDefinition {
  id: BusinessStage;
  name: string;
  description: string;
  /** 进入该阶段的前置条件 */
  entryCriteria: string[];
  /** 该阶段必须完成的任务 */
  requiredTasks: StageTask[];
  /** 完成后可进入的下一阶段 */
  nextStages: BusinessStage[];
  /** 该阶段最常见的决策类型 */
  commonDecisions: DecisionTypeId[];
  /** 该阶段默认激活的引擎 */
  activeEngines: string[];
  /** 是否需要常委会 */
  requiresCouncil: boolean;
  /** 默认花名册 */
  defaultRoster?: CouncilRoleId[];
}

export interface StageTask {
  id: string;
  label: string;
  description: string;
  /** 完成该任务需要哪个引擎 */
  requiredEngine?: string;
  /** 是否必须完成才能进入下一阶段 */
  mandatory: boolean;
  /** 预计完成时间 */
  estimatedDuration?: string;
}

export interface StageTransition {
  from: BusinessStage;
  to: BusinessStage;
  /** 为什么应该进入下一阶段（信号） */
  triggerSignals: string[];
  /** 进入下一阶段前必须检查的条件 */
  gates: string[];
}

// ═══════════════════════════════════════════════
// 阶段定义
// ═══════════════════════════════════════════════

export const BUSINESS_STAGES: Record<BusinessStage, StageDefinition> = {
  IDEA: {
    id: "IDEA",
    name: "想法阶段",
    description: "有一个经营想法，但尚未验证市场和可行性",
    entryCriteria: ["创始人有初步的经营想法"],
    requiredTasks: [
      { id: "IDEA-1", label: "明确品类方向", description: "想做什么品类？为什么是这个品类？", mandatory: true },
      { id: "IDEA-2", label: "初步市场判断", description: "这个品类有没有市场机会？", requiredEngine: "M-MKT", mandatory: true },
      { id: "IDEA-3", label: "自我资源评估", description: "创始人能力与资源是否匹配？", mandatory: false },
    ],
    nextStages: ["POSITIONING"],
    commonDecisions: ["new_brand"],
    activeEngines: ["M-MKT", "M-PNT"],
    requiresCouncil: false,
  },
  POSITIONING: {
    id: "POSITIONING",
    name: "品牌定位阶段",
    description: "明确品牌定位、目标客群、差异化策略",
    entryCriteria: ["品类方向已确定", "初步市场判断已完成"],
    requiredTasks: [
      { id: "POS-1", label: "品类深度分析", description: "品类结构、竞争格局、心智空位", requiredEngine: "M-PNT", mandatory: true },
      { id: "POS-2", label: "品牌定位合同", description: "完成定位合同冻结（用户/需求/价值/理由）", requiredEngine: "M-PNT", mandatory: true },
      { id: "POS-3", label: "单位经济测算", description: "预估毛利率、客单价、回本周期", requiredEngine: "M-BIZ", mandatory: true },
      { id: "POS-4", label: "定位常委会审议", description: "七常委审议定位方案", mandatory: true, estimatedDuration: "1次会议" },
    ],
    nextStages: ["PROTOTYPE"],
    commonDecisions: ["new_brand"],
    activeEngines: ["M-PNT", "M-MKT", "M-BIZ"],
    requiresCouncil: true,
    defaultRoster: ["CSO", "CMO", "CBO", "BMO", "CFO"],
  },
  PROTOTYPE: {
    id: "PROTOTYPE",
    name: "首店验证阶段",
    description: "开出第一家店，验证单店模型",
    entryCriteria: ["定位合同已冻结", "单位经济测算通过"],
    requiredTasks: [
      { id: "PROTO-1", label: "选址与签约", description: "完成选址并签约", mandatory: true },
      { id: "PROTO-2", label: "首店运营", description: "开出第一家店并运营", mandatory: true },
      { id: "PROTO-3", label: "单店模型验证", description: "验证实际毛利率、翻台率、客单价与测算一致", requiredEngine: "M-BIZ", mandatory: true, estimatedDuration: "3-6个月" },
      { id: "PROTO-4", label: "SOP建立", description: "关键环节标准化", requiredEngine: "M-BIZ", mandatory: false },
    ],
    nextStages: ["STORE_READY"],
    commonDecisions: ["store_expansion"],
    activeEngines: ["M-BIZ", "M-MKT"],
    requiresCouncil: false,
  },
  STORE_READY: {
    id: "STORE_READY",
    name: "可复制阶段",
    description: "单店模型跑通，具备复制条件",
    entryCriteria: ["首店运营满3个月", "毛利率达预期", "SOP覆盖率80%以上"],
    requiredTasks: [
      { id: "READY-1", label: "单店财务审计", description: "确认单店盈利模型成立", requiredEngine: "M-BIZ", mandatory: true },
      { id: "READY-2", label: "复制路径规划", description: "第二家店选址、资金、团队计划", mandatory: true },
      { id: "READY-3", label: "扩张常委会审议", description: "七常委审议扩张方案", mandatory: true, estimatedDuration: "1次会议" },
    ],
    nextStages: ["EARLY_EXPANSION"],
    commonDecisions: ["store_expansion", "new_city_expansion"],
    activeEngines: ["M-BIZ", "M-MKT"],
    requiresCouncil: true,
    defaultRoster: ["CSO", "CMO", "BMO", "CFO", "COO", "CRO"],
  },
  EARLY_EXPANSION: {
    id: "EARLY_EXPANSION",
    name: "早期扩张阶段",
    description: "2-5家店，验证多店管理模型",
    entryCriteria: ["单店模型确认盈利", "扩张方案经常委会审议通过"],
    requiredTasks: [
      { id: "EXP-1", label: "人才体系搭建", description: "店长培训体系、区经理编制", requiredEngine: "M-BIZ", mandatory: true },
      { id: "EXP-2", label: "供应链建设", description: "确保跨店品质一致", mandatory: true },
      { id: "EXP-3", label: "多店管理模型", description: "验证管理幅度、区域效率", mandatory: false },
      { id: "EXP-4", label: "规模化常委会审议", description: "5家后决定是否进入规模化", mandatory: true, estimatedDuration: "1次会议" },
    ],
    nextStages: ["SCALE"],
    commonDecisions: ["store_expansion", "new_city_expansion"],
    activeEngines: ["M-BIZ", "M-MKT", "M-ED"],
    requiresCouncil: true,
    defaultRoster: ["CSO", "BMO", "CFO", "COO", "CRO"],
  },
  SCALE: {
    id: "SCALE",
    name: "规模化阶段",
    description: "5家以上，系统化运营",
    entryCriteria: ["多店管理模型跑通", "供应链体系稳定", "人才供给机制建立"],
    requiredTasks: [
      { id: "SCALE-1", label: "组织升级", description: "建立总部职能", requiredEngine: "M-ED", mandatory: true },
      { id: "SCALE-2", label: "资本规划", description: "融资/扩张资金计划", requiredEngine: "M-ED", mandatory: true },
      { id: "SCALE-3", label: "品牌管理", description: "多店品牌一致性管理", requiredEngine: "M-PNT", mandatory: false },
    ],
    nextStages: ["MATURE"],
    commonDecisions: ["new_city_expansion", "fundraising", "restructuring"],
    activeEngines: ["M-BIZ", "M-MKT", "M-PNT", "M-ED"],
    requiresCouncil: true,
  },
  MATURE: {
    id: "MATURE",
    name: "成熟经营阶段",
    description: "稳定经营，持续优化",
    entryCriteria: ["门店数量达到规模化", "组织架构完善"],
    requiredTasks: [
      { id: "MATURE-1", label: "持续优化", description: "经营效率持续提升", mandatory: false },
      { id: "MATURE-2", label: "第二曲线", description: "探索新增长方向", mandatory: false },
    ],
    nextStages: [],
    commonDecisions: ["new_brand", "fundraising", "restructuring"],
    activeEngines: ["M-PNT", "M-MKT", "M-BIZ", "M-ED"],
    requiresCouncil: false,
  },
};

// ═══════════════════════════════════════════════
// 阶段转换定义
// ═══════════════════════════════════════════════

export const STAGE_TRANSITIONS: StageTransition[] = [
  {
    from: "IDEA", to: "POSITIONING",
    triggerSignals: ["品类方向已确定", "创始人决定推进"],
    gates: ["品类方向是否明确？", "是否确认值得投入时间精力？"],
  },
  {
    from: "POSITIONING", to: "PROTOTYPE",
    triggerSignals: ["定位合同已冻结", "常委会审议通过"],
    gates: ["定位合同是否已冻结？", "常委会决议是否为支持或条件支持？", "单位经济测算是否通过？"],
  },
  {
    from: "PROTOTYPE", to: "STORE_READY",
    triggerSignals: ["首店运营满3个月", "毛利率持续达标"],
    gates: ["连续3个月是否盈利？", "毛利率是否达到预期？", "SOP覆盖率是否超过80%？"],
  },
  {
    from: "STORE_READY", to: "EARLY_EXPANSION",
    triggerSignals: ["单店模型确认", "扩张方案获批"],
    gates: ["常委会是否批准扩张？", "扩张资金是否到位？", "店长人选是否确定？"],
  },
  {
    from: "EARLY_EXPANSION", to: "SCALE",
    triggerSignals: ["门店数达到5家", "多店管理模型跑通"],
    gates: ["各店盈利模型是否一致？", "供应链是否稳定？", "管理团队是否到位？"],
  },
  {
    from: "SCALE", to: "MATURE",
    triggerSignals: ["门店数达到规模", "组织架构完善"],
    gates: ["是否已建立总部职能？", "品牌管理是否系统化？"],
  },
];

// ═══════════════════════════════════════════════
// 项目状态（每个经营项目有一个）
// ═══════════════════════════════════════════════

export interface BusinessState {
  projectId: string;
  currentStage: BusinessStage;
  completedTasks: string[];           // 已完成的任务ID列表
  completedDecisions: string[];        // 已完成的决策ID列表
  stageEnteredAt: Record<BusinessStage, string | null>;
  lastSignalAt: string;
  /** 从经营信号中提取的事实摘要 */
  contextSummary: string;
  /** 当前待处理的事项 */
  pendingItems: BusinessPendingItem[];
}

export interface BusinessPendingItem {
  id: string;
  type: "task" | "decision" | "engine" | "council" | "data";
  label: string;
  description: string;
  priority: "high" | "medium" | "low";
  /** 关联的任务ID */
  relatedTaskId?: string;
  /** 关联的引擎 */
  relatedEngine?: string;
  /** 是否需要常委会 */
  requiresCouncil?: boolean;
}

// ═══════════════════════════════════════════════
// 状态机核心逻辑
// ═══════════════════════════════════════════════

export function getStageDefinition(stage: BusinessStage): StageDefinition {
  return BUSINESS_STAGES[stage];
}

export function getNextStages(current: BusinessStage): BusinessStage[] {
  return BUSINESS_STAGES[current]?.nextStages ?? [];
}

export function canTransition(
  state: BusinessState,
  targetStage: BusinessStage,
): { ok: boolean; reasons: string[] } {
  const currentDef = BUSINESS_STAGES[state.currentStage];
  const reasons: string[] = [];

  // 目标是否在允许的下一阶段列表中
  if (!currentDef.nextStages.includes(targetStage)) {
    reasons.push(`当前阶段「${currentDef.name}」不能直接进入「${BUSINESS_STAGES[targetStage].name}」`);
    return { ok: false, reasons };
  }

  // 检查前置条件
  const targetDef = BUSINESS_STAGES[targetStage];
  for (const criterion of targetDef.entryCriteria) {
    if (!state.contextSummary.includes(criterion)) {
      reasons.push(`前置条件未满足：${criterion}`);
    }
  }

  // 检查当前阶段必须完成的任务
  for (const task of currentDef.requiredTasks) {
    if (task.mandatory && !state.completedTasks.includes(task.id)) {
      reasons.push(`必须任务未完成：${task.label}（${task.id}）`);
    }
  }

  return { ok: reasons.length === 0, reasons };
}

/**
 * 根据当前状态生成待办事项清单
 * 这是「系统主动推进」的核心——不是等用户问，而是告诉用户下一步该做什么
 */
export function buildPendingItems(state: BusinessState): BusinessPendingItem[] {
  const stage = BUSINESS_STAGES[state.currentStage];
  const items: BusinessPendingItem[] = [];

  // 未完成的必须任务
  for (const task of stage.requiredTasks) {
    if (state.completedTasks.includes(task.id)) continue;
    items.push({
      id: `task-${task.id}`,
      type: task.requiredEngine ? "engine" : "task",
      label: task.label,
      description: task.description,
      priority: task.mandatory ? "high" : "medium",
      relatedTaskId: task.id,
      relatedEngine: task.requiredEngine,
    });
  }

  // 可进入下一阶段的提示
  if (stage.nextStages.length > 0) {
    const allMandatoryDone = stage.requiredTasks
      .filter((t) => t.mandatory)
      .every((t) => state.completedTasks.includes(t.id));
    if (allMandatoryDone) {
      for (const next of stage.nextStages) {
        const nextDef = BUSINESS_STAGES[next];
        items.push({
          id: `transition-${next}`,
          type: "decision",
          label: `进入${nextDef.name}`,
          description: `可以准备进入「${nextDef.name}」。前置条件：${nextDef.entryCriteria.join("、")}`,
          priority: "high",
          requiresCouncil: nextDef.requiresCouncil,
        });
      }
    }
  }

  return items;
}

/**
 * 从经营信号推断当前阶段
 */
export function inferStageFromSignal(signal: string): BusinessStage | null {
  const s = signal.toLowerCase();
  if (/想法|想开|想做|打算|考虑|计划/.test(s)) return "IDEA";
  if (/定位|品牌|品类|客群|差异/.test(s)) return "POSITIONING";
  if (/首店|第一家|开业|选址|装修|菜单/.test(s)) return "PROTOTYPE";
  if (/复制|第二家|扩张|新店|加盟/.test(s)) return "STORE_READY";
  if (/第三家|第四家|第五家|多店|区域/.test(s) || /第[2-9]家/.test(s)) return "EARLY_EXPANSION";
  if (/规模化|系统化|总部|组织|框架/.test(s)) return "SCALE";
  if (/成熟|稳定|持续|第二曲线/.test(s)) return "MATURE";
  return null;
}

/**
 * 创建新的项目状态
 */
export function createBusinessState(projectId: string, initialStage: BusinessStage = "IDEA"): BusinessState {
  const now = new Date().toISOString();
  return {
    projectId,
    currentStage: initialStage,
    completedTasks: [],
    completedDecisions: [],
    stageEnteredAt: {
      IDEA: initialStage === "IDEA" ? now : null,
      POSITIONING: initialStage === "POSITIONING" ? now : null,
      PROTOTYPE: initialStage === "PROTOTYPE" ? now : null,
      STORE_READY: initialStage === "STORE_READY" ? now : null,
      EARLY_EXPANSION: initialStage === "EARLY_EXPANSION" ? now : null,
      SCALE: initialStage === "SCALE" ? now : null,
      MATURE: initialStage === "MATURE" ? now : null,
    },
    lastSignalAt: now,
    contextSummary: "",
    pendingItems: [],
  };
}

/**
 * 标记任务完成并重新计算待办
 */
export function completeTask(state: BusinessState, taskId: string): BusinessState {
  const next: BusinessState = {
    ...state,
    completedTasks: [...new Set([...state.completedTasks, taskId])],
    lastSignalAt: new Date().toISOString(),
    pendingItems: [],
  };
  next.pendingItems = buildPendingItems(next);
  return next;
}

/**
 * 推进到下一阶段（通过门禁检查）
 */
export function advanceStage(
  state: BusinessState,
  targetStage: BusinessStage,
): { state: BusinessState; errors: string[] } {
  const check = canTransition(state, targetStage);
  if (!check.ok) {
    return { state, errors: check.reasons };
  }

  const now = new Date().toISOString();
  const next: BusinessState = {
    ...state,
    currentStage: targetStage,
    stageEnteredAt: { ...state.stageEnteredAt, [targetStage]: now },
    lastSignalAt: now,
    pendingItems: [],
  };
  next.pendingItems = buildPendingItems(next);
  return { state: next, errors: [] };
}

/**
 * 渲染状态机摘要（可注入 prompt）
 */
export function renderBusinessStateSummary(state: BusinessState): string {
  const stage = BUSINESS_STAGES[state.currentStage];
  const items = buildPendingItems(state);

  const lines: string[] = [
    `# 企业经营状态`,
    `当前阶段: ${stage.name}（${stage.description}）`,
    `已完成任务: ${state.completedTasks.length}/${stage.requiredTasks.length}`,
    "",
    "## 待办事项",
  ];

  if (items.length === 0) {
    lines.push("- 当前阶段所有任务已完成，等待进入下一阶段");
  } else {
    for (const item of items.slice(0, 5)) {
      const p = item.priority === "high" ? "🔴" : item.priority === "medium" ? "🟡" : "🟢";
      const council = item.requiresCouncil ? " [需常委会]" : "";
      lines.push(`- ${p} ${item.label}${council}: ${item.description}`);
    }
  }

  lines.push("", "## 可进入的下一阶段");
  for (const next of stage.nextStages) {
    const nextDef = BUSINESS_STAGES[next];
    lines.push(`- ${nextDef.name}: ${nextDef.description}`);
  }

  return lines.join("\n");
}
