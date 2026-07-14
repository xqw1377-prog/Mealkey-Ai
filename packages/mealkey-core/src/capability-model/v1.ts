import type {
  BusinessCapabilityDefinition,
  BusinessCapabilityId,
  BusinessCapabilityScorecardItem,
  RawBusinessCapabilityInput,
} from "./types";

const DEFAULT_SCORES: Record<BusinessCapabilityId, number> = {
  strategy: 72,
  product: 78,
  operation: 66,
  growth: 60,
  management: 64,
};

export const BUSINESS_CAPABILITY_GROWTH_LOOP_V1 = [
  "发现能力",
  "理解能力",
  "训练能力",
  "应用能力",
  "验证能力",
  "增强能力",
] as const;

export const BUSINESS_CAPABILITY_MODEL_V1: BusinessCapabilityDefinition[] = [
  {
    id: "strategy",
    label: "战略能力",
    summary: "决定方向是否正确，判断商业模式、市场机会与品牌定位是否成立。",
    aliases: [
      "战略能力",
      "战略思考",
      "战略判断",
      "市场洞察",
      "用户洞察",
      "商业模式判断",
      "品牌定位",
    ],
    subCapabilities: [
      { id: "business-model", label: "商业模式判断", summary: "识别模型是否能成立、能否持续赚钱。" },
      { id: "market-insight", label: "市场洞察", summary: "看清市场变化、需求趋势与机会窗口。" },
      { id: "brand-positioning", label: "品牌定位", summary: "确定为何被选择，以及在用户心智中的位置。" },
    ],
  },
  {
    id: "product",
    label: "产品能力",
    summary: "决定产品是否有竞争力，是否能形成结构、爆品与用户价值。",
    aliases: [
      "产品能力",
      "产品理解",
      "产品设计",
      "菜单结构",
      "爆品打造",
      "菜品能力",
    ],
    subCapabilities: [
      { id: "product-design", label: "产品设计", summary: "定义产品结构、定位与用户价值。" },
      { id: "menu-architecture", label: "菜单结构", summary: "把产品组织成可售卖、可复购的菜单系统。" },
      { id: "hero-product", label: "爆品打造", summary: "识别并打造能够拉动增长的核心产品。" },
    ],
  },
  {
    id: "operation",
    label: "运营能力",
    summary: "决定门店是否跑得稳、跑得久，关注效率、服务与人效。",
    aliases: [
      "运营能力",
      "门店运营",
      "执行能力",
      "效率管理",
      "服务体系",
      "人效管理",
    ],
    subCapabilities: [
      { id: "store-efficiency", label: "门店效率", summary: "提升出品、流程与现场运转效率。" },
      { id: "service-system", label: "服务体系", summary: "建立稳定的服务体验与交付标准。" },
      { id: "labor-efficiency", label: "人效管理", summary: "让人力配置与经营产出形成更优匹配。" },
    ],
  },
  {
    id: "growth",
    label: "增长能力",
    summary: "决定用户如何被获取、被理解、被留住，形成可持续增长。",
    aliases: [
      "增长能力",
      "品牌能力",
      "品牌构建",
      "营销传播",
      "用户增长",
      "复购设计",
      "价值表达能力",
    ],
    subCapabilities: [
      { id: "user-growth", label: "用户增长", summary: "找到更有效的获客路径与增长节奏。" },
      { id: "marketing", label: "营销传播", summary: "把价值表达成用户能理解、能传播的内容。" },
      { id: "retention", label: "复购设计", summary: "把一次消费转成持续复购与长期关系。" },
    ],
  },
  {
    id: "management",
    label: "管理能力",
    summary: "决定组织是否能承接增长，关注团队、协同与财务控制。",
    aliases: [
      "管理能力",
      "经营管理",
      "团队建设",
      "组织能力",
      "财务管理",
      "财务意识",
      "财务能力",
      "领导力",
      "风险控制",
    ],
    subCapabilities: [
      { id: "team-building", label: "团队建设", summary: "建立稳定团队与关键角色配置。" },
      { id: "organization", label: "组织能力", summary: "让协同、分工与制度开始稳定运行。" },
      { id: "finance", label: "财务管理", summary: "控制现金流、投入节奏与经营回报。" },
    ],
  },
];

const CAPABILITY_BY_ID = new Map(
  BUSINESS_CAPABILITY_MODEL_V1.map((item) => [item.id, item] as const),
);

const CAPABILITY_ALIAS_MAP = new Map<string, BusinessCapabilityId>();

for (const capability of BUSINESS_CAPABILITY_MODEL_V1) {
  CAPABILITY_ALIAS_MAP.set(normalizeKey(capability.id), capability.id);
  CAPABILITY_ALIAS_MAP.set(normalizeKey(capability.label), capability.id);
  for (const alias of capability.aliases) {
    CAPABILITY_ALIAS_MAP.set(normalizeKey(alias), capability.id);
  }
  for (const subCapability of capability.subCapabilities) {
    CAPABILITY_ALIAS_MAP.set(normalizeKey(subCapability.label), capability.id);
    CAPABILITY_ALIAS_MAP.set(normalizeKey(subCapability.id), capability.id);
  }
}

function normalizeKey(value: string): string {
  return value.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function clampScore(value: number): number {
  return Math.max(20, Math.min(100, Math.round(value)));
}

export function normalizeBusinessCapabilityId(value?: string | null): BusinessCapabilityId | null {
  if (!value) return null;
  return CAPABILITY_ALIAS_MAP.get(normalizeKey(value)) ?? null;
}

export function getBusinessCapabilityDefinition(id: BusinessCapabilityId): BusinessCapabilityDefinition {
  return CAPABILITY_BY_ID.get(id) ?? BUSINESS_CAPABILITY_MODEL_V1[0];
}

export function getBusinessCapabilityModelV1(): BusinessCapabilityDefinition[] {
  return BUSINESS_CAPABILITY_MODEL_V1;
}

export function createDefaultBusinessCapabilityScorecard(): BusinessCapabilityScorecardItem[] {
  return BUSINESS_CAPABILITY_MODEL_V1.map((capability) => ({
    id: capability.id,
    label: capability.label,
    value: DEFAULT_SCORES[capability.id],
    source: "default",
  }));
}

export function buildBusinessCapabilityScorecard(
  rawInputs: RawBusinessCapabilityInput[],
  sourceOverride?: BusinessCapabilityScorecardItem["source"],
): BusinessCapabilityScorecardItem[] {
  const accumulator = new Map<BusinessCapabilityId, number[]>();
  const sourceMap = new Map<BusinessCapabilityId, BusinessCapabilityScorecardItem["source"]>();

  for (const rawInput of rawInputs) {
    const capabilityId =
      normalizeBusinessCapabilityId(rawInput.name) ?? normalizeBusinessCapabilityId(rawInput.category);
    if (!capabilityId || typeof rawInput.score !== "number" || Number.isNaN(rawInput.score)) {
      continue;
    }

    const current = accumulator.get(capabilityId) ?? [];
    current.push(clampScore(rawInput.score));
    accumulator.set(capabilityId, current);
    sourceMap.set(capabilityId, sourceOverride ?? "owner_capability");
  }

  return BUSINESS_CAPABILITY_MODEL_V1.map((capability) => {
    const values = accumulator.get(capability.id) ?? [];
    const value =
      values.length > 0
        ? Math.round(values.reduce((sum, item) => sum + item, 0) / values.length)
        : DEFAULT_SCORES[capability.id];

    return {
      id: capability.id,
      label: capability.label,
      value,
      source: sourceMap.get(capability.id) ?? "default",
    };
  });
}
