/**
 * m-ops-diag tRPC — 餐启经营诊断（L3 感知器）
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { validateProfile } from "@/lib/profile-schema";
import {
  runMOpsDiagForProject,
  runMOpsDiagFromProfile,
} from "@/server/services/m-ops-diag-client";

async function requireOwnedProject(userId: string, projectId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, owner: { userId } },
    select: {
      id: true,
      ownerId: true,
      profile: true,
      category: true,
      name: true,
    },
  });
  if (!project) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "项目不存在或无权限",
    });
  }
  return project;
}

const focusSchema = z.enum([
  "service",
  "product",
  "traffic",
  "competition",
  "cost",
  "overall",
]);

export const mOpsDiagRouter = router({
  /** 轻量：仅 profile RIP，可同步预览 */
  previewFromProfile: protectedProcedure
    .input(
      z.object({
        projectId: z.string().min(1),
        allowMockFallback: z.boolean().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const project = await requireOwnedProject(ctx.userId!, input.projectId);
      const profile = validateProfile(project.profile);
      return runMOpsDiagFromProfile({
        projectId: project.id,
        profile,
        category: project.category || undefined,
        allowMockFallback: input.allowMockFallback,
      });
    }),

  /** 完整：Brain 只读 + 可选 live 外采 */
  diagnose: protectedProcedure
    .input(
      z.object({
        projectId: z.string().min(1),
        useLive: z.boolean().optional(),
        allowMockFallback: z.boolean().optional(),
        focus: focusSchema.optional(),
        horizon: z.enum(["today", "7d", "30d"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await requireOwnedProject(ctx.userId!, input.projectId);
      const profile = validateProfile(project.profile);
      return runMOpsDiagForProject(prisma, {
        projectId: project.id,
        ownerId: project.ownerId,
        profile,
        useLive: input.useLive ?? true,
        allowMockFallback: input.allowMockFallback ?? false,
        focus: input.focus,
        horizon: input.horizon,
      });
    }),
});
