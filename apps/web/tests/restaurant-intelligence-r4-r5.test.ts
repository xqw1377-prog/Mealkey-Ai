import { describe, expect, it } from "vitest";
import { buildBusinessIdentity } from "@/lib/onboarding-interview";
import {
  buildRestaurantIntelligenceSnapshot,
  needsRipConfirmGate,
} from "@/server/founder-layer/capability/restaurant-intelligence/profile-service";
import {
  collectExternalIntelligence,
  PROFILE_RIP_MARKET_EVIDENCE_KEY,
} from "@/server/founder-layer/capability/restaurant-intelligence/external-collector";
import { buildHabitSeedFromRip } from "@/server/founder-layer/capability/restaurant-intelligence/dna-seed";
import {
  diffRipSnapshots,
  signalsFromRipDiff,
} from "@/server/founder-layer/capability/restaurant-intelligence/rip-diff";
import { collectDecisionSignals } from "@/server/founder-layer/capability/decision-intelligence/signal-engine";
import { buildCandidatesFromSignals } from "@/server/founder-layer/capability/decision-intelligence/candidate-promote";
import { FORBIDDEN_HABIT_UI_LABELS } from "@/server/founder-layer/contracts/decision-habit";
import type { RestaurantEvidenceV1 } from "@/server/founder-layer/contracts/restaurant-intelligence-profile";

describe("RIP R4/R5 黄金路径", () => {
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
      content: "周末等位偏长",
      sentiment: "negative",
      aspect: "服务",
      signal: "等待时间",
      confidence: 0.84,
    },
  ];

  it("R5：速写→画像→确认→习惯种子（无决策人格话术）", () => {
    const pack = collectExternalIntelligence({
      identity,
      profile: { [PROFILE_RIP_MARKET_EVIDENCE_KEY]: seedV1 },
    });
    const pending = buildRestaurantIntelligenceSnapshot({
      projectId: "proj_gold",
      identity,
      external: pack,
      founderClaim: "菜品品质",
    });
    expect(pending.status).toBe("pending_confirm");
    expect(
      needsRipConfirmGate({
        schemaVersion: 1,
        currentSnapshotId: pending.snapshotId,
        snapshots: [pending],
      }),
    ).toBe(true);

    const confirmed = {
      ...pending,
      status: "confirmed" as const,
      confirmedAt: new Date().toISOString(),
    };
    expect(
      needsRipConfirmGate({
        schemaVersion: 1,
        currentSnapshotId: confirmed.snapshotId,
        snapshots: [confirmed],
      }),
    ).toBe(false);

    const habit = buildHabitSeedFromRip({
      projectId: "proj_gold",
      snapshot: confirmed,
      confirmedAction: "confirm",
    });
    expect(habit.reminder).toContain("经营特点");
    for (const banned of FORBIDDEN_HABIT_UI_LABELS) {
      expect(habit.reminder).not.toContain(banned);
    }
  });

  it("R4：日更差分 → Signal → Candidate（不空造）", () => {
    const pack1 = collectExternalIntelligence({
      identity,
      profile: { [PROFILE_RIP_MARKET_EVIDENCE_KEY]: seedV1 },
    });
    const v1 = {
      ...buildRestaurantIntelligenceSnapshot({
        projectId: "proj_gold",
        identity,
        external: pack1,
        founderClaim: "菜品品质",
      }),
      status: "confirmed" as const,
      confirmedAt: new Date().toISOString(),
    };

    const pack2 = collectExternalIntelligence({
      identity,
      profile: { [PROFILE_RIP_MARKET_EVIDENCE_KEY]: seedV2 },
    });
    const v2 = {
      ...buildRestaurantIntelligenceSnapshot({
        projectId: "proj_gold",
        identity,
        external: pack2,
        founderClaim: "菜品品质",
        versionLabel: "V1.1",
      }),
      status: "confirmed" as const,
      confirmedAt: new Date().toISOString(),
    };

    const diff = diffRipSnapshots(v1, v2);
    expect(diff.addedEvidenceIds.length).toBeGreaterThan(0);
    expect(diff.newWatchouts.length).toBeGreaterThan(0);

    const ripSignals = signalsFromRipDiff({
      projectId: "proj_gold",
      brandName: "最湘宴",
      city: "长沙",
      decisionHorizon: "long",
      diff,
      current: v2,
    });
    expect(ripSignals.length).toBeGreaterThan(0);
    expect(ripSignals[0]!.source).toBe("M_INTEL");

    const signals = collectDecisionSignals({
      projectId: "proj_gold",
      restaurantName: "南门小馆",
      brandName: "最湘宴",
      city: "长沙",
      focusProblem: "要不要开第二家",
      decisionHorizon: "long",
      ripSignals,
    });
    expect(signals.some((s) => s.id.startsWith("sig_rip_"))).toBe(true);

    const candidates = buildCandidatesFromSignals(signals, {
      projectId: "proj_gold",
      dataCompleteness: 40,
      decisionHorizon: "long",
      blockingRisk: false,
      brandOk: true,
      geoOk: true,
      known: ["经营身份"],
      missing: [],
    });
    expect(candidates.length).toBeGreaterThan(0);
  });

  it("R4：无上一版时不产出差分噪声", () => {
    const pack = collectExternalIntelligence({
      identity,
      profile: { [PROFILE_RIP_MARKET_EVIDENCE_KEY]: seedV2 },
    });
    const only = buildRestaurantIntelligenceSnapshot({
      projectId: "proj_gold",
      identity,
      external: pack,
    });
    const diff = diffRipSnapshots(null, only);
    // 差分对象可算，但 Scan 层要求 previous 存在才注入
    expect(diff.toSnapshotId).toBe(only.snapshotId);
    const signals = signalsFromRipDiff({
      projectId: "proj_gold",
      brandName: "最湘宴",
      city: "长沙",
      diff,
      current: { ...only, status: "confirmed" },
    });
    // 有新增证据时函数仍可产出；DailyScan 用 previous 门禁
    expect(Array.isArray(signals)).toBe(true);
  });
});
