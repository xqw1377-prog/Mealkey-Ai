/**
 * M-ED 股权治理案例库
 *
 * 蒸馏自全球知名股权/控制权/治理正反案例。
 * 每案例包含：股权结构、关键决策、结果、教训。
 */

import type { CaseStudy } from "../types";

export const EQUITY_GOVERNANCE_CASES: CaseStudy[] = [
  // ═══════════════════════════════════════════
  // 控制权案例
  // ═══════════════════════════════════════════

  {
    id: "ED-CASE-001",
    title: "Facebook/ Meta：AB 股保护创始人控制权的经典",
    category: "科技",
    industry: "互联网",
    basics: { city: "美国" },
    timeline: [
      { date: "2012", event: "上市", action: "采用 AB 股架构", result: "Zuckerberg 以 28% 股份控制 58% 投票权" },
    ],
    outcome: { status: "success", duration: "2012-至今" },
    lessons: [
      "AB 股是保持创始人长期控制权的最有效工具",
      "即使在多轮融资后，创始人仍可通过 AB 股掌握决策权",
      "港交所和科创板已允许 AB 股，境内架构也可通过章程实现类似效果",
    ],
    applicableScenarios: ["控制权设计", "AB股架构", "上市准备"],
    source: "Meta 招股书 + 公司治理案例",
    confidence: 0.9,
  },
  {
    id: "ED-CASE-002",
    title: "万科股权之争：分散股权的治理危机",
    category: "房地产",
    industry: "房地产",
    basics: { city: "中国" },
    timeline: [
      { date: "2015", event: "宝能举牌", action: "宝能系持续增持万科", result: "控制权争夺" },
      { date: "2017", event: "结局", action: "深圳地铁入主", result: "王石退出" },
    ],
    outcome: { status: "failure", duration: "2015-2017" },
    lessons: [
      "股权分散的公司天然是门口的野蛮人目标",
      "没有控制权保护机制的创始人可能在一夜之间失去公司",
      "事前防御机制（AB股/章程限制/一致行动人）比事后反击有效得多",
    ],
    applicableScenarios: ["控制权保护", "反收购", "公司治理"],
    source: "万科股权之争全复盘",
    confidence: 0.9,
  },
  {
    id: "ED-CASE-003",
    title: "国美电器：黄光裕与陈晓的控制权之战",
    category: "零售",
    industry: "家电零售",
    basics: { city: "中国" },
    timeline: [
      { date: "2008", event: "黄光裕入狱", action: "陈晓接手管理", result: "控制权争夺" },
      { date: "2010", event: "争夺白热化", action: "陈晓引入贝恩资本", result: "稀释黄股权" },
    ],
    outcome: { status: "failure", duration: "2008-2010" },
    lessons: [
      "创始人出事后没有防御机制 = 管理层可能联合投资人夺权",
      "董事会控制比股权控制更重要：黄光裕持股多但仍差点失去控制",
      "一致行动人协议和董事会提名权必须在事前锁定",
    ],
    applicableScenarios: ["控制权防御", "董事会控制", "应急机制"],
    source: "国美控制权争夺案分析",
    confidence: 0.85,
  },

  // ═══════════════════════════════════════════
  // 股权激励案例
  // ═══════════════════════════════════════════

  {
    id: "ED-CASE-004",
    title: "小米上市前股权激励：99% 员工持股计划",
    category: "科技",
    industry: "消费电子",
    basics: { city: "中国" },
    timeline: [{ date: "2018", event: "上市", action: "全员持股方案", result: "核心团队稳定" }],
    outcome: { status: "success", duration: "2018-至今" },
    lessons: [
      "全员持股可以是创始人大方，也可以是一种低薪高激励的策略",
      "小米在上市前授予大量期权，上市后虽然股价波动但人员稳定",
      "股权激励方案要在值钱之前给，上市后再给效果大减",
    ],
    applicableScenarios: ["股权激励", "全员持股", "期权设计"],
    source: "小米招股书 + 股权激励方案分析",
    confidence: 0.85,
  },
  {
    id: "ED-CASE-005",
    title: "创业公司联合创始人退出：Vesting 机制的价值",
    category: "科技",
    industry: "互联网",
    basics: { city: "中国" },
    timeline: [
      { date: "2020", event: "联合创始人离职", action: "因无 vesting 协议", result: "带走 30% 股份" },
    ],
    outcome: { status: "failure", duration: "（案例综合）" },
    lessons: [
      "没有 vesting 协议的联合创始人股权是定时炸弹",
      "哪怕是最好的朋友一起创业，也要在第一天签 vesting",
      "标准 vesting：4 年分期 + 1 年 cliff，服务不满按比例收回",
    ],
    applicableScenarios: ["vesting设计", "联合创始人", "股权分配"],
    source: "创业公司股权纠纷综合案例",
    confidence: 0.9,
  },

  // ═══════════════════════════════════════════
  // 融资条款案例
  // ═══════════════════════════════════════════

  {
    id: "ED-CASE-006",
    title: "摩拜单车：优先清算权让创始人零回报",
    category: "出行",
    industry: "共享经济",
    basics: { city: "中国" },
    timeline: [
      { date: "2018", event: "被美团收购", action: "27 亿出售", result: "投资人优先拿走全部" },
    ],
    outcome: { status: "failure", duration: "2015-2018" },
    lessons: [
      "多轮融资后优先清算权可能让创始团队在并购时一分钱拿不到",
      "2x 参与型优先清算权是最毒的条款之一，会严重侵蚀创始团队回报",
      "融资时不能只看估值，条款比估值重要得多",
    ],
    applicableScenarios: ["融资条款", "优先清算权", "创始人保护"],
    source: "摩拜被收购案 + 风险投资条款分析",
    confidence: 0.85,
  },
  {
    id: "ED-CASE-007",
    title: "俏江南：对赌协议的致命后果",
    category: "餐饮",
    industry: "餐饮",
    basics: { city: "中国" },
    timeline: [
      { date: "2008", event: "引入鼎晖", action: "签对赌协议", result: "上市失败触发对赌" },
      { date: "2014", event: "失去控制权", action: "对赌失败", result: "张兰失去俏江南" },
    ],
    outcome: { status: "failure", duration: "2008-2014" },
    lessons: [
      "对赌协议是餐饮企业最危险的融资条款之一",
      "上市对赌在市场下行时几乎必输——市场窗口不是创始人能控制的",
      "张兰从估值 25 亿到失去公司，核心教训是不要签无法控制的对赌条件",
    ],
    applicableScenarios: ["对赌协议", "融资风险", "餐饮融资"],
    source: "俏江南融资失败全复盘",
    confidence: 0.9,
  },
  {
    id: "ED-CASE-008",
    title: "Google/ Alphabet：三层股权结构的极致控制",
    category: "科技",
    industry: "互联网",
    basics: { city: "美国" },
    timeline: [{ date: "2004", event: "上市", action: "AB 股架构", result: "创始人控制" }],
    outcome: { status: "success", duration: "2004-至今" },
    lessons: [
      "Google 创造了三级股权结构（A/B/C），创始人一股有 10 票",
      "即使 Page 和 Brin 持股不断稀释，仍牢牢控制公司",
      "控制权设计应该在上市前完成，上市后再改非常困难",
    ],
    applicableScenarios: ["控制权设计", "AB股", "公司治理"],
    source: "Google/ Alphabet 公司治理结构",
    confidence: 0.9,
  },

  // ═══════════════════════════════════════════
  // 家族企业传承案例
  // ═══════════════════════════════════════════

  {
    id: "ED-CASE-009",
    title: "李锦记：家族宪法与传承机制",
    category: "食品",
    industry: "调味品",
    basics: { city: "香港" },
    timeline: [
      { date: "1888", event: "创立", action: "李锦裳创立", result: "百年传承" },
      { date: "1990s", event: "家族宪法建立", action: "设立家族委员会", result: "五代传承" },
    ],
    outcome: { status: "success", duration: "1888-至今" },
    lessons: [
      "李锦记家族宪法规定：家族成员不进董事会、不干涉经营",
      "所有权和经营权分离是家族企业长期传承的关键",
      "家族宪法比公司章程更难建立，但对于家族企业至关重要",
    ],
    applicableScenarios: ["家族企业", "传承规划", "治理结构"],
    source: "李锦记家族治理研究",
    confidence: 0.9,
  },
  {
    id: "ED-CASE-010",
    title: "真功夫：家族内斗导致的品牌崩塌",
    category: "餐饮",
    industry: "快餐",
    basics: { city: "中国" },
    timeline: [
      { date: "2009", event: "内斗爆发", action: "蔡达标被潘宇海起诉", result: "品牌受损" },
      { date: "2013", event: "蔡达标入狱", action: "职务侵占罪名成立", result: "上市搁浅" },
    ],
    outcome: { status: "failure", duration: "2009-至今" },
    lessons: [
      "股权 50:50 是最差的股权结构——没有人在关键时刻能拍板",
      "家族企业必须明确谁说了算，平权等于无权的",
      "内斗对品牌的伤害远大于任何外部竞争",
    ],
    applicableScenarios: ["股权结构设计", "家族企业", "控制权"],
    source: "真功夫股权内斗全复盘",
    confidence: 0.9,
  },
];
