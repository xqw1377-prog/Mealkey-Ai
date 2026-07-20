import { describe, expect, it } from "vitest";
import {
  appendBehaviorSignal,
  buildCouncilDecisionSignals,
  buildFounderIntelligenceProfile,
  buildIntelligenceBriefSummary,
  canPersistMemoryKind,
  evolveIntelligenceProfile,
  ingestSignalsAndEvolve,
  parsePredictionFromSummary,
  readMemoryPermissions,
  writeMemoryPermissions,
} from "@/server/founder-layer/intelligence";
import { DEFAULT_MEMORY_PERMISSIONS } from "@/server/founder-layer/contracts/intelligence-profile";

describe("memory permissions", () => {
  it("默认关闭行业贡献", () => {
    const p = readMemoryPermissions({});
    expect(p.contributeToIndustryModel).toBe(false);
    expect(p.saveExperience).toBe(true);
    expect(canPersistMemoryKind(p, "industry")).toBe(false);
    expect(canPersistMemoryKind(p, "experience")).toBe(true);
  });

  it("写入权限带 confirmedAt", () => {
    const next = writeMemoryPermissions(
      {},
      { contributeToIndustryModel: true },
      "2026-07-18T00:00:00.000Z",
    );
    const p = readMemoryPermissions(next);
    expect(p.contributeToIndustryModel).toBe(true);
    expect(p.confirmedAt).toBe("2026-07-18T00:00:00.000Z");
  });
});

describe("behavior signals + evolve", () => {
  it("推翻委员会生成 decision_choice + override", () => {
    const signals = buildCouncilDecisionSignals({
      topic: "要不要加盟扩张",
      choice: "推翻委员会",
      recommendedAction: "暂缓加盟",
      note: "必须靠加盟获客",
    });
    expect(signals).toHaveLength(2);
    expect(signals[0].kind).toBe("decision_choice");
    expect(signals[1].kind).toBe("override_ai");
  });

  it("多次稳健议题 → riskPreference conservative", () => {
    let profile: Record<string, unknown> = {
      memoryPermissions: { ...DEFAULT_MEMORY_PERMISSIONS },
    };
    for (let i = 0; i < 3; i += 1) {
      const signals = buildCouncilDecisionSignals({
        topic: "是否用低成本验证再扩张",
        choice: "接受委员会",
        recommendedAction: "先验证",
      });
      profile = ingestSignalsAndEvolve(profile, signals);
    }
    const style = (profile.decisionStyle as { riskPreference: string })
      .riskPreference;
    expect(style).toBe("conservative");
  });

  it("关闭个人成长时不改 decisionStyle", () => {
    let profile: Record<string, unknown> = writeMemoryPermissions(
      {},
      { useForPersonalGrowth: false },
    );
    const signals = buildCouncilDecisionSignals({
      topic: "融资",
      choice: "推翻委员会",
      recommendedAction: "不融资",
    });
    profile = ingestSignalsAndEvolve(profile, signals);
    expect(profile.intelligenceEvolveSkipped).toBe("useForPersonalGrowth=false");
    expect(profile.decisionStyle).toBeUndefined();
  });

  it("关闭体验保存时不记信号", () => {
    let profile: Record<string, unknown> = writeMemoryPermissions(
      {},
      { saveExperience: false },
    );
    const signals = buildCouncilDecisionSignals({
      topic: "开第二店",
      choice: "接受委员会",
    });
    profile = ingestSignalsAndEvolve(profile, signals);
    expect(profile.behaviorSignals).toBeUndefined();
  });

  it("投影组装含权限与简报", () => {
    let profile: Record<string, unknown> = {
      lastFounderCapabilities: [
        {
          dim: "finance",
          label: "财务",
          score: 55,
          confidence: 0.6,
          updatedAt: "2026-07-18T00:00:00.000Z",
        },
        {
          dim: "strategy",
          label: "战略",
          score: 78,
          confidence: 0.7,
          updatedAt: "2026-07-18T00:00:00.000Z",
        },
      ],
    };
    profile = appendBehaviorSignal(
      profile,
      buildCouncilDecisionSignals({
        topic: "扩张",
        choice: "修改方案",
      })[0],
    );
    profile = evolveIntelligenceProfile(profile);
    const intel = buildFounderIntelligenceProfile({
      ownerId: "o1",
      projectId: "p1",
      profile,
    });
    expect(intel.version).toBe("v1");
    expect(intel.businessCapability.length).toBeGreaterThan(0);
    expect(intel.permissions.contributeToIndustryModel).toBe(false);
    const brief = buildIntelligenceBriefSummary(intel);
    expect(brief.headline.length).toBeGreaterThan(0);
  });
});

describe("parsePredictionFromSummary", () => {
  it("解析预测/实际", () => {
    const p = parsePredictionFromSummary("营业额预测100万实际80万");
    expect(p).not.toBeNull();
    expect(p!.predicted).toBe(100);
    expect(p!.actual).toBe(80);
  });
});
