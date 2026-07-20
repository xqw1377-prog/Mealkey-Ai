/**
 * Decision Runtime tRPC — Opinion / Evidence 追加（切片 C）
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import {
  appendDecisionEvidence,
  appendDecisionOpinion,
} from "@/server/founder-layer/capability/decision/opinions";

export const decisionRuntimeRouter = router({
  appendOpinion: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        decisionId: z.string(),
        expert: z.enum(["M-PNT", "M-MKT", "M-BIZ", "M-ED"]),
        position: z.enum(["support", "oppose", "neutral"]),
        reason: z.string().min(1).max(400),
        confidence: z.number().min(0).max(1).optional(),
        evidenceIds: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, owner: { userId: ctx.userId! } },
        select: { id: true },
      });
      if (!project) {
        throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });
      }
      try {
        return await appendDecisionOpinion(prisma, input);
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "追加意见失败",
        });
      }
    }),

  appendEvidence: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        decisionId: z.string(),
        type: z.enum(["market", "financial", "user", "experience", "case"]),
        source: z.string().min(1).max(120),
        content: z.string().min(1).max(400),
        confidence: z.number().min(0).max(1).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, owner: { userId: ctx.userId! } },
        select: { id: true },
      });
      if (!project) {
        throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });
      }
      try {
        return await appendDecisionEvidence(prisma, input);
      } catch (e) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e instanceof Error ? e.message : "追加证据失败",
        });
      }
    }),
});
