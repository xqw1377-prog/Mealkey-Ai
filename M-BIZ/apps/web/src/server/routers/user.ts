import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { prisma, parseJsonField, stringifyJsonField } from "@/lib/prisma";

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
      })
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

      const existingPreferences = parseJsonField<Record<string, unknown>>(user.preferences) ?? {};
      const onboardingProfile = {
        brandName: input.brandName,
        businessType: input.businessType,
        currentChallenge: input.currentChallenge,
        yearlyGoal: input.yearlyGoal,
        storeCount: input.storeCount || null,
        completedAt: new Date().toISOString(),
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

      const storeHint = input.storeCount ? `当前门店：${input.storeCount}。` : "";
      const mergedProfile = {
        brandName: input.brandName,
        businessType: input.businessType,
        category: input.businessType,
        storeCount: input.storeCount || null,
        strategicSummary: `${input.brandName} 是一家${input.businessType}品牌。${storeHint}眼下最想解决的是“${input.currentChallenge}”。`,
        suggestedAction: "进入第一次战略评审会议，把目标压成可验证决策。",
        currentProblemTitle: input.currentChallenge,
        currentProblemImpact: `战略目标：${input.yearlyGoal}`,
        onboardingSource: "ai_interview_v1",
        onboardingCompletedAt: new Date().toISOString(),
        firstBriefReady: true,
        nextSuggestedRoute: "/mission",
      };

      let projectId = existingProject?.id;

      if (existingProject) {
        const existingProfile = parseJsonField<Record<string, unknown>>(existingProject.profile) ?? {};
        await prisma.project.update({
          where: { id: existingProject.id },
          data: {
            ...(existingProject.name === "我的经营世界" ? { name: input.brandName } : {}),
            category: input.businessType,
            currentGoal: input.yearlyGoal,
            profile: stringifyJsonField({
              ...existingProfile,
              ...mergedProfile,
            }),
          },
        });
      } else {
        const project = await prisma.project.create({
          data: {
            ownerId: owner.id,
            name: input.brandName,
            stage: "idea",
            category: input.businessType,
            currentGoal: input.yearlyGoal,
            profile: stringifyJsonField(mergedProfile),
          },
          select: {
            id: true,
          },
        });
        projectId = project.id;
      }

      const goalParam = encodeURIComponent(input.yearlyGoal || input.currentChallenge);
      return {
        projectId,
        redirectTo: projectId
          ? `/projects/${projectId}/mission?goal=${goalParam}`
          : "/dashboard",
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
      throw new TRPCError({ code: "NOT_FOUND", message: "当前账号下还没有经营世界" });
    }

    const project = await prisma.project.findFirst({
      where: { ownerId: owner.id, status: "active" },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });

    if (!project) {
      throw new TRPCError({ code: "NOT_FOUND", message: "当前账号下还没有可恢复的经营世界" });
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

    return {
      projectId: project.id,
      redirectTo: "/dashboard",
    };
  }),
});
