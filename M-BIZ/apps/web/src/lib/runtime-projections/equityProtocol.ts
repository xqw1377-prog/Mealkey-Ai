import type {
  EquityCommitteeOpinion,
  EquityScenario,
  EquitySnapshot,
} from "@/lib/equity";

export type EquityProtocolContextField = {
  label: string;
  value: string;
};

export type EquityProtocolDecisionView = {
  problem: string;
  choice: string;
  reasoning: string[];
  tradeoff: string;
  validation: string;
};

export type EquityProtocolMemoryView = {
  founderMemory: string[];
  governanceMemory: string[];
  decisionMemory: string[];
};

export type EquityProtocolLedgerItem = {
  id: string;
  kind: "FACT" | "ASSUMPTION" | "HYPOTHESIS";
  title: string;
  statement: string;
  note: string;
};

export type EquityProtocolProjection = {
  founderContextView: {
    identity: string;
    background: string;
    goal: string;
    riskLabel: string;
    riskNote: string;
    decisionStyle: string;
  };
  equityContextView: EquityProtocolContextField[];
  decisionProtocolView: EquityProtocolDecisionView;
  memoryView: EquityProtocolMemoryView;
  equityLedger: EquityProtocolLedgerItem[];
};

export function inferFounderGovernanceGoal(text: string) {
  if (!text) return "先厘清治理边界，再决定怎么分配股权。";
  if (/融资|投资|募资/i.test(text)) return "在不失控的前提下，为后续融资留出空间。";
  if (/激励|期权|店长|合伙人/i.test(text)) return "搭出能吸引关键伙伴的激励结构。";
  if (/控制权|稀释|稳定|保住/i.test(text)) return "优先守住控制权和长期治理稳定。";
  return "在控制权、激励和融资之间找到可执行的平衡。";
}

export function inferEquityRiskProfile(text: string) {
  if (/融资|扩张|快速|加速|窗口/i.test(text)) {
    return {
      label: "进取型",
      note: "愿意为增长和融资空间承受一定结构波动。",
    };
  }
  if (/控制权|稳|保守|稳定|风险|底线/i.test(text)) {
    return {
      label: "稳健型",
      note: "优先确保控制权和治理秩序不被破坏。",
    };
  }

  return {
    label: "平衡型",
    note: "会同时看控制权、激励效率和融资空间。",
  };
}

export function buildFounderEquityContextView(input: {
  project: { name: string; category?: string | null; stage?: string | null };
  snapshot: EquitySnapshot | null;
  intake: { plan: string; concern: string; goal: string };
  scenarios: EquityScenario[];
}) {
  const text = [
    input.snapshot?.problem,
    input.snapshot?.oneLiner,
    input.snapshot?.strategy,
    input.snapshot?.action,
    input.snapshot?.pageOutput.finalDecision.judgement,
    input.intake.plan,
    input.intake.concern,
    input.intake.goal,
    input.scenarios[0]?.summary,
  ]
    .filter(Boolean)
    .join(" ");
  const risk = inferEquityRiskProfile(text);

  return {
    identity: `${input.project.name} 创始人`,
    background: input.project.category || "治理背景待补全",
    goal: inferFounderGovernanceGoal(text),
    riskLabel: risk.label,
    riskNote: risk.note,
    decisionStyle: input.snapshot ? "先守住治理边界，再落具体分配" : "先访谈，再进入治理扫描",
  };
}

export function buildEquityContextView(input: {
  project: { category?: string | null; stage?: string | null };
  snapshot: EquitySnapshot | null;
  pageOutput: EquitySnapshot["pageOutput"] | null;
}) {
  const founders = input.pageOutput?.profile.founders || [];
  const capTable = input.pageOutput?.profile.capTable || [];
  const coreHolder = capTable[0];

  return [
    { label: "项目阶段", value: input.project.stage || input.pageOutput?.stage || "待补充" },
    { label: "当前议题", value: input.pageOutput?.topic || input.snapshot?.problem || "待澄清" },
    { label: "核心持股", value: coreHolder ? `${coreHolder.label} ${coreHolder.equity}%` : "待建立结构画像" },
    { label: "团队结构", value: founders.length > 0 ? `${founders.length} 位核心成员已进入治理视图` : "待补充" },
    {
      label: "治理矛盾",
      value: input.pageOutput?.health.biggestRisk || input.snapshot?.diagnosis || "待形成主要风险判断",
    },
    {
      label: "协议层级",
      value: input.snapshot ? "Governance Mission 已启动" : "等待启动",
    },
  ];
}

export function buildEquityDecisionProtocolView(input: {
  snapshot: EquitySnapshot | null;
  scenarios: EquityScenario[];
}) {
  const decision = input.snapshot?.pageOutput.finalDecision;
  const primaryScenario = input.scenarios.find((item) => item.recommendation === "primary") || input.scenarios[0];
  const reasoning = [
    ...(decision?.reasoning || []),
    ...(primaryScenario?.highlights || []),
  ]
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index)
    .slice(0, 3);

  return {
    problem: input.snapshot?.problem || "当前治理问题仍在澄清中。",
    choice:
      decision?.judgement ||
      primaryScenario?.title ||
      input.snapshot?.strategy ||
      "先把股权主方案压成一个正式选择。",
    reasoning,
    tradeoff:
      decision?.risks[0] ||
      primaryScenario?.risks[0] ||
      input.snapshot?.pageOutput.health.biggestRisk ||
      "需要在控制权、激励效率和融资空间之间做取舍。",
    validation:
      decision?.actions[0] ||
      input.snapshot?.action ||
      "先确认核心边界，再把方案写成执行条款。",
  };
}

export function buildEquityMemoryView(input: {
  snapshot: EquitySnapshot | null;
  previous: EquitySnapshot | null;
  history: Array<{ judgement?: string | null; problem: string; createdAt: string | Date }>;
  reports: Array<{ title: string; summary?: string | null }>;
}) {
  const founderMemory = [
    inferEquityRiskProfile(
      [
        input.snapshot?.oneLiner,
        input.snapshot?.pageOutput.finalDecision.judgement,
        input.snapshot?.pageOutput.health.biggestRisk,
      ]
        .filter(Boolean)
        .join(" "),
    ).note,
    (input.snapshot?.pageOutput.health.control ?? 0) >= 75
      ? "当前阶段明显优先守住控制权。"
      : "当前阶段更强调结构弹性与后续空间。",
  ];

  const governanceMemory = [
    input.snapshot?.pageOutput.health.biggestRisk,
    input.previous?.oneLiner,
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
    governanceMemory,
    decisionMemory,
  };
}

export function buildEquityLedger(input: {
  snapshot: EquitySnapshot | null;
  scenarios: EquityScenario[];
  committee: EquityCommitteeOpinion[];
}) {
  const health = input.snapshot?.pageOutput.health;
  const capTable = input.snapshot?.pageOutput.profile.capTable || [];
  const primaryScenario = input.scenarios.find((item) => item.recommendation === "primary") || input.scenarios[0];

  return [
    health
      ? {
          id: "health-score",
          kind: (health.score >= 75 ? "FACT" : health.score >= 60 ? "ASSUMPTION" : "HYPOTHESIS") as EquityProtocolLedgerItem["kind"],
          title: "股权健康度",
          statement: `当前健康度 ${health.score}，最大风险是${health.biggestRisk}。`,
          note: `系统扫描 · 控制权 ${health.control} / 融资安全 ${health.fundingSafety}`,
        }
      : null,
    capTable[0]
      ? {
          id: "cap-table",
          kind: "FACT" as const,
          title: "现有结构",
          statement: `${capTable[0].label} 当前持股 ${capTable[0].equity}%${
            capTable[1] ? `，第二大权益项为 ${capTable[1].label} ${capTable[1].equity}%。` : "。"
          }`,
          note: "结构画像 · 当前 cap table",
        }
      : null,
    primaryScenario
      ? {
          id: `scenario-${primaryScenario.id}`,
          kind:
            primaryScenario.recommendation === "primary"
              ? ("ASSUMPTION" as const)
              : primaryScenario.recommendation === "reject"
                ? ("HYPOTHESIS" as const)
                : ("ASSUMPTION" as const),
          title: primaryScenario.title,
          statement: primaryScenario.summary,
          note: `方案推演 · ${primaryScenario.recommendation === "primary" ? "主推" : primaryScenario.recommendation === "reject" ? "暂缓" : "备选"}`,
        }
      : null,
    input.committee[0]
      ? {
          id: `committee-${input.committee[0].role}`,
          kind: "ASSUMPTION" as const,
          title: input.committee[0].role,
          statement: input.committee[0].opinion,
          note: `专家观点 · ${input.committee[0].concern || "等待继续压实"}`,
        }
      : null,
  ].filter((item): item is EquityProtocolLedgerItem => Boolean(item));
}

export function buildEquityProtocolProjection(input: {
  project: { name: string; category?: string | null; stage?: string | null };
  snapshot: EquitySnapshot | null;
  pageOutput: EquitySnapshot["pageOutput"] | null;
  previous: EquitySnapshot | null;
  intake: { plan: string; concern: string; goal: string };
  scenarios: EquityScenario[];
  history: Array<{ judgement?: string | null; problem: string; createdAt: string | Date }>;
  reports: Array<{ title: string; summary?: string | null }>;
  committee: EquityCommitteeOpinion[];
}): EquityProtocolProjection {
  return {
    founderContextView: buildFounderEquityContextView({
      project: input.project,
      snapshot: input.snapshot,
      intake: input.intake,
      scenarios: input.scenarios,
    }),
    equityContextView: buildEquityContextView({
      project: {
        category: input.project.category,
        stage: input.project.stage,
      },
      snapshot: input.snapshot,
      pageOutput: input.pageOutput,
    }),
    decisionProtocolView: buildEquityDecisionProtocolView({
      snapshot: input.snapshot,
      scenarios: input.scenarios,
    }),
    memoryView: buildEquityMemoryView({
      snapshot: input.snapshot,
      previous: input.previous,
      history: input.history,
      reports: input.reports,
    }),
    equityLedger: buildEquityLedger({
      snapshot: input.snapshot,
      scenarios: input.scenarios,
      committee: input.committee,
    }),
  };
}
