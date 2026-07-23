type PositioningCandidate = {
  id: string;
  title: string;
  fit?: string;
  why?: string;
  risk?: string;
  tag?: string;
};

type PositioningTheoryCard = {
  key: string;
  label: string;
  preferred: string;
  recommend: string;
  reason?: string;
  attack?: string;
};

type PositioningMarketResearch = {
  summary?: string;
  opportunities?: string[];
};

export type PositioningProtocolContextField = {
  label: string;
  value: string;
};

export type PositioningProtocolDecisionView = {
  problem: string;
  choice: string;
  reasoning: string[];
  tradeoff: string;
  validation: string;
};

export type PositioningProtocolMemoryView = {
  founderMemory: string[];
  brandMemory: string[];
  decisionMemory: string[];
};

export type PositioningProtocolLedgerItem = {
  id: string;
  kind: "FOUNDATION" | "INSIGHT" | "PROPOSAL" | "CONTRACT";
  title: string;
  statement: string;
};

export type PositioningProtocolProjection = {
  founderContextView: {
    identity: string;
    background: string;
    goal: string;
    riskLabel: string;
    riskNote: string;
    decisionStyle: string;
  };
  brandContextView: PositioningProtocolContextField[];
  brandDecisionProtocolView: PositioningProtocolDecisionView;
  brandMemoryView: PositioningProtocolMemoryView;
  brandAssetLedger: PositioningProtocolLedgerItem[];
};

function inferFounderBrandGoal(text: string) {
  if (/(连锁|复制|规模|扩张|全国)/.test(text)) {
    return "先把品牌定位做成可复制的扩张母体。";
  }
  if (/(高端|升级|品质|价格带)/.test(text)) {
    return "先建立更高价值感和更稳的价格锚点。";
  }
  if (/(差异化|心智|定位|认知)/.test(text)) {
    return "先在用户心智里占住一个清晰位置。";
  }
  return "先把品牌说清楚，再决定如何放大。";
}

function inferBrandRiskProfile(text: string) {
  if (/(谨慎|验证|试点|先别|风险)/.test(text)) {
    return {
      label: "稳健型",
      note: "先证明定位成立，再放大品牌投入。",
    };
  }

  if (/(抢占|窗口|快速|规模|升级)/.test(text)) {
    return {
      label: "进取型",
      note: "愿意先抢心智和势能，再补执行验证。",
    };
  }

  return {
    label: "平衡型",
    note: "在品牌表达和落地可行性之间保持平衡。",
  };
}

export function buildFounderBrandContextView(input: {
  project: { name: string; category?: string | null; city?: string | null };
  brandName: string;
  categoryName: string;
  audience: string;
  differentiation: string;
  snapshot: any;
}) {
  const text = [
    input.snapshot?.oneLiner,
    input.snapshot?.strategy,
    input.snapshot?.action,
    input.snapshot?.brandPositioning?.mentalPosition,
    input.snapshot?.brandPositioning?.differentiation,
    input.audience,
    input.differentiation,
  ]
    .filter(Boolean)
    .join(" ");
  const risk = inferBrandRiskProfile(text);

  return {
    identity: `${input.project.name || input.brandName || "当前项目"} 创始人`,
    background: input.categoryName || input.project.category || "品牌赛道待补全",
    goal: inferFounderBrandGoal(text),
    riskLabel: risk.label,
    riskNote: risk.note,
    decisionStyle: input.snapshot ? "先形成定位共识，再冻结战略契约" : "先理解品牌，再进入定位判断",
  };
}

export function buildBrandContextView(input: {
  brandName: string;
  categoryName: string;
  cityName: string;
  audience: string;
  differentiation: string;
  snapshot: any;
}) {
  return [
    { label: "品牌", value: input.brandName || "待补充" },
    { label: "品类", value: input.categoryName || "待补充" },
    { label: "城市", value: input.cityName || "待补充" },
    { label: "目标客群", value: input.audience || "待识别" },
    { label: "差异方向", value: input.differentiation || "待明确" },
    {
      label: "协议层级",
      value: input.snapshot?.decisionId ? "Brand Mission 已形成决策" : "Brand Mission 进行中",
    },
  ];
}

export function buildBrandDecisionProtocolView(input: {
  snapshot: any;
  leadCandidate?: PositioningCandidate;
}) {
  const reasoning = [
    input.snapshot?.diagnosis,
    input.snapshot?.brandPositioning?.mentalPosition,
    input.snapshot?.brandPositioning?.differentiation,
    input.leadCandidate?.why,
  ]
    .filter((item): item is string => Boolean(item))
    .filter((item, index, list) => list.indexOf(item) === index)
    .slice(0, 3);

  return {
    problem: input.snapshot?.problem || "当前品牌问题仍在澄清中。",
    choice:
      input.leadCandidate?.title ||
      input.snapshot?.oneLiner ||
      input.snapshot?.brandPositioning?.mentalPosition ||
      "先把定位方向压成一个正式选择。",
    reasoning,
    tradeoff:
      input.snapshot?.risks?.[0]?.risk ||
      input.leadCandidate?.risk ||
      "需要在品牌差异、市场适配和执行可行性之间做取舍。",
    validation:
      input.snapshot?.validation?.day30?.[0] ||
      input.snapshot?.action ||
      "先补一个定位验证动作，再进入放大执行。",
  };
}

export function buildBrandMemoryView(input: {
  snapshot: any;
  history: Array<{ judgement?: string | null; strategy?: string | null; createdAt: string | Date }>;
  reports: Array<{ title: string; summary?: string | null }>;
}) {
  const founderMemory = [
    inferBrandRiskProfile(
      [
        input.snapshot?.oneLiner,
        input.snapshot?.brandPositioning?.mentalPosition,
        input.snapshot?.risks?.[0]?.risk,
      ]
        .filter(Boolean)
        .join(" "),
    ).note,
    input.snapshot?.validation?.day30?.length
      ? "当前偏好先做一轮定位验证。"
      : "当前偏好仍在定位阶段持续校准。",
  ];

  const brandMemory = [
    input.snapshot?.brandPositioning?.mentalPosition,
    input.snapshot?.brandPositioning?.differentiation,
    ...input.reports.slice(0, 2).map((item) => item.title),
  ]
    .filter((item): item is string => Boolean(item))
    .slice(0, 3);

  const decisionMemory = [
    input.snapshot?.oneLiner,
    ...input.history.slice(0, 2).map((item) => item.judgement || item.strategy || ""),
  ]
    .filter((item): item is string => Boolean(item))
    .slice(0, 3);

  return {
    founderMemory,
    brandMemory,
    decisionMemory,
  };
}

export function buildBrandAssetLedger(input: {
  marketResearch: PositioningMarketResearch | null;
  theoryCards: PositioningTheoryCard[];
  candidates: PositioningCandidate[];
  snapshot: any;
}) {
  return [
    {
      id: "brand-brief",
      kind: "FOUNDATION" as const,
      title: "Brand Brief",
      statement: input.snapshot?.diagnosis || "品牌问题和增长阻力仍在形成。",
    },
    {
      id: "market-insight",
      kind: "INSIGHT" as const,
      title: "Market Insight",
      statement:
        input.marketResearch?.summary ||
        input.marketResearch?.opportunities?.[0] ||
        "等待市场情报写回定位协议。",
    },
    {
      id: "theory-proposal",
      kind: "PROPOSAL" as const,
      title: "Theory Proposal",
      statement:
        input.theoryCards[0]?.preferred ||
        input.theoryCards[0]?.reason ||
        "等待三位专家形成可比较提案。",
    },
    {
      id: "position-contract",
      kind: "CONTRACT" as const,
      title: "Position Contract",
      statement:
        input.candidates[0]?.title ||
        input.snapshot?.oneLiner ||
        "等待当前定位方向进入战略冻结。",
    },
  ];
}

export function buildPositioningProtocolProjection(input: {
  project: { name: string; category?: string | null; city?: string | null };
  brandName: string;
  categoryName: string;
  cityName: string;
  audience: string;
  differentiation: string;
  snapshot: any;
  leadCandidate?: PositioningCandidate;
  history: Array<{ judgement?: string | null; strategy?: string | null; createdAt: string | Date }>;
  reports: Array<{ title: string; summary?: string | null }>;
  marketResearch: PositioningMarketResearch | null;
  theoryCards: PositioningTheoryCard[];
  candidates: PositioningCandidate[];
}): PositioningProtocolProjection {
  return {
    founderContextView: buildFounderBrandContextView({
      project: input.project,
      brandName: input.brandName,
      categoryName: input.categoryName,
      audience: input.audience,
      differentiation: input.differentiation,
      snapshot: input.snapshot,
    }),
    brandContextView: buildBrandContextView({
      brandName: input.brandName,
      categoryName: input.categoryName,
      cityName: input.cityName,
      audience: input.audience,
      differentiation: input.differentiation,
      snapshot: input.snapshot,
    }),
    brandDecisionProtocolView: buildBrandDecisionProtocolView({
      snapshot: input.snapshot,
      leadCandidate: input.leadCandidate,
    }),
    brandMemoryView: buildBrandMemoryView({
      snapshot: input.snapshot,
      history: input.history,
      reports: input.reports,
    }),
    brandAssetLedger: buildBrandAssetLedger({
      marketResearch: input.marketResearch,
      theoryCards: input.theoryCards,
      candidates: input.candidates,
      snapshot: input.snapshot,
    }),
  };
}
