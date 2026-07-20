import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/auth-helpers";
import { platformAdminErrorResponse } from "@/lib/platform-admin-route";
import { prisma } from "@/lib/prisma";
import {
  getPlatformAdminInbox,
  type AdminInboxKind,
} from "@/server/services/platform-admin-inbox.service";
import { parsePlatformAdminPaginationFromUrl } from "@/server/services/platform-admin.service";

const KINDS = new Set<AdminInboxKind | "all">([
  "all",
  "learning",
  "invoice",
  "cognitive",
  "usage",
  "payment",
]);

export async function GET(request: Request) {
  try {
    await requirePlatformAdmin();
    const url = new URL(request.url);
    const rawKind = (url.searchParams.get("kind") ?? "all").toLowerCase();
    const kind = (KINDS.has(rawKind as AdminInboxKind | "all")
      ? rawKind
      : "all") as AdminInboxKind | "all";
    const pagination = parsePlatformAdminPaginationFromUrl(url);
    const inbox = await getPlatformAdminInbox(prisma, { kind, pagination });
    return NextResponse.json({ ok: true, ...inbox });
  } catch (error) {
    return platformAdminErrorResponse(error);
  }
}
