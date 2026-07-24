/**
 * 会议进行中草稿读写 — 挂在 Project.profile.activeMeeting
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { validateProfile } from "@/lib/profile-schema";
import { ActiveMeetingDraftSchema } from "@/lib/meeting-session";
import {
  toProfileConflictTRPC,
  updateProjectProfile,
} from "@/server/services/project-profile";

export const meetingSessionRouter = router({
  get: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, owner: { userId: ctx.userId! } },
        select: { profile: true },
      });
      if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });

      const profile = validateProfile(project.profile) as Record<string, unknown>;
      const raw = profile.activeMeeting;
      if (!raw || typeof raw !== "object") return null;

      const parsed = ActiveMeetingDraftSchema.safeParse(raw);
      if (!parsed.success) return null;
      if (parsed.data.status !== "draft") return null;
      return parsed.data;
    }),

  save: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        draft: ActiveMeetingDraftSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, owner: { userId: ctx.userId! } },
        select: { id: true, ownerId: true },
      });
      if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });

      let updatedAt = new Date().toISOString();
      try {
        await updateProjectProfile(
          project.id,
          (prefs) => {
            updatedAt = new Date().toISOString();
            return {
              ...prefs,
              activeMeeting: {
                ...input.draft,
                status: "draft" as const,
                updatedAt,
              },
            };
          },
          { ownerId: project.ownerId },
        );
      } catch (error) {
        const conflict = toProfileConflictTRPC(error);
        if (conflict) throw conflict;
        throw error;
      }

      return { ok: true as const, updatedAt };
    }),

  clear: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, owner: { userId: ctx.userId! } },
        select: { id: true, ownerId: true },
      });
      if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });

      try {
        await updateProjectProfile(
          project.id,
          (prefs) => {
            if (!("activeMeeting" in prefs)) return null;
            const { activeMeeting: _removed, ...rest } = prefs;
            return rest;
          },
          { ownerId: project.ownerId },
        );
      } catch (error) {
        const conflict = toProfileConflictTRPC(error);
        if (conflict) throw conflict;
        throw error;
      }

      return { ok: true as const };
    }),

  /** 轻量会议历史：复用 Memory 表 founder_meeting_* */
  listHistory: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        limit: z.number().min(1).max(20).default(8),
      }),
    )
    .query(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, owner: { userId: ctx.userId! } },
        select: { id: true, ownerId: true },
      });
      if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });

      const rows = await prisma.memory.findMany({
        where: {
          ownerId: project.ownerId,
          projectId: project.id,
          type: "MEETING",
          key: { startsWith: `founder_meeting_${project.id}_` },
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
        select: {
          id: true,
          key: true,
          content: true,
          createdAt: true,
        },
      });

      return rows.map((row) => {
        let summary = "会商摘要";
        let topic = "经营咨询";
        let recommendation: string | undefined;
        try {
          const parsed = JSON.parse(row.content) as {
            summary?: string;
            payload?: { topic?: string; recommendation?: string };
          };
          summary = parsed.summary || summary;
          topic = parsed.payload?.topic || summary.slice(0, 48) || topic;
          recommendation = parsed.payload?.recommendation;
        } catch {
          summary = row.content.slice(0, 120);
        }
        return {
          id: row.id,
          key: row.key,
          topic,
          summary,
          recommendation,
          createdAt: row.createdAt.toISOString(),
        };
      });
    }),
});
