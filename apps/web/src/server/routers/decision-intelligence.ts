/**
 * Decision Intelligence tRPC — 第二家店闭环
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
  openExpansionCase,
  getExpansionCaseBundle,
  refreshExpansionContext,
  markDeliberating,
  founderDecideExpansion,
  commitExpansionExecution,
  recordExpansionLearning,
  findOpenExpansionCase,
} from "@/server/founder-layer/capability/decision-intelligence";

async function requireProject(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, owner: { userId } },
    include: { owner: { select: { id: true, name: true } } },
  });
  if (!project) {
    throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });
  }
  return project;
}

export const decisionIntelligenceRouter = router({
  /** 打开/复用「第二家店」Decision Case */
  openExpansionCase: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        forceNew: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await requireProject(ctx.userId!, input.projectId);
      try {
        const bundle = await openExpansionCase(prisma, {
          projectId: project.id,
          ownerId: project.owner.id,
          forceNew: input.forceNew,
        });
        return { ok: true as const, ...bundle };
      } catch (e) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: e instanceof Error ? e.message : "打开决策失败",
        });
      }
    }),

  getExpansionCase: protectedProcedure
    .input(z.object({ projectId: z.string(), decisionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await requireProject(ctx.userId!, input.projectId);
      const bundle = await getExpansionCaseBundle(prisma, {
        projectId: project.id,
        ownerId: project.owner.id,
        decisionId: input.decisionId,
      });
      if (!bundle) {
        throw new TRPCError({ code: "NOT_FOUND", message: "决策案例不存在" });
      }
      return bundle;
    }),

  findOpenExpansion: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await requireProject(ctx.userId!, input.projectId);
      const c = await findOpenExpansionCase(
        prisma,
        project.id,
        project.owner.id,
      );
      return { case: c };
    }),

  refreshContext: protectedProcedure
    .input(z.object({ projectId: z.string(), decisionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await requireProject(ctx.userId!, input.projectId);
      return refreshExpansionContext(prisma, {
        projectId: project.id,
        ownerId: project.owner.id,
        decisionId: input.decisionId,
      });
    }),

  startDeliberation: protectedProcedure
    .input(z.object({ projectId: z.string(), decisionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await requireProject(ctx.userId!, input.projectId);
      return markDeliberating(prisma, {
        projectId: project.id,
        ownerId: project.owner.id,
        decisionId: input.decisionId,
      });
    }),

  founderDecide: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        decisionId: z.string(),
        optionId: z.string(),
        mode: z.enum(["accept", "modify", "insist"]),
        founderReason: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await requireProject(ctx.userId!, input.projectId);
      try {
        return await founderDecideExpansion(prisma, {
          projectId: project.id,
          ownerId: project.owner.id,
          decisionId: input.decisionId,
          optionId: input.optionId,
          mode: input.mode,
          founderReason: input.founderReason,
        });
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "裁决失败",
        });
      }
    }),

  commitExecution: protectedProcedure
    .input(z.object({ projectId: z.string(), decisionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await requireProject(ctx.userId!, input.projectId);
      const profile = validateProfile(project.profile) as Record<string, unknown>;
      try {
        const created = await commitExpansionExecution(prisma, {
          projectId: project.id,
          ownerId: project.owner.id,
          decisionId: input.decisionId,
          profile,
        });
        try {
          await updateProjectProfile(
            project.id,
            () => created.nextProfile,
            { ownerId: project.owner.id },
          );
        } catch (error) {
          const conflict = toProfileConflictTRPC(error);
          if (conflict) throw conflict;
          throw error;
        }
        return {
          ok: true as const,
          actionPlan: created.result.actionPlan,
          validationTask: created.result.validationTask,
          mkStatus: created.result.mkStatus,
        };
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "创建执行失败",
        });
      }
    }),

  recordLearning: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        decisionId: z.string(),
        actualResult: z.string().min(4).max(500),
        successBand: z.enum(["success", "partial", "fail"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await requireProject(ctx.userId!, input.projectId);
      return recordExpansionLearning(prisma, {
        projectId: project.id,
        ownerId: project.owner.id,
        decisionId: input.decisionId,
        actualResult: input.actualResult,
        successBand: input.successBand,
      });
    }),
});
