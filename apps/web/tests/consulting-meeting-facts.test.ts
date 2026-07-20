import { describe, expect, it } from "vitest";
import {
  buildConsultingEvidenceBlock,
  extractConsultingMeetingFacts,
  mergeAssetContextWithConsultingFacts,
} from "@/server/services/consulting-meeting-facts";
import { buildAdvisorWorkspace } from "@/server/services/dashboard.service";
import { makeBundle } from "./fixtures/project-bundle";

describe("consulting-meeting-facts", () => {
  const profileWithVisit = {
    mPntBrandProject: {
      assets: {
        evidenceLedger: {
          facts: [
            {
              claim: "【待核实·简报】种子事实",
              verificationStatus: "unverified",
              tags: ["seed_from_brief", "needs_verification"],
            },
            {
              claim: "【店访·竞对A】心智「快」：门口排队 8 人",
              verificationStatus: "verified",
              tags: ["market_tool", "store_visit"],
              strength: "strong",
            },
            {
              claim: "已核实的客群画像：周末家庭客为主",
              verificationStatus: "verified",
              tags: ["interview"],
            },
          ],
        },
      },
    },
  };

  it("优先提取已验证店访，排除简报种子", () => {
    const result = extractConsultingMeetingFacts(profileWithVisit);
    expect(result.storeVisitCount).toBe(1);
    expect(result.lines[0]).toContain("【店访·竞对A】");
    expect(result.lines.some((l) => l.includes("客群画像"))).toBe(true);
    expect(result.lines.some((l) => l.includes("待核实"))).toBe(false);
  });

  it("证据块置顶合并进 assetContext", () => {
    const lines = extractConsultingMeetingFacts(profileWithVisit).lines;
    const block = buildConsultingEvidenceBlock(lines);
    expect(block).toContain("一手咨询证据");
    const merged = mergeAssetContextWithConsultingFacts("旧资料一行", lines);
    expect(merged?.startsWith("【一手咨询证据")).toBe(true);
    expect(merged).toContain("旧资料一行");
  });

  it("顾问会 knownFacts 前置店访事实", () => {
    const lines = extractConsultingMeetingFacts(profileWithVisit).lines;
    const workspace = buildAdvisorWorkspace(makeBundle(), {
      consultingFactLines: lines,
      storeVisitFactCount: 1,
    });
    expect(workspace.storeVisitFactCount).toBe(1);
    expect(workspace.knownFacts[0]).toContain("【店访");
    expect(workspace.evidenceItems[0]).toContain("【店访");
  });
});
