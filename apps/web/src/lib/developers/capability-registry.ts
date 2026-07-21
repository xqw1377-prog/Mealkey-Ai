/** Capability Registry 投影（上架只能从此选，禁止自由字符串） */
export const CAPABILITY_REGISTRY = [
  {
    category: "经营分析",
    items: [
      { id: "ops.diagnosis.health_check", label: "经营健康检查" },
      { id: "ops.diagnosis.problem_detection", label: "问题识别" },
      { id: "ops.diagnosis.operation_analysis", label: "运营分析" },
      { id: "ops.cost.analysis", label: "成本分析" },
      { id: "ops.efficiency.optimize", label: "效率优化" },
    ],
  },
  {
    category: "营销",
    items: [
      { id: "campaign.optimize", label: "活动优化" },
      { id: "campaign.content", label: "内容营销" },
    ],
  },
  {
    category: "产品",
    items: [
      { id: "menu.analysis", label: "菜品分析" },
      { id: "menu.pricing", label: "菜单定价" },
    ],
  },
  {
    category: "组织",
    items: [
      { id: "hiring.interview", label: "招聘面试" },
      { id: "org.schedule", label: "排班优化" },
    ],
  },
  {
    category: "财务",
    items: [
      { id: "finance.performance.analysis", label: "财务表现分析" },
      { id: "finance.cashflow", label: "现金流观察" },
    ],
  },
  {
    category: "选址",
    items: [{ id: "location.opportunity", label: "区位机会" }],
  },
] as const;

const ALLOWED_IDS: Set<string> = new Set(
  CAPABILITY_REGISTRY.flatMap((g) => g.items.map((i) => i.id)),
);

export function isAllowedCapabilityId(id: string) {
  return ALLOWED_IDS.has(id);
}

export function filterAllowedCapabilityIds(ids: string[]) {
  return [...new Set(ids.filter((id) => ALLOWED_IDS.has(id)))];
}

export const LIFECYCLE_LABEL: Record<string, string> = {
  draft: "开发中",
  connecting: "连接中",
  sandboxing: "Sandbox",
  submitted: "审核中",
  changes_requested: "需修改",
  verified: "已通过",
  published: "已发布",
  suspended: "已停用",
  deprecated: "已下架",
};
