import type { FounderDecision } from "../contracts/decision";
import type { FounderAgentName } from "../contracts/mission";
import type {
  ConflictCell,
  ConflictMatrix,
  ConflictMatrixPrimary,
  ConflictMatrixRow,
  DecisionTradeoff,
} from "../contracts/debate";

const TOPICS = [
  "扩张速度",
  "加盟",
  "直营复制",
  "品牌定位清晰度",
  "控制权安全",
  "单元经济",
] as const;

type Topic = (typeof TOPICS)[number];

function buildId(prefix: string) {
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}`;
  return `${prefix}-${rand}`;
}

function clip(text: string, max = 72): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function scoreCell(topic: Topic, decision: FounderDecision): ConflictCell {
  const text = `${decision.judgement} ${decision.risks.join(" ")} ${decision.nextSteps.join(" ")}`;
  const stance = decision.stance;

  const topicHit = (() => {
    switch (topic) {
      case "扩张速度":
        return /扩张|增长|开店|加速|窗口|节奏|规模/.test(text);
      case "加盟":
        return /加盟|特许|联营/.test(text);
      case "直营复制":
        return /直营|复制|标准化|SOP|单店/.test(text);
      case "品牌定位清晰度":
        return /定位|心智|品类|品牌|差异/.test(text);
      case "控制权安全":
        return /控制权|股权|稀释|治理|激励|融资/.test(text);
      case "单元经济":
        return /利润|回本|现金流|人效|坪效|模型|单元经济/.test(text);
      default:
        return false;
    }
  })();

  if (!topicHit && stance !== "support" && stance !== "oppose") return "0";

  const stronglyNegative = /不建议|暂缓|高风险|不能|禁止|反对|不足|未就绪|先别/.test(text);
  const negative = /谨慎|条件|风险|验证|先补|不宜|慢/.test(text) || stance === "oppose";
  const positive =
    /建议|支持|可以|推进|抓住|窗口|成立|可行/.test(text) || stance === "support";

  // 议题特化：加盟默认商业/品牌更谨慎
  if (topic === "加盟") {
    if (decision.sourceAgent === "M-BIZ" || decision.sourceAgent === "M-PNT") {
      if (stronglyNegative || negative) return "--";
      if (positive && !negative) return "+";
      return "-";
    }
    if (decision.sourceAgent === "M-MKT" && positive) return "+";
  }

  if (topic === "扩张速度") {
    if (decision.sourceAgent === "M-MKT" && positive) return "+";
    if (decision.sourceAgent === "M-BIZ" && (negative || stance === "conditional")) {
      return stronglyNegative ? "--" : "-";
    }
  }

  if (stronglyNegative) return "--";
  if (negative && !positive) return "-";
  if (positive && !negative) return "+";
  if (stance === "oppose") return "-";
  if (stance === "support") return "+";
  if (topicHit) return stance === "conditional" ? "-" : "0";
  return "0";
}

function evidenceIds(decision: FounderDecision): string[] {
  return decision.evidence.map((item) => item.evidenceId).filter((id): id is string => Boolean(id));
}

function polarityRank(cell: ConflictCell): number {
  if (cell === "+") return 2;
  if (cell === "0") return 0;
  if (cell === "-") return -1;
  return -2;
}

function buildPrimary(
  rows: ConflictMatrixRow[],
  decisions: FounderDecision[],
): ConflictMatrixPrimary | null {
  let best: { row: ConflictMatrixRow; spread: number } | null = null;
  for (const row of rows) {
    const values = Object.values(row.cells).filter((v): v is ConflictCell => Boolean(v));
    if (values.length < 2) continue;
    const max = Math.max(...values.map(polarityRank));
    const min = Math.min(...values.map(polarityRank));
    const spread = max - min;
    if (spread < 2) continue;
    if (!best || spread > best.spread) best = { row, spread };
  }
  if (!best) return null;

  const row = best.row;
  const sideAAgents = (Object.entries(row.cells) as Array<[FounderAgentName, ConflictCell]>)
    .filter(([, cell]) => cell === "+")
    .map(([agent]) => agent);
  const sideBAgents = (Object.entries(row.cells) as Array<[FounderAgentName, ConflictCell]>)
    .filter(([, cell]) => cell === "-" || cell === "--")
    .map(([agent]) => agent);

  if (sideAAgents.length === 0 || sideBAgents.length === 0) return null;

  const claimOf = (agents: FounderAgentName[]) =>
    agents
      .map((agent) => decisions.find((d) => d.sourceAgent === agent))
      .filter(Boolean)
      .map((d) => clip(d!.judgement, 40))
      .join("；") || "主张推进";

  const driving = [
    ...new Set(
      [...sideAAgents, ...sideBAgents].flatMap((agent) => {
        const d = decisions.find((item) => item.sourceAgent === agent);
        return d ? evidenceIds(d).slice(0, 2) : [];
      }),
    ),
  ].slice(0, 6);

  return {
    topic: row.topic,
    sideA: {
      agents: sideAAgents,
      claim: claimOf(sideAAgents),
      polarity: "+",
    },
    sideB: {
      agents: sideBAgents,
      claim: claimOf(sideBAgents),
      polarity: sideBAgents.some((a) => row.cells[a] === "--") ? "--" : "-",
    },
    drivingEvidenceIds: driving.length ? driving : row.drivingEvidenceIds,
    question: `在「${row.topic}」上，为什么你的判断比对方更重要？请指出对方证据缺口。`,
  };
}

function buildTradeoffs(
  primary: ConflictMatrixPrimary | null,
  decisions: FounderDecision[],
): DecisionTradeoff[] {
  if (!primary) {
    return [
      {
        keep: "先完成关键验证",
        giveUp: "一次性放大动作",
        why: "当前分歧不足以支持无条件推进",
      },
    ];
  }

  const validation =
    decisions.flatMap((d) => d.nextSteps).filter(Boolean)[0] || "完成验证任务后再放大";

  return [
    {
      keep: `${primary.sideA.claim || primary.topic + "窗口"}`,
      giveUp: "无条件加速",
      why: `保留机会感，但用验证对冲 ${primary.sideB.agents.join("/") } 的风险`,
    },
    {
      keep: validation,
      giveUp: primary.sideB.polarity === "--" ? "立刻加盟/扩张" : "跳过验证",
      why: `回应 ${primary.topic} 冲突：先证明可复制/可控，再谈速度`,
    },
  ];
}

/** 从四席决策生成冲突矩阵 */
export function buildConflictMatrix(input: {
  missionId: string;
  decisions: FounderDecision[];
}): ConflictMatrix {
  const rows: ConflictMatrixRow[] = TOPICS.flatMap((topic) => {
    const cells: Partial<Record<FounderAgentName, ConflictCell>> = {};
    const driving: string[] = [];
    for (const decision of input.decisions) {
      const cell = scoreCell(topic, decision);
      cells[decision.sourceAgent] = cell;
      if (cell !== "0") {
        driving.push(...evidenceIds(decision).slice(0, 1));
      }
    }
    const nonZero = Object.values(cells).filter((c) => c && c !== "0");
    if (nonZero.length === 0) return [];
    return [
      {
        topic,
        cells,
        drivingEvidenceIds: [...new Set(driving)].slice(0, 4),
        summary: `${topic}：${Object.entries(cells)
          .filter(([, c]) => c && c !== "0")
          .map(([a, c]) => `${a}${c}`)
          .join(" ")}`,
      } satisfies ConflictMatrixRow,
    ];
  });

  // 至少保留扩张速度行，避免空矩阵
  if (rows.length === 0 && input.decisions.length > 0) {
    const cells: Partial<Record<FounderAgentName, ConflictCell>> = {};
    for (const d of input.decisions) {
      cells[d.sourceAgent] =
        d.stance === "support" ? "+" : d.stance === "oppose" ? "--" : d.stance === "conditional" ? "-" : "0";
    }
    rows.push({
      topic: "扩张速度",
      cells,
      drivingEvidenceIds: input.decisions.flatMap(evidenceIds).slice(0, 4),
      summary: "综合行动节奏分歧",
    });
  }

  const primary = buildPrimary(rows, input.decisions);
  const tradeoffs = buildTradeoffs(primary, input.decisions);

  return {
    matrixId: buildId("CM"),
    missionId: input.missionId,
    rows: rows.slice(0, 5),
    primary,
    tradeoffs,
    createdAt: new Date().toISOString(),
  };
}

export type ChallengeStatementDraft = {
  agent: FounderAgentName;
  claim: string;
  reasons: string[];
  challengeTo: string;
  challengeEvidenceId?: string;
  evidenceIds: string[];
};

/** Round2：每席必须挑战对立面，并引用对方证据或缺口 */
export function buildChallengeStatements(input: {
  decisions: FounderDecision[];
  matrix: ConflictMatrix;
}): ChallengeStatementDraft[] {
  const primary = input.matrix.primary;
  const byAgent = new Map(input.decisions.map((d) => [d.sourceAgent, d]));

  return input.decisions.map((decision) => {
    const opponents = input.decisions.filter((other) => {
      if (other.sourceAgent === decision.sourceAgent) return false;
      if (!primary) {
        return (
          (decision.stance === "support" && other.stance === "oppose") ||
          (decision.stance === "oppose" && other.stance === "support") ||
          (decision.stance === "conditional" && other.stance === "support")
        );
      }
      const myCell = primary.sideA.agents.includes(decision.sourceAgent)
        ? "+"
        : primary.sideB.agents.includes(decision.sourceAgent)
          ? "-"
          : "0";
      const theirCell = primary.sideA.agents.includes(other.sourceAgent)
        ? "+"
        : primary.sideB.agents.includes(other.sourceAgent)
          ? "-"
          : "0";
      return myCell !== "0" && theirCell !== "0" && myCell !== theirCell;
    });

    const target =
      opponents[0] ||
      input.decisions.find((d) => d.sourceAgent !== decision.sourceAgent) ||
      decision;

    const targetEvidence = target.evidence.find((e) => e.evidenceId);
    const targetGap = target.evidenceGap?.[0] || target.assumptions?.[0];
    const myEvidence = decision.evidence.find((e) => e.evidenceId);

    const challengeClaim = primary
      ? `就「${primary.topic}」：我坚持比 ${target.sourceAgent} 更关键`
      : `我要挑战 ${target.sourceAgent} 的节奏判断`;

    const reasonCore = targetEvidence?.evidenceId
      ? `你的 ${targetEvidence.evidenceId}（${clip(targetEvidence.content, 36)}）不足以压过我的判断`
      : targetGap
        ? `你仍缺关键事实：${clip(targetGap, 40)}`
        : `你的结论「${clip(target.judgement, 36)}」证据链不完整`;

    const whyMine = myEvidence?.evidenceId
      ? `因为 ${myEvidence.evidenceId} 说明：${clip(myEvidence.content, 40)}`
      : `因为 ${clip(decision.judgement, 40)}`;

    return {
      agent: decision.sourceAgent,
      claim: clip(challengeClaim, 64),
      reasons: [reasonCore, whyMine, primary?.question || "请说明为何你的优先级更高"].slice(0, 3),
      challengeTo: `founder.${target.sourceAgent}`,
      challengeEvidenceId: targetEvidence?.evidenceId,
      evidenceIds: evidenceIds(decision).slice(0, 3),
    };
  });
}

export function conflictMatrixToMeetingConflict(
  matrix: ConflictMatrix,
): {
  conflictId: string;
  missionId: string;
  dimension: string;
  summary: string;
  agents: FounderAgentName[];
  sideA: string;
  sideB: string;
  severity: "low" | "medium" | "high";
} | null {
  if (!matrix.primary) return null;
  const p = matrix.primary;
  return {
    conflictId: buildId("conflict"),
    missionId: matrix.missionId,
    dimension: p.topic,
    summary: `${p.topic}冲突：${p.sideA.claim} vs ${p.sideB.claim}`,
    agents: [...new Set([...p.sideA.agents, ...p.sideB.agents])],
    sideA: clip(`${p.sideA.agents.join("/")}：${p.sideA.claim}`, 100),
    sideB: clip(`${p.sideB.agents.join("/")}：${p.sideB.claim}`, 100),
    severity: p.sideB.polarity === "--" ? "high" : "medium",
  };
}
