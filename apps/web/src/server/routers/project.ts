import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { validateProfile } from "@/lib/profile-schema";
import {
  brandHasConsultingArchive,
  ensureBrandRegistry,
  switchActiveBrandInProfile,
  upsertBrandInProfile,
  clearAllConsultingStateFromProfile,
} from "@/lib/brand-registry";
import {
  getProject,
  listProjects,
  createProject,
  updateProject,
  deleteProject,
} from "../services/project.service";
import {
  toProfileConflictTRPC,
  updateProjectProfile,
} from "@/server/services/project-profile";
import {
  identityExternalReady,
  parseLocationLine,
  storeCountFromBand,
  type BusinessIdentityV1,
} from "@/server/founder-layer/contracts/business-identity";
import { createRestaurantBrainService } from "@/server/restaurant-brain/service";

export const projectRouter = router({
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return getProject(prisma, input.id, ctx.userId!);
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return listProjects(prisma, ctx.userId!);
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        stage: z.string().optional(),
        city: z.string().optional(),
        district: z.string().optional(),
        category: z.string().optional(),
        target: z.string().optional(),
        budget: z.number().optional(),
        profile: z.record(z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return createProject(prisma, input, ctx.userId!);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        stage: z.string().optional(),
        city: z.string().optional(),
        district: z.string().optional(),
        category: z.string().optional(),
        target: z.string().optional(),
        budget: z.number().optional(),
        status: z.string().optional(),
        profile: z.record(z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return updateProject(prisma, id, data, ctx.userId!);
    }),

  listBrands: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, owner: { userId: ctx.userId! } },
        select: { id: true, name: true, profile: true },
      });
      if (!project) {
        throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });
      }
      const profile = validateProfile(project.profile) as Record<string, unknown>;
      let ensured = ensureBrandRegistry(profile, project.name);
      if (!Array.isArray(profile.brands) || profile.brands.length === 0) {
        try {
          const written = await updateProjectProfile(project.id, (latest) => {
            ensured = ensureBrandRegistry(latest, project.name);
            return ensured.profile;
          });
          if (written) ensured = ensureBrandRegistry(written.profile, project.name);
        } catch (error) {
          const conflict = toProfileConflictTRPC(error);
          if (conflict) throw conflict;
          throw error;
        }
      }
      const { view, profile: next } = ensured;
      const brands = [...view.brands].sort((a, b) => {
        const ta = a.lastActiveAt || a.updatedAt || "";
        const tb = b.lastActiveAt || b.updatedAt || "";
        return tb.localeCompare(ta);
      });
      return {
        enterpriseName: project.name,
        ...view,
        brands,
        brandsMeta: brands.map((b) => ({
          id: b.id,
          hasConsultingArchive: brandHasConsultingArchive(next, b.id),
          lastActiveAt: b.lastActiveAt || null,
        })),
      };
    }),

  upsertBrand: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        id: z.string().optional(),
        brandName: z.string().min(1).max(80),
        category: z.string().max(80).optional(),
        mentalPosition: z.string().max(200).optional(),
        targetCustomers: z.string().max(200).optional(),
        priceRange: z.string().max(80).optional(),
        differentiation: z.string().max(200).optional(),
        brandTonality: z.string().max(80).optional(),
        oneLiner: z.string().max(200).optional(),
        setActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, owner: { userId: ctx.userId! } },
        select: { id: true, name: true, profile: true },
      });
      if (!project) {
        throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });
      }
      let brandResult: ReturnType<typeof upsertBrandInProfile>["brand"] | null = null;
      let materialChanged = false;
      let view = ensureBrandRegistry(
        validateProfile(project.profile) as Record<string, unknown>,
        project.name,
      ).view;

      try {
        await updateProjectProfile(
          project.id,
          (profile) => {
            const before = ensureBrandRegistry(profile, project.name).view.activeBrand;
            let { profile: next, brand } = upsertBrandInProfile(
              profile,
              {
                id: input.id,
                brandName: input.brandName,
                category: input.category,
                mentalPosition: input.mentalPosition,
                targetCustomers: input.targetCustomers,
                priceRange: input.priceRange,
                differentiation: input.differentiation,
                brandTonality: input.brandTonality,
                oneLiner: input.oneLiner,
              },
              project.name,
            );
            if (input.setActive !== false) {
              next = switchActiveBrandInProfile(next, brand.id, project.name).profile;
            }

            // 同品牌改名/改品类/改心智等：必须清定位卷宗，否则正文仍是旧品牌
            materialChanged =
              Boolean(before) &&
              before!.id === brand.id &&
              (before!.brandName !== brand.brandName ||
                (before!.category || "") !== (brand.category || "") ||
                (before!.mentalPosition || "") !== (brand.mentalPosition || "") ||
                (before!.targetCustomers || "") !== (brand.targetCustomers || "") ||
                (before!.oneLiner || "") !== (brand.oneLiner || "") ||
                (before!.differentiation || "") !== (brand.differentiation || ""));

            if (materialChanged) {
              next = clearAllConsultingStateFromProfile(next);
              next.mPntConsultingClearedReason = "brand_material_edit";
            }

            brandResult = brand;
            view = ensureBrandRegistry(next, project.name).view;
            return next;
          },
          {
            extraData: (_current, next) => {
              const active = ensureBrandRegistry(next, project.name).view.activeBrand;
              return active?.category ? { category: active.category } : {};
            },
          },
        );
      } catch (error) {
        const conflict = toProfileConflictTRPC(error);
        if (conflict) throw conflict;
        throw error;
      }

      if (!brandResult) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "品牌保存失败" });
      }
      return { brand: brandResult, ...view, consultingCleared: materialChanged };
    }),

  switchBrand: protectedProcedure
    .input(z.object({ projectId: z.string(), brandId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, owner: { userId: ctx.userId! } },
        select: { id: true, name: true, profile: true },
      });
      if (!project) {
        throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });
      }
      try {
        let view = ensureBrandRegistry(
          validateProfile(project.profile) as Record<string, unknown>,
          project.name,
        ).view;
        await updateProjectProfile(
          project.id,
          (profile) => {
            const switched = switchActiveBrandInProfile(
              profile,
              input.brandId,
              project.name,
            );
            view = switched.view;
            return switched.profile;
          },
          {
            extraData: (_current, next) => {
              const active = ensureBrandRegistry(next, project.name).view.activeBrand;
              return active?.category ? { category: active.category } : {};
            },
          },
        );
        return view;
      } catch (error) {
        const conflict = toProfileConflictTRPC(error);
        if (conflict) throw conflict;
        throw new TRPCError({ code: "NOT_FOUND", message: "品牌不存在" });
      }
    }),

  /** Business Identity 补档（品牌/地理必采） */
  saveBusinessIdentity: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        objectName: z.string().min(1).max(80),
        brandName: z.string().min(1).max(80),
        location: z.string().min(1).max(160),
        scope: z
          .enum(["store", "brand", "multi_brand", "region"])
          .default("store"),
        storeCountBand: z.enum(["1", "2-5", "5+"]).default("1"),
        focus: z
          .enum(["growth", "profit", "org", "product", "expansion"])
          .default("growth"),
        decisionHorizon: z.enum(["short", "mid", "long"]).default("mid"),
        biggestProblem: z.string().max(300).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, owner: { userId: ctx.userId! } },
        select: { id: true, ownerId: true, profile: true },
      });
      if (!project) {
        throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });
      }
      const loc = parseLocationLine(input.location);
      if (!loc.city) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "请填写城市或门店地址",
        });
      }
      const prev =
        (validateProfile(project.profile) as Record<string, unknown>)
          .businessIdentity as BusinessIdentityV1 | undefined;
      const identity: BusinessIdentityV1 = {
        schemaVersion: 1,
        scope: input.scope,
        objectName: input.objectName.trim(),
        brandName: input.brandName.trim(),
        city: loc.city,
        district: loc.district,
        address: loc.address,
        storeCountBand: input.storeCountBand,
        storeCountApprox: storeCountFromBand(input.storeCountBand),
        focus: input.focus,
        decisionHorizon: input.decisionHorizon,
        biggestProblem:
          input.biggestProblem?.trim() || prev?.biggestProblem || "",
        externalIntelReady: false,
        completedAt: new Date().toISOString(),
        source: "identity_intake_v1",
      };
      identity.externalIntelReady = identityExternalReady(identity);

      try {
        await updateProjectProfile(
          project.id,
          (profile) => ({
            ...profile,
            brandName: identity.brandName,
            objectName: identity.objectName,
            city: identity.city,
            district: identity.district || null,
            address: identity.address || null,
            storeCount: String(identity.storeCountApprox),
            businessIdentity: identity,
            currentProblemTitle:
              identity.biggestProblem || profile.currentProblemTitle,
          }),
          {
            ownerId: project.ownerId,
            extraData: () => ({
              name: identity.objectName,
              city: identity.city,
              district: identity.district || undefined,
            }),
          },
        );
      } catch (error) {
        const conflict = toProfileConflictTRPC(error);
        if (conflict) throw conflict;
        throw error;
      }

      try {
        const brain = createRestaurantBrainService(prisma);
        const snap = await brain.ensureByProject({
          projectId: project.id,
          ownerId: project.ownerId,
        });
        const locationLine = [identity.city, identity.district]
          .filter(Boolean)
          .join(" · ");
        await prisma.restaurant.update({
          where: { id: snap.restaurant.id },
          data: { name: identity.brandName.slice(0, 80) },
        });
        await prisma.restaurantProfile.update({
          where: { restaurantId: snap.restaurant.id },
          data: {
            city: locationLine.slice(0, 80),
            storeCount: identity.storeCountApprox,
          },
        });
      } catch {
        // Brain 同步失败不阻断
      }

      return { ok: true as const, identity };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return deleteProject(prisma, input.id, ctx.userId!);
    }),
});
