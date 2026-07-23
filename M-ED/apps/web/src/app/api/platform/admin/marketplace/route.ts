import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/auth-helpers";
import { platformAdminErrorResponse } from "@/lib/platform-admin-route";
import { prisma } from "@/lib/prisma";
import {
  createPlatformListing,
  getPlatformAdminOverview,
  updatePlatformListing,
} from "@/server/services/platform-admin.service";

export async function GET() {
  try {
    await requirePlatformAdmin();
    const overview = await getPlatformAdminOverview(prisma);
    return NextResponse.json({ ok: true, listings: overview.listings, summary: overview.summary });
  } catch (error) {
    return platformAdminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requirePlatformAdmin();
    const body = (await request.json()) as Record<string, unknown>;

    if (body.action === "update_listing") {
      const id = typeof body.id === "string" ? body.id : "";
      const status = typeof body.status === "string" ? body.status : "";
      const visibility = typeof body.visibility === "string" ? body.visibility : undefined;
      const priceCents = typeof body.priceCents === "number" ? body.priceCents : undefined;

      if (!id || !status) {
        return NextResponse.json({ ok: false, error: "id 和 status 必填" }, { status: 400 });
      }

      const listing = await updatePlatformListing(prisma, {
        id,
        status,
        visibility,
        priceCents,
      });

      return NextResponse.json({ ok: true, listing });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const slug = typeof body.slug === "string" ? body.slug : undefined;
    const priceCents = typeof body.priceCents === "number" ? body.priceCents : undefined;
    const currency = typeof body.currency === "string" ? body.currency : undefined;
    const pricingModel = typeof body.pricingModel === "string" ? body.pricingModel : undefined;

    if (!name) {
      return NextResponse.json({ ok: false, error: "listing 名称不能为空" }, { status: 400 });
    }

    const listing = await createPlatformListing(prisma, {
      name,
      slug,
      priceCents,
      currency,
      pricingModel,
    });

    return NextResponse.json({ ok: true, listing });
  } catch (error) {
    return platformAdminErrorResponse(error);
  }
}
