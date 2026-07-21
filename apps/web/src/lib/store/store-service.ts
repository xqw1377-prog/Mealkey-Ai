import { prisma } from "@/lib/prisma";
import { ensureBillingAccountForOwner } from "@/server/services/billing.service";
import {
  reserveWalletPoints,
  settleWalletReservation,
} from "@/server/services/wallet.service";

export type StoreListingCard = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  status: string;
  visibility: string;
  pricingModel: string;
  priceCents: number;
  currency: string;
  installCount: number;
  rating: number;
  agentId: string | null;
  author: string | null;
  category: string | null;
  isPartner: boolean;
  isOfficial: boolean;
  isFree: boolean;
  referenceHref: string | null;
};

function parseMeta(raw: string | null | undefined): Record<string, unknown> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function isListingFree(listing: {
  pricingModel: string;
  priceCents: number;
}): boolean {
  return (
    listing.pricingModel === "free" ||
    listing.priceCents <= 0 ||
    listing.pricingModel === "grant"
  );
}

function toCard(
  listing: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    status: string;
    visibility: string;
    pricingModel: string;
    priceCents: number;
    currency: string;
    installCount: number;
    rating: number;
    metadata: string | null;
    agentProductId: string | null;
  },
  product?: { author: string; domain: string } | null,
): StoreListingCard {
  const meta = parseMeta(listing.metadata);
  const isPartner = meta.source === "partner_publish" || typeof meta.agentId === "string";
  const isOfficial = meta.source === "official" || meta.official === true;
  return {
    id: listing.id,
    slug: listing.slug,
    name: listing.name,
    description: listing.description,
    status: listing.status,
    visibility: listing.visibility,
    pricingModel: listing.pricingModel,
    priceCents: listing.priceCents,
    currency: listing.currency,
    installCount: listing.installCount,
    rating: listing.rating,
    agentId: typeof meta.agentId === "string" ? meta.agentId : null,
    author: product?.author ?? (isOfficial ? "MealKey" : null),
    category: product?.domain ?? (typeof meta.category === "string" ? meta.category : null),
    isPartner,
    isOfficial,
    isFree: isListingFree(listing),
    referenceHref: typeof meta.referenceHref === "string" ? meta.referenceHref : null,
  };
}

/** 确保 Store 有官方 M-OPS / 诊断样板位 */
export async function ensureOfficialStoreListings() {
  const official = [
    {
      id: "listing_official_mops",
      slug: "restaurant-diagnosis",
      name: "餐厅经营诊断（M-OPS）",
      description:
        "官方参考实现：外置垂直 Agent 经 Gateway Context/Ingress 交付洞察。安装 = 授权进 OS，不是下载包。",
      agentId: "restaurant-diagnosis",
      referenceHref: "/developers/examples/m-ops",
      category: "经营分析",
    },
  ];

  for (const item of official) {
    const existing = await prisma.agentListing.findUnique({ where: { id: item.id } });
    if (existing) {
      if (existing.status !== "active" || existing.visibility !== "public") {
        await prisma.agentListing.update({
          where: { id: item.id },
          data: { status: "active", visibility: "public" },
        });
      }
      continue;
    }
    const slugTaken = await prisma.agentListing.findUnique({ where: { slug: item.slug } });
    if (slugTaken) continue;

    await prisma.agentListing.create({
      data: {
        id: item.id,
        slug: item.slug,
        name: item.name,
        description: item.description,
        status: "active",
        visibility: "public",
        pricingModel: "free",
        priceCents: 0,
        currency: "CNY",
        installCount: 0,
        rating: 5,
        metadata: JSON.stringify({
          source: "official",
          official: true,
          agentId: item.agentId,
          category: item.category,
          referenceHref: item.referenceHref,
        }),
      },
    });
  }
}

export async function listPublicStoreListings(take = 48): Promise<StoreListingCard[]> {
  await ensureOfficialStoreListings();

  const listings = await prisma.agentListing.findMany({
    where: { status: "active", visibility: "public" },
    orderBy: [{ installCount: "desc" }, { updatedAt: "desc" }],
    take: Math.min(Math.max(take, 1), 100),
  });

  const productIds = listings
    .map((l) => l.agentProductId)
    .filter((id): id is string => Boolean(id));
  const products =
    productIds.length > 0
      ? await prisma.agentProduct.findMany({
          where: { id: { in: productIds } },
          select: { id: true, author: true, domain: true },
        })
      : [];
  const productMap = new Map(products.map((p) => [p.id, p]));

  const cards = listings.map((listing) =>
    toCard(listing, listing.agentProductId ? productMap.get(listing.agentProductId) : null),
  );

  // 官方样板置顶
  return cards.sort((a, b) => Number(b.isOfficial) - Number(a.isOfficial));
}

export async function getPublicStoreListingBySlug(slug: string): Promise<StoreListingCard | null> {
  await ensureOfficialStoreListings();
  const listing = await prisma.agentListing.findUnique({ where: { slug } });
  if (!listing || listing.status !== "active" || listing.visibility !== "public") {
    return null;
  }
  const product = listing.agentProductId
    ? await prisma.agentProduct.findUnique({
        where: { id: listing.agentProductId },
        select: { author: true, domain: true },
      })
    : null;
  return toCard(listing, product);
}

export async function installStoreListing(input: {
  userId: string;
  listingIdOrSlug: string;
}) {
  const listing =
    (await prisma.agentListing.findUnique({ where: { id: input.listingIdOrSlug } })) ??
    (await prisma.agentListing.findUnique({ where: { slug: input.listingIdOrSlug } }));

  if (!listing || listing.status !== "active" || listing.visibility !== "public") {
    throw new Error("Listing 不可安装或不存在");
  }

  const meta = parseMeta(listing.metadata);
  const agentCode =
    typeof meta.agentId === "string" && meta.agentId.length > 0
      ? meta.agentId
      : listing.slug;

  const owner = await prisma.owner.findUnique({ where: { userId: input.userId } });
  if (!owner) {
    throw new Error("请先完成经营者引导后再安装 Agent");
  }

  const account = await ensureBillingAccountForOwner(prisma, {
    ownerId: owner.id,
    userId: input.userId,
    name: owner.name,
  });

  const existing = await prisma.agentEntitlement.findUnique({
    where: {
      billingAccountId_agentCode: {
        billingAccountId: account.id,
        agentCode,
      },
    },
  });

  if (existing?.status === "active") {
    return {
      alreadyInstalled: true,
      entitlementId: existing.id,
      agentCode,
      listingId: listing.id,
      slug: listing.slug,
      settlement: null as null | { pointsCharged: number },
    };
  }

  const free = isListingFree(listing);
  let settlement: { pointsCharged: number } | null = null;

  if (!free) {
    // 付费结算 V1：1 元 = 1 经营点；扣点成功即视为结算完成并安装
    const points = Math.max(1, Math.round(listing.priceCents / 100));
    const sourceId = `store_install_${listing.id}_${account.id}`;
    try {
      await reserveWalletPoints(prisma, {
        userId: input.userId,
        amount: points,
        reason: `安装 Agent · ${listing.name}`,
        referenceId: sourceId,
        metadata: {
          sourceType: "store_install",
          listingId: listing.id,
          agentCode,
          priceCents: listing.priceCents,
        },
      });
      await settleWalletReservation(prisma, {
        userId: input.userId,
        reservedAmount: points,
        actualAmount: points,
        reason: `安装 Agent · ${listing.name}`,
        referenceId: sourceId,
        metadata: {
          sourceType: "store_install",
          listingId: listing.id,
          agentCode,
        },
      });
      settlement = { pointsCharged: points };
    } catch (error) {
      const message = error instanceof Error ? error.message : "经营点不足";
      throw new Error(
        message.includes("不足") || message.includes("余额")
          ? `付费 Agent 需 ${Math.max(1, Math.round(listing.priceCents / 100))} 经营点，请先前往 /billing 充值`
          : `付费结算失败：${message}`,
      );
    }
  }

  const entitlement = existing
    ? await prisma.agentEntitlement.update({
        where: { id: existing.id },
        data: {
          status: "active",
          source: free ? "grant" : "addon",
          startedAt: new Date(),
          endsAt: null,
          metadata: JSON.stringify({
            listingId: listing.id,
            installedAt: new Date().toISOString(),
            source: "store_install",
            settlement: free ? "free" : "business_points",
            pointsCharged: settlement?.pointsCharged ?? 0,
          }),
        },
      })
    : await prisma.agentEntitlement.create({
        data: {
          billingAccountId: account.id,
          agentCode,
          status: "active",
          source: free ? "grant" : "addon",
          metadata: JSON.stringify({
            listingId: listing.id,
            installedAt: new Date().toISOString(),
            source: "store_install",
            settlement: free ? "free" : "business_points",
            pointsCharged: settlement?.pointsCharged ?? 0,
          }),
        },
      });

  await prisma.agentListing.update({
    where: { id: listing.id },
    data: { installCount: { increment: 1 } },
  });

  return {
    alreadyInstalled: false,
    entitlementId: entitlement.id,
    agentCode,
    listingId: listing.id,
    slug: listing.slug,
    settlement,
  };
}

export async function listMyInstalledAgents(userId: string) {
  const owner = await prisma.owner.findUnique({ where: { userId } });
  if (!owner) return [];

  const account = await prisma.billingAccount.findFirst({
    where: { ownerId: owner.id, status: "active" },
    orderBy: { createdAt: "asc" },
  });
  if (!account) return [];

  const rows = await prisma.agentEntitlement.findMany({
    where: { billingAccountId: account.id },
    orderBy: { updatedAt: "desc" },
  });

  return rows.map((row) => {
    const meta = parseMeta(row.metadata);
    return {
      id: row.id,
      agentCode: row.agentCode,
      status: row.status,
      source: row.source,
      startedAt: row.startedAt.toISOString(),
      endsAt: row.endsAt?.toISOString() ?? null,
      listingId: typeof meta.listingId === "string" ? meta.listingId : null,
    };
  });
}

export async function revokeInstalledAgent(input: {
  userId: string;
  entitlementId: string;
}) {
  const owner = await prisma.owner.findUnique({ where: { userId: input.userId } });
  if (!owner) throw new Error("经营者档案不存在");

  const account = await prisma.billingAccount.findFirst({
    where: { ownerId: owner.id },
    orderBy: { createdAt: "asc" },
  });
  if (!account) throw new Error("账单账户不存在");

  const row = await prisma.agentEntitlement.findFirst({
    where: { id: input.entitlementId, billingAccountId: account.id },
  });
  if (!row) throw new Error("安装记录不存在");

  await prisma.agentEntitlement.update({
    where: { id: row.id },
    data: { status: "revoked" },
  });

  return { id: row.id, agentCode: row.agentCode, status: "revoked" as const };
}
