import type { Prisma, PrismaClient } from "@/generated/prisma";
import { stringifyJsonField } from "@/lib/prisma";
import { type PlatformEventEnvelope, PlatformEventError } from "@/lib/platform-events";

type IngestionResult = {
  eventId: string;
  deduplicated: boolean;
  receivedAt: string;
  applied: string[];
};

type DecisionEventRuntimeClient = PrismaClient | Prisma.TransactionClient;

function getDecisionEventDelegate(prisma: DecisionEventRuntimeClient) {
  return (prisma as { decisionEvent?: { upsert: (...args: unknown[]) => Promise<unknown> } }).decisionEvent;
}

async function upsertDecisionEvent(
  prisma: DecisionEventRuntimeClient,
  input: {
    decisionId: string;
    eventType: string;
    metadata: string | null;
    sourceEventId: string;
  },
) {
  const delegate = getDecisionEventDelegate(prisma);
  if (delegate) {
    await delegate.upsert({
      where: { sourceEventId: input.sourceEventId },
      update: {
        eventType: input.eventType,
        metadata: input.metadata,
      },
      create: {
        decisionId: input.decisionId,
        eventType: input.eventType,
        metadata: input.metadata,
        sourceEventId: input.sourceEventId,
      },
    });
    return;
  }

  // Some long-running dev processes keep an older Prisma client in memory.
  // Fall back to raw SQL so newly added tables can still be written without a restart.
  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "DecisionEvent" ("id", "decisionId", "eventType", "metadata", "sourceEventId", "createdAt")
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT("sourceEventId") DO UPDATE SET
        "eventType" = excluded."eventType",
        "metadata" = excluded."metadata"
    `,
    `de_${input.sourceEventId}`,
    input.decisionId,
    input.eventType,
    input.metadata,
    input.sourceEventId,
  );
}

async function findDuplicateEvent(prisma: PrismaClient, event: PlatformEventEnvelope) {
  const existingByEventId = await prisma.platformEvent.findUnique({
    where: { eventId: event.eventId },
    select: { receivedAt: true },
  });
  if (existingByEventId) return existingByEventId;

  if (event.idempotencyKey) {
    const existingByIdempotency = await prisma.platformEvent.findFirst({
      where: { idempotencyKey: event.idempotencyKey },
      select: { receivedAt: true },
    });
    if (existingByIdempotency) return existingByIdempotency;
  }

  return prisma.platformEvent.findFirst({
    where: {
      producer: event.producer,
      eventName: event.eventName,
      entityId: event.entityId,
      occurredAt: new Date(event.occurredAt),
    },
    select: { receivedAt: true },
  });
}

async function applyFactMutation(prisma: PrismaClient | Prisma.TransactionClient, event: PlatformEventEnvelope) {
  switch (event.eventName) {
    case "trace.failed": {
      const payload = event.payload as {
        type: string;
        source: string;
        name: string;
        status: "FAILED";
        errorCode: string;
        retryCount?: number;
        latencyMs?: number;
        parentTraceId?: string;
        inputSnapshotRef?: string;
        outputSnapshotRef?: string;
      };

      await prisma.agentTrace.upsert({
        where: { sourceEventId: event.eventId },
        update: {
          status: payload.status,
          errorCode: payload.errorCode,
          retryCount: payload.retryCount ?? 0,
          latencyMs: payload.latencyMs,
          outputSnapshot: payload.outputSnapshotRef,
        },
        create: {
          runId: event.runId!,
          parentTraceId: payload.parentTraceId,
          type: payload.type,
          source: payload.source,
          name: payload.name,
          inputSnapshot: payload.inputSnapshotRef,
          outputSnapshot: payload.outputSnapshotRef,
          status: payload.status,
          errorCode: payload.errorCode,
          retryCount: payload.retryCount ?? 0,
          latencyMs: payload.latencyMs,
          sequence: event.sequence,
          sourceEventId: event.eventId,
        },
      });

      return ["PlatformEvent", "AgentTrace"];
    }

    case "usage.recorded": {
      const payload = event.payload as {
        usageType: string;
        provider?: string;
        model?: string;
        tokenInput: number;
        tokenOutput: number;
        tokenCached: number;
        tokenReasoning: number;
        tokenTotal: number;
        cost: string;
        currency: string;
        billable: boolean;
        externalUsageId?: string;
      };

      await prisma.usageRecord.upsert({
        where: { sourceEventId: event.eventId },
        update: {
          usageType: payload.usageType,
          provider: payload.provider,
          model: payload.model,
          tokenInput: payload.tokenInput,
          tokenOutput: payload.tokenOutput,
          tokenCached: payload.tokenCached,
          tokenReasoning: payload.tokenReasoning,
          tokenTotal: payload.tokenTotal,
          cost: payload.cost,
          currency: payload.currency,
          billable: payload.billable,
          externalUsageId: payload.externalUsageId,
          source: event.source,
          occurredAt: new Date(event.occurredAt),
        },
        create: {
          runId: event.runId,
          runtimeId: event.runtimeId,
          agentId: event.agentId,
          versionId: event.versionId,
          billingAccountId: event.billingAccountId,
          usageType: payload.usageType,
          provider: payload.provider,
          model: payload.model,
          tokenInput: payload.tokenInput,
          tokenOutput: payload.tokenOutput,
          tokenCached: payload.tokenCached,
          tokenReasoning: payload.tokenReasoning,
          tokenTotal: payload.tokenTotal,
          cost: payload.cost,
          currency: payload.currency,
          billable: payload.billable,
          externalUsageId: payload.externalUsageId,
          source: event.source,
          sourceEventId: event.eventId,
          occurredAt: new Date(event.occurredAt),
        },
      });

      return ["PlatformEvent", "UsageRecord"];
    }

    case "outcome.recorded": {
      const payload = event.payload as {
        metricType: string;
        value: string;
        unit?: string;
        source: string;
      };

      await prisma.agentOutcome.upsert({
        where: { sourceEventId: event.eventId },
        update: {
          metricType: payload.metricType,
          value: payload.value,
          unit: payload.unit,
          source: payload.source,
        },
        create: {
          runId: event.runId!,
          metricType: payload.metricType,
          value: payload.value,
          unit: payload.unit,
          source: payload.source,
          sourceEventId: event.eventId,
        },
      });

      return ["PlatformEvent", "AgentOutcome"];
    }

    case "decision.created": {
      const payload = event.payload as {
        type: string;
        confidence?: number;
        content?: Record<string, unknown>;
      };

      await upsertDecisionEvent(prisma, {
        decisionId: event.decisionId!,
        eventType: "CREATED",
        metadata: stringifyJsonField({
          type: payload.type,
          confidence: payload.confidence,
          content: payload.content,
          runId: event.runId,
          agentId: event.agentId,
          versionId: event.versionId,
        }),
        sourceEventId: event.eventId,
      });

      return ["PlatformEvent", "DecisionEvent"];
    }

    case "decision.accepted": {
      const payload = event.payload as {
        from?: string;
        to: string;
        eventType: "ACCEPTED";
        metadata?: Record<string, unknown>;
      };

      await upsertDecisionEvent(prisma, {
        decisionId: event.decisionId!,
        eventType: payload.eventType,
        metadata: stringifyJsonField({
          from: payload.from,
          to: payload.to,
          metadata: payload.metadata,
          runId: event.runId,
          agentId: event.agentId,
        }),
        sourceEventId: event.eventId,
      });

      return ["PlatformEvent", "DecisionEvent"];
    }

    case "decision.rejected": {
      const payload = event.payload as {
        from?: string;
        to: string;
        eventType: "REJECTED";
        reason?: string;
        metadata?: Record<string, unknown>;
      };

      await upsertDecisionEvent(prisma, {
        decisionId: event.decisionId!,
        eventType: payload.eventType,
        metadata: stringifyJsonField({
          from: payload.from,
          to: payload.to,
          reason: payload.reason,
          metadata: payload.metadata,
          runId: event.runId,
          agentId: event.agentId,
        }),
        sourceEventId: event.eventId,
      });

      return ["PlatformEvent", "DecisionEvent"];
    }

    case "decision.executed": {
      const payload = event.payload as {
        from?: string;
        to: string;
        eventType: "EXECUTED";
        actionRef?: string;
        metadata?: Record<string, unknown>;
      };

      await upsertDecisionEvent(prisma, {
        decisionId: event.decisionId!,
        eventType: payload.eventType,
        metadata: stringifyJsonField({
          from: payload.from,
          to: payload.to,
          actionRef: payload.actionRef,
          metadata: payload.metadata,
          runId: event.runId,
          agentId: event.agentId,
        }),
        sourceEventId: event.eventId,
      });

      return ["PlatformEvent", "DecisionEvent"];
    }

    case "run.started":
    case "run.completed":
    case "run.failed":
      return ["PlatformEvent"];

    default:
      throw new PlatformEventError("UNKNOWN_EVENT_NAME", `暂不支持事件类型 ${event.eventName}`, 400);
  }
}

export async function ingestPlatformEvent(
  prisma: PrismaClient,
  event: PlatformEventEnvelope,
  rawBody: string,
): Promise<IngestionResult> {
  const duplicate = await findDuplicateEvent(prisma, event);
  if (duplicate) {
    return {
      eventId: event.eventId,
      deduplicated: true,
      receivedAt: duplicate.receivedAt.toISOString(),
      applied: [],
    };
  }

  const receivedAt = new Date();
  const applied = await prisma.$transaction(async (tx) => {
    await tx.platformEvent.create({
      data: {
        eventId: event.eventId,
        eventName: event.eventName,
        eventVersion: event.eventVersion,
        producer: event.producer,
        source: event.source,
        entityType: event.entityType,
        entityId: event.entityId,
        agentId: event.agentId,
        versionId: event.versionId,
        runtimeId: event.runtimeId,
        runId: event.runId,
        traceId: event.traceId,
        decisionId: event.decisionId,
        projectId: event.projectId,
        organizationId: event.organizationId,
        billingAccountId: event.billingAccountId,
        invoiceId: event.invoiceId,
        listingId: event.listingId,
        sequence: event.sequence,
        idempotencyKey: event.idempotencyKey,
        payload: stringifyJsonField(event.payload),
        rawBody,
        occurredAt: new Date(event.occurredAt),
        receivedAt,
      },
    });

    return applyFactMutation(tx, event);
  });

  return {
    eventId: event.eventId,
    deduplicated: false,
    receivedAt: receivedAt.toISOString(),
    applied,
  };
}

export async function ingestPlatformEventBatch(
  prisma: PrismaClient,
  events: Array<{ event: PlatformEventEnvelope; rawBody: string }>,
) {
  const results = [];

  for (const item of events) {
    try {
      const result = await ingestPlatformEvent(prisma, item.event, item.rawBody);
      results.push({ ok: true, eventId: result.eventId, deduplicated: result.deduplicated });
    } catch (error) {
      const platformError =
        error instanceof PlatformEventError
          ? error
          : new PlatformEventError(
              "INTERNAL_INGESTION_ERROR",
              error instanceof Error ? error.message : "批量事件接入失败",
              500,
            );

      results.push({
        ok: false,
        eventId: item.event.eventId,
        code: platformError.code,
        message: platformError.message,
      });
    }
  }

  return results;
}
