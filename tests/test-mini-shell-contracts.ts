import assert from "node:assert/strict";
import {
  FIRST_HUB_VISIT_GRANT_POINTS,
  HANDOFF_PRIMARY_CTA,
  M_OPS_DIAG_AGENT_ID,
  buildBrainHandoffUrl,
  buildShellContextV1,
  getShellCatalogV1,
  mOpsMiniProgramManifestV1,
  parsePluginUiEvent,
} from "../packages/agent-sdk/src/mini-shell/index.ts";

function main() {
  assert.equal(M_OPS_DIAG_AGENT_ID, "restaurant-diagnosis");
  assert.equal(FIRST_HUB_VISIT_GRANT_POINTS, 500);
  assert.equal(mOpsMiniProgramManifestV1.surfaces.host, "mealkey_agent_hub");
  assert.equal(mOpsMiniProgramManifestV1.experience.handoffCta, "enter_mealkey_brain");

  const catalog = getShellCatalogV1();
  assert.equal(catalog.length, 1);
  assert.equal(catalog[0]?.agentId, M_OPS_DIAG_AGENT_ID);
  assert.equal(catalog[0]?.featured, true);

  const ctx = buildShellContextV1({
    userId: "u1",
    status: "guest",
    wechatOpenId: "ox1",
    restaurant: { localProfileId: "r1", name: "湘味小馆", city: "长沙", category: "湘菜" },
    agentId: M_OPS_DIAG_AGENT_ID,
    installed: true,
    balancePoints: 500,
    estimatedCostPoints: 100,
    userAccessToken: "tok",
  });
  assert.equal(ctx.schemaVersion, "1.0");
  assert.equal(ctx.locale, "zh-CN");
  assert.ok(ctx.invokeId);

  assert.equal(parsePluginUiEvent({ type: "handoff.brain", reason: "upgrade" })?.type, "handoff.brain");
  assert.equal(parsePluginUiEvent({ type: "evil.exec" }), null);

  const url = buildBrainHandoffUrl({ osOrigin: "https://mealkey.cn/", focus: "signal" });
  assert.equal(url, "https://mealkey.cn/dashboard?focus=signal");
  assert.equal(HANDOFF_PRIMARY_CTA, "进入 MealKey 经营大脑");

  console.log("test-mini-shell-contracts: ok");
}

main();
