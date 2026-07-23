import { NextResponse } from "next/server";

import {
  parsePlatformEventEnvelope,
  toPlatformEventError,
  verifyExternalRuntimeSignature,
  verifyIngestionAuthorization,
} from "@/lib/platform-events";
import { prisma } from "@/lib/prisma";
import { ingestPlatformEvent } from "@/server/services/platform-events.service";

export async function POST(request: Request) {
  try {
    const rawBody = await request.text();

    verifyIngestionAuthorization(request.headers.get("authorization"));

    const parsedBody = JSON.parse(rawBody) as unknown;
    const event = parsePlatformEventEnvelope(parsedBody);

    verifyExternalRuntimeSignature({
      authSource: event.source,
      rawBody,
      timestampHeader: request.headers.get("x-mealkey-timestamp"),
      signatureHeader: request.headers.get("x-mealkey-signature"),
    });

    const result = await ingestPlatformEvent(prisma, event, rawBody);

    return NextResponse.json({
      ok: true,
      accepted: true,
      eventId: result.eventId,
      deduplicated: result.deduplicated,
      applied: result.applied,
      receivedAt: result.receivedAt,
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
