import { NextResponse } from "next/server";
import { z } from "zod";

import {
  parsePlatformEventEnvelope,
  toPlatformEventError,
  verifyExternalRuntimeSignature,
  verifyIngestionAuthorization,
} from "@/lib/platform-events";
import { prisma, stringifyJsonField } from "@/lib/prisma";
import { ingestPlatformEventBatch } from "@/server/services/platform-events.service";

const batchSchema = z.object({
  producer: z.string().min(1),
  events: z.array(z.unknown()).min(1).max(500),
});

export async function POST(request: Request) {
  try {
    const requestBody = await request.text();

    verifyIngestionAuthorization(request.headers.get("authorization"));

    const parsedBody = batchSchema.parse(JSON.parse(requestBody) as unknown);
    const items = parsedBody.events.map((input) => {
      const event = parsePlatformEventEnvelope(input);

      verifyExternalRuntimeSignature({
        authSource: event.source,
        rawBody: stringifyJsonField(input),
        timestampHeader: request.headers.get("x-mealkey-timestamp"),
        signatureHeader: request.headers.get("x-mealkey-signature"),
      });

      return {
        event,
        rawBody: stringifyJsonField(input),
      };
    });

    const results = await ingestPlatformEventBatch(prisma, items);

    return NextResponse.json({
      ok: true,
      acceptedCount: results.filter((item) => item.ok).length,
      deduplicatedCount: results.filter((item) => item.ok && item.deduplicated).length,
      rejected: results.filter((item) => !item.ok),
      results,
    });
  } catch (error) {
    const platformError = toPlatformEventError(error);
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: platformError.code,
          message: platformError.message,
        },
      },
      { status: platformError.status },
    );
  }
}
