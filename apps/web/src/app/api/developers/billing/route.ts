import { NextResponse } from "next/server";

import { AuthError, requireAuth } from "@/lib/auth-helpers";
import {
  DeveloperAccessError,
  assertConsoleAccess,
  resolveDeveloperAccount,
} from "@/lib/developers/access";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireAuth();
    const account = await resolveDeveloperAccount(user);
    assertConsoleAccess(account);

    const apps = await prisma.partnerAgentApplication.findMany({
      where: {
        developerAccountId: account.id,
        listingId: { not: null },
      },
      select: {
        id: true,
        name: true,
        agentId: true,
        listingId: true,
        lifecycleStatus: true,
      },
    });

    const listingIds = apps
      .map((a) => a.listingId)
      .filter((id): id is string => Boolean(id));

    const shares =
      listingIds.length > 0
        ? await prisma.revenueShare.findMany({
            where: { listingId: { in: listingIds }, status: "active" },
          })
        : [];

    const listings =
      listingIds.length > 0
        ? await prisma.agentListing.findMany({
            where: { id: { in: listingIds } },
            select: {
              id: true,
              slug: true,
              name: true,
              priceCents: true,
              pricingModel: true,
              installCount: true,
              status: true,
            },
          })
        : [];

    const listingMap = new Map(listings.map((l) => [l.id, l]));
    const shareByListing = new Map<string, typeof shares>();
    for (const share of shares) {
      const list = shareByListing.get(share.listingId) ?? [];
      list.push(share);
      shareByListing.set(share.listingId, list);
    }

    return NextResponse.json({
      ok: true,
      settlementStatus: "not_enabled" as const,
      settlementNote: "开发者打款账本尚未开通；分成规则已预留，产生支付后可聚合。",
      defaultSplit: { developer: 0.7, platform: 0.3 },
      rows: apps.map((app) => {
        const listing = app.listingId ? listingMap.get(app.listingId) : null;
        const rev = app.listingId ? shareByListing.get(app.listingId) ?? [] : [];
        return {
          applicationId: app.id,
          agentId: app.agentId,
          name: app.name,
          lifecycleStatus: app.lifecycleStatus,
          listing: listing
            ? {
                id: listing.id,
                slug: listing.slug,
                priceCents: listing.priceCents,
                pricingModel: listing.pricingModel,
                installCount: listing.installCount,
                status: listing.status,
              }
            : null,
          revenueShares: rev.map((s) => ({
            beneficiaryType: s.beneficiaryType,
            beneficiaryId: s.beneficiaryId,
            sharePercent: s.sharePercent,
          })),
        };
      }),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 401 });
    }
    if (error instanceof DeveloperAccessError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "加载失败" },
      { status: 500 },
    );
  }
}
