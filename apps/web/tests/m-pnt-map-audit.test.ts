/**
 * M-PNT — Positioning Map 可审计层
 */
import { describe, expect, it } from "vitest";
import {
  BrandProjectStage,
  ContractGateError,
  buildCompetitiveMap,
  adjustPlotPoint,
  reviewMapEvidenceItems,
  assertMapAuditable,
  acceptAllMapEvidence,
  createBrandProject,
  writeBrandBrief,
  writeCompetitiveMap,
  advance,
  writeEvidenceLedger,
  addPrimaryFact,
  type BrandBrief,
} from "../../../packages/agents/src/m-pnt/consulting";

const brief: BrandBrief = {
  briefId: "brief_1",
  version: 1,
  status: "complete",
  businessContext: "做城市家庭可依赖的湘菜",
  categoryDefinition: "家常湘菜",
  targetCustomer: "25-40岁城市家庭",
  customerNeed: "干净可预期的家常湘菜",
  competitiveSet: ["某湘", "社区家常菜"],
  brandAmbition: "家庭场合默认选择",
  founderBelief: "供应链与现代化表达",
  rawAnswers: {},
  gaps: [],
  compiledAt: new Date().toISOString(),
};

describe("map audit engine", () => {
  it("builds map with pending evidence and whitespace region", () => {
    const map = buildCompetitiveMap({ brief, city: "长沙" });
    expect(map.whitespaceRegion?.label).toBeTruthy();
    expect(map.whitespaceRegion?.halfW).toBeGreaterThan(0);
    expect(map.mapEvidence?.every((e) => e.reviewStatus === "pending")).toBe(true);
    expect(() => assertMapAuditable(map)).toThrow(ContractGateError);
  });

  it("adjusts whitespace point and syncs region", () => {
    let map = buildCompetitiveMap({ brief, city: "长沙" });
    const ws = map.plotPoints!.find((p) => p.kind === "whitespace")!;
    map = adjustPlotPoint(map, ws.id, { x: 40, y: 75, note: "创始人纠偏空位" });
    expect(map.whitespaceRegion?.x).toBe(40);
    expect(map.whitespaceRegion?.y).toBe(75);
    expect(map.plotPoints!.find((p) => p.id === ws.id)?.adjusted).toBe(true);
  });

  it("passes audit after evidence accepted", () => {
    let map = buildCompetitiveMap({ brief, city: "长沙" });
    map = acceptAllMapEvidence(map);
    expect(() => assertMapAuditable(map)).not.toThrow();
  });

  it("blocks advance from competitive without accepted map evidence", () => {
    let p = createBrandProject("proj");
    p = writeBrandBrief(p, brief);
    p = {
      ...p,
      stage: BrandProjectStage.COMPETITIVE_MAPPING,
      assets: {
        ...p.assets,
        brandBrief: brief,
        categoryDiagnosis: {
          artifactId: "c1",
          status: "complete",
          categoryName: brief.categoryDefinition,
          battlefield: "家庭场景",
          opportunity: "o",
          risks: ["r"],
        },
        consumerInsight: {
          artifactId: "cu1",
          status: "complete",
          targetCustomer: brief.targetCustomer,
          jobsToBeDone: ["j"],
          barriers: ["b"],
          unmetNeeds: ["n"],
        },
      },
    };
    let ledger = addPrimaryFact(undefined, {
      claim: "家庭周末堂食占比过半，品类缺品牌心智",
      sourceType: "sales_note",
      relatedStage: "CATEGORY_ANALYSIS",
    });
    ledger = addPrimaryFact(ledger, {
      claim: "用户说想吃湘菜但又怕太油腻踩雷",
      sourceType: "customer_quote",
      relatedStage: "CONSUMER_INSIGHT",
    });
    ledger = addPrimaryFact(ledger, {
      claim: "竞品主打重口宴请，家庭干净场景空缺",
      sourceType: "competitor_note",
      relatedStage: "COMPETITIVE_MAPPING",
    });
    p = writeEvidenceLedger(p, ledger);
    const draft = buildCompetitiveMap({ brief, city: "长沙" });
    p = writeCompetitiveMap(p, { ...draft, status: "complete" });
    const blocked = advance(p, "no_map_audit");
    expect(blocked.stageStatus).toBe("blocked");
    expect(blocked.blockedReasons.some((r) => r.includes("mapEvidence"))).toBe(true);

    p = writeCompetitiveMap(p, {
      ...acceptAllMapEvidence(draft),
      status: "complete",
    });
    const next = advance(p, "map_ok");
    expect(next.stage).toBe(BrandProjectStage.POSITIONING_DESIGN);
    expect(next.stageStatus).toBe("active");
  });

  it("reviews individual map evidence", () => {
    let map = buildCompetitiveMap({ brief, city: "长沙" });
    const first = map.mapEvidence![0]!;
    map = reviewMapEvidenceItems(map, [
      { evidenceId: first.evidenceId, reviewStatus: "accepted" },
    ]);
    expect(map.mapEvidence!.find((e) => e.evidenceId === first.evidenceId)?.reviewStatus).toBe(
      "accepted",
    );
    expect(() => assertMapAuditable(map)).toThrow(ContractGateError);
  });
});
