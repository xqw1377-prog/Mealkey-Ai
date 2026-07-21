/**
 * m-ops-diag Host Bridge — 只读 Brain/RIP → Engine → Signal/Insight
 * Engine 零 Prisma；禁止直写 Brain 事实。
 */
import {
  M_OPS_DIAG_AGENT_ID,
  M_OPS_DIAG_PRODUCT_NAME,
  buildDiagnosisRequest,
  contextFromBrainLike,
  diagnoseRestaurantSync,
  diagnosisSignalsToWorldHints,
  evidenceFromRipLike,
  mockConsumerEvidence,
  toVerticalInsightSource,
  type RestaurantDiagnosisResult,
  type OpsDiagWorldHint,
} from "@mealkey/m-ops-diag";
import type { PrismaClient } from "@/generated/prisma";
import {
  getCurrentRipSnapshot,
  readRipStore,
} from "@/server/founder-layer/capability/restaurant-intelligence/profile-service";
import { loadRestaurantBrainContext } from "@/server/restaurant-brain/service";
import { fetchLiveMarketEvidence } from "@/server/founder-layer/capability/restaurant-intelligence/live-market-evidence";
import { decisionReadyPath } from "@/lib/decision-entry";
import type { WorldChangeV1 } from "@/server/founder-layer/capability/restaurant-intelligence/world-changes";

export type MOpsDiagRunMode = "profile" | "live" | "mock";

export type MOpsDiagHostResult = {
  agentId: typeof M_OPS_DIAG_AGENT_ID;
  productName: typeof M_OPS_DIAG_PRODUCT_NAME;
  mode: MOpsDiagRunMode;
  result: RestaurantDiagnosisResult;
  worldHints: OpsDiagWorldHint[];
  worldChanges: WorldChangeV1[];
  insightDraft: ReturnType<typeof toVerticalInsightSource>;
};

function packResult(
  result: RestaurantDiagnosisResult,
  mode: MOpsDiagRunMode,
  projectId: string,
): MOpsDiagHostResult {
  const worldHints = diagnosisSignalsToWorldHints(result.signals);
  return {
    agentId: M_OPS_DIAG_AGENT_ID,
    productName: M_OPS_DIAG_PRODUCT_NAME,
    mode,
    result,
    worldHints,
    worldChanges: worldHints.map((h) => {
      const topic =
        h.decisionTopic || `经营诊断：${h.title}，下一步最该拍什么板？`;
      return {
        id: h.id,
        kind: h.kind,
        title: h.title,
        detail: h.detail,
        decisionTopic: topic,
        href: decisionReadyPath(projectId, topic),
      };
    }),
    insightDraft: toVerticalInsightSource(
      result,
      `ops-diag-${projectId}`,
    ),
  };
}

/** 今日扫描：同步、仅 RIP 证据；无证据不注入（不造假） */
export function collectMOpsDiagWorldChangesForScan(input: {
  projectId: string;
  profile: unknown;
  brandName?: string;
  city?: string;
  category?: string;
}): WorldChangeV1[] {
  return runMOpsDiagFromProfile({
    ...input,
    allowMockFallback: false,
  }).worldChanges;
}

/** 从 profile RIP 跑诊断（同步） */
export function runMOpsDiagFromProfile(input: {
  projectId: string;
  profile: unknown;
  brandName?: string;
  city?: string;
  category?: string;
  allowMockFallback?: boolean;
}): MOpsDiagHostResult {
  const store = readRipStore(
    (input.profile || {}) as Record<string, unknown>,
  );
  const snap = getCurrentRipSnapshot(store);
  const basic = snap?.basic;
  const restaurantContext = contextFromBrainLike(null, {
    projectId: input.projectId,
    brandName: input.brandName || basic?.brandName,
    storeName: basic?.brandName,
    category: input.category || basic?.category,
    city: input.city || basic?.city,
    stage: basic?.stageLabel,
  });

  let evidence = evidenceFromRipLike(snap?.evidence);
  let mode: MOpsDiagRunMode = "profile";
  if (!evidence.length && input.allowMockFallback) {
    evidence = mockConsumerEvidence();
    mode = "mock";
  }

  const result = diagnoseRestaurantSync(
    buildDiagnosisRequest({
      restaurantContext,
      evidence,
      focus: "overall",
      horizon: "7d",
    }),
  );
  return packResult(result, mode, input.projectId);
}

/**
 * 完整 Host：Brain 只读 + 可选 live 外采
 */
export async function runMOpsDiagForProject(
  prisma: PrismaClient,
  input: {
    projectId: string;
    ownerId: string;
    profile?: unknown;
    useLive?: boolean;
    allowMockFallback?: boolean;
    focus?:
      | "service"
      | "product"
      | "traffic"
      | "competition"
      | "cost"
      | "overall";
    horizon?: "today" | "7d" | "30d";
  },
): Promise<MOpsDiagHostResult> {
  let brainCtx: Awaited<ReturnType<typeof loadRestaurantBrainContext>> | null =
    null;
  try {
    brainCtx = await loadRestaurantBrainContext(prisma, {
      projectId: input.projectId,
      ownerId: input.ownerId,
    });
  } catch {
    brainCtx = null;
  }

  const store = readRipStore(
    (input.profile || {}) as Record<string, unknown>,
  );
  const snap = getCurrentRipSnapshot(store);
  const restaurantContext = contextFromBrainLike(brainCtx, {
    projectId: input.projectId,
    brandName: snap?.basic.brandName || brainCtx?.identity?.name,
    storeName: brainCtx?.identity?.name || snap?.basic.brandName,
    category: snap?.basic.category || brainCtx?.identity?.category,
    city: snap?.basic.city || brainCtx?.identity?.city || undefined,
    stage: snap?.basic.stageLabel || brainCtx?.identity?.stage,
  });

  let evidence = evidenceFromRipLike(snap?.evidence);
  let mode: MOpsDiagRunMode = "profile";

  if (input.useLive && restaurantContext.brandName && restaurantContext.city) {
    try {
      const live = await fetchLiveMarketEvidence({
        brandName: restaurantContext.brandName,
        city: restaurantContext.city,
        category: restaurantContext.category,
        storeName: restaurantContext.storeName,
        timeoutMs: 4500,
      });
      if (live.evidences.length) {
        evidence = [
          ...evidence,
          ...evidenceFromRipLike(
            live.evidences.map((e) => ({
              id: e.id,
              source: e.source,
              content: e.content,
              sentiment: e.sentiment,
              aspect: e.aspect || e.relatedAspect,
              keyword: e.keyword,
              observedAt: e.observedAt,
            })),
          ),
        ];
        mode = "live";
      }
    } catch {
      // keep profile evidence
    }
  }

  if (!evidence.length && input.allowMockFallback) {
    evidence = mockConsumerEvidence();
    mode = "mock";
  }

  const facts = [];
  if (brainCtx?.identity?.storeCount != null) {
    facts.push({
      kind: "identity",
      claim: `门店数约 ${brainCtx.identity.storeCount}`,
    });
  }

  const result = diagnoseRestaurantSync(
    buildDiagnosisRequest({
      restaurantContext,
      evidence,
      facts,
      focus: input.focus || "overall",
      horizon: input.horizon || "7d",
    }),
  );

  return packResult(result, mode, input.projectId);
}
