/**
 * User Intelligence Evolution tRPC — Profile 投影 / Permission / 信号只读
 * 非顾问席；不扣经营点。
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { validateProfile } from "@/lib/profile-schema";
import {
  toProfileConflictTRPC,
  updateProjectProfile,
} from "@/server/services/project-profile";
import {
  buildFounderIntelligenceProfile,
  buildIndustryContributionCandidate,
  buildIntelligenceBriefSummary,
  extractBrandNamesFromProfile,
  listBehaviorSignals,
  readCouncilWeightHints,
  readMemoryPermissions,
  recallIndustryInsights,
  writeMemoryPermissions,
} from "@/server/founder-layer/intelligence";

async function loadOwnedProject(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, owner: { userId } },
    select: {
      id: true,
      name: true,
      category: true,
      city: true,
      district: true,
      profile: true,
      owner: { select: { id: true, userId: true, name: true } },
    },
  });
  if (!project) {
    throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });
  }
  return project;
}

export const intelligenceRuntimeRouter = router({
  /** Intelligence Profile 完整投影 */
  getProfile: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await loadOwnedProject(ctx.userId!, input.projectId);
      const profile = validateProfile(project.profile) as Record<string, unknown>;
      const intelligence = buildFounderIntelligenceProfile({
        ownerId: project.owner.id,
        projectId: project.id,
        profile,
      });
      return {
        intelligence,
        brief: buildIntelligenceBriefSummary(intelligence),
        councilWeightHints: readCouncilWeightHints(profile),
        signalCount: listBehaviorSignals(profile).length,
      };
    }),

  /** 简报短摘要 */
  getBrief: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await loadOwnedProject(ctx.userId!, input.projectId);
      const profile = validateProfile(project.profile) as Record<string, unknown>;
      const intelligence = buildFounderIntelligenceProfile({
        ownerId: project.owner.id,
        projectId: project.id,
        profile,
      });
      return {
        brief: buildIntelligenceBriefSummary(intelligence),
        confidence: intelligence.confidence,
        permissions: intelligence.permissions,
      };
    }),

  listSignals: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await loadOwnedProject(ctx.userId!, input.projectId);
      const profile = validateProfile(project.profile) as Record<string, unknown>;
      return { signals: listBehaviorSignals(profile).slice(0, 30) };
    }),

  /** 跨租户行业脱敏池召回（无贡献者身份） */
  listIndustryInsights: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        topic: z.string().max(200).optional(),
        limit: z.number().int().min(1).max(12).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const project = await loadOwnedProject(ctx.userId!, input.projectId);
      const insights = await recallIndustryInsights(prisma, {
        category: project.category,
        topic: input.topic,
        limit: input.limit ?? 6,
      });
      return { insights, category: project.category || "餐饮" };
    }),

  /** 预览：若开启行业贡献，本条会如何脱敏（不写库） */
  previewIndustryContribution: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        rule: z.string().min(4).max(400),
        outcome: z
          .enum(["confirmed", "partial", "invalidated", "unknown"])
          .default("confirmed"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const project = await loadOwnedProject(ctx.userId!, input.projectId);
      const profile = validateProfile(project.profile) as Record<string, unknown>;
      const permissions = readMemoryPermissions(profile);
      const candidate = buildIndustryContributionCandidate({
        permissions: {
          ...permissions,
          // 预览时强制按「已开启」展示脱敏结果；实际写入仍看真实权限
          contributeToIndustryModel: true,
        },
        ownerId: project.owner.id,
        category: project.category,
        rule: input.rule,
        outcome: input.outcome,
        sourceKind: "validation",
        projectName: project.name,
        brandNames: extractBrandNamesFromProfile(profile),
        ownerName: project.owner.name,
        city: project.city,
        district: project.district,
      });
      return {
        optIn: permissions.contributeToIndustryModel,
        wouldWrite: Boolean(candidate) && permissions.contributeToIndustryModel,
        preview: candidate
          ? {
              category: candidate.category,
              rule: candidate.rule,
              outcome: candidate.outcome,
              confidence: candidate.confidence,
              anonymized: candidate.anonymized,
            }
          : null,
        note: permissions.contributeToIndustryModel
          ? "已开启行业贡献：验证通过后将写入脱敏池"
          : "当前未开启「用于行业模型」：不会写入跨租户池",
      };
    }),

  /** Memory Permission 更新（可审计 confirmedAt） */
  updatePermissions: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        saveExperience: z.boolean().optional(),
        useForPersonalGrowth: z.boolean().optional(),
        contributeToIndustryModel: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await loadOwnedProject(ctx.userId!, input.projectId);
      try {
        const updated = await updateProjectProfile(
          project.id,
          (latest) =>
            writeMemoryPermissions(latest as Record<string, unknown>, {
              saveExperience: input.saveExperience,
              useForPersonalGrowth: input.useForPersonalGrowth,
              contributeToIndustryModel: input.contributeToIndustryModel,
            }),
          { ownerId: project.owner.id },
        );
        const profile = validateProfile(updated.profile) as Record<
          string,
          unknown
        >;
        const intelligence = buildFounderIntelligenceProfile({
          ownerId: project.owner.id,
          projectId: project.id,
          profile,
        });
        return { ok: true as const, permissions: intelligence.permissions };
      } catch (error) {
        const conflict = toProfileConflictTRPC(error);
        if (conflict) throw conflict;
        throw error;
      }
    }),
});
