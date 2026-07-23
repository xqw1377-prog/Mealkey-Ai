/**
 * Layer 2: RULE — 定位决策规则（30+）
 *
 * 蒸馏自里斯定位理论、叶茂中冲突理论，转化为可执行的决策规则。
 * 用于 M-PNT 的定位判断链和 DefaultJudgmentChain 的降级路径。
 *
 * 规则场景：品类选择、定位策略、价格带、客群定义、差异化、品牌命名、广告语
 */

import type { DecisionRule } from "../types";

export const POSITIONING_RULES: DecisionRule[] = [
  // ═══════════════════════════════════════════
  // 品类选择规则 (P001-P010)
  // ═══════════════════════════════════════════

  // ─── 定位基石：品类选择 ───
  {
    id: "POS-RULE-001",
    scenario: "品类选择",
    description: "品类匹配度规则：选择与创业者资源/经验匹配的品类",
    conditions: [
      { field: "experience_years", operator: "<", value: 2 },
      { field: "category_complexity", operator: ">", value: 3 },
    ],
    judgement: "经验不足2年 + 品类复杂度高 = 执行风险极高",
    risk: "high",
    recommendation: "选择标准化程度高、运营复杂度低的品类（面馆、小吃、快餐）",
    weight: 0.9,
    exceptions: ["有强大合伙人支持", "投入充足资本可聘请专业团队"],
    source: "里斯定位理论 + 30年餐饮经验",
  },
  {
    id: "POS-RULE-002",
    scenario: "品类选择",
    description: "品类生命周期规则：避免进入衰退期品类",
    conditions: [
      { field: "category_lifecycle", operator: "=", value: "decline" },
    ],
    judgement: "进入衰退期品类 = 市场在萎缩，增长空间有限",
    risk: "high",
    recommendation: "选择成长期或成熟早期的品类，有增长红利",
    weight: 0.85,
    source: "里斯品类定律",
  },
  {
    id: "POS-RULE-003",
    scenario: "品类选择",
    description: "品类心智空位规则：选择心智空位大的品类",
    conditions: [
      { field: "mental_steps", operator: ">", value: 3 },
      { field: "existing_brands", operator: ">", value: 5 },
    ],
    judgement: "心智阶梯超过3层 + 现有品牌超过5个 = 竞争激烈的红海",
    risk: "medium",
    recommendation: "要么在现有品类中找到心智空位（价格/场景/人群），要么开创新品类",
    weight: 0.8,
    source: "里斯心智阶梯定律",
  },
  {
    id: "POS-RULE-004",
    scenario: "品类选择",
    description: "品类与城市匹配规则：外来品类需要验证本地接受度",
    conditions: [
      { field: "category_origin", operator: "!=", value: "local" },
      { field: "city_tier", operator: "in", value: ["三线", "四线", "五线"] },
    ],
    judgement: "外来品类 + 低线城市 = 消费者教育成本高",
    risk: "medium",
    recommendation: "一线城市可接受外来品类，低线城市建议选择本地已有认知基础的品类",
    weight: 0.75,
    source: "定位理论 + 地域文化适配分析",
  },
  {
    id: "POS-RULE-005",
    scenario: "品类选择",
    description: "差异化空间规则：同品类密集区域必须有差异化",
    conditions: [
      { field: "same_category_density", operator: ">", value: 0.3 },
      { field: "differentiation_degree", operator: "<", value: 2 },
    ],
    judgement: "同品类密度超过30% + 差异化程度低 = 陷入价格战",
    risk: "high",
    recommendation: "找到至少2个维度的差异化（产品/场景/价格/模式），否则换区域或换品类",
    weight: 0.85,
    source: "里斯对立定律 + 叶茂中冲突理论",
  },
  {
    id: "POS-RULE-006",
    scenario: "品类选择",
    description: "开创品类可行性规则：开辟新品类需确认市场容量",
    conditions: [
      { field: "is_new_category", operator: "=", value: true },
      { field: "target_market_size", operator: "<", value: 100000000 },
    ],
    judgement: "新品类市场容量不足1亿 = 天花板太低，难以做大",
    risk: "medium",
    recommendation: "新品类要有足够大的潜在市场（至少5亿以上），否则只是小众生意",
    weight: 0.8,
    source: "里斯品类定律 - 新品类要有根",
  },
  {
    id: "POS-RULE-007",
    scenario: "品类选择",
    description: "网红品类风险规则：追逐热点品类需谨慎",
    conditions: [
      { field: "category_trend", operator: "=", value: "hot" },
      { field: "brand_building_capability", operator: "<", value: 3 },
    ],
    judgement: "网红品类热度高 + 品牌建设能力不足 = 热度消退后难以为继",
    risk: "high",
    recommendation: "如果进入网红品类，必须在热度期内完成品牌建设（产品壁垒+复购体系），否则不做",
    weight: 0.9,
    source: "叶茂中冲突理论 - 流量不等于复购",
  },

  // ═══════════════════════════════════════════
  // 定位策略规则 (P011-P020)
  // ═══════════════════════════════════════════

  {
    id: "POS-RULE-011",
    scenario: "定位策略",
    description: "心智聚焦规则：定位不能超过一个核心词",
    conditions: [
      { field: "positioning_keywords_count", operator: ">", value: 3 },
    ],
    judgement: "定位关键词超过3个 = 心智无法聚焦，等于没有定位",
    risk: "high",
    recommendation: "将定位提炼到一个核心词，所有经营动作围绕这个词展开",
    weight: 0.95,
    source: "里斯聚焦定律 + 心智厌恶混乱原理",
  },
  {
    id: "POS-RULE-012",
    scenario: "定位策略",
    description: "领导地位规则：如果已经是第一，强化第一认知",
    conditions: [
      { field: "market_rank", operator: "=", value: 1 },
      { field: "market_share", operator: ">", value: 0.2 },
    ],
    judgement: "市场第一 + 份额超20% = 应该强化领导地位定位",
    risk: "low",
    recommendation: "强化第一认知，建立品类标准，守护领导地位",
    weight: 0.9,
    source: "里斯领先定律",
  },
  {
    id: "POS-RULE-013",
    scenario: "定位策略",
    description: "跟随者定位规则：不做领导者的模仿者",
    conditions: [
      { field: "market_rank", operator: "!=", value: 1 },
      { field: "positioning_style", operator: "=", value: "follower" },
    ],
    judgement: "不是第一 + 采用跟随定位 = 被领导品牌压制，难以出头",
    risk: "high",
    recommendation: "寻找领导者的对立面（对立定律）或开创一个细分新品类",
    weight: 0.9,
    source: "里斯对立定律 + 跟随者空位法则",
  },
  {
    id: "POS-RULE-014",
    scenario: "定位策略",
    description: "重新定位规则：攻击领导者的固有弱点",
    conditions: [
      { field: "market_rank", operator: ">", value: 3 },
      { field: "has_clear_weakness", operator: "=", value: true },
    ],
    judgement: "排名3名以外 + 找到领导者固有弱点 = 重新定位的好机会",
    risk: "medium",
    recommendation: "不要攻击领导者的强势，而是攻击其强势背后的固有弱点",
    weight: 0.85,
    source: "里斯重新定位法则",
  },
  {
    id: "POS-RULE-015",
    scenario: "定位策略",
    description: "品类分化规则：创造新品类成为第一",
    conditions: [
      { field: "market_rank", operator: ">", value: 5 },
      { field: "category_differentiation_possible", operator: "=", value: true },
    ],
    judgement: "排名5名以外 + 品类可分化 = 开创新品类比在红海竞争更有效",
    risk: "medium",
    recommendation: "在现有品类基础上找到一个细分方向，成为这个细分品类的第一",
    weight: 0.85,
    source: "里斯品类定律 - 品类的起源",
  },
  {
    id: "POS-RULE-016",
    scenario: "定位策略",
    description: "品牌延伸风险规则：避免稀释核心定位",
    conditions: [
      { field: "brand_extension_count", operator: ">", value: 2 },
      { field: "brand_awareness", operator: "<", value: "high" },
    ],
    judgement: "品牌知名度不高 + 延伸超过2个品类 = 核心定位被稀释",
    risk: "high",
    recommendation: "在品牌做强之前，聚焦单一品类，不要做品牌延伸",
    weight: 0.9,
    source: "里斯延伸定律 - 品牌延伸会削弱核心定位",
  },

  // ═══════════════════════════════════════════
  // 价格带规则 (P021-P025)
  // ═══════════════════════════════════════════

  {
    id: "POS-RULE-021",
    scenario: "价格定位",
    description: "价格带匹配规则：价格带必须匹配目标客群消费力",
    conditions: [
      { field: "price_level", operator: "=", value: "high" },
      { field: "target_customer_income", operator: "<", value: 8000 },
    ],
    judgement: "高端定价 + 目标客群月收入低于8000 = 价格与消费力不匹配",
    risk: "high",
    recommendation: "客单价不应超过目标客群日均可支配收入的1.5倍",
    weight: 0.85,
    source: "里斯定位理论 - 价格空位法则",
  },
  {
    id: "POS-RULE-022",
    scenario: "价格定位",
    description: "高价定位前提规则：高价必须有信任状支撑",
    conditions: [
      { field: "price_level", operator: "=", value: "high" },
      { field: "trust_credential_strength", operator: "<", value: 3 },
    ],
    judgement: "高价定位 + 信任状不足 = 消费者认为不值这个价",
    risk: "high",
    recommendation: "高价定位必须有至少3个信任状：品牌故事、食材来源、工艺传承、名人背书等",
    weight: 0.9,
    source: "里斯信任状原则 + 叶茂中冲突理论",
  },
  {
    id: "POS-RULE-023",
    scenario: "价格定位",
    description: "低价定位前提规则：低价必须有成本优势",
    conditions: [
      { field: "price_level", operator: "=", value: "low" },
      { field: "cost_advantage", operator: "=", value: false },
    ],
    judgement: "低价定位 + 无成本优势 = 没有利润空间，不可持续",
    risk: "high",
    recommendation: "低价定位需要有成本结构支撑（供应链优势/极致效率/简化体验）",
    weight: 0.85,
    source: "里斯定位理论 - 低价空位法则",
  },
  {
    id: "POS-RULE-024",
    scenario: "价格定位",
    description: "价格-品类心智基准规则",
    conditions: [
      { field: "category", operator: "in", value: ["湘菜", "川菜", "家常菜"] },
      { field: "price_level", operator: "=", value: "high" },
      { field: "brand_power", operator: "<", value: 4 },
    ],
    judgement: "大众家常品类 + 高端价格 + 品牌力不足 = 消费者认知冲突",
    risk: "high",
    recommendation: "大众品类做高端需要极强的品牌故事支撑，否则消费者不买账",
    weight: 0.85,
    source: "长期行业观察",
  },

  // ═══════════════════════════════════════════
  // 客群定位规则 (P026-P030)
  // ═══════════════════════════════════════════

  {
    id: "POS-RULE-026",
    scenario: "客群定位",
    description: "客群聚焦规则：满足所有人 = 满足不了任何人",
    conditions: [
      { field: "target_customer_count", operator: ">", value: 3 },
      { field: "positioning_clarity", operator: "<", value: 3 },
    ],
    judgement: "目标客群超过3类 + 定位不清晰 = 心智无法建立明确认知",
    risk: "medium",
    recommendation: "先聚焦一个核心客群，把这一群人服务到极致",
    weight: 0.85,
    source: "里斯牺牲定律 - 有所失才能有所得",
  },
  {
    id: "POS-RULE-027",
    scenario: "客群定位",
    description: "客群-场景匹配规则：客群必须有明确的消费场景",
    conditions: [
      { field: "has_clear_scenario", operator: "=", value: false },
      { field: "target_customer_defined", operator: "=", value: true },
    ],
    judgement: "定义了目标客群但没有消费场景 = 消费者不知道什么时候该来",
    risk: "medium",
    recommendation: "定义客群的同时必须定义消费场景：什么人在什么情况下来吃什么",
    weight: 0.8,
    source: "叶茂中冲突理论 - 场景冲突",
  },

  // ═══════════════════════════════════════════
  // 差异化规则 (P031-P035)
  // ═══════════════════════════════════════════

  {
    id: "POS-RULE-031",
    scenario: "差异化策略",
    description: "差异化有效性规则：差异化必须让消费者感觉到不同",
    conditions: [
      { field: "differentiation_visible", operator: "=", value: false },
      { field: "differentiation_degree", operator: ">", value: 0 },
    ],
    judgement: "有差异化但消费者感觉不到 = 差异化无效",
    risk: "high",
    recommendation: "差异化必须可感知、可体验、可传播。消费者感受不到就不存在",
    weight: 0.9,
    source: "里斯定位理论 - 认知大于事实",
  },
  {
    id: "POS-RULE-032",
    scenario: "差异化策略",
    description: "差异化模仿壁垒规则：容易被复制的差异化不是壁垒",
    conditions: [
      { field: "imitation_difficulty", operator: "<", value: 3 },
      { field: "differentiation_degree", operator: ">", value: 0 },
    ],
    judgement: "差异化容易被复制 + 模仿难度低 = 不是真正的竞争壁垒",
    risk: "high",
    recommendation: "寻找难以复制的差异化（供应链/品牌认知/专利/位置/团队文化）",
    weight: 0.85,
    source: "里斯竞争理论",
  },
  {
    id: "POS-RULE-033",
    scenario: "差异化策略",
    description: "冲突型差异化规则：制造冲突比单纯差异化更有效",
    conditions: [
      { field: "conflict_created", operator: "=", value: true },
      { field: "conflict_authenticity", operator: ">", value: 3 },
    ],
    judgement: "制造了真实的冲突 = 差异化更容易被心智记住",
    risk: "low",
    recommendation: "通过制造冲突来建立差异化认知（如：服务vs产品、传统vs创新）",
    weight: 0.85,
    source: "叶茂中冲突理论 - 一流营销制造冲突",
  },

  // ═══════════════════════════════════════════
  // 品牌命名规则 (P036-P040)
  // ═══════════════════════════════════════════

  {
    id: "POS-RULE-036",
    scenario: "品牌命名",
    description: "品牌名长度规则：名字越短越容易记住",
    conditions: [
      { field: "brand_name_length", operator: ">", value: 4 },
    ],
    judgement: "品牌名超过4个字 = 传播成本增加",
    risk: "medium",
    recommendation: "品牌名控制在2-4个字最佳，朗朗上口，易于传播",
    weight: 0.7,
    source: "里斯命名法则",
  },
  {
    id: "POS-RULE-037",
    scenario: "品牌命名",
    description: "品牌名品类关联规则：好名字自带品类暗示",
    conditions: [
      { field: "name_category_relevance", operator: "<", value: 3 },
      { field: "brand_power", operator: "<", value: 4 },
    ],
    judgement: "品牌名与品类关联度低 + 品牌力不足 = 消费者不知道你卖什么",
    risk: "medium",
    recommendation: "新品牌取名至少让人猜到品类（如：XX鸡、XX鱼、XX火锅）",
    weight: 0.75,
    source: "里斯命名法则 + 叶茂中命名原则",
  },
  {
    id: "POS-RULE-038",
    scenario: "品牌命名",
    description: "品牌名冲突感规则：有冲突感的名字更易被记住",
    conditions: [
      { field: "name_conflict_feel", operator: "=", value: true },
      { field: "brand_power", operator: ">", value: 0 },
    ],
    judgement: "名字有冲突感（反差/争议/故事性）= 记忆度更高",
    risk: "low",
    recommendation: "名字如果能自带话题性和传播性，事半功倍",
    weight: 0.65,
    source: "叶茂中命名法则",
  },
  {
    id: "POS-RULE-039",
    scenario: "品牌命名",
    description: "品牌名避免生僻字规则",
    conditions: [
      { field: "has_rare_characters", operator: "=", value: true },
    ],
    judgement: "品牌名含生僻字 = 传播障碍，消费者不知道怎么写怎么读",
    risk: "medium",
    recommendation: "使用常见字，确保100%的人能读对、能写出来",
    weight: 0.8,
    source: "里斯命名法则",
  },

  // ═══════════════════════════════════════════
  // 广告语规则 (P041-P045)
  // ═══════════════════════════════════════════

  {
    id: "POS-RULE-041",
    scenario: "广告语",
    description: "广告语独特性规则：广告语必须与竞争对手不同",
    conditions: [
      { field: "slogan_competitor_similarity", operator: ">", value: 3 },
    ],
    judgement: "广告语与竞品相似度太高 = 消费者无法区分",
    risk: "medium",
    recommendation: "检查竞争对手的广告语，确保你的广告语是独特的",
    weight: 0.85,
    source: "里斯专有定律",
  },
  {
    id: "POS-RULE-042",
    scenario: "广告语",
    description: "广告语行动指令规则：好的广告语包含行动指令",
    conditions: [
      { field: "has_action_command", operator: "=", value: false },
      { field: "slogan_memorability", operator: "<", value: 3 },
    ],
    judgement: "广告语没有行动指令 = 消费者不知道该怎么做",
    risk: "medium",
    recommendation: "广告语最好包含明确的行动指令（尝尝/来/选/吃…）",
    weight: 0.7,
    source: "叶茂中广告语法则",
  },
  {
    id: "POS-RULE-043",
    scenario: "广告语",
    description: "广告语信任状规则：广告语中最好包含信任状",
    conditions: [
      { field: "has_credential", operator: "=", value: false },
      { field: "brand_power", operator: "<", value: 4 },
    ],
    judgement: "新品牌广告语没有信任状 = 空口无凭，消费者不信",
    risk: "medium",
    recommendation: "新品牌广告语最好包含可验证的信任状（销量/历史/认证）",
    weight: 0.75,
    source: "里斯信任状原则",
  },
];
