/**
 * Project Lifecycle Manager - 项目生命周期管理
 * 
 * 管理项目阶段转换和状态变化
 */

import type {
  Project,
  ProjectStage,
  ProjectStatus,
  StageTransition,
  Decision,
} from "./types";

// ─── 阶段定义 ───

export const STAGES: Record<ProjectStage, {
  name: string;
  description: string;
  keyActivities: string[];
  requiredCapabilities: string[];
}> = {
  idea: {
    name: "想法阶段",
    description: "初步想法形成，需要验证可行性",
    keyActivities: ["市场调研", "竞争分析", "初步定位"],
    requiredCapabilities: ["market_analysis", "cognition_diagnosis"],
  },
  positioning: {
    name: "定位阶段",
    description: "确定品牌定位、目标客群、价值主张",
    keyActivities: ["品牌定位", "客群分析", "差异化设计"],
    requiredCapabilities: ["brand_positioning", "consumer_insight"],
  },
  location: {
    name: "选址阶段",
    description: "寻找合适位置，评估商圈价值",
    keyActivities: ["商圈分析", "人流评估", "租金谈判"],
    requiredCapabilities: ["market_analysis", "investment_risk"],
  },
  setup: {
    name: "筹备阶段",
    description: "装修、招聘、供应链搭建",
    keyActivities: ["装修设计", "团队组建", "供应链搭建"],
    requiredCapabilities: ["investment_risk"],
  },
  opening: {
    name: "开业阶段",
    description: "试营业、正式开业、初期运营",
    keyActivities: ["试营业", "营销推广", "流程优化"],
    requiredCapabilities: ["market_analysis"],
  },
  growth: {
    name: "增长阶段",
    description: "稳定运营，寻找增长机会",
    keyActivities: ["客户运营", "产品迭代", "品牌建设"],
    requiredCapabilities: ["brand_positioning", "market_analysis"],
  },
  optimization: {
    name: "优化阶段",
    description: "持续优化，提升效率",
    keyActivities: ["成本优化", "流程标准化", "扩张准备"],
    requiredCapabilities: ["investment_risk"],
  },
  paused: {
    name: "暂停",
    description: "项目暂停",
    keyActivities: [],
    requiredCapabilities: [],
  },
  closed: {
    name: "关闭",
    description: "项目已关闭",
    keyActivities: [],
    requiredCapabilities: [],
  },
};

// ─── 阶段转换规则 ───

export const TRANSITIONS: StageTransition[] = [
  {
    from: "idea",
    to: "positioning",
    condition: "完成市场验证和定位分析",
    requiredAssets: ["market_analysis", "positioning_decision"],
  },
  {
    from: "positioning",
    to: "location",
    condition: "定位确定，开始选址",
    requiredAssets: ["brand_position", "target_customer"],
  },
  {
    from: "location",
    to: "setup",
    condition: "选址确定，开始筹备",
    requiredAssets: ["location_decision"],
  },
  {
    from: "setup",
    to: "opening",
    condition: "筹备完成，准备开业",
    requiredAssets: ["team_ready"],
  },
  {
    from: "opening",
    to: "growth",
    condition: "开业稳定，开始增长",
    requiredAssets: ["operations_stable"],
  },
  {
    from: "growth",
    to: "optimization",
    condition: "增长稳定，开始优化",
    requiredAssets: ["growth_metrics"],
  },
  // 允许暂停
  { from: "idea", to: "paused", condition: "用户暂停", requiredAssets: [] },
  { from: "positioning", to: "paused", condition: "用户暂停", requiredAssets: [] },
  { from: "location", to: "paused", condition: "用户暂停", requiredAssets: [] },
  { from: "setup", to: "paused", condition: "用户暂停", requiredAssets: [] },
  { from: "opening", to: "paused", condition: "用户暂停", requiredAssets: [] },
  { from: "growth", to: "paused", condition: "用户暂停", requiredAssets: [] },
  // 允许从暂停恢复
  { from: "paused", to: "idea", condition: "恢复项目", requiredAssets: [] },
  { from: "paused", to: "positioning", condition: "恢复项目", requiredAssets: [] },
  { from: "paused", to: "location", condition: "恢复项目", requiredAssets: [] },
  { from: "paused", to: "setup", condition: "恢复项目", requiredAssets: [] },
  { from: "paused", to: "opening", condition: "恢复项目", requiredAssets: [] },
  { from: "paused", to: "growth", condition: "恢复项目", requiredAssets: [] },
  // 允许关闭
  { from: "idea", to: "closed", condition: "关闭项目", requiredAssets: [] },
  { from: "positioning", to: "closed", condition: "关闭项目", requiredAssets: [] },
  { from: "location", to: "closed", condition: "关闭项目", requiredAssets: [] },
  { from: "setup", to: "closed", condition: "关闭项目", requiredAssets: [] },
  { from: "opening", to: "closed", condition: "关闭项目", requiredAssets: [] },
  { from: "growth", to: "closed", condition: "关闭项目", requiredAssets: [] },
  { from: "optimization", to: "closed", condition: "关闭项目", requiredAssets: [] },
];

// ─── Lifecycle Manager ───

export class LifecycleManager {
  /**
   * 获取阶段信息
   */
  getStageInfo(stage: ProjectStage) {
    return STAGES[stage];
  }

  /**
   * 获取所有阶段
   */
  getAllStages() {
    return STAGES;
  }

  /**
   * 验证阶段转换是否合法
   */
  canTransition(from: ProjectStage, to: ProjectStage): boolean {
    return TRANSITIONS.some(t => t.from === from && t.to === to);
  }

  /**
   * 获取转换规则
   */
  getTransition(from: ProjectStage, to: ProjectStage): StageTransition | undefined {
    return TRANSITIONS.find(t => t.from === from && t.to === to);
  }

  /**
   * 获取下一个可能的阶段
   */
  getNextStages(current: ProjectStage): ProjectStage[] {
    return TRANSITIONS
      .filter(t => t.from === current)
      .map(t => t.to);
  }

  /**
   * 检查是否满足转换条件
   */
  checkTransitionRequirements(
    from: ProjectStage,
    to: ProjectStage,
    decisions: Decision[]
  ): {
    canTransition: boolean;
    missingAssets: string[];
    transition: StageTransition | undefined;
  } {
    const transition = this.getTransition(from, to);
    if (!transition) {
      return { canTransition: false, missingAssets: [], transition: undefined };
    }

    // 检查必需资产
    const missingAssets = transition.requiredAssets.filter(asset =>
      !decisions.some(d =>
        d.type === asset ||
        d.title.toLowerCase().includes(asset.toLowerCase())
      )
    );

    return {
      canTransition: missingAssets.length === 0,
      missingAssets,
      transition,
    };
  }

  /**
   * 获取项目进度
   */
  getProgress(stage: ProjectStage): {
    current: number;
    total: number;
    percentage: number;
  } {
    const stageOrder: ProjectStage[] = [
      "idea", "positioning", "location", "setup", "opening", "growth", "optimization"
    ];

    const currentIndex = stageOrder.indexOf(stage);
    if (currentIndex === -1) {
      return { current: 0, total: stageOrder.length, percentage: 0 };
    }

    return {
      current: currentIndex + 1,
      total: stageOrder.length,
      percentage: Math.round(((currentIndex + 1) / stageOrder.length) * 100),
    };
  }

  /**
   * 生成阶段建议
   */
  getStageRecommendations(stage: ProjectStage): string[] {
    const stageInfo = STAGES[stage];
    return stageInfo.keyActivities;
  }
}
