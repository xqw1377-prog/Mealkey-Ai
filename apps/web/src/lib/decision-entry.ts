/**
 * 今日决策入口分流（一词一路）
 * 日常 → decision-room（默认 intake=ready）；扩店题 → decision-case
 *
 * 契约：ready 路径应配 sessionStorage Brief；若无 Brief，可用 ?why= 摘要 hydrate。
 */

export function isExpansionDecisionTopic(topic: string) {
  return /第二家|扩店|开店|扩张|分店/.test(topic || "");
}

export type DecisionReadyExtras = {
  /** 无 sessionStorage 时的 whyNow 摘要（写入 URL，≤120 字） */
  whyNow?: string;
};

/** 经营决策默认 ready 入口（扩店除外） */
export function decisionReadyPath(
  projectId: string,
  topic: string,
  extras?: DecisionReadyExtras,
) {
  const t = topic.trim();
  if (isExpansionDecisionTopic(t)) {
    return `/projects/${projectId}/decision-case`;
  }
  const params = new URLSearchParams();
  params.set("intake", "ready");
  if (t) params.set("topic", t);
  const why = (extras?.whyNow || "").replace(/\s+/g, " ").trim();
  if (why) params.set("why", why.slice(0, 120));
  return `/projects/${projectId}/decision-room?${params.toString()}`;
}

/**
 * 通用入口：有议题则进 ready；无议题进空白决策室；扩店进 case。
 * 需要厚 Brief 时请先 saveDecisionVoiceBrief，或传 whyNow 进 URL。
 */
export function decisionEntryPath(
  projectId: string,
  topic?: string | null,
  extras?: DecisionReadyExtras,
) {
  const t = (topic || "").trim();
  if (t && isExpansionDecisionTopic(t)) {
    return `/projects/${projectId}/decision-case`;
  }
  if (!t) return `/projects/${projectId}/decision-room`;
  return decisionReadyPath(projectId, t, extras);
}

/** @deprecated 使用 decisionReadyPath；保留别名 */
export function buildDecisionReadyHref(
  projectId: string,
  topic: string,
  extras?: DecisionReadyExtras,
) {
  return decisionReadyPath(projectId, topic, extras);
}
