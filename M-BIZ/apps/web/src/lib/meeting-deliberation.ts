/**
 * Founder OS Meeting — 四部门专家模板 + 回合制审议引擎
 * 对齐 docs/FOUNDER_OS_MEETING_SYSTEM_V1.md §四 / §五 / §十
 */

import type {
  ConsensusDraft,
  ExpertSeat,
  ExpertStatement,
  MeetingConflict,
  MeetingDepartment,
  MeetingSeedInput,
} from "./meeting";
import { GENERAL_EXPERTS } from "./meeting";

export type ForceAgentCode = "m-mkt" | "m-pnt" | "m-biz" | "m-ed" | "chief";

export type DecisionOption = {
  id: string;
  label: string;
  summary: string;
  tradeoff: string;
};

export type DeliberationRound = 1 | 2 | 3;

export type DeliberationResult = {
  round: DeliberationRound;
  statements: ExpertStatement[];
  conflict: MeetingConflict | null;
  consensus: ConsensusDraft | null;
  options: DecisionOption[];
};

/** 部门 → 背后 Agent（前台不展示 code） */
export const DEPARTMENT_AGENT: Record<MeetingDepartment, ForceAgentCode> = {
  general: "chief",
  business: "m-biz",
  market: "m-mkt",
  brand: "m-pnt",
  org: "m-ed",
};

export const BRAND_EXPERTS: ExpertSeat[] = [
  {
    roleId: "expert.ries",
    displayName: "里斯",
    duty: "心智占位",
    focus: ["心智位置", "第一属性", "简单认知"],
  },
  {
    roleId: "expert.trout",
    displayName: "特劳特",
    duty: "竞争定位",
    focus: ["竞争差异", "对手空位", "品类关系"],
  },
  {
    roleId: "expert.ye",
    displayName: "叶茂中",
    duty: "传播落地",
    focus: ["传播锐度", "销售转化", "执行表达"],
  },
  {
    roleId: "expert.market_brand",
    displayName: "市场专家",
    duty: "市场现实",
    focus: ["用户", "品类", "窗口"],
  },
];

export const MARKET_EXPERTS: ExpertSeat[] = [
  {
    roleId: "expert.industry",
    displayName: "行业研究员",
    duty: "品类与城市事实",
    focus: ["规模", "结构", "趋势"],
  },
  {
    roleId: "expert.insight",
    displayName: "用户洞察",
    duty: "需求与心智",
    focus: ["人群", "动机", "障碍"],
  },
  {
    roleId: "expert.growth",
    displayName: "增长专家",
    duty: "进入与增长",
    focus: ["窗口", "获客", "复购"],
  },
];

export const BUSINESS_EXPERTS: ExpertSeat[] = [
  {
    roleId: "expert.biz_model",
    displayName: "商业模型顾问",
    duty: "赚钱与复制逻辑",
    focus: ["收入", "成本", "复制"],
  },
  {
    roleId: "expert.finance",
    displayName: "财务顾问",
    duty: "投入产出与现金",
    focus: ["现金", "回报", "风险"],
  },
  {
    roleId: "expert.ops",
    displayName: "运营顾问",
    duty: "标准化与落地",
    focus: ["标准", "人效", "供应链"],
  },
];

export const ORG_EXPERTS: ExpertSeat[] = [
  {
    roleId: "expert.equity",
    displayName: "股权专家",
    duty: "控制权与结构",
    focus: ["股权", "控制权", "稀释"],
  },
  {
    roleId: "expert.hr",
    displayName: "HR专家",
    duty: "激励与组织",
    focus: ["激励", "角色", "承接"],
  },
  {
    roleId: "expert.founder",
    displayName: "创始人顾问",
    duty: "创始人取舍",
    focus: ["节奏", "风险偏好", "长期意图"],
  },
];

/** Founder 四席：与 startMeeting 返回的 roleId=founder.M-* 对齐 */
export const FOUNDER_SEATS: ExpertSeat[] = [
  {
    roleId: "founder.M-MKT",
    displayName: "市场顾问",
    duty: "分析行业空间",
    focus: ["市场", "进入", "窗口"],
  },
  {
    roleId: "founder.M-PNT",
    displayName: "品牌顾问",
    duty: "分析品牌定位",
    focus: ["定位", "心智", "差异"],
  },
  {
    roleId: "founder.M-BIZ",
    displayName: "商业顾问",
    duty: "分析扩张模型",
    focus: ["模型", "单元经济", "扩张"],
  },
  {
    roleId: "founder.M-ED",
    displayName: "组织顾问",
    duty: "分析管理能力",
    focus: ["股权", "治理", "团队"],
  },
];

export function getFounderSeatsForAgents(agentIds: string[]): ExpertSeat[] {
  const set = new Set(agentIds.map((id) => `founder.${id}`));
  const matched = FOUNDER_SEATS.filter((seat) => set.has(seat.roleId));
  return matched.length > 0 ? matched : FOUNDER_SEATS;
}

export function getExpertsForDepartment(department: MeetingDepartment): ExpertSeat[] {
  switch (department) {
    case "brand":
      return BRAND_EXPERTS;
    case "market":
      return MARKET_EXPERTS;
    case "business":
      return BUSINESS_EXPERTS;
    case "org":
      return ORG_EXPERTS;
    default:
      return GENERAL_EXPERTS;
  }
}

export function getForceAgent(department: MeetingDepartment): ForceAgentCode {
  return DEPARTMENT_AGENT[department];
}

type RoundScript = {
  claim: string;
  reason: string;
  stance: ExpertStatement["stance"];
};

function departmentScripts(
  department: MeetingDepartment,
  topic: string,
  facts: string[],
): Record<string, { r1: RoundScript; r2: RoundScript }> {
  const factHint = facts[0] ? `依据：${facts[0]}` : "依据：当前企业上下文";
  const expand = /加盟|扩张|复制|连锁/.test(topic);

  if (department === "brand") {
    return {
      "expert.ries": {
        r1: {
          claim: "先占住一个可记忆的心智位置",
          reason: `${factHint}。没有清晰心智，传播会空转。`,
          stance: "oppose",
        },
        r2: {
          claim: "若只追销量表达，心智会被稀释",
          reason: "挑战传播侧：锐度不够时，增长广告买不来定位。",
          stance: "oppose",
        },
      },
      "expert.trout": {
        r1: {
          claim: "先找对手空位，再谈差异化",
          reason: "竞争结构不清，定位容易做成自我宣言。",
          stance: "conditional",
        },
        r2: {
          claim: "空位存在，但窗口不会无限等",
          reason: "挑战谨慎派：过度等待可能让空位被占据。",
          stance: "support",
        },
      },
      "expert.ye": {
        r1: {
          claim: "定位必须能被一句话说清并推动销售",
          reason: "不能落地的定位只是会议室语言。",
          stance: "support",
        },
        r2: {
          claim: "可先用传播验证，再固化定位表述",
          reason: "挑战纯理论：市场反馈比完美定义更快。",
          stance: "support",
        },
      },
      "expert.market_brand": {
        r1: {
          claim: "用户认知仍不足，需先校准品类词",
          reason: `${factHint}。品类词错了，后面全错。`,
          stance: "conditional",
        },
        r2: {
          claim: "市场现实要求先验证认知，再大规模投入",
          reason: "挑战激进扩张叙事。",
          stance: "oppose",
        },
      },
    };
  }

  if (department === "market") {
    return {
      "expert.industry": {
        r1: {
          claim: "品类与城市数据支持谨慎进入",
          reason: `${factHint}。结构机会存在，但证据密度不够。`,
          stance: "conditional",
        },
        r2: {
          claim: "证据不足时，窗口叙事容易被高估",
          reason: "挑战增长专家的紧迫感。",
          stance: "oppose",
        },
      },
      "expert.insight": {
        r1: {
          claim: "目标用户动机仍不够清晰",
          reason: "没有动机证据，进入判断会漂。",
          stance: "oppose",
        },
        r2: {
          claim: "可先做小样本验证，再决定进入强度",
          reason: "给增长路径留验证口。",
          stance: "conditional",
        },
      },
      "expert.growth": {
        r1: {
          claim: "市场窗口正在出现，宜尽早卡位",
          reason: "等待一年，竞争格局可能改写。",
          stance: "support",
        },
        r2: {
          claim: "若完全等证据齐，窗口可能关闭",
          reason: "挑战研究侧的过度谨慎。",
          stance: "support",
        },
      },
    };
  }

  if (department === "org") {
    return {
      "expert.equity": {
        r1: {
          claim: "先锁控制权边界，再谈激励力度",
          reason: "激励过大而控制权不清，后续治理成本更高。",
          stance: "oppose",
        },
        r2: {
          claim: "控制权安全是扩张的前提",
          reason: "挑战激进激励方案。",
          stance: "oppose",
        },
      },
      "expert.hr": {
        r1: {
          claim: "组织承接与关键角色尚未就绪",
          reason: `${factHint}。没有人接住，结构只是纸面。`,
          stance: "oppose",
        },
        r2: {
          claim: "可先设关键岗与考核，再动股权",
          reason: "给创始人顾问一个可执行缓冲。",
          stance: "conditional",
        },
      },
      "expert.founder": {
        r1: {
          claim: "节奏应匹配创始人风险偏好",
          reason: "过快分权或过慢激励都会伤长期意图。",
          stance: "conditional",
        },
        r2: {
          claim: "先做可逆设计，保留纠错空间",
          reason: "挑战一次性大改结构。",
          stance: "conditional",
        },
      },
    };
  }

  // business + general（加盟/扩张默认剧本）
  return {
    "expert.biz_model": {
      r1: {
        claim: expand ? "暂缓加盟，先验证直营复制" : "先把赚钱逻辑压成可验证模型",
        reason: `${factHint}。收入模型未证明可复制前，扩张会放大亏损。`,
        stance: "oppose",
      },
      r2: {
        claim: "市场窗口存在，但不能替代模型验证",
        reason: "挑战增长侧：机会≠就绪。",
        stance: "oppose",
      },
    },
    "expert.market": {
      r1: {
        claim: "外部窗口正在打开，不宜长期观望",
        reason: "用户与竞争动态显示卡位价值上升。",
        stance: "support",
      },
      r2: {
        claim: "如果等待一年，窗口是否还在？",
        reason: "挑战运营/模式侧的过度谨慎。",
        stance: "support",
      },
    },
    "expert.growth": {
      r1: {
        claim: "增长路径需要先有可复制单元",
        reason: "没有标准单元，投放只会烧钱。",
        stance: "conditional",
      },
      r2: {
        claim: "可用小范围试点兼顾窗口与能力",
        reason: "提出折中：试点而非全面加盟。",
        stance: "conditional",
      },
    },
    "expert.ops": {
      r1: {
        claim: "标准化与人效体系不足",
        reason: `${factHint}。培训/供应链/店长体系未成型。`,
        stance: "oppose",
      },
      r2: {
        claim: "快速扩张失败成本高于错过窗口",
        reason: "挑战市场顾问。",
        stance: "oppose",
      },
    },
    "expert.finance": {
      r1: {
        claim: "现金与回报周期尚未支撑快速复制",
        reason: "投入强度与回收节奏不匹配。",
        stance: "oppose",
      },
      r2: {
        claim: "可设90天验证预算上限",
        reason: "给共识一个财务护栏。",
        stance: "conditional",
      },
    },
  };
}

function clip(text: string, n: number): string {
  const t = text.trim();
  return t.length > n ? `${t.slice(0, n - 1)}…` : t;
}

export function runDeliberationRound(params: {
  round: DeliberationRound;
  department: MeetingDepartment;
  topic: string;
  knownFacts?: string[];
  focusChoice?: string | null;
  previous?: ExpertStatement[];
  seed?: MeetingSeedInput;
}): DeliberationResult {
  const experts = getExpertsForDepartment(params.department);
  const facts = params.knownFacts ?? params.seed?.knownFacts ?? [];
  const scripts = departmentScripts(params.department, params.topic, facts);
  const previous = params.previous ?? [];

  if (params.round === 1) {
    const statements: ExpertStatement[] = experts.map((expert, index) => {
      const script = scripts[expert.roleId]?.r1;
      const seedReason =
        params.seed?.judgements?.[index] ||
        params.seed?.meetingDecision ||
        script?.reason ||
        `${expert.duty}视角：需要更多事实。`;
      const claim = script?.claim || clip(String(seedReason), 40);
      return {
        id: `r1-${expert.roleId}`,
        roleId: expert.roleId,
        displayName: expert.displayName,
        round: 1,
        stance: script?.stance || (index % 2 === 0 ? "conditional" : "oppose"),
        claim,
        reasons: [script?.reason || String(seedReason)],
      };
    });

    return {
      round: 1,
      statements,
      conflict: null,
      consensus: null,
      options: [],
    };
  }

  if (params.round === 2) {
    const statements: ExpertStatement[] = experts.map((expert) => {
      const script = scripts[expert.roleId]?.r2;
      return {
        id: `r2-${expert.roleId}`,
        roleId: expert.roleId,
        displayName: expert.displayName,
        round: 2,
        stance: script?.stance || "conditional",
        claim: script?.claim || "请各方回应主要分歧",
        reasons: [script?.reason || "基于 Round1 观点互相挑战"],
      };
    });

    const all = [...previous.filter((s) => s.round === 1), ...statements];
    const support = all.filter((s) => s.stance === "support");
    const oppose = all.filter((s) => s.stance === "oppose");
    const conflict: MeetingConflict = {
      id: `conflict-${params.department}`,
      issue: params.topic,
      positionA: support[0]?.claim || "推进时机",
      positionB: oppose[0]?.claim || "能力准备",
      conflictLabel: departmentConflictLabel(params.department),
    };

    return {
      round: 2,
      statements: all,
      conflict,
      consensus: null,
      options: [],
    };
  }

  // Round 3 — synthesis + options
  const focus = params.focusChoice;
  const focusText =
    focus === "growth"
      ? "更偏向抓住增长窗口"
      : focus === "brand"
        ? "更偏向品牌长期价值"
        : "更偏向稳健盈利与可控节奏";

  const proposed =
    focus === "growth"
      ? "设定边界试点推进，90天验证后决定是否加速"
      : focus === "brand"
        ? "先完成认知与定位验证，再扩大投入"
        : "暂缓全面扩张，90天完成复制能力验证";

  const round3: ExpertStatement[] = experts.slice(0, 2).map((expert, index) => ({
    id: `r3-${expert.roleId}`,
    roleId: expert.roleId,
    displayName: expert.displayName,
    round: 3,
    stance: "conditional",
    claim: index === 0 ? clip(proposed, 40) : "接受有条件共识，保留验证门禁",
    reasons: [`综合各方分歧后，${focusText}`],
  }));

  const statements = [
    ...previous.filter((s) => s.round === 1 || s.round === 2),
    ...round3,
  ];

  const options = buildDecisionOptions(params.department, params.topic, focus);
  const consensus: ConsensusDraft = {
    summary: proposed,
    proposedDecision: proposed,
    coreReasons: [
      focusText,
      statements.find((s) => s.stance === "oppose")?.claim || "主要风险仍在能力侧",
      statements.find((s) => s.stance === "support")?.claim || "外部机会仍需重视",
    ].filter(Boolean),
    nextActions: [options[0]?.summary || "启动90天验证计划"],
    validationPlan: "90天验证",
  };

  const conflict = {
    id: `conflict-${params.department}`,
    issue: params.topic,
    positionA: "推进/抓住窗口",
    positionB: "验证/补齐能力",
    conflictLabel: departmentConflictLabel(params.department),
  };

  return {
    round: 3,
    statements,
    conflict,
    consensus,
    options,
  };
}

function departmentConflictLabel(department: MeetingDepartment): string {
  switch (department) {
    case "brand":
      return "心智锐度 vs 短期销量";
    case "market":
      return "窗口紧迫 vs 证据不足";
    case "org":
      return "激励力度 vs 控制权安全";
    case "business":
    case "general":
    default:
      return "市场窗口 vs 复制能力";
  }
}

export function buildDecisionOptions(
  department: MeetingDepartment,
  topic: string,
  focusChoice?: string | null,
): DecisionOption[] {
  if (department === "brand") {
    return [
      {
        id: "A",
        label: "方案A · 锐化定位",
        summary: "先冻结一句定位并做认知验证",
        tradeoff: "短期销量可能承压",
      },
      {
        id: "B",
        label: "方案B · 边卖边定",
        summary: "用传播测试反推定位表述",
        tradeoff: "心智可能暂时发散",
      },
      {
        id: "C",
        label: "方案C · 暂缓决策",
        summary: "补齐用户与竞争证据后再定",
        tradeoff: "可能错过表达窗口",
      },
    ];
  }

  if (department === "market") {
    return [
      {
        id: "A",
        label: "方案A · 进入",
        summary: "确认进入，设90天验证指标",
        tradeoff: "证据仍不完全",
      },
      {
        id: "B",
        label: "方案B · 试点",
        summary: "小范围试点，不全面铺开",
        tradeoff: "规模效应来得慢",
      },
      {
        id: "C",
        label: "方案C · 观望",
        summary: "继续补研究，暂不进入",
        tradeoff: "窗口可能被占据",
      },
    ];
  }

  if (department === "org") {
    return [
      {
        id: "A",
        label: "方案A · 控制权优先",
        summary: "先定控制权与治理边界",
        tradeoff: "激励吸引力下降",
      },
      {
        id: "B",
        label: "方案B · 激励优先",
        summary: "加大关键人才激励",
        tradeoff: "稀释与治理风险上升",
      },
      {
        id: "C",
        label: "方案C · 分步设计",
        summary: "可逆结构 + 阶段解锁",
        tradeoff: "方案复杂度更高",
      },
    ];
  }

  // business / general
  const cautious = focusChoice !== "growth";
  return [
    {
      id: "A",
      label: cautious ? "方案A · 暂缓加盟" : "方案A · 边界试点",
      summary: cautious
        ? "90天完成直营复制验证，暂缓加盟"
        : "设边界试点推进，90天后决定是否加速",
      tradeoff: cautious ? "可能慢于市场节奏" : "仍有复制风险",
    },
    {
      id: "B",
      label: "方案B · 有限加盟",
      summary: "仅对标准成熟门店类型开放有限名额",
      tradeoff: "管理复杂度上升",
    },
    {
      id: "C",
      label: "方案C · 全面推进",
      summary: `围绕「${clip(topic, 16)}」立即推进扩张`,
      tradeoff: "组织与模型风险被放大",
    },
  ];
}
