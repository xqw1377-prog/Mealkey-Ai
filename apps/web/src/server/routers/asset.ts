import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import {
  ensureDefaultAssetCategories,
  ensureOwner,
  normalizeAssetRecord,
  parseJsonArray,
} from "../services/asset.service";

export const assetRouter = router({
  categories: protectedProcedure
    .query(async ({ ctx }) => {
      const owner = await ensureOwner(prisma, ctx.userId!);
      return ensureDefaultAssetCategories(prisma, owner.id);
    }),

  list: protectedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        conversationId: z.string().optional(),
        categoryId: z.string().optional(),
        kind: z.enum(["audio", "image", "video", "document"]).optional(),
        limit: z.number().min(1).max(100).default(24),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const owner = await ensureOwner(prisma, ctx.userId!);

      const assets = await prisma.asset.findMany({
        where: {
          ownerId: owner.id,
          ...(input?.projectId ? { projectId: input.projectId } : {}),
          ...(input?.conversationId ? { conversationId: input.conversationId } : {}),
          ...(input?.categoryId ? { categoryId: input.categoryId } : {}),
          ...(input?.kind ? { kind: input.kind } : {}),
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: input?.limit ?? 24,
      });

      return assets.map(normalizeAssetRecord);
    }),

  update: protectedProcedure
    .input(
      z.object({
        assetId: z.string(),
        categoryId: z.string().nullable().optional(),
        tags: z.array(z.string()).optional(),
        title: z.string().min(1).max(120).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const owner = await ensureOwner(prisma, ctx.userId!);

      const existing = await prisma.asset.findFirst({
        where: {
          id: input.assetId,
          ownerId: owner.id,
        },
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "资料不存在" });
      }

      const updated = await prisma.asset.update({
        where: { id: input.assetId },
        data: {
          ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
          ...(input.tags ? { tags: JSON.stringify(input.tags) } : {}),
          ...(input.title ? { title: input.title.trim() } : {}),
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      return normalizeAssetRecord(updated);
    }),

  createCategory: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(40),
        slug: z.string().min(1).max(40).regex(/^[a-z0-9-]+$/),
        description: z.string().max(160).optional(),
        scope: z.enum(["owner", "project", "knowledge"]).default("owner"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const owner = await ensureOwner(prisma, ctx.userId!);
      return prisma.assetCategory.upsert({
        where: {
          ownerId_slug: {
            ownerId: owner.id,
            slug: input.slug,
          },
        },
        update: {
          name: input.name.trim(),
          description: input.description?.trim() ?? null,
          scope: input.scope,
        },
        create: {
          ownerId: owner.id,
          name: input.name.trim(),
          slug: input.slug,
          description: input.description?.trim() ?? null,
          scope: input.scope,
        },
      });
    }),

  delete: protectedProcedure
    .input(z.object({ assetId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const owner = await ensureOwner(prisma, ctx.userId!);
      const existing = await prisma.asset.findFirst({
        where: { id: input.assetId, ownerId: owner.id },
      });
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "资料不存在" });
      }
      await prisma.asset.delete({ where: { id: input.assetId } });
      return { id: input.assetId };
    }),
});
