/**
 * Decision Inbox V1 — 经营问题池投影（非任务墙）
 * 权威：MEALKEY_DECISION_EXPERIENCE_V1.md
 */

export type DecisionInboxBucketV1 =
  | "pending_decide"
  | "watching"
  | "executing"
  | "reviewing";

export type DecisionInboxItemV1 = {
  id: string;
  kind: "candidate" | "case";
  title: string;
  bucket: DecisionInboxBucketV1;
  href: string;
};

export type DecisionInboxV1 = {
  pendingDecide: number;
  watching: number;
  executing: number;
  reviewing: number;
  items: DecisionInboxItemV1[];
};

export function emptyDecisionInbox(): DecisionInboxV1 {
  return {
    pendingDecide: 0,
    watching: 0,
    executing: 0,
    reviewing: 0,
    items: [],
  };
}
