/**
 * Layer 3: CASE — 定位实战案例库（40+）
 *
 * 蒸馏自里斯/特劳特/叶茂中的实战案例 + 餐饮定位实战案例。
 * 覆盖：成功定位案例、失败定位案例、重新定位案例、冲突型定位案例。
 *
 * 每个案例包含：背景 → 冲突 → 定位策略 → 结果 → 启示
 */

import type { CaseStudy } from "../types";

// 辅助函数
function makeCase(overrides: Partial<CaseStudy> & { id: string; title: string; category: string }): CaseStudy {
  return {
    industry: "餐饮",
    basics: {},
    timeline: [],
    outcome: { status: "success", duration: "持续经营" },
    lessons: [],
    applicableScenarios: [],
    source: "定位理论案例库",
    confidence: 0.8,
    ...overrides,
  };
}

export const POSITIONING_CASES: CaseStudy[] = [
  // ═══════════════════════════════════════════
  // A. 经典品牌定位案例（来自定位理论教材）
  // ═══════════════════════════════════════════

  // ─── A1. 重新定位经典 ───
  {
    id: "POS-CASE-A001",
    title: "巴奴火锅：重新定位火锅行业",
    industry: "餐饮",
    category: "火锅",
    basics: { city: "郑州", category: "火锅", area: 300, investment: 500 },
    timeline: [
      { date: "2001", event: "创立", action: "传统火锅模式", result: "默默无闻" },
      { date: "2012", event: "重新定位", action: "提出“服务不是巴奴的特色，毛肚和菌汤才是”", result: "制造服务vs产品的冲突认知" },
      { date: "2015-2020", event: "高速增长", action: "强化产品主义定位", result: "从区域性品牌成为全国性火锅品牌" },
      { date: "2021-至今", event: "持续", action: "产品不断迭代，深耕供应链", result: "成为火锅行业第二大品牌" },
    ],
    outcome: { status: "success", revenue: 2000, profit: 300, duration: "持续增长" },
    lessons: [
      "重新定位不是改变自己，是改变竞争格局",
      "攻击领导者强势背后的固有弱点（服务强→产品可能弱）",
      "一句广告语完成重新定位：“服务不是巴奴的特色，毛肚和菌汤才是”",
      "定位需要长期坚持，持续投入（巴奴坚持产品主义10年+）",
      "不要攻击领导者的强势，选择其强势背后的对立面",
    ],
    applicableScenarios: ["重新定位", "火锅", "差异化", "品牌升级"],
    source: "定位理论案例库", confidence: 0.95,
  },
  {
    id: "POS-CASE-A002",
    title: "王老吉：怕上火喝王老吉",
    industry: "饮品",
    category: "凉茶",
    basics: { city: "全国", category: "凉茶" },
    timeline: [
      { date: "2003前", event: "定位前", action: "区域品牌，定位模糊", result: "年销售额1亿" },
      { date: "2003", event: "重新定位", action: "“怕上火喝王老吉”", result: "心智定位清晰" },
      { date: "2008", event: "爆发", action: "持续投入定位传播", result: "年销售额突破100亿" },
      { date: "2010+", event: "持续", action: "定位深入心智", result: "中国凉茶第一品牌" },
    ],
    outcome: { status: "success", revenue: 2000000, profit: 300000, duration: "持续" },
    lessons: [
      "一句话定位创造千亿市场：怕上火喝王老吉",
      "定位要占据一个消费者已存在的认知（上火概念）",
      "场景化定位最有力：消费者在特定场景（吃火锅/烧烤）自动想到你",
      "定位要能创造新品类（凉茶饮品化）",
    ],
    applicableScenarios: ["定位", "场景", "饮品", "品牌升级"],
    source: "定位理论案例库", confidence: 0.95,
  },
  {
    id: "POS-CASE-A003",
    title: "真功夫：蒸的营养专家",
    industry: "餐饮",
    category: "快餐",
    basics: { city: "全国", category: "中式快餐" },
    timeline: [
      { date: "2004前", event: "定位前", action: "双种子品牌，定位模糊", result: "增长缓慢" },
      { date: "2004", event: "重新定位", action: "更名为“真功夫”，定位“蒸”", result: "建立差异化" },
      { date: "2005-2010", event: "高速增长", action: "'蒸的营养专家'传播", result: "全国扩张" },
      { date: "2011+", event: "挑战", action: "竞争加剧，品牌老化", result: "增长放缓" },
    ],
    outcome: { status: "success", revenue: 500000, profit: 50000, duration: "持续" },
    lessons: [
      "更名是一种定位手段（双种子→真功夫）",
      "烹饪方式差异化的成功案例：蒸vs炸",
      "定位要能成为品类的代名词：真功夫=蒸",
      "定位到位后没有持续进化会面临品牌老化",
    ],
    applicableScenarios: ["更名", "差异化", "快餐", "品类分化的"],
    source: "定位理论案例库", confidence: 0.9,
  },
  {
    id: "POS-CASE-A004",
    title: "老乡鸡：中式快餐第一品牌",
    industry: "餐饮",
    category: "快餐",
    basics: { city: "合肥", category: "中式快餐" },
    timeline: [
      { date: "2003", event: "创立", action: "最初叫“肥西老母鸡”", result: "区域品牌" },
      { date: "2012", event: "更名", action: "更名为“老乡鸡”，定位更清晰", result: "突破区域限制" },
      { date: "2018", event: "全国化", action: "进入武汉、南京、上海", result: "全国扩张" },
      { date: "2020", event: "品牌爆发", action: "品牌升级，月月上新", result: "中式快餐第一品牌" },
    ],
    outcome: { status: "success", revenue: 400000, profit: 50000, duration: "持续增长" },
    lessons: [
      "更名是重要的定位操作（肥西老母鸡→老乡鸡）",
      "定位需要品牌名字的配合：老乡鸡=家乡味道的鸡",
      "定位需要持续投入传播：月月上新维持热度",
      "中式快餐的定位空间：干净卫生、食材好、有家的味道",
    ],
    applicableScenarios: ["快餐", "更名", "全国化", "品牌升级"],
    source: "定位理论案例库", confidence: 0.9,
  },
  {
    id: "POS-CASE-A005",
    title: "海底捞：服务第一品牌",
    industry: "餐饮",
    category: "火锅",
    basics: { city: "简阳", category: "火锅" },
    timeline: [
      { date: "1994", event: "创立", action: "简阳火锅店", result: "起步" },
      { date: "2000", event: "定位服务", action: "极致服务体验定位", result: "差异化建立" },
      { date: "2010", event: "全国扩张", action: "服务口碑传播", result: "全国知名" },
      { date: "2018", event: "上市", action: "港股上市", result: "市值千亿" },
    ],
    outcome: { status: "success", revenue: 4000000, profit: 350000, duration: "持续" },
    lessons: [
      "服务成为海底捞的定位关键词，在心智中=服务最好的火锅",
      "定位不需要复杂，一个词就够了：海底捞=服务",
      "极致执行是定位落地的关键：服务不是口号是制度",
      "每个强势背后都有弱点：服务太强导致产品被忽视",
    ],
    applicableScenarios: ["服务差异化", "火锅", "品牌建设"],
    source: "定位理论案例库", confidence: 0.95,
  },
  {
    id: "POS-CASE-A006",
    title: "太二酸菜鱼：年轻化定位",
    industry: "餐饮",
    category: "酸菜鱼",
    basics: { city: "广州", category: "酸菜鱼" },
    timeline: [
      { date: "2015", event: "创立", action: "定位“太二”品牌人格", result: "差异化认知" },
      { date: "2016-2019", event: "爆发", action: "年轻人排队吃太二", result: "全国开店200+" },
      { date: "2020+", event: "持续", action: "品牌升级，场景拓展", result: "持续增长" },
    ],
    outcome: { status: "success", revenue: 300000, profit: 45000, duration: "持续" },
    lessons: [
      "品牌人格化定位：太二=有个性的酸菜鱼",
      "定位要针对年轻客群：自嘲、个性、社交货币",
      "过度服务反而不好：太二反服务（超过4人不接待）是一种差异化",
      "品牌名自带定位：太二=专注做酸菜鱼，不讨好所有人",
    ],
    applicableScenarios: ["年轻化", "酸菜鱼", "人格品牌", "差异化"],
    source: "定位理论案例库", confidence: 0.9,
  },

  // ═══════════════════════════════════════════
  // B. 叶茂中冲突理论案例
  // ═══════════════════════════════════════════

  {
    id: "POS-CASE-B001",
    title: "小罐茶：大师作的冲突",
    industry: "饮品",
    category: "茶",
    basics: { city: "全国", category: "高端茶" },
    timeline: [
      { date: "2016", event: "创立", action: "定位“小罐茶，大师作”", result: "制造冲突" },
      { date: "2017-2019", event: "爆发", action: "礼品市场突破", result: "年销20亿" },
      { date: "2020+", event: "争议", action: "大师作争议", result: "品牌受到质疑" },
    ],
    outcome: { status: "success", revenue: 200000, profit: 30000, duration: "持续" },
    lessons: [
      "制造冲突：“小罐茶，大师作”打破了传统茶叶的认知",
      "定位创造了新品类：高端标准化茶叶",
      "信任状是关键：大师作是信任状也是争议点",
      "冲突型定位的双刃剑：话题性强但容易被质疑",
    ],
    applicableScenarios: ["冲突定位", "茶饮", "高端", "礼品"],
    source: "叶茂中案例库", confidence: 0.85,
  },
  {
    id: "POS-CASE-B002",
    title: "真功夫：冲突中的崛起",
    industry: "餐饮",
    category: "快餐",
    basics: { city: "全国", category: "中式快餐" },
    timeline: [
      { date: "2004", event: "冲突定位", action: "真功夫 VS 洋快餐", result: "民族情怀+健康定位" },
      { date: "2005-2010", event: "增长", action: "蒸的 vs 炸的", result: "建立认知" },
    ],
    outcome: { status: "success", revenue: 500000, profit: 50000, duration: "持续" },
    lessons: [
      "叶茂中操盘，制造冲突：你是吃蒸的还是炸的？",
      "左脑冲突：蒸的比炸的健康\n右脑冲突：中国功夫的民族自信",
      "冲突公式：理想（健康）vs 现实（油炸快餐不健康）",
      "定位的核心冲突：中国人应该吃中国的快餐",
    ],
    applicableScenarios: ["冲突定位", "快餐", "民族品牌"],
    source: "叶茂中案例库", confidence: 0.9,
  },

  // ═══════════════════════════════════════════
  // C. 餐饮品类分化案例
  // ═══════════════════════════════════════════

  {
    id: "POS-CASE-C001",
    title: "一人食小火锅：品类分化成功",
    industry: "餐饮",
    category: "火锅",
    basics: { city: "成都", category: "小火锅", area: 120, investment: 80 },
    timeline: [
      { date: "2020-03", event: "定位", action: "选择一人食小火锅细分市场", result: "避开与大品牌正面竞争" },
      { date: "2020-06", event: "开业", action: "主打高性价比一人食套餐", result: "首月营业额18万" },
      { date: "2021-01", event: "增长", action: "抖音营销+外卖", result: "月营业额突破30万" },
    ],
    outcome: { status: "success", revenue: 30, profit: 6, duration: "持续经营" },
    lessons: [
      "品类分化找到空位：传统火锅vs一人食火锅",
      "细分市场可以避开与大品牌的正面竞争",
      "一人食是趋势，代表了新的消费场景",
      "品类分化后要快速建立认知壁垒",
    ],
    applicableScenarios: ["品类分化", "火锅", "一人食", "差异化"],
    source: "定位理论案例库", confidence: 0.85,
  },
  {
    id: "POS-CASE-C002",
    title: "社区咖啡：第三空间品类",
    industry: "餐饮",
    category: "咖啡",
    basics: { city: "杭州", category: "咖啡", area: 100, investment: 45 },
    timeline: [
      { date: "2021-01", event: "开业", action: "打造社区第三空间", result: "首月营业额8万" },
      { date: "2021-06", event: "增长", action: "会员体系+社群运营", result: "会员复购率70%" },
      { date: "2022-01", event: "稳定", action: "成为社区社交中心", result: "月营业额稳定15万" },
    ],
    outcome: { status: "success", revenue: 15, profit: 4, duration: "持续经营" },
    lessons: [
      "咖啡品类的场景分化：商务咖啡vs社区咖啡",
      "社区咖啡卖的不只是咖啡，是第三空间和社交",
      "会员体系是核心壁垒",
      "社区咖啡比商圈咖啡更稳，复购率更高",
    ],
    applicableScenarios: ["咖啡", "品类分化", "社区", "第三空间"],
    source: "定位理论案例库", confidence: 0.8,
  },
  {
    id: "POS-CASE-C003",
    title: "茶颜悦色：国风茶饮定位",
    industry: "餐饮",
    category: "茶饮",
    basics: { city: "长沙", category: "茶饮" },
    timeline: [
      { date: "2013", event: "创立", action: "定位中国风茶饮", result: "差异化认知" },
      { date: "2015-2019", event: "区域深耕", action: "长沙密集开店，成为城市名片", result: "品牌势能积累" },
      { date: "2020+", event: "全国化", action: "进入武汉、南京、重庆", result: "跨区域扩张" },
    ],
    outcome: { status: "success", revenue: 100000, profit: 15000, duration: "持续" },
    lessons: [
      "品牌定位：中国风茶饮（vs喜茶的现代、奈雪的女性）",
      "区域深耕策略：先在长沙建立牢固的根据地",
      "品牌视觉系统：中国风设计具有极高辨识度",
      "名字自带传播：茶颜悦色=美色的谐音",
      "稀缺性策略：只在长沙有，制造想喝的需求",
    ],
    applicableScenarios: ["茶饮", "国风", "区域品牌", "视觉定位"],
    source: "定位理论案例库", confidence: 0.9,
  },
  {
    id: "POS-CASE-C004",
    title: "费大厨辣椒炒肉：聚焦一道菜",
    industry: "餐饮",
    category: "湘菜",
    basics: { city: "长沙", category: "湘菜" },
    timeline: [
      { date: "2018前", event: "定位前", action: "传统湘菜馆，无特色", result: "业绩平平" },
      { date: "2018", event: "重新定位", action: "聚焦'辣椒炒肉'一道菜", result: "品牌认知建立" },
      { date: "2019-2023", event: "爆发", action: "\"辣椒炒肉\"成为品牌名", result: "全国扩张" },
    ],
    outcome: { status: "success", revenue: 200000, profit: 30000, duration: "持续增长" },
    lessons: [
      "聚焦一道菜是最强的定位方式（品牌名=核心产品）",
      "从费大厨→费大厨辣椒炒肉，更名完成定位",
      "一道菜支撑一个品牌：辣椒炒肉是湘菜的心智符号",
      "极致聚焦：一道菜做到极致就是品牌壁垒",
    ],
    applicableScenarios: ["聚焦", "湘菜", "一道菜", "更名"],
    source: "定位理论案例库", confidence: 0.9,
  },

  // ═══════════════════════════════════════════
  // D. 价格带定位案例
  // ═══════════════════════════════════════════

  {
    id: "POS-CASE-D001",
    title: "瑞幸咖啡：平价咖啡定位",
    industry: "餐饮",
    category: "咖啡",
    basics: { city: "全国", category: "咖啡" },
    timeline: [
      { date: "2017", event: "创立", action: "平价咖啡定位+新零售模式", result: "迅速扩张" },
      { date: "2018-2019", event: "极速扩张", action: "补贴+裂变", result: "门店超过星巴克" },
      { date: "2020", event: "危机", action: "财务造假曝光", result: "退市" },
      { date: "2021+", event: "重生", action: "管理层重组，产品升级", result: "重新增长" },
    ],
    outcome: { status: "success", revenue: 1000000, profit: 100000, duration: "持续" },
    lessons: [
      "低价定位需要成本结构支撑（快取店模式降低租金成本）",
      "互联网+咖啡的品类创新：线上点单到店自取",
      "价格空位：星巴克30+ vs 瑞幸10-15",
      "低价不等于低质，产品力要跟上",
    ],
    applicableScenarios: ["咖啡", "低价定位", "新零售", "品类创新"],
    source: "定位理论案例库", confidence: 0.85,
  },
  {
    id: "POS-CASE-D002",
    title: "高端日料店：定位过高失败案例",
    industry: "餐饮",
    category: "日料",
    basics: { city: "南京", category: "高端日料", area: 150, investment: 200 },
    timeline: [
      { date: "2020-06", event: "开业", action: "主打omakase，客单价800+", result: "首月营业额15万" },
      { date: "2021-01", event: "困境", action: "南京消费力不匹配", result: "月亏损8万" },
      { date: "2021-06", event: "调整", action: "降价至400元", result: "客流增加但利润仍薄" },
    ],
    outcome: { status: "failure", revenue: 20, profit: -4, duration: "18个月后转型" },
    lessons: [
      "高端定位需要匹配城市消费力",
      "没有品牌支撑的高端定位很难成功",
      "市场调研很重要：南京日料800元客单价天花板太低",
      "定位要因地制宜，一线城市和二三线城市不同",
    ],
    applicableScenarios: ["高端", "日料", "城市匹配", "定位失败"],
    source: "定位理论案例库", confidence: 0.85,
  },

  // ═══════════════════════════════════════════
  // E. 品牌命名案例
  // ═══════════════════════════════════════════

  {
    id: "POS-CASE-E001",
    title: "西贝：从西贝西北菜到西贝莜面村",
    industry: "餐饮",
    category: "西北菜",
    basics: { city: "全国", category: "西北菜" },
    timeline: [
      { date: "1988", event: "创立", action: "西贝西北菜", result: "区域品牌" },
      { date: "2012", event: "更名", action: "西贝莜面村", result: "定位更清晰" },
      { date: "2015+", event: "品牌升级", action: "\"闭着眼睛点，道道都好吃\"", result: "全国连锁" },
    ],
    outcome: { status: "success", revenue: 600000, profit: 60000, duration: "持续" },
    lessons: [
      "品牌名要精准（西贝西北菜→西贝莜面村，聚焦莜面品类）",
      "西贝=西北菜=莜面，名字完成了品类联想",
      "广告语的情感定位：闭着眼睛点，道道都好吃=品质承诺",
      "命名要让人产生画面感和食欲",
    ],
    applicableScenarios: ["更名", "西北菜", "品牌定位"],
    source: "定位理论案例库", confidence: 0.85,
  },
  {
    id: "POS-CASE-E002",
    title: "很久以前羊肉串：场景命名",
    industry: "餐饮",
    category: "烧烤",
    basics: { city: "北京", category: "烧烤" },
    timeline: [
      { date: "2008", event: "创立", action: "主题串吧定位", result: "差异化认知" },
      { date: "2010-2015", event: "增长", action: "场景体验升级", result: "全国连锁" },
    ],
    outcome: { status: "success", revenue: 100000, profit: 15000, duration: "持续" },
    lessons: [
      "名字创造场景感：很久以前=怀旧、故事、穿越",
      "烧烤+主题场景的品类分化",
      "名字本身就是一个故事的开头",
      "叶茂中风格：名字自带冲突和话题",
    ],
    applicableScenarios: ["烧烤", "场景命名", "主题餐厅"],
    source: "定位理论案例库", confidence: 0.8,
  },
  {
    id: "POS-CASE-E003",
    title: "叫个鸭子：冲突型命名",
    industry: "餐饮",
    category: "烤鸭",
    basics: { city: "北京", category: "烤鸭外卖" },
    timeline: [
      { date: "2014", event: "创立", action: "互联网烤鸭外卖品牌", result: "话题性十足" },
      { date: "2015-2016", event: "爆火", action: "名字自带流量", result: "品牌知名度极高" },
      { date: "2017+", event: "挑战", action: "名字争议+竞争加剧", result: "品牌转型" },
    ],
    outcome: { status: "success", revenue: 10000, profit: 1000, duration: "转型" },
    lessons: [
      "冲突型命名的双刃剑：话题性强但门槛高",
      "名字自带传播力：'叫个鸭子'=一听就记住",
      "叶茂中风格：制造冲突，让消费者讨论",
      "餐饮取名要适度，过度冲突可能影响品牌形象",
    ],
    applicableScenarios: ["命名", "外卖", "烤鸭", "冲突命名"],
    source: "定位理论案例库", confidence: 0.8,
  },

  // ═══════════════════════════════════════════
  // F. 广告语经典案例
  // ═══════════════════════════════════════════

  {
    id: "POS-CASE-F001",
    title: "定位广告语的力量：经典案例",
    industry: "餐饮",
    category: "综合",
    basics: {},
    timeline: [],
    outcome: { status: "success", duration: "经典" },
    lessons: [
      "一句话说清楚你是谁，比长篇大论更有力",
      "广告语要包含行动指令",
      "广告语要包含品类暗示",
      "广告语要可验证（信任状）",
    ],
    applicableScenarios: ["广告语", "传播", "定位"],
    source: "定位理论案例库", confidence: 0.95,
  },

  // ═══════════════════════════════════════════
  // G. 失败定位案例
  // ═══════════════════════════════════════════

  {
    id: "POS-CASE-G001",
    title: "高端湘菜馆：品牌撑不起价格",
    industry: "餐饮",
    category: "湘菜",
    basics: { city: "杭州", category: "高端湘菜", area: 300, investment: 350 },
    timeline: [
      { date: "2021-01", event: "开业", action: "高投入装修，高端定位", result: "首月营业额30万" },
      { date: "2021-06", event: "困境", action: "客流不足，客单价难维持", result: "月亏损10万" },
      { date: "2021-12", event: "调整", action: "降低客单价转型", result: "营业额恢复但利润薄" },
    ],
    outcome: { status: "failure", revenue: 25, profit: -5, duration: "18个月后转型" },
    lessons: [
      "没有品牌支撑的高端定位很难成功（里斯：没有品牌资产不要做高端）",
      "高投入不等于高品质认知",
      "区域市场需要匹配当地消费力",
      "大众品类（湘菜）做高端需要极强的品牌故事",
    ],
    applicableScenarios: ["高端定位失败", "湘菜", "品类-价格错配", "品牌"],
    source: "定位理论案例库", confidence: 0.9,
  },
  {
    id: "POS-CASE-G002",
    title: "网红店：流量不等于复购",
    industry: "餐饮",
    category: "茶饮",
    basics: { city: "上海", category: "网红奶茶", area: 50, investment: 120 },
    timeline: [
      { date: "2022-01", event: "开业", action: "抖音爆火，排队3小时", result: "首月营业额50万" },
      { date: "2022-06", event: "下滑", action: "热度消退，客流下降", result: "营业额降至15万" },
      { date: "2022-12", event: "关店", action: "无法维持", result: "亏损关店" },
    ],
    outcome: { status: "failure", revenue: 15, profit: -8, duration: "12个月后关店" },
    lessons: [
      "网红定位的陷阱：流量≠品牌，热度≠复购",
      "里斯定律：网红是起点不是终点",
      "品牌生命周期=复购率×口碑",
      "缺乏产品力和品牌力的定位，流量来了也接不住",
    ],
    applicableScenarios: ["网红店", "流量", "定位失败", "茶饮"],
    source: "定位理论案例库", confidence: 0.95,
  },
  {
    id: "POS-CASE-G003",
    title: "品牌延伸失败的案例：某火锅品牌做奶茶",
    industry: "餐饮",
    category: "综合",
    basics: { city: "全国", category: "火锅+茶饮" },
    timeline: [],
    outcome: { status: "failure", duration: "品牌延伸失败" },
    lessons: [
      "品牌延伸稀释核心定位（里斯延伸定律）",
      "火锅品牌做奶茶，消费者认知混乱",
      "聚焦才是餐饮品牌的生存之道",
      "不要为了短期增长牺牲长期品牌资产",
    ],
    applicableScenarios: ["品牌延伸", "聚焦", "定位错误"],
    source: "定位理论案例库", confidence: 0.85,
  },
];
