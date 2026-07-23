import { describe, expect, it } from "vitest";
import {
  buildPositioningReviewTopic,
  buildReviewMeetingHref,
} from "../src/lib/review-meeting";

describe("review-meeting deep links", () => {
  it("builds structured review topic", () => {
    const topic = buildPositioningReviewTopic({
      problem: "五一商圈选址",
      judgement: "适合开中端火锅",
      previousOneLiner: "年轻人社交火锅",
      newOneLiner: "周末家庭局首选湘菜",
      reason: "定位已变",
    });
    expect(topic).toContain("【定位变更复审】");
    expect(topic).toContain("五一商圈选址");
    expect(topic).toContain("年轻人社交火锅");
    expect(topic).toContain("周末家庭局首选湘菜");
    expect(topic).toContain("是否仍成立");
  });

  it("encodes advisor deep link with intent and decisionId", () => {
    const href = buildReviewMeetingHref({
      projectId: "proj_1",
      decisionId: "dec_9",
      problem: "选址",
      judgement: "可以开",
      previousOneLiner: "A",
      newOneLiner: "B",
    });
    expect(href.startsWith("/projects/proj_1/advisor?")).toBe(true);
    expect(href).toContain("intent=positioning_review");
    expect(href).toContain("decisionId=dec_9");
    expect(href).toContain("topic=");
  });
});
