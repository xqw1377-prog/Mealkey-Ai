import type { BizDimensionScore, BizPageOutput, BusinessSnapshot } from "@/lib/business";

export type ProtocolContextField = {
  label: string;
  value: string;
};

export type ProtocolDecisionView = {
  problem: string;
  choice: string;
  reasoning: string[];
  tradeoff: string;
  validation: string;
};

export type ProtocolMemoryView = {
  founderMemory: string[];
  businessMemory: string[];
  decisionMemory: string[];
};

export type BusinessProtocolLedgerItem = {
  id: string;
  kind: "FACT" | "ASSUMPTION" | "HYPOTHESIS";
  statement: string;
  note: string;
  status?: string;
  followUp?: string;
};

export type BusinessProtocolProjection = {
  founderContextView: {
    identity: string;
    background: string;
    goal: string;
    riskLabel: string;
    riskNote: string;
    decisionStyle: string;
  };
  businessContextView: ProtocolContextField[];
  decisionProtocolView: ProtocolDecisionView;
  memoryView: ProtocolMemoryView;
  factLedger: BusinessProtocolLedgerItem[];
};

function inferFounderGoal(text: string) {
  if (/(增长|扩张|复制|加盟|规模)/.test(text)) {
    return "先找到这门生意可持续放大的路径。";
  }
  if (/(利润|盈利|现金流|赚钱)/.test(text)) {
    return "先建立稳定盈利和健康现金流。";
  }
  if (/(品牌|定位|心智)/.test(text)) {
    return "先让品牌选择和商业结构重新对齐。";
  }
  return "先看清这门生意真正成立的条件。";
}

function inferRiskProfile(text: string) {
  if (/(暂缓|先别扩张|验证|稳住|风险)/.test(text)) {
    return {
      label: "稳健型",
      note: "先验证，再放大投入。",
    };
  }

  if (/(快速|融资|加盟|扩张|规模)/.test(text)) {
    return {
      label: "进取型",
      note: "优先抢窗口，再补底盘。",
    };
  }

  return {
    label: "平衡型",
    note: "在增长和风险之间持续找平衡。",
  };
}

function layerLabel(layer: string) {
  const labels: Record<string, string> = {
    L1: "事实认知",
    L2: "规则认知",
    L3: "分析认知",
    L4: "策略认知",
    L5: "验证认知",
  };
  return labels[layer] || layer;
}

export function buildFounderBusinessContextView(input: {
  project: { name: string; category?: string | null; stage?: string | null };
  snapshot: BusinessSnapshot | null;
  suggestions: BizPageOutput["suggestions"];
  verificationTasks: BizPageOutput["verificationTasks"];
}) {
  const text = [
    input.snapshot?.problem,
    input.snapshot?.oneLiner,
    input.snapshot?.strategy,
    input.snapshot?.action,
    input.suggestions[0]?.action,
    input.verificationTasks[0]?.verificationAction,
  ]
    .filter(Boolean)
    .join(" ");
  const risk = inferRiskProfile(text);

  return {
    identity: `${input.project.name} 创始人`,
    background: input.project.category || "当前业务背景待补全",
    goal: inferFounderGoal(text),
    riskLabel: risk.label,
    riskNote: risk.note,
    decisionStyle:
      input.verificationTasks.length > 0 ? "先验证后放大" : "先诊断后做取舍",
  };
}

export function buildBusinessContextView(input: {
  project: { category?: string | null; stage?: string | null };
  snapshot: BusinessSnapshot | null;
  pageOutput: BizPageOutput | null;
  businessCard: { industry: string; stage: string; customer: string; revenue: string };
}) {
  return [
    { label: "行业", value: input.project.category || input.businessCard.industry },
    { label: "阶段", value: input.project.stage || input.businessCard.stage },
    { label: "客户模型", value: input.businessCard.customer },
    { label: "收入模型", value: input.businessCard.revenue },
    { label: "当前矛盾", value: input.snapshot?.diagnosis || "待形成第一性问题" },
    {
      label: "协议层级",
      value: input.pageOutput ? layerLabel(input.pageOutput.currentLayer) : "待启动",
    },
  ];
}

export function buildBusinessDecisionProtocolView(input: {
  snapshot: BusinessSnapshot | null;
  suggestions: BizPageOutput["suggestions"];
  ruleJudgments: BizPageOutput["ruleJudgments"];
  verificationTasks: BizPageOutput["verificationTasks"];
}) {
  const reasoning = [
    input.snapshot?.diagnosis,
    input.ruleJudgments[0]?.conclusion,
    input.ruleJudgments[1]?.conclusion,
    input.suggestions[0]?.expectedImpact,
  ]
    .filter((item): item is string => Boolean(item))
    .filter((item, index, list) => list.indexOf(item) === index)
    .slice(0, 3);

  const choice =
    input.snapshot?.strategy ||
    input.suggestions[0]?.action ||
    "先把商业建议压成一个可执行选择。";
  const validation =
    input.verificationTasks[0]?.verificationAction ||
    input.snapshot?.action ||
    "补充验证动作后再进入执行。";
  const caution = inferRiskProfile(
    [choice, validation, input.snapshot?.oneLiner].filter(Boolean).join(" "),
  ).label;

  return {
    problem:
      input.snapshot?.problem ||
      input.ruleJudgments[0]?.conclusion ||
      "当前问题仍在澄清中。",
    choice,
    reasoning,
    tradeoff:
      caution === "稳健型"
        ? "速度会慢一点，但能换来更高验证质量。"
        : caution === "进取型"
          ? "会更快抢窗口，但会把底层风险一起放大。"
          : "需要在增长欲望和经营纪律之间持续平衡。",
    validation,
  };
}

export function buildBusinessMemoryView(input: {
  previous: BusinessSnapshot | null;
  history: BusinessSnapshot[];
  snapshot: BusinessSnapshot | null;
  verificationTasks: BizPageOutput["verificationTasks"];
}) {
  const founderMemory = [
    inferRiskProfile(
      [input.snapshot?.strategy, input.snapshot?.action, input.snapshot?.oneLiner]
        .filter(Boolean)
        .join(" "),
    ).note,
    input.verificationTasks.length > 0 ? "当前偏好先验证关键动作。" : "当前偏好仍在校准中。",
  ];

  const businessMemory = [
    input.previous?.oneLiner,
    ...input.history.slice(0, 2).map((item) => item.oneLiner),
  ]
    .filter((item): item is string => Boolean(item))
    .slice(0, 3);

  const decisionMemory = [
    input.snapshot?.strategy,
    input.verificationTasks[0]?.verificationAction,
    input.snapshot?.action,
  ]
    .filter((item): item is string => Boolean(item))
    .filter((item, index, list) => list.indexOf(item) === index)
    .slice(0, 3);

  return {
    founderMemory,
    businessMemory,
    decisionMemory,
  };
}

export function buildBusinessFactLedger(factNodes: BizPageOutput["factNodes"]) {
  return factNodes.slice(0, 6).map((item) => {
    const kind: BusinessProtocolLedgerItem["kind"] =
      !item.needsVerification && item.confidence >= 0.8
        ? "FACT"
        : item.confidence >= 0.55
          ? "ASSUMPTION"
          : "HYPOTHESIS";

    return {
      id: item.nodeId,
      kind,
      statement: item.statement,
      note: `${item.category} · ${Math.round(item.confidence * 100)}%`,
      status: item.verificationStatus,
      followUp: item.followUpQuestions[0],
    };
  });
}

export function buildBusinessProtocolProjection(input: {
  project: { name: string; category?: string | null; stage?: string | null };
  snapshot: BusinessSnapshot | null;
  previous: BusinessSnapshot | null;
  history: BusinessSnapshot[];
  pageOutput: BizPageOutput | null;
  suggestions: BizPageOutput["suggestions"];
  ruleJudgments: BizPageOutput["ruleJudgments"];
  verificationTasks: BizPageOutput["verificationTasks"];
  factNodes: BizPageOutput["factNodes"];
  businessCard: { industry: string; stage: string; customer: string; revenue: string };
}): BusinessProtocolProjection {
  return {
    founderContextView: buildFounderBusinessContextView({
      project: input.project,
      snapshot: input.snapshot,
      suggestions: input.suggestions,
      verificationTasks: input.verificationTasks,
    }),
    businessContextView: buildBusinessContextView({
      project: {
        category: input.project.category,
        stage: input.project.stage,
      },
      snapshot: input.snapshot,
      pageOutput: input.pageOutput,
      businessCard: input.businessCard,
    }),
    decisionProtocolView: buildBusinessDecisionProtocolView({
      snapshot: input.snapshot,
      suggestions: input.suggestions,
      ruleJudgments: input.ruleJudgments,
      verificationTasks: input.verificationTasks,
    }),
    memoryView: buildBusinessMemoryView({
      previous: input.previous,
      history: input.history,
      snapshot: input.snapshot,
      verificationTasks: input.verificationTasks,
    }),
    factLedger: buildBusinessFactLedger(input.factNodes),
  };
}
