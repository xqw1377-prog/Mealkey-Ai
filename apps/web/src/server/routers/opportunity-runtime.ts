/**
 * Opportunity Runtime tRPC — 列表 / 驳回 / 请求进席（不扣经营点）
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { validateProfile } from "@/lib/profile-schema";
import {
  listOpenOpportunities,
  updateOpportunityStatus,
} from "@/server/founder-layer/capability/opportunity/profile";
import { toOpportunityDecisionRequestCta } from "@/server/founder-layer/capability/opportunity/decision-request";
import {
  toProfileConflictTRPC,
  updateProjectProfile,
} from "@/server/services/project-profile";

export const opportunityRuntimeRouter = router({
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
      const opportunities = listOpenOpportunities(profile);
      return {
        opportunities,
        ctas: opportunities.slice(0, 5).map(toOpportunityDecisionRequestCta),
      };
    }),

  dismiss: protectedProcedure
    .input(z.object({ projectId: z.string(), opportunityId: z.string() }))
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
            updateOpportunityStatus(profile, input.opportunityId, "rejected"),
          { ownerId: project.owner.id },
        );
      } catch (error) {
        const conflict = toProfileConflictTRPC(error);
        if (conflict) throw conflict;
        throw error;
      }
      return { ok: true as const };
    }),

  /** 标记 analyzing + 返回开会 CTA（不代扣） */
  requestReview: protectedProcedure
    .input(z.object({ projectId: z.string(), opportunityId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, owner: { userId: ctx.userId! } },
        include: { owner: { select: { id: true } } },
      });
      if (!project) {
        throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });
      }
      let cta = null as ReturnType<typeof toOpportunityDecisionRequestCta> | null;
      try {
        await updateProjectProfile(
          project.id,
          (profile) => {
            const next = updateOpportunityStatus(
              profile,
              input.opportunityId,
              "analyzing",
            );
            const opp = listOpenOpportunities(next).find(
              (o) => o.id === input.opportunityId,
            );
            // analyzing 仍在 open 列表；若被过滤则从 raw 取
            const raw = Array.isArray(next.openOpportunities)
              ? (next.openOpportunities as Array<{ id: string }>)
              : [];
            const found =
              opp ||
              (raw.find((o) => o.id === input.opportunityId) as
                | Parameters<typeof toOpportunityDecisionRequestCta>[0]
                | undefined);
            if (found && "score" in found) {
              cta = toOpportunityDecisionRequestCta(found);
            }
            return next;
          },
          { ownerId: project.owner.id },
        );
      } catch (error) {
        const conflict = toProfileConflictTRPC(error);
        if (conflict) throw conflict;
        throw error;
      }
      return { ok: true as const, cta };
    }),
});
