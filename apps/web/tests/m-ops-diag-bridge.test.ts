import { describe, expect, it } from "vitest";
import {
  diagnoseRestaurantSync,
  buildDiagnosisRequest,
  mockConsumerEvidence,
  diagnosisSignalsToWorldHints,
  evidenceFromRipLike,
} from "@mealkey/m-ops-diag";
import { runMOpsDiagFromProfile } from "@/server/services/m-ops-diag-client";
import { PROFILE_RIP_KEY } from "@/server/founder-layer/contracts/restaurant-intelligence-profile";

describe("m-ops-diag bridge", () => {
  it("engine: mock evidence → HIGH service signal", () => {
    const result = diagnoseRestaurantSync(
      buildDiagnosisRequest({
        restaurantContext: {
          brandName: "测店",
          city: "上海",
          category: "中餐",
        },
        evidence: mockConsumerEvidence(),
      }),
    );
    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.signals[0]!.type).toBe("CUSTOMER");
    const hints = diagnosisSignalsToWorldHints(result.signals);
    expect(hints[0]!.source).toBe("m-ops-diag");
  });

  it("host: RIP evidence → worldChanges for radar", () => {
    const profile = {
      [PROFILE_RIP_KEY]: {
        schemaVersion: 1,
        currentSnapshotId: "snap1",
        snapshots: [
          {
            schemaVersion: 1,
            snapshotId: "snap1",
            projectId: "p1",
            versionLabel: "V1.0",
            status: "confirmed",
            createdAt: new Date().toISOString(),
            basic: {
              brandName: "测店",
              city: "上海",
              category: "中餐",
            },
            customer: {
              aspectScores: [],
              positiveKeywords: [],
              watchouts: [],
              evidenceInsufficient: false,
            },
            alerts: [],
            evidence: [
              {
                schemaVersion: 1,
                id: "e1",
                source: "大众点评",
                content: "等了半小时菜还没上，服务太差",
                sentiment: "negative",
                aspect: "service",
                confidence: 0.7,
              },
              {
                schemaVersion: 1,
                id: "e2",
                source: "大众点评",
                content: "上菜慢，带孩子根本等不及",
                sentiment: "negative",
                aspect: "service",
                confidence: 0.7,
              },
              {
                schemaVersion: 1,
                id: "e3",
                source: "小红书",
                content: "味道不错会回购",
                sentiment: "positive",
                aspect: "product",
                confidence: 0.6,
              },
            ],
            source: "rip_intake_v1",
            collection: {
              identityReady: true,
              reviewIntelReady: true,
              feedbackIntelReady: true,
              marketScanReady: false,
              degradedNotes: [],
            },
          },
        ],
      },
    };

    const mapped = evidenceFromRipLike(
      profile[PROFILE_RIP_KEY].snapshots[0]!.evidence,
    );
    expect(mapped.length).toBe(3);

    const host = runMOpsDiagFromProfile({
      projectId: "p1",
      profile,
      brandName: "测店",
      city: "上海",
    });
    expect(host.mode).toBe("profile");
    expect(host.worldChanges.length).toBeGreaterThan(0);
    expect(host.worldChanges[0]!.id).toContain("m-ops-diag");
    expect(host.result.productName).toBe("餐启经营诊断");
  });

  it("host: no evidence → empty changes (no fake)", () => {
    const host = runMOpsDiagFromProfile({
      projectId: "p1",
      profile: {},
      allowMockFallback: false,
    });
    expect(host.worldChanges.length).toBe(0);
    expect(host.result.gaps.some((g) => g.field === "evidence")).toBe(true);
  });
});
