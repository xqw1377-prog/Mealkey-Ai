/**
 * 领域知识种子 — 仿 M-PNT seeds，供 M-MKT / M-ED / M-BIZ 注入 MKContext。
 */

export type DomainKnowledgeSeed = {
  id: string;
  domain: "market" | "equity" | "business";
  type: "FACT" | "RULE" | "CASE" | "MODEL" | "EXPERIENCE";
  title: string;
  content: string;
  tags: string[];
};

export const mMktKnowledgeSeeds: DomainKnowledgeSeed[] = [
  {
    id: "MKT-RULE-001",
    domain: "market",
    type: "RULE",
    title: "进入概率不是热度",
    content: "进入判断必须同时看需求、竞争密度、空位、时机、经济性与 Founder 适配；单看热度容易误判。",
    tags: ["进入", "评分"],
  },
  {
    id: "MKT-RULE-002",
    domain: "market",
    type: "RULE",
    title: "先找结构性空位",
    content: "正面硬刚主流打法成本高；优先从场景切口、价格带缺口或服务空白切入。",
    tags: ["空位", "切入"],
  },
  {
    id: "MKT-RULE-003",
    domain: "market",
    type: "RULE",
    title: "一线城市先缩小模型",
    content: "一线/新一线房租与获客成本更高，首店应用更轻面积与更清晰客群验证，再谈放大。",
    tags: ["一线", "模型"],
  },
  {
    id: "MKT-FACT-001",
    domain: "market",
    type: "FACT",
    title: "餐饮获客承压信号",
    content: "若获客成本持续高于客单价 30% 且复购不足，进入概率应下调，优先验证留存而非拓店。",
    tags: ["获客", "复购"],
  },
  {
    id: "MKT-CASE-001",
    domain: "market",
    type: "CASE",
    title: "社区场景切入",
    content: "多家区域品牌先做社区晚餐/家庭聚餐切口，再扩品类，比直接对标商场大店更稳。",
    tags: ["社区", "案例"],
  },
  {
    id: "MKT-EXP-001",
    domain: "market",
    type: "EXPERIENCE",
    title: "Founder 适配优先",
    content: "市场再好，若 Founder 资源与执行强度不够，应先降复杂度或换城市/品类，而不是硬进。",
    tags: ["Founder", "适配"],
  },
  {
    id: "MKT-RULE-004",
    domain: "market",
    type: "RULE",
    title: "机会卡必须可交接",
    content: "市场判断要压成可交接的机会卡：城市、场景、价格带、空位与下一步验证动作。",
    tags: ["机会卡", "交接"],
  },
  {
    id: "MKT-RULE-005",
    domain: "market",
    type: "RULE",
    title: "竞争高则姿态克制",
    content: "竞争密度高时，不建议正面扩店；应缩小单店赌注，先验证差异化承接能力。",
    tags: ["竞争", "克制"],
  },
];

export const mEdKnowledgeSeeds: DomainKnowledgeSeed[] = [
  {
    id: "ED-RULE-001",
    domain: "equity",
    type: "RULE",
    title: "控制权优先于分完股份",
    content: "早期股权设计先保证创始控制权与决策效率，再谈激励与融资稀释节奏。",
    tags: ["控制权", "股权"],
  },
  {
    id: "ED-RULE-002",
    domain: "equity",
    type: "RULE",
    title: "预留期权池",
    content: "扩张前应预留激励池，避免关键岗位到位时无股份可给，导致临时稀释失控。",
    tags: ["期权池", "激励"],
  },
  {
    id: "ED-RULE-003",
    domain: "equity",
    type: "RULE",
    title: "融资安全边际",
    content: "下一轮融资前，检查控制权、估值承压与对赌条款；不能把经营风险全押在股权让渡上。",
    tags: ["融资", "安全"],
  },
  {
    id: "ED-FACT-001",
    domain: "equity",
    type: "FACT",
    title: "双人创业常见失衡",
    content: "双创始人五五分且无决策机制，后期极易僵局；需明确拍板人与退出条款。",
    tags: ["双人", "僵局"],
  },
  {
    id: "ED-CASE-001",
    domain: "equity",
    type: "CASE",
    title: "先治理后扩张",
    content: "多家连锁在开到 10 店前补齐董事会/合伙协议，比边扩边改股权冲突更少。",
    tags: ["治理", "扩张"],
  },
  {
    id: "ED-EXP-001",
    domain: "equity",
    type: "EXPERIENCE",
    title: "激励要对准结果",
    content: "激励股权应绑定岗位贡献与里程碑，避免早期人情股挤占后期关键人才空间。",
    tags: ["激励", "里程碑"],
  },
  {
    id: "ED-RULE-004",
    domain: "equity",
    type: "RULE",
    title: "稀释要可解释",
    content: "每次稀释都要说清换来的资源、时间窗口与对控制权的影响，不能只为估值叙事让股。",
    tags: ["稀释", "解释"],
  },
  {
    id: "ED-RULE-005",
    domain: "equity",
    type: "RULE",
    title: "组织能力与股权同步",
    content: "扩张评审时，组织席位要同时看股权结构能否支撑下一阶段管理带宽。",
    tags: ["组织", "扩张"],
  },
];

export const mBizKnowledgeSeeds: DomainKnowledgeSeed[] = [
  {
    id: "BIZ-RULE-001",
    domain: "business",
    type: "RULE",
    title: "先验证单店模型",
    content: "扩张前必须跑通单店回本、毛利与人效；模型不稳时开店只是放大亏损。",
    tags: ["单店", "回本"],
  },
  {
    id: "BIZ-RULE-002",
    domain: "business",
    type: "RULE",
    title: "现金流优先",
    content: "增长节奏受现金流约束；若回款慢于扩张投入，应先降速并优化库存与账期。",
    tags: ["现金流", "节奏"],
  },
  {
    id: "BIZ-RULE-003",
    domain: "business",
    type: "RULE",
    title: "标准化再复制",
    content: "尚未标准化的出品、排班与供应链，不宜跨城复制；先做可复制 SOP。",
    tags: ["标准化", "复制"],
  },
  {
    id: "BIZ-FACT-001",
    domain: "business",
    type: "FACT",
    title: "房租占比警戒",
    content: "房租占营收长期超过 15%-18% 时，扩张模型通常承压，需重估选址或客流假设。",
    tags: ["房租", "模型"],
  },
  {
    id: "BIZ-CASE-001",
    domain: "business",
    type: "CASE",
    title: "轻模型试点",
    content: "多家品牌先用小面积/档口验证人效与复购，再升级到标准店，降低首轮沉没成本。",
    tags: ["轻模型", "试点"],
  },
  {
    id: "BIZ-EXP-001",
    domain: "business",
    type: "EXPERIENCE",
    title: "扩张不是开店数游戏",
    content: "店数目标要落到单店利润、供应链半径与管理跨度；否则增长只是账面叙事。",
    tags: ["扩张", "利润"],
  },
];

export function getSeedsForDomain(domain: DomainKnowledgeSeed["domain"]): DomainKnowledgeSeed[] {
  if (domain === "market") return mMktKnowledgeSeeds;
  if (domain === "equity") return mEdKnowledgeSeeds;
  return mBizKnowledgeSeeds;
}
