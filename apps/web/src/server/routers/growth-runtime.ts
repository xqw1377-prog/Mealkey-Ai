/**
 * Growth Runtime tRPC — 认知差距 / Decision Pattern / 成长路径读模型
 * 非 M-GROW 顾问席；不扣经营点。
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { validateProfile } from "@/lib/profile-schema";
import { buildGrowthRuntimeSnapshot } from "@/server/founder-layer/capability";
import { listGrowthEvents } from "@/server/founder-layer/capability/growth/events";
import { listGrowthTasks } from "@/server/founder-layer/capability/growth/tasks";

export const growthRuntimeRouter = router({
  /** 投影 Growth Runtime 快照（验证回写后更有内容） */
  getSnapshot: protectedProcedure
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
      return {
        growth: buildGrowthRuntimeSnapshot(profile),
      };
    }),

  listEvents: protectedProcedure
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
      return { events: listGrowthEvents(profile).slice(0, 30) };
    }),

  listTasks: protectedProcedure
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
      return { tasks: listGrowthTasks(profile).slice(0, 12) };
    }),
});
