import { describe, expect, it } from "vitest";
import {
  assertCouncilIngressViaMkInsight,
  openDecisionRoom,
} from "../../../packages/agents/src/founder-os";
import {
  harvestSpokenClaims,
  voiceIntakeToCouncilAssets,
} from "../src/server/founder-layer/council/voice-intake-mk-insight";

describe("voiceIntakeToCouncilAssets", () => {
  it("产出合法 MKInsight，可通过 Council 闸门并开案", () => {
    const assets = voiceIntakeToCouncilAssets({
      caseId: "case-voice-1",
      topic: "开福区龙湖天街是否开店",
      whyNow: "商场9月30开业，铺位要尽快定",
      decisionQuestion: "要不要在该商场开店",
      constraints: "现金流紧张，商业模式不确定就不签",
      successLooksLike: "三个月内客流与回本路径清晰",
      spokenTurns: [
        "现在这家店开在开福区龙湖天街，我是一个新商场，我判断不了这个商场热度好不好，需要你帮我考虑这是第一点。第二点是这个商场整体的餐饮热度不太好，你再给我一个判断要不要继续开。",
      ],
    });

    expect(assets.insights.length).toBeGreaterThanOrEqual(2);
    expect(() =>
      assertCouncilIngressViaMkInsight({
        insights: assets.insights,
        allowEmpty: false,
        label: "决策室开会",
      }),
    ).not.toThrow();

    const session = openDecisionRoom({
      topic: "开福区龙湖天街是否开店",
      mode: "major",
      whyNow: "商场9月30开业，铺位要尽快定",
      decisionQuestion: "要不要在该商场开店",
      constraints: "现金流紧张，商业模式不确定就不签",
      successLooksLike: "三个月内客流与回本路径清晰",
      allowStubReports: false,
      allowGaps: false,
      caseId: "case-voice-1",
      insights: assets.insights,
      evidencePacket: assets.evidencePacket,
    });

    expect(session.insights?.length).toBeGreaterThanOrEqual(2);
    expect(session.cdoNote).toMatch(/MKInsight/);
  });

  it("抓取商圈口述，缺口写「缺客观数据」并带补充入口", () => {
    const harvested = harvestSpokenClaims({
      caseId: "c2",
      topic: "开福区龙湖天街是否开店",
      whyNow: "商场9月30开业",
      decisionQuestion: "要不要开",
      constraints: "现金流紧张",
      successLooksLike: "客流清晰",
      spokenTurns: [
        "龙湖天街餐饮热度不太好，我判断不了商场旺不旺",
      ],
    });
    expect(harvested.some((h) => h.bucket === "site")).toBe(true);
    expect(harvested.some((h) => h.bucket === "district")).toBe(true);
    expect(harvested.some((h) => h.bucket === "finance")).toBe(true);

    const assets = voiceIntakeToCouncilAssets({
      caseId: "c2",
      topic: "开福区龙湖天街是否开店",
      whyNow: "商场9月30开业",
      decisionQuestion: "要不要开",
      constraints: "现金流紧张",
      successLooksLike: "客流清晰",
      spokenTurns: [
        "龙湖天街餐饮热度不太好，我判断不了商场旺不旺",
      ],
    });

    expect(assets.sourceNote).toMatch(/商圈印象|选址/);
    expect(assets.gapActions.length).toBeGreaterThanOrEqual(1);
    expect(assets.gapActions.some((g) => g.id === "district_objective")).toBe(
      true,
    );
    expect(assets.evidencePacket.gapActions?.length).toBeGreaterThan(0);
    // 不再写「尚缺门店/商圈」这类否认已口述的文案
    expect(
      assets.evidencePacket.gaps?.join("").includes("尚缺门店/商圈"),
    ).toBe(false);
    expect(assets.gapActions.map((g) => g.detail).join("")).toMatch(
      /已抓取口述/,
    );
    expect(assets.evidencePacket.gaps?.join("") || "").toMatch(/客观数据/);
    // 证据里应有商圈口述，而非只重复「待决」
    const claims = assets.evidencePacket.items.map((i) => i.claim).join(" ");
    expect(claims).toMatch(/热度|商圈口述/);
    expect(claims.includes("待决：")).toBe(false);
  });

  it("无合法 MKInsight 且 allowEmpty=false → 拒开案", () => {
    expect(() =>
      assertCouncilIngressViaMkInsight({
        insights: [],
        allowEmpty: false,
        label: "决策室开会",
      }),
    ).toThrow(/缺少合法 MKInsight/);
  });
});
