/**
 * 今日决策入口分流（一词一路）
 * 日常 → decision-room；扩店题 → decision-case
 */

export function isExpansionDecisionTopic(topic: string) {
  return /第二家|扩店|开店|扩张|分店/.test(topic || "");
}

export function decisionEntryPath(projectId: string, topic?: string | null) {
  const t = (topic || "").trim();
  if (t && isExpansionDecisionTopic(t)) {
    return `/projects/${projectId}/decision-case`;
  }
  if (!t) return `/projects/${projectId}/decision-room`;
  return `/projects/${projectId}/decision-room?topic=${encodeURIComponent(t)}`;
}

export function decisionReadyPath(projectId: string, topic: string) {
  const t = topic.trim();
  if (isExpansionDecisionTopic(t)) {
    return `/projects/${projectId}/decision-case`;
  }
  return `/projects/${projectId}/decision-room?intake=ready&topic=${encodeURIComponent(t)}`;
}
