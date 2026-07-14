/**
 * 品类分析模板 — 每个品类的专业知识包
 *
 * 覆盖 20+ 餐饮品类，为每个品类提供:
 * - 经营核心指标（行业基准）
 * - 成功关键因素
 * - 常见失败原因
 * - 品类特殊风险
 * - 典型投资模型
 * - 标杆品牌参考
 */

export interface CategoryProfile {
  id: string;
  name: string;
  aliases: string[];
  description: string;

  // 行业基准指标
  benchmarks: {
    grossMargin: [number, number];       // 毛利率范围
    laborCostRatio: [number, number];    // 人力成本率范围
    rentRatio: [number, number];         // 租金占比范围
    avgTicket: [number, number];         // 客单价范围（元）
    turnoverRate: [number, number];      // 翻台率范围
    areaRange: [number, number];         // 面积范围（㎡）
    investmentRange: [number, number];   // 投资范围（万）
    paybackMonths: [number, number];     // 回收期（月）
  };

  // 成功关键因素
  successFactors: string[];

  // 常见失败原因
  failureReasons: string[];

  // 品类特殊风险
  specialRisks: Array<{ risk: string; description: string }>;

  // 典型模型画像
  typicalModel: {
    area: number;
    staff: number;
    monthlyRevenue: number;
    monthlyProfit: number;
  };

  // 标杆品牌
  benchmarkBrands: Array<{ name: string; highlights: string }>;

  // 关键成功策略
  keyStrategies: string[];
}

// ═══════════════════════════════════════════════════════════════
// 品类知识库
// ═══════════════════════════════════════════════════════════════

export const CATEGORY_PROFILES: CategoryProfile[] = [
  // ─── 火锅 ───
  {
    id: "hotpot",
    name: "火锅",
    aliases: ["火锅", "小火锅", "麻辣火锅", "重庆火锅"],
    description: "火锅是中国餐饮最大的品类赛道，市场占比约14%。标准化程度高，适合连锁。",
    benchmarks: {
      grossMargin: [0.55, 0.65],
      laborCostRatio: [0.18, 0.22],
      rentRatio: [0.08, 0.12],
      avgTicket: [60, 120],
      turnoverRate: [1.5, 2.5],
      areaRange: [150, 400],
      investmentRange: [80, 300],
      paybackMonths: [12, 24],
    },
    successFactors: [
      "底料标准化是火锅连锁的核心",
      "新鲜食材是品质基础",
      "服务体验决定口碑",
      "锅底创新创造差异化",
    ],
    failureReasons: [
      "底料品质不稳定",
      "租金占比过高（>15%）",
      "竞争激烈导致价格战",
      "缺乏差异化定位",
    ],
    specialRisks: [
      { risk: "食品安全风险高", description: "火锅食材种类多，交叉污染风险大" },
      { risk: "夏季淡季明显", description: "火锅有明显的季节性，夏季营收下降30-50%" },
      { risk: "同质化严重", description: "火锅品类产品差异小，竞争白热化" },
    ],
    typicalModel: { area: 250, staff: 12, monthlyRevenue: 30, monthlyProfit: 4.5 },
    benchmarkBrands: [
      { name: "海底捞", highlights: "服务体验标杆，全国1000+门店" },
      { name: "巴奴毛肚火锅", highlights: "产品主义，聚焦毛肚差异化" },
      { name: "小龙坎", highlights: "加盟模式快速扩张" },
    ],
    keyStrategies: [
      "底料自研+中央厨房标准化",
      "选择有差异化潜力的细分赛道（如一人食、小火锅）",
      "控制租金占比在12%以内",
      "夏季创新冷锅/甜品提升淡季营收",
    ],
  },

  // ─── 湘菜 ───
  {
    id: "xiangcai",
    name: "湘菜",
    aliases: ["湘菜", "湖南菜", "小炒"],
    description: "湘菜是全国第二大菜系，以辣味、小炒为特色。社区店模型成熟。",
    benchmarks: {
      grossMargin: [0.58, 0.68],
      laborCostRatio: [0.2, 0.25],
      rentRatio: [0.1, 0.14],
      avgTicket: [40, 80],
      turnoverRate: [1.8, 2.8],
      areaRange: [80, 200],
      investmentRange: [30, 120],
      paybackMonths: [10, 18],
    },
    successFactors: [
      "锅气是湘菜的灵魂，厨师水平决定品质",
      "性价比是湘菜的竞争力",
      "社区店是湘菜的最佳场景",
      "小炒品类出餐快、翻台率高",
    ],
    failureReasons: [
      "依赖厨师个人能力",
      "菜品标准化程度低",
      "定位不清晰（既要又要）",
      "忽视本地口味调适",
    ],
    specialRisks: [
      { risk: "厨师依赖", description: "湘菜重火候，高度依赖厨师个人技艺" },
      { risk: "口味一致性难", description: "多店运营时品质统一难度大" },
      { risk: "地域性强", description: "湘菜在不同城市的接受度差异大" },
    ],
    typicalModel: { area: 150, staff: 8, monthlyRevenue: 20, monthlyProfit: 3.5 },
    benchmarkBrands: [
      { name: "费大厨辣椒炒肉", highlights: "聚焦一道招牌菜，标准化程度高" },
      { name: "炊烟时代", highlights: "湘菜连锁标杆，口味一致性做得好" },
    ],
    keyStrategies: [
      "打造1-2道招牌菜，形成品牌识别",
      "厨房流程标准化，降低厨师依赖",
      "先社区店验证，品牌力强后再进商圈",
      "根据区域调整辣度，适应当地口味",
    ],
  },

  // ─── 快餐 ───
  {
    id: "fastfood",
    name: "快餐",
    aliases: ["快餐", "简餐", "中式快餐", "工作餐"],
    description: "快餐是刚需品类，受经济周期影响小。核心是人效和坪效。",
    benchmarks: {
      grossMargin: [0.55, 0.65],
      laborCostRatio: [0.2, 0.28],
      rentRatio: [0.1, 0.15],
      avgTicket: [20, 45],
      turnoverRate: [2.5, 4.5],
      areaRange: [50, 120],
      investmentRange: [20, 60],
      paybackMonths: [8, 16],
    },
    successFactors: [
      "出餐速度决定翻台率",
      "标准化是快餐扩张的前提",
      "性价比是快餐的生命线",
      "选址在流量大的位置",
    ],
    failureReasons: [
      "出餐速度慢",
      "品质不稳定",
      "客单价过低导致利润薄",
      "租金占比过高",
    ],
    specialRisks: [
      { risk: "客单价天花板低", description: "快餐客单价天然低，利润空间有限" },
      { risk: "用工成本敏感", description: "快餐人力成本占比高，对排班要求高" },
      { risk: "竞争红海", description: "快餐门槛低，竞争激烈" },
    ],
    typicalModel: { area: 80, staff: 6, monthlyRevenue: 15, monthlyProfit: 2.5 },
    benchmarkBrands: [
      { name: "老乡鸡", highlights: "中式快餐标杆，1000+门店" },
      { name: "大米先生", highlights: "称菜模式，人效极高" },
      { name: "乡村基", highlights: "川式快餐连锁" },
    ],
    keyStrategies: [
      "精简菜单（30-40个SKU），聚焦爆款",
      "建立标准化SOP，降低培训成本",
      "优化排班，高峰期全勤，低峰期减员",
      "选址写字楼/学校周边等人流密集区",
    ],
  },

  // ─── 茶饮 ───
  {
    id: "teadrink",
    name: "茶饮",
    aliases: ["茶饮", "奶茶", "果茶", "新式茶饮"],
    description: "茶饮是高毛利、高周转的品类，但竞争已白热化。一线城市饱和，下沉市场还有空间。",
    benchmarks: {
      grossMargin: [0.65, 0.75],
      laborCostRatio: [0.12, 0.18],
      rentRatio: [0.12, 0.18],
      avgTicket: [10, 30],
      turnoverRate: [3, 6],
      areaRange: [15, 50],
      investmentRange: [15, 50],
      paybackMonths: [8, 18],
    },
    successFactors: [
      "品牌力决定溢价能力",
      "新品迭代速度保持新鲜感",
      "供应链控制品质和成本",
      "社群运营提升复购",
    ],
    failureReasons: [
      "缺乏差异化，同质化严重",
      "品牌力弱，只能打价格战",
      "新品研发能力不足",
      "选址位置不佳，自然客流不足",
    ],
    specialRisks: [
      { risk: "品牌生命周期短", description: "茶饮品牌更迭快，平均生命周期2-3年" },
      { risk: "原料价格波动", description: "鲜果等原料价格季节性波动大" },
      { risk: "竞争极度激烈", description: "一线城市茶饮店密度高，价格战激烈" },
    ],
    typicalModel: { area: 25, staff: 4, monthlyRevenue: 12, monthlyProfit: 2.5 },
    benchmarkBrands: [
      { name: "喜茶", highlights: "高端新式茶饮，品牌力强" },
      { name: "蜜雪冰城", highlights: "极致性价比，全国20000+门店" },
      { name: "茶颜悦色", highlights: "区域品牌，国风差异化" },
    ],
    keyStrategies: [
      "避开一线城市红海，深耕二三线及下沉市场",
      "打造差异化（文化、原料、场景）",
      "建立私域社群，提升复购和口碑",
      "控制门店面积在20-30㎡，降低租金压力",
    ],
  },

  // ─── 烧烤 ───
  {
    id: "bbq",
    name: "烧烤",
    aliases: ["烧烤", "烤肉", "烤串", "夜宵"],
    description: "烧烤是夜间经济核心品类，场景属性强。夏季旺季营收可达冬季的2-3倍。",
    benchmarks: {
      grossMargin: [0.6, 0.7],
      laborCostRatio: [0.18, 0.22],
      rentRatio: [0.08, 0.12],
      avgTicket: [50, 100],
      turnoverRate: [1.5, 2.5],
      areaRange: [80, 200],
      investmentRange: [30, 100],
      paybackMonths: [12, 24],
    },
    successFactors: [
      "食材新鲜度和品质是基础",
      "独特的调味和腌制配方",
      "营业时间灵活（下午到凌晨）",
      "氛围感决定回头率",
    ],
    failureReasons: [
      "食材品质不稳定",
      "季节性太强，淡季亏损",
      "油烟环保问题",
      "管理难度大（夜间经营）",
    ],
    specialRisks: [
      { risk: "环保合规风险", description: "油烟排放、噪音问题易导致投诉和整改" },
      { risk: "夏季依赖症", description: "冬季营收可能只有夏季的40-50%" },
      { risk: "夜间管理难", description: "夜间员工管理、安全问题突出" },
    ],
    typicalModel: { area: 150, staff: 8, monthlyRevenue: 25, monthlyProfit: 4 },
    benchmarkBrands: [
      { name: "木屋烧烤", highlights: "全国连锁，标准化做得好" },
      { name: "很久以前羊肉串", highlights: "场景体验标杆" },
    ],
    keyStrategies: [
      "增加冬季火锅/牛蛙等补充品类",
      "投资环保设备一次性到位",
      "建立食材供应链，保证品质稳定",
      "打造夜宵文化场景，提升品牌辨识度",
    ],
  },

  // ─── 咖啡 ───
  {
    id: "coffee",
    name: "咖啡",
    aliases: ["咖啡", "咖啡馆", "精品咖啡"],
    description: "咖啡市场高速增长，但已被瑞幸卷到极致性价比。独立咖啡馆需差异化。",
    benchmarks: {
      grossMargin: [0.65, 0.75],
      laborCostRatio: [0.2, 0.28],
      rentRatio: [0.12, 0.18],
      avgTicket: [20, 45],
      turnoverRate: [1.5, 3],
      areaRange: [30, 100],
      investmentRange: [15, 50],
      paybackMonths: [14, 28],
    },
    successFactors: [
      "咖啡品质是基础，但不止于咖啡",
      "空间设计和氛围是核心竞争力",
      "社群活动增加粘性",
      "复合业态（咖啡+简餐+零售）提升坪效",
    ],
    failureReasons: [
      "只卖咖啡，收入来源单一",
      "瑞幸价格战冲击",
      "位置偏僻客流不足",
      "缺乏社群运营能力",
    ],
    specialRisks: [
      { risk: "瑞幸竞争", description: "瑞幸9.9元定价拉低了行业价格天花板" },
      { risk: "精品小众市场有限", description: "精品咖啡客群规模小" },
      { risk: "独立咖啡馆生存难", description: "70%独立咖啡馆活不过第一年" },
    ],
    typicalModel: { area: 60, staff: 4, monthlyRevenue: 8, monthlyProfit: 1.5 },
    benchmarkBrands: [
      { name: "瑞幸咖啡", highlights: "极致效率，万店规模" },
      { name: "星巴克", highlights: "第三空间，品牌溢价" },
      { name: "Manner", highlights: "精品+性价比" },
    ],
    keyStrategies: [
      "不做纯咖啡，叠加简餐/甜品/零售",
      "私域社群是独立咖啡店的生存核心",
      "选址社区而非商圈，降低租金",
      "推出咖啡订阅/会员充值锁定复购",
    ],
  },

  // ─── 面馆 ───
  {
    id: "noodle",
    name: "面馆",
    aliases: ["面馆", "拉面", "粉面", "面条"],
    description: "面馆是国民刚需品类，小店模型人效高，适合夫妻创业。",
    benchmarks: {
      grossMargin: [0.6, 0.7],
      laborCostRatio: [0.18, 0.25],
      rentRatio: [0.1, 0.14],
      avgTicket: [15, 35],
      turnoverRate: [3, 5],
      areaRange: [30, 80],
      investmentRange: [10, 35],
      paybackMonths: [6, 14],
    },
    successFactors: [
      "汤底/浇头是核心竞争力",
      "出餐速度决定翻台率",
      "性价比决定复购率",
      "小店模型人效极高",
    ],
    failureReasons: [
      "汤底品质不稳定",
      "菜单过于复杂影响效率",
      "缺乏差异化，同质化竞争",
      "位置不佳，客流不足",
    ],
    specialRisks: [
      { risk: "标准化难度中等", description: "汤底可标准化，但浇头品质差异大" },
      { risk: "低客单价陷阱", description: "面馆客单价天然低，利润空间有限" },
      { risk: "品类认知固化", description: "面馆创新空间有限" },
    ],
    typicalModel: { area: 50, staff: 3, monthlyRevenue: 10, monthlyProfit: 2.5 },
    benchmarkBrands: [
      { name: "和府捞面", highlights: "高端面馆，品牌溢价" },
      { name: "马记永", highlights: "兰州拉面升级品牌" },
      { name: "遇见小面", highlights: "川渝风味面连锁" },
    ],
    keyStrategies: [
      "精简菜单（15-20个SKU），聚焦核心面品",
      "汤底中央厨房配送，店面只需煮面",
      "增加小食/饮品提升客单价",
      "选址社区密集区，靠复购生存",
    ],
  },

  // ─── 日料 ───
  {
    id: "japanese",
    name: "日料",
    aliases: ["日料", "日本料理", "寿司", "刺身", "日式"],
    description: "日料在中国市场增长迅速，但高端vs平价的路线差异大",
    benchmarks: {
      grossMargin: [0.58, 0.7],
      laborCostRatio: [0.22, 0.3],
      rentRatio: [0.1, 0.15],
      avgTicket: [30, 150],
      turnoverRate: [1.5, 3],
      areaRange: [40, 200],
      investmentRange: [30, 200],
      paybackMonths: [14, 28],
    },
    successFactors: [
      "食材新鲜度是生命线",
      "日料师傅水平决定品质",
      "性价比日料更大众化",
      "高端日料需要品牌背书",
    ],
    failureReasons: [
      "食材成本控制不好",
      "高端定位但品牌力不足",
      "品质与价格不匹配",
      "选址与客群不匹配",
    ],
    specialRisks: [
      { risk: "食材进口风险", description: "部分食材依赖进口，汇率和贸易政策影响大" },
      { risk: "高端客群有限", description: "高端日料客群规模有限，非一线城市更难" },
      { risk: "食品安全敏感", description: "刺身等生食对食品安全要求极高" },
    ],
    typicalModel: { area: 80, staff: 6, monthlyRevenue: 18, monthlyProfit: 3 },
    benchmarkBrands: [
      { name: "村上一屋", highlights: "平价日料连锁" },
      { name: "将太无二", highlights: "创意日料品牌" },
    ],
    keyStrategies: [
      "一线城市做高端，二三线做平价",
      "外带/外卖寿司提升坪效",
      "建立稳定的日料食材供应链",
      "日料师傅菜谱标准化，降低依赖",
    ],
  },

  // ─── 烘焙 ───
  {
    id: "bakery",
    name: "烘焙",
    aliases: ["烘焙", "面包", "蛋糕", "甜品"],
    description: "烘焙是高毛利品类，但竞争激烈。社区烘焙和私房烘焙是增长点。",
    benchmarks: {
      grossMargin: [0.6, 0.75],
      laborCostRatio: [0.2, 0.28],
      rentRatio: [0.1, 0.15],
      avgTicket: [15, 40],
      turnoverRate: [1, 2],
      areaRange: [30, 80],
      investmentRange: [15, 50],
      paybackMonths: [12, 24],
    },
    successFactors: [
      "产品新鲜度决定复购",
      "生日蛋糕是高毛利核心产品",
      "社区烘焙复购率是关键指标",
      "网红营销带来初始客流量",
    ],
    failureReasons: [
      "保质期短，损耗高",
      "产品缺乏差异化",
      "网红热度消退后没有复购",
      "供应链管理不当",
    ],
    specialRisks: [
      { risk: "高损耗率", description: "烘焙产品保质期短，损耗率可能达10-15%" },
      { risk: "季节性明显", description: "蛋糕旺季（节假日）和淡季差异大" },
      { risk: "同质化严重", description: "烘焙产品差异化难" },
    ],
    typicalModel: { area: 50, staff: 4, monthlyRevenue: 10, monthlyProfit: 2 },
    benchmarkBrands: [
      { name: "好利来", highlights: "全国烘焙连锁龙头" },
      { name: "鲍师傅", highlights: "糕点品类创新" },
    ],
    keyStrategies: [
      "生日蛋糕作为高毛利核心产品",
      "会员体系锁定复购",
      "控制损耗在8%以内",
      "社区店比商圈店更适合烘焙",
    ],
  },

  // ─── 小吃 ───
  {
    id: "snack",
    name: "小吃",
    aliases: ["小吃", "街边小吃", "特色小吃"],
    description: "小吃品类轻资产、高毛利，但品牌化难度大。适合低成本创业。",
    benchmarks: {
      grossMargin: [0.6, 0.8],
      laborCostRatio: [0.15, 0.22],
      rentRatio: [0.08, 0.13],
      avgTicket: [10, 30],
      turnoverRate: [3, 6],
      areaRange: [8, 30],
      investmentRange: [3, 15],
      paybackMonths: [4, 12],
    },
    successFactors: [
      "口味独特有记忆点",
      "出餐快、人效高",
      "低投入、高周转",
      "标准化后才能连锁化",
    ],
    failureReasons: [
      "无法标准化",
      "缺乏品牌意识",
      "食品安全问题",
      "品类生命周期短",
    ],
    specialRisks: [
      { risk: "食品安全监管", description: "小吃品类食品安全监管趋严" },
      { risk: "品类热度波动", description: "很多小吃品类热度周期短" },
      { risk: "品牌化门槛高", description: "小吃品牌化需要标准化和供应链投入" },
    ],
    typicalModel: { area: 15, staff: 2, monthlyRevenue: 5, monthlyProfit: 1.5 },
    benchmarkBrands: [
      { name: "文和友", highlights: "地方小吃文化综合体" },
      { name: "正新鸡排", highlights: "小吃连锁万店品牌" },
    ],
    keyStrategies: [
      "先做街边摊积累口碑",
      "标准化配方后再开店",
      "小吃+饮品提升客单价",
      "聚焦一个单品做到极致",
    ],
  },

  // ─── 粤菜 ───
  {
    id: "cantonese",
    name: "粤菜",
    aliases: ["粤菜", "广东菜", "烧腊", "早茶", "茶餐厅"],
    description: "粤菜是中国菜系第一，但餐厅模式差异大（早茶、烧腊、茶餐厅）。",
    benchmarks: {
      grossMargin: [0.55, 0.65],
      laborCostRatio: [0.22, 0.3],
      rentRatio: [0.1, 0.14],
      avgTicket: [40, 120],
      turnoverRate: [1.5, 2.5],
      areaRange: [50, 300],
      investmentRange: [15, 200],
      paybackMonths: [12, 24],
    },
    successFactors: [
      "食材品质是粤菜的生命",
      "早茶需要点心师傅，技术壁垒高",
      "烧腊可外带，多渠道收入",
      "茶餐厅模式全天候经营",
    ],
    failureReasons: [
      "厨师依赖度高",
      "食材成本高",
      "早茶人工成本占比大",
      "高端定位脱离大众消费",
    ],
    specialRisks: [
      { risk: "点心师傅紧缺", description: "好的粤菜点心师傅稀缺" },
      { risk: "品质一致性难", description: "粤菜讲究火候和食材，标准化难" },
      { risk: "地域局限", description: "粤菜在非华南地区的接受度有限" },
    ],
    typicalModel: { area: 200, staff: 12, monthlyRevenue: 25, monthlyProfit: 4 },
    benchmarkBrands: [
      { name: "广州酒家", highlights: "老字号粤菜品牌" },
      { name: "点都德", highlights: "广式早茶连锁" },
      { name: "太兴茶餐厅", highlights: "茶餐厅模式标杆" },
    ],
    keyStrategies: [
      "烧腊/点心可外带+外卖双重收入",
      "茶餐厅模式全天候经营提高坪效",
      "中央厨房解决点心标准化",
      "在一线城市做高端，在二三线做大众",
    ],
  },

  // ─── 川菜 ───
  {
    id: "chuan",
    name: "川菜",
    aliases: ["川菜", "四川菜", "麻辣"],
    description: "川菜是全国接受度最高的菜系，麻辣口味有广泛群众基础。",
    benchmarks: {
      grossMargin: [0.58, 0.68],
      laborCostRatio: [0.2, 0.26],
      rentRatio: [0.1, 0.14],
      avgTicket: [35, 75],
      turnoverRate: [2, 3],
      areaRange: [80, 200],
      investmentRange: [30, 100],
      paybackMonths: [10, 20],
    },
    successFactors: [
      "麻辣口味有广泛群众基础",
      "川菜厨师供应充足",
      "性价比是川菜的核心竞争力",
      "标准化程度高于其他中餐",
    ],
    failureReasons: [
      "只做辣，缺乏层次",
      "品质不稳定",
      "竞争激烈，同质化严重",
      "装修投入过高",
    ],
    specialRisks: [
      { risk: "竞争红海", description: "川菜是最激烈的中餐赛道" },
      { risk: "厨师依赖", description: "好的川菜师傅对出品影响大" },
      { risk: "同质化", description: "川菜餐厅差异化难" },
    ],
    typicalModel: { area: 150, staff: 8, monthlyRevenue: 20, monthlyProfit: 3.5 },
    benchmarkBrands: [
      { name: "眉州东坡", highlights: "川菜连锁标杆" },
      { name: "陈麻婆豆腐", highlights: "老字号品牌" },
    ],
    keyStrategies: [
      "聚焦1-2道招牌菜建立识别",
      "控制辣度适应不同区域市场",
      "社区店比商圈店更适合川菜",
      "精简菜单控制成本",
    ],
  },

  // ─── 小龙虾 ───
  {
    id: "crayfish",
    name: "小龙虾",
    aliases: ["小龙虾", "龙虾"],
    description: "小龙虾是超强季节性品类（5-10月旺季），但旺季利润极高。",
    benchmarks: {
      grossMargin: [0.55, 0.65],
      laborCostRatio: [0.18, 0.25],
      rentRatio: [0.08, 0.12],
      avgTicket: [60, 120],
      turnoverRate: [1.5, 2.5],
      areaRange: [80, 200],
      investmentRange: [30, 80],
      paybackMonths: [8, 16],
    },
    successFactors: [
      "小龙虾品质和口味是核心",
      "旺季营销能力决定全年收入",
      "供应链稳定性保证品质",
      "场景氛围决定客单价",
    ],
    failureReasons: [
      "季节性强，淡季无收入",
      "没有淡季替代品类",
      "小龙虾价格波动大",
      "只做堂食，没有外卖",
    ],
    specialRisks: [
      { risk: "季节性强", description: "小龙虾旺季5-10月，淡季营收下降70%" },
      { risk: "价格波动大", description: "小龙虾采购价格随季节波动可达50%" },
      { risk: "食品安全敏感", description: "小龙虾清洗不净易导致食品安全问题" },
    ],
    typicalModel: { area: 120, staff: 8, monthlyRevenue: 28, monthlyProfit: 5 },
    benchmarkBrands: [
      { name: "文和友", highlights: "长沙小龙虾文化地标" },
      { name: "靓靓蒸虾", highlights: "武汉小龙虾品牌" },
    ],
    keyStrategies: [
      "必须有淡季替代品类（牛蛙/烤鱼/火锅）",
      "旺季要爆产能，淡季要控成本",
      "外卖+堂食双通道",
      "建立稳定的供应链锁价",
    ],
  },

  // ─── 卤味 ───
  {
    id: "braised",
    name: "卤味",
    aliases: ["卤味", "卤菜", "卤制品"],
    description: "卤味是高毛利、轻资产品类，适合小店模型和加盟扩张。",
    benchmarks: {
      grossMargin: [0.6, 0.75],
      laborCostRatio: [0.12, 0.18],
      rentRatio: [0.08, 0.12],
      avgTicket: [15, 40],
      turnoverRate: [2, 4],
      areaRange: [10, 30],
      investmentRange: [5, 20],
      paybackMonths: [6, 14],
    },
    successFactors: [
      "卤水配方是核心竞争力",
      "供应链决定扩张能力",
      "小店模型坪效极高",
      "品牌化提升溢价",
    ],
    failureReasons: [
      "食品安全问题",
      "口味不稳定",
      "缺乏品牌意识",
      "供应链跟不上扩张",
    ],
    specialRisks: [
      { risk: "食品安全高要求", description: "卤味属于高危食品，需要严格品控" },
      { risk: "保质期短", description: "卤制品保质期一般2-3天" },
      { risk: "区域口味差异", description: "卤味口味区域性很强" },
    ],
    typicalModel: { area: 15, staff: 2, monthlyRevenue: 6, monthlyProfit: 1.8 },
    benchmarkBrands: [
      { name: "绝味鸭脖", highlights: "万店连锁，供应链标杆" },
      { name: "周黑鸭", highlights: "品牌化卤味代表" },
    ],
    keyStrategies: [
      "中央工厂+冷链配送是连锁核心",
      "建立严格品控和食品安全体系",
      "小店+外卖模式降低租金成本",
      "口味要适配区域市场",
    ],
  },
];

/**
 * 根据品类名获取品类知识包
 */
export function getCategoryProfile(category: string): CategoryProfile | null {
  const lower = category.toLowerCase();
  for (const profile of CATEGORY_PROFILES) {
    if (
      profile.name === category ||
      profile.aliases.some((a) => a === category || a.includes(category) || lower.includes(a))
    ) {
      return profile;
    }
  }
  return null;
}

/**
 * 获取品类行业基准指标
 */
export function getCategoryBenchmarks(
  category: string,
): CategoryProfile["benchmarks"] | null {
  const profile = getCategoryProfile(category);
  return profile?.benchmarks ?? null;
}
