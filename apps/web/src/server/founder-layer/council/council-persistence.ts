/**
 * 七常委持久化层 — Council Decision Memory + Track Record 写库
 *
 * 职责：
 * 1. 每次会议完成时持久化 Decision Memory（写 Memory 表）
 * 2. 每次常委投票时记录战迹（写 Memory 表 + Decision 表）
 * 3. 验证结果回写（更新 DecisionMemory.outcome）
 * 4. 加载历史战迹注入校准提示
 */

import type { PrismaClient } from "@/generated/prisma";
import { saveMemory, createDecision } from "@/server/services/agent-os.service";
import type {
  CouncilMeetingSession,
  CouncilOpinion,
  CouncilRoleId,
  DecisionMemory,
  DecisionResolution,
} from "@mealkey/agents/founder-os";

function buildId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : `${Date.now().toString(36)}`;
  return `${prefix}-${rand}`;
}

function clip(text: string, max = 500): string {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

// ─── 1. 持久化 Decision Memory ───

export async function persistCouncilMemory(
  prisma: PrismaClient,
  ownerId: string,
  projectId: string,
  session: CouncilMeetingSession,
): Promise<string> {
  if (!session.memory) return "";

  const memory = session.memory;
  const memoryKey = `council_memory_${session.casePacket.caseId}_${memory.memoryId}`;

  await saveMemory(prisma, ownerId, {
    key: memoryKey,
    content: JSON.stringify({
      memoryId: memory.memoryId,
      caseId: memory.caseId,
      briefId: memory.briefId,
      decision: memory.decision,
      rationale: memory.rationale,
      objections: memory.objections,
      resolutionSnapshot: memory.resolutionSnapshot,
      founderOverride: memory.founderOverride,
      outcome: memory.outcome,
      createdAt: memory.createdAt,
      closedAt: memory.closedAt,
      // 扩展：完整 session 快照（用于复盘）
      sessionSnapshot: {
        topic: session.agenda.topic,
        level: session.agenda.level,
        decisionType: session.casePacket.decisionType,
        roster: session.roster,
        phase: session.phase,
        board: session.board
          ? {
              recommendedAction: session.board.recommendedAction,
              biggestDispute: session.board.biggestDispute,
              consensus: session.board.consensus,
              minorityReport: session.board.minorityReport,
            }
          : null,
      },
      // 4+1：Decision Trace（Insight → 常委 → 决议）
      decisionTrace: session.decisionTrace || null,
      insightSummary: (session.insights || []).slice(0, 12).map((i) => ({
        id: i.id,
        sourceAgent: i.sourceAgent,
        domain: i.domain,
        finding: clip(i.finding, 160),
        confidence: i.confidence,
      })),
    }),
    type: "DECISION",
    source: "council",
    importance: 95,
    projectId,
  });

  return memoryKey;
}

// ─── 2. 持久化常委战迹 ───

export interface CouncilTrackRecordEntry {
  caseId: string;
  topic: string;
  member: CouncilRoleId;
  position: "support" | "oppose" | "conditional";
  confidence: number;
  judgment: string;
  top_risk: string;
  veto: boolean;
  prediction?: {
    best_case?: string;
    base_case?: string;
    worst_case?: string;
    kill_metric?: string;
  };
}

export async function persistCouncilTrackRecord(
  prisma: PrismaClient,
  ownerId: string,
  projectId: string,
  entries: CouncilTrackRecordEntry[],
): Promise<number> {
  let saved = 0;
  for (const entry of entries) {
    const key = `council_track_${entry.member}_${entry.caseId}_${buildId("tr").slice(0, 12)}`;
    await saveMemory(prisma, ownerId, {
      key,
      content: JSON.stringify({
        caseId: entry.caseId,
        topic: entry.topic,
        member: entry.member,
        position: entry.position,
        confidence: entry.confidence,
        judgment: clip(entry.judgment, 200),
        top_risk: entry.top_risk,
        veto: entry.veto,
        prediction: entry.prediction,
        createdAt: new Date().toISOString(),
      }),
      type: "DECISION",
      source: `council:${entry.member}`,
      importance: 88,
      projectId,
    });
    saved++;
  }
  return saved;
}

// ─── 3. 加载历史战迹（用于校准提示） ───

export interface HistoricCouncilStats {
  member: CouncilRoleId;
  totalDecisions: number;
  supportRate: number;
  opposeRate: number;
  accuracy: number | null; // null = 尚无验证结果
  recentJudgments: string[];
}

export async function loadCouncilMemberHistory(
  prisma: PrismaClient,
  ownerId: string,
  member: CouncilRoleId,
): Promise<HistoricCouncilStats> {
  const memories = await prisma.memory.findMany({
    where: {
      ownerId,
      key: { startsWith: `council_track_${member}_` },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const totalDecisions = memories.length;
  let supportCount = 0;
  let opposeCount = 0;
  const recentJudgments: string[] = [];

  for (const m of memories) {
    try {
      const parsed = JSON.parse(m.content) as {
        position?: string;
        judgment?: string;
      };
      if (parsed.position === "support") supportCount++;
      else if (parsed.position === "oppose") opposeCount++;
      if (parsed.judgment) {
        recentJudgments.push(clip(parsed.judgment, 100));
      }
    } catch {
      // skip
    }
  }

  return {
    member,
    totalDecisions,
    supportRate: totalDecisions > 0 ? Math.round((supportCount / totalDecisions) * 100) : 0,
    opposeRate: totalDecisions > 0 ? Math.round((opposeCount / totalDecisions) * 100) : 0,
    accuracy: null, // 需要验证结果回写后才能计算
    recentJudgments: recentJudgments.slice(0, 5),
  };
}

// ─── 4. 验证结果回写 ───

export async function writeBackValidationResult(
  prisma: PrismaClient,
  ownerId: string,
  caseId: string,
  outcome: {
    whatHappened: string;
    result: "success" | "failure" | "mixed";
    whoWasRight: "founder" | "council" | "mixed" | "unknown";
    lesson?: string;
  },
): Promise<void> {
  // 找到对应的 council_memory
  const memories = await prisma.memory.findMany({
    where: {
      ownerId,
      key: { startsWith: `council_memory_${caseId}_` },
    },
    orderBy: { createdAt: "desc" },
    take: 1,
  });

  if (memories.length === 0) return;

  const memory = memories[0]!;
  let content: Record<string, unknown> = {};
  try {
    content = JSON.parse(memory.content) as Record<string, unknown>;
  } catch {
    content = {};
  }

  content.outcome = {
    whatHappened: outcome.whatHappened,
    result: outcome.result,
    whoWasRight: outcome.whoWasRight,
    lesson: outcome.lesson || "",
    updatedAt: new Date().toISOString(),
  };

  // 同时也更新到 Decision 表的 learning 字段
  if (content.briefId) {
    try {
      await prisma.decision.updateMany({
        where: {
          ownerId,
          id: String(content.briefId),
        },
        data: {
          learning: JSON.stringify({
            result: outcome.result,
            lesson: outcome.lesson || "",
            whoWasRight: outcome.whoWasRight,
          }),
        },
      });
    } catch {
      // non-blocking
    }
  }

  // 更新 Memory
  await prisma.memory.update({
    where: { id: memory.id },
    data: {
      content: JSON.stringify(content),
      updatedAt: new Date(),
    },
  });
}

// ─── 5. 将 session 中的 opinions 转为战迹条目 ───

export function opinionsToTrackEntries(
  caseId: string,
  topic: string,
  opinions: CouncilOpinion[],
): CouncilTrackRecordEntry[] {
  return opinions.map((op) => ({
    caseId,
    topic: clip(topic, 80),
    member: op.member,
    position: op.position,
    confidence: op.confidence,
    judgment: op.judgment || op.summary,
    top_risk: op.top_risk || "",
    veto: op.veto,
    prediction: op.prediction,
  }));
}

// ─── 6. 检查历史相似决策（用于 Round1 注入） ───

export async function loadSimilarCouncilDecisions(
  prisma: PrismaClient,
  ownerId: string,
  topic: string,
): Promise<Array<{ topic: string; decision: string; result?: string }>> {
  const keywords = topic
    .split(/[\s，。、：；]/)
    .filter((k) => k.length >= 2)
    .slice(0, 5);

  const memories = await prisma.memory.findMany({
    where: {
      ownerId,
      key: { startsWith: "council_memory_" },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const similar: Array<{ topic: string; decision: string; result?: string }> = [];
  for (const m of memories) {
    try {
      const parsed = JSON.parse(m.content) as {
        sessionSnapshot?: { topic?: string };
        decision?: string;
        outcome?: { whatHappened?: string; result?: string };
      };
      const sessionTopic = parsed.sessionSnapshot?.topic || "";
      const matched = keywords.some((k) => sessionTopic.includes(k));
      if (matched) {
        similar.push({
          topic: clip(sessionTopic, 60),
          decision: parsed.decision || "",
          result: parsed.outcome?.result,
        });
      }
    } catch {
      // skip
    }
  }

  return similar.slice(0, 5);
}
