import { describe, expect, it } from "vitest";
import {
  buildReviewReason,
  dismissReviewItem,
  isPositioningSensitiveType,
  mergeReviewQueue,
  pendingReviewCount,
  type ReviewQueueItem,
} from "../src/lib/positioning-review";

describe("positioning-review", () => {
  it("treats positioning type as non-sensitive and others as sensitive", () => {
    expect(isPositioningSensitiveType("positioning")).toBe(false);
    expect(isPositioningSensitiveType("location")).toBe(true);
    expect(isPositioningSensitiveType("investment")).toBe(true);
    expect(isPositioningSensitiveType("general")).toBe(true);
  });

  it("builds review reason with previous and new one-liners", () => {
    const reason = buildReviewReason({
      previousOneLiner: "年轻人社交火锅",
      newOneLiner: "周末家庭局首选湘菜",
      decisionType: "location",
    });
    expect(reason).toContain("年轻人社交火锅");
    expect(reason).toContain("周末家庭局首选湘菜");
    expect(reason).toContain("选址");
  });

  it("merges queue and re-opens as pending", () => {
    const existing: ReviewQueueItem[] = [
      {
        decisionId: "d1",
        problem: "p",
        judgement: "j",
        type: "location",
        reason: "old",
        flaggedAt: "2026-01-01",
        status: "dismissed",
      },
    ];
    const merged = mergeReviewQueue(existing, [
      {
        decisionId: "d1",
        problem: "p2",
        judgement: "j2",
        type: "location",
        reason: "new",
        flaggedAt: "2026-07-01",
        status: "pending",
      },
      {
        decisionId: "d2",
        problem: "p3",
        judgement: "j3",
        type: "marketing",
        reason: "new2",
        flaggedAt: "2026-07-02",
        status: "pending",
      },
    ]);
    expect(merged).toHaveLength(2);
    expect(merged.find((i) => i.decisionId === "d1")?.status).toBe("pending");
    expect(merged.find((i) => i.decisionId === "d1")?.reason).toBe("new");
    expect(pendingReviewCount(merged)).toBe(2);
  });

  it("dismisses items", () => {
    const queue: ReviewQueueItem[] = [
      {
        decisionId: "d1",
        problem: "p",
        judgement: "j",
        type: "general",
        reason: "r",
        flaggedAt: "2026-07-01",
        status: "pending",
      },
    ];
    const next = dismissReviewItem(queue, "d1", "reviewed");
    expect(next[0].status).toBe("reviewed");
    expect(pendingReviewCount(next)).toBe(0);
  });
});
