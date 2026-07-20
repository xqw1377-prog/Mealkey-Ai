/**
 * M-MKT 市场 Agent Procedures
 * 从 agent.ts 拆分
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import {
  buildMarketSnapshot,
  snapshotFromMMktBlob,
  snapshotFromProjectMarketProfile,
} from "@/lib/market";
import { buildMarketProtocolProjection } from "@/lib/runtime-projections/marketProtocol";
import { safeParseJson } from "@mealkey/agent-sdk";
import { mMktManifest, saveMarketFeedback } from "@/server/services/m-mkt.service";

function buildMarketSignalsForProjection(snapshot: ReturnType<typeof snapshotFromProjectMarketProfile>) {
  if (!snapshot) return [];
  if (snapshot.pageOutput.gaps.length > 0) return snapshot.pageOutput.gaps;
  return [
    {
      title: "消费趋势变化",
      summary: snapshot.pageOutput.marketStructure.trendSummary,
      confidence: snapshot.pageOutput.scores.timing,
    },
    {
      title: "竞争空位判断",
      summary: snapshot.pageOutput.competition.homogenization,
      confidence: snapshot.pageOutput.scores.gap,
    },
  ];
}

export function createMarketProcedures() {
  return {
    marketMeta: protectedProcedure.query(() => ({
      agentId: mMktManifest.id,
      name: mMktManifest.name,
      version: mMktManifest.version,
      description: mMktManifest.description,
      capabilities: mMktManifest.capabilities,
      steps: [
        { id: "health", name: "机会评分", type: "analysis" },
        { id: "structure", name: "市场结构", type: "analysis" },
        { id: "gap", name: "空位判断", type: "analysis" },
        { id: "decision", name: "进入决策", type: "decision" },
      ],
    })),

    marketHistory: protectedProcedure
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
            OR: [{ type: "market" }, { agentId: "m-mkt" }],
          },
          orderBy: { createdAt: "desc" },
          take: input.limit,
        });
      }),

    marketReports: protectedProcedure
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
          where: { projectId: input.projectId, type: "market" },
          orderBy: { createdAt: "desc" },
          take: input.limit,
        });
      }),

    latestMarket: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.ownerId) return null;
        const project = await prisma.project.findFirst({
          where: { id: input.projectId, ownerId: ctx.ownerId },
        });
        if (!project) return null;

        const profile =
          (safeParseJson(project.profile) as Record<string, unknown> | null) || {};
        const fromProfile = snapshotFromProjectMarketProfile(profile);
        if (fromProfile?.source === "profile" && profile.mMkt) {
          return fromProfile;
        }

        const decision = await prisma.decision.findFirst({
          where: {
            ownerId: ctx.ownerId,
            projectId: input.projectId,
            OR: [{ type: "market" }, { agentId: "m-mkt" }],
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

        return buildMarketSnapshot({
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

    marketFeedback: protectedProcedure
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
        await saveMarketFeedback(prisma, {
          ownerId: ctx.ownerId,
          decisionId: input.decisionId,
          helpful: input.helpful,
          comment: input.comment,
          projectId: input.projectId,
        });
        return { ok: true };
      }),

    marketContext: protectedProcedure
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
        const current = snapshotFromProjectMarketProfile(profile);
        const previous =
          snapshotFromMMktBlob(
            (profile.mMktPrevious as Record<string, unknown> | undefined) || undefined,
            "profile",
          ) || null;
        const history = Array.isArray(profile.mMktHistory)
          ? (profile.mMktHistory as Record<string, unknown>[])
              .map((item) => snapshotFromMMktBlob(item, "profile"))
              .filter((item): item is NonNullable<typeof item> => Boolean(item))
          : [];

        const currentBlob =
          (profile.mMkt as Record<string, unknown> | undefined) || undefined;
        const pageOutput =
          currentBlob && typeof currentBlob.pageOutput === "object"
            ? currentBlob.pageOutput
            : currentBlob && typeof currentBlob.page_output === "object"
              ? currentBlob.page_output
              : null;
        const reports = await prisma.report.findMany({
          where: { projectId: input.projectId, type: "market" },
          orderBy: { createdAt: "desc" },
          take: 2,
        });
        const protocolProjection = buildMarketProtocolProjection({
          project: { name: project.name, category: project.category, stage: project.stage },
          snapshot: current,
          signals: buildMarketSignalsForProjection(current),
          history: history.map((item) => ({
            judgement: item.oneLiner,
            problem: item.problem,
            createdAt: item.updatedAt || new Date().toISOString(),
          })),
          reports: reports.map((item) => ({ title: item.title, summary: item.summary })),
        });

        return { current, previous, history, pageOutput, protocolProjection };
      }),
  };
}
