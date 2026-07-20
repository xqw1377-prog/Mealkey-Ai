/**
 * Execution Runtime tRPC — DecisionExecution 读模型 + 偏航检测
 * 非第五顾问席；不扣经营点。
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { validateProfile } from "@/lib/profile-schema";
import {
  applyDeviationToProfile,
  buildDecisionExecutionView,
  createExecutionFromDecision,
  detectDeviation,
  rebuildActionPlan,
} from "@/server/founder-layer/capability";
import {
  normalizeValidationTask,
  type ValidationTask,
} from "@/server/founder-layer/validation";
import {
  toProfileConflictTRPC,
  updateProjectProfile,
} from "@/server/services/project-profile";

function asTasks(raw: unknown): ValidationTask[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === "object" && "id" in item)
    .map((item) => normalizeValidationTask(item as ValidationTask));
}

export const executionRuntimeRouter = router({
  /**
   * 从已批准 Decision 创建/刷新执行计划（E1）
   * 硬门禁：mkStatus ∈ APPROVED|EXECUTING|VALIDATING；decisionId = Prisma id
   */
  createFromDecision: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        decisionId: z.string(),
        nextActions: z.array(z.string().max(200)).max(6).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, owner: { userId: ctx.userId! } },
        include: { owner: { select: { id: true } } },
      });
      if (!project) {
        throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });
      }

      const profile = validateProfile(project.profile) as Record<string, unknown>;
      let created: Awaited<ReturnType<typeof createExecutionFromDecision>>;
      try {
        created = await createExecutionFromDecision(prisma, {
          projectId: project.id,
          ownerId: project.owner.id,
          decisionId: input.decisionId,
          profile,
          nextActions: input.nextActions,
        });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "创建执行失败";
        if (
          message.includes("decisionId") ||
          message.includes("mkStatus") ||
          message.includes("已批准") ||
          message.includes("不存在")
        ) {
          throw new TRPCError({ code: "BAD_REQUEST", message });
        }
        throw error;
      }

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
        decisionId: created.result.decisionId,
        mkStatus: created.result.mkStatus,
        actionPlan: created.result.actionPlan,
        validationTask: created.result.validationTask,
        sourceEventId: created.result.sourceEventId,
      };
    }),

  /**
   * E5：同决策边界内重建今日三动作（不改战略 / 不换 decisionId）
   */
  rebuildActionPlan: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        decisionId: z.string(),
        nextActions: z.array(z.string().max(200)).max(6).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, owner: { userId: ctx.userId! } },
        include: { owner: { select: { id: true } } },
      });
      if (!project) {
        throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });
      }

      const decision = await prisma.decision.findFirst({
        where: { id: input.decisionId, projectId: project.id },
        select: { id: true, judgement: true, action: true },
      });
      if (!decision) {
        throw new TRPCError({ code: "NOT_FOUND", message: "决策不存在" });
      }

      let rebuilt: ReturnType<typeof rebuildActionPlan>["result"];
      try {
        await updateProjectProfile(
          project.id,
          (profile) => {
            const out = rebuildActionPlan({
              profile: profile as Record<string, unknown>,
              decisionId: input.decisionId,
              nextActions: input.nextActions,
              judgement: decision.judgement,
              action: decision.action,
            });
            rebuilt = out.result;
            return out.nextProfile;
          },
          { ownerId: project.owner.id },
        );
      } catch (error) {
        const conflict = toProfileConflictTRPC(error);
        if (conflict) throw conflict;
        const message =
          error instanceof Error ? error.message : "重建行动失败";
        if (
          message.includes("禁止") ||
          message.includes("decisionId") ||
          message.includes("尚无")
        ) {
          throw new TRPCError({ code: "BAD_REQUEST", message });
        }
        throw error;
      }

      return {
        ok: true as const,
        decisionId: rebuilt!.decisionId,
        actionPlan: rebuilt!.actionPlan,
        preservedDoneCount: rebuilt!.preservedDoneCount,
      };
    }),

  /** 投影今日/指定决策的执行读模型 */
  getDecisionExecution: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        decisionId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, owner: { userId: ctx.userId! } },
        select: { id: true, profile: true },
      });
      if (!project) {
        throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });
      }
      const profile = validateProfile(project.profile) as Record<string, unknown>;
      return {
        execution: buildDecisionExecutionView({
          projectId: project.id,
          profile,
          decisionId: input.decisionId,
        }),
      };
    }),

  /** 主动跑偏航检测并写回 suggestedNextMeeting（中高 severity） */
  runDeviationCheck: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        validationTaskId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, owner: { userId: ctx.userId! } },
        include: { owner: { select: { id: true } } },
      });
      if (!project) {
        throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });
      }

      let report = null as ReturnType<typeof detectDeviation>;
      try {
        await updateProjectProfile(
          project.id,
          (profile) => {
            const tasks = asTasks(profile.validationTasks);
            const task = tasks.find(
              (t) =>
                t.id === input.validationTaskId ||
                t.taskId === input.validationTaskId,
            );
            if (!task) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "验证任务不存在",
              });
            }
            report = detectDeviation({
              projectId: project.id,
              task,
            });
            if (!report) return profile;
            return applyDeviationToProfile(profile, report, {
              ownerId: project.owner.id,
            });
          },
          { ownerId: project.owner.id },
        );
      } catch (error) {
        const conflict = toProfileConflictTRPC(error);
        if (conflict) throw conflict;
        throw error;
      }

      return { ok: true as const, deviation: report };
    }),

  /** 最近偏航（读 profile） */
  listDeviations: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, owner: { userId: ctx.userId! } },
        select: { id: true, profile: true },
      });
      if (!project) {
        throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });
      }
      const profile = validateProfile(project.profile) as Record<string, unknown>;
      const last = profile.lastDeviationReport;
      const items = last && typeof last === "object" ? [last] : [];
      return { items };
    }),
});
