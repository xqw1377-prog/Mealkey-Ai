/**
 * 七常委知识资产 — 统一类型与目录
 * 把无限知识压缩为可调用判断能力（方法论/框架/案例/Benchmark/提问/失败模式）
 * V2.1 升级：每个常委增加 2-3 倍的知识深度（方法论、框架、案例、Benchmark、失败模式全覆盖）
 */

import type { CouncilRoleId } from "../types";

export interface KnowledgeMethod {
  id: string;
  name: string;
  source: string;
  summary?: string;
}

export interface KnowledgeFramework {
  id: string;
  name: string;
  formula: string;
  steps?: string[];
}

export interface KnowledgeCase {
  id: string;
  title: string;
  industry?: string;
  lesson: string;
  outcome: "success" | "failure" | "mixed";
}

export interface KnowledgeBenchmark {
  id: string;
  metric: string;
  reference: string;
  context?: string;
}

export interface KnowledgeQuestion {
  id: string;
  theme?: string;
  question: string;
}

export interface FailurePattern {
  id: string;
  pattern: string;
  signal: string;
  countermeasure?: string;
}

export interface LearningAdjustment {
  id: string;
  observation: string;
  weight_hint: string;
  updatedAt: string;
}

export interface ExpertKnowledgeBase {
  role_id: CouncilRoleId;
  mission: string;
  methodology: KnowledgeMethod[];
  frameworks: KnowledgeFramework[];
  cases: KnowledgeCase[];
  benchmarks: KnowledgeBenchmark[];
  questions: KnowledgeQuestion[];
  failurePatterns: FailurePattern[];
  learning_adjustments?: LearningAdjustment[];
}

export const KNOWLEDGE_BASES: Record<CouncilRoleId, ExpertKnowledgeBase> = {
  CSO: {
    role_id: "CSO",
    mission: "判断企业应该往哪里走",
    methodology: [
      { id: "mck-strategy", name: "McKinsey Strategy", source: "McKinsey", summary: "市场机会×竞争优势×组织能力" },
      { id: "bcg-growth", name: "BCG Growth Strategy", source: "BCG" },
      { id: "porter", name: "Porter 竞争战略", source: "Porter" },
      { id: "blue-ocean", name: "Blue Ocean", source: "Kim & Mauborgne" },
      { id: "ptw", name: "Playing to Win", source: "Lafley & Martin" },
      { id: "good-to-great", name: "Good to Great", source: "Collins" },
      { id: "7powers", name: "7 Powers Strategy", source: "Hamilton Helmer" },
    ],
    frameworks: [
      {
        id: "strategy-choice",
        name: "战略选择模型",
        formula: "机会吸引力 × 竞争优势 × 资源匹配度 × 时间窗口",
        steps: ["评估机会", "评估优势", "评估资源", "评估窗口", "做取舍"],
      },
      {
        id: "three-horizons",
        name: "三地平线增长模型",
        formula: "H1 核心业务护城河 + H2 增长引擎 + H3 未来期权",
        steps: ["评价核心业务防御力", "识别增长引擎", "布局未来期权", "资源在三者间分配"],
      },
    ],
    cases: [
      { id: "c-hdl", title: "海底捞扩张", industry: "餐饮", lesson: "服务差异可支撑扩张，但组织与成本必须同步", outcome: "mixed" },
      { id: "c-lk", title: "瑞幸增长", industry: "餐饮", lesson: "增长叙事不能替代单位经济", outcome: "mixed" },
      { id: "c-sbux", title: "星巴克全球化", industry: "餐饮", lesson: "第三空间心智 + 标准化复制", outcome: "success" },
      { id: "c-sdx", title: "蜀大侠加盟失败启示", industry: "餐饮", lesson: "加盟放大未验证模型会放大失败", outcome: "failure" },
      { id: "c-htx", title: "华莱士下沉战略", industry: "餐饮", lesson: "极致性价比+合伙人制在低线城市的战略正确", outcome: "success" },
      { id: "c-ms", title: "麦当劳地产+授权模式", industry: "餐饮", lesson: "战略本质是利润结构设计而非卖汉堡", outcome: "success" },
    ],
    benchmarks: [
      { id: "b-density", metric: "城市门店密度", reference: "同城过密则互啄，过疏则无势能", context: "餐饮" },
      { id: "b-pace", metric: "扩张速度", reference: "以单店验证速度为上限，不以融资节奏为上限", context: "餐饮" },
      { id: "b-defensibility", metric: "竞争优势可防御年限", reference: "至少3年护城河窗口才能支撑战略级投入", context: "战略决策" },
    ],
    questions: [
      { id: "q-opp", theme: "机会", question: "如果五年后成功，今天最关键选择是什么？" },
      { id: "q-comp", theme: "竞争", question: "为什么别人不能复制？" },
      { id: "q-res", theme: "资源", question: "我们凭什么赢？" },
      { id: "q-10y", theme: "长期", question: "十年后行业结构会怎么变？我们的位置在哪里？" },
    ],
    failurePatterns: [
      { id: "f-hype", pattern: "追风口", signal: "论证里只有趋势没有能力匹配", countermeasure: "要求竞争优势证明" },
      { id: "f-swing", pattern: "战略摇摆", signal: "一年内主航道多次更换", countermeasure: "锁定主战场与放弃清单" },
      { id: "f-resource", pattern: "资源不足", signal: "战略目标远超现金与编制", countermeasure: "缩小战场或分阶段" },
      { id: "f-fast", pattern: "扩张过快", signal: "复制速度超过模型验证", countermeasure: "以验证门闩限速" },
      { id: "f-confound", pattern: "混淆战略与执行", signal: "把运营改善当成战略方向", countermeasure: "区分改善 vs 转型" },
    ],
  },
  CMO: {
    role_id: "CMO",
    mission: "理解消费者和市场变化",
    methodology: [
      { id: "nielsen", name: "Nielsen 消费洞察", source: "Nielsen" },
      { id: "bcg-ci", name: "BCG Consumer Insight", source: "BCG" },
      { id: "google-cb", name: "Google Consumer Behavior", source: "Google" },
      { id: "jobs-to-be-done", name: "Jobs to Be Done", source: "Christensen" },
      { id: "mom-test", name: "The Mom Test", source: "Fitzpatrick" },
    ],
    frameworks: [
      {
        id: "market-opp",
        name: "市场机会模型",
        formula: "需求强度 × 增长趋势 × 支付能力 × 竞争空白",
      },
      {
        id: "demand-validation",
        name: "需求验证阶梯",
        formula: "声称兴趣 → 实际支付 → 重复购买 → 主动推荐",
        steps: ["行为证据（支付）优先于态度证据（问卷）", "验证复购而非首单", "确认推荐率而非满意度"],
      },
    ],
    cases: [
      {
        id: "c-tea",
        title: "奶茶：假洞察 vs 真洞察",
        industry: "餐饮",
        lesson: "错误=年轻人喜欢喝奶茶；正确=低成本社交仪式",
        outcome: "success",
      },
      {
        id: "c-cy",
        title: "纯悦 vs 元气森林：伪需求陷阱",
        industry: "餐饮",
        lesson: "0糖需求到底有多大？需区分尝鲜与刚需",
        outcome: "mixed",
      },
      {
        id: "c-zk",
        title: "正新鸡排下沉市场验证",
        industry: "餐饮",
        lesson: "10元鸡排在下沉市场的需求基于消费力而非口味偏好",
        outcome: "success",
      },
    ],
    benchmarks: [
      { id: "b-pay", metric: "支付意愿证据", reference: "必须有转化/复购/愿付，不能只有兴趣问卷", context: "餐饮零售" },
      { id: "b-repeat", metric: "复购率基准", reference: "餐饮首月复购<20%视为需求未验证", context: "餐饮" },
    ],
    questions: [
      { id: "q-need", theme: "需求", question: "谁真的需要？不是谁可能需要。" },
      { id: "q-sub", theme: "替代", question: "用户现在怎么解决？无替代可能是假需求。" },
      { id: "q-now", theme: "窗口", question: "为什么现在发生？" },
      { id: "q-evidence", theme: "证据", question: "需求证据是行为/转化还是创始人偏好？" },
    ],
    failurePatterns: [
      { id: "f-boss", pattern: "老板喜欢当需求", signal: "证据链止于创始人偏好", countermeasure: "要求行为证据" },
      { id: "f-fake", pattern: "假需求", signal: "无替代行为却声称刚需", countermeasure: "验证支付与频次" },
      { id: "f-narrative", pattern: "叙事窗口误判", signal: "市场趋势正确但进场时机不对", countermeasure: "区分真窗口与叙事窗口" },
    ],
  },
  CBO: {
    role_id: "CBO",
    mission: "建立消费者心智资产",
    methodology: [
      { id: "stp", name: "STP", source: "经典营销" },
      { id: "positioning", name: "Positioning Statement", source: "Ries & Trout / Interbrand" },
      { id: "brand-key", name: "Brand Key", source: "Unilever/Landor 实践" },
      { id: "golden", name: "Golden Circle", source: "Sinek" },
      { id: "cat-design", name: "Category Design", source: "Play Bigger" },
      { id: "brand-zb", name: "品牌资产实证", source: "Keller CBBE" },
    ],
    frameworks: [
      {
        id: "pos-pattern",
        name: "Positioning Pattern",
        formula: "品类第一 → 特定人群 → 独特价值 → 可信证明",
        steps: ["为谁？", "解决什么？", "为什么相信？", "为什么选择你？"],
      },
      {
        id: "brand-asset-audit",
        name: "品牌资产审计",
        formula: "认知度 × 联想强度 × 差异化 × 可信度",
        steps: ["测认知率", "测联想内容", "测差异点", "测溢价意愿"],
      },
    ],
    cases: [
      {
        id: "c-slot",
        title: "心智占位成功模式",
        industry: "餐饮",
        lesson: "一句话能说清差异的品牌更抗扩张噪音",
        outcome: "success",
      },
      {
        id: "c-dilution",
        title: "西贝品牌稀释教训",
        industry: "餐饮",
        lesson: "频繁更换定位（莜面→亲民→贵→关店）损害资产",
        outcome: "failure",
      },
      {
        id: "c-hdl-brand",
        title: "海底捞品牌资产累积",
        industry: "餐饮",
        lesson: "服务=品牌资产，但过度扩张稀释认知边界",
        outcome: "mixed",
      },
    ],
    benchmarks: [
      { id: "b-oneliner", metric: "定位一句话可回忆率", reference: "陌生用户听一遍能复述核心差异", context: "品牌" },
      { id: "b-premium", metric: "品牌溢价能力", reference: "品牌 vs 白牌价差≥15%视为有资产", context: "餐饮" },
    ],
    questions: [
      { id: "q-who", theme: "为谁", question: "为谁？" },
      { id: "q-what", theme: "解决什么", question: "解决什么？" },
      { id: "q-believe", theme: "为什么相信", question: "为什么相信？" },
      { id: "q-you", theme: "为什么选你", question: "为什么选择你？" },
    ],
    failurePatterns: [
      { id: "f-nodiff", pattern: "没有差异", signal: "只能描述产品功能", countermeasure: "收紧到可占位差异" },
      { id: "f-price", pattern: "靠低价", signal: "竞争主张以更便宜为主", countermeasure: "重建价值主张" },
      { id: "f-product", pattern: "只讲产品", signal: "无心智资产路径", countermeasure: "补定位与符号" },
      { id: "f-drift", pattern: "定位漂移", signal: "每两年换一次品牌主张", countermeasure: "锁定核心认知资产" },
    ],
  },
  BMO: {
    role_id: "BMO",
    mission: "设计赚钱机器",
    methodology: [
      { id: "bmc", name: "Business Model Canvas", source: "Osterwalder" },
      { id: "ue", name: "Unit Economics", source: "互联网/连锁实践" },
      { id: "lean", name: "Lean Startup", source: "Ries" },
      { id: "pricing", name: "Pricing Strategy", source: "定价战略" },
      { id: "profit-model", name: "利润模式分析", source: "Slywotzky" },
    ],
    frameworks: [
      {
        id: "fnb-pnl",
        name: "餐饮利润链",
        formula: "营业额 → 毛利 → 人工 → 租金 → 净利润 → 复制能力",
        steps: ["单店是否赚钱", "规模后利润升还是降", "复制100次是否成立"],
      },
      {
        id: "unit-ecom-deep",
        name: "单位经济深度分析",
        formula: "LTV/CAC > 3 ∧ 回本周期 < 18月 ∧ 毛利 > 60%",
        steps: ["计算获客成本 CAC", "计算客户终身价值 LTV", "验证回本周期", "压测关键变量", "确认复制条件"],
      },
    ],
    cases: [
      {
        id: "c-scale-loss",
        title: "规模放大亏损",
        industry: "餐饮",
        lesson: "单店不成立时扩张是放大损失",
        outcome: "failure",
      },
      {
        id: "c-ue-success",
        title: "蜜雪冰城单位经济密码",
        industry: "餐饮",
        lesson: "极致供应链+高毛利大单品+加盟商赚钱=可复制飞轮",
        outcome: "success",
      },
      {
        id: "c-cost-drift",
        title: "租金上涨吞噬利润",
        industry: "餐饮",
        lesson: "模型锁定后租金刚性的致命性",
        outcome: "failure",
      },
    ],
    benchmarks: [
      { id: "b-payback", metric: "回本周期", reference: "需落在可承受现金跑道内", context: "餐饮单店" },
      { id: "b-labor", metric: "人工成本敏感度", reference: "人工上浮情景必须压测", context: "餐饮" },
      { id: "b-gross", metric: "毛利率基准", reference: "餐饮稳态毛利率应在55-70%之间", context: "餐饮" },
    ],
    questions: [
      { id: "q-unit", theme: "单位经济", question: "每获得一个客户，赚多少钱？" },
      { id: "q-scale", theme: "规模", question: "规模扩大后利润是否增加？" },
      { id: "q-x100", theme: "复制", question: "复制100次还能成立吗？" },
      { id: "q-fragile", theme: "脆弱性", question: "哪个变量上浮20%模型就碎了？" },
    ],
    failurePatterns: [
      { id: "f-scale", pattern: "靠规模盈利", signal: "叙事依赖开更多店摊薄亏损", countermeasure: "先锁单店模型" },
      { id: "f-store", pattern: "单店亏损", signal: "稳态仍亏", countermeasure: "止损或改模型" },
      { id: "f-labor", pattern: "低估人工上涨", signal: "模型固定人工占比多年不变", countermeasure: "提高人工敏感权重" },
      { id: "f-rent", pattern: "租金假设过乐观", signal: "仅用一种租金场景做财务预测", countermeasure: "多场景压测" },
    ],
  },
  CFO: {
    role_id: "CFO",
    mission: "资本效率与现金安全",
    methodology: [
      { id: "fm", name: "财务模型", source: "Corporate Finance" },
      { id: "dcf", name: "DCF", source: "估值" },
      { id: "vc", name: "VC 模型", source: "风险投资" },
      { id: "saas", name: "SaaS Metrics（可比思路）", source: "效率指标迁移" },
      { id: "treasury", name: "现金流管理框架", source: "Treasury实践" },
    ],
    frameworks: [
      {
        id: "capital-eff",
        name: "餐饮资本效率",
        formula: "投资额 · 回本周期 · 现金流 · 现金安全边界 · ROI",
      },
      {
        id: "cash-runway",
        name: "现金跑道分析",
        formula: "可用现金 ÷ 月度烧钱率 ≥ 6个月",
        steps: ["计算当前可用现金", "估算月度烧钱率（乐观/基准/悲观）", "确定最坏情景下的跑道月数", "设定融资触发点与停损点"],
      },
    ],
    cases: [
      {
        id: "c-cash",
        title: "现金流断裂型扩张",
        industry: "餐饮",
        lesson: "无现金安全垫的增长是慢性死亡",
        outcome: "failure",
      },
      {
        id: "c-fund-success",
        title: "乡村基融资节奏控制",
        industry: "餐饮",
        lesson: "在资本热时融资、在冷时有现金、在合适时机扩张",
        outcome: "success",
      },
      {
        id: "c-leverage",
        title: "杠杆过高开店爆仓",
        industry: "餐饮",
        lesson: "借贷扩张 + 经营不及预期 = 债务螺旋",
        outcome: "failure",
      },
    ],
    benchmarks: [
      { id: "b-runway", metric: "现金跑道", reference: "建议 ≥6 个月安全垫（可按企业调）", context: "扩张决策" },
      { id: "b-roi", metric: "ROI/ROIC", reference: "需覆盖风险与资金占用", context: "开店投资" },
      { id: "b-unit-invest", metric: "单店投资回收期", reference: "餐饮单店建议回本周期 ≤ 18个月", context: "餐饮扩张" },
    ],
    questions: [
      { id: "q-nofund", theme: "生存", question: "如果不给融资，这个模型还能活吗？" },
      { id: "q-1m", theme: "回报", question: "每投入100万，未来产生多少价值？" },
      { id: "q-hole", theme: "黑洞", question: "最大的现金黑洞在哪里？" },
      { id: "q-worst-cash", theme: "最坏现金", question: "最坏情况下现金能撑多久？" },
    ],
    failurePatterns: [
      { id: "f-blind-fund", pattern: "盲目融资", signal: "为扩张而融资、无用途纪律", countermeasure: "用途与停损绑定" },
      { id: "f-fixed", pattern: "高固定成本", signal: "租金/人力刚性过高", countermeasure: "降杠杆或延后" },
      { id: "f-break", pattern: "现金流断裂", signal: "最坏情景跑道不足", countermeasure: "红线否决" },
      { id: "f-optimism", pattern: "财务预测乐观偏差", signal: "只用一个增长假设做预测", countermeasure: "强制三情景分析" },
    ],
  },
  COO: {
    role_id: "COO",
    mission: "把想法变成系统",
    methodology: [
      { id: "tps", name: "Toyota Production System", source: "丰田" },
      { id: "sop", name: "SOP 体系", source: "连锁运营" },
      { id: "scaling", name: "Scaling Model", source: "规模化实践" },
      { id: "lean-ops", name: "精益运营", source: "精益管理" },
      { id: "supply-chain", name: "供应链管理", source: "SCOR模型" },
    ],
    frameworks: [
      {
        id: "capability-ladder",
        name: "能力阶梯",
        formula: "老板能力 → 团队能力 → 系统能力",
        steps: ["第10家店是否一样", "新人7天能否上手", "老板离开30天能否运行"],
      },
      {
        id: "ops-flywheel",
        name: "运营飞轮分析",
        formula: "标准化 → 培训 → 复制 → 品质一致 → 规模效应",
        steps: ["评价标准化程度", "评估培训转化效率", "验证复制一致性", "测量规模边际成本"],
      },
    ],
    cases: [
      {
        id: "c-hero",
        title: "高手依赖型门店",
        industry: "餐饮",
        lesson: "不能被普通人执行的模式不是真模式",
        outcome: "failure",
      },
      {
        id: "c-sop-success",
        title: "麦当劳标准化体系",
        industry: "餐饮",
        lesson: "极致SOP+培训学校+品控体系=全球复制能力",
        outcome: "success",
      },
      {
        id: "c-supply-fail",
        title: "供应链断裂型扩张失败",
        industry: "餐饮",
        lesson: "跨城扩张时供应链半径超出承载能力",
        outcome: "failure",
      },
    ],
    benchmarks: [
      { id: "b-train7", metric: "新人培训周期", reference: "关键岗位 7 天可上岗为健康信号", context: "连锁" },
      { id: "b-boss30", metric: "老板离场30天", reference: "系统仍能稳态运行", context: "组织成熟度" },
      { id: "b-supply-radius", metric: "供应链半径上限", reference: "超出中央厨房配送半径时必须建新供应链节点", context: "跨城扩张" },
    ],
    questions: [
      { id: "q-10", theme: "复制", question: "第10家店还能一样吗？" },
      { id: "q-7", theme: "培训", question: "新人经过7天培训能完成吗？" },
      { id: "q-30", theme: "系统", question: "如果老板离开30天，还能运行吗？" },
      { id: "q-supply", theme: "供应链", question: "复制到第5家时供应链是否还能稳定？" },
    ],
    failurePatterns: [
      { id: "f-hero", pattern: "依赖个人能力", signal: "关键环节只有一人会", countermeasure: "SOP化与备份编制" },
      { id: "f-nosop", pattern: "无标准/无流程", signal: "无法培训复制", countermeasure: "先固化再扩张" },
      { id: "f-supply", pattern: "供应链断链", signal: "扩张超出原有供应链半径", countermeasure: "测算配送半径上限" },
      { id: "f-burnout", pattern: "组织过载", signal: "扩张速度超过招聘与培训速度", countermeasure: "以编制补全为扩张节奏门闩" },
    ],
  },
  CRO: {
    role_id: "CRO",
    mission: "发现隐藏风险，守住安全边界",
    methodology: [
      { id: "risk-mgmt", name: "企业风险管理", source: "ERM" },
      { id: "compliance", name: "合规与食安框架", source: "餐饮监管实践" },
      { id: "crisis-mgmt", name: "危机管理", source: "危机公关实践" },
      { id: "scenario-plan", name: "情景规划", source: "Shell Scenario Planning" },
    ],
    frameworks: [
      {
        id: "risk-matrix",
        name: "Risk Matrix",
        formula: "概率 × 影响",
        steps: ["识别五类风险", "估概率", "估影响", "找缓释", "设停损信号"],
      },
      {
        id: "worst-case-plan",
        name: "最坏情景规划",
        formula: "最坏情况可承受 ∧ 有缓释路径 ∧ 有停损信号",
        steps: ["推演最坏情景", "评估损失是否可承受", "设计缓释方案", "设定提前预警信号", "确定谁按停止键"],
      },
    ],
    cases: [
      {
        id: "c-food",
        title: "食安事故击穿品牌",
        industry: "餐饮",
        lesson: "低概率高冲击必须有缓释与停损",
        outcome: "failure",
      },
      {
        id: "c-rep",
        title: "舆情危机处置失败",
        industry: "餐饮",
        lesson: "黄金24小时响应、透明化、责任人制度缺一不可",
        outcome: "failure",
      },
      {
        id: "c-franchise-risk",
        title: "加盟模式下的品牌风险",
        industry: "餐饮",
        lesson: "加盟商行为失控可反噬主品牌，品控与契约设计是关键",
        outcome: "mixed",
      },
    ],
    benchmarks: [
      { id: "b-five", metric: "五类风险覆盖", reference: "战略/市场/财务/法律/品牌均需扫描", context: "重大决策" },
      { id: "b-response", metric: "危机响应时效", reference: "食安/舆情 24 小时内必须有公开回应", context: "风控" },
    ],
    questions: [
      { id: "q-worst", theme: "最坏", question: "最坏情况是什么？" },
      { id: "q-prob", theme: "概率", question: "发生概率多大？" },
      { id: "q-signal", theme: "信号", question: "有没有提前信号？" },
      { id: "q-stop", theme: "停损", question: "谁按停止键？阈值是什么？" },
    ],
    failurePatterns: [
      { id: "f-legal", pattern: "法律/合规硬伤", signal: "许可/合同缺口仍推进", countermeasure: "红线否决" },
      { id: "f-food", pattern: "食品安全", signal: "品控体系缺失", countermeasure: "红线否决" },
      { id: "f-ignore", pattern: "忽视预警", signal: "少数意见被折叠", countermeasure: "强制 Minority Report" },
      { id: "f-no-kill", pattern: "无停损机制", signal: "没有明确的停损信号与责任人", countermeasure: "设定 kill metric 与执行人" },
    ],
  },
};

export function getKnowledgeBase(roleId: CouncilRoleId): ExpertKnowledgeBase {
  return KNOWLEDGE_BASES[roleId];
}

export function listKnowledgeBases(): ExpertKnowledgeBase[] {
  return Object.values(KNOWLEDGE_BASES);
}

/** 为 Prompt 压缩注入：框架 + 失败模式 + 关键提问 + 学习校准 */
export function renderKnowledgeBlock(roleId: CouncilRoleId): string {
  const kb = getKnowledgeBase(roleId);
  const fw = kb.frameworks
    .map((f) => `- ${f.name}: ${f.formula}`)
    .join("\n");
  const fails = kb.failurePatterns
    .slice(0, 5)
    .map((f) => `- ${f.pattern}（信号: ${f.signal}）`)
    .join("\n");
  const qs = kb.questions
    .slice(0, 5)
    .map((q) => `- [${q.theme ?? q.id}] ${q.question}`)
    .join("\n");
  const methods = kb.methodology
    .slice(0, 5)
    .map((m) => `- ${m.name}（${m.source}）`)
    .join("\n");
  const cases = kb.cases
    .slice(0, 4)
    .map((c) => `- ${c.title} [${c.outcome}]: ${c.lesson}`)
    .join("\n");
  const adj = (kb.learning_adjustments ?? [])
    .slice(-3)
    .map((a) => `- ${a.weight_hint}（${a.observation}）`)
    .join("\n");

  return [
    `# Knowledge Assets — ${kb.role_id}`,
    `使命: ${kb.mission}`,
    "",
    "## 方法论（节选）",
    methods,
    "",
    "## 判断框架",
    fw,
    "",
    "## 案例锚点",
    cases,
    "",
    "## 失败模式（优先排查）",
    fails,
    "",
    "## 知识问题库",
    qs,
    adj ? `\n## 学习校准（企业反馈）\n${adj}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

/** 按议题关键词检索相关失败模式 / 案例 */
export function recallKnowledgeForIssue(
  roleId: CouncilRoleId,
  question: string,
): { failures: FailurePattern[]; cases: KnowledgeCase[]; questions: KnowledgeQuestion[] } {
  const kb = getKnowledgeBase(roleId);
  const q = question.toLowerCase();
  const hit = (text: string) =>
    text.split(/[\s、，,/]/).some((t) => t.length > 1 && q.includes(t.toLowerCase()));

  const failures = kb.failurePatterns.filter(
    (f) => hit(f.pattern) || hit(f.signal) || /扩张|加盟|融资|现金|复制/.test(q),
  );
  const cases = kb.cases.filter(
    (c) => hit(c.title) || hit(c.lesson) || c.industry === "餐饮",
  );
  return {
    failures: failures.length ? failures.slice(0, 3) : kb.failurePatterns.slice(0, 2),
    cases: cases.slice(0, 2),
    questions: kb.questions.slice(0, 3),
  };
}
