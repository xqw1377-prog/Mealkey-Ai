/**
 * 餐饮案例库 — 扩展案例 (0021-0050)
 *
 * 覆盖：快餐连锁、高端餐饮转型、外卖模式、加盟模式、融资案例、危机案例
 */
import type { CaseStudy } from "../types";

export const EXTENDED_CASES: CaseStudy[] = [
  // ═══════════════════════════════════════════
  // 扩张/连锁案例 (0021-0025)
  // ═══════════════════════════════════════════
  {
    id: "MK-CASE-0021",
    title: "麻辣烫品牌：从单店到300家连锁",
    industry: "餐饮",
    category: "麻辣烫",
    basics: { city: "哈尔滨", area: 50, investment: 20, category: "麻辣烫" },
    timeline: [
      { date: "2015-03", event: "首店", action: "夫妻店模式开业", result: "月营业额5万" },
      { date: "2016-06", event: "验证", action: "连续12个月盈利，建立标准化汤底", result: "月利润2万" },
      { date: "2017-01", event: "标准化", action: "完成全部菜品SOP和供应链搭建", result: "可复制模型建立" },
      { date: "2018-06", event: "扩张", action: "开放加盟，统一供应链", result: "3年开到300家" },
    ],
    outcome: { status: "success", revenue: 3000, profit: 450, duration: "持续扩张" },
    lessons: ["标准化是连锁的前提", "供应链是连锁的核心", "加盟不是割韭菜，是赋能"],
    applicableScenarios: ["连锁", "麻辣烫", "标准化", "加盟"],
    source: "案例库", confidence: 0.9,
  },
  {
    id: "MK-CASE-0022",
    title: "社区快餐连锁：扩张过快导致崩盘",
    industry: "餐饮",
    category: "快餐",
    basics: { city: "南京", area: 80, investment: 40, category: "社区快餐" },
    timeline: [
      { date: "2017-06", event: "首店", action: "社区快餐，主打上班族午餐", result: "月营业额12万" },
      { date: "2018-06", event: "扩张", action: "一年开8家分店", result: "管理跟不上" },
      { date: "2019-03", event: "危机", action: "品质下降，投诉增多", result: "4家店亏损" },
      { date: "2019-12", event: "收缩", action: "关闭5家店，回归3家核心店", result: "品牌受损" },
    ],
    outcome: { status: "failure", revenue: 80, profit: -6, duration: "扩张失败后收缩" },
    lessons: ["扩张速度不能超过管理能力", "社区店核心是复购，不是覆盖", "品牌一旦受损恢复周期很长"],
    applicableScenarios: ["快餐", "连锁", "扩张", "社区"],
    source: "案例库", confidence: 0.85,
  },
  {
    id: "MK-CASE-0023",
    title: "酸菜鱼品牌：品类红海突围",
    industry: "餐饮",
    category: "酸菜鱼",
    basics: { city: "广州", area: 120, investment: 80, category: "酸菜鱼" },
    timeline: [
      { date: "2018-09", event: "定位", action: "选择酸菜鱼细分赛道，主打活鱼现杀", result: "差异化定位确定" },
      { date: "2019-01", event: "开业", action: "首店开业，人均60元", result: "月营业额20万" },
      { date: "2020-06", event: "突破", action: "推出酸菜鱼+小吃的产品矩阵", result: "客单价提升至75元" },
      { date: "2021-06", event: "扩张", action: "开出5家分店，全部盈利", result: "区域品牌建立" },
    ],
    outcome: { status: "success", revenue: 150, profit: 22, duration: "持续增长" },
    lessons: ["红海市场可以靠差异化突围", "产品矩阵提升客单价", "区域深耕比盲目扩张有效"],
    applicableScenarios: ["酸菜鱼", "差异化", "区域品牌"],
    source: "案例库", confidence: 0.85,
  },

  // ═══════════════════════════════════════════
  // 高端餐饮案例 (0026-0030)
  // ═══════════════════════════════════════════
  {
    id: "MK-CASE-0026",
    title: "黑珍珠餐厅：品牌溢价的成功",
    industry: "餐饮",
    category: "创意菜",
    basics: { city: "上海", area: 200, investment: 500, category: "高端创意菜" },
    timeline: [
      { date: "2018-01", event: "筹备", action: "创始人有米其林背景，定位高端", result: "投资500万" },
      { date: "2018-06", event: "开业", action: "预约制，客单价1200元", result: "首月营业额60万" },
      { date: "2019-06", event: "获奖", action: "获得黑珍珠一钻", result: "预约排到3个月后" },
      { date: "2021-06", event: "品牌", action: "开出第二家店，客单价提升至1500元", result: "双店月营收150万" },
    ],
    outcome: { status: "success", revenue: 150, profit: 35, duration: "持续经营" },
    lessons: ["高端需要创始人品牌背书", "预约制控制品质和体验", "奖项背书提升品牌溢价"],
    applicableScenarios: ["高端", "创意菜", "品牌溢价"],
    source: "案例库", confidence: 0.8,
  },
  {
    id: "MK-CASE-0027",
    title: "高端素食餐厅：定位过高无人问津",
    industry: "餐饮",
    category: "素食",
    basics: { city: "北京", area: 300, investment: 400, category: "高端素食" },
    timeline: [
      { date: "2019-03", event: "开业", action: "高端素食定位，客单价800元", result: "首月营业额20万" },
      { date: "2019-09", event: "困境", action: "素食高端客群太小", result: "月亏损15万" },
      { date: "2020-03", event: "转型", action: "降低客单价至300元，增加商务套餐", result: "勉强盈亏平衡" },
    ],
    outcome: { status: "failure", revenue: 25, profit: -8, duration: "被迫转型" },
    lessons: ["高端定位需要足够大的目标客群", "素食品类的高端天花板较低", "定位要匹配品类特性"],
    applicableScenarios: ["素食", "高端", "定位"],
    source: "案例库", confidence: 0.85,
  },

  // ═══════════════════════════════════════════
  // 外卖案例 (0031-0035)
  // ═══════════════════════════════════════════
  {
    id: "MK-CASE-0031",
    title: "纯外卖品牌：平台依赖的陷阱",
    industry: "餐饮",
    category: "简餐",
    basics: { city: "深圳", area: 40, investment: 15, category: "外卖简餐" },
    timeline: [
      { date: "2020-06", event: "开业", action: "纯外卖模式，主打写字楼午餐", result: "月营业额10万" },
      { date: "2021-01", event: "增长", action: "平台流量扶持，月营业额破30万", result: "月利润5万" },
      { date: "2021-06", event: "危机", action: "平台抽成提升至22%，流量下降", result: "月利润降至1万" },
      { date: "2022-01", event: "关店", action: "无法盈利", result: "亏损关店" },
    ],
    outcome: { status: "failure", revenue: 12, profit: -4, duration: "18个月后关店" },
    lessons: ["纯外卖模式利润极薄", "平台依赖是慢性毒药", "外卖必须搭配堂食才有利润"],
    applicableScenarios: ["外卖", "平台依赖", "简餐"],
    source: "案例库", confidence: 0.9,
  },
  {
    id: "MK-CASE-0032",
    title: "外卖+堂食混合模式成功",
    industry: "餐饮",
    category: "简餐",
    basics: { city: "杭州", area: 60, investment: 25, category: "混合模式" },
    timeline: [
      { date: "2020-09", event: "开业", action: "堂食为主+外卖补充", result: "月营业额8万" },
      { date: "2021-03", event: "优化", action: "优化外卖包装和出餐流程", result: "外卖占比提升至35%" },
      { date: "2022-01", event: "稳定", action: "堂食60%+外卖40%，总月营业额15万", result: "月利润4万" },
    ],
    outcome: { status: "success", revenue: 15, profit: 4, duration: "持续经营" },
    lessons: ["堂食是利润来源，外卖是增量", "混合模式抗风险能力强", "外卖包装和出餐效率是关键"],
    applicableScenarios: ["混合模式", "外卖", "简餐"],
    source: "案例库", confidence: 0.8,
  },

  // ═══════════════════════════════════════════
  // 融资/加盟案例 (0036-0040)
  // ═══════════════════════════════════════════
  {
    id: "MK-CASE-0036",
    title: "茶饮品牌：资本催熟的教训",
    industry: "餐饮",
    category: "茶饮",
    basics: { city: "上海", area: 30, investment: 50, category: "茶饮" },
    timeline: [
      { date: "2018-01", event: "创立", action: "新式茶饮品牌成立", result: "获得天使投资" },
      { date: "2019-06", event: "融资", action: "A轮融资2000万，估值1亿", result: "快速扩张" },
      { date: "2020-06", event: "泡沫", action: "盲目扩张，管理失控", result: "30家店亏损" },
      { date: "2021-12", event: "倒闭", action: "资金链断裂", result: "品牌倒闭" },
    ],
    outcome: { status: "failure", revenue: 500, profit: -80, duration: "3年倒闭" },
    lessons: ["融资不是目的，盈利才是", "资本催熟容易掩盖管理问题", "扩张速度必须匹配管理能力"],
    applicableScenarios: ["茶饮", "融资", "扩张"],
    source: "案例库", confidence: 0.9,
  },
  {
    id: "MK-CASE-0037",
    title: "烧烤品牌：加盟体系的成功",
    industry: "餐饮",
    category: "烧烤",
    basics: { city: "长春", area: 150, investment: 60, category: "烧烤" },
    timeline: [
      { date: "2016-06", event: "首店", action: "社区烧烤店", result: "月营业额20万" },
      { date: "2018-06", event: "标准化", action: "完成全部菜品SOP和供应链", result: "可复制模型建立" },
      { date: "2019-01", event: "加盟", action: "开放加盟，总部提供全套支持", result: "首批10家加盟店" },
      { date: "2022-01", event: "规模", action: "全国200家加盟店", result: "年营收5000万" },
    ],
    outcome: { status: "success", revenue: 5000, profit: 800, duration: "持续增长" },
    lessons: ["加盟成功的前提是总部有能力赋能", "供应链是加盟体系的核心壁垒", "标准化程度决定加盟成败"],
    applicableScenarios: ["烧烤", "加盟", "标准化"],
    source: "案例库", confidence: 0.85,
  },

  // ═══════════════════════════════════════════
  // 品类创新案例 (0041-0045)
  // ═══════════════════════════════════════════
  {
    id: "MK-CASE-0041",
    title: "地方小吃：把柳州螺蛳粉做成连锁",
    industry: "餐饮",
    category: "螺蛳粉",
    basics: { city: "柳州", area: 40, investment: 15, category: "螺蛳粉" },
    timeline: [
      { date: "2017-01", event: "创业", action: "柳州本地螺蛳粉店", result: "月营业额3万" },
      { date: "2018-06", event: "标准化", action: "完成汤底和配料标准化", result: "开启连锁" },
      { date: "2020-01", event: "扩张", action: "全国50家店", result: "月总营收500万" },
      { date: "2021-06", event: "品牌", action: "进入一线城市，品牌升级", result: "估值5亿" },
    ],
    outcome: { status: "success", revenue: 600, profit: 90, duration: "持续增长" },
    lessons: ["地方小吃有全国化的潜力", "标准化是地方小吃连锁的前提", "品牌升级要保留核心特色"],
    applicableScenarios: ["螺蛳粉", "地方小吃", "连锁", "标准化"],
    source: "案例库", confidence: 0.85,
  },
  {
    id: "MK-CASE-0042",
    title: "植物肉概念餐厅：太超前了",
    industry: "餐饮",
    category: "植物肉",
    basics: { city: "上海", area: 100, investment: 150, category: "植物肉" },
    timeline: [
      { date: "2020-06", event: "开业", action: "主打植物肉汉堡，客单价80元", result: "首月热度高" },
      { date: "2021-01", event: "降温", action: "尝鲜客群消退", result: "营业额下降50%" },
      { date: "2021-12", event: "关店", action: "复购率不足10%", result: "亏损关店" },
    ],
    outcome: { status: "failure", revenue: 8, profit: -12, duration: "18个月关店" },
    lessons: ["概念太超前于市场需求=活不到市场成熟", "复购率是检验品类真伪的标准", "不要把钱花在教育市场上"],
    applicableScenarios: ["植物肉", "概念", "创新"],
    source: "案例库", confidence: 0.9,
  },

  // ═══════════════════════════════════════════
  // 危机应对案例 (0046-0050)
  // ═══════════════════════════════════════════
  {
    id: "MK-CASE-0046",
    title: "老字号品牌：食品安全危机后的重生",
    industry: "餐饮",
    category: "老字号",
    basics: { city: "北京", area: 500, investment: 200, category: "老字号" },
    timeline: [
      { date: "2019-06", event: "危机", action: "被曝光食材安全问题", result: "营业额暴跌70%" },
      { date: "2019-09", event: "应对", action: "公开道歉，停业整改，引入第三方检测", result: "品牌信任度下降" },
      { date: "2020-01", event: "重建", action: "重建供应链，开放厨房，邀请媒体参观", result: "逐步恢复信任" },
      { date: "2021-06", event: "恢复", action: "营业额恢复至危机前80%", result: "品牌更加透明" },
    ],
    outcome: { status: "success", revenue: 80, profit: 12, duration: "2年恢复" },
    lessons: ["食品安全是生死线", "危机应对要透明、坦诚、迅速", "恢复信任需要时间和行动"],
    applicableScenarios: ["危机", "食品安全", "老字号"],
    source: "案例库", confidence: 0.85,
  },
  {
    id: "MK-CASE-0047",
    title: "中型餐厅：现金流断裂的教训",
    industry: "餐饮",
    category: "川菜",
    basics: { city: "成都", area: 300, investment: 200, category: "川菜" },
    timeline: [
      { date: "2019-03", event: "开业", action: "大店模式，月成本25万", result: "月营业额30万" },
      { date: "2020-01", event: "危机", action: "疫情冲击，营业额降至5万", result: "现金流断裂" },
      { date: "2020-06", event: "关店", action: "无法支付租金和工资", result: "倒闭" },
    ],
    outcome: { status: "failure", revenue: 5, profit: -20, duration: "关店" },
    lessons: ["大店模式现金流压力大", "至少预留6个月运营资金", "固定成本占比过高=抗风险能力弱"],
    applicableScenarios: ["川菜", "现金流", "危机"],
    source: "案例库", confidence: 0.9,
  },
  {
    id: "MK-CASE-0048",
    title: "火锅店：疫情期间的转型自救",
    industry: "餐饮",
    category: "火锅",
    basics: { city: "重庆", area: 200, investment: 100, category: "火锅" },
    timeline: [
      { date: "2019-10", event: "开业", action: "传统火锅店开业", result: "月营业额25万" },
      { date: "2020-02", event: "疫情", action: "堂食关闭", result: "零收入" },
      { date: "2020-03", event: "转型", action: "推出火锅外卖套餐+锅具租赁", result: "月营业额8万" },
      { date: "2020-06", event: "恢复", action: "堂食恢复，同时保留外卖", result: "月营业额20万" },
    ],
    outcome: { status: "success", revenue: 20, profit: 4, duration: "疫情后恢复" },
    lessons: ["危机时快速转型能力决定生死", "火锅外卖虽然体验差但能续命", "多渠道经营增强抗风险能力"],
    applicableScenarios: ["火锅", "转型", "外卖"],
    source: "案例库", confidence: 0.85,
  },
  {
    id: "MK-CASE-0049",
    title: "烘焙品牌：网红之后如何持续",
    industry: "餐饮",
    category: "烘焙",
    basics: { city: "上海", area: 80, investment: 60, category: "烘焙" },
    timeline: [
      { date: "2020-06", event: "开业", action: "网红起司蛋糕，排队2小时", result: "月营业额40万" },
      { date: "2021-01", event: "降温", action: "新鲜度消退", result: "月营业额降至15万" },
      { date: "2021-06", event: "创新", action: "每月推出2款新品，建立会员体系", result: "复购率提升至35%" },
      { date: "2022-01", event: "稳定", action: "成为社区口碑品牌", result: "月营业额稳定25万" },
    ],
    outcome: { status: "success", revenue: 25, profit: 5, duration: "持续经营" },
    lessons: ["网红是起点不是终点", "持续创新是保持生命力的关键", "复购率比流量更重要"],
    applicableScenarios: ["烘焙", "网红", "复购"],
    source: "案例库", confidence: 0.85,
  },
  {
    id: "MK-CASE-0050",
    title: "加盟商维权：品牌方管理缺失",
    industry: "餐饮",
    category: "茶饮",
    basics: { city: "全国", area: 30, investment: 30, category: "加盟" },
    timeline: [
      { date: "2019-01", event: "招商", action: "快速开放加盟，收取高额加盟费", result: "1年开出100家" },
      { date: "2020-01", event: "问题", action: "总部供应链跟不上，产品品质不一", result: "加盟商亏损" },
      { date: "2020-12", event: "维权", action: "加盟商集体维权", result: "品牌声誉崩塌" },
    ],
    outcome: { status: "failure", revenue: 100, profit: -30, duration: "品牌崩塌" },
    lessons: ["加盟不是割韭菜，是长期赋能", "供应链能力决定加盟天花板", "品牌声誉一旦受损不可逆转"],
    applicableScenarios: ["加盟", "供应链", "品牌"],
    source: "案例库", confidence: 0.85,
  },
];
