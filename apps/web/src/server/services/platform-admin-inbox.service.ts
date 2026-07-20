import type { PrismaClient } from "@/generated/prisma";

import {
  normalizePlatformAdminPagination,
  type PlatformAdminPaginationInput,
} from "@/server/services/platform-admin.service";

export type AdminInboxKind = "learning" | "invoice" | "cognitive" | "usage" | "payment";

export type AdminInboxItem = {
  id: string;
  kind: AdminInboxKind;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  createdAt: string | null;
  hrefHash: string;
  meta?: Record<string, string | number | null>;
};

export type AdminInboxResult = {
  items: AdminInboxItem[];
  pagination: { page: number; pageSize: number; total: number };
  counts: Record<AdminInboxKind, number>;
};

function daysSince(value: Date | string | null | undefined) {
  if (!value) return 0;
  const ts = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (Number.isNaN(ts)) return 0;
  return Math.max(0, Math.floor((Date.now() - ts) / (24 * 60 * 60 * 1000)));
}

/**
 * 统一待办 Inbox：学习 / 草稿发票 / 低置信认知 / 用量异常信号（角标与列表同源计数）。
 */
export async function getPlatformAdminInbox(
  prisma: PrismaClient,
  options?: {
    kind?: AdminInboxKind | "all";
    pagination?: PlatformAdminPaginationInput;
  },
): Promise<AdminInboxResult> {
  const pagination = normalizePlatformAdminPagination(options?.pagination);
  const kind = options?.kind ?? "all";
  const businessWindowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [pendingLearning, draftInvoices, cognitiveSessions, usageAnomalyHint] = await Promise.all([
    prisma.learningRecord.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 80,
      select: {
        id: true,
        title: true,
        summary: true,
        createdAt: true,
        decisionId: true,
      },
    }),
    prisma.invoice.findMany({
      where: { status: "draft" },
      orderBy: { createdAt: "desc" },
      take: 80,
      select: {
        id: true,
        invoiceNo: true,
        total: true,
        currency: true,
        createdAt: true,
      },
    }),
    prisma.cognitiveSession.findMany({
      orderBy: { createdAt: "desc" },
      take: 60,
      select: {
        id: true,
        createdAt: true,
        decisionId: true,
        projectId: true,
        source: true,
      },
    }),
    (async () => {
      try {
        return await prisma.usageRecord.count({
          where: {
            occurredAt: { gte: businessWindowStart },
            OR: [{ provider: null }, { model: null }],
          },
        });
      } catch {
        return 0;
      }
    })(),
  ]);

  const sessionIds = cognitiveSessions.map((s) => s.id);
  const [confidenceRows, evidenceRows] = await Promise.all([
    sessionIds.length === 0
      ? Promise.resolve([])
      : prisma.confidenceModel.findMany({
          where: { sessionId: { in: sessionIds } },
          select: { sessionId: true, overall: true },
        }),
    sessionIds.length === 0
      ? Promise.resolve([])
      : prisma.evidenceReference.groupBy({
          by: ["sessionId"],
          where: { sessionId: { in: sessionIds } },
          _count: { _all: true },
        }),
  ]);
  const confidenceMap = new Map(confidenceRows.map((r) => [r.sessionId, r.overall] as const));
  const evidenceMap = new Map(evidenceRows.map((r) => [r.sessionId, r._count._all] as const));

  const learningItems: AdminInboxItem[] = pendingLearning.map((row) => {
    const aging = daysSince(row.createdAt);
    return {
      id: `learning:${row.id}`,
      kind: "learning",
      title: row.title || "待审学习记录",
      description: row.summary?.slice(0, 120) || "等待平台复核后写入学习燃料",
      priority: aging >= 3 ? "high" : aging >= 1 ? "medium" : "low",
      createdAt: row.createdAt?.toISOString?.() ?? null,
      hrefHash: row.id,
      meta: { decisionId: row.decisionId, agingDays: aging },
    };
  });

  const invoiceItems: AdminInboxItem[] = draftInvoices.map((row) => ({
    id: `invoice:${row.id}`,
    kind: "invoice",
    title: `草稿发票 ${row.invoiceNo}`,
    description: "开票确认闭环待建，当前仅只读巡检",
    priority: "medium",
    createdAt: row.createdAt?.toISOString?.() ?? null,
    hrefHash: "business-invoices",
    meta: { total: String(row.total), currency: row.currency },
  }));

  const cognitiveItems: AdminInboxItem[] = cognitiveSessions
    .filter((session) => {
      const overall = confidenceMap.get(session.id);
      const evidence = evidenceMap.get(session.id) ?? 0;
      return (typeof overall === "number" && overall < 0.6) || evidence === 0;
    })
    .map((session) => {
      const overall = confidenceMap.get(session.id);
      const evidence = evidenceMap.get(session.id) ?? 0;
      const low = typeof overall === "number" && overall < 0.6;
      return {
        id: `cognitive:${session.id}`,
        kind: "cognitive" as const,
        title: `认知会话 ${session.id.slice(0, 10)}…`,
        description: low
          ? `低置信 ${Math.round((overall ?? 0) * 100)}% · 证据 ${evidence}`
          : `缺证据 · 来源 ${session.source}`,
        priority: low ? ("high" as const) : ("medium" as const),
        createdAt: session.createdAt?.toISOString?.() ?? null,
        hrefHash: session.id,
        meta: {
          decisionId: session.decisionId,
          projectId: session.projectId,
          overall: overall ?? null,
          evidenceCount: evidence,
        },
      };
    });

  const usageItems: AdminInboxItem[] =
    usageAnomalyHint > 0
      ? [
          {
            id: "usage:metadata-gap",
            kind: "usage",
            title: "第三方耗用元数据缺口",
            description: `近 30 天约 ${usageAnomalyHint} 条记录缺 Provider/Model，需下钻排查`,
            priority: usageAnomalyHint > 20 ? "high" : "medium",
            createdAt: new Date().toISOString(),
            hrefHash: "business-usage-anomalies",
            meta: { count: usageAnomalyHint },
          },
        ]
      : [];

  const all = [...learningItems, ...invoiceItems, ...cognitiveItems, ...usageItems].sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2 } as const;
    if (rank[a.priority] !== rank[b.priority]) return rank[a.priority] - rank[b.priority];
    return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
  });

  const filtered = kind === "all" ? all : all.filter((item) => item.kind === kind);
  const total = filtered.length;
  const items = filtered.slice(pagination.skip, pagination.skip + pagination.pageSize);

  return {
    items,
    pagination: {
      page: pagination.page,
      pageSize: pagination.pageSize,
      total,
    },
    counts: {
      learning: learningItems.length,
      invoice: invoiceItems.length,
      cognitive: cognitiveItems.length,
      usage: usageItems.length,
      payment: 0,
    },
  };
}

export type CognitiveTraceRow = {
  id: string;
  type: string;
  sourceType: string;
  sourceId: string | null;
  sequence: number;
  confidence: number | null;
  weight: number | null;
  createdAt: string | null;
  inputPreview: string | null;
  outputPreview: string | null;
};

export async function getCognitiveSessionTraces(
  prisma: PrismaClient,
  sessionId: string,
  limit = 40,
): Promise<{
  sessionId: string;
  traces: CognitiveTraceRow[];
  evidenceCount: number;
}> {
  const [traces, evidenceCount] = await Promise.all([
    prisma.cognitiveTrace.findMany({
      where: { sessionId },
      orderBy: { sequence: "asc" },
      take: Math.min(80, Math.max(1, limit)),
      select: {
        id: true,
        type: true,
        sourceType: true,
        sourceId: true,
        sequence: true,
        confidence: true,
        weight: true,
        createdAt: true,
        input: true,
        output: true,
      },
    }),
    prisma.evidenceReference.count({ where: { sessionId } }),
  ]);

  return {
    sessionId,
    evidenceCount,
    traces: traces.map((trace) => ({
      id: trace.id,
      type: trace.type,
      sourceType: trace.sourceType,
      sourceId: trace.sourceId,
      sequence: trace.sequence,
      confidence: trace.confidence,
      weight: trace.weight,
      createdAt: trace.createdAt?.toISOString?.() ?? null,
      inputPreview: trace.input ? String(trace.input).slice(0, 160) : null,
      outputPreview: trace.output ? String(trace.output).slice(0, 160) : null,
    })),
  };
}
