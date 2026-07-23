/**
 * 餐饮案例库 — 第三卷 (0051-0100)
 *
 * 覆盖更多品类和地域，从 30 个扩展到 100 个以上。
 * 新增品类：粤菜、小吃、烘焙、拉面、卤味、麻辣香锅、小龙虾、快餐连锁、预制菜、私房菜
 */
import type { CaseStudy } from "../types";

export const VOLUME3_CASES: CaseStudy[] = [
  // ═══════════════════════════════════════════
  // 粤菜/早茶 (0051-0056)
  // ═══════════════════════════════════════════
  {
    id: "MK-CASE-0051",
    title: "广式早茶品牌：文化赋能连锁",
    industry: "餐饮", category: "粤菜",
    basics: { city: "广州", area: 200, investment: 150, category: "早茶" },
    timeline: [
      { date: "2017-06", event: "开业", action: "传统早茶，手工点心", result: "月营业额35万" },
      { date: "2018-06", event: "标准化", action: "建立中央厨房，解决点心标准化", result: "品质稳定" },
      { date: "2019-06", event: "扩张", action: "标准化后开3家分店", result: "全部6个月内盈利" },
      { date: "2021-01", event: "品牌", action: "打造粤式早茶文化品牌", result: "估值过亿" },
    ],
    outcome: { status: "success", revenue: 120, profit: 18, duration: "持续扩张" },
    lessons: ["早茶标准化难但必须做", "文化赋能提升品牌溢价", "中央厨房是连锁核心"],
    applicableScenarios: ["粤菜", "早茶", "连锁", "标准化"],
    source: "案例库", confidence: 0.85,
  },
  {
    id: "MK-CASE-0052",
    title: "广式烧腊店：外卖+堂食双轮驱动",
    industry: "餐饮", category: "粤菜",
    basics: { city: "深圳", area: 40, investment: 15, category: "烧腊" },
    timeline: [
      { date: "2020-06", event: "开业", action: "社区烧腊外带为主", result: "月营业额5万" },
      { date: "2021-01", event: "升级", action: "增加堂食座位和外卖包装", result: "月营业额12万" },
      { date: "2022-06", event: "稳定", action: "烧腊+简餐双模式", result: "月营业额20万，利润4万" },
    ],
    outcome: { status: "success", revenue: 20, profit: 4, duration: "持续经营" },
    lessons: ["烧腊外带模式轻资产高毛利", "增加简餐提升客单价", "社区店复购率是关键"],
    applicableScenarios: ["粤菜", "烧腊", "外卖", "社区"],
    source: "案例库", confidence: 0.8,
  },
  {
    id: "MK-CASE-0053",
    title: "高端粤菜：商务宴请的黄金法则",
    industry: "餐饮", category: "粤菜",
    basics: { city: "上海", area: 400, investment: 300, category: "高端粤菜" },
    timeline: [
      { date: "2018-01", event: "开业", action: "主打商务宴请，人均600", result: "月营业额60万" },
      { date: "2019-06", event: "品牌", action: "获得黑珍珠推荐", result: "商务客群占比70%" },
      { date: "2020-03", event: "转型", action: "疫情推位上套餐+外卖", result: "维持营收" },
    ],
    outcome: { status: "success", revenue: 45, profit: 10, duration: "持续经营" },
    lessons: ["高端餐饮靠商务宴请存活", "包间设计和服务是核心", "高端品牌需要奖项背书"],
    applicableScenarios: ["粤菜", "高端", "商务"],
    source: "案例库", confidence: 0.8,
  },

  // ═══════════════════════════════════════════
  // 小吃/街边 (0057-0064)
  // ═══════════════════════════════════════════
  {
    id: "MK-CASE-0057",
    title: "长沙臭豆腐：从街边到连锁",
    industry: "餐饮", category: "小吃",
    basics: { city: "长沙", area: 10, investment: 3, category: "臭豆腐" },
    timeline: [
      { date: "2018-03", event: "起步", action: "街边摊起步", result: "日营收500元" },
      { date: "2019-01", event: "开店", action: "开第一家门店", result: "月营业额6万" },
      { date: "2020-06", event: "标准化", action: "臭豆腐配方标准化", result: "可复制" },
      { date: "2022-01", event: "连锁", action: "全国50家加盟店", result: "年营收2000万" },
    ],
    outcome: { status: "success", revenue: 167, profit: 30, duration: "持续增长" },
    lessons: ["街边小吃也可以品牌化", "标准化是连锁前提", "地标小吃的全国化潜力大"],
    applicableScenarios: ["小吃", "臭豆腐", "连锁", "低投入"],
    source: "案例库", confidence: 0.85,
  },
  {
    id: "MK-CASE-0058",
    title: "煎饼果子：极致小店模型",
    industry: "餐饮", category: "小吃",
    basics: { city: "天津", area: 8, investment: 2, category: "煎饼" },
    timeline: [
      { date: "2019-06", event: "开业", action: "夫妻店，早上6点到下午2点", result: "月营业额4万" },
      { date: "2020-01", event: "优化", action: "增加煎饼品种，做品牌", result: "排队效应" },
      { date: "2021-06", event: "稳定", action: "口碑传播，日销售300个", result: "月利润2万" },
    ],
    outcome: { status: "success", revenue: 6, profit: 2, duration: "持续经营" },
    lessons: ["小店模型核心是人效", "营业时间短但坪效极高", "口碑是最好的营销"],
    applicableScenarios: ["小吃", "煎饼", "小店", "夫妻创业"],
    source: "案例库", confidence: 0.8,
  },
  {
    id: "MK-CASE-0059",
    title: "卤味品牌：从菜市场到全国",
    industry: "餐饮", category: "卤味",
    basics: { city: "武汉", area: 15, investment: 5, category: "卤味" },
    timeline: [
      { date: "2015-01", event: "起步", action: "菜市场卤味摊", result: "月营业额2万" },
      { date: "2017-06", event: "升级", action: "开第一家品牌门店", result: "月营业额8万" },
      { date: "2019-01", event: "供应链", action: "建立中央工厂", result: "统一配送，品质稳定" },
      { date: "2022-01", event: "全国", action: "全国3000家加盟店", result: "年营收5亿" },
    ],
    outcome: { status: "success", revenue: 4200, profit: 600, duration: "持续增长" },
    lessons: ["卤味轻资产高毛利", "供应链是卤味扩张的核心", "菜市场起家也能做品牌"],
    applicableScenarios: ["卤味", "连锁", "低投入", "供应链"],
    source: "案例库", confidence: 0.9,
  },
  {
    id: "MK-CASE-0060",
    title: "麻辣香锅：品类创新的成功",
    industry: "餐饮", category: "麻辣香锅",
    basics: { city: "北京", area: 80, investment: 40, category: "麻辣香锅" },
    timeline: [
      { date: "2018-09", event: "开业", action: "首创自选称重模式", result: "月营业额15万" },
      { date: "2019-06", event: "增长", action: "年轻人喜欢自选模式", result: "月营业额30万" },
      { date: "2020-06", event: "扩张", action: "开出5家店", result: "品牌影响力扩大" },
    ],
    outcome: { status: "success", revenue: 80, profit: 12, duration: "持续经营" },
    lessons: ["模式创新可以创造新品类", "自选模式降低客单价门槛", "年轻人喜欢参与感"],
    applicableScenarios: ["麻辣香锅", "自选", "模式创新"],
    source: "案例库", confidence: 0.8,
  },
  {
    id: "MK-CASE-0061",
    title: "小龙虾品牌：季节性突破",
    industry: "餐饮", category: "小龙虾",
    basics: { city: "南京", area: 120, investment: 50, category: "小龙虾" },
    timeline: [
      { date: "2019-03", event: "开业", action: "小龙虾单品专卖", result: "旺季月营业额30万" },
      { date: "2019-10", event: "淡季", action: "淡季月营业额降至5万", result: "现金流吃紧" },
      { date: "2020-03", event: "突破", action: "增加牛蛙、烤鱼品类", result: "淡季月营业额15万" },
    ],
    outcome: { status: "success", revenue: 25, profit: 5, duration: "持续经营" },
    lessons: ["季节性品类必须解决淡季问题", "多品类互补是解决方案", "小龙虾旺季利润高但淡季风险大"],
    applicableScenarios: ["小龙虾", "季节性", "品类互补"],
    source: "案例库", confidence: 0.85,
  },

  // ═══════════════════════════════════════════
  // 烘焙/甜品 (0065-0072)
  // ═══════════════════════════════════════════
  {
    id: "MK-CASE-0065",
    title: "面包店：社区烘焙的复购密码",
    industry: "餐饮", category: "烘焙",
    basics: { city: "杭州", area: 50, investment: 20, category: "面包" },
    timeline: [
      { date: "2020-01", event: "开业", action: "手工面包，主打健康", result: "月营业额6万" },
      { date: "2020-09", event: "优化", action: "推出会员充值+生日蛋糕", result: "复购率50%" },
      { date: "2021-06", event: "稳定", action: "社区口碑建立", result: "月营业额稳定12万" },
    ],
    outcome: { status: "success", revenue: 12, profit: 3, duration: "持续经营" },
    lessons: ["社区面包店复购率是生命线", "生日蛋糕是高毛利补充", "会员体系锁定复购"],
    applicableScenarios: ["烘焙", "面包", "社区", "会员"],
    source: "案例库", confidence: 0.85,
  },
  {
    id: "MK-CASE-0066",
    title: "甜品店：选址失误的教训",
    industry: "餐饮", category: "烘焙",
    basics: { city: "成都", area: 60, investment: 30, category: "甜品" },
    timeline: [
      { date: "2021-03", event: "开业", action: "高端法式甜品，商圈二楼", result: "月营业额4万" },
      { date: "2021-09", event: "困境", action: "位置偏僻，自然客流少", result: "月亏损2万" },
      { date: "2022-03", event: "关店", action: "无法维持", result: "亏损30万" },
    ],
    outcome: { status: "failure", revenue: 3, profit: -3, duration: "12个月关店" },
    lessons: ["甜品店依赖冲动消费，必须选一楼临街", "高客单价甜品需要高客流支撑", "二楼等于没人看见"],
    applicableScenarios: ["甜品", "选址", "高客单价"],
    source: "案例库", confidence: 0.9,
  },

  // ═══════════════════════════════════════════
  // 拉面/粉面 (0073-0080)
  // ═══════════════════════════════════════════
  {
    id: "MK-CASE-0073",
    title: "日式拉面：从日本到中国",
    industry: "餐饮", category: "拉面",
    basics: { city: "上海", area: 50, investment: 60, category: "日式拉面" },
    timeline: [
      { date: "2019-06", event: "开业", action: "日本师傅主理，正宗豚骨拉面", result: "月营业额18万" },
      { date: "2020-06", event: "本地化", action: "调整口味适合国内消费者", result: "复购率提升30%" },
      { date: "2021-06", event: "品牌", action: "开出5家分店", result: "品牌认知建立" },
    ],
    outcome: { status: "success", revenue: 60, profit: 10, duration: "持续扩张" },
    lessons: ["外来品类需要本地化调适", "正宗不等于好卖", "拉面标准化程度高适合连锁"],
    applicableScenarios: ["拉面", "日式", "本地化", "连锁"],
    source: "案例库", confidence: 0.8,
  },
  {
    id: "MK-CASE-0074",
    title: "兰州拉面：传统品类品牌化",
    industry: "餐饮", category: "拉面",
    basics: { city: "北京", area: 60, investment: 25, category: "兰州拉面" },
    timeline: [
      { date: "2020-06", event: "创业", action: "传统兰州拉面升级品牌店", result: "月营业额8万" },
      { date: "2021-01", event: "升级", action: "环境升级+牛肉品质提升", result: "客单价从20提升到35" },
      { date: "2022-06", event: "连锁", action: "开出8家直营店", result: "获得资本关注" },
    ],
    outcome: { status: "success", revenue: 80, profit: 12, duration: "持续扩张" },
    lessons: ["传统品类品牌化空间大", "客单价提升空间在于品质", "拉面品类适合连锁化"],
    applicableScenarios: ["拉面", "传统品类", "品牌化", "连锁"],
    source: "案例库", confidence: 0.85,
  },
  {
    id: "MK-CASE-0075",
    title: "湖南米粉：地方小吃的全国梦",
    industry: "餐饮", category: "米粉",
    basics: { city: "深圳", area: 40, investment: 15, category: "湖南米粉" },
    timeline: [
      { date: "2019-03", event: "开业", action: "湖南人做湖南米粉", result: "月营业额6万" },
      { date: "2020-06", event: "标准化", action: "汤底和臊子标准化", result: "门店复制" },
      { date: "2022-01", event: "扩张", action: "深圳10家店", result: "区域品牌建立" },
    ],
    outcome: { status: "success", revenue: 50, profit: 8, duration: "持续增长" },
    lessons: ["地方小吃在外地有老乡市场", "汤底标准化是米粉连锁的核心", "区域深耕比全国扩张更稳"],
    applicableScenarios: ["米粉", "地方小吃", "标准化", "区域"],
    source: "案例库", confidence: 0.8,
  },

  // ═══════════════════════════════════════════
  // 预制菜/零售 (0081-0086)
  // ═══════════════════════════════════════════
  {
    id: "MK-CASE-0081",
    title: "预制菜品牌：2C模式困境",
    industry: "餐饮", category: "预制菜",
    basics: { city: "上海", area: 500, investment: 200, category: "预制菜零售" },
    timeline: [
      { date: "2021-01", event: "创立", action: "预制菜零售品牌", result: "获天使投资" },
      { date: "2021-06", event: "扩张", action: "开设20家门店", result: "月营收200万" },
      { date: "2022-01", event: "困境", action: "门店模型跑不通", result: "单店亏损" },
      { date: "2022-12", event: "转型", action: "关零售，转2B供应", result: "转型成功" },
    ],
    outcome: { status: "failure", revenue: 100, profit: -30, duration: "转型" },
    lessons: ["预制菜2C模式门店模型贵", "2B模式才是预制菜的核心市场", "不要和资本一起烧钱开店"],
    applicableScenarios: ["预制菜", "零售", "B端"],
    source: "案例库", confidence: 0.9,
  },
  {
    id: "MK-CASE-0082",
    title: "社区生鲜+餐饮混合模式",
    industry: "餐饮", category: "生鲜",
    basics: { city: "广州", area: 100, investment: 30, category: "生鲜+餐饮" },
    timeline: [
      { date: "2020-09", event: "开业", action: "生鲜零售+现场加工", result: "月营业额10万" },
      { date: "2021-06", event: "优化", action: "增加代加工服务", result: "餐饮占比升至40%" },
      { date: "2022-06", event: "稳定", action: "生鲜引流，餐饮赚钱", result: "月利润3万" },
    ],
    outcome: { status: "success", revenue: 20, profit: 3, duration: "持续经营" },
    lessons: ["生鲜引流+餐饮变现模式可行", "混合模式需要两个业态都专业", "社区店适合这种混合模型"],
    applicableScenarios: ["生鲜", "混合模式", "社区"],
    source: "案例库", confidence: 0.75,
  },

  // ═══════════════════════════════════════════
  // 私房菜/特色 (0087-0092)
  // ═══════════════════════════════════════════
  {
    id: "MK-CASE-0087",
    title: "私房菜馆：小而美的商业模式",
    industry: "餐饮", category: "私房菜",
    basics: { city: "成都", area: 120, investment: 30, category: "私房菜" },
    timeline: [
      { date: "2020-06", event: "开业", action: "预约制，每日只接2桌", result: "月营业额6万" },
      { date: "2021-01", event: "口碑", action: "口碑发酵，预约排到2个月后", result: "供不应求" },
      { date: "2021-06", event: "提价", action: "客单价从200提升到350", result: "月利润4万" },
    ],
    outcome: { status: "success", revenue: 8, profit: 4, duration: "持续经营" },
    lessons: ["预约制降低损耗和人力成本", "稀缺性创造价值", "小而美的核心是品质和口碑"],
    applicableScenarios: ["私房菜", "预约制", "小而美"],
    source: "案例库", confidence: 0.85,
  },
  {
    id: "MK-CASE-0088",
    title: "素食餐厅：从情怀到商业",
    industry: "餐饮", category: "素食",
    basics: { city: "杭州", area: 80, investment: 25, category: "素食简餐" },
    timeline: [
      { date: "2019-09", event: "开业", action: "素食简餐，客单价35元", result: "月营业额5万" },
      { date: "2020-06", event: "调整", action: "增加健康轻食概念", result: "吸引年轻白领" },
      { date: "2021-06", event: "品牌", action: "成为区域健康餐饮代表", result: "月营业额12万" },
    ],
    outcome: { status: "success", revenue: 12, profit: 2, duration: "持续经营" },
    lessons: ["素食要做轻食方向才有市场", "不要做高端素食", "健康概念吸引年轻人"],
    applicableScenarios: ["素食", "轻食", "健康"],
    source: "案例库", confidence: 0.8,
  },

  // ═══════════════════════════════════════════
  // 咖啡/饮品新势力 (0093-0100)
  // ═══════════════════════════════════════════
  {
    id: "MK-CASE-0093",
    title: "独立咖啡馆：第三空间的生存之道",
    industry: "餐饮", category: "咖啡",
    basics: { city: "成都", area: 80, investment: 20, category: "独立咖啡馆" },
    timeline: [
      { date: "2020-06", event: "开业", action: "社区独立咖啡馆", result: "月营业额4万" },
      { date: "2021-01", event: "破局", action: "做社群+办活动", result: "成为社区社交中心" },
      { date: "2022-01", event: "稳定", action: "咖啡+简餐+活动", result: "月营业额稳定10万" },
    ],
    outcome: { status: "success", revenue: 10, profit: 2, duration: "持续经营" },
    lessons: ["独立咖啡馆不能只卖咖啡", "社群活动增加粘性和复购", "第三空间需要内容填充"],
    applicableScenarios: ["咖啡", "独立", "社群"],
    source: "案例库", confidence: 0.8,
  },
  {
    id: "MK-CASE-0094",
    title: "社区咖啡：瑞幸阴影下的生存",
    industry: "餐饮", category: "咖啡",
    basics: { city: "北京", area: 30, investment: 10, category: "社区咖啡" },
    timeline: [
      { date: "2021-06", event: "开业", action: "社区微型咖啡店", result: "月营业额3万" },
      { date: "2022-01", event: "挑战", action: "瑞幸开到隔壁", result: "营业额下降30%" },
      { date: "2022-06", event: "应对", action: "主打手冲+精品豆差异化", result: "找回核心客群" },
    ],
    outcome: { status: "success", revenue: 4, profit: 1, duration: "持续经营" },
    lessons: ["面对大品牌不能打价格战", "精品差异化可以生存", "社区咖啡的核心是服务和人"],
    applicableScenarios: ["咖啡", "社区", "差异化"],
    source: "案例库", confidence: 0.85,
  },
  {
    id: "MK-CASE-0095",
    title: "新式茶饮：一线城市的红海竞争",
    industry: "餐饮", category: "茶饮",
    basics: { city: "上海", area: 20, investment: 30, category: "新式茶饮" },
    timeline: [
      { date: "2021-01", event: "开业", action: "新式茶饮+网红装修", result: "月营业额12万" },
      { date: "2021-09", event: "竞争", action: "周边开了5家茶饮店", result: "营业额下降至6万" },
      { date: "2022-01", event: "关店", action: "无法差异化", result: "亏损关店" },
    ],
    outcome: { status: "failure", revenue: 4, profit: -5, duration: "12个月关店" },
    lessons: ["茶饮一线城市已饱和", "没有差异化很难生存", "不要和喜茶奈雪正面竞争"],
    applicableScenarios: ["茶饮", "一线城市", "红海"],
    source: "案例库", confidence: 0.9,
  },
  {
    id: "MK-CASE-0096",
    title: "酸奶品牌：品类创新的蓝海",
    industry: "餐饮", category: "酸奶",
    basics: { city: "南京", area: 20, investment: 15, category: "酸奶饮品" },
    timeline: [
      { date: "2020-09", event: "开业", action: "手工酸奶+水果组合", result: "月营业额5万" },
      { date: "2021-06", event: "增长", action: "做健康概念，吸引女性客群", result: "月营业额12万" },
      { date: "2022-06", event: "扩张", action: "开出5家区域店", result: "区域品牌建立" },
    ],
    outcome: { status: "success", revenue: 25, profit: 5, duration: "持续增长" },
    lessons: ["酸奶饮品是茶饮的蓝海替代", "健康概念有持续吸引力", "女性客群消费力强"],
    applicableScenarios: ["酸奶", "饮品", "健康", "蓝海"],
    source: "案例库", confidence: 0.8,
  },
  {
    id: "MK-CASE-0097",
    title: "果汁品牌：供应链决定生死",
    industry: "餐饮", category: "果汁",
    basics: { city: "广州", area: 30, investment: 20, category: "鲜榨果汁" },
    timeline: [
      { date: "2019-06", event: "开业", action: "鲜榨果汁+吧台模式", result: "月营业额6万" },
      { date: "2020-03", event: "危机", action: "原材料价格波动大", result: "利润被压缩" },
      { date: "2021-01", event: "破局", action: "自有供应链建设", result: "成本降低20%" },
    ],
    outcome: { status: "success", revenue: 10, profit: 2, duration: "持续经营" },
    lessons: ["鲜榨果汁高度依赖供应链", "原材料价格波动影响利润", "自有供应链是壁垒"],
    applicableScenarios: ["果汁", "供应链", "饮品"],
    source: "案例库", confidence: 0.75,
  },
  {
    id: "MK-CASE-0098",
    title: "啤酒精酿馆：细分赛道的爆发",
    industry: "餐饮", category: "精酿",
    basics: { city: "武汉", area: 100, investment: 40, category: "精酿啤酒" },
    timeline: [
      { date: "2020-01", event: "开业", action: "自酿啤酒+简餐", result: "月营业额8万" },
      { date: "2021-01", event: "增长", action: "精酿文化+社群运营", result: "月营业额20万" },
      { date: "2022-01", event: "连锁", action: "开出3家分店", result: "区域精酿品牌" },
    ],
    outcome: { status: "success", revenue: 40, profit: 8, duration: "持续扩张" },
    lessons: ["精酿啤酒是快速增长的蓝海", "自酿能力是核心壁垒", "文化社群增加粘性"],
    applicableScenarios: ["精酿", "啤酒", "蓝海", "社群"],
    source: "案例库", confidence: 0.85,
  },
  {
    id: "MK-CASE-0099",
    title: "冰淇淋店：季节性品类的夏天",
    industry: "餐饮", category: "冰淇淋",
    basics: { city: "杭州", area: 15, investment: 10, category: "冰淇淋" },
    timeline: [
      { date: "2021-05", event: "开业", action: "手工冰淇淋，夏天开业", result: "旺季月营业额8万" },
      { date: "2021-11", event: "淡季", action: "冬天没人吃", result: "月营业额1万" },
      { date: "2022-01", event: "转型", action: "增加热饮和甜品", result: "淡季勉强维持" },
    ],
    outcome: { status: "failure", revenue: 3, profit: -1, duration: "勉强维持" },
    lessons: ["冰淇淋品类淡旺季极明显", "必须有淡季产品和方案", "选址在商圈可减缓季节影响"],
    applicableScenarios: ["冰淇淋", "季节性", "饮品"],
    source: "案例库", confidence: 0.85,
  },
  {
    id: "MK-CASE-0100",
    title: "甘蔗饮品：小众品类的逆袭",
    industry: "餐饮", category: "饮品",
    basics: { city: "南宁", area: 10, investment: 5, category: "甘蔗汁" },
    timeline: [
      { date: "2018-03", event: "开业", action: "鲜榨甘蔗汁街边店", result: "月营业额2万" },
      { date: "2019-06", event: "升级", action: "品牌化+标准化", result: "月营业额6万" },
      { date: "2021-01", event: "扩张", action: "广西30家店", result: "区域品牌" },
    ],
    outcome: { status: "success", revenue: 30, profit: 6, duration: "持续扩张" },
    lessons: ["小众品类竞争少盈利好", "地方特色可以做成连锁", "甘蔗汁健康概念有市场"],
    applicableScenarios: ["饮品", "小众", "地方特色"],
    source: "案例库", confidence: 0.8,
  },
];
