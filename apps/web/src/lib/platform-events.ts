import crypto from "node:crypto";
import { z } from "zod";

export const supportedPlatformEventNames = [
  "run.started",
  "run.completed",
  "run.failed",
  "trace.failed",
  "decision.created",
  "decision.accepted",
  "decision.rejected",
  "decision.executed",
  "usage.recorded",
  "outcome.recorded",
] as const;

export type SupportedPlatformEventName = (typeof supportedPlatformEventNames)[number];

const eventNameSchema = z.enum(supportedPlatformEventNames);
const sourceSchema = z.enum(["MEALKEY", "EXTERNAL_RUNTIME", "PARTNER", "SYSTEM"]);

const payloadSchemas = {
  "run.started": z.object({ status: z.literal("RUNNING"), startedAt: z.string().datetime() }),
  "run.completed": z.object({
    status: z.literal("SUCCESS"),
    completedAt: z.string().datetime(),
    latencyMs: z.number().int().nonnegative(),
    outputRef: z.string().min(1).optional(),
  }),
  "run.failed": z.object({
    status: z.literal("FAILED"),
    completedAt: z.string().datetime(),
    latencyMs: z.number().int().nonnegative().optional(),
    errorCode: z.string().min(1),
    errorMessage: z.string().min(1).optional(),
  }),
  "trace.failed": z.object({
    type: z.string().min(1),
    source: z.string().min(1),
    name: z.string().min(1),
    status: z.literal("FAILED"),
    errorCode: z.string().min(1),
    retryCount: z.number().int().nonnegative().optional(),
    latencyMs: z.number().int().nonnegative().optional(),
    parentTraceId: z.string().min(1).optional(),
    inputSnapshotRef: z.string().min(1).optional(),
    outputSnapshotRef: z.string().min(1).optional(),
  }),
  "decision.created": z.object({
    type: z.string().min(1),
    confidence: z.number().min(0).max(1).optional(),
    content: z.record(z.unknown()).optional(),
  }),
  "decision.accepted": z.object({
    from: z.string().min(1).optional(),
    to: z.string().min(1).default("ACCEPTED"),
    eventType: z.literal("ACCEPTED").default("ACCEPTED"),
    metadata: z.record(z.unknown()).optional(),
  }),
  "decision.rejected": z.object({
    from: z.string().min(1).optional(),
    to: z.string().min(1).default("REJECTED"),
    eventType: z.literal("REJECTED").default("REJECTED"),
    reason: z.string().min(1).optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
  "decision.executed": z.object({
    from: z.string().min(1).optional(),
    to: z.string().min(1).default("EXECUTED"),
    eventType: z.literal("EXECUTED").default("EXECUTED"),
    actionRef: z.string().min(1).optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
  "usage.recorded": z
    .object({
      usageType: z.enum(["LLM", "EMBEDDING", "OCR", "ASR", "TOOL", "EVALUATION", "SYSTEM"]),
      provider: z.string().min(1).optional(),
      model: z.string().min(1).optional(),
      tokenInput: z.number().int().nonnegative(),
      tokenOutput: z.number().int().nonnegative(),
      tokenCached: z.number().int().nonnegative(),
      tokenReasoning: z.number().int().nonnegative(),
      tokenTotal: z.number().int().nonnegative(),
      cost: z.string().min(1),
      currency: z.string().min(1),
      billable: z.boolean(),
      externalUsageId: z.string().min(1).optional(),
    })
    .superRefine((value, ctx) => {
      const total = value.tokenInput + value.tokenOutput + value.tokenCached + value.tokenReasoning;
      if (value.tokenTotal !== total) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "tokenTotal 必须等于四类 token 之和",
          path: ["tokenTotal"],
        });
      }
    }),
  "outcome.recorded": z.object({
    metricType: z.string().min(1),
    value: z.string().min(1),
    unit: z.string().min(1).optional(),
    source: z.enum(["SYSTEM", "USER", "EXTERNAL"]),
  }),
} satisfies Record<SupportedPlatformEventName, z.ZodTypeAny>;

const baseEnvelopeSchema = z
  .object({
    eventId: z.string().min(1),
    eventName: eventNameSchema,
    eventVersion: z.literal(1),
    occurredAt: z.string().datetime(),
    entityType: z.string().min(1),
    entityId: z.string().min(1),
    agentId: z.string().min(1).optional(),
    versionId: z.string().min(1).optional(),
    runtimeId: z.string().min(1).optional(),
    runId: z.string().min(1).optional(),
    traceId: z.string().min(1).optional(),
    decisionId: z.string().min(1).optional(),
    projectId: z.string().min(1).optional(),
    organizationId: z.string().min(1).optional(),
    billingAccountId: z.string().min(1).optional(),
    invoiceId: z.string().min(1).optional(),
    listingId: z.string().min(1).optional(),
    producer: z.string().min(1),
    source: sourceSchema,
    sequence: z.number().int().nonnegative().optional(),
    idempotencyKey: z.string().min(1).optional(),
    payload: z.unknown(),
  })
  .superRefine((value, ctx) => {
    if (value.eventName.startsWith("run.") && !value.runId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "run 级事件必须包含 runId", path: ["runId"] });
    }
    if (value.eventName === "trace.failed" && !value.runId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "trace 级事件必须包含 runId", path: ["runId"] });
    }
    if (value.eventName === "trace.failed" && !value.traceId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "trace 级事件必须包含 traceId", path: ["traceId"] });
    }
    if (
      (
        value.eventName === "decision.created" ||
        value.eventName === "decision.accepted" ||
        value.eventName === "decision.rejected" ||
        value.eventName === "decision.executed"
      ) &&
      !value.decisionId
    ) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "decision 级事件必须包含 decisionId", path: ["decisionId"] });
    }
    if (value.eventName === "usage.recorded" && !value.runId && !value.billingAccountId) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "usage 级事件至少需要 runId 或 billingAccountId", path: ["billingAccountId"] });
    }
  });

export type PlatformEventEnvelope = z.infer<typeof baseEnvelopeSchema> & {
  eventName: SupportedPlatformEventName;
};

export class PlatformEventError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "PlatformEventError";
    this.code = code;
    this.status = status;
  }
}

export function parsePlatformEventEnvelope(input: unknown): PlatformEventEnvelope {
  const event = baseEnvelopeSchema.parse(input) as PlatformEventEnvelope;
  event.payload = payloadSchemas[event.eventName].parse(event.payload);
  return event;
}

export function verifyIngestionAuthorization(authHeader: string | null) {
  const tokens = (process.env.MK_EVENT_INGEST_TOKENS ?? process.env.MK_EVENT_INGEST_TOKEN ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (tokens.length === 0) {
    if (process.env.NODE_ENV === "production") {
      throw new PlatformEventError("UNAUTHORIZED_PRODUCER", "生产环境必须配置事件接入 Token", 401);
    }
    return;
  }
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  if (!token || !tokens.includes(token)) {
    throw new PlatformEventError("UNAUTHORIZED_PRODUCER", "事件接入 Token 无效", 401);
  }
}

export function verifyExternalRuntimeSignature(params: {
  authSource: PlatformEventEnvelope["source"];
  rawBody: string;
  timestampHeader: string | null;
  signatureHeader: string | null;
}) {
  if (params.authSource !== "EXTERNAL_RUNTIME") return;

  const secret = process.env.MK_EVENT_SIGNING_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new PlatformEventError("INVALID_SIGNATURE", "生产环境缺少事件签名密钥", 401);
    }
    return;
  }
  if (!params.timestampHeader || !params.signatureHeader) {
    throw new PlatformEventError("INVALID_SIGNATURE", "缺少事件签名头", 401);
  }

  const timestamp = Number(params.timestampHeader);
  if (!Number.isFinite(timestamp) || Math.abs(Math.floor(Date.now() / 1000) - timestamp) > 300) {
    throw new PlatformEventError("TIMESTAMP_EXPIRED", "事件时间戳已过期", 401);
  }

  const expected = `sha256=${crypto.createHmac("sha256", secret).update(`${timestamp}.${params.rawBody}`).digest("hex")}`;
  const left = Buffer.from(expected);
  const right = Buffer.from(params.signatureHeader);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
    throw new PlatformEventError("INVALID_SIGNATURE", "事件签名校验失败", 401);
  }
}

export function toPlatformEventError(error: unknown) {
  if (error instanceof PlatformEventError) return error;
  if (error instanceof z.ZodError) {
    return new PlatformEventError("INVALID_PAYLOAD", error.issues[0]?.message ?? "事件 payload 校验失败", 400);
  }
  return new PlatformEventError("INTERNAL_INGESTION_ERROR", error instanceof Error ? error.message : "事件接入失败", 500);
}
