/**
 * M-MKT 市场进入案例库
 *
 * 蒸馏自全球及中国餐饮市场进入的正反案例。
 * 每案例包含：进入方式、关键决策、结果、教训。
 */

import type { CaseStudy } from "../types";

export const MARKET_ENTRY_CASES: CaseStudy[] = [
  // ═══════════════════════════════════════════
  // 成功进入案例
  // ═══════════════════════════════════════════

  {
    id: "MKT-CASE-001",
    title: "星巴克进入中国：高端定位+第三空间",
    category: "餐饮",
    industry: "餐饮",
    basics: { city: "上海/北京" },
    timeline: [{ date: "1999", event: "进入中国", action: "首店上海", result: "亏损前9年" }],
    outcome: { status: "success", duration: "1999-至今" },
    lessons: [
      "先在上海北京建立品牌认知，再下沉二三线",
      "教育市场需要长期投入，星巴克在中国亏损 9 年才盈利",
      "本地化不是改变产品，而是调整体验细节",
    ],
    applicableScenarios: ["市场进入", "品牌定位", "国际化"],
    source: "星巴克年报 + 中国市场策略分析",
    confidence: 0.9,
  },
  {
    id: "MKT-CASE-002",
    title: "肯德基中国：本土化速度最快的国际品牌",
    category: "餐饮",
    industry: "餐饮",
    basics: { city: "北京/全国" },
    timeline: [{ date: "1987", event: "进入中国", action: "首店北京前门", result: "至今9000+店" }],
    outcome: { status: "success", duration: "1987-至今" },
    lessons: [
      "本土化不是口号，是产品研发能力的体现（粥/油条/串串）",
      "先占位一线城市核心商圈，再辐射全国",
      "开店速度与供应链建设速度必须匹配",
    ],
    applicableScenarios: ["市场进入", "本土化策略", "连锁扩张"],
    source: "百胜中国年报 + 餐饮行业分析",
    confidence: 0.85,
  },
  {
    id: "MKT-CASE-003",
    title: "Shake Shack 进入中国：网红品牌的跨文化挑战",
    category: "餐饮",
    industry: "餐饮",
    basics: { city: "上海" },
    timeline: [{ date: "2018", event: "进入中国", action: "上海新天地首店", result: "排队盛况但后续平淡" }],
    outcome: { status: "neutral", duration: "2018-至今" },
    lessons: [
      "网红品牌跨文化传播存在折价，中国消费者不完全买账",
      "高端汉堡在中国面临本土竞品的竞争压力",
      "品牌势能可以支撑首店，但持续经营靠产品力和运营",
    ],
    applicableScenarios: ["市场进入", "品牌跨文化", "高端定位"],
    source: "Shake Shack 财报 + 中国餐饮观察",
    confidence: 0.75,
  },
  {
    id: "MKT-CASE-004",
    title: "Popeyes 进入中国：两次进入两次退出",
    category: "餐饮",
    industry: "餐饮",
    basics: { city: "上海" },
    timeline: [{ date: "1999", event: "首次进入", action: "进入中国", result: "退出" }, { date: "2020", event: "再次进入", action: "重新开店", result: "2023再次退出" }],
    outcome: { status: "failure", duration: "1999-2023" },
    lessons: [
      "品牌力不足以支撑在中国市场的长期经营",
      "没有差异化定位在竞争激烈的炸鸡市场无法生存",
      "国际品牌进入中国需要足够的资源投入和耐心",
    ],
    applicableScenarios: ["市场进入", "竞争分析", "品牌力评估"],
    source: "餐饮品牌观察 + 市场进入失败分析",
    confidence: 0.8,
  },
  {
    id: "MKT-CASE-005",
    title: "海底捞出海：服务溢价的跨文化验证",
    category: "餐饮",
    industry: "餐饮",
    basics: { city: "新加坡/美国/日本" },
    timeline: [{ date: "2012", event: "开始出海", action: "新加坡首店", result: "已进入10+国家" }],
    outcome: { status: "neutral", duration: "2012-至今" },
    lessons: [
      "服务溢价在海外市场仍有效，但需要本地化调整",
      "海外选址策略与国内不同：海外更依赖商圈而非社区",
      "供应链海外化是最大挑战，跨国产能影响品质一致性",
    ],
    applicableScenarios: ["国际化", "出海策略", "服务模式验证"],
    source: "海底捞国际业务分析",
    confidence: 0.85,
  },

  // ═══════════════════════════════════════════
  // 进入失败案例
  // ═══════════════════════════════════════════

  {
    id: "MKT-CASE-006",
    title: "小肥羊出海：标准化不够导致品质失控",
    category: "餐饮",
    industry: "餐饮",
    basics: { city: "美国/加拿大" },
    timeline: [{ date: "2003", event: "出海扩张", action: "海外加盟", result: "品控失败" }],
    outcome: { status: "failure", duration: "2003-2015" },
    lessons: [
      "火锅出海最大的坑是食材供应链",
      "加盟模式在海外的品控比直营更难",
      "跨文化经营需要尊重当地饮食习惯（如分餐制）",
    ],
    applicableScenarios: ["国际化", "加盟模式", "品控管理"],
    source: "小肥羊国际化复盘",
    confidence: 0.8,
  },
  {
    id: "MKT-CASE-007",
    title: "狗不理包子：老字号跨区域的水土不服",
    category: "餐饮",
    industry: "餐饮",
    basics: { city: "北京" },
    timeline: [{ date: "2005", event: "进入北京", action: "北京开店", result: "2021关店退出" }],
    outcome: { status: "failure", duration: "2005-2021" },
    lessons: [
      "老字号的品牌溢价在跨区域时可能不被认可",
      "北京消费者对天津老字号没有情感连接",
      "高价定位需要匹配价值感知，否则被理解为'宰客'",
    ],
    applicableScenarios: ["跨区域扩张", "品牌溢价", "老字号活化"],
    source: "狗不理北京关店事件分析",
    confidence: 0.75,
  },
  {
    id: "MKT-CASE-008",
    title: "鼎泰丰进入二三线：高端小笼包的水土不服",
    category: "餐饮",
    industry: "餐饮",
    basics: { city: "苏州/深圳" },
    timeline: [{ date: "2010", event: "进入二三线", action: "苏州深圳开店", result: "增长缓慢" }],
    outcome: { status: "neutral", duration: "2010-至今" },
    lessons: [
      "高端化单品在低线城市的接受度有限",
      "翻台率是高端餐饮的核心指标，但低线城市难以支撑",
      "品牌下沉不等于定价下沉，高端品牌需要保持一致性",
    ],
    applicableScenarios: ["品牌下沉", "高端定位", "城市策略"],
    source: "鼎泰丰中国市场策略分析",
    confidence: 0.7,
  },
  {
    id: "MKT-CASE-009",
    title: "家乐福中国：大卖场模式的全面溃败",
    category: "零售",
    industry: "零售",
    basics: { city: "全国" },
    timeline: [{ date: "1995", event: "进入中国", action: "首店北京", result: "2023被收购亏损" }],
    outcome: { status: "failure", duration: "1995-2023" },
    lessons: [
      "大卖场模式被电商和新零售替代是结构性变化，不是经营问题",
      "2015 年后不转型的外资零售在中国全部出局",
      "市场规模大不代表你的模式能存活，模式过时是致命风险",
    ],
    applicableScenarios: ["模式转型", "零售业态", "市场变化"],
    source: "零售行业复盘 + 家乐福中国衰败分析",
    confidence: 0.85,
  },

  // ═══════════════════════════════════════════
  // 市场时机案例
  // ═══════════════════════════════════════════

  {
    id: "MKT-CASE-010",
    title: "棒约翰在中国：进入太早的风险",
    category: "餐饮",
    industry: "餐饮",
    basics: { city: "上海/北京" },
    timeline: [{ date: "2000", event: "进入中国", action: "上海北京开店", result: "始终无法突破" }],
    outcome: { status: "failure", duration: "2000-2022" },
    lessons: [
      "太早进入未被教育成熟的市场 = 高昂的教育成本",
      "比萨在中国的市场培育由必胜客完成，但棒约翰没有等到收获期",
      "窗口太早和太晚一样危险",
    ],
    applicableScenarios: ["市场时机", "品类教育", "进入策略"],
    source: "西式快餐中国市场进入分析",
    confidence: 0.8,
  },
  {
    id: "MKT-CASE-011",
    title: "Tim Hortons 在中国：进入太晚的教训",
    category: "餐饮",
    industry: "餐饮",
    basics: { city: "上海" },
    timeline: [{ date: "2019", event: "进入中国", action: "上海开店", result: "增长缓慢" }],
    outcome: { status: "neutral", duration: "2019-至今" },
    lessons: [
      "咖啡市场窗口被瑞幸和星巴克锁定后，后来者空间有限",
      "加拿大国民品牌的品牌势能在中国基本清零",
      "差异化不够 + 进入太晚 + 品牌不够强 = 很难做起来",
    ],
    applicableScenarios: ["市场时机", "竞争格局", "品牌定位"],
    source: "中国咖啡市场竞争格局分析",
    confidence: 0.75,
  },
  {
    id: "MKT-CASE-012",
    title: "瑞幸咖啡：时机完美的市场进入",
    category: "餐饮",
    industry: "餐饮",
    basics: { city: "北京/全国" },
    timeline: [{ date: "2017", event: "创立", action: "北京首店", result: "2年上市" }],
    outcome: { status: "success", duration: "2017-至今" },
    lessons: [
      "在咖啡市场教育完成（星巴克 20 年铺垫）后进入是最佳时机",
      "用价格+便利性切入现有品类，而非创造新品类",
      "数字化能力是进入策略的核心壁垒",
    ],
    applicableScenarios: ["市场时机", "数字化", "品类切入"],
    source: "瑞幸咖啡战略复盘",
    confidence: 0.85,
  },
];
