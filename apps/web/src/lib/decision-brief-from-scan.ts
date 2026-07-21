/**
 * 从今日扫描 / 世界变化构造可开会的 DecisionVoiceBrief
 * 避免「只有标题」进决策室；携带证据摘要。
 */

import type { DecisionVoiceBrief } from "@/lib/decision-voice-brief";

function clip(text: string, max: number): string {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

export function buildDecisionBriefFromWorldChange(input: {
  title: string;
  detail?: string;
  decisionTopic?: string;
  worldScanSummary?: string;
  known?: string[];
  missing?: string[];
  restaurantName?: string;
  evidenceClaims?: string[];
  judgment?: string;
  impact?: string;
  suggestion?: string;
  reviewQuestions?: string[];
}): DecisionVoiceBrief {
  const topic =
    clip(input.decisionTopic || input.title, 64) ||
    "根据今日经营变化，下一步最该拍什么板？";
  const evidenceSummary = (input.evidenceClaims || [])
    .map((c) => clip(c, 120))
    .filter(Boolean)
    .slice(0, 6);

  const whyParts = [
    clip(input.detail || "", 120),
    input.judgment ? clip(`判断：${input.judgment}`, 100) : "",
    input.impact ? clip(`影响：${input.impact}`, 80) : "",
    evidenceSummary.length
      ? `证据 ${evidenceSummary.length} 条`
      : "",
    input.worldScanSummary ? clip(input.worldScanSummary, 80) : "",
    input.restaurantName
      ? `对象：${clip(input.restaurantName, 24)}`
      : "",
  ].filter(Boolean);
  const knownLine = (input.known || []).filter(Boolean).slice(0, 3).join("、");
  const missingLine = (input.missing || [])
    .filter(Boolean)
    .slice(0, 3)
    .join("、");

  const constraints = [
    "不突破现金底线、合规底线与团队稳定",
    missingLine ? `先承认未知：${missingLine}` : "",
  ]
    .filter(Boolean)
    .join("；");

  const successLooksLike = [
    input.suggestion
      ? clip(`先做到：${input.suggestion}`, 100)
      : "有明确选择（做 / 不做 / 条件做）、能执行、能复盘成败",
    knownLine ? `立足已有认知：${knownLine}` : "",
  ]
    .filter(Boolean)
    .join("；");

  return {
    topic,
    whyNow:
      whyParts.join(" · ") ||
      "今日经营世界出现新变化，需要拍板下一步",
    decisionQuestion: topic,
    constraints: clip(constraints, 200),
    successLooksLike: clip(successLooksLike, 200),
    evidenceSummary: evidenceSummary.length ? evidenceSummary : undefined,
    reviewQuestions: input.reviewQuestions,
  };
}

export function buildDecisionBriefFromFocus(input: {
  title: string;
  whyToday?: string;
  known?: string[];
  missing?: string[];
  restaurantName?: string;
  evidenceClaims?: string[];
}): DecisionVoiceBrief {
  return buildDecisionBriefFromWorldChange({
    title: input.title,
    detail: input.whyToday,
    decisionTopic: input.title,
    known: input.known,
    missing: input.missing,
    restaurantName: input.restaurantName,
    evidenceClaims: input.evidenceClaims,
  });
}
