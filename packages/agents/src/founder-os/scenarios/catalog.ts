/**
 * 经营场景矩阵 — 老板真实决策节点 → 引擎/常委会调度
 */

import type { CouncilRoleId, DecisionTypeId, IssueLevel } from "../types";

export type OperatingScenarioId =
  | "startup_launch"
  | "expansion"
  | "brand_upgrade"
  | "new_product"
  | "ops_anomaly"
  | "fundraising_equity";

export type ScenarioFrequency = "low" | "medium" | "high";

export type CouncilMode = true | false | "conditional" | "mini";

export interface OperatingScenario {
  id: OperatingScenarioId;
  name: string;
  founder_prompt_example: string;
  value: string;
  frequency: ScenarioFrequency;
  default_level: IssueLevel;
  decision_type: DecisionTypeId;
  engines: string[];
  council: CouncilMode;
  council_name?: string;
  mini_roster?: CouncilRoleId[];
  founder_required?: boolean;
  proactive?: boolean;
  triggers: string[];
  engine_questions?: Record<string, string>;
  council_lenses?: Partial<Record<CouncilRoleId, string>>;
  resolution_hint?: string;
}

export interface ScenarioPlan {
  scenario: OperatingScenario;
  engines: string[];
  conveneCouncil: boolean;
  level: IssueLevel;
  roster: CouncilRoleId[];
  founderRequired: boolean;
  councilName: string;
  cadence: "today" | "weekly" | "monthly" | "quarterly" | "on_demand";
  why: string[];
}

export interface TodayDecisionCard {
  title: string;
  finding: string;
  suggestedScenario: OperatingScenarioId;
  cta: string;
}

const FULL: CouncilRoleId[] = [
  "CSO",
  "CMO",
  "CBO",
  "BMO",
  "CFO",
  "COO",
  "CRO",
];

export const OPERATING_SCENARIOS: Record<
  OperatingScenarioId,
  OperatingScenario
> = {
  startup_launch: {
    id: "startup_launch",
    name: "创业立项",
    founder_prompt_example: "我想做一个新的餐饮品牌",
    value: "最高价值场景",
    frequency: "low",
    default_level: "L3",
    decision_type: "new_brand",
    engines: ["M-MKT", "M-PNT", "M-BIZ", "M-ED"],
    council: true,
    council_name: "立项决策委员会",
    triggers: ["新品牌", "我想做一个", "创业", "立项", "从零开始", "湖南小吃"],
    engine_questions: {
      "M-MKT": "市场是否存在？",
      "M-PNT": "为什么选择你？",
      "M-BIZ": "赚钱模型是否成立？",
      "M-ED": "资本结构与节奏？",
    },
    resolution_hint: "有条件立项 / 暂缓 / 推翻，必须附验证与 kill metric",
  },
  expansion: {
    id: "expansion",
    name: "扩张决策",
    founder_prompt_example: "第一家店成功，要不要复制？",
    value: "餐饮最危险场景",
    frequency: "medium",
    default_level: "L3",
    decision_type: "store_expansion",
    engines: ["M-MKT", "M-PNT", "M-BIZ", "M-ED"],
    council: true,
    council_name: "Expansion Council",
    triggers: [
      "扩张",
      "复制",
      "第二家",
      "开第二",
      "新城市",
      "要不要开",
      "进入上海",
    ],
    council_lenses: {
      CSO: "市场窗口是否存在",
      CMO: "第二城市/第二店是否适合",
      CBO: "复制是否损害品牌",
      BMO: "模型是否成立",
      CFO: "现金是否安全",
      COO: "团队能不能复制",
      CRO: "扩张风险",
    },
    resolution_hint:
      "不是开/不开，而是如：开5家验证；单店利润>15%；店长体系完成",
  },
  brand_upgrade: {
    id: "brand_upgrade",
    name: "品牌升级",
    founder_prompt_example: "消费者不知道我们是谁",
    value: "认知资产重建",
    frequency: "medium",
    default_level: "L2",
    decision_type: "new_brand",
    engines: ["M-PNT", "M-MKT"],
    council: "conditional",
    council_name: "品牌战略审议（条件触发）",
    triggers: ["品牌升级", "定位", "消费者不知道", "心智", "品牌重塑"],
    engine_questions: {
      "M-PNT": "当前认知 / 竞争位置 / 心智空位？",
    },
    resolution_hint: "Brand Strategy；若影响商业/财务则升常委会",
  },
  new_product: {
    id: "new_product",
    name: "新品决策",
    founder_prompt_example: "要不要推一个新品",
    value: "高频经营决策",
    frequency: "high",
    default_level: "L1",
    decision_type: "store_expansion",
    engines: ["M-MKT", "M-PNT", "M-BIZ"],
    council: "mini",
    council_name: "Product Investment Committee",
    mini_roster: ["CMO", "CBO", "BMO", "COO"],
    triggers: ["新品", "推出", "上新", "菜单加", "产品线", "售价"],
    engine_questions: {
      "M-MKT": "用户需要吗？",
      "M-PNT": "符合品牌吗？",
      "M-BIZ": "赚钱了吗？",
      COO: "能稳定生产吗？",
    },
    resolution_hint: "YES/NO + 售价/毛利/限定区域测试等条件",
  },
  ops_anomaly: {
    id: "ops_anomaly",
    name: "经营异常诊断",
    founder_prompt_example: "营业额下降15%",
    value: "未来高频入口（可主动发现）",
    frequency: "high",
    default_level: "L2",
    decision_type: "store_expansion",
    engines: ["M-BIZ", "M-MKT", "M-PNT"],
    council: true,
    council_name: "经营诊断会议",
    proactive: true,
    mini_roster: ["BMO", "CMO", "COO", "CFO", "CBO"],
    triggers: [
      "营业额下降",
      "毛利下降",
      "复购下降",
      "评价下降",
      "异常",
      "诊断",
      "人工上涨",
    ],
    resolution_hint: "改善方案 + 验证任务 + 负责人",
  },
  fundraising_equity: {
    id: "fundraising_equity",
    name: "融资与股权",
    founder_prompt_example: "投资人给500万，占20%，可以吗？",
    value: "M-ED 核心 + 生死级审议",
    frequency: "low",
    default_level: "L4",
    decision_type: "fundraising",
    engines: ["M-ED", "M-BIZ", "M-MKT"],
    council: true,
    founder_required: true,
    council_name: "融资与股权委员会",
    triggers: ["融资", "投资人", "占股", "估值", "股权", "稀释"],
    council_lenses: {
      CSO: "现在需要这笔钱吗？",
      BMO: "增长是否值得这笔资本？",
      CFO: "资本成本与稀释是否可接受？",
      CRO: "控制权与治理风险？",
    },
  },
};

export function getScenario(id: OperatingScenarioId): OperatingScenario {
  return OPERATING_SCENARIOS[id];
}

export function listScenarios(): OperatingScenario[] {
  return Object.values(OPERATING_SCENARIOS);
}

/** 自然语言 / 信号 → 场景 */
export function classifyOperatingScenario(input: {
  question?: string;
  signals?: string[];
}): { scenarioId: OperatingScenarioId; confidence: number; why: string[] } {
  const text = [input.question ?? "", ...(input.signals ?? [])].join(" ");
  const why: string[] = [];
  let best: { id: OperatingScenarioId; score: number } | null = null;

  for (const s of listScenarios()) {
    let score = 0;
    for (const t of s.triggers) {
      if (text.includes(t)) {
        score += t.length >= 4 ? 3 : 2;
        why.push(`命中触发词「${t}」→ ${s.name}`);
      }
    }
    if (s.proactive && input.signals?.length) {
      score += 2;
      why.push(`${s.name} 支持主动信号`);
    }
    if (!best || score > best.score) best = { id: s.id, score };
  }

  // 默认：含投资金额+品牌倾向立项；否则扩张/经营
  if (!best || best.score === 0) {
    if (/品牌|定位/.test(text)) {
      return {
        scenarioId: "brand_upgrade",
        confidence: 0.45,
        why: ["无强触发，按品牌语义归入品牌升级"],
      };
    }
    return {
      scenarioId: "expansion",
      confidence: 0.35,
      why: ["无强触发，默认归入扩张/经营类待 CDO 再判"],
    };
  }

  const confidence = Math.min(0.95, 0.4 + best.score * 0.1);
  const name = getScenario(best.id).name;
  return {
    scenarioId: best.id,
    confidence,
    why: why.filter((w) => w.includes(name)).slice(0, 5),
  };
}

function rosterFor(scenario: OperatingScenario): CouncilRoleId[] {
  if (scenario.council === false) return [];
  if (scenario.council === "mini") {
    return scenario.mini_roster ?? ["CMO", "BMO", "COO"];
  }
  if (scenario.council === "conditional") {
    return scenario.mini_roster ?? ["CSO", "CBO", "CMO", "BMO"];
  }
  if (scenario.mini_roster && scenario.id === "ops_anomaly") {
    return scenario.mini_roster;
  }
  return [...FULL];
}

export function planScenarioRun(
  scenarioId: OperatingScenarioId,
  opts?: { escalateCouncil?: boolean },
): ScenarioPlan {
  const scenario = getScenario(scenarioId);
  let convene =
    scenario.council === true ||
    scenario.council === "mini" ||
    (scenario.council === "conditional" && Boolean(opts?.escalateCouncil));

  const roster = convene ? rosterFor(scenario) : [];
  if (scenario.council === "conditional" && !opts?.escalateCouncil) {
    convene = false;
  }

  const cadence: ScenarioPlan["cadence"] =
    scenario.frequency === "high"
      ? scenario.proactive
        ? "today"
        : "weekly"
      : scenario.frequency === "medium"
        ? "weekly"
        : "on_demand";

  return {
    scenario,
    engines: scenario.engines,
    conveneCouncil: convene && roster.length > 0,
    level: scenario.default_level,
    roster: convene ? roster : [],
    founderRequired:
      Boolean(scenario.founder_required) || scenario.default_level === "L4",
    councilName: scenario.council_name ?? "Decision Council",
    cadence,
    why: [
      `场景：${scenario.name}（${scenario.value}）`,
      `引擎：${scenario.engines.join(", ")}`,
      convene
        ? `召开 ${scenario.council_name ?? "常委会"} · ${roster.join(",")}`
        : "先跑专业引擎，条件满足再升常委会",
    ],
  };
}

/** Today Decision 卡片（主动经营入口） */
export function buildTodayDecision(input: {
  store?: string;
  metric: string;
  changePct: number;
}): TodayDecisionCard {
  const store = input.store ?? "门店";
  return {
    title: "Today Decision",
    finding: `今日发现：你的${store}${input.metric}变化 ${input.changePct}%`,
    suggestedScenario: "ops_anomaly",
    cta: "建议召开经营诊断会议",
  };
}

export function buildWeeklyAgenda(topics: string[]): {
  title: string;
  items: string[];
} {
  return {
    title: "本周三个关键问题",
    items: topics.slice(0, 3),
  };
}

export function buildMonthlyReviewAxes(): string[] {
  return ["战略", "市场", "品牌", "商业", "资本", "风险"];
}
