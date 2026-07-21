import { describe, expect, it } from "vitest";
import { buildBusinessIdentity } from "@/lib/onboarding-interview";
import {
  buildRestaurantIntelligenceSnapshot,
  PROFILE_RIP_DAILY_SCAN_AT,
} from "@/server/founder-layer/capability/restaurant-intelligence/profile-service";
import { collectExternalIntelligence } from "@/server/founder-layer/capability/restaurant-intelligence/external-collector";
import { PROFILE_RIP_MARKET_EVIDENCE_KEY } from "@/server/founder-layer/capability/restaurant-intelligence/external-collector";
import { diffRipSnapshots } from "@/server/founder-layer/capability/restaurant-intelligence/rip-diff";
import {
  buildWorldChangesFromDiff,
  worldChangesSummaryLine,
} from "@/server/founder-layer/capability/restaurant-intelligence/world-changes";
import { shouldRunDailyRipRefresh } from "@/server/founder-layer/capability/restaurant-intelligence/ensure-daily-refresh";
import { PROFILE_RIP_KEY } from "@/server/founder-layer/contracts/restaurant-intelligence-profile";
import type { RestaurantEvidenceV1 } from "@/server/founder-layer/contracts/restaurant-intelligence-profile";
import { toDailyScanV1 } from "@/server/founder-layer/capability/decision-center/daily-scan";

describe("E1 每日经营扫描", () => {
  const identity = buildBusinessIdentity({
    scope: "store",
    objectName: "南门小馆",
    brandName: "最湘宴",
    location: "长沙 · 岳麓区",
    storeCountBand: "1",
    focus: "expansion",
    decisionHorizon: "long",
    biggestProblem: "要不要开第二家",
  });

  const seedV1: RestaurantEvidenceV1[] = [
    {
      schemaVersion: 1,
      id: "ev_a",
      source: "大众点评",
      content: "味道不错",
      sentiment: "positive",
      aspect: "味道",
      keyword: "味道",
      confidence: 0.8,
    },
  ];

  const seedV2: RestaurantEvidenceV1[] = [
    ...seedV1,
    {
      schemaVersion: 1,
      id: "ev_b",
      source: "小红书",
      content: "周末等位偏长，服务一般",
      sentiment: "negative",
      aspect: "服务",
      signal: "等待时间",
      confidence: 0.84,
    },
    {
      schemaVersion: 1,
      id: "ev_c",
      source: "地图·公开检索",
      content: "岳麓区同品类新开一家湘菜馆",
      sentiment: "neutral",
      signal: "market_scan",
      confidence: 0.5,
    },
  ];

  it("差分 → 世界变化条含评价与竞争", () => {
    const prev = buildRestaurantIntelligenceSnapshot({
      projectId: "p1",
      identity,
      external: collectExternalIntelligence({
        identity,
        profile: { [PROFILE_RIP_MARKET_EVIDENCE_KEY]: seedV1 },
      }),
      status: "confirmed",
    });
    const curr = buildRestaurantIntelligenceSnapshot({
      projectId: "p1",
      identity,
      external: collectExternalIntelligence({
        identity,
        profile: { [PROFILE_RIP_MARKET_EVIDENCE_KEY]: seedV2 },
      }),
      status: "confirmed",
    });
    const diff = diffRipSnapshots(prev, curr);
    const changes = buildWorldChangesFromDiff({ diff, current: curr });
    expect(changes.length).toBeGreaterThanOrEqual(2);
    expect(changes.some((c) => c.kind === "review" || c.kind === "customer")).toBe(
      true,
    );
    expect(changes.some((c) => c.kind === "competition" || /竞争|商圈/.test(c.title))).toBe(
      true,
    );
    expect(worldChangesSummaryLine(changes)).toMatch(/发生了/);
  });

  it("日更节流：确认后同日不重跑", () => {
    const snap = buildRestaurantIntelligenceSnapshot({
      projectId: "p1",
      identity,
      status: "confirmed",
    });
    const profile = {
      [PROFILE_RIP_KEY]: {
        schemaVersion: 1,
        currentSnapshotId: snap.snapshotId,
        snapshots: [snap],
      },
      [PROFILE_RIP_DAILY_SCAN_AT]: new Date().toISOString(),
    };
    expect(shouldRunDailyRipRefresh(profile)).toBe(false);

    const pendingProfile = {
      [PROFILE_RIP_KEY]: {
        schemaVersion: 1,
        currentSnapshotId: snap.snapshotId,
        snapshots: [{ ...snap, status: "pending_confirm" as const }],
      },
    };
    expect(shouldRunDailyRipRefresh(pendingProfile)).toBe(false);

    const neverScanned = {
      [PROFILE_RIP_KEY]: {
        schemaVersion: 1,
        currentSnapshotId: snap.snapshotId,
        snapshots: [{ ...snap, status: "confirmed" as const }],
      },
    };
    expect(shouldRunDailyRipRefresh(neverScanned)).toBe(true);
  });

  it("世界变化带决策室入口 href", () => {
    const prev = buildRestaurantIntelligenceSnapshot({
      projectId: "p1",
      identity,
      external: collectExternalIntelligence({
        identity,
        profile: { [PROFILE_RIP_MARKET_EVIDENCE_KEY]: seedV1 },
      }),
      status: "confirmed",
    });
    const curr = buildRestaurantIntelligenceSnapshot({
      projectId: "p1",
      identity,
      external: collectExternalIntelligence({
        identity,
        profile: { [PROFILE_RIP_MARKET_EVIDENCE_KEY]: seedV2 },
      }),
      status: "confirmed",
    });
    const diff = diffRipSnapshots(prev, curr);
    const changes = buildWorldChangesFromDiff({
      diff,
      current: curr,
      projectId: "p1",
    });
    expect(changes[0]?.href).toContain("/decision-room");
    expect(changes[0]?.decisionTopic?.length).toBeGreaterThan(4);
  });

  it("有世界变化时 DailyScan 焦点可进决策室", () => {
    const prev = buildRestaurantIntelligenceSnapshot({
      projectId: "proj_1",
      identity,
      external: collectExternalIntelligence({
        identity,
        profile: { [PROFILE_RIP_MARKET_EVIDENCE_KEY]: seedV1 },
      }),
      status: "confirmed",
    });
    const curr = buildRestaurantIntelligenceSnapshot({
      projectId: "proj_1",
      identity,
      external: collectExternalIntelligence({
        identity,
        profile: { [PROFILE_RIP_MARKET_EVIDENCE_KEY]: seedV2 },
      }),
      status: "confirmed",
    });
    const scan = toDailyScanV1(
      { ownerName: "张总" },
      {
        projectId: "proj_1",
        restaurantName: "最湘宴",
        brandName: "最湘宴",
        city: "长沙",
        dataCompleteness: 40,
        decisionHorizon: "mid",
        profile: {
          businessIdentity: identity,
          [PROFILE_RIP_KEY]: {
            schemaVersion: 1,
            currentSnapshotId: curr.snapshotId,
            snapshots: [prev, curr],
          },
        },
      },
    );
    expect(scan.worldChanges?.[0]?.href).toContain("/decision-room");
    expect(scan.todayFocus.kind).toBe("decide");
    expect(scan.todayFocus.href).toContain("/decision");
    expect(scan.primaryCta.label).toMatch(/决策/);
  });
});
