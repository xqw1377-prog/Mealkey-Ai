/**
 * Decision Runtime Event — 写入 Prisma DecisionEvent
 */

import type { PrismaClient } from "@/generated/prisma";
import type { DecisionRuntimeEventType } from "../../contracts/mk-decision";

export type DecisionEventClient =
  | PrismaClient
  | {
      decisionEvent?: {
        upsert: (args: unknown) => Promise<unknown>;
      };
      $executeRawUnsafe?: (...args: unknown[]) => Promise<unknown>;
    };

function buildId(prefix: string) {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? `${prefix}_${crypto.randomUUID().slice(0, 12)}`
    : `${prefix}_${Date.now().toString(36)}`;
}

/**
 * 幂等写入决策事件（sourceEventId 唯一）。
 */
export async function emitDecisionRuntimeEvent(
  prisma: DecisionEventClient,
  input: {
    decisionId: string;
    eventType: DecisionRuntimeEventType;
    payload?: Record<string, unknown>;
    /** 不传则自动生成；同 sourceEventId 重复写入会 upsert */
    sourceEventId?: string;
  },
): Promise<{ sourceEventId: string; eventType: DecisionRuntimeEventType }> {
  const sourceEventId =
    input.sourceEventId ||
    `${input.eventType}:${input.decisionId}:${buildId("src")}`;
  const metadata = JSON.stringify({
    ...(input.payload || {}),
    emittedAt: new Date().toISOString(),
    runtime: "decision",
  });

  const delegate = (
    prisma as {
      decisionEvent?: {
        upsert: (args: unknown) => Promise<unknown>;
      };
    }
  ).decisionEvent;

  if (delegate?.upsert) {
    await delegate.upsert({
      where: { sourceEventId },
      update: {
        eventType: input.eventType,
        metadata,
      },
      create: {
        decisionId: input.decisionId,
        eventType: input.eventType,
        metadata,
        sourceEventId,
      },
    });
    return { sourceEventId, eventType: input.eventType };
  }

  const exec = (
    prisma as { $executeRawUnsafe?: (...args: unknown[]) => Promise<unknown> }
  ).$executeRawUnsafe;
  if (typeof exec === "function") {
    await exec(
      `
      INSERT INTO "DecisionEvent" ("id", "decisionId", "eventType", "metadata", "sourceEventId", "createdAt")
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT("sourceEventId") DO UPDATE SET
        "eventType" = excluded."eventType",
        "metadata" = excluded."metadata"
    `,
      `de_${sourceEventId}`.slice(0, 64),
      input.decisionId,
      input.eventType,
      metadata,
      sourceEventId,
    );
  }

  return { sourceEventId, eventType: input.eventType };
}
