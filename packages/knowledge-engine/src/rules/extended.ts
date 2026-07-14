/**
 * 餐饮经营规则库 — 扩展规则 (0100-0199)
 *
 * 覆盖：营销推广、供应链、数字化、危机管理、融资、加盟
 */
import type { DecisionRule } from "../types";

export const EXTENDED_RULES: DecisionRule[] = [
  // ═══════════════════════════════════════════
  // 营销推广规则 (0100-0119)
  // ═══════════════════════════════════════════
  {
    id: "MK-RULE-0100",
    scenario: "营销策略",
    description: "开业营销预算规则",
    conditions: [
      { field: "opening_marketing_budget", operator: "<", value: 30000 },
      { field: "brand_power", operator: "=", value: "low" },
    ],
    judgement: "新品牌开业营销预算不足3万=知名度难以快速建立",
    risk: "medium",
    recommendation: "开业营销预算建议占总投资的5-8%，至少3-5万",
    weight: 0.7,
    source: "30年经营经验",
  },
  {
    id: "MK-RULE-0101",
    scenario: "营销策略",
    description: "抖音营销投入规则",
    conditions: [
      { field: "douyin_investment", operator: ">", value: 50000 },
      { field: "product_readiness", operator: "=", value: "low" },
    ],
    judgement: "产品未准备好就大量投放抖音=流量来了接不住",
    risk: "high",
    recommendation: "先确保产品和体验稳定，再做流量投放",
    weight: 0.8,
    source: "案例库",
  },
  {
    id: "MK-RULE-0102",
    scenario: "营销策略",
    description: "私域运营规则",
    conditions: [
      { field: "repeat_rate", operator: ">", value: 0.3 },
      { field: "has_private_domain", operator: "=", value: false },
    ],
    judgement: "复购率超30%但没有私域运营=客户资产在流失",
    risk: "medium",
    recommendation: "建立微信群或会员体系，把高复购客户沉淀为私域资产",
    weight: 0.75,
    source: "30年经营经验",
  },
  {
    id: "MK-RULE-0103",
    scenario: "营销策略",
    description: "促销频率规则",
    conditions: [
      { field: "promotion_frequency", operator: ">", value: 4 },
      { field: "months_open", operator: ">", value: 3 },
    ],
    judgement: "每月促销超过4次=品牌力弱，依赖打折吸引客流",
    risk: "medium",
    recommendation: "降低促销频率，把资源投入产品和服务提升",
    weight: 0.65,
    source: "30年经营经验",
  },
  {
    id: "MK-RULE-0104",
    scenario: "营销策略",
    description: "大众点评评分规则",
    conditions: [
      { field: "dianping_score", operator: "<", value: 3.5 },
      { field: "months_open", operator: ">", value: 3 },
    ],
    judgement: "开业超3个月大众点评评分低于3.5=产品/服务有硬伤",
    risk: "high",
    recommendation: "先解决差评反映的核心问题，再考虑做推广",
    weight: 0.85,
    source: "行业基准数据",
  },
  {
    id: "MK-RULE-0105",
    scenario: "营销策略",
    description: "KOL投放规则",
    conditions: [
      { field: "kol_investment", operator: ">", value: 20000 },
      { field: "store_capacity", operator: "<", value: 60 },
    ],
    judgement: "高投入找KOL但门店接待能力不足=流量浪费",
    risk: "medium",
    recommendation: "先扩容或优化接待流程，再考虑KOL投放",
    weight: 0.7,
    source: "案例库",
  },

  // ═══════════════════════════════════════════
  // 供应链规则 (0120-0134)
  // ═══════════════════════════════════════════
  {
    id: "MK-RULE-0120",
    scenario: "供应链管理",
    description: "供应商集中度风险",
    conditions: [
      { field: "supplier_count", operator: "<", value: 2 },
      { field: "key_ingredient_suppliers", operator: "=", value: 1 },
    ],
    judgement: "核心食材只有1家供应商=断供风险极高",
    risk: "high",
    recommendation: "至少培养2-3家备选供应商，核心食材要有替代方案",
    weight: 0.85,
    source: "案例库",
  },
  {
    id: "MK-RULE-0121",
    scenario: "供应链管理",
    description: "食材采购周期规则",
    conditions: [
      { field: "purchase_frequency", operator: "<", value: 2 },
      { field: "fresh_ingredient_ratio", operator: ">", value: 0.6 },
    ],
    judgement: "鲜食材占比超60%但采购频率低于每周2次=食材不新鲜",
    risk: "medium",
    recommendation: "鲜食材至少每周采购2-3次，保证品质",
    weight: 0.7,
    source: "经营模型",
  },
  {
    id: "MK-RULE-0122",
    scenario: "供应链管理",
    description: "库存周转规则",
    conditions: [
      { field: "inventory_turnover_days", operator: ">", value: 14 },
      { field: "category", operator: "in", value: ["快餐", "面馆", "小吃"] },
    ],
    judgement: "快餐品类库存周转超过14天=资金效率低",
    risk: "medium",
    recommendation: "优化采购计划，降低安全库存，加快周转",
    weight: 0.65,
    source: "行业基准数据",
  },
  {
    id: "MK-RULE-0123",
    scenario: "供应链管理",
    description: "冷链管理规则",
    conditions: [
      { field: "cold_chain_ratio", operator: ">", value: 0.3 },
      { field: "cold_chain_certified", operator: "=", value: false },
    ],
    judgement: "冷链食材占比超30%但无冷链资质=食品安全风险",
    risk: "high",
    recommendation: "必须使用有冷链资质的供应商，这是食品安全底线",
    weight: 0.9,
    source: "行业基准数据",
  },

  // ═══════════════════════════════════════════
  // 数字化规则 (0135-0149)
  // ═══════════════════════════════════════════
  {
    id: "MK-RULE-0135",
    scenario: "数字化转型",
    description: "POS系统必要性",
    conditions: [
      { field: "has_pos_system", operator: "=", value: false },
      { field: "monthly_revenue", operator: ">", value: 150000 },
    ],
    judgement: "月营收超15万但没有POS系统=经营数据盲区",
    risk: "medium",
    recommendation: "上线POS系统，至少需要知道菜品维度的营收和成本数据",
    weight: 0.7,
    source: "行业基准数据",
  },
  {
    id: "MK-RULE-0136",
    scenario: "数字化转型",
    description: "会员系统规则",
    conditions: [
      { field: "has_member_system", operator: "=", value: false },
      { field: "repeat_rate", operator: ">", value: 0.25 },
      { field: "months_open", operator: ">", value: 6 },
    ],
    judgement: "开业超6个月+复购率超25%但无会员系统=客户资产流失",
    risk: "medium",
    recommendation: "上线简单的会员系统，至少做到积分和消费记录",
    weight: 0.65,
    source: "经营模型",
  },
  {
    id: "MK-RULE-0137",
    scenario: "数字化转型",
    description: "外卖平台依赖规则",
    conditions: [
      { field: "platform_count", operator: ">", value: 3 },
      { field: "delivery_ratio", operator: "<", value: 0.3 },
    ],
    judgement: "堂食为主但上了3个以上外卖平台=运营成本浪费",
    risk: "low",
    recommendation: "聚焦1-2个核心外卖平台，减少管理成本",
    weight: 0.5,
    source: "经营模型",
  },

  // ═══════════════════════════════════════════
  // 危机管理规则 (0150-0169)
  // ═══════════════════════════════════════════
  {
    id: "MK-RULE-0150",
    scenario: "危机管理",
    description: "食品安全事故应对",
    conditions: [
      { field: "food_safety_incident", operator: "=", value: true },
      { field: "has_crisis_plan", operator: "=", value: false },
    ],
    judgement: "发生食品安全事故但无危机预案=品牌可能一夜崩塌",
    risk: "high",
    recommendation: "立即制定食品安全危机预案，包括：召回流程、媒体应对、监管部门沟通",
    weight: 0.95,
    source: "案例库",
  },
  {
    id: "MK-RULE-0151",
    scenario: "危机管理",
    description: "负面舆情规则",
    conditions: [
      { field: "negative_news_count", operator: ">", value: 3 },
      { field: "brand_awareness", operator: ">", value: "medium" },
    ],
    judgement: "品牌知名度中等以上+近期3条以上负面新闻=舆情危机",
    risk: "high",
    recommendation: "成立危机处理小组，统一对外口径，主动发布整改措施",
    weight: 0.85,
    source: "案例库",
  },
  {
    id: "MK-RULE-0152",
    scenario: "危机管理",
    description: "现金流危机预警",
    conditions: [
      { field: "cash_reserve_months", operator: "<", value: 2 },
      { field: "monthly_profit", operator: "<", value: 0 },
    ],
    judgement: "现金流不足2个月+持续亏损=生存危机",
    risk: "high",
    recommendation: "立即启动紧急措施：削减非必要开支、与房东谈判减租、推出预售套餐回笼资金",
    weight: 0.9,
    source: "30年经营经验",
  },
  {
    id: "MK-RULE-0153",
    scenario: "危机管理",
    description: "核心人员离职风险",
    conditions: [
      { field: "key_staff_leaving", operator: "=", value: true },
      { field: "successor_ready", operator: "=", value: false },
    ],
    judgement: "核心人员离职+无接班人=关键岗位真空",
    risk: "high",
    recommendation: "立即启动紧急招聘，同时让现有团队分担核心职责，防止业务中断",
    weight: 0.8,
    source: "30年经营经验",
  },
  {
    id: "MK-RULE-0154",
    scenario: "危机管理",
    description: "政策风险规则",
    conditions: [
      { field: "policy_change_impact", operator: "=", value: "high" },
      { field: "business_model_flexibility", operator: "=", value: "low" },
    ],
    judgement: "政策变化影响大+商业模式弹性低=转型困难",
    risk: "high",
    recommendation: "提前布局多元化收入来源，降低单一政策风险",
    weight: 0.75,
    source: "案例库",
  },

  // ═══════════════════════════════════════════
  // 融资规则 (0170-0184)
  // ═══════════════════════════════════════════
  {
    id: "MK-RULE-0170",
    scenario: "融资决策",
    description: "融资时机规则",
    conditions: [
      { field: "store_count", operator: "<", value: 3 },
      { field: "first_store_profit_months", operator: "<", value: 12 },
    ],
    judgement: "门店少于3家+首店盈利不足12个月=融资过早",
    risk: "high",
    recommendation: "至少验证单店模型12个月以上，再考虑融资",
    weight: 0.85,
    source: "案例库",
  },
  {
    id: "MK-RULE-0171",
    scenario: "融资决策",
    description: "股权稀释规则",
    conditions: [
      { field: "equity_diluted", operator: ">", value: 0.3 },
      { field: "valuation_revenue_ratio", operator: "<", value: 2 },
    ],
    judgement: "稀释超30%但估值/营收比低于2倍=融资条件差",
    risk: "high",
    recommendation: "优先考虑债权融资或可转债，避免过早低价稀释股权",
    weight: 0.8,
    source: "行业基准数据",
  },
  {
    id: "MK-RULE-0172",
    scenario: "融资决策",
    description: "对赌协议风险",
    conditions: [
      { field: "has_gambling_clause", operator: "=", value: true },
      { field: "revenue_volatility", operator: "=", value: "high" },
    ],
    judgement: "对赌协议+营收波动大=创始人可能失去控制权",
    risk: "high",
    recommendation: "尽量避免对赌条款，或设置合理的业绩缓冲区间",
    weight: 0.85,
    source: "案例库",
  },
  {
    id: "MK-RULE-0173",
    scenario: "融资决策",
    description: "加盟扩张规则",
    conditions: [
      { field: "franchise_ready", operator: "=", value: false },
      { field: "store_count", operator: ">", value: 5 },
    ],
    judgement: "门店超5家但未准备好加盟体系=加盟会毁掉品牌",
    risk: "high",
    recommendation: "加盟前必须完成：标准化手册、培训体系、供应链、督导机制",
    weight: 0.9,
    source: "案例库",
  },
  {
    id: "MK-RULE-0174",
    scenario: "融资决策",
    description: "估值合理性规则",
    conditions: [
      { field: "valuation", operator: ">", value: 50000000 },
      { field: "annual_profit", operator: "<", value: 3000000 },
    ],
    judgement: "估值超5000万但年利润低于300万=估值泡沫风险",
    risk: "medium",
    recommendation: "估值/年利润比超过15倍需要谨慎，确保有清晰的增长路径",
    weight: 0.7,
    source: "行业基准数据",
  },

  // ═══════════════════════════════════════════
  // 特殊场景规则 (0185-0199)
  // ═══════════════════════════════════════════
  {
    id: "MK-RULE-0185",
    scenario: "特殊场景",
    description: "夫妻店风险规则",
    conditions: [
      { field: "team_type", operator: "=", value: "couple" },
      { field: "area", operator: ">", value: 150 },
    ],
    judgement: "夫妻店模式经营超150㎡=人力和管理能力不足",
    risk: "medium",
    recommendation: "夫妻店建议控制在100㎡以内，超面积必须招聘外部员工",
    weight: 0.65,
    source: "30年经营经验",
  },
  {
    id: "MK-RULE-0186",
    scenario: "特殊场景",
    description: "校园店规则",
    conditions: [
      { field: "location_type", operator: "=", value: "campus" },
      { field: "avg_price", operator: ">", value: 25 },
    ],
    judgement: "校园店客单价超过25元=超出学生消费能力",
    risk: "medium",
    recommendation: "校园店客单价建议控制在15-25元，主打性价比",
    weight: 0.7,
    source: "行业基准数据",
  },
  {
    id: "MK-RULE-0187",
    scenario: "特殊场景",
    description: "景区店规则",
    conditions: [
      { field: "location_type", operator: "=", value: "scenic" },
      { field: "seasonal_fluctuation", operator: ">", value: 0.5 },
    ],
    judgement: "景区店客流季节性波动超50%=淡季生存压力大",
    risk: "high",
    recommendation: "景区店必须有淡季生存方案，如：降低成本、开拓本地客源、暂停营业",
    weight: 0.75,
    source: "案例库",
  },
  {
    id: "MK-RULE-0188",
    scenario: "特殊场景",
    description: "夜间经济规则",
    conditions: [
      { field: "business_hours", operator: "=", value: "night" },
      { field: "security_measures", operator: "=", value: "insufficient" },
    ],
    judgement: "夜间经营+安全措施不足=员工和顾客安全风险",
    risk: "high",
    recommendation: "夜间经营必须配备：足够照明、监控系统、安保人员",
    weight: 0.85,
    source: "30年经营经验",
  },
  {
    id: "MK-RULE-0189",
    scenario: "特殊场景",
    description: "外卖专营店规则",
    conditions: [
      { field: "store_type", operator: "=", value: "delivery_only" },
      { field: "monthly_revenue", operator: "<", value: 80000 },
    ],
    judgement: "纯外卖月营收低于8万=扣除平台抽成后利润极薄",
    risk: "high",
    recommendation: "纯外卖模式月营收至少15万以上才有利润，考虑增加堂食场景",
    weight: 0.75,
    source: "经营模型",
  },
  {
    id: "MK-RULE-0190",
    scenario: "特殊场景",
    description: "加盟店选址规则",
    conditions: [
      { field: "store_type", operator: "=", value: "franchise" },
      { field: "brand_support_score", operator: "<", value: 60 },
    ],
    judgement: "加盟品牌支持评分低于60=加盟后大概率自生自灭",
    risk: "high",
    recommendation: "加盟前实地考察3家以上现有加盟店，了解总部实际支持力度",
    weight: 0.85,
    source: "案例库",
  },
  {
    id: "MK-RULE-0191",
    scenario: "特殊场景",
    description: "24小时营业规则",
    conditions: [
      { field: "business_hours", operator: "=", value: "24h" },
      { field: "night_revenue_ratio", operator: "<", value: 0.15 },
    ],
    judgement: "24小时营业但夜间营收占比低于15%=夜间成本浪费",
    risk: "medium",
    recommendation: "评估夜间时段的实际产出，考虑缩短营业时间降低成本",
    weight: 0.6,
    source: "经营模型",
  },
];
