import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/auth-helpers";
import { enforcePlatformAdminWriteRateLimit, platformAdminErrorResponse } from "@/lib/platform-admin-route";
import { prisma } from "@/lib/prisma";
import {
  createPlatformListing,
  getPlatformAdminMarketplaceDomain,
  isPlatformAdminListingPricingModel,
  isPlatformAdminListingStatus,
  isPlatformAdminListingVisibility,
  normalizePlatformAdminEnumValue,
  parsePlatformAdminPaginationFromUrl,
  updatePlatformListing,
} from "@/server/services/platform-admin.service";
import { recordPlatformAdminAudit } from "@/server/services/admin-audit.service";

export async function GET(request: Request) {
  try {
    await requirePlatformAdmin();
    const pagination = parsePlatformAdminPaginationFromUrl(new URL(request.url));
    const domain = await getPlatformAdminMarketplaceDomain(prisma, pagination);
    return NextResponse.json({
      ok: true,
      marketplace: domain.marketplace,
      objectsListings: domain.objectsListings,
      listings: domain.listings,
      summary: domain.summary,
      pagination: domain.pagination,
    });
  } catch (error) {
    return platformAdminErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requirePlatformAdmin();
    const body = (await request.json()) as Record<string, unknown>;

    if (body.action === "update_listing") {
      const limited = await enforcePlatformAdminWriteRateLimit(request, user.id, "marketplace.update");
      if (limited) return limited;
      const id = typeof body.id === "string" ? body.id : "";
      const status = normalizePlatformAdminEnumValue(typeof body.status === "string" ? body.status : "");
      const visibilityRaw =
        typeof body.visibility === "string" ? normalizePlatformAdminEnumValue(body.visibility) : undefined;
      const priceCents =
        typeof body.priceCents === "number" && Number.isFinite(body.priceCents) ? body.priceCents : undefined;

      if (!id || !status) {
        return NextResponse.json({ ok: false, error: "id 和 status 必填" }, { status: 400 });
      }
      if (!isPlatformAdminListingStatus(status)) {
        return NextResponse.json(
          { ok: false, error: "Listing 状态无效，仅支持 active / draft / paused" },
          { status: 400 },
        );
      }
      if (visibilityRaw && !isPlatformAdminListingVisibility(visibilityRaw)) {
        return NextResponse.json(
          { ok: false, error: "Listing 可见性无效，仅支持 public / private" },
          { status: 400 },
        );
      }
      const visibility = visibilityRaw && isPlatformAdminListingVisibility(visibilityRaw) ? visibilityRaw : undefined;

      const listing = await updatePlatformListing(prisma, {
        id,
        status,
        visibility,
        priceCents,
      });

      await recordPlatformAdminAudit(prisma, user, {
        route: "/api/platform/admin/marketplace",
        action: "listing.update",
        targetType: "listing",
        targetId: listing.id,
        input: {
          id,
          status,
          visibility: visibility ?? null,
          priceCents: priceCents ?? null,
        },
        result: {
          id: listing.id,
          status,
          visibility: visibility ?? null,
          priceCents: priceCents ?? null,
        },
      });

      return NextResponse.json({ ok: true, listing });
    }

    const limited = await enforcePlatformAdminWriteRateLimit(request, user.id, "marketplace.create");
    if (limited) return limited;

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const slug = typeof body.slug === "string" ? body.slug : undefined;
    const priceCents =
      typeof body.priceCents === "number" && Number.isFinite(body.priceCents) ? body.priceCents : undefined;
    const currency = typeof body.currency === "string" ? body.currency : undefined;
    const pricingModelRaw =
      typeof body.pricingModel === "string" ? normalizePlatformAdminEnumValue(body.pricingModel) : undefined;

    if (!name) {
      return NextResponse.json({ ok: false, error: "listing 名称不能为空" }, { status: 400 });
    }
    if (pricingModelRaw && !isPlatformAdminListingPricingModel(pricingModelRaw)) {
      return NextResponse.json(
        { ok: false, error: "Listing 定价模型无效，仅支持 subscription" },
        { status: 400 },
      );
    }
    const pricingModel =
      pricingModelRaw && isPlatformAdminListingPricingModel(pricingModelRaw) ? pricingModelRaw : undefined;

    const listing = await createPlatformListing(prisma, {
      name,
      slug,
      priceCents,
      currency,
      pricingModel,
    });

    await recordPlatformAdminAudit(prisma, user, {
      route: "/api/platform/admin/marketplace",
      action: "listing.create",
      targetType: "listing",
      targetId: listing.id,
      input: {
        name,
        slug: slug ?? null,
        priceCents: priceCents ?? null,
        currency: currency ?? null,
        pricingModel: pricingModel ?? null,
      },
      result: {
        id: listing.id,
        slug: listing.slug,
      },
    });

    return NextResponse.json({ ok: true, listing });
  } catch (error) {
    return platformAdminErrorResponse(error);
  }
}
