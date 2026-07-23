import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import {
  getReport,
  listReports,
  createReport,
  deleteReport,
} from "../services/report.service";

export const reportRouter = router({
  // 获取单个报告
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { prisma } = await import("../../lib/prisma");
      return getReport(prisma, input.id, ctx.userId!);
    }),

  // 获取项目报告列表
  list: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { prisma } = await import("../../lib/prisma");
      return listReports(prisma, input.projectId, ctx.userId!);
    }),

  // 创建报告
  create: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        type: z.string(),
        title: z.string(),
        summary: z.string().optional(),
        content: z.record(z.unknown()).optional(),
        status: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { prisma } = await import("../../lib/prisma");
      return createReport(prisma, input, ctx.userId!);
    }),

  // 删除报告
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { prisma } = await import("../../lib/prisma");
      return deleteReport(prisma, input.id, ctx.userId!);
    }),
});
