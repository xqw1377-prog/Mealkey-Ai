import { router } from "./trpc";
import { userRouter, projectRouter, reportRouter, knowledgeRouter, assetRouter } from "./routers";
import { memoryRouter } from "./routers/memory";
import { agentRouter } from "./routers/agent";
import { dashboardRouter } from "./routers/dashboard";
import { decisionArchiveRouter } from "./routers/decision-archive";
import { founderRouter } from "./routers/founder";

/**
 * 根 Router — 合并所有子 Router
 */
export const appRouter = router({
  user: userRouter,
  project: projectRouter,
  report: reportRouter,
  knowledge: knowledgeRouter,
  memory: memoryRouter,
  agent: agentRouter,
  dashboard: dashboardRouter,
  asset: assetRouter,
  decisionArchive: decisionArchiveRouter,
  founder: founderRouter,
});

export type AppRouter = typeof appRouter;
