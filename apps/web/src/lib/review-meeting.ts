/**
 * Build deep-links into Meeting for positioning-related re-review.
 */

export type ReviewMeetingParams = {
  projectId: string;
  decisionId?: string;
  problem?: string;
  judgement?: string;
  previousOneLiner?: string;
  newOneLiner?: string;
  reason?: string;
  /** auto-send after prefill (default false) */
  autoSend?: boolean;
};

/** Human-readable meeting topic for positioning re-review */
export function buildPositioningReviewTopic(args: {
  problem?: string;
  judgement?: string;
  previousOneLiner?: string;
  newOneLiner?: string;
  reason?: string;
}): string {
  const problem = (args.problem || "某条经营判断").trim();
  const judgement = (args.judgement || "").trim();
  const prev = (args.previousOneLiner || "").trim();
  const next = (args.newOneLiner || "").trim();

  const lines = [
    `【定位变更复审】请复审经营判断：${problem}`,
    judgement ? `原判断结论：${judgement}` : null,
    prev || next
      ? `品牌定位变化：${prev ? `「${prev}」` : "（无旧版）"} → ${next ? `「${next}」` : "（新版）"}`
      : null,
    args.reason ? `系统提示：${args.reason}` : null,
    "",
    "请输出：",
    "1) 该判断在新定位下是否仍成立（成立 / 部分成立 / 不成立）",
    "2) 若需调整：给出新的判断结论与理由",
    "3) 下一步 1-2 个可执行动作（含验证方式）",
  ];

  return lines.filter((l) => l !== null).join("\n");
}

export function buildReviewMeetingHref(params: ReviewMeetingParams): string {
  const topic = buildPositioningReviewTopic(params);
  const qs = new URLSearchParams();
  qs.set("intent", "positioning_review");
  qs.set("topic", topic);
  if (params.decisionId) qs.set("decisionId", params.decisionId);
  if (params.autoSend) qs.set("autoSend", "1");
  return `/projects/${params.projectId}/advisor?${qs.toString()}`;
}
