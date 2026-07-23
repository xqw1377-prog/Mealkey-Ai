/**
 * 餐饮经营规则库
 *
 * 30年经验数字化 — 50+ 条经营规则
 * 覆盖：创业风险、投资、选址、品类、产品、成本、增长、运营、品牌、团队
 */

import type { DecisionRule } from "../types";

export const DECISION_RULES: DecisionRule[] = [
  // ═══════════════════════════════════════════
  // 创业风险规则 (0001-0009)
  // ═══════════════════════════════════════════
  {
    id: "MK-RULE-0001",
    scenario: "首次创业",
    description: "首次创业高投入风险规则",
    conditions: [
      { field: "experience_years", operator: "<", value: 3 },
      { field: "investment", operator: ">", value: 3000000 },
    ],
    judgement: "首次创业+高投入=高风险",
    risk: "high",
    recommendation: "降低投入至150万以内，先验证模型",
    weight: 0.9,
    source: "30年经营经验",
  },
  {
    id: "MK-RULE-0002",
    scenario: "首次创业",
    description: "首次创业无品牌风险",
    conditions: [
      { field: "experience_years", operator: "<", value: 3 },
      { field: "brand_power", operator: "=", value: "low" },
    ],
    judgement: "没有品牌能力的首次创业需要更长时间建立认知",
    risk: "medium",
    recommendation: "选择社区型、复购型品类，降低获客难度",
    weight: 0.8,
    source: "30年经营经验",
  },
  {
    id: "MK-RULE-0003",
    scenario: "首次创业",
    description: "合伙创业分歧风险",
    conditions: [
      { field: "partner_count", operator: ">", value: 2 },
      { field: "has_agreement", operator: "=", value: false },
    ],
    judgement: "多人合伙无书面协议=定时炸弹",
    risk: "high",
    recommendation: "开业前必须签订合伙协议，明确股权、分工、退出机制",
    weight: 0.85,
    source: "案例库",
  },
  {
    id: "MK-RULE-0004",
    scenario: "首次创业",
    description: "辞职创业风险",
    conditions: [
      { field: "has_income_source", operator: "=", value: false },
      { field: "savings_months", operator: "<", value: 12 },
    ],
    judgement: "没有收入来源+储蓄不足12个月=高风险",
    risk: "high",
    recommendation: "保留收入来源或确保至少12个月生活储备",
    weight: 0.8,
    source: "30年经营经验",
  },
  {
    id: "MK-RULE-0005",
    scenario: "首次创业",
    description: "餐饮小白跨界风险",
    conditions: [
      { field: "experience_years", operator: "=", value: 0 },
      { field: "has_industry_partner", operator: "=", value: false },
    ],
    judgement: "零经验+无行业伙伴=极高风险",
    risk: "high",
    recommendation: "先在餐饮行业工作3-6个月，或找有经验的合伙人",
    weight: 0.9,
    source: "30年经营经验",
  },

  // ═══════════════════════════════════════════
  // 投资规则 (0010-0019)
  // ═══════════════════════════════════════════
  {
    id: "MK-RULE-0010",
    scenario: "投资决策",
    description: "租金占比规则",
    conditions: [
      { field: "rent_ratio", operator: ">", value: 0.15 },
    ],
    judgement: "租金成本超过15%，经营压力较大",
    risk: "high",
    recommendation: "重新评估位置价值，或谈判降低租金",
    weight: 0.85,
    exceptions: ["高客流商场店", "品牌溢价能力强"],
    source: "行业基准数据",
  },
  {
    id: "MK-RULE-0011",
    scenario: "投资决策",
    description: "投资回收期规则",
    conditions: [
      { field: "payback_period", operator: ">", value: 24 },
    ],
    judgement: "投资回收期超过24个月，风险较高",
    risk: "high",
    recommendation: "降低投资额或提高客单价/翻台率",
    weight: 0.8,
    source: "行业基准数据",
  },
  {
    id: "MK-RULE-0012",
    scenario: "投资决策",
    description: "装修投入占比规则",
    conditions: [
      { field: "decoration_ratio", operator: ">", value: 0.4 },
    ],
    judgement: "装修投入超过总投资40%，回收压力大",
    risk: "medium",
    recommendation: "控制装修投入，轻装修重装饰",
    weight: 0.7,
    source: "行业基准数据",
  },
  {
    id: "MK-RULE-0013",
    scenario: "投资决策",
    description: "预留流动资金规则",
    conditions: [
      { field: "working_capital_months", operator: "<", value: 3 },
    ],
    judgement: "流动资金不足3个月运营成本，风险高",
    risk: "high",
    recommendation: "至少预留6个月运营资金作为安全垫",
    weight: 0.85,
    source: "30年经营经验",
  },
  {
    id: "MK-RULE-0014",
    scenario: "投资决策",
    description: "面积投资比规则",
    conditions: [
      { field: "area", operator: ">", value: 300 },
      { field: "investment_per_sqm", operator: "<", value: 3000 },
    ],
    judgement: "大面积+低投入密度=装修品质差",
    risk: "medium",
    recommendation: "缩小面积或增加投入，保证装修品质",
    weight: 0.7,
    source: "经营模型",
  },

  // ═══════════════════════════════════════════
  // 选址规则 (0020-0029)
  // ═══════════════════════════════════════════
  {
    id: "MK-RULE-0020",
    scenario: "选址决策",
    description: "低租金陷阱规则",
    conditions: [
      { field: "rent", operator: "<", value: 5 },
      { field: "foot_traffic", operator: "=", value: "low" },
    ],
    judgement: "低租金+低客流=位置价值低",
    risk: "high",
    recommendation: "租金低不是优势，有效客流才是核心",
    weight: 0.9,
    source: "30年经营经验",
  },
  {
    id: "MK-RULE-0021",
    scenario: "选址决策",
    description: "商场店规则",
    conditions: [
      { field: "location_type", operator: "=", value: "mall" },
      { field: "brand_power", operator: "=", value: "low" },
    ],
    judgement: "没有品牌力做商场店风险高",
    risk: "high",
    recommendation: "先在社区建立口碑，再进商场",
    weight: 0.75,
    source: "案例库",
  },
  {
    id: "MK-RULE-0022",
    scenario: "选址决策",
    description: "新商圈风险规则",
    conditions: [
      { field: "district_age", operator: "<", value: 2 },
      { field: "occupancy_rate", operator: "<", value: 0.6 },
    ],
    judgement: "新商圈+入驻率不足60%=养商期长",
    risk: "medium",
    recommendation: "新商圈需要至少2年养商期，确保资金储备充足",
    weight: 0.7,
    source: "案例库",
  },
  {
    id: "MK-RULE-0023",
    scenario: "选址决策",
    description: "竞争密度规则",
    conditions: [
      { field: "same_category_nearby", operator: ">", value: 5 },
      { field: "differentiation", operator: "=", value: "low" },
    ],
    judgement: "同品类密集+无差异化=价格战",
    risk: "high",
    recommendation: "选择竞争较少的区域，或建立明确差异化",
    weight: 0.8,
    source: "30年经营经验",
  },
  {
    id: "MK-RULE-0024",
    scenario: "选址决策",
    description: "外卖覆盖范围规则",
    conditions: [
      { field: "delivery_radius", operator: ">", value: 3 },
      { field: "delivery_ratio", operator: ">", value: 0.5 },
    ],
    judgement: "外卖占比超50%但配送半径超3公里=配送成本高",
    risk: "medium",
    recommendation: "优化配送范围，或降低外卖依赖",
    weight: 0.65,
    source: "经营模型",
  },
  {
    id: "MK-RULE-0025",
    scenario: "选址决策",
    description: "社区店选址规则",
    conditions: [
      { field: "location_type", operator: "=", value: "community" },
      { field: "residential_density", operator: "=", value: "high" },
      { field: "category", operator: "in", value: ["湘菜", "川菜", "家常菜", "面馆"] },
    ],
    judgement: "高密度社区+家常品类=复购型好位置",
    risk: "low",
    recommendation: "社区店核心是复购率，做好品质和性价比",
    weight: 0.8,
    source: "案例库",
  },

  // ═══════════════════════════════════════════
  // 品类规则 (0030-0039)
  // ═══════════════════════════════════════════
  {
    id: "MK-RULE-0030",
    scenario: "品类选择",
    description: "网红品类风险",
    conditions: [
      { field: "category_trend", operator: "=", value: "hot" },
      { field: "differentiation", operator: "=", value: "low" },
    ],
    judgement: "网红品类+无差异化=短命",
    risk: "high",
    recommendation: "网红是起点不是终点，需要建立复购壁垒",
    weight: 0.85,
    source: "案例库",
  },
  {
    id: "MK-RULE-0031",
    scenario: "品类选择",
    description: "高端餐饮门槛",
    conditions: [
      { field: "price_position", operator: "=", value: "high" },
      { field: "brand_power", operator: "=", value: "low" },
    ],
    judgement: "没有品牌资产做高端餐饮风险极高",
    risk: "high",
    recommendation: "高端需要品牌支撑，建议先建立品牌认知",
    weight: 0.9,
    source: "30年经营经验",
  },
  {
    id: "MK-RULE-0032",
    scenario: "品类选择",
    description: "季节性品类风险",
    conditions: [
      { field: "category_seasonality", operator: "=", value: "high" },
      { field: "has_off_season_plan", operator: "=", value: false },
    ],
    judgement: "高季节性品类+无淡季方案=现金流波动大",
    risk: "medium",
    recommendation: "制定淡季经营策略（调整菜单、营销活动、成本控制）",
    weight: 0.7,
    source: "经营模型",
  },
  {
    id: "MK-RULE-0033",
    scenario: "品类选择",
    description: "品类与城市匹配",
    conditions: [
      { field: "category_origin", operator: "!=", value: "local" },
      { field: "local_acceptance", operator: "=", value: "unknown" },
    ],
    judgement: "外来品类+本地接受度未知=需要验证",
    risk: "medium",
    recommendation: "先做小范围测试，验证本地消费者接受度",
    weight: 0.7,
    source: "案例库",
  },
  {
    id: "MK-RULE-0034",
    scenario: "品类选择",
    description: "早餐品类人效规则",
    conditions: [
      { field: "category", operator: "=", value: "早餐" },
      { field: "staff_count", operator: ">", value: 5 },
    ],
    judgement: "早餐品类人力超过5人=人效低",
    risk: "medium",
    recommendation: "早餐品类需要极致人效，控制在3-4人",
    weight: 0.65,
    source: "经营模型",
  },
  {
    id: "MK-RULE-0035",
    scenario: "品类选择",
    description: "火锅品类面积规则",
    conditions: [
      { field: "category", operator: "=", value: "火锅" },
      { field: "area", operator: "<", value: 100 },
    ],
    judgement: "火锅面积不足100㎡=座位少+翻台压力大",
    risk: "medium",
    recommendation: "火锅品类建议150㎡以上，保证座位数和体验",
    weight: 0.6,
    source: "经营模型",
  },

  // ═══════════════════════════════════════════
  // 产品规则 (0040-0049)
  // ═══════════════════════════════════════════
  {
    id: "MK-RULE-0040",
    scenario: "产品策略",
    description: "菜单复杂度规则",
    conditions: [
      { field: "menu_items", operator: ">", value: 80 },
      { field: "kitchen_size", operator: "<", value: 30 },
    ],
    judgement: "菜品过多+厨房过小=品质不稳定",
    risk: "medium",
    recommendation: "精简菜单至40-50个SKU，聚焦招牌菜",
    weight: 0.7,
    source: "经营模型",
  },
  {
    id: "MK-RULE-0041",
    scenario: "产品策略",
    description: "招牌菜缺失风险",
    conditions: [
      { field: "has_signature_dish", operator: "=", value: false },
      { field: "menu_items", operator: ">", value: 30 },
    ],
    judgement: "菜品多但无招牌菜=无记忆点",
    risk: "medium",
    recommendation: "打造1-2道招牌菜，形成品牌记忆点",
    weight: 0.75,
    source: "30年经营经验",
  },
  {
    id: "MK-RULE-0042",
    scenario: "产品策略",
    description: "定价策略规则",
    conditions: [
      { field: "avg_price", operator: "<", value: 30 },
      { field: "rent_ratio", operator: ">", value: 0.12 },
    ],
    judgement: "低客单价+高租金占比=利润空间极小",
    risk: "high",
    recommendation: "提升客单价（增加高毛利菜品）或降低租金",
    weight: 0.8,
    source: "经营模型",
  },
  {
    id: "MK-RULE-0043",
    scenario: "产品策略",
    description: "外卖包装成本规则",
    conditions: [
      { field: "delivery_ratio", operator: ">", value: 0.4 },
      { field: "packaging_cost_ratio", operator: ">", value: 0.08 },
    ],
    judgement: "外卖占比高+包装成本超8%=侵蚀利润",
    risk: "medium",
    recommendation: "优化包装方案，批量采购降低成本",
    weight: 0.6,
    source: "经营模型",
  },
  {
    id: "MK-RULE-0044",
    scenario: "产品策略",
    description: "菜品更新频率规则",
    conditions: [
      { field: "months_since_new_dish", operator: ">", value: 6 },
      { field: "repeat_rate", operator: "<", value: 0.3 },
    ],
    judgement: "超过6个月未上新+复购率低=产品老化",
    risk: "medium",
    recommendation: "每季度推出新品，保持新鲜感",
    weight: 0.65,
    source: "30年经营经验",
  },

  // ═══════════════════════════════════════════
  // 成本规则 (0050-0059)
  // ═══════════════════════════════════════════
  {
    id: "MK-RULE-0050",
    scenario: "成本控制",
    description: "食材成本率基准",
    conditions: [
      { field: "food_cost_ratio", operator: ">", value: 0.35 },
    ],
    judgement: "食材成本率超过35%，利润空间被压缩",
    risk: "medium",
    recommendation: "优化供应链、调整菜品结构、提升定价",
    weight: 0.75,
    source: "行业基准数据",
  },
  {
    id: "MK-RULE-0051",
    scenario: "成本控制",
    description: "人力成本率基准",
    conditions: [
      { field: "labor_cost_ratio", operator: ">", value: 0.25 },
    ],
    judgement: "人力成本率超过25%，需要优化人效",
    risk: "medium",
    recommendation: "优化排班、提升自动化、调整组织结构",
    weight: 0.7,
    source: "行业基准数据",
  },
  {
    id: "MK-RULE-0052",
    scenario: "成本控制",
    description: "水电能耗规则",
    conditions: [
      { field: "utility_cost_ratio", operator: ">", value: 0.06 },
    ],
    judgement: "水电成本超过6%，能耗管理不足",
    risk: "low",
    recommendation: "检查设备能效，优化营业时间，减少浪费",
    weight: 0.5,
    source: "行业基准数据",
  },
  {
    id: "MK-RULE-0053",
    scenario: "成本控制",
    description: "食材损耗规则",
    conditions: [
      { field: "food_waste_ratio", operator: ">", value: 0.08 },
    ],
    judgement: "食材损耗超过8%，管理需要改进",
    risk: "medium",
    recommendation: "优化采购量、改进存储、调整菜单结构",
    weight: 0.65,
    source: "经营模型",
  },
  {
    id: "MK-RULE-0054",
    scenario: "成本控制",
    description: "综合成本率红线",
    conditions: [
      { field: "total_cost_ratio", operator: ">", value: 0.85 },
    ],
    judgement: "综合成本率超过85%=几乎无利润",
    risk: "high",
    recommendation: "紧急优化成本结构，否则面临亏损",
    weight: 0.9,
    source: "行业基准数据",
  },

  // ═══════════════════════════════════════════
  // 增长规则 (0060-0069)
  // ═══════════════════════════════════════════
  {
    id: "MK-RULE-0060",
    scenario: "扩张决策",
    description: "复制扩张前提",
    conditions: [
      { field: "store_count", operator: ">", value: 1 },
      { field: "standardization", operator: "=", value: "low" },
    ],
    judgement: "没有标准化就扩张是找死",
    risk: "high",
    recommendation: "先建立标准化体系（产品、流程、培训），再扩张",
    weight: 0.9,
    source: "30年经营经验",
  },
  {
    id: "MK-RULE-0061",
    scenario: "扩张决策",
    description: "首店盈利验证",
    conditions: [
      { field: "store_count", operator: "=", value: 0 },
      { field: "first_store_profit_months", operator: "<", value: 6 },
    ],
    judgement: "首店连续盈利不足6个月=不应急于扩张",
    risk: "high",
    recommendation: "至少连续盈利6个月后再考虑开第二家",
    weight: 0.85,
    source: "30年经营经验",
  },
  {
    id: "MK-RULE-0062",
    scenario: "增长策略",
    description: "复购率健康标准",
    conditions: [
      { field: "repeat_rate", operator: "<", value: 0.2 },
      { field: "months_open", operator: ">", value: 3 },
    ],
    judgement: "开业超3个月复购率低于20%=产品或体验有问题",
    risk: "high",
    recommendation: "分析复购低原因：产品、服务、价格、体验",
    weight: 0.8,
    source: "行业基准数据",
  },
  {
    id: "MK-RULE-0063",
    scenario: "增长策略",
    description: "外卖依赖风险",
    conditions: [
      { field: "delivery_ratio", operator: ">", value: 0.7 },
    ],
    judgement: "外卖占比超过70%=平台依赖风险高",
    risk: "medium",
    recommendation: "提升堂食占比，降低平台依赖",
    weight: 0.7,
    source: "案例库",
  },
  {
    id: "MK-RULE-0064",
    scenario: "增长策略",
    description: "营销投入回报规则",
    conditions: [
      { field: "marketing_cost_ratio", operator: ">", value: 0.1 },
      { field: "new_customer_cost", operator: ">", value: 50 },
    ],
    judgement: "营销成本超10%且获客成本超50元=营销效率低",
    risk: "medium",
    recommendation: "优化营销渠道，提升转化率",
    weight: 0.6,
    source: "经营模型",
  },

  // ═══════════════════════════════════════════
  // 运营规则 (0070-0079)
  // ═══════════════════════════════════════════
  {
    id: "MK-RULE-0070",
    scenario: "运营管理",
    description: "翻台率基准",
    conditions: [
      { field: "table_turnover", operator: "<", value: 1.5 },
      { field: "category", operator: "in", value: ["快餐", "面馆", "小吃"] },
    ],
    judgement: "快餐品类翻台率低于1.5=运营效率不足",
    risk: "medium",
    recommendation: "优化出餐速度、座位布局、点餐流程",
    weight: 0.7,
    source: "行业基准数据",
  },
  {
    id: "MK-RULE-0071",
    scenario: "运营管理",
    description: "员工流失率规则",
    conditions: [
      { field: "staff_turnover_rate", operator: ">", value: 0.3 },
    ],
    judgement: "月员工流失率超30%=管理或待遇有问题",
    risk: "medium",
    recommendation: "检查薪酬、工作环境、管理方式",
    weight: 0.65,
    source: "行业基准数据",
  },
  {
    id: "MK-RULE-0072",
    scenario: "运营管理",
    description: "差评处理规则",
    conditions: [
      { field: "negative_review_rate", operator: ">", value: 0.1 },
      { field: "review_response_rate", operator: "<", value: 0.5 },
    ],
    judgement: "差评率超10%且回复率不足50%=口碑在恶化",
    risk: "medium",
    recommendation: "100%回复差评，48小时内处理，改进问题根源",
    weight: 0.6,
    source: "30年经营经验",
  },
  {
    id: "MK-RULE-0073",
    scenario: "运营管理",
    description: "食品安全红线",
    conditions: [
      { field: "food_safety_score", operator: "<", value: 80 },
    ],
    judgement: "食品安全评分低于80=存在重大风险",
    risk: "high",
    recommendation: "立即整改食品安全问题，这是生死线",
    weight: 0.95,
    source: "行业基准数据",
  },

  // ═══════════════════════════════════════════
  // 品牌规则 (0080-0089)
  // ═══════════════════════════════════════════
  {
    id: "MK-RULE-0080",
    scenario: "品牌建设",
    description: "品牌定位清晰度",
    conditions: [
      { field: "has_clear_positioning", operator: "=", value: false },
      { field: "months_open", operator: ">", value: 6 },
    ],
    judgement: "开业超6个月仍无清晰品牌定位=方向模糊",
    risk: "medium",
    recommendation: "明确：你是什么？卖给谁？凭什么？",
    weight: 0.75,
    source: "30年经营经验",
  },
  {
    id: "MK-RULE-0081",
    scenario: "品牌建设",
    description: "品牌名规则",
    conditions: [
      { field: "brand_name_length", operator: ">", value: 5 },
      { field: "brand_name_memorable", operator: "=", value: false },
    ],
    judgement: "品牌名太长或不好记=传播成本高",
    risk: "low",
    recommendation: "品牌名控制在2-4个字，朗朗上口",
    weight: 0.5,
    source: "30年经营经验",
  },

  // ═══════════════════════════════════════════
  // 团队规则 (0090-0099)
  // ═══════════════════════════════════════════
  {
    id: "MK-RULE-0090",
    scenario: "团队管理",
    description: "厨师长依赖风险",
    conditions: [
      { field: "chef_dependency", operator: "=", value: "high" },
      { field: "recipe_documented", operator: "=", value: false },
    ],
    judgement: "高度依赖厨师长+菜谱未标准化=核心人员流失即崩盘",
    risk: "high",
    recommendation: "标准化所有菜品配方，降低对个人的依赖",
    weight: 0.85,
    source: "案例库",
  },
  {
    id: "MK-RULE-0091",
    scenario: "团队管理",
    description: "管理层能力规则",
    conditions: [
      { field: "has_manager", operator: "=", value: false },
      { field: "area", operator: ">", value: 200 },
    ],
    judgement: "面积超200㎡但无专业店长=管理风险",
    risk: "medium",
    recommendation: "招聘有经验的店长，老板专注战略",
    weight: 0.7,
    source: "30年经营经验",
  },
];

/**
 * 根据事实匹配规则
 */
export function matchRules(
  facts: Record<string, unknown>,
  rules: DecisionRule[] = DECISION_RULES
): DecisionRule[] {
  return rules.filter(rule => {
    return rule.conditions.every(condition => {
      const fieldValue = facts[condition.field];
      if (fieldValue === undefined) return false;

      switch (condition.operator) {
        case "=":
          return fieldValue === condition.value;
        case "!=":
          return fieldValue !== condition.value;
        case ">":
          return (fieldValue as number) > (condition.value as number);
        case "<":
          return (fieldValue as number) < (condition.value as number);
        case ">=":
          return (fieldValue as number) >= (condition.value as number);
        case "<=":
          return (fieldValue as number) <= (condition.value as number);
        case "contains":
          return String(fieldValue).includes(String(condition.value));
        case "in":
          return Array.isArray(condition.value) && condition.value.includes(fieldValue);
        default:
          return false;
      }
    });
  });
}
