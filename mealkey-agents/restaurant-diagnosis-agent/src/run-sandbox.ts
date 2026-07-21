/**
 * Sandbox 一轮：fixture Context → Skill → Gateway Ingress
 *
 *   MK_GATEWAY_URL=http://localhost:3000/api \
 *   MK_AGENT_SECRET=mk-sandbox-agent-secret \
 *   npm run run:sandbox -w @mealkey-agents/restaurant-diagnosis
 */
import {
  createAgentClient,
  type ContextPackageV1,
} from "@mealkey/agent-sdk/platform";
import { runRestaurantDiagnosisSkill } from "./skill";

const AGENT_ID =
  process.env.MK_AGENT_ID?.trim() || "restaurant-diagnosis";
const SECRET =
  process.env.MK_AGENT_SECRET?.trim() || "mk-sandbox-agent-secret";
const BASE =
  process.env.MK_GATEWAY_URL?.replace(/\/$/, "") || "http://localhost:3000/api";
const FIXTURE =
  process.env.MK_FIXTURE_ID?.trim() || "changsha-xiangcai-a";

async function main() {
  const mk = createAgentClient({
    agentId: AGENT_ID,
    clientSecret: SECRET,
    baseUrl: BASE,
    env: "sandbox",
  });

  let ctx: ContextPackageV1;
  try {
    ctx = await mk.sandbox.getRestaurantFixture(FIXTURE);
    console.log(`[ok] fixture ${FIXTURE} evidence=${ctx.evidence?.length ?? 0}`);
  } catch (e) {
    console.warn("[warn] fixture 拉取失败，使用本地最小 Context", e);
    ctx = {
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

  const { result, ingressItems } = runRestaurantDiagnosisSkill(ctx);
  console.log(
    `[ok] skill signals=${result.signals.length} gaps=${result.gaps.length} ingress=${ingressItems.length}`,
  );

  if (!ingressItems.length) {
    console.log("[skip] 无 Ingress 可提交");
    return;
  }

  try {
    const ack = await mk.submitIngress({
      restaurantId: ctx.restaurantId,
      invokeId: `diag-${Date.now()}`,
      userAccessToken: "sandbox",
      horizon: "7d",
      items: ingressItems,
    });
    console.log(
      `[ok] ingress accepted=${ack.accepted.length} rejected=${ack.rejected.length} ok=${ack.ok}`,
    );
    if (ack.rejected.length) {
      console.log(JSON.stringify(ack.rejected, null, 2));
    }
    if (ack.accepted.length) {
      console.log("handoff today:", mk.handoff.today({ restaurantId: ctx.restaurantId }));
    }
  } catch (e) {
    console.error(
      "[fail] Gateway 未就绪或签名失败。请先启动 web，并确认 Agent 已注册。",
      e,
    );
    process.exitCode = 1;
  }
}

main();
