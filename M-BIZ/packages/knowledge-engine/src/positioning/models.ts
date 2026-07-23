/**
 * Layer 4: MODEL — 定位分析模型（7个）
 *
 * 蒸馏自里斯/特劳特定位理论和叶茂中冲突理论，
 * 转化为可计算的分析模型。
 *
 * 每种模型包含：参数 → 公式 → 基准 → 适用场景
 */

import type { BusinessModel } from "../types";

export const POSITIONING_MODELS: BusinessModel[] = [
  // ═══════════════════════════════════════════
  // M1: 品类吸引力评估模型
  // ═══════════════════════════════════════════

  {
    id: "POS-MODEL-001",
    name: "品类吸引力评估模型",
    category: "positioning",
    description: "里斯品类定律数字化：评估一个品类的进入吸引力，帮助创业者判断是否值得进入该品类。",
    parameters: [
      { name: "market_growth_rate", description: "品类年增长率", unit: "%" },
      { name: "market_size", description: "品类的市场总规模", unit: "亿" },
      { name: "competition_intensity", description: "竞争饱和度（1-10，越高越饱和）", unit: "" },
      { name: "differentiation_space", description: "差异化空间（1-10，越大空间越大）", unit: "" },
      { name: "experience_match", description: "与创业者经验匹配度（1-10）", unit: "" },
      { name: "standardization_level", description: "品类标准化难度（1-10，越高越难）", unit: "" },
    ],
    formula: "吸引力总分 = (市场增长率×20%) + (市场规模评分×15%) + (竞争饱和度反向×25%) + (差异化空间×20%) + (经验匹配度×10%) + (标准化反向×10%)",
    benchmarks: {
      excellent: 80,  // 80分以上强烈推荐
      good: 65,       // 65分以上可以考虑
      fair: 50,       // 50分以上谨慎
      poor: 0,        // 50分以下不建议
    },
    applicableScenarios: ["品类选择", "投资决策", "项目评估"],
    source: "里斯品类定律 + 餐饮经营模型",
  },

  // ═══════════════════════════════════════════
  // M2: 心智空位识别模型
  // ═══════════════════════════════════════════

  {
    id: "POS-MODEL-002",
    name: "心智空位识别模型",
    category: "positioning",
    description: "基于心智阶梯定律，分析在给定品类和市场中，还有哪些心智空位可以利用。",
    parameters: [
      { name: "existing_brands", description: "心智中已有的品牌数量", unit: "个" },
      { name: "positioning_dimensions", description: "可用的定位维度数（价格/场景/人群/功能）", unit: "" },
      { name: "dimension_gap", description: "未占据的维度数量", unit: "" },
      { name: "gap_market_size", description: "空位的潜在市场规模", unit: "亿" },
      { name: "resource_match", description: "资源匹配度（1-10）", unit: "" },
    ],
    formula: "空位可行性 = 可用维度数 × 未占据维度比例 × 空位市场规模评分 × 资源匹配度",
    benchmarks: {
      excellent: 70,  // 大机会
      good: 50,       // 可尝试
      fair: 30,       // 机会有限
      poor: 0,        // 基本没有心智空位
    },
    applicableScenarios: ["定位策略", "竞争分析", "品类选择"],
    source: "里斯心智阶梯定律 + 空位法则",
  },

  // ═══════════════════════════════════════════
  // M3: 冲突强度评估模型
  // ═══════════════════════════════════════════

  {
    id: "POS-MODEL-003",
    name: "冲突强度评估模型",
    category: "positioning",
    description: "叶茂中冲突理论数字化：评估消费者在某个消费场景下的冲突强度，冲突越大=机会越大。",
    parameters: [
      { name: "pain_frequency", description: "消费者痛点发生频率（1-10）", unit: "" },
      { name: "pain_intensity", description: "痛点强度（1-10，越痛越大）", unit: "" },
      { name: "current_solution_satisfaction", description: "现有解决方案满意度（1-10）", unit: "" },
      { name: "awareness_level", description: "消费者意识到这个冲突的程度（1-10）", unit: "" },
      { name: "willingness_to_pay", description: "解决这个冲突的支付意愿（1-10）", unit: "" },
    ],
    formula: "冲突强度 = 痛点频率×25% + 痛点强度×30% + (10-现有满意度)×20% + 认知度×15% + 支付意愿×10%",
    benchmarks: {
      explosive: 80,  // 80+ 爆炸性机会
      big: 65,        // 65+ 大机会
      moderate: 50,   // 50+ 可做
      small: 0,       // 50以下 机会小
    },
    applicableScenarios: ["定位策略", "品类选择", "市场分析"],
    source: "叶茂中冲突理论",
  },

  // ═══════════════════════════════════════════
  // M4: 定位清晰度评估模型
  // ═══════════════════════════════════════════

  {
    id: "POS-MODEL-004",
    name: "定位清晰度评估模型",
    category: "positioning",
    description: "里斯聚焦定律：评估品牌当前的定位清晰度，帮助确定是否需要调整定位。",
    parameters: [
      { name: "keyword_count", description: "定位关键词数量（理想=1-3个）", unit: "个" },
      { name: "consumer_understanding", description: "消费者能否3秒说清你是做什么的（1-10）", unit: "" },
      { name: "competitor_distinction", description: "与竞争对手的差异度（1-10）", unit: "" },
      { name: "slogan_memorability", description: "广告语记忆度（1-10）", unit: "" },
      { name: "consistency_level", description: "所有经营动作的一致性（1-10）", unit: "" },
    ],
    formula: "定位清晰度 = (10-关键词超3部分)×10% + 消费者理解度×30% + 差异化度×25% + 广告语记忆度×15% + 一致性×20%",
    benchmarks: {
      very_clear: 80,   // 80+ 定位非常清晰
      clear: 65,        // 65+ 定位基本清晰
      fuzzy: 50,        // 50+ 定位模糊，需要调整
      confused: 0,      // 50以下 定位混乱，急需重新定位
    },
    applicableScenarios: ["品牌诊断", "定位审计", "品牌升级"],
    source: "里斯聚焦定律 + 22条商规",
  },

  // ═══════════════════════════════════════════
  // M5: 差异化可行性评估模型
  // ═══════════════════════════════════════════

  {
    id: "POS-MODEL-005",
    name: "差异化可行性评估模型",
    category: "positioning",
    description: "评估一个差异化策略是否可行的综合模型，包括消费者感知、运营可行性和竞争壁垒。",
    parameters: [
      { name: "consumer_perceivable", description: "消费者能否感知到差异化（1-10）", unit: "" },
      { name: "consumer_value", description: "消费者认为这个差异有价值吗（1-10）", unit: "" },
      { name: "operational_feasibility", description: "运营可行性（1-10）", unit: "" },
      { name: "imitation_barrier", description: "被模仿的难度（1-10，越高越难模仿）", unit: "" },
      { name: "cost_impact", description: "差异化的成本影响（1-10，越高成本越高）", unit: "" },
      { name: "story_power", description: "差异化的故事性/传播性（1-10）", unit: "" },
    ],
    formula: "差异化可行性 = 消费者感知×20% + 消费者价值×20% + 运营可行性×20% + 模仿壁垒×20% + (10-成本影响)×10% + 故事性×10%",
    benchmarks: {
      excellent: 75,  // 强差异化，果断执行
      good: 60,       // 可行差异化，可以执行
      marginal: 45,   // 边缘差异化，需要改进
      weak: 0,        // 差异化太弱，换个方向
    },
    applicableScenarios: ["差异化策略", "产品创新", "定位策略"],
    source: "里斯对立定律 + 叶茂中冲突理论",
  },

  // ═══════════════════════════════════════════
  // M6: 价格带决策模型
  // ═══════════════════════════════════════════

  {
    id: "POS-MODEL-006",
    name: "价格带决策模型",
    category: "pricing",
    description: "基于品类、城市、客群、成本结构，推荐最优的价格带定位。融合里斯价格空位理论和财务模型。",
    parameters: [
      { name: "category", description: "品类名称", unit: "" },
      { name: "city_tier", description: "城市等级（一线/二线/三线/四线）", unit: "" },
      { name: "target_income", description: "目标客群月收入", unit: "元" },
      { name: "food_cost_per_person", description: "人均食材成本", unit: "元" },
      { name: "expected_turnover", description: "预期翻台率", unit: "次/天" },
      { name: "area", description: "面积", unit: "㎡" },
    ],
    formula: "建议客单价 = max(食材成本/30%, 目标客群日收入×1.5) \n价格带判断：客单价/城市基准价 < 0.7=低价 0.7-1.3=中价 >1.3=高价",
    benchmarks: {
      low_price: 0.7,   // 低于基准价70%为低价
      mid_price: 1.0,   // 基准价为中价
      high_price: 1.3,  // 高于基准价130%为高价
    },
    applicableScenarios: ["定价策略", "菜单设计", "位置评估"],
    source: "里斯价格空位法则 + 餐饮成本模型",
  },

  // ═══════════════════════════════════════════
  // M7: 重新定位风险/收益评估模型
  // ═══════════════════════════════════════════

  {
    id: "POS-MODEL-007",
    name: "重新定位风险/收益评估模型",
    category: "positioning",
    description: "评估重新定位的风险和潜在收益，帮助决定是否进行重新定位。基于里斯重新定位理论。",
    parameters: [
      { name: "current_position_strength", description: "当前定位在心智中的强度（1-10）", unit: "" },
      { name: "competitor_weakness_visibility", description: "竞争弱点的明显程度（1-10）", unit: "" },
      { name: "new_position_differentiation", description: "新定位的差异化程度（1-10）", unit: "" },
      { name: "resource_requirement", description: "重新定位需要的资源（1-10）", unit: "" },
      { name: "consumer_switching_cost", description: "消费者转换认知的成本（1-10）", unit: "" },
      { name: "execution_risk", description: "执行风险（1-10，越高越难执行）", unit: "" },
    ],
    formula: "重新定位价值 = 竞争弱点可见度×25% + 新定位差异化×25% - 当前定位强度×15% - 资源需求×10% - 转换成本×15% - 执行风险×10%",
    benchmarks: {
      high_value: 30,    // 30+ 强烈建议重新定位
      medium_value: 10,  // 10+ 可以考虑
      low_value: -10,    // -10~10 需谨慎
      negative: 0,       // 0以下不建议重新定位
    },
    applicableScenarios: ["品牌升级", "重新定位", "竞争反击"],
    source: "里斯重新定位理论 + 特劳特四步法",
  },
];
