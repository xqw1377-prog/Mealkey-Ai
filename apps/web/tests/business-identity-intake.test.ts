import { describe, expect, it } from "vitest";
import {
  buildBusinessIdentity,
  buildIdentityUnderstanding,
} from "@/lib/onboarding-interview";
import { parseLocationLine } from "@/server/founder-layer/contracts/business-identity";

describe("Business Identity intake", () => {
  it("解析城市·区域", () => {
    const loc = parseLocationLine("长沙 · 岳麓区");
    expect(loc.city).toBe("长沙");
    expect(loc.district).toContain("岳麓");
  });

  it("生成 Identity 且品牌地理齐时 externalIntelReady", () => {
    const id = buildBusinessIdentity({
      scope: "store",
      objectName: "南门小馆",
      brandName: "最湘宴",
      location: "长沙市岳麓区含浦",
      storeCountBand: "1",
      focus: "expansion",
      decisionHorizon: "long",
      biggestProblem: "要不要开第二家",
    });
    expect(id.externalIntelReady).toBe(true);
    expect(id.city).toContain("长沙");
    expect(id.focus).toBe("expansion");
    expect(id.decisionHorizon).toBe("long");
  });

  it("摘要卡含关注重点", () => {
    const u = buildIdentityUnderstanding({
      scope: "brand",
      objectName: "最湘宴",
      brandName: "最湘宴",
      location: "长沙",
      storeCountBand: "2-5",
      focus: "profit",
      decisionHorizon: "short",
      biggestProblem: "人工吃利润",
    });
    expect(u.stageLabel).toBeTruthy();
    expect(u.watchLines.length).toBeGreaterThan(0);
    expect(u.externalIntelReady).toBe(true);
  });
});
