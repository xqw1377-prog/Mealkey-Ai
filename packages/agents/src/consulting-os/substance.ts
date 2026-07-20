/**
 * 决策级咨询资产 — 反「玩具感」硬门槛
 *
 * 顶级顾问公司交付必须同时满足：
 * 1. 本轮只回答一个治理问题（Governing Question）
 * 2. 顾问策互斥（不能同时为真）
 * 3. 明确取舍（得到什么 / 放弃什么）
 * 4. 否决条件（什么情况下认错停手）
 * 5. 本周可执行动作（周一就能开工）
 * 6. 证据链（依据什么说的，不是口号）
 */
import { buildConflictSummary } from "./meeting";
import {
  nowIso,
  type AdvisorPersona,
  type AdvisorStrategyCard,
  type AdvisorStrategySet,
  type ConsultingAgentKind,
  type DecisionArtifact,
  type ResearchPack,
  type WarRoomConsensus,
} from "./types";

export type { DecisionArtifact };

const GOVERNING_QUESTION: Record<ConsultingAgentKind, (a: Record<string, string>) => string> = {
  "m-mkt": (a) =>
    `在「${a.city || "目标城市"} · ${a.category || "目标品类"}」下，我们是否进入、以及用哪一种进入方式？`,
  "m-biz": (a) =>
    `未来 90 天，商业模式主航道到底押「${a.priority || "利润/增长/品牌之一"}」，还是继续三线并行？`,
  "m-ed": (a) =>
    `针对「${a.topic || "股权议题"}」，控制权、融资与激励三者，哪一条必须先锁死？`,
};

/** 调研必须带「所以呢」与本轮唯一问题，否则仍是信息堆 */
export function enrichResearchForDecision(
  pack: ResearchPack,
  answers: Record<string, string>,
  agentId: ConsultingAgentKind,
): ResearchPack {
  const question = GOVERNING_QUESTION[agentId](answers);
  const implication =
    agentId === "m-mkt"
      ? `若切口不清就进入，会被连锁与低价馆两头挤压；若切口过窄且无法证明复购，则应止损换切口。约束：${answers.constraint || "资源有限"}。`
      : agentId === "m-biz"
        ? `若 90 天不冻结主航道「${answers.priority || "先一件事"}」，「${answers.pain || "模式痛点"}」会继续消耗现金与注意力。`
        : `若先融资后补协议，或先分股后补退出机制，后续争议成本会指数上升。底线：${answers.control || "创始人可拍板"}。`;

  const withoutDup = pack.sections.filter(
    (s) => s.title !== "本轮唯一问题" && s.title !== "所以呢（决策含义）",
  );

  return {
    ...pack,
    sections: [
      { title: "本轮唯一问题", body: question },
      ...withoutDup,
      { title: "所以呢（决策含义）", body: implication },
    ],
    risks: Array.from(
      new Set([
        ...pack.risks,
        agentId === "m-mkt"
          ? "没有杀出线的进入 = 烧钱试错"
          : agentId === "m-biz"
            ? "没有北极星的模式讨论 = 会议空转"
            : "没有否决条款的股权安排 = 定时炸弹",
      ]),
    ).slice(0, 5),
  };
}

/**
 * 强制互斥：每策必须否定至少一条相邻策。
 * 顾问公司价值来自取舍，不是三份「都挺好」的文案。
 */
export function enforceAdvisorTradeoffs(
  set: AdvisorStrategySet,
  personas: AdvisorPersona[],
): AdvisorStrategySet {
  const nameOf = (id: string) =>
    personas.find((p) => p.id === id)?.name || id;

  const strategies = set.strategies.map((card, index, arr) => {
    const rival = arr[(index + 1) % arr.length]!;
    const rivalName = nameOf(rival.advisorId);
    const hardenedDoNotDo = card.doNotDo.includes(rival.oneLiner.slice(0, 12))
      ? card.doNotDo
      : `${card.doNotDo}；明确反对把「${rival.oneLiner}」当作同期主航道`;

    const hardenedRisk =
      card.risk.includes("互斥") || card.risk.includes("若同时")
        ? card.risk
        : `${card.risk}。若同时采纳${rivalName}主策，本策会失效。`;

    return {
      ...card,
      doNotDo: hardenedDoNotDo,
      risk: hardenedRisk,
      differentiation: card.differentiation.includes("取舍")
        ? card.differentiation
        : `${card.differentiation}（与${rivalName}互斥：不能两手都要）`,
    } satisfies AdvisorStrategyCard;
  });

  return {
    ...set,
    strategies,
    conflictSummary: `${buildConflictSummary(strategies, nameOf)} 这些策不能同时为真——选一条当主航道，其余降为约束或后置。`,
  };
}

export function buildDecisionArtifact(input: {
  agentId: ConsultingAgentKind;
  answers: Record<string, string>;
  research?: ResearchPack;
  advisors?: AdvisorStrategySet;
  warRoom: WarRoomConsensus;
  projectName?: string;
}): DecisionArtifact {
  const { agentId, answers, research, advisors, warRoom } = input;
  const primary =
    warRoom.userPreference && warRoom.userPreference !== "blend"
      ? advisors?.strategies.find((s) => s.advisorId === warRoom.userPreference)
      : advisors?.strategies[0];
  const recommendation =
    warRoom.consensusOneLiner || primary?.oneLiner || "（待确认）";

  const rejected =
    advisors?.strategies
      .filter((s) => s.advisorId !== primary?.advisorId)
      .slice(0, 2)
      .map((s) => s.oneLiner) || [];

  const tradeoffAccepted =
    rejected.length > 0
      ? `接受「${recommendation}」；暂时不把「${rejected.join(" / ")}」当同期主航道`
      : warRoom.blendNote || "接受会议冻结方向，放弃三线并行";

  const evidenceUsed = [
    research?.headline,
    ...(research?.sources || []).slice(0, 3),
    ...(research?.sections || [])
      .filter((s) => s.title === "本轮唯一问题" || s.title === "所以呢（决策含义）")
      .map((s) => s.body),
    ...(research?.risks || []).slice(0, 2),
    primary?.proof,
  ].filter((x): x is string => Boolean(x?.trim()));

  // L5：否决/本周动作优先取自席位方案卡，禁止三句罐头模板冒充交付
  const entry = primary?.entryScheme;
  const mode = primary?.modeScheme;
  const govern = primary?.governScheme;

  const schemeKill = [
    entry?.killLine,
    mode?.killLine,
    govern?.killLine,
    primary?.risk ? `主策风险触发：${primary.risk}` : undefined,
  ].filter((x): x is string => Boolean(x?.trim()));

  const schemeMonday = [
    entry?.weekProof,
    ...(entry?.marketingMoves || []).slice(0, 2),
    mode?.weekProof,
    ...(mode?.operatingMoves || []).slice(0, 2),
    govern?.weekProof,
    ...(govern?.nextMoves || []).slice(0, 2),
    primary?.proof ? `本周证明：${primary.proof}` : undefined,
  ].filter((x): x is string => Boolean(x?.trim()));

  const fallbackKill =
    agentId === "m-mkt"
      ? [
          entry?.killLine ||
            "试点 8 周内主推场景复购无提升 → 换切口或止损",
          `约束「${answers.constraint || "资源"}」被突破且无回报 → 停`,
        ]
      : agentId === "m-biz"
        ? [
            mode?.killLine ||
              "北极星指标连续 4 周无改善 → 回委员会改航道",
            "主推品无法证明模式（占比/复购）→ 砍菜单宽度重做",
          ]
        : [
            govern?.killLine ||
              "关键协议 30 天仍未落签 → 冻结融资/扩伙动作",
            `控制权底线「${answers.control || "创始人可拍板"}」被突破 → 否决本轮`,
          ];

  const fallbackMonday =
    agentId === "m-mkt"
      ? [
          entry?.weekProof ||
            `写一页进入作战卡：${answers.city || "目标城市"}/${entry?.sceneCut || "场景"}/${(entry?.menuPilot || []).slice(0, 1).join("") || "主推品"}`,
          "选定唯一试点店，贴出本周主推与杀出线数字",
        ]
      : agentId === "m-biz"
        ? [
            mode?.weekProof ||
              `全员对齐北极星：「${mode?.northStar || answers.priority || recommendation}」`,
            "拉出毛利·人效·主推品三张表，周五只复盘主轴",
          ]
        : [
            govern?.weekProof ||
              `列出必须落签：${(govern?.mustSign || ["章程", "股东协议"]).slice(0, 3).join("/")}`,
            `书面确认控制权底线：${answers.control || govern?.lockFirst || "创始人可拍板"}`,
          ];

  const killCriteria = Array.from(
    new Set([...schemeKill, ...fallbackKill]),
  ).slice(0, 4);
  const mondayMoves = Array.from(
    new Set([
      ...schemeMonday,
      ...fallbackMonday,
      // 厚度底线：至少 3 条可执行本周动作（对齐 SUBSTANCE_BAR）
      "本周五复盘证明点，未达标则按否决条件停手",
    ]),
  ).slice(0, 4);
  if (mondayMoves.length < 3) {
    mondayMoves.push(
      "补齐第三项本周动作：选定负责人与截止日",
      "同步店长/合伙人，确认只推一条主航道",
    );
  }

  const whatWeWontDo = [
    primary?.doNotDo || "不做没有证明点的扩张",
    ...(rejected.slice(0, 1).map((r) => `本阶段不做：${r}`)),
  ];

  return {
    governingQuestion: GOVERNING_QUESTION[agentId](answers),
    recommendation,
    tradeoffAccepted,
    whyThis: [
      ...(warRoom.consensusBullets || []).slice(0, 2),
      primary?.rationale || "会议拍板形成主策",
      research?.sections.find((s) => s.title === "所以呢（决策含义）")?.body ||
        research?.headline ||
        "调研结论支持该方向",
    ].filter(Boolean).slice(0, 4),
    killCriteria,
    mondayMoves,
    evidenceUsed: evidenceUsed.slice(0, 6),
    whatWeWontDo: whatWeWontDo.slice(0, 3),
    builtAt: nowIso(),
  };
}

/** 决策级报告：不是作文，是可签字决策包 */
export function buildDecisionGradeMarkdown(input: {
  reportTitle: string;
  committeeName: string;
  projectName?: string;
  city?: string;
  decision: DecisionArtifact;
  research?: ResearchPack;
  advisors?: AdvisorStrategySet;
  warRoom?: WarRoomConsensus;
  advisorName: (id: string) => string;
}): string {
  const d = input.decision;
  const lines: string[] = [
    `# ${input.reportTitle}`,
    ``,
    `> ${input.projectName || "项目"} · ${input.city || "—"}`,
    `> ${input.committeeName} · 决策包（非宣传稿）`,
    `> 状态：待创始人确认`,
    ``,
    `## 0. 本轮唯一问题`,
    ``,
    d.governingQuestion,
    ``,
    `## 1. 建议（一句话）`,
    ``,
    `**${d.recommendation}**`,
    ``,
    `### 取舍（必须写清）`,
    ``,
    d.tradeoffAccepted,
    ``,
    `### 为什么是这个（不是口号）`,
    ``,
    ...d.whyThis.map((w) => `- ${w}`),
    ``,
    `### 明确不做`,
    ``,
    ...d.whatWeWontDo.map((w) => `- ${w}`),
    ``,
    `## 2. 否决条件（认错停手线）`,
    ``,
    ...d.killCriteria.map((k, i) => `${i + 1}. ${k}`),
    ``,
    `## 3. 本周动作（周一就能开工）`,
    ``,
    ...d.mondayMoves.map((m, i) => `${i + 1}. ${m}`),
    ``,
    `## 4. 证据链`,
    ``,
    ...d.evidenceUsed.map((e) => `- ${e}`),
    ``,
  ];

  if (input.research) {
    lines.push(
      `## 5. 调研摘要`,
      ``,
      input.research.headline,
      ``,
      ...input.research.sections.map((s) => `- **${s.title}**：${s.body}`),
      ``,
    );
  }

  if (input.advisors?.strategies.length) {
    lines.push(`## 6. 顾问原策（互斥对照）`, ``);
    lines.push(
      `| 席位 | 主策 | 证明 | 不做 |`,
      `| --- | --- | --- | --- |`,
      ...input.advisors.strategies.map(
        (s) =>
          `| ${input.advisorName(s.advisorId)} | ${s.oneLiner} | ${s.proof} | ${s.doNotDo} |`,
      ),
      ``,
    );
    for (const s of input.advisors.strategies) {
      lines.push(
        `### ${input.advisorName(s.advisorId)}`,
        `- 主策：${s.oneLiner}`,
        `- 证明：${s.proof}`,
        `- 不做：${s.doNotDo}`,
        `- 风险：${s.risk}`,
        ``,
      );
    }
  }

  if (input.warRoom?.decisionCard) {
    const card = input.warRoom.decisionCard;
    lines.push(
      `## 6.5 会议室决策卡（拍板依据）`,
      ``,
      `**${card.title}** — ${card.question}`,
      ``,
      ...card.options.map(
        (o) =>
          `- **${o.seatName}**：${o.oneLiner}｜牺牲：${o.sacrifice}`,
      ),
      ``,
    );
  }

  lines.push(
    `## 7. 确认声明`,
    ``,
    `本人确认：以上建议、取舍、否决条件与本周动作，作为当前阶段决策依据；未达否决条件前按此执行，触发否决条件则停手重开委员会。`,
    ``,
    `*MealKey ${input.committeeName}*`,
    ``,
  );

  return lines.join("\n");
}

/** 把决策包的本周动作写进路线图第一里程碑 */
export function injectMondayMovesIntoRoadmap<
  T extends {
    milestones: Array<{ weekStart: number; actions: string[]; title: string }>;
    positioningOneLiner: string;
  },
>(roadmap: T, decision: DecisionArtifact): T {
  if (!roadmap.milestones.length) return roadmap;
  const [first, ...rest] = roadmap.milestones;
  return {
    ...roadmap,
    positioningOneLiner: decision.recommendation,
    milestones: [
      {
        ...first!,
        title: first!.weekStart <= 2 ? "本周决策落地" : first!.title,
        actions: Array.from(
          new Set([...decision.mondayMoves, ...first!.actions]),
        ).slice(0, 5),
      },
      ...rest,
    ],
  };
}
