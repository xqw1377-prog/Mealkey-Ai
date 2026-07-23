/**
 * Sandbox / 生产诊断竖切
 *
 * Sandbox（默认）:
 *   MK_GATEWAY_URL=http://localhost:3000/api \
 *   MK_AGENT_SECRET=mk-sandbox-agent-secret \
 *   npm run run:sandbox
 *
 * 生产 Context 租用（须已安装）:
 *   MK_GATEWAY_MODE=production \
 *   MK_RESTAURANT_ID=<id> \
 *   MK_USER_ACCESS_TOKEN=<token> \
 *   MK_GATEWAY_URL=... MK_AGENT_SECRET=... \
 *   npm run run:sandbox
 */
import {
  createMkClient,
  resolveGatewayEnv,
  requireInstalledContext,
  submitIngressGuarded,
  GatewayInstallError,
} from "./gateway-runtime";
import { runRestaurantDiagnosisSkillPersisted } from "./skill-persisted";
import type { ContextPackageV1 } from "@mealkey/agent-sdk/platform";
import { M_OPS_DIAG_AGENT_ID, mOpsAgentManifestV1 } from "@mealkey/m-ops-diag";

const FIXTURE =
  process.env.MK_FIXTURE_ID?.trim() || "changsha-xiangcai-a";
const RESTAURANT_ID = process.env.MK_RESTAURANT_ID?.trim() || "";

async function loadLocalFallbackContext(): Promise<ContextPackageV1> {
  return {
    restaurantId: "fixture-local",
    asOf: new Date().toISOString(),
    scopesGranted: ["basic", "review"],
    scopesDenied: [],
    identity: {
      brand: "湘味小馆",
      city: "长沙",
      category: "湘菜",
    },
    evidence: [
      {
        id: "1",
        source: "dianping",
        claim: "上菜慢，周末等位久",
        sentiment: "negative",
        theme: "wait",
      },
      {
        id: "2",
        source: "dianping",
        claim: "环境适合聚会",
        sentiment: "positive",
        theme: "environment",
      },
    ],
  };
}

async function main() {
  console.log(
    `[manifest] id=${mOpsAgentManifestV1.id} maxInsightLevel=${mOpsAgentManifestV1.maxInsightLevel} capabilities=${mOpsAgentManifestV1.capabilityIds.join(",")}`,
  );

  const env = resolveGatewayEnv({
    agentId: process.env.MK_AGENT_ID?.trim() || M_OPS_DIAG_AGENT_ID,
  });

  if (!env) {
    console.error(
      "[fail] 请配置 MK_GATEWAY_URL 与 MK_AGENT_SECRET（见 README）",
    );
    process.exitCode = 1;
    return;
  }

  const mk = createMkClient(env);
  let ctx: ContextPackageV1;

  if (env.mode === "production" || RESTAURANT_ID) {
    const restaurantId = RESTAURANT_ID;
    if (!restaurantId) {
      console.error(
        "[fail] 生产/租用模式需要 MK_RESTAURANT_ID；未安装不得静默降级",
      );
      process.exitCode = 1;
      return;
    }
    try {
      ctx = await requireInstalledContext(mk, {
        restaurantId,
        userAccessToken: env.userAccessToken,
        mode: env.mode,
      });
      console.log(
        `[ok] Context 租用 restaurant=${ctx.restaurantId} scopes=${ctx.scopesGranted.join(",")} denied=${ctx.scopesDenied.join(",") || "-"}`,
      );
    } catch (e) {
      if (e instanceof GatewayInstallError) {
        console.error(`[fail] ${e.message}`);
      } else {
        console.error("[fail] Context 租用失败", e);
      }
      process.exitCode = 1;
      return;
    }
  } else {
    try {
      ctx = await mk.sandbox.getRestaurantFixture(FIXTURE);
      console.log(
        `[ok] sandbox fixture ${FIXTURE} evidence=${ctx.evidence?.length ?? 0}`,
      );
    } catch (e) {
      console.warn("[warn] fixture 拉取失败，使用本地最小 Context（仅 sandbox）", e);
      ctx = await loadLocalFallbackContext();
    }
  }

  const { result, ingressItems } = runRestaurantDiagnosisSkillPersisted(ctx);
  console.log(
    `[ok] skill agentId=${result.agentId} signals=${result.signals.length} gaps=${result.gaps.length} ingress=${ingressItems.length}`,
  );

  if (result.agentId !== M_OPS_DIAG_AGENT_ID) {
    console.error(
      `[fail] agentId 期望 ${M_OPS_DIAG_AGENT_ID}，实际 ${result.agentId}`,
    );
    process.exitCode = 1;
    return;
  }

  if (!ingressItems.length) {
    console.log("[skip] 无 Ingress 可提交");
    return;
  }

  try {
    const ack = await submitIngressGuarded(mk, {
      restaurantId: ctx.restaurantId,
      userAccessToken: env.userAccessToken,
      items: ingressItems,
      invokeId: `diag-${Date.now()}`,
      horizon: "7d",
      mode: env.mode,
    });
    console.log(
      `[ok] ingress accepted=${ack.accepted.length} rejected=${ack.rejected.length} ok=${ack.ok}`,
    );
    if (ack.rejected.length) {
      console.log(JSON.stringify(ack.rejected, null, 2));
    }
    if (ack.accepted.length) {
      console.log(
        "handoff today:",
        mk.handoff.today({ restaurantId: ctx.restaurantId }),
      );
    }
  } catch (e) {
    if (e instanceof GatewayInstallError) {
      console.error(`[fail] ${e.message}`);
    } else {
      console.error(
        "[fail] Gateway 未就绪或签名失败。请先启动 MealKey Web，并确认 Agent 已注册。",
        e,
      );
    }
    process.exitCode = 1;
  }
}

main();
