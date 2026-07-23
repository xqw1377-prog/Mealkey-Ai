import type { ScenarioDrillV1 } from "./types";

/** P1 竖切：老板/店长 · 利润/营业额诊断追问陪练 */
export const DRILL_OWNER_REVENUE_DIAGNOSIS: ScenarioDrillV1 = {
  id: "owner.revenue_diagnosis_v1",
  role: "owner",
  skillKey: "decision.diagnosis",
  title: "营业额下降 · 诊断追问",
  scenarioPrompt:
    "今天练一练：门店营业额下降时，你怎么追问、怎么拆变量。先别急着给营销方案。",
  customerLine: "店长跟你说：这周流水比上周差了一截，怎么办？",
  behaviorSteps: [
    "先确认对比基线（比上周/上月差多少）",
    "拆营业额变量：客流 × 转化 × 客单 × 复购",
    "追问哪一个变量在变（可再分时段/渠道）",
    "再决定动作，不先甩建议清单",
  ],
  outcomeChain: ["诊断质量", "资源分配", "利润/风险"],
  causalChainId: "revenue_decompose",
  rubric: [
    {
      id: "decompose",
      label: "做了变量拆解（客流/转化/客单/复购）",
      keywords: ["客流", "转化", "客单", "复购", "客单价", "翻台", "来客"],
      weight: 35,
    },
    {
      id: "ask_first",
      label: "先追问再给动作",
      keywords: ["哪个", "哪边", "先确认", "先问", "对比", "基线", "差多少", "为什么"],
      weight: 25,
    },
    {
      id: "baseline",
      label: "提到对比或幅度",
      keywords: ["上周", "上月", "同期", "降了", "少了", "%", "百分之", "对比"],
      weight: 15,
    },
    {
      id: "no_spray",
      label: "没有空枪营销清单",
      keywords: [],
      weight: 25,
      penaltyKeywords: [
        "发优惠券",
        "做抖音",
        "刷屏",
        "二十条",
        "先做营销",
        "加大投放",
        "地推",
      ],
    },
  ],
};

/** P1：店长 · 营业额压力诊断（Role×Skill 竖切主剧本） */
export const DRILL_MANAGER_REVENUE: ScenarioDrillV1 = {
  id: "manager.revenue_diagnosis_v1",
  role: "manager",
  skillKey: "ops.revenue_diagnosis",
  title: "店长 · 营业额压力诊断",
  scenarioPrompt:
    "练一练：连续几天流水下滑时，店长怎么拆变量、怎么定门店动作——先执行视角，不先甩总部口号。",
  customerLine: "老板问你：这周怎么流水掉了？你准备怎么抓回来？",
  behaviorSteps: [
    "对齐基线：比上周/上月差多少、哪些时段",
    "拆变量：客流 × 转化 × 客单 × 复购",
    "落到门店可执行：排班/出品/推荐/会员触达选一条主动作",
    "约定验证：看哪个指标、看几天",
  ],
  outcomeChain: ["门店诊断", "执行动作", "人效/客单", "营业额"],
  causalChainId: "revenue_decompose",
  rubric: [
    {
      id: "decompose",
      label: "做了变量拆解",
      keywords: ["客流", "转化", "客单", "复购", "客单价", "翻台", "来客"],
      weight: 35,
    },
    {
      id: "store_action",
      label: "落到门店执行动作",
      keywords: ["排班", "出品", "推荐", "会员", "时段", "前厅", "后厨", "主推"],
      weight: 30,
    },
    {
      id: "verify",
      label: "有验证指标或天数",
      keywords: ["看", "验证", "几天", "指标", "对比", "明天", "本周"],
      weight: 20,
    },
    {
      id: "no_slogan",
      label: "没有空口号甩锅",
      keywords: [],
      weight: 15,
      penaltyKeywords: ["加大投放", "全面改革", "换定位", "先融资"],
    },
  ],
};

/** P1：店长 · 人效追问（薄） */
export const DRILL_MANAGER_LABOR: ScenarioDrillV1 = {
  id: "manager.labor_efficiency_v1",
  role: "manager",
  skillKey: "ops.labor",
  title: "人效压力 · 排班追问",
  scenarioPrompt:
    "练一练：员工说太累、利润却上不去时，你怎么拆人效问题。",
  customerLine: "后厨抱怨人手不够，前厅也说忙不过来，但账上看利润一般。",
  behaviorSteps: [
    "核对人工成本 / 营收占比",
    "拆排班与峰谷（忙时缺人 vs 闲时人多）",
    "区分「真缺人」与「流程/SKU 复杂度」",
    "再谈加人还是改排班/减 SKU",
  ],
  outcomeChain: ["排班", "人效", "利润"],
  causalChainId: "profit_decompose",
  rubric: [
    {
      id: "ratio",
      label: "提到人工占比或人效",
      keywords: ["人工", "人效", "占比", "营收", "排班", "峰谷", "闲时", "忙时"],
      weight: 40,
    },
    {
      id: "root",
      label: "区分缺人与复杂度",
      keywords: ["SKU", "流程", "复杂度", "出品", "损耗", "不是加人", "先看"],
      weight: 30,
    },
    {
      id: "no_hire_first",
      label: "没有直接「先招人」了事",
      keywords: [],
      weight: 30,
      penaltyKeywords: ["再招两个", "多招点人", "赶紧招人"],
    },
  ],
};

/** P2 预置（契约存在，主路径可触发） */
export const DRILL_SERVER_FAMILY_UPSELL: ScenarioDrillV1 = {
  id: "server.family_upsell_v1",
  role: "server",
  skillKey: "sales.recommend",
  title: "家庭聚餐推荐",
  scenarioPrompt: "今天练习一下家庭聚餐推荐。结合人数与场景给组合，不要只背爆款名。",
  customerLine: "两个人吃饭，有一位老人。",
  behaviorSteps: [
    "观察人数与场景",
    "判断消费场景（家庭/老人友好）",
    "询问偏好（辣度/忌口）",
    "推荐组合（分享菜+主食）",
    "确认反馈",
  ],
  outcomeChain: ["推荐能力", "加菜率", "客单", "营业额"],
  causalChainId: "server_upsell",
  rubric: [
    {
      id: "scene",
      label: "识别家庭/老人场景",
      keywords: ["老人", "家庭", "两位", "两个人", "清淡", "少辣", "好嚼"],
      weight: 35,
    },
    {
      id: "combo",
      label: "给组合而非单品口号",
      keywords: ["搭配", "组合", "一份", "再加", "主食", "汤", "素"],
      weight: 35,
    },
    {
      id: "ask",
      label: "有询问偏好",
      keywords: ["忌口", "能吃辣", "喜欢", "要不要", "请问"],
      weight: 30,
    },
  ],
};

export const SCENARIO_DRILLS_V1: ScenarioDrillV1[] = [
  DRILL_OWNER_REVENUE_DIAGNOSIS,
  DRILL_MANAGER_REVENUE,
  DRILL_MANAGER_LABOR,
  DRILL_SERVER_FAMILY_UPSELL,
];

export function getDrillById(id: string): ScenarioDrillV1 | undefined {
  return SCENARIO_DRILLS_V1.find((d) => d.id === id);
}
