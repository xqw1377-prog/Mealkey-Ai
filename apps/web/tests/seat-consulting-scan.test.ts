/**
 * 三席咨询 → 今日扫描世界变化
 */
import { describe, expect, it } from "vitest";
import {
  signalsFromSeatConsulting,
  worldChangesFromSeatConsulting,
} from "@/server/founder-layer/capability/decision-center/seat-consulting-scan";
import { toDailyScanV1 } from "@/server/founder-layer/capability/decision-center/daily-scan";

describe("seat-consulting-scan", () => {
  const profile = {
    mMktConsultingProject: {
      consultingId: "c_mkt",
      assets: {
        strategyConfirmedAt: new Date().toISOString(),
        signOffStatus: "in_review",
        domainStrength: {
          overall: 62,
          readyForCouncil: true,
          gaps: [],
          summary: "市场强度 62/100",
        },
        decisionArtifact: {
          recommendation: "先以白领下班场景试点",
        },
        research: { status: "confirmed", headline: "有场景空位" },
      },
    },
    mBizConsultingProject: {
      consultingId: "c_biz",
      assets: {
        research: { status: "confirmed", headline: "UE 可验证" },
        domainStrength: {
          overall: 42,
          readyForCouncil: false,
          gaps: ["缺少单位经济分析"],
          summary: "商业强度 42/100",
        },
      },
    },
  };

  it("策略待签字与证据缺口进入世界变化", () => {
    const changes = worldChangesFromSeatConsulting({
      profile,
      projectId: "proj_1",
    });
    expect(changes.some((c) => /市场咨询：策略待签字/.test(c.title))).toBe(
      true,
    );
    expect(changes.some((c) => /商业咨询：证据强度不足/.test(c.title))).toBe(
      true,
    );
    expect(changes[0]?.href).toContain("/decision-room");
  });

  it("可投影为 Signal 并进入 DailyScan", () => {
    const signals = signalsFromSeatConsulting({
      profile,
      projectId: "proj_1",
      brandName: "等里",
      city: "长沙",
    });
    expect(signals.length).toBeGreaterThan(0);

    const scan = toDailyScanV1(
      { ownerName: "张总" },
      {
        projectId: "proj_1",
        restaurantName: "等里",
        brandName: "等里",
        city: "长沙",
        dataCompleteness: 45,
        profile,
      },
    );
    expect(scan.worldChanges?.some((c) => /市场|商业/.test(c.title))).toBe(
      true,
    );
  });
});
