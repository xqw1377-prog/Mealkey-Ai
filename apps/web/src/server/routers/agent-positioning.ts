/**
 * M-PNT 定位 Agent Procedures
 * 从 agent.ts 拆分
 */
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { mPntWorkflow, mPntManifest, readStructured } from "@mealkey/agents";
import {
  buildPositioningSnapshot,
  diffPositioningSnapshots,
  snapshotFromMPntBlob,
  snapshotFromProjectProfile,
} from "@/lib/positioning";
import { ensureBrandRegistry } from "@/lib/brand-registry";
import { getFounderDecisionSnapshot } from "@/lib/founder-decision-snapshot";
import { buildPositioningProtocolProjection } from "@/lib/runtime-projections/positioningProtocol";
import { safeParseJson } from "@mealkey/agent-sdk";
import { savePositioningFeedback } from "@/server/services/m-pnt.service";
import { snapshotFromProjectMarketProfile } from "@/lib/market";
import { ensureProjectionStringArray } from "./agent-common";

function normalizePositioningMarketResearchForProjection(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  return {
    summary: raw.summary ? String(raw.summary) : raw.market_summary ? String(raw.market_summary) : undefined,
    opportunities: ensureProjectionStringArray(raw.opportunities ?? raw.opportunityGaps ?? raw.opportunity_gaps),
  };
}

function normalizePositioningCandidatesForProjection(value: unknown, snapshot: Record<string, any> | null) {
  if (Array.isArray(value) && value.length > 0) {
    return value.reduce<Array<{
      id: string;
      title: string;
      fit?: string;
      why?: string;
      risk?: string;
      tag?: string;
    }>>((acc, item, index) => {
      if (!item || typeof item !== "object") return acc;
      const obj = item as Record<string, unknown>;
      const title = String(obj.title ?? obj.name ?? obj.direction ?? obj.positioning ?? "").trim();
      if (!title) return acc;
      acc.push({
        id: String(obj.id ?? obj.code ?? `candidate-${index + 1}`),
        title,
        fit: obj.fit ? String(obj.fit) : obj.scenario ? String(obj.scenario) : undefined,
        why: obj.why ? String(obj.why) : obj.reason ? String(obj.reason) : undefined,
        risk: obj.risk ? String(obj.risk) : undefined,
        tag: obj.tag ? String(obj.tag) : index === 0 ? "优先方向" : "候选方向",
      });
      return acc;
    }, []);
  }
  if (!snapshot) return [];

  const derived = [
    {
      id: "current",
      title: snapshot.oneLiner,
      fit: snapshot.brandPositioning?.targetCustomers ?? "优先服务当前目标客群",
      why: snapshot.strategy ?? snapshot.diagnosis ?? "沿用当前定位主方向。",
      risk: snapshot.risks?.[0]?.risk ?? "仍需验证用户是否真正买单。",
      tag: "当前主方向",
    },
    snapshot.brandPositioning?.differentiation
      ? {
          id: "differentiation",
          title: `放大 ${snapshot.brandPositioning.differentiation}`,
          fit: snapshot.brandPositioning.priceRange ?? "适合当前价格带测试",
          why: snapshot.brandPositioning.differentiation,
          risk: snapshot.risks?.[1]?.risk ?? "如果差异点不被感知，传播会失焦。",
          tag: "差异化测试",
        }
      : null,
    snapshot.nextSteps?.[0]?.step
      ? {
          id: "execution",
          title: "先做小范围执行验证",
          fit: snapshot.nextSteps[0].timeline ?? "适合先做 30 天实验",
          why: snapshot.nextSteps[0].step,
          risk: snapshot.validation?.killCriteria?.[0] ?? "验证不足时不要直接放大投入。",
          tag: "执行验证",
        }
      : null,
  ].filter(Boolean);

  return derived.slice(0, 3) as Array<{
    id: string;
    title: string;
    fit?: string;
    why?: string;
    risk?: string;
    tag?: string;
  }>;
}

function normalizePositioningTheoryCardsForProjection(theoryViews: unknown, theorySummary: unknown) {
  const labelMap: Record<string, string> = {
    ries: "心智官视角",
    trout: "空位官视角",
    ye_maozhong: "冲突官视角",
  };
  const recommendMap: Record<string, string> = {
    strong_recommend: "强支持",
    recommend: "支持",
    weak_recommend: "保留",
    not_recommend: "反对",
  };

  if (theoryViews && typeof theoryViews === "object") {
    const raw = theoryViews as Record<string, unknown>;
    const cards = Object.entries(raw).reduce<Array<{
      key: string;
      label: string;
      preferred: string;
      recommend: string;
      reason?: string;
      attack?: string;
    }>>((acc, [key, value]) => {
      if (!value || typeof value !== "object") return acc;
      const obj = value as Record<string, unknown>;
      acc.push({
        key,
        label: labelMap[key] ?? key,
        preferred: String(obj.preferred ?? obj.direction ?? obj.summary ?? obj.positioning ?? "").trim(),
        recommend: String(obj.recommendation ?? obj.theory_recommend ?? obj.vote ?? "已评估"),
        reason: obj.reason
          ? String(obj.reason)
          : obj.support_reason
            ? String(obj.support_reason)
            : ensureProjectionStringArray(obj.reasons ?? obj.support_points)[0],
        attack: obj.attack
          ? String(obj.attack)
          : obj.challenge
            ? String(obj.challenge)
            : ensureProjectionStringArray(obj.attacks ?? obj.attack_points ?? obj.against)[0],
      });
      return acc;
    }, []);
    if (cards.length > 0) return cards;
  }

  return Object.entries((theorySummary as Record<string, any>) ?? {}).map(([key, value]) => ({
    key,
    label: labelMap[key] ?? key,
    preferred: value?.preferred ?? "本轮未形成清晰偏好",
    recommend: recommendMap[value?.theory_recommend ?? ""] ?? "已评估",
    reason: value?.preferred ? `更支持这条方向：${value.preferred}` : undefined,
  }));
}

export function createPositioningProcedures() {
  return {
    /** M-PNT 产品元信息 */
    positioningMeta: protectedProcedure.query(() => ({
      agentId: mPntManifest.id,
      name: mPntManifest.name,
      version: mPntManifest.version,
      description: mPntManifest.description,
      capabilities: mPntManifest.capabilities,
      steps: mPntWorkflow.steps.map((s) => ({
        id: s.id,
        name: s.name,
        type: s.type,
      })),
    })),

    /** 项目下的定位决策历史 */
    positioningHistory: protectedProcedure
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
            OR: [{ type: "positioning" }, { agentId: "m-pnt" }],
          },
          orderBy: { createdAt: "desc" },
          take: input.limit,
        });
      }),

    /** 定位报告列表 */
    positioningReports: protectedProcedure
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
          where: { projectId: input.projectId, type: "positioning" },
          orderBy: { createdAt: "desc" },
          take: input.limit,
        });
      }),

    /** 最新定位快照 */
    latestPositioning: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.ownerId) return null;

        const project = await prisma.project.findFirst({
          where: { id: input.projectId, ownerId: ctx.ownerId },
        });
        if (!project) return null;

        const profile =
          (safeParseJson(project.profile) as Record<string, unknown> | null) || {};
        const fromProfile = snapshotFromProjectProfile(profile, project.target);
        if (fromProfile?.source === "profile" && profile.mPnt) {
          return fromProfile;
        }

        const decision = await prisma.decision.findFirst({
          where: {
            ownerId: ctx.ownerId,
            projectId: input.projectId,
            OR: [{ type: "positioning" }, { agentId: "m-pnt" }],
          },
          orderBy: { createdAt: "desc" },
        });

        if (decision) {
          let structured: Record<string, unknown> | null = null;
          try {
            const evidence = JSON.parse(decision.evidence || "[]") as Array<{ source?: string; content?: string }>;
            const hit = evidence.find((e) => e.source === "structured");
            if (hit?.content) {
              structured = JSON.parse(hit.content) as Record<string, unknown>;
            }
          } catch {
            structured = null;
          }
          if (!structured) {
            try {
              structured =
                readStructured({
                  id: decision.id,
                  problem: decision.problem,
                  observation: decision.observation,
                  diagnosis: decision.diagnosis,
                  judgement: decision.judgement,
                  strategy: decision.strategy,
                  action: decision.action,
                  confidence: decision.confidence,
                  evidence: JSON.parse(decision.evidence || "[]"),
                } as Parameters<typeof readStructured>[0]) ?? null;
            } catch {
              structured = null;
            }
          }

          return buildPositioningSnapshot({
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
        }

        return fromProfile;
      }),

    /** 定位反馈 */
    positioningFeedback: protectedProcedure
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
        await savePositioningFeedback(prisma, {
          ownerId: ctx.ownerId,
          decisionId: input.decisionId,
          helpful: input.helpful,
          comment: input.comment,
          projectId: input.projectId,
        });
        return { ok: true };
      }),

    /** 定位上下文（含品牌注册、diff、投影） */
    positioningContext: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .query(async ({ ctx, input }) => {
        if (!ctx.ownerId) {
          return { current: null, previous: null, diff: null, history: [] as unknown[], protocolProjection: null };
        }

        const project = await prisma.project.findFirst({
          where: { id: input.projectId, ownerId: ctx.ownerId },
        });
        if (!project) {
          return { current: null, previous: null, diff: null, history: [] as unknown[], protocolProjection: null };
        }

        const profile =
          (safeParseJson(project.profile) as Record<string, unknown> | null) || {};
        let ensured = ensureBrandRegistry(profile, project.name);
        if (!Array.isArray(profile.brands) || profile.brands.length === 0) {
          const { updateProjectProfile } = await import("@/server/services/project-profile");
          const written = await updateProjectProfile(project.id, (latest) => {
            ensured = ensureBrandRegistry(latest, project.name);
            return ensured.profile;
          });
          if (written) ensured = ensureBrandRegistry(written.profile, project.name);
        }
        const syncedProfile = ensured.profile;
        const active = ensured.view.activeBrand;

        const founderSnapshot = getFounderDecisionSnapshot(syncedProfile);
        let current =
          snapshotFromMPntBlob(
            syncedProfile.mPnt as Record<string, unknown> | undefined,
            "profile",
          ) || snapshotFromProjectProfile(syncedProfile, project.target);

        if (current && active) {
          current = {
            ...current,
            brandPositioning: {
              ...(current.brandPositioning || {}),
              brandName: active.brandName,
              category: active.category || current.brandPositioning?.category,
              mentalPosition: active.mentalPosition || current.brandPositioning?.mentalPosition,
              targetCustomers: active.targetCustomers || current.brandPositioning?.targetCustomers,
              priceRange: active.priceRange || current.brandPositioning?.priceRange,
              differentiation: active.differentiation || current.brandPositioning?.differentiation,
              brandTonality: active.brandTonality || current.brandPositioning?.brandTonality,
            },
            oneLiner: active.oneLiner || current.oneLiner,
          };
        }

        const latestMarket = snapshotFromProjectMarketProfile(syncedProfile);
        const previous =
          snapshotFromMPntBlob(
            (syncedProfile.mPntPrevious as Record<string, unknown> | undefined) || undefined,
            "profile",
          ) || null;

        const history = Array.isArray(syncedProfile.mPntHistory)
          ? (syncedProfile.mPntHistory as Record<string, unknown>[])
              .map((b) => snapshotFromMPntBlob(b, "profile"))
              .filter((item): item is NonNullable<typeof item> => Boolean(item))
          : [];

        const currentBlob =
          (syncedProfile.mPnt as Record<string, unknown> | undefined) || undefined;
        const pageOutput =
          currentBlob && typeof currentBlob.pageOutput === "object"
            ? currentBlob.pageOutput
            : currentBlob && typeof currentBlob.page_output === "object"
              ? currentBlob.page_output
              : null;
        const marketResearch =
          currentBlob && typeof currentBlob.marketResearch === "object"
            ? currentBlob.marketResearch
            : pageOutput && typeof (pageOutput as Record<string, unknown>).marketResearch === "object"
              ? (pageOutput as Record<string, unknown>).marketResearch
              : null;
        const candidates =
          Array.isArray(currentBlob?.candidates)
            ? currentBlob?.candidates
            : pageOutput && Array.isArray((pageOutput as Record<string, unknown>).candidates)
              ? (pageOutput as Record<string, unknown>).candidates
              : [];
        const theoryViews =
          currentBlob && typeof currentBlob.theoryViews === "object"
            ? currentBlob.theoryViews
            : null;
        const crossFire =
          currentBlob && typeof currentBlob.crossFire === "object"
            ? currentBlob.crossFire
            : pageOutput && typeof (pageOutput as Record<string, unknown>).crossFire === "object"
              ? (pageOutput as Record<string, unknown>).crossFire
              : null;
        const synthesis =
          currentBlob && typeof currentBlob.synthesis === "object"
            ? currentBlob.synthesis
            : pageOutput && typeof (pageOutput as Record<string, unknown>).synthesis === "object"
              ? (pageOutput as Record<string, unknown>).synthesis
              : null;
        const sharedMarketHandoff =
          founderSnapshot.marketContext?.handoffPayload &&
          typeof founderSnapshot.marketContext.handoffPayload === "object"
            ? {
                opportunityId: founderSnapshot.marketContext.opportunityId,
                handoffPayload: founderSnapshot.marketContext.handoffPayload,
                createdAt: founderSnapshot.marketContext.updatedAt,
              }
            : null;
        const profileMarketHandoff = latestMarket?.pageOutput.opportunityCard?.handoffPayload
          ? {
              opportunityId: latestMarket.pageOutput.opportunityCard.opportunityId,
              handoffPayload: latestMarket.pageOutput.opportunityCard.handoffPayload,
              createdAt: latestMarket.updatedAt,
            }
          : null;
        const reports = await prisma.report.findMany({
          where: { projectId: input.projectId, type: "positioning" },
          orderBy: { createdAt: "desc" },
          take: 2,
        });
        const normalizedMarketResearch = normalizePositioningMarketResearchForProjection(marketResearch);
        const normalizedCandidates = normalizePositioningCandidatesForProjection(candidates, current as Record<string, any> | null);
        const normalizedTheoryCards = normalizePositioningTheoryCardsForProjection(
          theoryViews,
          current?.theoryVoteSummary,
        );
        const protocolProjection = buildPositioningProtocolProjection({
          project: { name: project.name, category: project.category, city: project.city },
          brandName: current?.brandPositioning?.brandName ?? project.name,
          categoryName: current?.brandPositioning?.category ?? project.category ?? "",
          cityName: project.city ?? "",
          audience: current?.brandPositioning?.targetCustomers ?? "",
          differentiation: current?.brandPositioning?.differentiation ?? "",
          snapshot: current,
          leadCandidate: normalizedCandidates[0],
          history: history.map((item) => ({
            judgement: item.oneLiner,
            strategy: item.strategy,
            createdAt: item.updatedAt || new Date().toISOString(),
          })),
          reports: reports.map((item) => ({ title: item.title, summary: item.summary })),
          marketResearch: normalizedMarketResearch,
          theoryCards: normalizedTheoryCards,
          candidates: normalizedCandidates,
        });

        return {
          current,
          previous,
          diff: diffPositioningSnapshots(previous, current),
          history,
          pageOutput,
          marketResearch,
          candidates,
          theoryViews,
          crossFire,
          synthesis,
          marketHandoff: sharedMarketHandoff || profileMarketHandoff,
          protocolProjection,
        };
      }),
  };
}
