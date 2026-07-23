/**
 * 餐饮案例库 — 20+ 案例
 *
 * 覆盖：湘菜、火锅、茶饮、快餐、面馆、烧烤、日料、西餐、咖啡、小吃
 * 成功+失败+转型
 */

import type { CaseStudy } from "../types";
import { EXTENDED_CASES } from "./extended";
import { VOLUME3_CASES } from "./volume-3";

export const CASE_STUDIES: CaseStudy[] = [
  // ═══════════════════════════════════════════
  // 成功案例 (0001-0010)
  // ═══════════════════════════════════════════
  {
    id: "MK-CASE-0001",
    title: "社区湘菜馆：从0到3家分店",
    industry: "餐饮",
    category: "湘菜",
    basics: { city: "杭州", area: 180, investment: 120, category: "湘菜" },
    timeline: [
      { date: "2019-01", event: "开业", action: "选择社区位置，主打家庭聚餐", result: "首月营业额25万" },
      { date: "2019-06", event: "调整", action: "根据反馈优化菜品辣度", result: "复购率提升40%" },
      { date: "2020-01", event: "危机", action: "疫情期间转型外卖", result: "外卖占比60%，存活" },
      { date: "2021-06", event: "扩张", action: "开设第二家分店", result: "6个月回本" },
    ],
    outcome: { status: "success", revenue: 45, profit: 8, duration: "持续经营" },
    lessons: ["社区店获客成本低，复购率高", "根据本地口味调整很重要", "危机时快速转型能力关键"],
    applicableScenarios: ["社区餐饮", "湘菜", "首次创业"],
    source: "案例库", confidence: 0.85,
  },
  {
    id: "MK-CASE-0002",
    title: "小火锅品牌：差异化突围",
    industry: "餐饮",
    category: "火锅",
    basics: { city: "成都", area: 120, investment: 80, category: "小火锅" },
    timeline: [
      { date: "2020-03", event: "定位", action: "选择一人食小火锅细分市场", result: "避开与大品牌正面竞争" },
      { date: "2020-06", event: "开业", action: "主打高性价比一人食套餐", result: "首月营业额18万" },
      { date: "2021-01", event: "增长", action: "抖音营销+外卖", result: "月营业额突破30万" },
    ],
    outcome: { status: "success", revenue: 30, profit: 6, duration: "持续经营" },
    lessons: ["细分市场可以避开竞争", "一人食是趋势", "线上线下结合很重要"],
    applicableScenarios: ["火锅", "差异化", "小投入"],
    source: "案例库", confidence: 0.8,
  },
  {
    id: "MK-CASE-0003",
    title: "社区面馆：极致人效模型",
    industry: "餐饮",
    category: "面馆",
    basics: { city: "上海", area: 60, investment: 35, category: "面馆" },
    timeline: [
      { date: "2020-09", event: "开业", action: "夫妻店模式，3人运营", result: "首月营业额12万" },
      { date: "2021-03", event: "优化", action: "精简菜单至15款面+5款小食", result: "出餐速度提升50%" },
      { date: "2022-01", event: "增长", action: "口碑传播，复购率65%", result: "月营业额稳定18万" },
    ],
    outcome: { status: "success", revenue: 18, profit: 6, duration: "持续经营" },
    lessons: ["小店模型人效极高", "精简菜单提升效率", "口碑是最好的营销"],
    applicableScenarios: ["面馆", "小店", "夫妻创业"],
    source: "案例库", confidence: 0.9,
  },
  {
    id: "MK-CASE-0004",
    title: "快餐品牌：标准化复制",
    industry: "餐饮",
    category: "快餐",
    basics: { city: "深圳", area: 80, investment: 50, category: "快餐" },
    timeline: [
      { date: "2018-06", event: "首店", action: "建立标准化出餐流程", result: "首月营业额15万" },
      { date: "2019-06", event: "验证", action: "连续12个月盈利", result: "月均利润3万" },
      { date: "2020-06", event: "扩张", action: "3个月内开出3家分店", result: "全部6个月内回本" },
      { date: "2022-01", event: "规模", action: "扩展至10家门店", result: "年营收2000万" },
    ],
    outcome: { status: "success", revenue: 167, profit: 25, duration: "持续扩张" },
    lessons: ["标准化是扩张前提", "首店验证期不能省", "快餐赛道适合连锁"],
    applicableScenarios: ["快餐", "连锁", "标准化"],
    source: "案例库", confidence: 0.9,
  },
  {
    id: "MK-CASE-0005",
    title: "烧烤店：社区深耕",
    industry: "餐饮",
    category: "烧烤",
    basics: { city: "长沙", area: 150, investment: 60, category: "烧烤" },
    timeline: [
      { date: "2019-05", event: "开业", action: "主打社区夜宵场景", result: "首月营业额20万" },
      { date: "2020-05", event: "创新", action: "推出宵夜套餐+啤酒畅饮", result: "客单价提升30%" },
      { date: "2021-05", event: "稳定", action: "成为社区夜宵首选", result: "月营业额稳定35万" },
    ],
    outcome: { status: "success", revenue: 35, profit: 7, duration: "持续经营" },
    lessons: ["场景定位很重要", "社区深耕比广泛获客有效", "产品创新保持活力"],
    applicableScenarios: ["烧烤", "夜宵", "社区餐饮"],
    source: "案例库", confidence: 0.8,
  },
  {
    id: "MK-CASE-0006",
    title: "咖啡馆：第三空间模式",
    industry: "餐饮",
    category: "咖啡",
    basics: { city: "杭州", area: 100, investment: 45, category: "咖啡" },
    timeline: [
      { date: "2021-01", event: "开业", action: "打造社区第三空间", result: "首月营业额8万" },
      { date: "2021-06", event: "增长", action: "会员体系+社群运营", result: "会员复购率70%" },
      { date: "2022-01", event: "稳定", action: "成为社区社交中心", result: "月营业额稳定15万" },
    ],
    outcome: { status: "success", revenue: 15, profit: 4, duration: "持续经营" },
    lessons: ["咖啡卖的是空间和社交", "会员体系是核心壁垒", "社区咖啡比商圈咖啡更稳"],
    applicableScenarios: ["咖啡", "社区", "第三空间"],
    source: "案例库", confidence: 0.75,
  },
  {
    id: "MK-CASE-0007",
    title: "日料店：高端定位成功",
    industry: "餐饮",
    category: "日料",
    basics: { city: "上海", area: 80, investment: 150, category: "日料" },
    timeline: [
      { date: "2019-10", event: "开业", action: "主打omakase，预约制", result: "首月营业额25万" },
      { date: "2020-06", event: "品牌", action: "米其林推荐", result: "预约排到2个月后" },
      { date: "2021-06", event: "提价", action: "客单价从500提升至800", result: "利润翻倍" },
    ],
    outcome: { status: "success", revenue: 40, profit: 12, duration: "持续经营" },
    lessons: ["高端需要品牌背书", "预约制控制品质", "稀缺性创造价值"],
    applicableScenarios: ["日料", "高端", "预约制"],
    source: "案例库", confidence: 0.8,
  },
  {
    id: "MK-CASE-0008",
    title: "小吃品牌：外卖突围",
    industry: "餐饮",
    category: "小吃",
    basics: { city: "广州", area: 30, investment: 15, category: "小吃" },
    timeline: [
      { date: "2020-03", event: "开业", action: "纯外卖模式", result: "首月营业额8万" },
      { date: "2020-09", event: "优化", action: "精简SKU，聚焦爆款", result: "出餐效率提升60%" },
      { date: "2021-03", event: "扩张", action: "开设3个外卖站点", result: "月营业额突破30万" },
    ],
    outcome: { status: "success", revenue: 30, profit: 6, duration: "持续经营" },
    lessons: ["外卖模式可以低投入启动", "爆款策略比大而全有效", "多站点覆盖扩大范围"],
    applicableScenarios: ["小吃", "外卖", "低投入"],
    source: "案例库", confidence: 0.75,
  },
  {
    id: "MK-CASE-0009",
    title: "茶饮品牌：区域突围",
    industry: "餐饮",
    category: "茶饮",
    basics: { city: "武汉", area: 40, investment: 25, category: "茶饮" },
    timeline: [
      { date: "2019-06", event: "开业", action: "主打鲜果茶，差异化定位", result: "首月营业额10万" },
      { date: "2020-06", event: "增长", action: "本地化营销+社群", result: "成为区域热门品牌" },
      { date: "2021-06", event: "扩张", action: "开设5家分店", result: "区域品牌认知建立" },
    ],
    outcome: { status: "success", revenue: 50, profit: 10, duration: "持续扩张" },
    lessons: ["区域品牌可以避开全国竞争", "鲜果茶有差异化空间", "社群运营是茶饮核心"],
    applicableScenarios: ["茶饮", "区域品牌", "差异化"],
    source: "案例库", confidence: 0.75,
  },
  {
    id: "MK-CASE-0010",
    title: "西餐厅：精准定位白领",
    industry: "餐饮",
    category: "西餐",
    basics: { city: "北京", area: 120, investment: 80, category: "西餐" },
    timeline: [
      { date: "2020-09", event: "开业", action: "CBD商圈，主打商务午餐", result: "首月营业额18万" },
      { date: "2021-03", event: "增长", action: "推出下午茶+晚餐套餐", result: "时段利用率提升" },
      { date: "2022-01", event: "稳定", action: "成为区域白领首选", result: "月营业额稳定30万" },
    ],
    outcome: { status: "success", revenue: 30, profit: 6, duration: "持续经营" },
    lessons: ["精准定位目标人群", "时段利用是西餐关键", "商务场景有稳定需求"],
    applicableScenarios: ["西餐", "商务", "商圈"],
    source: "案例库", confidence: 0.75,
  },

  // ═══════════════════════════════════════════
  // 失败案例 (0011-0020)
  // ═══════════════════════════════════════════
  {
    id: "MK-CASE-0011",
    title: "高端湘菜馆：品牌撑不起价格",
    industry: "餐饮",
    category: "湘菜",
    basics: { city: "杭州", area: 300, investment: 350, category: "高端湘菜" },
    timeline: [
      { date: "2021-01", event: "开业", action: "高投入装修，高端定位", result: "首月营业额30万，但成本高" },
      { date: "2021-06", event: "困境", action: "客流不足，客单价难维持", result: "月亏损10万" },
      { date: "2021-12", event: "调整", action: "降低客单价，转型社区品质", result: "营业额恢复，但利润薄" },
    ],
    outcome: { status: "failure", revenue: 25, profit: -5, duration: "18个月后转型" },
    lessons: ["没有品牌支撑的高端定位很难成功", "高投入不等于高品质认知", "区域市场需要匹配当地消费力"],
    applicableScenarios: ["高端餐饮", "高投入", "品牌建设"],
    source: "案例库", confidence: 0.9,
  },
  {
    id: "MK-CASE-0012",
    title: "网红奶茶店：流量不等于复购",
    industry: "餐饮",
    category: "茶饮",
    basics: { city: "上海", area: 50, investment: 120, category: "网红奶茶" },
    timeline: [
      { date: "2022-01", event: "开业", action: "抖音爆火，排队3小时", result: "首月营业额50万" },
      { date: "2022-06", event: "下滑", action: "热度消退，客流下降", result: "营业额降至15万" },
      { date: "2022-12", event: "关店", action: "无法维持", result: "亏损关店" },
    ],
    outcome: { status: "failure", revenue: 15, profit: -8, duration: "12个月后关店" },
    lessons: ["网红是起点不是终点", "流量不等于复购", "产品力和品牌力才是长期壁垒"],
    applicableScenarios: ["网红店", "流量依赖", "茶饮"],
    source: "案例库", confidence: 0.95,
  },
  {
    id: "MK-CASE-0013",
    title: "商场火锅店：租金压垮利润",
    industry: "餐饮",
    category: "火锅",
    basics: { city: "成都", area: 250, investment: 200, category: "火锅" },
    timeline: [
      { date: "2020-10", event: "开业", action: "入驻核心商场，高租金", result: "首月营业额40万" },
      { date: "2021-04", event: "压力", action: "租金占比22%，利润极薄", result: "月利润不足1万" },
      { date: "2021-10", event: "关店", action: "商场涨租，无法承受", result: "亏损关店" },
    ],
    outcome: { status: "failure", revenue: 40, profit: -3, duration: "12个月后关店" },
    lessons: ["租金占比是生死线", "商场店需要品牌溢价能力", "高营收不等于高利润"],
    applicableScenarios: ["商场店", "火锅", "租金"],
    source: "案例库", confidence: 0.9,
  },
  {
    id: "MK-CASE-0014",
    title: "跨界创业者：餐饮小白的教训",
    industry: "餐饮",
    category: "川菜",
    basics: { city: "深圳", area: 200, investment: 180, category: "川菜" },
    timeline: [
      { date: "2021-03", event: "开业", action: "IT背景，高薪聘请厨师团队", result: "首月营业额20万" },
      { date: "2021-09", event: "问题", action: "厨师长离职，菜品品质下降", result: "客流下降40%" },
      { date: "2022-03", event: "关店", action: "无法找到替代方案", result: "亏损关店" },
    ],
    outcome: { status: "failure", revenue: 12, profit: -10, duration: "12个月后关店" },
    lessons: ["不能过度依赖个人", "菜谱必须标准化", "跨界创业需要行业伙伴"],
    applicableScenarios: ["跨界创业", "厨师依赖", "标准化"],
    source: "案例库", confidence: 0.85,
  },
  {
    id: "MK-CASE-0015",
    title: "快餐品牌扩张：管理失控",
    industry: "餐饮",
    category: "快餐",
    basics: { city: "广州", area: 100, investment: 60, category: "快餐" },
    timeline: [
      { date: "2019-01", event: "首店", action: "首店盈利良好", result: "月利润4万" },
      { date: "2020-01", event: "扩张", action: "一年开5家分店", result: "管理跟不上" },
      { date: "2020-12", event: "危机", action: "3家分店亏损", result: "关闭2家，收缩至3家" },
    ],
    outcome: { status: "failure", revenue: 60, profit: -5, duration: "扩张失败后收缩" },
    lessons: ["扩张速度不能超过管理能力", "标准化要先于扩张", "宁可慢一点，也要稳一点"],
    applicableScenarios: ["扩张", "连锁", "管理"],
    source: "案例库", confidence: 0.85,
  },
  {
    id: "MK-CASE-0016",
    title: "网红烘焙店：产品力不足",
    industry: "餐饮",
    category: "烘焙",
    basics: { city: "杭州", area: 80, investment: 100, category: "网红烘焙" },
    timeline: [
      { date: "2021-06", event: "开业", action: "高颜值装修+社交媒体营销", result: "首月营业额25万" },
      { date: "2021-12", event: "下滑", action: "产品口味一般，复购低", result: "营业额降至10万" },
      { date: "2022-06", event: "关店", action: "无法维持", result: "亏损关店" },
    ],
    outcome: { status: "failure", revenue: 10, profit: -6, duration: "12个月后关店" },
    lessons: ["颜值是入口，产品是核心", "烘焙需要持续复购", "营销不能替代产品力"],
    applicableScenarios: ["烘焙", "网红", "产品力"],
    source: "案例库", confidence: 0.85,
  },
  {
    id: "MK-CASE-0017",
    title: "高端日料：定位过高",
    industry: "餐饮",
    category: "日料",
    basics: { city: "南京", area: 150, investment: 200, category: "高端日料" },
    timeline: [
      { date: "2020-06", event: "开业", action: "主打omakase，客单价800+", result: "首月营业额15万" },
      { date: "2021-01", event: "困境", action: "南京消费力不匹配", result: "月亏损8万" },
      { date: "2021-06", event: "调整", action: "降低客单价至400", result: "客流增加但利润仍薄" },
    ],
    outcome: { status: "failure", revenue: 20, profit: -4, duration: "18个月后转型" },
    lessons: ["高端定位需要匹配城市消费力", "市场调研很重要", "定位要因地制宜"],
    applicableScenarios: ["高端", "日料", "城市匹配"],
    source: "案例库", confidence: 0.8,
  },
  {
    id: "MK-CASE-0018",
    title: "夫妻面馆：不懂营销",
    industry: "餐饮",
    category: "面馆",
    basics: { city: "重庆", area: 50, investment: 20, category: "面馆" },
    timeline: [
      { date: "2019-01", event: "开业", action: "产品好但不懂推广", result: "首月营业额5万" },
      { date: "2020-01", event: "挣扎", action: "周围竞争激烈", result: "营业额停滞" },
      { date: "2021-01", event: "关店", action: "无法突破瓶颈", result: "微利关店" },
    ],
    outcome: { status: "failure", revenue: 5, profit: 0.5, duration: "24个月后关店" },
    lessons: ["产品好不等于生意好", "营销和获客能力很重要", "竞争激烈区域需要差异化"],
    applicableScenarios: ["面馆", "营销", "竞争"],
    source: "案例库", confidence: 0.75,
  },
  {
    id: "MK-CASE-0019",
    title: "火锅外卖：体验缺失",
    industry: "餐饮",
    category: "火锅",
    basics: { city: "北京", area: 60, investment: 40, category: "火锅外卖" },
    timeline: [
      { date: "2020-06", event: "开业", action: "纯火锅外卖模式", result: "首月营业额12万" },
      { date: "2020-12", event: "下滑", action: "火锅外卖体验差", result: "复购率仅10%" },
      { date: "2021-06", event: "关店", action: "模式不可持续", result: "亏损关店" },
    ],
    outcome: { status: "failure", revenue: 6, profit: -3, duration: "12个月后关店" },
    lessons: ["火锅的核心是堂食体验", "外卖模式要匹配品类特性", "不是所有品类都适合外卖"],
    applicableScenarios: ["火锅", "外卖", "模式选择"],
    source: "案例库", confidence: 0.8,
  },
  {
    id: "MK-CASE-0020",
    title: "烧烤品牌：扩张过快",
    industry: "餐饮",
    category: "烧烤",
    basics: { city: "沈阳", area: 200, investment: 80, category: "烧烤" },
    timeline: [
      { date: "2018-06", event: "首店", action: "首店火爆", result: "月营业额50万" },
      { date: "2019-06", event: "扩张", action: "一年开8家分店", result: "供应链跟不上" },
      { date: "2020-06", event: "危机", action: "品质下降，口碑恶化", result: "关闭4家，品牌受损" },
    ],
    outcome: { status: "failure", revenue: 200, profit: -20, duration: "扩张失败后收缩" },
    lessons: ["供应链是扩张的核心", "品质不能因为扩张而下降", "品牌口碑一旦受损很难恢复"],
    applicableScenarios: ["烧烤", "扩张", "供应链"],
    source: "案例库", confidence: 0.85,
  },
];

/**
 * 查找相似案例
 */

/**
 * 在全量案例（核心+扩展+第三卷=80+）中查找相似案例
 */
export function findAllSimilarCases(
  context: Record<string, unknown>,
): CaseStudy[] {
  const allCases: CaseStudy[] = [
    ...CASE_STUDIES,
    ...EXTENDED_CASES,
    ...VOLUME3_CASES,
  ];
  return findSimilarCases(context, allCases);
}

/**
 * 全量案例列表
 */
export const ALL_CASES: CaseStudy[] = [
  ...CASE_STUDIES,
  ...EXTENDED_CASES,
  ...VOLUME3_CASES,
];

export function findSimilarCases(
  context: Record<string, unknown>,
  cases: CaseStudy[] = CASE_STUDIES
): CaseStudy[] {
  return cases.filter(c => {
    // 品类匹配
    if (context.category && c.basics.category) {
      if (!c.basics.category.includes(context.category as string)) {
        return false;
      }
    }

    // 场景匹配
    const scenarios = c.applicableScenarios;
    if (context.scenario && scenarios) {
      return scenarios.some(s =>
        s.includes(context.scenario as string) ||
        (context.scenario as string).includes(s)
      );
    }

    return true;
  }).sort((a, b) => b.confidence - a.confidence);
}
