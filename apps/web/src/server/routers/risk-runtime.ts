/**
 * Risk Runtime tRPC — 列表 / 确认 / 关闭（不扣经营点，不改战略）
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { validateProfile } from "@/lib/profile-schema";
import {
  listOpenRiskAlerts,
  updateRiskAlertStatus,
} from "@/server/founder-layer/capability/risk/profile";
import { toDecisionRequestCta } from "@/server/founder-layer/capability/risk/decision-request";
import {
  toProfileConflictTRPC,
  updateProjectProfile,
} from "@/server/services/project-profile";

export const riskRuntimeRouter = router({
  listOpen: protectedProcedure
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
      const alerts = listOpenRiskAlerts(profile);
      return {
        alerts,
        ctas: alerts.slice(0, 5).map(toDecisionRequestCta),
      };
    }),

  confirm: protectedProcedure
    .input(z.object({ projectId: z.string(), riskId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, owner: { userId: ctx.userId! } },
        include: { owner: { select: { id: true } } },
      });
      if (!project) {
        throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });
      }
      try {
        await updateProjectProfile(
          project.id,
          (profile) =>
            updateRiskAlertStatus(profile, input.riskId, "reviewing"),
          { ownerId: project.owner.id },
        );
      } catch (error) {
        const conflict = toProfileConflictTRPC(error);
        if (conflict) throw conflict;
        throw error;
      }
      return { ok: true as const };
    }),

  resolve: protectedProcedure
    .input(z.object({ projectId: z.string(), riskId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, owner: { userId: ctx.userId! } },
        include: { owner: { select: { id: true } } },
      });
      if (!project) {
        throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });
      }
      try {
        await updateProjectProfile(
          project.id,
          (profile) =>
            updateRiskAlertStatus(profile, input.riskId, "resolved"),
          { ownerId: project.owner.id },
        );
      } catch (error) {
        const conflict = toProfileConflictTRPC(error);
        if (conflict) throw conflict;
        throw error;
      }
      return { ok: true as const };
    }),
});
