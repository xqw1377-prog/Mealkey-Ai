/**
 * Dashboard Router — 薄路由层
 *
 * 业务逻辑见 `../services/dashboard.service.ts`
 */
import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { prisma, parseJsonField } from "@/lib/prisma";
import { listProjects } from "../services/project.service";
import {
  getProjectInsightBundle,
  getPreferredProjectBundle,
  getKnowledgeNodesForBundle,
  getOwnerBundle,
  buildDashboardHome,
  buildProjectOverview,
  buildScorecard,
  buildReportSnapshot,
  buildKnowledgeCenter,
  buildAdvisorWorkspace,
  buildProjectKnowledge,
  buildOwnerPortrait,
} from "../services/dashboard.service";
import { toDailyScanV1 } from "@/server/founder-layer/capability/decision-center/daily-scan";
import { createRestaurantBrainService } from "@/server/restaurant-brain/service";
import { extractConsultingMeetingFacts } from "../services/consulting-meeting-facts";
import {
  toProfileConflictTRPC,
  updateProjectProfile,
} from "../services/project-profile";
import {
  assertActionTransition,
  nextToggleActionStatus,
} from "@/server/founder-layer/capability";
import {
  buildExecutionFollowthroughSignal,
  estimateActionPlanCompletion,
  ingestSignalsAndEvolve,
} from "@/server/founder-layer/intelligence";
import type { DecisionHorizonV1 } from "@/server/founder-layer/contracts/business-identity";
import { ensureDailyRipRefresh } from "@/server/founder-layer/capability/restaurant-intelligence/ensure-daily-refresh";
import { TRPCError } from "@trpc/server";

// 兼容旧 REST 路由的 re-export
export {
  getProjectInsightBundle,
  getPreferredProjectBundle,
  getKnowledgeNodesForBundle,
  getOwnerBundle,
  buildProjectOverview,
  buildReportSnapshot,
  buildKnowledgeCenter,
  buildOwnerPortrait,
} from "../services/dashboard.service";

/**
 * 合并 getHome 和 getDailyScan 的共享逻辑
 */
export async function resolveHomeData(
  ctx: { userId?: string; ownerId?: string },
  projectId?: string,
  includeDailyScan: boolean = true,
) {
  const projects = await listProjects(prisma, ctx.userId!);
  if (projects.length === 0) {
    return { currentProject: null, home: null, dailyScan: null };
  }

  const currentProject =
    projects.find((p) => p.id === projectId) ?? projects[0];
  const bundle = await getProjectInsightBundle(prisma, ctx.userId!, currentProject.id);
  if (!bundle) {
    return { currentProject: null, home: null, dailyScan: null };
  }

  const home = buildDashboardHome(bundle);
  let understandingScore: number | undefined;
  let dataCompleteness: number | undefined;

  if (includeDailyScan) {
    try {
      if (ctx.ownerId) {
        const brain = createRestaurantBrainService(prisma);
        const snap = await brain.ensureByProject({
          projectId: currentProject.id,
          ownerId: ctx.ownerId,
        });
        understandingScore = snap.evolution.understandingScore;
        dataCompleteness = snap.evolution.dataCompleteness;
      }
    } catch {
      // Brain 不可用时 Scan 仍可投影
    }
  }

  const profileRaw =
    typeof currentProject.profile === "string"
      ? parseJsonField<Record<string, unknown>>(currentProject.profile)
      : currentProject.profile && typeof currentProject.profile === "object"
        ? (currentProject.profile as Record<string, unknown>)
        : null;

  // E1：确认画像后，打开驾驶舱时节流日更（每天一次）
  let profile = profileRaw;
  if (includeDailyScan && ctx.ownerId && profile) {
    try {
      const category =
        (typeof profile.category === "string" && profile.category) ||
        currentProject.category ||
        undefined;
      const ensured = await ensureDailyRipRefresh({
        projectId: currentProject.id,
        ownerId: ctx.ownerId,
        profile,
        category: category || undefined,
      });
      profile = ensured.profile;
    } catch {
      // 日更失败不阻断驾驶舱
    }
  }

  const bi =
    profile && typeof profile.businessIdentity === "object"
      ? (profile.businessIdentity as Record<string, unknown>)
      : null;

  const decisionHorizon: DecisionHorizonV1 | null =
    bi?.decisionHorizon === "short" ||
    bi?.decisionHorizon === "mid" ||
    bi?.decisionHorizon === "long"
      ? bi.decisionHorizon
      : null;

  let recentDecisions: Array<{
    id: string;
    problem: string | null;
    judgement: string | null;
    outcome: string | null;
  }> = [];
  if (includeDailyScan) {
    try {
      recentDecisions = await prisma.decision.findMany({
        where: { projectId: currentProject.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          problem: true,
          judgement: true,
          outcome: true,
        },
      });
    } catch {
      recentDecisions = [];
    }
  }

  const scanContext = {
    projectId: currentProject.id,
    restaurantName: currentProject.name,
    understandingScore,
    dataCompleteness,
    brandName:
      (typeof bi?.brandName === "string" && bi.brandName) ||
      (typeof profile?.brandName === "string" && profile.brandName) ||
      currentProject.name,
    city:
      (typeof bi?.city === "string" && bi.city) || currentProject.city || null,
    district:
      (typeof bi?.district === "string" && bi.district) ||
      currentProject.district ||
      null,
    focusProblem:
      (typeof bi?.biggestProblem === "string" && bi.biggestProblem) ||
      (typeof profile?.currentProblemTitle === "string" &&
        profile.currentProblemTitle) ||
      null,
    decisionHorizon,
    profile: profile || null,
    recentDecisions,
  };

  return {
    currentProject: bundle.project,
    home: includeDailyScan ? { ...home, dailyScan: toDailyScanV1(home, scanContext) } : home,
    dailyScan: includeDailyScan ? toDailyScanV1(home, scanContext) : null,
  };
}

export const dashboardRouter = router({
  getHome: protectedProcedure
    .input(z.object({ projectId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const result = await resolveHomeData(ctx, input?.projectId, true);
      return {
        currentProject: result.currentProject,
        home: result.home,
      };
    }),

  /** Decision Center：每日经营扫描（与 getHome 同源，薄封装） */
  getDailyScan: protectedProcedure
    .input(z.object({ projectId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const result = await resolveHomeData(ctx, input?.projectId, true);
      return {
        currentProject: result.currentProject,
        dailyScan: result.dailyScan,
      };
    }),

  getProjectOverview: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const bundle = await getProjectInsightBundle(prisma, ctx.userId!, input.projectId);
      if (!bundle) {
        return {
          currentProject: null,
          overview: null,
        };
      }

      return {
        currentProject: bundle.project,
        overview: buildProjectOverview(bundle),
      };
    }),

  getScorecard: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const bundle = await getProjectInsightBundle(prisma, ctx.userId!, input.projectId);
      if (!bundle) {
        return {
          currentProject: null,
          scorecard: null,
        };
      }

      return {
        currentProject: bundle.project,
        scorecard: buildScorecard(bundle),
      };
    }),

  getReportSnapshot: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const bundle = await getProjectInsightBundle(prisma, ctx.userId!, input.projectId);
      if (!bundle) {
        return {
          currentProject: null,
          report: null,
        };
      }

      return {
        currentProject: bundle.project,
        report: buildReportSnapshot(bundle),
      };
    }),

  getKnowledgeCenter: protectedProcedure
    .input(z.object({ projectId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const { bundle } = await getPreferredProjectBundle(prisma, ctx.userId!, input?.projectId);
      if (!bundle) {
        return {
          currentProject: null,
          insight: null,
        };
      }
      const normalizedNodes = await getKnowledgeNodesForBundle(prisma, bundle);

      return {
        currentProject: bundle.project,
        insight: buildKnowledgeCenter(bundle, normalizedNodes),
      };
    }),

  getAdvisorWorkspace: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const bundle = await getProjectInsightBundle(prisma, ctx.userId!, input.projectId);
      if (!bundle) {
        return {
          currentProject: null,
          workspace: null,
        };
      }

      const profile =
        (bundle.project.profile as Record<string, unknown> | null) || {};
      const consultingFacts = extractConsultingMeetingFacts(profile);

      return {
        currentProject: bundle.project,
        workspace: buildAdvisorWorkspace(bundle, {
          consultingFactLines: consultingFacts.lines,
          storeVisitFactCount: consultingFacts.storeVisitCount,
        }),
      };
    }),

  getProjectKnowledge: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const bundle = await getProjectInsightBundle(prisma, ctx.userId!, input.projectId);
      if (!bundle) {
        return {
          currentProject: null,
          insight: null,
        };
      }

      const normalizedNodes = await getKnowledgeNodesForBundle(prisma, bundle);
      const hasKnowledgeContext =
        normalizedNodes.length > 0 || bundle.decisions.length > 0 || Boolean(bundle.latestReport);

      return {
        currentProject: bundle.project,
        insight: hasKnowledgeContext ? buildProjectKnowledge(bundle, normalizedNodes) : null,
      };
    }),

  getOwnerPortrait: protectedProcedure.query(async ({ ctx }) => {
    const [{ bundle, projects }, user, owner] = await Promise.all([
      getPreferredProjectBundle(prisma, ctx.userId!),
      prisma.user.findUnique({
        where: { id: ctx.userId! },
        select: {
          name: true,
          preferences: true,
        },
      }),
      getOwnerBundle(prisma, ctx.userId!),
    ]);

    const [decisionCount, memoryCount] = owner.id
      ? await Promise.all([
          prisma.decision.count({ where: { ownerId: owner.id } }),
          prisma.memory.count({ where: { ownerId: owner.id } }),
        ])
      : [0, 0];

    return {
      portrait: buildOwnerPortrait(
        bundle,
        {
          name: user?.name ?? null,
          preferences:
            typeof user?.preferences === "string"
              ? (parseJsonField(user.preferences) as Record<string, unknown>)
              : {},
        },
        {
          projectCount: projects.length,
          decisionCount,
          memoryCount,
        },
      ),
    };
  }),

  /** 今日三动作勾选写回 lastActionPlan.status */
  toggleTodayAction: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        actionId: z.string().min(1).max(80),
        /** 不传则在 planned ↔ done 间切换 */
        status: z.enum(["planned", "done", "skipped"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const project = await prisma.project.findFirst({
        where: { id: input.projectId, owner: { userId: ctx.userId! } },
        include: { owner: { select: { id: true } } },
      });
      if (!project) {
        throw new TRPCError({ code: "FORBIDDEN", message: "项目不存在或无权限" });
      }

      let nextActions: Array<Record<string, unknown>> = [];
      try {
        await updateProjectProfile(
          project.id,
          (profile) => {
            const plan = profile.lastActionPlan as
              | Record<string, unknown>
              | undefined;
            if (!plan || !Array.isArray(plan.actions)) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "暂无今日动作可勾选",
              });
            }
            const actions = (plan.actions as Array<Record<string, unknown>>).map(
              (a, i) => {
                const id = String(a.actionId || `act_${i + 1}`);
                if (id !== input.actionId) return a;
                const current = String(a.status || "planned");
                const mapped =
                  input.status === "done"
                    ? "done"
                    : input.status === "planned"
                      ? "planned"
                      : input.status === "skipped"
                        ? "blocked"
                        : nextToggleActionStatus(current);
                let status: string;
                try {
                  status = assertActionTransition(current, mapped);
                } catch (e) {
                  throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: e instanceof Error ? e.message : "动作状态非法",
                  });
                }
                return { ...a, actionId: id, status };
              },
            );
            if (
              !actions.some(
                (a, i) => String(a.actionId || `act_${i + 1}`) === input.actionId,
              )
            ) {
              throw new TRPCError({
                code: "NOT_FOUND",
                message: "动作不存在",
              });
            }
            nextActions = actions;
            let next: Record<string, unknown> = {
              ...profile,
              lastActionPlan: {
                ...plan,
                actions,
                updatedAt: new Date().toISOString(),
              },
            };
            const completion = estimateActionPlanCompletion(next);
            if (completion != null) {
              next = ingestSignalsAndEvolve(next, [
                buildExecutionFollowthroughSignal({
                  planId: String(plan.planId || ""),
                  completionRate: completion,
                  windowDays: 7,
                }),
              ]);
            }
            return next;
          },
          { ownerId: project.owner.id },
        );
      } catch (error) {
        const conflict = toProfileConflictTRPC(error);
        if (conflict) throw conflict;
        throw error;
      }

      return {
        ok: true as const,
        actions: nextActions.map((a, i) => ({
          actionId: String(a.actionId || `act_${i + 1}`),
          title: String(a.title || ""),
          status: String(a.status || "planned"),
          owner: a.owner ? String(a.owner) : undefined,
        })),
      };
    }),
});
