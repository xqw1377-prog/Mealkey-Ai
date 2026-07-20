/**
 * M-ED 股权 Agent Procedures
 * 从 agent.ts 拆分
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import {
  buildEquitySnapshot,
  snapshotFromMEDBlob,
  snapshotFromProjectEquityProfile,
} from "@/lib/equity";
import { buildEquityProtocolProjection } from "@/lib/runtime-projections/equityProtocol";
import { safeParseJson } from "@mealkey/agent-sdk";
import { mEdManifest, saveEquityFeedback } from "@/server/services/m-ed.service";

export function createEquityProcedures() {
  return {
    equityMeta: protectedProcedure.query(() => ({
      agentId: mEdManifest.id,
      name: mEdManifest.name,
      version: mEdManifest.version,
      description: mEdManifest.description,
      capabilities: mEdManifest.capabilities,
      steps: [
        { id: "health", name: "股权健康扫描", type: "analysis" },
        { id: "profile", name: "结构画像", type: "analysis" },
        { id: "scenario", name: "方案模拟", type: "simulation" },
        { id: "decision", name: "最终判断", type: "decision" },
      ],
    })),

    equityHistory: protectedProcedure
      .input(z.object({
        projectId: z.string(),
        limit: z.number().min(1).max(50).default(10),
      }))
      .query(async ({ ctx, input }) => {
        if (!ctx.ownerId) return [];
        const project = await prisma.project.findFirst({
          where: { id: input.projectId, ownerId: ctx.ownerId },
          select: { id: true },
        });
        if (!project) return [];

        return prisma.decision.findMany({
          where: {
            ownerId: ctx.ownerId,
            projectId: input.projectId,
            OR: [{ type: "equity" }, { agentId: "m-ed" }],
          },
          orderBy: { createdAt: "desc" },
          take: input.limit,
        });
      }),

    equityReports: protectedProcedure
      .input(z.object({
        projectId: z.string(),
        limit: z.number().min(1).max(20).default(5),
      }))
      .query(async ({ ctx, input }) => {
        if (!ctx.ownerId) return [];
        const project = await prisma.project.findFirst({
          where: { id: input.projectId, ownerId: ctx.ownerId },
          select: { id: true },
        });
        if (!project) return [];

        return prisma.report.findMany({
          where: { projectId: input.projectId, type: "equity" },
          orderBy: { createdAt: "desc" },
          take: input.limit,
        });
      }),

    latestEquity: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.ownerId) return null;
        const project = await prisma.project.findFirst({
          where: { id: input.projectId, ownerId: ctx.ownerId },
        });
        if (!project) return null;

        const profile =
          (safeParseJson(project.profile) as Record<string, unknown> | null) || {};
        const fromProfile = snapshotFromProjectEquityProfile(profile);
        if (fromProfile?.source === "profile" && profile.mEd) {
          return fromProfile;
        }

        const decision = await prisma.decision.findFirst({
          where: {
            ownerId: ctx.ownerId,
            projectId: input.projectId,
            OR: [{ type: "equity" }, { agentId: "m-ed" }],
          },
          orderBy: { createdAt: "desc" },
        });
        if (!decision) return fromProfile;

        let structured: Record<string, unknown> | null = null;
        try {
          const evidence = JSON.parse(decision.evidence || "[]") as Array<{ source?: string; content?: string }>;
          const hit = evidence.find((item) => item.source === "structured");
          if (hit?.content) {
            structured = JSON.parse(hit.content) as Record<string, unknown>;
          }
        } catch {
          structured = null;
        }

        return buildEquitySnapshot({
          decisionId: decision.id,
          problem: decision.problem,
          observation: decision.observation,
          diagnosis: decision.diagnosis,
          judgement: decision.judgement,
          strategy: decision.strategy,
          action: decision.action,
          confidence: decision.confidence,
          structured,
          source: "decision",
          updatedAt: decision.createdAt.toISOString(),
        });
      }),

    equityFeedback: protectedProcedure
      .input(z.object({
        decisionId: z.string(),
        projectId: z.string(),
        helpful: z.boolean(),
        comment: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.ownerId) {
          throw new TRPCError({ code: "NOT_FOUND", message: "经营者信息不存在" });
        }
        await saveEquityFeedback(prisma, {
          ownerId: ctx.ownerId,
          decisionId: input.decisionId,
          helpful: input.helpful,
          comment: input.comment,
          projectId: input.projectId,
        });
        return { ok: true };
      }),

    equityContext: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.ownerId) {
          return { current: null, previous: null, history: [] as unknown[], pageOutput: null, protocolProjection: null };
        }

        const project = await prisma.project.findFirst({
          where: { id: input.projectId, ownerId: ctx.ownerId },
        });
        if (!project) {
          return { current: null, previous: null, history: [] as unknown[], pageOutput: null, protocolProjection: null };
        }

        const profile =
          (safeParseJson(project.profile) as Record<string, unknown> | null) || {};
        const current = snapshotFromProjectEquityProfile(profile);
        const previous =
          snapshotFromMEDBlob(
            (profile.mEdPrevious as Record<string, unknown> | undefined) || undefined,
            "profile",
          ) || null;
        const history = Array.isArray(profile.mEdHistory)
          ? (profile.mEdHistory as Record<string, unknown>[])
              .map((item) => snapshotFromMEDBlob(item, "profile"))
              .filter((item): item is NonNullable<typeof item> => Boolean(item))
          : [];

        const currentBlob =
          (profile.mEd as Record<string, unknown> | undefined) || undefined;
        const pageOutput =
          currentBlob && typeof currentBlob.pageOutput === "object"
            ? currentBlob.pageOutput
            : currentBlob && typeof currentBlob.page_output === "object"
              ? currentBlob.page_output
              : null;
        const reports = await prisma.report.findMany({
          where: { projectId: input.projectId, type: "equity" },
          orderBy: { createdAt: "desc" },
          take: 2,
        });

        return {
          current,
          previous,
          history,
          pageOutput,
          protocolProjection: buildEquityProtocolProjection({
            project: { name: project.name, category: project.category, stage: project.stage },
            snapshot: current,
            pageOutput: current?.pageOutput ?? null,
            previous,
            intake: { plan: "", concern: "", goal: "" },
            scenarios: current?.pageOutput.scenarios ?? [],
            history: history.map((item) => ({
              judgement: item.oneLiner,
              problem: item.problem,
              createdAt: item.updatedAt || new Date().toISOString(),
            })),
            reports: reports.map((item) => ({ title: item.title, summary: item.summary })),
            committee: current?.pageOutput.committee ?? [],
          }),
        };
      }),
  };
}
