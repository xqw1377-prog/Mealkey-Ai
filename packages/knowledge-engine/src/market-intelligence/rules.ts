/**
 * M-MKT 市场进入决策规则库
 *
 * 蒸馏自：
 * - BCG 增长份额矩阵 / 经验曲线
 * - McKinsey 市场进入框架（3 Horizon）
 * - Porter 五力模型 / 钻石模型
 * - Christensen 颠覆式创新理论
 * - Ries & Trout 心智阶梯（市场进入视角）
 * - 尼尔森渠道渗透模型
 * - 餐饮行业 30 年实操经验
 *
 * 规则场景：市场扫描、竞品分析、用户验证、进入方式、时机判断
 */

import type { DecisionRule } from "../types";

export const MARKET_INTELLIGENCE_RULES: DecisionRule[] = [
  // ═══════════════════════════════════════════
  // 市场评估规则 (MKT-001-MKT-015)
  // ═══════════════════════════════════════════

  {
    id: "MKT-RULE-001",
    scenario: "市场扫描",
    description: "市场规模门槛规则：新进入市场规模至少 10 亿才有战略价值",
    conditions: [
      { field: "target_market_size", operator: "<", value: 1000000000 },
    ],
    judgement: "市场规模不足 10 亿 = 天花板太低，不值得投入战略级资源",
    risk: "medium",
    recommendation: "小于 10 亿的市场只适合作为副业或存量优化，不适合作为主业进入",
    weight: 0.8,
    source: "BCG 市场吸引力矩阵 + 餐饮规模化经验",
  },
  {
    id: "MKT-RULE-002",
    scenario: "市场扫描",
    description: "市场增长率规则：增长率低于 5% 为存量市场，进入难度大",
    conditions: [
      { field: "market_growth_rate", operator: "<", value: 5 },
    ],
    judgement: "市场增长率低于 5% = 存量竞争，新人进入需要抢夺现有份额",
    risk: "high",
    recommendation: "增长率低于 5% 的市场不建议新人进入；如必须进入，需要有明确的替换理由",
    weight: 0.85,
    source: "BCG 成长率/占有率矩阵 + McKinsey 增长框架",
  },
  {
    id: "MKT-RULE-003",
    scenario: "市场扫描",
    description: "市场集中度规则：CR5 超过 60% 为高集中市场，进入门槛高",
    conditions: [
      { field: "market_concentration_cr5", operator: ">", value: 60 },
    ],
    judgement: "前 5 名市占率超过 60% = 市场高度集中，新品牌进入成本极高",
    risk: "high",
    recommendation: "高集中市场建议选择细分赛道或边缘切入，避免正面竞争",
    weight: 0.85,
    source: "Porter 五力 - 进入壁垒分析",
  },
  {
    id: "MKT-RULE-004",
    scenario: "市场扫描",
    description: "市场增长窗口规则：增长率突然加速超过 15% 时是进入窗口",
    conditions: [
      { field: "market_growth_rate", operator: ">", value: 15 },
      { field: "market_size", operator: ">", value: 5000000000 },
    ],
    judgement: "市场增速超过 15% + 规模超 50 亿 = 战略进入窗口已开",
    risk: "low",
    recommendation: "高速增长的规模化市场是最佳进入窗口，优先占位而非完美方案",
    weight: 0.9,
    source: "McKinsey 窗口战略 + BCG 时机矩阵",
  },
  {
    id: "MKT-RULE-005",
    scenario: "市场扫描",
    description: "品类替代威胁规则：有强大替代品的市场风险高",
    conditions: [
      { field: "substitute_threat", operator: ">", value: 4 },
    ],
    judgement: "替代品威胁大 = 消费者随时可能转向替代方案，市场脆弱",
    risk: "high",
    recommendation: "评估替代品的性价比优势，如果替代品明显更好，建议不进入",
    weight: 0.75,
    source: "Porter 五力 - 替代品威胁",
  },

  // ═══════════════════════════════════════════
  // 竞品分析规则 (MKT-016-MKT-025)
  // ═══════════════════════════════════════════

  {
    id: "MKT-RULE-016",
    scenario: "竞争分析",
    description: "心智领头羊锁定规则：每个品类消费者脑海只记得前两名",
    conditions: [
      { field: "market_rank", operator: ">", value: 2 },
      { field: "brand_awareness", operator: "<", value: "high" },
    ],
    judgement: "排名第三名以外 + 知名度不高 = 消费者在购买时根本不会想到你",
    risk: "high",
    recommendation: "要么成为前两名，要么找一个细分赛道成为第一",
    weight: 0.9,
    source: "Ries 心智阶梯 + 餐饮品类记忆法则",
  },
  {
    id: "MKT-RULE-017",
    scenario: "竞争分析",
    description: "竞品密度过高规则：同品类每万人门店数超过 2 家为过度竞争",
    conditions: [
      { field: "stores_per_10k_population", operator: ">", value: 2 },
    ],
    judgement: "每万人同品类门店超过 2 家 = 竞争已饱和，新入者空间有限",
    risk: "high",
    recommendation: "饱和度超过 2 家/万人时，必须有显著差异化才能进入",
    weight: 0.8,
    source: "餐饮行业密度基准 + 零售饱和指数",
  },
  {
    id: "MKT-RULE-018",
    scenario: "竞争分析",
    description: "竞品空白定位规则：找到竞争对手没有占据的认知空位",
    conditions: [
      { field: "mental_whitespace_exists", operator: "=", value: true },
      { field: "whitespace_size", operator: ">", value: 3 },
    ],
    judgement: "存在心智空白且规模可观 = 最佳进入点",
    risk: "low",
    recommendation: "优先攻击心智空白，而不是在竞争激烈的维度上投入",
    weight: 0.85,
    source: "Ries 寻找空位法则 + Trout 区隔理论",
  },

  // ═══════════════════════════════════════════
  // 用户需求验证规则 (MKT-026-MKT-035)
  // ═══════════════════════════════════════════

  {
    id: "MKT-RULE-026",
    scenario: "用户研究",
    description: "需求真伪判断规则：有替代行为的需求才是真实需求",
    conditions: [
      { field: "has_existing_behavior", operator: "=", value: false },
    ],
    judgement: "没有现有替代行为 = 声称的需求可能是假需求",
    risk: "high",
    recommendation: "用户现在如何解决这个需求？如果找不到替代行为，需求可能不存在",
    weight: 0.9,
    source: "Christensen JTBD 理论 + 用户行为优先于态度",
  },
  {
    id: "MKT-RULE-027",
    scenario: "用户研究",
    description: "高频场景优先规则：消费频次越高，市场教育成本越低",
    conditions: [
      { field: "consumption_frequency", operator: "<", value: 1 },
      { field: "unit_price", operator: ">", value: 100 },
    ],
    judgement: "低频消费 + 高客单价 = 每次获客都要重新教育，成本极高",
    risk: "high",
    recommendation: "低频高客单价模式需要极强的品牌力或复购机制，否则获客成本不可承受",
    weight: 0.8,
    source: "餐饮消费频率基准 + 用户习惯理论",
  },
  {
    id: "MKT-RULE-028",
    scenario: "用户研究",
    description: "支付意愿验证规则：愿意付费才是真需求",
    conditions: [
      { field: "willingness_to_pay_verified", operator: "=", value: false },
    ],
    judgement: "支付意愿未验证 = 需求可能只是嘴上说说的伪需求",
    risk: "high",
    recommendation: "在投入之前，先用最小化产品验证支付意愿（预售/众筹/试营业）",
    weight: 0.85,
    source: "Lean Startup 验证学习 + 用户行为经济学",
  },

  // ═══════════════════════════════════════════
  // 进入方式与时机规则 (MKT-036-MKT-045)
  // ═══════════════════════════════════════════

  {
    id: "MKT-RULE-036",
    scenario: "进入策略",
    description: "先试点后规模规则：不超过 3 家店不讨论规模复制",
    conditions: [
      { field: "planned_stores", operator: ">", value: 3 },
      { field: "pilot_verified", operator: "=", value: false },
    ],
    judgement: "计划开店超过 3 家但首店未验证 = 跳跃式扩张，风险极高",
    risk: "high",
    recommendation: "先跑通单店模型（验证客群/场景/UE），至少运营 6 个月再谈复制",
    weight: 0.95,
    source: "餐饮 30 年铁律：首店未稳不扩第二家",
  },
  {
    id: "MKT-RULE-037",
    scenario: "进入策略",
    description: "区域聚焦规则：聚焦一个区域打透，不要同时铺多城",
    conditions: [
      { field: "target_cities_count", operator: ">", value: 2 },
      { field: "resource_adequacy", operator: "<", value: 4 },
    ],
    judgement: "同时进入超过 2 个城市 + 资源不足 = 每个城市都做不透",
    risk: "high",
    recommendation: "聚焦一个城市或区域，打透再扩张。多城同时铺开 = 多个地方一起亏",
    weight: 0.85,
    source: "聚焦战略 + 餐饮区域密度法则",
  },
  {
    id: "MKT-RULE-038",
    scenario: "进入策略",
    description: "城市层级匹配规则：品牌定位与城市层级匹配",
    conditions: [
      { field: "brand_tier", operator: "=", value: "premium" },
      { field: "target_city_tier", operator: "in", value: ["三线", "四线"] },
    ],
    judgement: "高端品牌进入低线城市 = 客群消费力不足以支撑定价",
    risk: "high",
    recommendation: "高端品牌优先进入一线/新一线城市；性价比品牌更适合下沉市场",
    weight: 0.8,
    source: "城市消费力分层 + 餐饮品牌匹配法则",
  },
  {
    id: "MKT-RULE-039",
    scenario: "进入策略",
    description: "商圈契合度规则：品类必须匹配商圈客群",
    conditions: [
      { field: "category_business_district_fit", operator: "<", value: 3 },
    ],
    judgement: "品类与商圈匹配度低 = 客流不精准，转化率低",
    risk: "high",
    recommendation: "选址前先分析商圈的客群结构与消费能力，匹配度低于 3 不建议进入",
    weight: 0.85,
    source: "商圈客群分析 + 餐饮选址法则",
  },

  // ═══════════════════════════════════════════
  // 城市/区域分析规则 (MKT-046-MKT-052)
  // ═══════════════════════════════════════════

  {
    id: "MKT-RULE-046",
    scenario: "城市分析",
    description: "城市餐饮容量规则：城市餐饮市场总量与人口和 GDP 正相关",
    conditions: [
      { field: "city_population", operator: "<", value: 500000 },
      { field: "city_gdp_per_capita", operator: "<", value: 50000 },
    ],
    judgement: "人口不足 50 万 + 人均 GDP 低于 5 万 = 餐饮市场容量有限",
    risk: "high",
    recommendation: "开店优先选择人口 100 万以上、人均 GDP 6 万以上的城市",
    weight: 0.75,
    source: "城市餐饮经济基础分析",
  },
  {
    id: "MKT-RULE-047",
    scenario: "城市分析",
    description: "同品牌密度警告规则：同品牌商圈内密度过高形成自我竞争",
    conditions: [
      { field: "same_brand_stores_same_trade_area", operator: ">", value: 2 },
    ],
    judgement: "同商圈内同一品牌超过 2 家 = 形成自我竞争，互相抢客",
    risk: "medium",
    recommendation: "同一商圈或 3 公里内不建议开超过 2 家同品牌门店",
    weight: 0.8,
    source: "cannibalization 效应 + 餐饮密度管理",
  },
  {
    id: "MKT-RULE-048",
    scenario: "城市分析",
    description: "品类城市饱和度矩阵：一/二线适合高端/新品类，三四线适合性价比品类",
    conditions: [
      { field: "city_tier", operator: "in", value: ["三线", "四线", "五线"] },
      { field: "category_avg_ticket", operator: ">", value: 100 },
      { field: "category_type", operator: "!=", value: "special_occasion" },
    ],
    judgement: "低线城市 + 高客单价非高频品类 = 下沉市场接受度低",
    risk: "high",
    recommendation: "低线城市更适合高频、高性价比品类；高端/低频品类留在一线",
    weight: 0.8,
    source: "城市消费分级 + 品类下沉适配模型",
  },

  // ═══════════════════════════════════════════
  // 进入风险评估规则 (MKT-053-MKT-060)
  // ═══════════════════════════════════════════

  {
    id: "MKT-RULE-053",
    scenario: "风险评估",
    description: "先发者优势窗口规则：首批进入者享有 12-18 个月心智占位期",
    conditions: [
      { field: "entry_order", operator: "=", value: "first_mover" },
      { field: "brand_building_speed", operator: "<", value: 3 },
    ],
    judgement: "先发进入但品牌建设速度慢 = 浪费先发优势窗口",
    risk: "medium",
    recommendation: "如果先发进入，必须在 12 个月内完成品类第一心智占领",
    weight: 0.8,
    source: "先发者优势理论 + 心智占位时间窗",
  },
  {
    id: "MKT-RULE-054",
    scenario: "风险评估",
    description: "进入时机三要素规则：市场、资源、能力三者缺一不可",
    conditions: [
      { field: "market_timing_score", operator: "<", value: 7 },
    ],
    judgement: "市场时机得分低于 7 = 存在至少一个关键要素不满足",
    risk: "high",
    recommendation: "计算市场时机三要素评分（市场 × 资源 × 能力），低于 7 不应进入",
    weight: 0.85,
    source: "McKinsey 战略时机三角模型",
  },
];
