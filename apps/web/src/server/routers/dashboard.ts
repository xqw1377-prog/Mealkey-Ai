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

export const dashboardRouter = router({
  getHome: protectedProcedure
    .input(z.object({ projectId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const projects = await listProjects(prisma, ctx.userId!);

      if (projects.length === 0) {
        return {
          currentProject: null,
          home: null,
        };
      }

      const currentProject =
        projects.find((project) => project.id === input?.projectId) ?? projects[0];
      const bundle = await getProjectInsightBundle(prisma, ctx.userId!, currentProject.id);

      if (!bundle) {
        return {
          currentProject: null,
          home: null,
        };
      }

      return {
        currentProject: bundle.project,
        home: buildDashboardHome(bundle),
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

      return {
        currentProject: bundle.project,
        workspace: buildAdvisorWorkspace(bundle),
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
});
