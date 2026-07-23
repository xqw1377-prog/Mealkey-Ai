import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { prisma, parseJsonField, stringifyJsonField } from "@/lib/prisma";
import {
  toProfileConflictTRPC,
  updateProjectProfile,
} from "@/server/services/project-profile";
import {
  identityExternalReady,
  storeCountFromBand,
  type BusinessIdentityV1,
} from "@/server/founder-layer/contracts/business-identity";
import { syncBrandFactsToRestaurantBrain } from "@/server/restaurant-brain/sync-brand-facts";
import { createRestaurantBrainService } from "@/server/restaurant-brain/service";
import {
  generateIdentityOnlyRip,
  needsRipConfirmGate,
  readRipStore,
  ripPagePath,
} from "@/server/founder-layer/capability/restaurant-intelligence/profile-service";
import { validateProfile } from "@/lib/profile-schema";

export const userRouter = router({
  // 获取用户信息
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.userId! },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        onboarded: true,
        preferences: true,
      },
    });

    if (!user) return null;

    return {
      ...user,
      preferences: parseJsonField(user.preferences),
    };
  }),

  // 更新偏好（通用 JSON）
  updatePreferences: protectedProcedure
    .input(z.record(z.unknown()))
    .mutation(async ({ ctx, input }) => {
      return prisma.user.update({
        where: { id: ctx.userId! },
        data: {
          preferences: stringifyJsonField(input),
          onboarded: true,
        },
      });
    }),

  completeOnboarding: protectedProcedure
    .input(
      z.object({
        brandName: z.string().min(1).max(80),
        businessType: z.string().min(1).max(120),
        currentChallenge: z.string().min(1).max(300),
        yearlyGoal: z.string().min(1).max(300),
        storeCount: z.string().min(1).max(40).optional(),
        objectName: z.string().min(1).max(80).optional(),
        scope: z
          .enum(["store", "brand", "multi_brand", "region"])
          .optional(),
        city: z.string().min(1).max(80).optional(),
        district: z.string().max(80).optional(),
        address: z.string().max(160).optional(),
        storeCountBand: z.enum(["1", "2-5", "5+"]).optional(),
        focus: z
          .enum(["growth", "profit", "org", "product", "expansion"])
          .optional(),
        decisionHorizon: z.enum(["short", "mid", "long"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const user = await prisma.user.findUnique({
        where: { id: ctx.userId! },
        select: {
          id: true,
          name: true,
          email: true,
          preferences: true,
        },
      });

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });
      }

      const owner = await prisma.owner.upsert({
        where: { userId: ctx.userId! },
        update: {
          name: user.name ?? undefined,
          email: user.email ?? undefined,
        },
        create: {
          userId: ctx.userId!,
          name: user.name,
          email: user.email,
        },
        select: {
          id: true,
        },
      });

      const band = input.storeCountBand || "1";
      const objectName = input.objectName?.trim() || input.brandName;
      const city = input.city?.trim() || "";
      const businessIdentity: BusinessIdentityV1 = {
        schemaVersion: 1,
        scope: input.scope || "store",
        objectName,
        brandName: input.brandName.trim(),
        city,
        district: input.district?.trim() || undefined,
        address: input.address?.trim() || undefined,
        storeCountBand: band,
        storeCountApprox: storeCountFromBand(band),
        focus: input.focus || "growth",
        decisionHorizon: input.decisionHorizon || "mid",
        biggestProblem: input.currentChallenge.trim(),
        externalIntelReady: false,
        completedAt: new Date().toISOString(),
        source: "identity_intake_v1",
      };
      businessIdentity.externalIntelReady =
        identityExternalReady(businessIdentity);

      const existingPreferences =
        parseJsonField<Record<string, unknown>>(user.preferences) ?? {};
      const onboardingProfile = {
        brandName: input.brandName,
        businessType: input.businessType,
        currentChallenge: input.currentChallenge,
        yearlyGoal: input.yearlyGoal,
        storeCount: input.storeCount || String(businessIdentity.storeCountApprox),
        city: businessIdentity.city || null,
        district: businessIdentity.district || null,
        scope: businessIdentity.scope,
        focus: businessIdentity.focus,
        completedAt: new Date().toISOString(),
        source: "identity_intake_v1",
      };

      await prisma.user.update({
        where: { id: ctx.userId! },
        data: {
          onboarded: true,
          preferences: stringifyJsonField({
            ...existingPreferences,
            onboarding: onboardingProfile,
          }),
        },
      });

      const existingProject = await prisma.project.findFirst({
        where: { ownerId: owner.id },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          profile: true,
        },
      });

      const storeHint = `当前门店约 ${businessIdentity.storeCountApprox} 家。`;
      const locHint = businessIdentity.city
        ? `主战场：${[businessIdentity.city, businessIdentity.district]
            .filter(Boolean)
            .join(" · ")}。`
        : "";
      const mergedProfile = {
        brandName: businessIdentity.brandName,
        objectName: businessIdentity.objectName,
        businessType: input.businessType,
        category: input.businessType,
        storeCount: String(businessIdentity.storeCountApprox),
        city: businessIdentity.city || null,
        district: businessIdentity.district || null,
        address: businessIdentity.address || null,
        businessIdentity,
        strategicSummary: `${businessIdentity.objectName}（品牌 ${businessIdentity.brandName}）是一家${input.businessType}生意。${storeHint}${locHint}眼下最想解决的是“${input.currentChallenge}”。`,
        suggestedAction: "进入今日经营驾驶舱，先看今天该关注什么。",
        currentProblemTitle: input.currentChallenge,
        currentProblemImpact: `战略目标：${input.yearlyGoal}`,
        onboardingSource: "identity_intake_v1",
        onboardingCompletedAt: new Date().toISOString(),
        firstBriefReady: true,
        nextSuggestedRoute: "/dashboard",
      };

      let projectId = existingProject?.id;
      const withAgentRoute = (id: string) => ({
        ...mergedProfile,
        nextSuggestedRoute: `/projects/${id}/agent`,
      });

      if (existingProject) {
        try {
          await updateProjectProfile(
            existingProject.id,
            (existingProfile) => ({
              ...existingProfile,
              ...withAgentRoute(existingProject.id),
            }),
            {
              ownerId: owner.id,
              extraData: () => ({
                name:
                  existingProject.name === "我的经营世界"
                    ? businessIdentity.objectName
                    : existingProject.name,
                category: input.businessType,
                currentGoal: input.yearlyGoal,
                city: businessIdentity.city || undefined,
                district: businessIdentity.district || undefined,
              }),
            },
          );
        } catch (error) {
          const conflict = toProfileConflictTRPC(error);
          if (conflict) throw conflict;
          throw error;
        }
      } else {
        const project = await prisma.project.create({
          data: {
            ownerId: owner.id,
            name: businessIdentity.objectName,
            stage: "idea",
            category: input.businessType,
            currentGoal: input.yearlyGoal,
            city: businessIdentity.city || null,
            district: businessIdentity.district || null,
            profile: stringifyJsonField(mergedProfile),
          },
          select: {
            id: true,
          },
        });
        projectId = project.id;
        await prisma.project.update({
          where: { id: project.id },
          data: {
            profile: stringifyJsonField(withAgentRoute(project.id)),
          },
        });
      }

      if (projectId) {
        try {
          await syncBrandFactsToRestaurantBrain(prisma, {
            projectId,
            ownerId: owner.id,
            source: "onboarding",
            confidence: 0.75,
            brandName: businessIdentity.brandName,
            category: input.businessType,
          });
          const brain = createRestaurantBrainService(prisma);
          const snap = await brain.ensureByProject({
            projectId,
            ownerId: owner.id,
          });
          const locationLine = [
            businessIdentity.city,
            businessIdentity.district,
          ]
            .filter(Boolean)
            .join(" · ");
          if (locationLine || businessIdentity.storeCountApprox) {
            await prisma.restaurantProfile.update({
              where: { restaurantId: snap.restaurant.id },
              data: {
                ...(locationLine ? { city: locationLine.slice(0, 80) } : {}),
                storeCount: businessIdentity.storeCountApprox,
              },
            });
          }
        } catch {
          // Brain 同步失败不阻断开户
        }

        try {
          await generateIdentityOnlyRip({
            projectId,
            ownerId: owner.id,
            identity: businessIdentity,
            category: input.businessType,
          });
        } catch {
          // 画像生成失败不阻断开户；页面可再触发生成
        }
      }

      // Phase 1：基础信息收集完成后进对话 Agent（画像可在对话侧继续确认）
      return {
        projectId,
        redirectTo: projectId
          ? `/projects/${projectId}/agent`
          : "/onboarding",
      };
    }),

  resumeWorkspace: protectedProcedure.mutation(async ({ ctx }) => {

    const user = await prisma.user.findUnique({
      where: { id: ctx.userId! },
      select: {
        id: true,
        preferences: true,
      },
    });

    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "用户不存在" });
    }

    const owner = await prisma.owner.findUnique({
      where: { userId: ctx.userId! },
      select: { id: true },
    });

    if (!owner) {
      throw new TRPCError({ code: "NOT_FOUND", message: "当前账号下还没有企业" });
    }

    const project = await prisma.project.findFirst({
      where: { ownerId: owner.id, status: "active" },
      orderBy: { updatedAt: "desc" },
      select: { id: true, profile: true },
    });

    if (!project) {
      throw new TRPCError({ code: "NOT_FOUND", message: "当前账号下还没有可恢复的企业" });
    }

    const existingPreferences = parseJsonField<Record<string, unknown>>(user.preferences) ?? {};
    const onboarding =
      typeof existingPreferences.onboarding === "object" && existingPreferences.onboarding
        ? (existingPreferences.onboarding as Record<string, unknown>)
        : {};

    await prisma.user.update({
      where: { id: ctx.userId! },
      data: {
        onboarded: true,
        preferences: stringifyJsonField({
          ...existingPreferences,
          onboarding: {
            ...onboarding,
            restoredAt: new Date().toISOString(),
          },
        }),
      },
    });

    const profile = validateProfile(project.profile) as Record<string, unknown>;
    const needsRip = needsRipConfirmGate(readRipStore(profile));

    return {
      projectId: project.id,
      redirectTo: needsRip
        ? ripPagePath(project.id)
        : `/projects/${project.id}/agent`,
    };
  }),
});
