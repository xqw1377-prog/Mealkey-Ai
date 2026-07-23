import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import {
  getProject,
  listProjects,
  createProject,
  updateProject,
  deleteProject,
} from "../services/project.service";

export const projectRouter = router({
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return getProject(prisma, input.id, ctx.userId!);
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return listProjects(prisma, ctx.userId!);
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        stage: z.string().optional(),
        city: z.string().optional(),
        district: z.string().optional(),
        category: z.string().optional(),
        target: z.string().optional(),
        budget: z.number().optional(),
        profile: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createProject(prisma, input, ctx.userId!);
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        stage: z.string().optional(),
        city: z.string().optional(),
        district: z.string().optional(),
        category: z.string().optional(),
        target: z.string().optional(),
        budget: z.number().optional(),
        status: z.string().optional(),
        profile: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return updateProject(prisma, id, data, ctx.userId!);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return deleteProject(prisma, input.id, ctx.userId!);
    }),
});
