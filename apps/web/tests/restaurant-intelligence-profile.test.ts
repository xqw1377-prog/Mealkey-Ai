import { describe, expect, it } from "vitest";
import { buildBusinessIdentity } from "@/lib/onboarding-interview";
import {
  buildIdentityOnlySnapshot,
  buildRestaurantIntelligenceSnapshot,
  emptyRipStore,
  getCurrentRipSnapshot,
  needsRipConfirmGate,
  readRipStore,
  stageLabelFromIdentity,
} from "@/server/founder-layer/capability/restaurant-intelligence/profile-service";
import {
  collectExternalIntelligence,
  PROFILE_RIP_MARKET_EVIDENCE_KEY,
} from "@/server/founder-layer/capability/restaurant-intelligence/external-collector";
import { projectCustomerPerception } from "@/server/founder-layer/capability/restaurant-intelligence/customer-perception";
import { buildCognitionGap } from "@/server/founder-layer/capability/restaurant-intelligence/cognition-gap";
import { buildHabitSeedFromRip } from "@/server/founder-layer/capability/restaurant-intelligence/dna-seed";
import {
  PROFILE_RIP_KEY,
  type RestaurantEvidenceV1,
} from "@/server/founder-layer/contracts/restaurant-intelligence-profile";
import { FORBIDDEN_HABIT_UI_LABELS } from "@/server/founder-layer/contracts/decision-habit";

describe("Restaurant Intelligence Profile R1/R2", () => {
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

  it("Identity-only 画像不打假外部勾", () => {
    const snap = buildIdentityOnlySnapshot({
      projectId: "proj_1",
      identity,
      category: "湘菜",
    });
    expect(snap.status).toBe("pending_confirm");
    expect(snap.customer.evidenceInsufficient).toBe(true);
    expect(snap.collection.identityReady).toBe(true);
    expect(snap.collection.reviewIntelReady).toBe(false);
    expect(snap.collection.degradedNotes.length).toBeGreaterThan(0);
    expect(snap.basic.brandName).toBe("最湘宴");
    expect(snap.basic.city).toContain("长沙");
    expect(snap.alerts.length).toBeGreaterThan(0);
    expect(snap.alerts.length).toBeLessThanOrEqual(3);
  });

  it("扩张关注会映射扩张阶段标签", () => {
    expect(stageLabelFromIdentity(identity)).toContain("扩张");
  });

  it("门禁：待确认需要拦截，确认后放行", () => {
    const snap = buildIdentityOnlySnapshot({
      projectId: "proj_1",
      identity,
    });
    const store = {
      schemaVersion: 1 as const,
      currentSnapshotId: snap.snapshotId,
      snapshots: [snap],
    };
    expect(needsRipConfirmGate(store)).toBe(true);

    const confirmed = {
      ...store,
      snapshots: [{ ...snap, status: "confirmed" as const }],
    };
    expect(needsRipConfirmGate(confirmed)).toBe(false);
  });

  it("profile 键可读空 store", () => {
    expect(readRipStore({})).toEqual(emptyRipStore());
    const snap = buildIdentityOnlySnapshot({
      projectId: "proj_1",
      identity,
    });
    const store = readRipStore({
      [PROFILE_RIP_KEY]: {
        schemaVersion: 1,
        currentSnapshotId: snap.snapshotId,
        snapshots: [snap],
      },
    });
    expect(getCurrentRipSnapshot(store)?.snapshotId).toBe(snap.snapshotId);
  });

  it("R2：无锚点不采集口碑且不打假勾", () => {
    const weak = buildBusinessIdentity({
      scope: "store",
      objectName: "无名店",
      brandName: "无名店",
      location: "",
      storeCountBand: "1",
      focus: "growth",
      decisionHorizon: "mid",
      biggestProblem: "",
    });
    const pack = collectExternalIntelligence({ identity: weak });
    expect(pack.canClaimRegional).toBe(false);
    expect(pack.reviewIntelReady).toBe(false);
    expect(pack.evidences).toHaveLength(0);
  });

  it("R2：有锚点+种子证据 → 顾客认知块可投影", () => {
    const seeds: RestaurantEvidenceV1[] = [
      {
        schemaVersion: 1,
        id: "ev_1",
        source: "大众点评",
        content: "菜很好吃，味道正宗",
        sentiment: "positive",
        aspect: "味道",
        keyword: "味道正宗",
        confidence: 0.88,
      },
      {
        schemaVersion: 1,
        id: "ev_2",
        source: "小红书",
        content: "周末等位偏长，服务一般",
        sentiment: "negative",
        aspect: "服务",
        signal: "等待时间",
        confidence: 0.8,
      },
    ];
    const pack = collectExternalIntelligence({
      identity,
      profile: { [PROFILE_RIP_MARKET_EVIDENCE_KEY]: seeds },
    });
    expect(pack.canClaimRegional).toBe(true);
    expect(pack.reviewIntelReady).toBe(true);
    expect(pack.evidences.length).toBeGreaterThanOrEqual(2);

    const customer = projectCustomerPerception(pack.evidences);
    expect(customer.evidenceInsufficient).toBe(false);
    expect(customer.positiveKeywords.length).toBeGreaterThan(0);
    expect(customer.watchouts.some((w) => w.includes("等待") || w.includes("服务"))).toBe(
      true,
    );

    const snap = buildRestaurantIntelligenceSnapshot({
      projectId: "proj_1",
      identity,
      external: pack,
      founderClaim: "菜品品质",
    });
    expect(snap.collection.reviewIntelReady).toBe(true);
    expect(snap.customer.evidenceInsufficient).toBe(false);
    expect(snap.cognitionGap?.founderClaim).toBe("菜品品质");
    expect(snap.alerts.length).toBeLessThanOrEqual(3);
  });

  it("R2：有锚点但无源 → 降级前进", () => {
    const pack = collectExternalIntelligence({ identity, profile: {} });
    expect(pack.canClaimRegional).toBe(true);
    expect(pack.reviewIntelReady).toBe(false);
    expect(pack.degradedNotes.some((n) => n.includes("尚未接入") || n.includes("暂无"))).toBe(
      true,
    );
    const snap = buildRestaurantIntelligenceSnapshot({
      projectId: "proj_1",
      identity,
      external: pack,
    });
    expect(snap.collection.reviewIntelReady).toBe(false);
    expect(snap.customer.evidenceInsufficient).toBe(true);
  });

  it("R3：有自认优势 + 顾客证据 → 认知差距 + 习惯种子", () => {
    const pack = collectExternalIntelligence({
      identity,
      profile: {
        [PROFILE_RIP_MARKET_EVIDENCE_KEY]: [
          {
            schemaVersion: 1,
            id: "ev_env",
            source: "大众点评",
            content: "环境很好，适合聚餐",
            sentiment: "positive",
            aspect: "环境",
            keyword: "聚餐氛围",
            confidence: 0.85,
          },
        ] satisfies RestaurantEvidenceV1[],
      },
    });
    const snap = buildRestaurantIntelligenceSnapshot({
      projectId: "proj_1",
      identity,
      external: pack,
      founderClaim: "菜品品质",
    });
    expect(snap.cognitionGap?.founderClaim).toBe("菜品品质");
    expect(snap.cognitionGap?.customerPerception).toBeTruthy();

    const gap = buildCognitionGap({
      founderClaim: "菜品品质",
      customer: snap.customer,
      evidence: snap.evidence,
    });
    expect(gap?.summaryLine).toMatch(/不一致|同向|核实/);

    const habit = buildHabitSeedFromRip({
      projectId: "proj_1",
      snapshot: { ...snap, status: "confirmed", cognitionGap: gap },
      confirmedAction: "confirm",
    });
    expect(habit.traits.length).toBeGreaterThan(0);
    expect(habit.reminder).toContain("经营特点");
    for (const banned of FORBIDDEN_HABIT_UI_LABELS) {
      expect(habit.reminder).not.toContain(banned);
      expect(habit.traits.join("")).not.toContain(banned);
    }
  });
});
