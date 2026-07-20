import { describe, expect, it } from "vitest";
import {
  buildIndustryContributionCandidate,
  redactIndustryText,
  collectDenyList,
  industryFingerprint,
  hashContributorId,
} from "@/server/founder-layer/intelligence";
import { DEFAULT_MEMORY_PERMISSIONS } from "@/server/founder-layer/contracts/intelligence-profile";

describe("industry sanitize", () => {
  it("脱敏电话邮箱与品牌", () => {
    const text = redactIndustryText(
      "湘遇馆在13812345678联系，店长@foo.com，不建议进高租金商场",
      ["湘遇馆"],
    );
    expect(text).not.toContain("13812345678");
    expect(text).not.toContain("foo.com");
    expect(text).not.toContain("湘遇馆");
    expect(text).toContain("[电话]");
    expect(text).toContain("[品牌]");
  });

  it("contributorHash 单向且稳定", () => {
    const a = hashContributorId("owner_1");
    const b = hashContributorId("owner_1");
    const c = hashContributorId("owner_2");
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).not.toContain("owner_1");
  });

  it("fingerprint 对同规律去重", () => {
    const f1 = industryFingerprint("湘菜", "社区店位置比营销更关键");
    const f2 = industryFingerprint("湘菜", "社区店位置比营销更关键");
    expect(f1).toBe(f2);
  });
});

describe("buildIndustryContributionCandidate", () => {
  it("未 opt-in 返回 null", () => {
    const c = buildIndustryContributionCandidate({
      permissions: DEFAULT_MEMORY_PERMISSIONS,
      ownerId: "o1",
      category: "湘菜",
      rule: "社区店成功关键看位置而非短期投放",
      outcome: "confirmed",
      sourceKind: "validation",
    });
    expect(c).toBeNull();
  });

  it("opt-in 后产出脱敏候选且无品牌名", () => {
    const deny = collectDenyList({
      projectName: "蜀香小馆",
      brandNames: ["蜀香"],
    });
    const c = buildIndustryContributionCandidate({
      permissions: {
        ...DEFAULT_MEMORY_PERMISSIONS,
        contributeToIndustryModel: true,
      },
      ownerId: "o1",
      category: "川菜",
      rule: "蜀香小馆验证：午市套餐伤客单，不宜放大",
      outcome: "invalidated",
      sourceKind: "validation",
      projectName: "蜀香小馆",
      brandNames: ["蜀香"],
      denyList: deny,
    });
    expect(c).not.toBeNull();
    expect(c!.rule).not.toContain("蜀香");
    expect(c!.fingerprint.length).toBeGreaterThan(8);
    expect(c!.contributorHash.length).toBe(32);
  });

  it("过短脱敏结果丢弃", () => {
    const c = buildIndustryContributionCandidate({
      permissions: {
        ...DEFAULT_MEMORY_PERMISSIONS,
        contributeToIndustryModel: true,
      },
      ownerId: "o1",
      rule: "ok",
      outcome: "confirmed",
      sourceKind: "validation",
    });
    expect(c).toBeNull();
  });
});
