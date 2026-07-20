/**
 * 七常委裁决 → 行动档案载荷辅助
 * 把 MKInsight / DecisionTrace / 常委意见压成 confirmFromMeeting 可消费字段
 */

import type { CouncilMeetingSession } from "./meeting-engine";
import type { MKInsight } from "./mk-insight";
import type { CouncilOpinion, ExpertEngineId } from "./types";

export type ArchiveExpertOpinion = {
  expert: ExpertEngineId;
  position: "support" | "oppose" | "neutral";
  reason: string;
  confidence: number;
};

const ENGINE_IDS: ExpertEngineId[] = ["M-PNT", "M-MKT", "M-BIZ", "M-ED"];

function clip(text: string, max: number): string {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function mapCouncilPosition(
  position: CouncilOpinion["position"],
): ArchiveExpertOpinion["position"] {
  if (position === "support") return "support";
  if (position === "oppose") return "oppose";
  return "neutral";
}

/** 从 Insight 按引擎各取一条代表意见（供 DecisionOpinion 种子） */
export function insightsToExpertOpinions(
  insights: MKInsight[],
): ArchiveExpertOpinion[] {
  const out: ArchiveExpertOpinion[] = [];
  for (const engine of ENGINE_IDS) {
    const hit = insights.find((i) => i.sourceAgent === engine);
    if (!hit) continue;
    const position: ArchiveExpertOpinion["position"] =
      hit.confidence >= 0.72
        ? "support"
        : hit.confidence < 0.5
          ? "oppose"
          : "neutral";
    out.push({
      expert: engine,
      position,
      reason: clip(hit.finding, 400),
      confidence: hit.confidence,
    });
  }
  return out.slice(0, 8);
}

/** 常委意见也可映射为「视角摘要」附加在 observation（非四席 expert） */
export function summarizeCouncilOpinions(opinions: CouncilOpinion[]): string {
  return opinions
    .slice(0, 7)
    .map(
      (o) =>
        `${o.member}:${o.position} ${(o.judgment || o.summary || "").slice(0, 40)}`,
    )
    .join("；");
}

export function buildCouncilArchiveExtras(session: CouncilMeetingSession): {
  observation: string;
  strategy: string;
  expertOpinions: ArchiveExpertOpinion[];
  decisionContract: Record<string, unknown>;
  parentEvidenceIds: string[];
} {
  const insights = session.insights || [];
  const board = session.board;
  const minority = board?.minorityReport?.slice(0, 3).join("；") || "";
  const councilLine = summarizeCouncilOpinions(session.opinions);
  const insightLine = insights
    .slice(0, 4)
    .map((i) => `[${i.sourceAgent}] ${clip(i.finding, 80)}`)
    .join("；");

  const observation = clip(
    [minority, councilLine ? `常委：${councilLine}` : "", insightLine ? `洞察：${insightLine}` : ""]
      .filter(Boolean)
      .join(" | "),
    2000,
  );

  const strategy = clip(
    [
      board?.supportBullets?.join("；") || "",
      insights.length
        ? `MKInsight×${insights.length} 已接入委员会`
        : "",
    ]
      .filter(Boolean)
      .join(" · "),
    2000,
  );

  const parentEvidenceIds = (session.evidencePacket?.items || [])
    .map((i) => i.evidenceId)
    .filter(Boolean)
    .slice(0, 24);

  const decisionContract: Record<string, unknown> = {
    source: "decision_council",
    caseId: session.casePacket.caseId,
    sessionId: session.sessionId,
    level: session.agenda.level,
    roster: session.roster,
    recommendedAction: board?.recommendedAction,
    decisionTrace: session.decisionTrace || null,
    insights: insights.slice(0, 16).map((i) => ({
      id: i.id,
      sourceAgent: i.sourceAgent,
      domain: i.domain,
      finding: clip(i.finding, 200),
      confidence: i.confidence,
      evidenceIds: i.evidence.map((e) => e.id).slice(0, 4),
    })),
  };

  return {
    observation: observation || "七常委决策室裁决",
    strategy: strategy || board?.recommendedAction || "按委员会建议推进",
    expertOpinions: insightsToExpertOpinions(insights),
    decisionContract,
    parentEvidenceIds,
  };
}
