/**
 * 领域知识注入层 —— 把知识蒸馏转化为常委可调用的判断能力
 *
 * 根据议题的 decisionType 自动注入相关领域的蒸馏知识：
 * - new_city_expansion / store_expansion → M-MKT 市场进入规则 + 案例
 * - fundraising / restructuring → M-ED 股权治理规则 + 案例
 * - new_brand → M-PNT 定位规则 + 案例
 * - 所有商业决策 → M-BIZ 商业模式规则 + 案例
 *
 * 这是「知识→能力」的关键转换层。
 * 知识蒸馏（knowledge-engine）只是存储，这里才是调用。
 */

import type { DecisionTypeId, CouncilRoleId } from "./types";

// ─── 硬编码知识注入（零依赖 knowledge-engine，确保决策室独立可运行）───

interface DomainRule {
  source: string;
  content: string;
}

interface DomainCase {
  title: string;
  lesson: string;
  outcome: string;
}

const MARKET_RULES: DomainRule[] = [
  { source: "M-MKT-001", content: "市场规模不足10亿不值得投入战略级资源（BCG市场吸引力矩阵）" },
  { source: "M-MKT-002", content: "市场增长率低于5%为存量市场，新人进入需要抢夺份额（BCG成长率矩阵）" },
  { source: "M-MKT-003", content: "CR5超过60%为高集中市场，新品牌进入成本极高（Porter五力）" },
  { source: "M-MKT-004", content: "市场增速超过15%+规模超50亿=战略进入窗口已开（McKinsey窗口战略）" },
  { source: "M-MKT-005", content: "竞品密度每万人超过2家=竞争已饱和，需显著差异化（餐饮密度基准）" },
  { source: "M-MKT-006", content: "先试点后规模：不超过3家店不讨论规模复制（餐饮铁律）" },
  { source: "M-MKT-007", content: "聚焦一个区域打透，多城同时铺开=多地一起亏（聚焦战略）" },
  { source: "M-MKT-008", content: "进入时机三要素：市场、资源、能力缺一不可（McKinsey时机三角）" },
];

const MARKET_CASES: DomainCase[] = [
  { title: "星巴克进入中国：亏损9年建立品牌", lesson: "教育市场需要长期投入，先一线后下沉", outcome: "success" },
  { title: "Popeyes两次进入中国两次退出", lesson: "品牌力不足+无差异化在竞争市场无法生存", outcome: "failure" },
  { title: "瑞幸咖啡：完美时机进入", lesson: "在星巴克20年教育后以价格+便利性切入", outcome: "success" },
  { title: "棒约翰在中国：进入太早的教训", lesson: "品类教育未完成时进入=高昂教育成本", outcome: "failure" },
];

const BIZ_RULES: DomainRule[] = [
  { source: "BIZ-001", content: "餐饮稳态毛利率低于55%视为不健康，目标60%以上" },
  { source: "BIZ-002", content: "食材成本超过38%侵蚀利润，目标控制在30-35%" },
  { source: "BIZ-003", content: "人工成本超过25%人效偏低，目标18-22%" },
  { source: "BIZ-004", content: "租金超过收入15%是危险信号，目标不超过12%" },
  { source: "BIZ-005", content: "单店回本超过18个月模型偏重，理想12-18个月" },
  { source: "BIZ-006", content: "餐饮净利率低于8%属于薄利，目标10-15%" },
  { source: "BIZ-007", content: "固定成本超过40%模型脆弱，经营杠杆反向作用" },
  { source: "BIZ-008", content: "单一变量波动20%应仍有利润，否则模型极度脆弱" },
  { source: "BIZ-009", content: "首月复购率低于20%说明需求验证不足" },
  { source: "BIZ-010", content: "无SOP不能谈复制，关键环节标准化覆盖率需80%以上" },
  { source: "BIZ-011", content: "至少运营6个月且连续盈利3个月以上再考虑复制" },
  { source: "BIZ-012", content: "扩张超出供应链半径=品质不稳定成本上升" },
];

const BIZ_CASES: DomainCase[] = [
  { title: "麦当劳：地产才是真正的商业模式", lesson: "利润来自地产升值+租金，不是汉堡", outcome: "success" },
  { title: "蜜雪冰城：供应链利润模型", lesson: "利润在供应链端不在门店端", outcome: "success" },
  { title: "达美乐：科技体验成为核心壁垒", lesson: "商业模式创新比产品创新更容易规模化", outcome: "success" },
  { title: "俏江南：对赌协议的致命后果", lesson: "不要签无法控制的对赌条件", outcome: "failure" },
];

const EQUITY_RULES: DomainRule[] = [
  { source: "ED-001", content: "创始人持股低于51%须有否决权保护（公司章程/一致行动人/AB股）" },
  { source: "ED-002", content: "创始人至少控制董事会半数席位（公司法+VC实践）" },
  { source: "ED-003", content: "联合创始人必须有vesting：标准4年+1年cliff" },
  { source: "ED-004", content: "融资前预留10-20%期权池" },
  { source: "ED-005", content: "投资人优先清算权超过2x对创始人不利，控制在1x" },
  { source: "ED-006", content: "投资人占董事会多数席位要警惕" },
  { source: "ED-007", content: "拖售权触发门槛不低于51%" },
  { source: "ED-008", content: "公司须持有核心IP，知识产权权属不清是重大风险" },
  { source: "ED-009", content: "对赌协议是餐饮企业最危险的融资条款之一" },
];

const EQUITY_CASES: DomainCase[] = [
  { title: "万科股权之争：分散股权的治理危机", lesson: "没有控制权保护可能一夜失去公司", outcome: "failure" },
  { title: "俏江南：对赌失败的致命后果", lesson: "不要签无法控制的对赌条件", outcome: "failure" },
  { title: "Facebook AB股：创始人长期控制", lesson: "多轮融资后仍可通过AB股掌握决策权", outcome: "success" },
  { title: "真功夫：50:50股权结构的内斗", lesson: "平权等于无权，必须明确谁说了算", outcome: "failure" },
];

const POSITIONING_RULES: DomainRule[] = [
  { source: "POS-001", content: "定位不能超过一个核心词，超过3个等于没有定位（Ries聚焦定律）" },
  { source: "POS-002", content: "不是第一就找领导者的对立面或开创细分品类（Ries对立定律）" },
  { source: "POS-003", content: "差异化必须可感知，消费者感受不到就不存在" },
  { source: "POS-004", content: "目标客群不能是所有人，说不清谁会反复想起你=定位未成立" },
  { source: "POS-005", content: "容易被复制的差异化不是壁垒（模仿难度<3时危险）" },
];

interface DomainKnowledge {
  rules: DomainRule[];
  cases: DomainCase[];
  label: string;
}

const DOMAIN_MAP: Record<DecisionTypeId, DomainKnowledge> = {
  new_city_expansion: {
    rules: [...MARKET_RULES, ...BIZ_RULES],
    cases: [...MARKET_CASES, ...BIZ_CASES],
    label: "市场进入与商业模式",
  },
  store_expansion: {
    rules: [...MARKET_RULES.slice(0, 5), ...BIZ_RULES],
    cases: [...MARKET_CASES.slice(0, 2), ...BIZ_CASES],
    label: "门店扩张与商业模式",
  },
  new_brand: {
    rules: [...POSITIONING_RULES, ...BIZ_RULES],
    cases: BIZ_CASES,
    label: "品牌定位与商业模式",
  },
  fundraising: {
    rules: [...EQUITY_RULES, ...BIZ_RULES],
    cases: [...EQUITY_CASES, ...BIZ_CASES],
    label: "股权融资与商业模式",
  },
  restructuring: {
    rules: [...EQUITY_RULES, ...BIZ_RULES],
    cases: EQUITY_CASES,
    label: "股权治理与组织重组",
  },
};

/**
 * 根据议题类型和常委角色注入相关领域知识
 *
 * 每个常委都看到与自己角色最相关的知识：
 * - CMO/CSO 侧重市场知识
 * - BMO/CFO/COO 侧重商业知识
 * - CFO/CRO 侧重股权知识
 * - CBO 侧重定位知识
 */
export function renderDomainKnowledgeBlock(
  decisionType: DecisionTypeId,
  roleId: CouncilRoleId,
): string {
  const domain = DOMAIN_MAP[decisionType];
  if (!domain) return "";

  // 根据角色筛选最相关的规则
  const roleRelevant = domain.rules.filter((r) => {
    if (roleId === "CMO" || roleId === "CSO") return r.source.startsWith("M-MKT") || r.source.startsWith("BIZ");
    if (roleId === "BMO" || roleId === "COO") return r.source.startsWith("BIZ");
    if (roleId === "CFO") return r.source.startsWith("BIZ") || r.source.startsWith("ED");
    if (roleId === "CRO") return r.source.startsWith("ED");
    if (roleId === "CBO") return r.source.startsWith("POS") || r.source.startsWith("BIZ");
    return true;
  });

  const rulesBlock = roleRelevant.slice(0, 8).map((r) =>
    `- [${r.source}] ${r.content}`
  ).join("\n");

  const casesBlock = domain.cases.slice(0, 3).map((c) =>
    `- ${c.title} [${c.outcome}]: ${c.lesson}`
  ).join("\n");

  return [
    `# 领域专业知识 — ${domain.label}`,
    `基于议题类型注入的 ${domain.label} 专业判断规则与案例参考。`,
    "硬规则：以下知识是你的判断依据，不是最终结论。结合 Expert Reports 做企业选择。",
    "",
    "## 专业判断规则",
    rulesBlock,
    "",
    "## 相关案例参考",
    casesBlock,
  ].join("\n");
}
