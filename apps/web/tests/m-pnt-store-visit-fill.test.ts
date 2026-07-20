/**
 * 店访回填冒烟：清单 → 三联升级 → 假说vs现场 → 采纳空位
 */
import { describe, expect, it } from "vitest";
import {
  buildMarketResearchPack,
  applyStoreVisitFill,
  applyWhitespaceSuggestion,
  countFilledStoreVisits,
  createBrandProject,
  writeBrandBrief,
  BrandProjectStage,
} from "../../../packages/agents/src/m-pnt/consulting";

describe("store visit fill", () => {
  it("upgrades competitor triple and marks task filled", () => {
    let project = createBrandProject("p1", "b1");
    project = { ...project, stage: BrandProjectStage.CATEGORY_ANALYSIS };
    project = writeBrandBrief(project, {
      briefId: "brief_1",
      version: 1,
      status: "complete",
      businessContext: "长沙单店",
      categoryDefinition: "湘菜",
      targetCustomer: "带娃家庭",
      customerNeed: "干净可预期",
      competitiveSet: ["费大厨", "炊烟"],
      brandAmbition: "家庭首选",
      founderBelief: "一线稳出品",
      rawAnswers: {},
      gaps: [],
      compiledAt: new Date().toISOString(),
    });
    const pack = buildMarketResearchPack({
      brief: project.assets.brandBrief,
      city: "长沙",
    });
    expect(pack.storeVisitPlan?.tasks.length).toBeGreaterThan(0);
    const rival = pack.storeVisitPlan!.tasks[0]!.rivalName;
    const hyp = pack.storeVisitPlan!.tasks[0]!.mentalHypothesis;

    const updated = applyStoreVisitFill(pack, {
      rivalName: rival,
      observedMentalWord: "家庭聚餐招牌",
      evidenceSentence: "门头大字「带娃放心」；店员先问小孩几岁",
      threatToWhitespace: "已占家庭场景，空位需对立",
      note: "周六晚高峰店访",
    });

    expect(countFilledStoreVisits(updated)).toBe(1);
    const task = updated.storeVisitPlan!.tasks.find((t) => t.rivalName === rival)!;
    expect(task.status).toBe("filled");
    expect(task.observedMentalWord).toBe("家庭聚餐招牌");

    const brief = updated.competitorBriefs!.find((c) => c.name === rival)!;
    expect(brief.mentalPosition).toBe("家庭聚餐招牌");
    expect(brief.evidenceSentence).toMatch(/【店访】/);
    expect(brief.dataQuality).toBe("store_visit");
    expect(brief.threatToWhitespace).toMatch(/家庭/);
    expect(updated.evidenceNotes.some((n) => n.includes("店访回填"))).toBe(true);
    expect(updated.headline).toMatch(/店访升级/);

    // 假说 vs 现场
    expect(updated.storeVisitInsight).toBeTruthy();
    expect(updated.storeVisitInsight!.compares.length).toBeGreaterThan(0);
    const cmp = updated.storeVisitInsight!.compares.find(
      (c) => c.rivalName === rival,
    )!;
    expect(cmp.hypothesisMental).toBe(hyp);
    expect(cmp.observedMental).toBe("家庭聚餐招牌");
    expect(["confirmed", "partial", "overturned", "unknown"]).toContain(
      cmp.verdict,
    );
    expect(updated.storeVisitInsight!.whitespaceSuggestion.severity).toBeTruthy();
    expect(updated.reportMarkdown || "").toMatch(/假说 vs 现场/);
  });

  it("stores photo/audio attachment refs on fill", () => {
    const pack = buildMarketResearchPack({
      brief: {
        briefId: "b",
        version: 1,
        status: "complete",
        businessContext: "x",
        categoryDefinition: "湘菜",
        targetCustomer: "家庭",
        customerNeed: "放心",
        competitiveSet: ["A馆"],
        brandAmbition: "首选",
        founderBelief: "稳",
        rawAnswers: {},
        gaps: [],
        compiledAt: new Date().toISOString(),
      },
      city: "长沙",
    });
    const rival = pack.storeVisitPlan!.tasks[0]!.rivalName;
    const updated = applyStoreVisitFill(pack, {
      rivalName: rival,
      observedMentalWord: "家庭招牌",
      evidenceSentence: "门头大字家庭招牌，店员先推套餐",
      attachments: [
        {
          assetId: "asset_img_1",
          kind: "image",
          publicUrl: "/api/assets/asset_img_1/file",
          fileName: "door.jpg",
        },
        {
          assetId: "asset_aud_1",
          kind: "audio",
          publicUrl: "/api/assets/asset_aud_1/file",
          fileName: "clerk.m4a",
          transcript: "店员说带娃放心，先问小孩几岁",
        },
        // 重复 id 忽略
        {
          assetId: "asset_img_1",
          kind: "image",
          publicUrl: "/api/assets/asset_img_1/file",
          fileName: "door.jpg",
        },
      ],
    });
    const task = updated.storeVisitPlan!.tasks.find((t) => t.rivalName === rival)!;
    expect(task.attachments?.length).toBe(2);
    expect(task.attachments![0]!.kind).toBe("image");
    expect(task.attachments![1]!.kind).toBe("audio");
    expect(task.attachments![1]!.transcript).toMatch(/带娃放心/);
    expect(task.filledNote).toMatch(/附件2份/);
    expect(task.filledNote).toMatch(/转写1/);
    expect(updated.storeVisitPlan!.markdown).toMatch(/转写：店员说带娃放心/);
    expect(updated.evidenceNotes.some((n) => n.includes("店访录音转写"))).toBe(
      true,
    );
  });

  it("fills evidence from audio transcript when sentence is empty", () => {
    const pack = buildMarketResearchPack({
      brief: {
        briefId: "b",
        version: 1,
        status: "complete",
        businessContext: "x",
        categoryDefinition: "湘菜",
        targetCustomer: "家庭",
        customerNeed: "放心",
        competitiveSet: ["A馆"],
        brandAmbition: "首选",
        founderBelief: "稳",
        rawAnswers: {},
        gaps: [],
        compiledAt: new Date().toISOString(),
      },
      city: "长沙",
    });
    const rival = pack.storeVisitPlan!.tasks[0]!.rivalName;
    const updated = applyStoreVisitFill(pack, {
      rivalName: rival,
      observedMentalWord: "家庭招牌",
      evidenceSentence: "",
      attachments: [
        {
          assetId: "asset_aud_2",
          kind: "audio",
          publicUrl: "/api/assets/asset_aud_2/file",
          fileName: "field.m4a",
          transcript: "门头写带娃放心，店员开口先问几位小孩",
        },
      ],
    });
    const task = updated.storeVisitPlan!.tasks.find((t) => t.rivalName === rival)!;
    expect(task.observedEvidence).toMatch(/门头写带娃放心/);
  });

  it("can adopt whitespace suggestion when not keep", () => {
    const pack = buildMarketResearchPack({
      brief: {
        briefId: "b",
        version: 1,
        status: "complete",
        businessContext: "x",
        categoryDefinition: "湘菜",
        targetCustomer: "家庭",
        customerNeed: "放心",
        competitiveSet: ["A馆"],
        brandAmbition: "首选",
        founderBelief: "稳",
        rawAnswers: {},
        gaps: [],
        compiledAt: new Date().toISOString(),
      },
      city: "长沙",
    });
    // 强制空位与现场撞车，触发 abandon_overlap / pivot
    const withOverlapWs = {
      ...pack,
      whitespace: "家庭聚餐招牌首选",
    };
    const rival = pack.storeVisitPlan?.tasks[0]?.rivalName || "A馆";
    const filled = applyStoreVisitFill(withOverlapWs, {
      rivalName: rival,
      observedMentalWord: "家庭聚餐招牌",
      evidenceSentence: "门头写家庭聚餐招牌，店员开口就推套餐",
    });
    const sug = filled.storeVisitInsight!.whitespaceSuggestion;
    expect(sug.severity).not.toBe("keep");
    const adopted = applyWhitespaceSuggestion(filled, sug);
    expect(adopted.whitespace).toBe(sug.suggestedWhitespace);
    expect(adopted.headline).toMatch(/空位已校准/);
    expect(adopted.evidenceNotes[0]).toMatch(/空位已按店访建议/);
  });

  it("rejects thin fill", () => {
    const pack = buildMarketResearchPack({
      brief: {
        briefId: "b",
        version: 1,
        status: "complete",
        businessContext: "x",
        categoryDefinition: "湘菜",
        targetCustomer: "家庭",
        customerNeed: "放心",
        competitiveSet: ["A馆"],
        brandAmbition: "首选",
        founderBelief: "稳",
        rawAnswers: {},
        gaps: [],
        compiledAt: new Date().toISOString(),
      },
      city: "长沙",
    });
    expect(() =>
      applyStoreVisitFill(pack, {
        rivalName: "A馆",
        observedMentalWord: "家庭招牌",
        evidenceSentence: "短",
      }),
    ).toThrow(/证据句|转写/);
  });
});
