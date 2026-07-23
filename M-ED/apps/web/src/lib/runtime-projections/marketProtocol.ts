import type { MarketGap, MarketSnapshot } from "@/lib/market";

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
  marketMemory: string[];
  decisionMemory: string[];
};

export type ProtocolLedgerItem = {
  id: string;
  kind: "FACT" | "ASSUMPTION" | "HYPOTHESIS";
  title: string;
  statement: string;
  confidence: number;
};

export type MarketProtocolProjection = {
  founderContextView: {
    identity: string;
    background: string;
    goal: string;
    riskLabel: string;
    riskNote: string;
    decisionStyle: string;
  };
  marketContextView: ProtocolContextField[];
  decisionProtocolView: ProtocolDecisionView;
  memoryView: ProtocolMemoryView;
  signalLedger: ProtocolLedgerItem[];
};

export function inferFounderMarketGoal(text: string) {
  if (/(连锁|复制|规模|加盟|全国)/.test(text)) {
    return "优先判断这个市场是否适合承接规模化扩张。";
  }
  if (/(稳健|验证|谨慎|试点|小范围)/.test(text)) {
    return "优先找到低风险试点进入方式。";
  }
  if (/(品牌|定位|心智|差异化)/.test(text)) {
    return "优先判断市场是否值得为品牌占位投入。";
  }
  return "先判断这个市场是否真的存在进入窗口。";
}

export function inferMarketRiskProfile(text: string) {
  if (/(暂缓|谨慎|验证|风险|先别)/.test(text)) {
    return {
      label: "稳健型",
      note: "先验证市场窗口，再决定是否进入。",
    };
  }

  if (/(进入|抢占|快速|窗口|扩张)/.test(text)) {
    return {
      label: "进取型",
      note: "优先抢占机会，再补后续动作。",
    };
  }

  return {
    label: "平衡型",
    note: "在进入速度和进入质量之间保持平衡。",
  };
}

export function buildFounderMarketContextView(input: {
  project: { name: string; category?: string | null; stage?: string | null };
  snapshot: MarketSnapshot | null;
}) {
  const text = [
    input.snapshot?.problem,
    input.snapshot?.oneLiner,
    input.snapshot?.strategy,
    input.snapshot?.action,
    input.snapshot?.pageOutput.finalDecision.judgement,
  ]
    .filter(Boolean)
    .join(" ");
  const risk = inferMarketRiskProfile(text);

  return {
    identity: `${input.project.name} 创始人`,
    background: input.project.category || "市场方向待补全",
    goal: inferFounderMarketGoal(text),
    riskLabel: risk.label,
    riskNote: risk.note,
    decisionStyle: input.snapshot ? "先判断市场窗口，再决定进入方式" : "先访谈，再开始市场扫描",
  };
}

export function buildMarketContextView(input: { snapshot: MarketSnapshot | null }) {
  const pageOutput = input.snapshot?.pageOutput;
  return [
    { label: "城市", value: pageOutput?.city || "待补充" },
    { label: "品类", value: pageOutput?.category || "待补充" },
    { label: "消费结构", value: pageOutput?.marketStructure.populationTag || "待建立" },
    { label: "场景判断", value: pageOutput?.marketStructure.sceneSummary || "待形成" },
    { label: "竞争压力", value: pageOutput?.competition.biggestPressure || "待判断" },
    { label: "协议层级", value: pageOutput ? "Market Mission 已启动" : "等待启动" },
  ];
}

export function buildMarketDecisionProtocolView(input: { snapshot: MarketSnapshot | null }) {
  const pageOutput = input.snapshot?.pageOutput;
  const decision = pageOutput?.finalDecision;
  const reasoning = (decision?.reasoning || [])
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index)
    .slice(0, 3);

  return {
    problem: input.snapshot?.problem || "当前市场问题仍在澄清中。",
    choice:
      decision?.judgement ||
      input.snapshot?.strategy ||
      "先把市场进入建议压成一个正式选择。",
    reasoning,
    tradeoff:
      decision?.risks[0] ||
      pageOutput?.health.biggestRisk ||
      "需要在抢机会和控制进入风险之间做取舍。",
    validation:
      decision?.actions[0] ||
      input.snapshot?.action ||
      "先补一个进入验证动作，再继续推进品牌定位。",
  };
}

export function buildMarketMemoryView(input: {
  snapshot: MarketSnapshot | null;
  history: Array<{ judgement?: string | null; problem: string; createdAt: string | Date }>;
  reports: Array<{ title: string; summary?: string | null }>;
}) {
  const founderFitScore = input.snapshot?.pageOutput.scores.founderFit ?? 0;
  const founderMemory = [
    inferMarketRiskProfile(
      [
        input.snapshot?.oneLiner,
        input.snapshot?.pageOutput.finalDecision.judgement,
        input.snapshot?.pageOutput.health.biggestRisk,
      ]
        .filter(Boolean)
        .join(" "),
    ).note,
    founderFitScore >= 70
      ? "当前创始人与该市场进入方式较匹配。"
      : "当前创始人与市场窗口仍需继续校准。",
  ];

  const marketMemory = [
    input.snapshot?.pageOutput.marketMemory?.patternSummary,
    input.snapshot?.pageOutput.marketMemory?.confidenceNote,
    ...input.reports.slice(0, 2).map((item) => item.title),
  ]
    .filter((item): item is string => Boolean(item))
    .slice(0, 3);

  const decisionMemory = [
    input.snapshot?.pageOutput.finalDecision.judgement,
    ...input.history.slice(0, 2).map((item) => item.judgement || item.problem),
  ]
    .filter((item): item is string => Boolean(item))
    .slice(0, 3);

  return {
    founderMemory,
    marketMemory,
    decisionMemory,
  };
}

export function buildMarketSignalLedger(signals: MarketGap[]) {
  return signals.slice(0, 6).map((item) => {
    const confidence = item.confidence ?? 0;
    const kind: ProtocolLedgerItem["kind"] =
      confidence >= 80 ? "FACT" : confidence >= 65 ? "ASSUMPTION" : "HYPOTHESIS";

    return {
      id: item.title,
      kind,
      statement: item.summary,
      title: item.title,
      confidence,
    };
  });
}

export function buildMarketProtocolProjection(input: {
  project: { name: string; category?: string | null; stage?: string | null };
  snapshot: MarketSnapshot | null;
  signals: MarketGap[];
  history: Array<{ judgement?: string | null; problem: string; createdAt: string | Date }>;
  reports: Array<{ title: string; summary?: string | null }>;
}): MarketProtocolProjection {
  return {
    founderContextView: buildFounderMarketContextView({
      project: input.project,
      snapshot: input.snapshot,
    }),
    marketContextView: buildMarketContextView({ snapshot: input.snapshot }),
    decisionProtocolView: buildMarketDecisionProtocolView({ snapshot: input.snapshot }),
    memoryView: buildMarketMemoryView({
      snapshot: input.snapshot,
      history: input.history,
      reports: input.reports,
    }),
    signalLedger: buildMarketSignalLedger(input.signals),
  };
}
