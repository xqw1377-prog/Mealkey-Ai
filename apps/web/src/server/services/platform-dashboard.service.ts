import type { PrismaClient } from "@/generated/prisma";

type PlatformWindowOptions = {
  hours?: number;
};

function getWindowStart(hours?: number) {
  const normalizedHours = Number.isFinite(hours) ? Math.max(1, Math.min(24 * 30, Number(hours))) : 24;
  return new Date(Date.now() - normalizedHours * 60 * 60 * 1000);
}

function round(value: number, digits = 2) {
  return Number(value.toFixed(digits));
}

async function countDecisionEvents(prisma: PrismaClient) {
  const delegate = (prisma as { decisionEvent?: { count: () => Promise<number> } }).decisionEvent;
  if (delegate) {
    return delegate.count();
  }

  const rows = (await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as count
    FROM "DecisionEvent"
  `)) as Array<{ count: number | string | bigint }>;

  const count = rows[0]?.count ?? 0;
  if (typeof count === "bigint") return Number(count);
  if (typeof count === "string") return Number(count);
  return count;
}

export async function getPlatformOverview(
  prisma: PrismaClient,
  options: PlatformWindowOptions = {},
) {
  const windowStart = getWindowStart(options.hours);

  const [events, usageRecords, traceFailures, totals, eventCounts] = await Promise.all([
    prisma.platformEvent.findMany({
      where: { occurredAt: { gte: windowStart } },
      orderBy: { occurredAt: "desc" },
      take: 50,
      select: {
        eventId: true,
        eventName: true,
        entityType: true,
        entityId: true,
        runId: true,
        traceId: true,
        producer: true,
        source: true,
        occurredAt: true,
      },
    }),
    prisma.usageRecord.findMany({
      where: { occurredAt: { gte: windowStart } },
      orderBy: { occurredAt: "desc" },
      take: 200,
      select: {
        usageType: true,
        provider: true,
        model: true,
        tokenInput: true,
        tokenOutput: true,
        tokenCached: true,
        tokenReasoning: true,
        tokenTotal: true,
        cost: true,
        currency: true,
        billable: true,
        occurredAt: true,
      },
    }),
    prisma.agentTrace.findMany({
      where: {
        createdAt: { gte: windowStart },
        status: "FAILED",
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        errorCode: true,
        name: true,
        source: true,
        latencyMs: true,
        createdAt: true,
      },
    }),
    Promise.all([
      prisma.platformEvent.count(),
      prisma.usageRecord.count(),
      prisma.agentTrace.count(),
      prisma.agentOutcome.count(),
      countDecisionEvents(prisma),
    ]),
    Promise.all([
      prisma.platformEvent.count({ where: { eventName: "run.started", occurredAt: { gte: windowStart } } }),
      prisma.platformEvent.count({ where: { eventName: "run.completed", occurredAt: { gte: windowStart } } }),
      prisma.platformEvent.count({ where: { eventName: "run.failed", occurredAt: { gte: windowStart } } }),
      prisma.platformEvent.count({ where: { eventName: "usage.recorded", occurredAt: { gte: windowStart } } }),
      prisma.platformEvent.count({ where: { eventName: "decision.created", occurredAt: { gte: windowStart } } }),
      prisma.platformEvent.count({ where: { eventName: "decision.accepted", occurredAt: { gte: windowStart } } }),
      prisma.platformEvent.count({ where: { eventName: "decision.rejected", occurredAt: { gte: windowStart } } }),
      prisma.platformEvent.count({ where: { eventName: "decision.executed", occurredAt: { gte: windowStart } } }),
    ]),
  ]);

  const [
    runStarted,
    runCompleted,
    runFailed,
    usageRecorded,
    decisionCreated,
    decisionAccepted,
    decisionRejected,
    decisionExecuted,
  ] = eventCounts;

  const completedPayloads = await prisma.platformEvent.findMany({
    where: {
      eventName: "run.completed",
      occurredAt: { gte: windowStart },
    },
    select: { payload: true },
    take: 200,
  });

  const averageLatencyMs =
    completedPayloads.length > 0
      ? round(
          completedPayloads.reduce((sum, item) => {
            try {
              const parsed = JSON.parse(item.payload) as { latencyMs?: number };
              return sum + (typeof parsed.latencyMs === "number" ? parsed.latencyMs : 0);
            } catch {
              return sum;
            }
          }, 0) / completedPayloads.length,
          0,
        )
      : null;

  const successBase = runCompleted + runFailed;
  const successRate = successBase > 0 ? round((runCompleted / successBase) * 100, 1) : null;

  const tokenTotals = usageRecords.reduce(
    (acc, item) => {
      acc.input += item.tokenInput;
      acc.output += item.tokenOutput;
      acc.cached += item.tokenCached;
      acc.reasoning += item.tokenReasoning;
      acc.total += item.tokenTotal;
      const parsedCost = Number(item.cost);
      if (Number.isFinite(parsedCost)) acc.cost += parsedCost;
      if (item.billable) acc.billableCount += 1;
      return acc;
    },
    { input: 0, output: 0, cached: 0, reasoning: 0, total: 0, cost: 0, billableCount: 0 },
  );

  const topErrorCodes = Array.from(
    traceFailures.reduce((map, item) => {
      const key = item.errorCode?.trim() || "UNKNOWN";
      map.set(key, (map.get(key) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([code, count]) => ({ code, count }));

  const [platformEventCount, usageRecordCount, traceCount, outcomeCount, decisionEventCount] = totals;
  const decisionAcceptanceRate =
    decisionCreated > 0 ? round((decisionAccepted / decisionCreated) * 100, 1) : null;
  const decisionRejectionRate =
    decisionCreated > 0 ? round((decisionRejected / decisionCreated) * 100, 1) : null;
  const decisionExecutionRate =
    decisionAccepted > 0 ? round((decisionExecuted / decisionAccepted) * 100, 1) : null;

  return {
    window: {
      hours: Number.isFinite(options.hours) ? Math.max(1, Math.min(24 * 30, Number(options.hours))) : 24,
      startAt: windowStart.toISOString(),
      endAt: new Date().toISOString(),
    },
    totals: {
      platformEvents: platformEventCount,
      usageRecords: usageRecordCount,
      traces: traceCount,
      outcomes: outcomeCount,
      decisionEvents: decisionEventCount,
    },
    runtime: {
      runsStarted: runStarted,
      runsCompleted: runCompleted,
      runsFailed: runFailed,
      successRate,
      averageLatencyMs,
      traceFailures: traceFailures.length,
      topErrorCodes,
    },
    usage: {
      recordedEvents: usageRecorded,
      tokenInput: tokenTotals.input,
      tokenOutput: tokenTotals.output,
      tokenCached: tokenTotals.cached,
      tokenReasoning: tokenTotals.reasoning,
      tokenTotal: tokenTotals.total,
      costTotal: round(tokenTotals.cost, 6),
      billableCount: tokenTotals.billableCount,
    },
    intelligence: {
      decisionCreated,
      decisionAccepted,
      decisionRejected,
      decisionExecuted,
      decisionAcceptanceRate,
      decisionRejectionRate,
      decisionExecutionRate,
    },
    recentEvents: events.slice(0, 20).map((event) => ({
      eventId: event.eventId,
      eventName: event.eventName,
      entityType: event.entityType,
      entityId: event.entityId,
      runId: event.runId,
      traceId: event.traceId,
      producer: event.producer,
      source: event.source,
      occurredAt: event.occurredAt.toISOString(),
    })),
  };
}
