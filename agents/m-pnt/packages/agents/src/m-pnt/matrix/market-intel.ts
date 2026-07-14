/**
 * 餐饮品类市场竞争数据
 *
 * 数据已迁移到 knowledge/market-assets/（V2 知识库）。
 * 此文件保留为兼容查询接口，数据源改为从知识库加载。
 *
 * 迁移状态：✅ 数据定义 → knowledge/market-assets/
 *           保留 marketData / mentalKeywords 作为回落缓存
 *
 * 数据来源：行业报告 + 实地调研 + 常识估计
 * 持续更新
 *
 * @deprecated 数据定义即将迁移到 knowledge/market-assets/
 *   查询接口 getCompetitionData / getMentalWords / isInWhiteSpot 保持不变
 */

export interface CompetitorProfile {
  brand: string;
  position: string;       // 心智位置
  budget?: "强" | "中" | "弱";
  note?: string;
}

export interface CityCategoryData {
  leaders: CompetitorProfile[];
  whiteSpots: string[];
  priceBand: [number, number];
  saturation: "极高" | "高" | "中" | "低";
  stage: "导入期" | "成长期" | "成熟期" | "衰退期";
  note?: string;
}

// ─── 品类×城市竞争数据库 ───────────────────────────────────────

const marketData: Record<string, Record<string, CityCategoryData>> = {

  // ═══ 湘菜 ═══════════════════════════════════════════════════
  "湘菜": {
    "长沙": {
      leaders: [
        { brand: "费大厨", position: "辣椒炒肉·品类第一", budget: "强", note: "全国连锁心智最强" },
        { brand: "炊烟", position: "小炒黄牛肉·品类第一", budget: "强", note: "长沙地标" },
        { brand: "一盏灯", position: "地道湘菜·老字号信任", budget: "中", note: "本地人认可" },
        { brand: "鲁哥饭店", position: "平价家常湘菜", budget: "弱", note: "社区型" },
      ],
      whiteSpots: ["夜间场景湘菜", "一人食湘菜", "湘菜+精酿小酒馆", "家庭日常湘菜", "精致湘菜（客单150+）"],
      priceBand: [50, 120],
      saturation: "极高",
      stage: "成熟期",
      note: "头部已经被费大厨和炊烟占稳，新品牌只能切场景或价格带空位",
    },
    "深圳": {
      leaders: [
        { brand: "费大厨", position: "全国湘菜领导品牌", budget: "强" },
        { brand: "农耕记", position: "湖南土菜·食材原产地", budget: "强" },
        { brand: "湘阁里辣", position: "性价比湘菜", budget: "中" },
      ],
      whiteSpots: ["精致湘菜", "商务湘菜", "湘菜+酒", "湖南米粉专门店"],
      priceBand: [60, 130],
      saturation: "高",
      stage: "成熟期",
    },
    "北京": {
      leaders: [
        { brand: "费大厨", position: "湘菜全国连锁第一", budget: "强" },
        { brand: "潇湘阁", position: "北京湘菜性价比首选", budget: "中" },
        { brand: "辣婆婆", position: "水煮鱼·湘菜代表", budget: "中" },
      ],
      whiteSpots: ["湖南地州市井菜", "湘菜+精酿", "一人食湘菜"],
      priceBand: [65, 140],
      saturation: "高",
      stage: "成熟期",
    },
  },

  // ═══ 火锅 ═══════════════════════════════════════════════════
  "火锅": {
    "重庆": {
      leaders: [
        { brand: "海底捞", position: "极致服务火锅", budget: "强" },
        { brand: "周师兄", position: "大刀腰片·重庆火锅", budget: "强" },
        { brand: "珮姐", position: "回家路线·重庆味", budget: "强" },
        { brand: "卤校长", position: "卤味火锅·新派", budget: "中" },
      ],
      whiteSpots: ["一人食火锅", "精致小火锅（客单150+）", "火锅+酒馆", "潮汕牛肉火锅（重庆）"],
      priceBand: [70, 150],
      saturation: "极高",
      stage: "成熟期",
      note: "火锅心智极度拥挤，新品牌几乎只能场景切割",
    },
    "成都": {
      leaders: [
        { brand: "海底捞", position: "极致服务", budget: "强" },
        { brand: "小龙坎", position: "地道川味火锅", budget: "强" },
        { brand: "蜀大侠", position: "武侠主题火锅", budget: "中" },
        { brand: "大龙燚", position: "麻辣火锅代表", budget: "中" },
      ],
      whiteSpots: ["精致小锅", "一人食火锅", "泰式/椰子鸡火锅"],
      priceBand: [65, 140],
      saturation: "极高",
      stage: "成熟期",
    },
    "上海": {
      leaders: [
        { brand: "海底捞", position: "标杆服务", budget: "强" },
        { brand: "左庭右院", position: "鲜牛肉火锅·品质", budget: "强" },
        { brand: "捞王", position: "猪肚鸡火锅·养生", budget: "强" },
      ],
      whiteSpots: ["一人食火锅", "重庆老火锅正宗派", "火锅+甜品"],
      priceBand: [80, 180],
      saturation: "高",
      stage: "成熟期",
    },
  },

  // ═══ 茶饮 ═══════════════════════════════════════════════════
  "茶饮": {
    "长沙": {
      leaders: [
        { brand: "茶颜悦色", position: "中国风茶饮·长沙名片", budget: "强" },
        { brand: "霸王茶姬", position: "健康轻负担·国风", budget: "强" },
        { brand: "喜茶", position: "灵感之茶·高端", budget: "强" },
      ],
      whiteSpots: ["纯茶专门店", "茶饮+酒", "儿童友好茶饮", "社区平价茶饮"],
      priceBand: [12, 30],
      saturation: "极高",
      stage: "成熟期",
      note: "茶颜在长沙的心智太强，新品牌很难正面竞争",
    },
    "上海": {
      leaders: [
        { brand: "喜茶", position: "灵感之茶·高端创新", budget: "强" },
        { brand: "奈雪", position: "茶+包·生活方式", budget: "强" },
        { brand: "乐乐茶", position: "脏脏包·欧包茶饮", budget: "中" },
      ],
      whiteSpots: ["中式纯茶", "社区平价茶饮", "茶饮+小酒", "养生茶饮"],
      priceBand: [15, 35],
      saturation: "极高",
      stage: "成熟期",
    },
  },

  // ═══ 川菜 ═══════════════════════════════════════════════════
  "川菜": {
    "成都": {
      leaders: [
        { brand: "陈麻婆", position: "老字号·麻婆豆腐", budget: "中" },
        { brand: "眉州东坡", position: "东坡肉·品质川菜", budget: "强" },
        { brand: "陶德砂锅", position: "砂锅菜·排队王", budget: "中" },
      ],
      whiteSpots: ["精致川菜（客单150+）", "一人食川菜", "川菜+酒", "新派融合川菜"],
      priceBand: [45, 110],
      saturation: "高",
      stage: "成熟期",
    },
  },

  // ═══ 烧烤 ═══════════════════════════════════════════════════
  "烧烤": {
    "哈尔滨": {
      leaders: [
        { brand: "金刚山", position: "东北烧烤代表·规模", budget: "中" },
        { brand: "1930", position: "老味烧烤·地道", budget: "中" },
      ],
      whiteSpots: ["精致烧烤", "韩式+东北融合", "一人食烧烤"],
      priceBand: [50, 100],
      saturation: "高",
      stage: "成熟期",
    },
    "长沙": {
      leaders: [
        { brand: "客串出品", position: "长沙烧烤·夜宵代表", budget: "中" },
        { brand: "盟重烧烤", position: "湘派烧烤·网红", budget: "中" },
      ],
      whiteSpots: ["精致室内烧烤", "东北烧烤（长沙）", "烧烤+精酿"],
      priceBand: [50, 110],
      saturation: "高",
      stage: "成熟期",
    },
  },

  // ═══ 面馆 ═══════════════════════════════════════════════════
  "面馆": {
    "西安": {
      leaders: [
        { brand: "老孙家", position: "羊肉泡馍·老字号", budget: "中" },
        { brand: "天下第一面", position: "特色面食·游客必吃", budget: "中" },
      ],
      whiteSpots: ["精致汤面", "重庆小面（西安）", "手作面馆", "宵夜面馆"],
      priceBand: [15, 40],
      saturation: "高",
      stage: "成熟期",
    },
    "上海": {
      leaders: [
        { brand: "和府捞面", position: "书房捞面·品质", budget: "强" },
        { brand: "味千拉面", position: "日式拉面·标准连锁", budget: "强" },
        { brand: "陈香贵", position: "兰州牛肉面·新锐", budget: "中" },
      ],
      whiteSpots: ["本帮面馆", "纯手工面", "社区面馆", "浇头面专门店"],
      priceBand: [25, 55],
      saturation: "高",
      stage: "成熟期",
    },
  },

  // ═══ 饺子 ═══════════════════════════════════════════════════
  "饺子": {
    "沈阳": {
      leaders: [
        { brand: "老边饺子", position: "百年老字号·沈阳名片", budget: "中" },
        { brand: "大清花", position: "满族风味饺子", budget: "中" },
      ],
      whiteSpots: ["新派饺子", "饺子+酒", "精致水饺", "一人食饺子"],
      priceBand: [20, 50],
      saturation: "中",
      stage: "成熟期",
    },
    "北京": {
      leaders: [
        { brand: "喜家德", position: "虾仁水饺·全国连锁", budget: "强" },
        { brand: "东方饺子王", position: "东北手工饺·老品牌", budget: "中" },
      ],
      whiteSpots: ["北京本地饺", "饺子+凉菜酒馆", "高端手工饺"],
      priceBand: [25, 60],
      saturation: "中",
      stage: "成熟期",
    },
  },

  // ═══ 快餐 ═══════════════════════════════════════════════════
  "快餐": {
    "北京": {
      leaders: [
        { brand: "麦当劳", position: "西式快餐·汉堡代表", budget: "强" },
        { brand: "肯德基", position: "炸鸡快餐·全家桶", budget: "强" },
        { brand: "南城香", position: "北京快餐·性价比之王", budget: "中" },
      ],
      whiteSpots: ["健康快餐", "中式高品质快餐", "一人食中餐"],
      priceBand: [20, 50],
      saturation: "极高",
      stage: "成熟期",
    },
    "上海": {
      leaders: [
        { brand: "麦当劳", position: "西式快餐标准", budget: "强" },
        { brand: "老乡鸡", position: "中式快餐·品质代表", budget: "强" },
        { brand: "大米先生", position: "称重自选·性价比", budget: "中" },
      ],
      whiteSpots: ["本帮快餐", "健康轻食快餐", "精致一人食"],
      priceBand: [22, 55],
      saturation: "极高",
      stage: "成熟期",
    },
  },

  // ═══ 烘焙 ═══════════════════════════════════════════════════
  "烘焙": {
    "上海": {
      leaders: [
        { brand: "好利来", position: "生日蛋糕·半熟芝士", budget: "强" },
        { brand: "B&C", position: "精品面包·网红", budget: "中" },
        { brand: "幸福西饼", position: "线上烘焙·配送", budget: "中" },
      ],
      whiteSpots: ["中式烘焙", "社区面包坊", "低糖健康烘焙"],
      priceBand: [15, 45],
      saturation: "高",
      stage: "成熟期",
    },
  },

  // ═══ 日料 ═══════════════════════════════════════════════════
  "日料": {
    "上海": {
      leaders: [
        { brand: "Maki House", position: "性价比日料·排队王", budget: "中" },
        { brand: "平成屋", position: "居酒屋·日式氛围", budget: "中" },
        { brand: "鮨一", position: "高端Omakase", budget: "强" },
      ],
      whiteSpots: ["平价omakase", "日式定食专门店", "关东煮专门店", "日式咖喱"],
      priceBand: [60, 200],
      saturation: "高",
      stage: "成长期",
    },
    "北京": {
      leaders: [
        { brand: "将太无二", position: "创意寿司·品质代表", budget: "中" },
        { brand: "德川家", position: "日式自助·性价比", budget: "中" },
      ],
      whiteSpots: ["关西风味", "日式拉面专门店", "家庭日料"],
      priceBand: [70, 220],
      saturation: "高",
      stage: "成长期",
    },
  },

  // ═══ 粤菜 ═══════════════════════════════════════════════════
  "粤菜": {
    "广州": {
      leaders: [
        { brand: "广州酒家", position: "老字号·粤菜代表", budget: "强" },
        { brand: "点都德", position: "广式早茶·连锁第一", budget: "强" },
        { brand: "陶陶居", position: "百年老字号·粤菜", budget: "强" },
      ],
      whiteSpots: ["新派粤菜", "粤菜小酒馆", "一人食粤菜", "潮汕菜专门店"],
      priceBand: [50, 150],
      saturation: "极高",
      stage: "成熟期",
    },
    "深圳": {
      leaders: [
        { brand: "点都德", position: "广式早茶", budget: "强" },
        { brand: "利宝阁", position: "精致粤菜·宴请", budget: "强" },
      ],
      whiteSpots: ["新派融合粤菜", "潮汕夜宵", "粤式打边炉"],
      priceBand: [55, 160],
      saturation: "高",
      stage: "成熟期",
    },
  },

  // ═══ 潮汕菜 ═════════════════════════════════════════════════
  "潮汕菜": {
    "深圳": {
      leaders: [
        { brand: "陈鹏鹏", position: "潮汕卤鹅·品类开创", budget: "强" },
        { brand: "八合里", position: "潮汕牛肉火锅·代表", budget: "强" },
      ],
      whiteSpots: ["潮汕打冷", "潮汕夜粥", "潮汕小吃专门店"],
      priceBand: [50, 130],
      saturation: "中",
      stage: "成长期",
    },
    "广州": {
      leaders: [
        { brand: "八合里", position: "潮汕牛肉火锅", budget: "强" },
      ],
      whiteSpots: ["潮汕菜·精细料理", "潮汕夜宵大排档"],
      priceBand: [45, 120],
      saturation: "中",
      stage: "成长期",
    },
  },

  // ═══ 串串/麻辣烫 ════════════════════════════════════════════
  "串串": {
    "成都": {
      leaders: [
        { brand: "钢管厂五区", position: "小郡肝串串·品类第一", budget: "强" },
        { brand: "马路边边", position: "麻辣烫·复古风", budget: "中" },
      ],
      whiteSpots: ["精品串串", "一人食串串", "串串+酒"],
      priceBand: [30, 70],
      saturation: "高",
      stage: "成熟期",
    },
    "重庆": {
      leaders: [
        { brand: "李记串串", position: "重庆串串·老字号", budget: "中" },
      ],
      whiteSpots: ["甜品+串串", "精致小串"],
      priceBand: [25, 65],
      saturation: "高",
      stage: "成熟期",
    },
  },

  // ═══ 兰州拉面 ═══════════════════════════════════════════════
  "兰州拉面": {
    "上海": {
      leaders: [
        { brand: "陈香贵", position: "兰州牛肉面·新锐连锁", budget: "强" },
        { brand: "马记永", position: "兰州牛肉面·品质代表", budget: "强" },
        { brand: "张拉拉", position: "手撕牛肉面·创新", budget: "中" },
      ],
      whiteSpots: ["传统兰州老味道", "兰州小吃专门店", "清真兰州拉面"],
      priceBand: [20, 45],
      saturation: "高",
      stage: "成长期",
    },
    "北京": {
      leaders: [
        { brand: "陈香贵", position: "兰州牛肉面·新锐", budget: "强" },
        { brand: "马记永", position: "兰州牛肉面·品质", budget: "强" },
      ],
      whiteSpots: ["社区兰州面馆", "兰州烤串+面", "清真老字号"],
      priceBand: [22, 48],
      saturation: "高",
      stage: "成长期",
    },
  },

  // ═══ 粉/螺蛳粉 ═════════════════════════════════════════════
  "螺蛳粉": {
    "柳州": {
      leaders: [
        { brand: "螺霸王", position: "柳州螺蛳粉·袋装第一", budget: "强" },
        { brand: "好欢螺", position: "螺蛳粉·经典口味", budget: "强" },
      ],
      whiteSpots: ["现煮螺蛳粉专门店", "螺蛳粉+炸蛋", "螺蛳粉火锅"],
      priceBand: [10, 30],
      saturation: "中",
      stage: "成长期",
    },
    "广州": {
      leaders: [
        { brand: "螺蛳粉先生", position: "广州螺蛳粉代表", budget: "中" },
      ],
      whiteSpots: ["螺蛳粉+甜品", "柳州当地味道"],
      priceBand: [12, 28],
      saturation: "中",
      stage: "成长期",
    },
  },

  // ═══ 轻食/沙拉 ══════════════════════════════════════════════
  "轻食": {
    "上海": {
      leaders: [
        { brand: "Wagas", position: "轻食沙拉·品质代表", budget: "强" },
        { brand: "gaga", position: "轻食+茶饮·生活方式", budget: "强" },
      ],
      whiteSpots: ["中式轻食", "平价轻食", "社区轻食"],
      priceBand: [30, 70],
      saturation: "高",
      stage: "成长期",
    },
    "北京": {
      leaders: [
        { brand: "Wagas", position: "轻食沙拉", budget: "强" },
        { brand: "超级碗", position: "健康轻食·性价比", budget: "中" },
      ],
      whiteSpots: ["中式健康餐", "高蛋白轻食", "外卖轻食专门店"],
      priceBand: [28, 68],
      saturation: "中",
      stage: "成长期",
    },
  },

  // ═══ 烤鱼 ════════════════════════════════════════════════════
  "烤鱼": {
    "重庆": {
      leaders: [
        { brand: "探鱼", position: "烤鱼连锁第一·口味多", budget: "强" },
        { brand: "烤匠", position: "麻辣烤鱼·川味代表", budget: "强" },
      ],
      whiteSpots: ["活鱼现烤专门店", "烤鱼+酒馆", "一人食烤鱼"],
      priceBand: [60, 120],
      saturation: "高",
      stage: "成熟期",
    },
    "北京": {
      leaders: [
        { brand: "探鱼", position: "全国烤鱼连锁第一", budget: "强" },
        { brand: "江边城外", position: "巫山烤鱼·北京代表", budget: "中" },
      ],
      whiteSpots: ["重庆烤鱼正宗派", "烤鱼+川菜"],
      priceBand: [65, 130],
      saturation: "高",
      stage: "成熟期",
    },
  },

  // ═══ 小龙虾 ══════════════════════════════════════════════════
  "小龙虾": {
    "长沙": {
      leaders: [
        { brand: "文和友", position: "长沙小龙虾·文旅地标", budget: "强" },
        { brand: "天宝兄弟", position: "长沙口味虾·品质代表", budget: "强" },
      ],
      whiteSpots: ["小龙虾+面", "精品小龙虾外卖", "龙虾+精酿"],
      priceBand: [60, 150],
      saturation: "高",
      stage: "成熟期",
    },
    "北京": {
      leaders: [
        { brand: "胡大", position: "簋街麻小·北京代表", budget: "强" },
        { brand: "花家怡园", position: "小龙虾+京菜", budget: "中" },
      ],
      whiteSpots: ["潜江小龙虾直营", "小龙虾+烧烤", "外卖精品虾"],
      priceBand: [70, 160],
      saturation: "高",
      stage: "成熟期",
    },
  },

  // ═══ 炸鸡 ════════════════════════════════════════════════════
  "炸鸡": {
    "首尔/延边风格": {
      leaders: [
        { brand: "正新鸡排", position: "鸡排·全国门店第一", budget: "强" },
        { brand: "Popeyes", position: "美式炸鸡·网红", budget: "强" },
      ],
      whiteSpots: ["韩式炸鸡专门店", "炸鸡+啤酒屋", "中式炸鸡"],
      priceBand: [15, 40],
      saturation: "极高",
      stage: "成熟期",
    },
  },

  // ═══ 麻辣香锅 ════════════════════════════════════════════════
  "麻辣香锅": {
    "北京": {
      leaders: [
        { brand: "海底捞·香锅", position: "麻辣香锅·品质连锁", budget: "强" },
      ],
      whiteSpots: ["香锅+酒", "一人食香锅", "社区香锅"],
      priceBand: [40, 90],
      saturation: "中",
      stage: "成熟期",
    },
  },

  // ═══ 云南菜 ══════════════════════════════════════════════════
  "云南菜": {
    "昆明": {
      leaders: [
        { brand: "一朵菌", position: "野生菌火锅·代表", budget: "中" },
        { brand: "老滇山寨", position: "民族风情·云南菜", budget: "中" },
      ],
      whiteSpots: ["云南小吃过桥米线", "云南烧烤", "精致云南菜"],
      priceBand: [40, 100],
      saturation: "中",
      stage: "成长期",
    },
    "北京": {
      leaders: [
        { brand: "火烧云", position: "傣味·油焖鸡·排队王", budget: "中" },
      ],
      whiteSpots: ["云南小锅米线", "滇菜小酒馆"],
      priceBand: [50, 120],
      saturation: "低",
      stage: "成长期",
    },
  },

  // ═══ 东南亚菜 ════════════════════════════════════════════════
  "东南亚菜": {
    "上海": {
      leaders: [
        { brand: "Ginger", position: "新派东南亚·品质", budget: "强" },
        { brand: "瓦城", position: "泰式料理·连锁", budget: "中" },
      ],
      whiteSpots: ["越南Pho专门店", "海南鸡饭专门店", "新加坡菜"],
      priceBand: [60, 150],
      saturation: "中",
      stage: "成长期",
    },
    "广州": {
      leaders: [
        { brand: "大头虾", position: "越式料理·广州代表", budget: "中" },
      ],
      whiteSpots: ["泰国船面", "马来西亚菜"],
      priceBand: [40, 100],
      saturation: "中",
      stage: "成长期",
    },
  },

  // ═══ 本帮菜/江浙菜 ═══════════════════════════════════════════
  "本帮菜": {
    "上海": {
      leaders: [
        { brand: "绿波廊", position: "本帮菜·老字号代表", budget: "强" },
        { brand: "人和馆", position: "精致本帮·米其林", budget: "强" },
        { brand: "兰亭餐厅", position: "平价本帮·性价比", budget: "中" },
      ],
      whiteSpots: ["本帮菜小酒馆", "一人食上海菜", "新派本帮"],
      priceBand: [60, 180],
      saturation: "高",
      stage: "成熟期",
    },
  },

  // ═══ 咖喱/印度菜 ════════════════════════════════════════════
  "咖喱": {
    "上海": {
      leaders: [
        { brand: "Currify", position: "印度咖喱·新派", budget: "中" },
      ],
      whiteSpots: ["日式咖喱专门店", "咖喱+蛋包饭", "社区咖喱屋"],
      priceBand: [30, 80],
      saturation: "低",
      stage: "导入期",
    },
  },

  // ═══ 小吃/炸串 ═══════════════════════════════════════════════
  "小吃": {
    "长沙": {
      leaders: [
        { brand: "黑色经典", position: "长沙臭豆腐·品类第一", budget: "强" },
        { brand: "文和友", position: "长沙小吃集合·文旅", budget: "强" },
      ],
      whiteSpots: ["长沙糖油粑粑专门店", "炸串专门店", "全国小吃集合"],
      priceBand: [5, 30],
      saturation: "高",
      stage: "成熟期",
    },
    "成都": {
      leaders: [
        { brand: "夫妻肺片", position: "成都小吃·老字号", budget: "中" },
      ],
      whiteSpots: ["钵钵鸡专门店", "甜水面专门店", "成都小吃集合店"],
      priceBand: [5, 35],
      saturation: "高",
      stage: "成熟期",
    },
  },

  // ═══ 深夜食堂/居酒屋 ════════════════════════════════════════
  "居酒屋": {
    "上海": {
      leaders: [
        { brand: "平成屋", position: "日式居酒屋·连锁代表", budget: "中" },
        { brand: "串魂", position: "日式烤串·深夜食堂", budget: "中" },
      ],
      whiteSpots: ["中式居酒屋", "女性友好居酒屋", "一人饮专门店"],
      priceBand: [60, 150],
      saturation: "中",
      stage: "成长期",
    },
    "北京": {
      leaders: [
        { brand: "鸟州力", position: "日式烤串·北京代表", budget: "中" },
      ],
      whiteSpots: ["中式深夜食堂", "北京小酒馆"],
      priceBand: [65, 160],
      saturation: "中",
      stage: "成长期",
    },
  },
};

// ─── 心智词库 ───────────────────────────────────────────────────

// 每个品类的核心心智词和场景词
const mentalKeywords: Record<string, {
  categoryWords: string[];       // 消费者用来描述该品类的词
  sceneWords: string[];          // 高频场景词
  valueWords: string[];          // 价值诉求词
  emotionalWords: string[];      // 情感诉求词
}> = {
  "湘菜": {
    categoryWords: ["辣", "下饭", "家常", "重口味", "烟火气", "锅气", "湖南"],
    sceneWords: ["朋友聚餐", "家庭日常", "工作午餐", "周末聚餐", "夜宵"],
    valueWords: ["实惠", "量大", "地道", "正宗", "新鲜"],
    emotionalWords: ["过瘾", "爽", "下饭", "家乡味", "热热闹闹"],
  },
  "火锅": {
    categoryWords: ["涮", "烫", "麻辣", "锅底", "食材", "鲜"],
    sceneWords: ["朋友聚会", "家庭聚餐", "团建", "夜宵", "庆祝"],
    valueWords: ["食材新鲜", "锅底正宗", "服务好", "性价比"],
    emotionalWords: ["热闹", "过瘾", "温暖", "社交", "尽兴"],
  },
  "茶饮": {
    categoryWords: ["奶茶", "果茶", "纯茶", "鲜奶", "清爽"],
    sceneWords: ["下午茶", "逛街", "外卖", "办公室", "社交打卡"],
    valueWords: ["健康", "低糖", "新鲜", "大牌平替"],
    emotionalWords: ["治愈", "清爽", "快乐", "小确幸"],
  },
  "川菜": {
    categoryWords: ["麻辣", "鲜香", "下饭", "重口", "丰富"],
    sceneWords: ["朋友聚餐", "家庭日常", "工作餐", "宴请"],
    valueWords: ["性价比", "正宗", "分量足", "地道"],
    emotionalWords: ["过瘾", "热闹", "烟火气"],
  },
  "烧烤": {
    categoryWords: ["烤串", "烤肉", "烟火", "啤酒", "夜宵"],
    sceneWords: ["夜宵", "朋友局", "夏日", "聚会", "下班放松"],
    valueWords: ["食材好", "分量足", "性价比", "氛围"],
    emotionalWords: ["放松", "快乐", "烟火", "江湖"],
  },
  "面馆": {
    categoryWords: ["面", "汤", "浇头", "手工", "筋道"],
    sceneWords: ["工作日午餐", "便餐", "一人食", "社区日常"],
    valueWords: ["实惠", "量足", "汤好", "地道"],
    emotionalWords: ["暖", "满足", "家常", "舒服"],
  },
  "饺子": {
    categoryWords: ["饺子", "馅", "手工", "薄皮", "大馅"],
    sceneWords: ["家常便饭", "周末", "节日", "一人食", "外卖"],
    valueWords: ["食材好", "新鲜", "馅大", "实惠"],
    emotionalWords: ["家的味道", "温暖", "满足"],
  },
  "快餐": {
    categoryWords: ["快", "方便", "套餐", "米饭", "盖浇"],
    sceneWords: ["工作午餐", "赶时间", "便餐", "一人食"],
    valueWords: ["速度快", "性价比", "卫生", "不贵"],
    emotionalWords: ["省事", "不讲究", "凑合一顿"],
  },
  "烘焙": {
    categoryWords: ["面包", "蛋糕", "甜品", "现烤", "手工"],
    sceneWords: ["早餐", "下午茶", "生日", "零食", "伴手礼"],
    valueWords: ["新鲜", "低糖", "品质", "手作"],
    emotionalWords: ["甜蜜", "幸福感", "精致", "小资"],
  },
  "日料": {
    categoryWords: ["寿司", "刺身", "拉面", "日式", "定食", "居酒屋"],
    sceneWords: ["朋友聚餐", "一人食", "商务午餐", "晚餐约饭", "纪念日"],
    valueWords: ["新鲜", "精致", "性价比", "食材好"],
    emotionalWords: ["精致", "仪式感", "治愈", "小资"],
  },
  "粤菜": {
    categoryWords: ["早茶", "点心", "烧腊", "煲汤", "清淡", "鲜美"],
    sceneWords: ["早茶", "家庭聚餐", "商务宴请", "周末"],
    valueWords: ["食材新鲜", "原汁原味", "精致", "老字号"],
    emotionalWords: ["精致", "传统", "家的味道", "讲究"],
  },
  "潮汕菜": {
    categoryWords: ["潮汕", "牛肉丸", "卤水", "砂锅粥", "打冷"],
    sceneWords: ["夜宵", "家庭聚餐", "朋友局"],
    valueWords: ["食材地道", "新鲜", "原味"],
    emotionalWords: ["地道", "家乡味", "烟火气"],
  },
  "串串": {
    categoryWords: ["串串", "麻辣烫", "签签", "火锅"],
    sceneWords: ["朋友局", "夜宵", "聚会", "下班"],
    valueWords: ["便宜", "种类多", "性价比"],
    emotionalWords: ["热闹", "过瘾", "爽"],
  },
  "兰州拉面": {
    categoryWords: ["拉面", "牛肉面", "清真", "手工", "汤面"],
    sceneWords: ["工作日午餐", "便餐", "一人食"],
    valueWords: ["实惠", "量大", "汤好"],
    emotionalWords: ["满足", "暖", "实在"],
  },
  "螺蛳粉": {
    categoryWords: ["螺蛳粉", "酸笋", "米粉", "辣", "臭"],
    sceneWords: ["外卖", "一人食", "夜宵", "宅家"],
    valueWords: ["正宗", "够辣", "量大"],
    emotionalWords: ["过瘾", "爽", "上头"],
  },
  "轻食": {
    categoryWords: ["沙拉", "轻食", "健康", "低卡", "减脂"],
    sceneWords: ["工作午餐", "健身餐", "下午茶", "外卖"],
    valueWords: ["健康", "低卡", "新鲜", "品质"],
    emotionalWords: ["健康", "自律", "精致"],
  },
  "烤鱼": {
    categoryWords: ["烤鱼", "麻辣", "鲜嫩", "活鱼", "川味"],
    sceneWords: ["朋友聚餐", "夜宵", "周末", "家庭"],
    valueWords: ["活鱼现烤", "口味多", "性价比"],
    emotionalWords: ["过瘾", "香", "满足"],
  },
  "小龙虾": {
    categoryWords: ["小龙虾", "虾", "麻辣", "夜宵", "啤酒"],
    sceneWords: ["夜宵", "朋友局", "夏日", "聚会", "外卖"],
    valueWords: ["虾大", "干净", "口味多", "鲜活"],
    emotionalWords: ["过瘾", "爽", "快乐", "烟火气"],
  },
  "云南菜": {
    categoryWords: ["云南", "菌子", "过桥米线", "傣味", "酸辣"],
    sceneWords: ["朋友聚餐", "尝鲜", "周末"],
    valueWords: ["食材独特", "地道", "正宗"],
    emotionalWords: ["新奇", "地道", "烟火气"],
  },
  "本帮菜": {
    categoryWords: ["本帮", "上海菜", "红烧", "浓油赤酱", "家常"],
    sceneWords: ["家庭聚餐", "商务宴请", "周末", "日常"],
    valueWords: ["地道", "精致", "老字号"],
    emotionalWords: ["家的味道", "传统", "精致"],
  },
  "东南亚菜": {
    categoryWords: ["泰式", "越南", "冬阴功", "咖喱", "河粉"],
    sceneWords: ["朋友聚餐", "尝鲜", "周末"],
    valueWords: ["正宗", "地道", "性价比"],
    emotionalWords: ["新奇", "清爽", "开胃"],
  },
  "居酒屋": {
    categoryWords: ["居酒屋", "烤串", "酒", "日式", "深夜"],
    sceneWords: ["下班", "夜宵", "一人饮", "朋友局"],
    valueWords: ["氛围好", "酒种类多", "性价比"],
    emotionalWords: ["放松", "治愈", "微醺"],
  },
  "小吃": {
    categoryWords: ["小吃", "炸串", "臭豆腐", "路边摊", "烟火"],
    sceneWords: ["逛街", "下午茶", "夜宵", "路过"],
    valueWords: ["便宜", "好吃", "地道"],
    emotionalWords: ["快乐", "满足", "烟火气"],
  },
  "炸鸡": {
    categoryWords: ["炸鸡", "鸡排", "韩式", "脆皮", "香辣"],
    sceneWords: ["下午茶", "逛街", "外卖", "追剧", "一人食"],
    valueWords: ["外脆里嫩", "性价比", "量大"],
    emotionalWords: ["快乐", "罪恶感", "满足"],
  },
  "麻辣香锅": {
    categoryWords: ["香锅", "麻辣", "干锅", "辣", "下饭"],
    sceneWords: ["朋友聚餐", "工作午餐", "外卖", "聚会"],
    valueWords: ["性价比", "食材丰富", "够辣"],
    emotionalWords: ["过瘾", "爽", "热闹"],
  },
  "咖喱": {
    categoryWords: ["咖喱", "日式", "印度", "蛋包饭", "浓郁"],
    sceneWords: ["工作日午餐", "一人食", "便餐"],
    valueWords: ["浓郁", "性价比", "分量足"],
    emotionalWords: ["满足", "暖", "治愈"],
  },
};

// ─── 查询接口 ───────────────────────────────────────────────────

/**
 * 获取某品类在目标城市的竞争数据
 */
export function getCompetitionData(
  category: string,
  city: string,
): CityCategoryData | null {
  // 品类模糊匹配
  for (const [catKey, cities] of Object.entries(marketData)) {
    if (category.includes(catKey) || catKey.includes(category)) {
      // 城市模糊匹配
      for (const [cityKey, data] of Object.entries(cities)) {
        if (city.includes(cityKey) || cityKey.includes(city)) {
          return data;
        }
      }
      // 城市无精确匹配时返回第一个城市的数据（品类通用）
      const firstCity = Object.values(cities)[0];
      if (firstCity) return { ...firstCity, note: (firstCity.note || "") + "（城市数据近似）" };
    }
  }
  return null;
}

/**
 * 获取品类的核心心智词
 */
export function getMentalWords(category: string) {
  for (const [key, words] of Object.entries(mentalKeywords)) {
    if (category.includes(key) || key.includes(category)) {
      return words;
    }
  }
  return null;
}

/**
 * 判断一个候选方向是否落在竞争空白区
 */
export function isInWhiteSpot(
  oneLiner: string,
  category: string,
  city: string,
): { isWhite: boolean; matchSpot?: string; note: string } {
  const data = getCompetitionData(category, city);
  if (!data) return { isWhite: false, note: "缺少品类竞争数据" };

  for (const spot of data.whiteSpots) {
    // 检查候选方向是否涉及空白区关键词
    const spotKeywords = spot.split(/[·\+\s]/);
    for (const kw of spotKeywords) {
      if (oneLiner.includes(kw)) {
        return { isWhite: true, matchSpot: spot, note: `落在空白区「${spot}」— 竞争压力小` };
      }
    }
  }

  // 检查是否与领导者正面冲突
  for (const leader of data.leaders) {
    const leaderKws = leader.position.split(/[·\+\s]/);
    for (const kw of leaderKws) {
      if (oneLiner.includes(kw) && oneLiner.includes("第一")) {
        return { isWhite: false, note: `与「${leader.brand}（${leader.position}）」正面冲突——不建议` };
      }
    }
  }

  return { isWhite: false, note: "未匹配到已知空白区，需进一步验证" };
}

/**
 * 获取品类在目标城市的竞争描述（用于推理文本）
 */
export function getCompetitionNarrative(
  category: string,
  city: string,
): string {
  const data = getCompetitionData(category, city);
  if (!data) return `${city}的${category}品类竞争数据暂缺`;

  const leaderNames = data.leaders.map((l) => `${l.brand}（${l.position}）`).join("、");
  const spots = data.whiteSpots.slice(0, 3).join("、");
  const sat = data.saturation;
  const stage = data.stage;

  return `${city}${category}品类当前处于${stage}，饱和度${sat}。心智领导者：${leaderNames}。已知空白区：${spots}。`;
}
