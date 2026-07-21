import { prisma } from "@/lib/prisma";
import {
  DeveloperAccessError,
  hashClientSecret,
  openClientSecret,
  parseJsonArray,
} from "@/lib/developers/access";

const DEVELOPER_SHARE = 0.7;
const PLATFORM_SHARE = 0.3;

function slugifyAgentId(agentId: string) {
  return agentId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function parsePricing(raw: string | null | undefined) {
  if (!raw) {
    return { model: "free", priceCents: 0, currency: "CNY" };
  }
  try {
    const parsed = JSON.parse(raw) as {
      model?: string;
      priceMonthlyFen?: number;
      currency?: string;
    };
    const model = (parsed.model ?? "free").toLowerCase();
    const priceCents =
      typeof parsed.priceMonthlyFen === "number" && Number.isFinite(parsed.priceMonthlyFen)
        ? Math.max(0, Math.round(parsed.priceMonthlyFen))
        : 0;
    return {
      model: model === "subscription" ? "subscription" : model === "usage" ? "usage" : model === "hybrid" ? "hybrid" : "free",
      priceCents,
      currency: parsed.currency ?? "CNY",
    };
  } catch {
    return { model: "free", priceCents: 0, currency: "CNY" };
  }
}

export type PartnerReviewQueueItem = {
  id: string;
  status: string;
  submittedAt: string;
  decisionNote: string | null;
  checklist: Record<string, unknown>;
  application: {
    id: string;
    agentId: string;
    name: string;
    category: string;
    lifecycleStatus: string;
    qualityScore: number | null;
    endpointUrl: string | null;
    developerDisplayName: string;
    developerEmail: string;
  };
  version: {
    id: string;
    version: string;
    demoUrl: string | null;
    privacyNotes: string | null;
    pricing: ReturnType<typeof parsePricing>;
  } | null;
};

export async function listPartnerReviewTasks(options?: {
  status?: string;
  take?: number;
}): Promise<PartnerReviewQueueItem[]> {
  const status = options?.status;
  const take = Math.min(Math.max(options?.take ?? 40, 1), 100);

  const tasks = await prisma.partnerReviewTask.findMany({
    where: status ? { status } : { status: { in: ["queued", "in_review"] } },
    orderBy: { submittedAt: "asc" },
    take,
    include: {
      application: {
        include: {
          developerAccount: {
            select: { displayName: true, contactEmail: true },
          },
          versions: { orderBy: { createdAt: "desc" }, take: 8 },
        },
      },
    },
  });

  return tasks.map((task) => {
    const version =
      task.application.versions.find((v) => v.id === task.versionId) ??
      task.application.versions[0] ??
      null;
    return {
      id: task.id,
      status: task.status,
      submittedAt: task.submittedAt.toISOString(),
      decisionNote: task.decisionNote,
      checklist: JSON.parse(task.checklistJson || "{}") as Record<string, unknown>,
      application: {
        id: task.application.id,
        agentId: task.application.agentId,
        name: task.application.name,
        category: task.application.category,
        lifecycleStatus: task.application.lifecycleStatus,
        qualityScore: task.application.qualityScore,
        endpointUrl: task.application.endpointUrl,
        developerDisplayName: task.application.developerAccount.displayName,
        developerEmail: task.application.developerAccount.contactEmail,
      },
      version: version
        ? {
            id: version.id,
            version: version.version,
            demoUrl: version.demoUrl,
            privacyNotes: version.privacyNotes,
            pricing: parsePricing(version.pricingJson),
          }
        : null,
    };
  });
}

async function publishApprovedApplication(input: {
  applicationId: string;
  versionId: string;
  reviewerUserId: string;
}) {
  const app = await prisma.partnerAgentApplication.findUnique({
    where: { id: input.applicationId },
    include: {
      developerAccount: true,
      versions: true,
    },
  });
  if (!app) throw new DeveloperAccessError("申请不存在", 404);

  const version =
    app.versions.find((v) => v.id === input.versionId) ??
    app.versions.find((v) => v.id === app.currentVersionId) ??
    app.versions[0];
  if (!version) throw new DeveloperAccessError("缺少 Manifest 版本", 400);

  let skillPkg: { clientSecretEnc?: string } = {};
  try {
    skillPkg = JSON.parse(version.skillPackageJson || "{}") as typeof skillPkg;
  } catch {
    skillPkg = {};
  }
  const liveSecret = openClientSecret(skillPkg.clientSecretEnc);
  if (!liveSecret) {
    throw new DeveloperAccessError(
      "无法解密 clientSecretEnc：请开发者先轮换密钥后再审核通过",
      400,
    );
  }
  const secretFingerprint = hashClientSecret(liveSecret).slice(0, 16);

  const capabilityIds = parseJsonArray(app.capabilityIds);
  const pricing = parsePricing(version.pricingJson);
  const slugBase = slugifyAgentId(app.agentId) || `partner-${app.id.slice(-6)}`;
  const productSlug = slugBase;
  const listingSlug = slugBase;

  const productPricing = JSON.stringify({
    model: pricing.model,
    price: pricing.priceCents / 100,
    currency: pricing.currency,
    priceMonthlyFen: pricing.priceCents,
  });

  const listingPricingModel =
    pricing.model === "free" || pricing.priceCents <= 0 ? "free" : pricing.model;

  const listingMeta = JSON.stringify({
    source: "partner_publish",
    agentId: app.agentId,
    applicationId: app.id,
    versionId: version.id,
    version: version.version,
    developerAccountId: app.developerAccountId,
    capabilityIds,
    demoUrl: version.demoUrl,
    gatewayRegistry: {
      agentId: app.agentId,
      manifestVersion: version.version,
      secretFingerprint,
      registeredAt: new Date().toISOString(),
      registeredBy: input.reviewerUserId,
    },
  });

  return prisma.$transaction(async (tx) => {
    let product = app.agentProductId
      ? await tx.agentProduct.findUnique({ where: { id: app.agentProductId } })
      : null;

    if (product) {
      product = await tx.agentProduct.update({
        where: { id: product.id },
        data: {
          name: app.name,
          description: `${app.name} · ${app.category}`,
          version: version.version,
          author: app.developerAccount.displayName,
          domain: app.category,
          capabilities: JSON.stringify(capabilityIds),
          requiredContext: JSON.stringify(["restaurant_context", "evidence"]),
          workflow: "partner_external",
          outputSchema: JSON.stringify({ maxLevel: 3, ports: ["signal", "insight", "gap"] }),
          manifest: version.manifestJson,
          pricing: productPricing,
          status: "active",
        },
      });
    } else {
      const slugTaken = await tx.agentProduct.findUnique({ where: { slug: productSlug } });
      const finalProductSlug = slugTaken ? `${productSlug}-${app.id.slice(-6)}` : productSlug;
      product = await tx.agentProduct.create({
        data: {
          slug: finalProductSlug,
          name: app.name,
          description: `${app.name} · ${app.category}`,
          version: version.version,
          author: app.developerAccount.displayName,
          domain: app.category,
          capabilities: JSON.stringify(capabilityIds),
          requiredContext: JSON.stringify(["restaurant_context", "evidence"]),
          workflow: "partner_external",
          outputSchema: JSON.stringify({ maxLevel: 3, ports: ["signal", "insight", "gap"] }),
          manifest: version.manifestJson,
          pricing: productPricing,
          status: "active",
        },
      });
    }

    let listingId = app.listingId;
    let finalListingSlug = listingSlug;
    if (listingId) {
      await tx.agentListing.update({
        where: { id: listingId },
        data: {
          agentProductId: product.id,
          name: app.name,
          description: version.privacyNotes ?? `${app.name}（第三方 Agent）`,
          status: "active",
          visibility: "public",
          pricingModel: listingPricingModel,
          priceCents: listingPricingModel === "free" ? 0 : pricing.priceCents,
          currency: pricing.currency,
          metadata: listingMeta,
        },
      });
      const existingListing = await tx.agentListing.findUnique({ where: { id: listingId } });
      finalListingSlug = existingListing?.slug ?? listingSlug;
    } else {
      listingId = createId("listing");
      const existingSlug = await tx.agentListing.findUnique({ where: { slug: listingSlug } });
      finalListingSlug = existingSlug ? `${listingSlug}-${listingId.slice(-6)}` : listingSlug;
      await tx.agentListing.create({
        data: {
          id: listingId,
          agentProductId: product.id,
          slug: finalListingSlug,
          name: app.name,
          description: version.privacyNotes ?? `${app.name}（第三方 Agent）`,
          status: "active",
          visibility: "public",
          pricingModel: listingPricingModel,
          priceCents: listingPricingModel === "free" ? 0 : pricing.priceCents,
          currency: pricing.currency,
          installCount: 0,
          rating: 0,
          metadata: listingMeta,
        },
      });
    }

    const shares = await tx.revenueShare.findMany({ where: { listingId } });
    if (shares.length === 0) {
      await tx.revenueShare.createMany({
        data: [
          {
            id: `rev_${listingId}_platform`,
            listingId,
            beneficiaryType: "PLATFORM",
            beneficiaryId: "mealkey",
            sharePercent: PLATFORM_SHARE,
            status: "active",
            metadata: JSON.stringify({ source: "partner_publish" }),
          },
          {
            id: `rev_${listingId}_developer`,
            listingId,
            beneficiaryType: "DEVELOPER",
            beneficiaryId: app.developerAccountId,
            sharePercent: DEVELOPER_SHARE,
            status: "active",
            metadata: JSON.stringify({ source: "partner_publish", defaultSplit: "70/30" }),
          },
        ],
      });
    }

    await tx.partnerAgentDraftVersion.update({
      where: { id: version.id },
      data: { releaseChannel: "live" },
    });

    const updatedApp = await tx.partnerAgentApplication.update({
      where: { id: app.id },
      data: {
        lifecycleStatus: "published",
        listingId,
        agentProductId: product.id,
        currentVersionId: version.id,
      },
    });

    if (app.developerAccount.status === "applied") {
      await tx.developerAccount.update({
        where: { id: app.developerAccountId },
        data: { status: "active", verifiedAt: new Date() },
      });
    }

    return {
      application: updatedApp,
      listingId,
      agentProductId: product.id,
      slug: finalListingSlug,
    };
  });
}

export async function decidePartnerReview(input: {
  reviewTaskId: string;
  action: "approve" | "changes_requested" | "reject";
  reviewerUserId: string;
  decisionNote?: string;
}) {
  const task = await prisma.partnerReviewTask.findUnique({
    where: { id: input.reviewTaskId },
  });
  if (!task) throw new DeveloperAccessError("审核任务不存在", 404);
  if (task.status === "approved" || task.status === "rejected") {
    throw new DeveloperAccessError("该审核任务已完结", 400);
  }

  const note = (input.decisionNote ?? "").trim() || null;

  if (input.action === "approve") {
    const published = await publishApprovedApplication({
      applicationId: task.applicationId,
      versionId: task.versionId,
      reviewerUserId: input.reviewerUserId,
    });

    const updated = await prisma.partnerReviewTask.update({
      where: { id: task.id },
      data: {
        status: "approved",
        reviewerUserId: input.reviewerUserId,
        decisionNote: note ?? "审核通过并上架",
        resolvedAt: new Date(),
        checklistJson: JSON.stringify({
          ...JSON.parse(task.checklistJson || "{}"),
          approvedAt: new Date().toISOString(),
          listingId: published.listingId,
        }),
      },
    });

    return {
      task: updated,
      published: {
        listingId: published.listingId,
        agentProductId: published.agentProductId,
        slug: published.slug,
        storePath: `/store/agents/${published.slug}`,
      },
    };
  }

  const nextStatus = input.action === "reject" ? "rejected" : "changes_requested";
  const lifecycleStatus = input.action === "reject" ? "suspended" : "changes_requested";

  const updated = await prisma.partnerReviewTask.update({
    where: { id: task.id },
    data: {
      status: nextStatus,
      reviewerUserId: input.reviewerUserId,
      decisionNote: note ?? (input.action === "reject" ? "审核拒绝" : "需修改后重新提审"),
      resolvedAt: new Date(),
    },
  });

  await prisma.partnerAgentApplication.update({
    where: { id: task.applicationId },
    data: { lifecycleStatus },
  });

  const version = await prisma.partnerAgentDraftVersion.findUnique({
    where: { id: task.versionId },
  });
  if (version && input.action === "changes_requested") {
    await prisma.partnerAgentDraftVersion.update({
      where: { id: version.id },
      data: { releaseChannel: "sandbox" },
    });
  }

  return { task: updated, published: null };
}
