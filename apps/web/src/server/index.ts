import { router } from "./trpc";
import { userRouter, projectRouter, knowledgeRouter, assetRouter } from "./routers";
import { agentRouter } from "./routers/agent";
import { dashboardRouter } from "./routers/dashboard";
import { decisionArchiveRouter } from "./routers/decision-archive";
import { founderRouter } from "./routers/founder";
import { meetingSessionRouter } from "./routers/meeting-session";
import { validationOsRouter } from "./routers/validation-os";
import { executionRuntimeRouter } from "./routers/execution-runtime";
import { growthRuntimeRouter } from "./routers/growth-runtime";
import { riskRuntimeRouter } from "./routers/risk-runtime";
import { opportunityRuntimeRouter } from "./routers/opportunity-runtime";
import { memoryRuntimeRouter } from "./routers/memory-runtime";
import { decisionRuntimeRouter } from "./routers/decision-runtime";
import { mPntConsultingRouter } from "./routers/m-pnt-consulting";
import {
  mMktConsultingRouter,
  mBizConsultingRouter,
  mEdConsultingRouter,
} from "./routers/agent-consulting";
import { decisionCouncilRouter } from "./routers/decision-council";
import { intelligenceRuntimeRouter } from "./routers/intelligence-runtime";
import { billingRouter } from "./routers/billing";
import { restaurantBrainRouter } from "./routers/restaurant-brain";
import { decisionIntelligenceRouter } from "./routers/decision-intelligence";
import { restaurantIntelligenceRouter } from "./routers/restaurant-intelligence";

/**
 * 根 Router — 合并所有子 Router
 * 经营诊断已外置（M-OPS-Agent），经 Gateway Ingress 接入，不再注册进程内 mOpsDiag Router。
 */
export const appRouter = router({
  user: userRouter,
  project: projectRouter,
  knowledge: knowledgeRouter,
  agent: agentRouter,
  dashboard: dashboardRouter,
  asset: assetRouter,
  decisionArchive: decisionArchiveRouter,
  founder: founderRouter,
  meetingSession: meetingSessionRouter,
  validationOs: validationOsRouter,
  executionRuntime: executionRuntimeRouter,
  growthRuntime: growthRuntimeRouter,
  riskRuntime: riskRuntimeRouter,
  opportunityRuntime: opportunityRuntimeRouter,
  memoryRuntime: memoryRuntimeRouter,
  decisionRuntime: decisionRuntimeRouter,
  mPntConsulting: mPntConsultingRouter,
  mMktConsulting: mMktConsultingRouter,
  mBizConsulting: mBizConsultingRouter,
  mEdConsulting: mEdConsultingRouter,
  decisionCouncil: decisionCouncilRouter,
  intelligenceRuntime: intelligenceRuntimeRouter,
  billing: billingRouter,
  restaurantBrain: restaurantBrainRouter,
  decisionIntelligence: decisionIntelligenceRouter,
  restaurantIntelligence: restaurantIntelligenceRouter,
});

export type AppRouter = typeof appRouter;
