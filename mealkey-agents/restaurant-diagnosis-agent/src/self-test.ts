/** 离线自测：不依赖 Gateway */
import type { ContextPackageV1 } from "@mealkey/agent-sdk/platform";
import { runRestaurantDiagnosisSkill } from "./skill";

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

const { result, ingressItems } = runRestaurantDiagnosisSkill(ctx);
if (!result.signals.length && !result.gaps.length) {
  console.error("FAIL: expected signals or gaps");
  process.exit(1);
}
if (!ingressItems.some((i) => i.port === "signal" || i.port === "gap")) {
  console.error("FAIL: expected ingress items");
  process.exit(1);
}
console.log(
  `OK skill signals=${result.signals.length} ingress=${ingressItems.length}`,
);
