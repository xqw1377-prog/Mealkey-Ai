/** 离线自测：不依赖 Gateway */
import type { ContextPackageV1 } from "@mealkey/agent-sdk/platform";
import {
  M_OPS_DIAG_AGENT_ID,
  mOpsAgentManifestV1,
} from "@mealkey/m-ops-diag";
import {
  clearDiagnosisStore,
  getRestaurantKnowledgeSummary,
  getLatestDiagnosisSnapshot,
  getRestaurantBackendState,
  registerRestaurant,
  runDueRestaurantScans,
  runRestaurantBackendScan,
} from "./index";
import { runRestaurantDiagnosisSkillPersisted } from "./skill-persisted";

const ctx: ContextPackageV1 = {
  restaurantId: "self-test",
  asOf: new Date().toISOString(),
  scopesGranted: ["basic", "review"],
  scopesDenied: [],
  identity: { brand: "湘味小馆", city: "长沙", category: "湘菜" },
  evidence: [
    {
      id: "a",
      source: "dianping",
      claim: "等待太久，上菜慢",
      sentiment: "negative",
      theme: "wait",
    },
    {
      id: "b",
      source: "dianping",
      claim: "服务跟不上高峰",
      sentiment: "negative",
      theme: "wait",
    },
    {
      id: "c",
      source: "dianping",
      claim: "环境不错适合聚会",
      sentiment: "positive",
      theme: "environment",
    },
  ],
};

async function main() {
  clearDiagnosisStore();

  if (mOpsAgentManifestV1.id !== M_OPS_DIAG_AGENT_ID) {
    console.error("FAIL: manifest id must equal M_OPS_DIAG_AGENT_ID");
    process.exit(1);
  }
  if (mOpsAgentManifestV1.maxInsightLevel !== 3) {
    console.error("FAIL: maxInsightLevel must be 3");
    process.exit(1);
  }
  if (!mOpsAgentManifestV1.capabilityIds.length) {
    console.error("FAIL: capabilityIds required");
    process.exit(1);
  }

  const { result, ingressItems } = runRestaurantDiagnosisSkillPersisted(ctx);
  if (result.agentId !== M_OPS_DIAG_AGENT_ID) {
    console.error(
      `FAIL: expected agentId ${M_OPS_DIAG_AGENT_ID}, got ${result.agentId}`,
    );
    process.exit(1);
  }
  if (!result.signals.length && !result.gaps.length) {
    console.error("FAIL: expected signals or gaps");
    process.exit(1);
  }
  if (!ingressItems.some((i) => i.port === "signal" || i.port === "gap")) {
    console.error("FAIL: expected ingress items");
    process.exit(1);
  }
  if (ingressItems.some((i) => "level" in i && (i.level as number) > 3)) {
    console.error("FAIL: ingress level must be ≤ 3");
    process.exit(1);
  }

  const summary1 = getRestaurantKnowledgeSummary(ctx.restaurantId);
  if (summary1.runCount !== 1 || !summary1.latestSnapshot) {
    console.error("FAIL: expected persisted snapshot after first run");
    process.exit(1);
  }

  const { result: result2 } = runRestaurantDiagnosisSkillPersisted({
    ...ctx,
    asOf: new Date(Date.now() + 60_000).toISOString(),
    evidence: [
      ...(ctx.evidence || []),
      {
        id: "d",
        source: "xiaohongshu",
        claim: "还是要排队，但是菜的味道值得等",
        sentiment: "negative",
        theme: "wait",
      },
    ],
  });

  if (!result2.health?.previousSnapshot && !getLatestDiagnosisSnapshot(ctx.restaurantId)) {
    console.error("FAIL: expected previous snapshot on second run");
    process.exit(1);
  }

  const summary2 = getRestaurantKnowledgeSummary(ctx.restaurantId);
  if (summary2.runCount !== 2 || summary2.caseCount < 1) {
    console.error("FAIL: expected stored runs and cases after second run");
    process.exit(1);
  }

  console.log(
    `OK skill signals=${result.signals.length} ingress=${ingressItems.length} runs=${summary2.runCount} cases=${summary2.caseCount}`,
  );

  registerRestaurant({
    restaurantId: "backend-test",
    brand: "餐启测试店",
    city: "长沙",
    district: "岳麓区",
    category: "湘菜",
    manualFacts: [{ kind: "owner_focus", claim: "重点观察晚高峰等待" }],
  });

  const scan = await runRestaurantBackendScan({
    restaurantId: "backend-test",
  });
  if (!scan.result.signals.length) {
    console.error("FAIL: expected backend scan signals");
    process.exit(1);
  }

  const dueRuns = await runDueRestaurantScans();
  if (!Array.isArray(dueRuns)) {
    console.error("FAIL: expected runDueRestaurantScans array");
    process.exit(1);
  }

  const backendState = getRestaurantBackendState("backend-test");
  if (!backendState.profile || backendState.runs.length < 1 || !backendState.scanPlan) {
    console.error("FAIL: expected backend state with profile/runs/scanPlan");
    process.exit(1);
  }

  console.log(
    `OK backend signals=${scan.result.signals.length} runs=${backendState.runs.length} cases=${backendState.cases.length}`,
  );
}

void main();
