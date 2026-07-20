/**
 * Memory Runtime tRPC — recallForDecision（不扣经营点）
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { validateProfile } from "@/lib/profile-schema";
import { recallForDecision } from "@/server/founder-layer/memory";

export const memoryRuntimeRouter = router({
  recallForDecision: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        topic: z.string().optional(),
        limit: z.number().int().min(1).max(12).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, owner: { userId: ctx.userId! } },
        include: { owner: { select: { id: true } } },
      });
      if (!project) {
        throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });
      }
      const profile = validateProfile(project.profile) as Record<string, unknown>;
      const recall = await recallForDecision(prisma, {
        ownerId: project.owner.id,
        projectId: project.id,
        topic: input.topic,
        profile,
        limit: input.limit,
      });
      return { recall };
    }),
});
