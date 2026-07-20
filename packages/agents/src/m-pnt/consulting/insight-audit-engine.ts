/**
 * Consumer Insight 可审计层 — 洞察证据审阅、创始人判断确认、推进门禁
 */
import type { ConsumerInsight, InsightEvidence } from "./types";
import { ContractGateError } from "./types";

const MIN_STATEMENT = 40;

function assertDraft(insight: ConsumerInsight) {
  if (insight.status === "complete") {
    throw new ContractGateError("用户洞察已确认完成，不可再改判断或审阅证据", [
      "consumerInsight.status=draft",
    ]);
  }
}

export function insightEvidenceStats(insight: ConsumerInsight) {
  const list = insight.insightEvidence || [];
  const accepted = list.filter((e) => e.reviewStatus === "accepted").length;
  const pending = list.filter(
    (e) => !e.reviewStatus || e.reviewStatus === "pending",
  ).length;
  const rejected = list.filter((e) => e.reviewStatus === "rejected").length;
  return { accepted, pending, rejected, total: list.length };
}

/** 审阅洞察证据 */
export function reviewInsightEvidenceItems(
  insight: ConsumerInsight,
  reviews: Array<{
    evidenceId: string;
    reviewStatus: "accepted" | "rejected" | "pending";
    rejectReason?: string;
  }>,
): ConsumerInsight {
  assertDraft(insight);
  const list = insight.insightEvidence || [];
  if (list.length === 0) {
    throw new ContractGateError("尚无洞察证据可审阅", ["insightEvidence.length=0"]);
  }
  const byId = new Map(reviews.map((r) => [r.evidenceId, r]));
  const next: InsightEvidence[] = list.map((e) => {
    const r = byId.get(e.evidenceId);
    if (!r) return e;
    return {
      ...e,
      reviewStatus: r.reviewStatus,
      rejectReason:
        r.reviewStatus === "rejected"
          ? (r.rejectReason || "创始人驳回：不足以支撑用户洞察").trim()
          : undefined,
    };
  });
  return { ...insight, insightEvidence: next };
}

/**
 * 创始人编辑并确认洞察判断（陈述 + 可选核心未满足/情感任务）
 * 这是「判断」而不只是系统生成文案。
 */
export function confirmInsightJudgment(
  insight: ConsumerInsight,
  input: {
    insightStatement: string;
    primaryUnmetNeed?: string;
    emotionalJob?: string;
    functionalJob?: string;
  },
): ConsumerInsight {
  assertDraft(insight);
  const statement = input.insightStatement.trim();
  if (statement.length < MIN_STATEMENT) {
    throw new ContractGateError(
      `洞察陈述过短（至少 ${MIN_STATEMENT} 字），请用自己的话写清「谁、在什么场合、要完成什么、现有选项缺什么」`,
      ["consumerInsight.judgmentConfirmed"],
    );
  }

  const primaryUnmet = (input.primaryUnmetNeed || insight.unmetNeeds[0] || "").trim();
  const unmetNeeds =
    primaryUnmet.length > 0
      ? [primaryUnmet, ...insight.unmetNeeds.filter((n) => n !== primaryUnmet)].slice(
          0,
          5,
        )
      : insight.unmetNeeds;

  const emotionalJob = (input.emotionalJob || insight.emotionalJob || "").trim();
  const functionalJob = (input.functionalJob || insight.functionalJob || "").trim();
  const jobsToBeDone = [
    functionalJob || insight.jobsToBeDone[0] || "",
    emotionalJob || insight.jobsToBeDone[1] || "",
    ...insight.jobsToBeDone.slice(2),
  ].filter(Boolean);

  const confirmedAt = new Date().toISOString();
  return {
    ...insight,
    insightStatement: statement,
    unmetNeeds,
    emotionalJob: emotionalJob || insight.emotionalJob,
    functionalJob: functionalJob || insight.functionalJob,
    jobsToBeDone: jobsToBeDone.length ? jobsToBeDone : insight.jobsToBeDone,
    judgmentConfirmedAt: confirmedAt,
    insightNarrative: [
      insight.insightNarrative || "",
      "",
      `【创始人洞察判断 · 已确认】${confirmedAt}`,
      `洞察陈述：${statement}`,
      primaryUnmet ? `核心未满足：${primaryUnmet}` : "",
      functionalJob ? `功能任务：${functionalJob}` : "",
      emotionalJob ? `情感任务：${emotionalJob}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

/** 确认推进前：洞察必须可审计 */
export function assertInsightAuditable(insight: ConsumerInsight): void {
  const missing: string[] = [];
  const statement = insight.insightStatement?.trim() || "";
  if (statement.length < MIN_STATEMENT) {
    missing.push("consumerInsight.insightStatement");
  }
  if (!insight.judgmentConfirmedAt) {
    missing.push("consumerInsight.judgmentConfirmed");
  }
  if ((insight.unmetNeeds?.length ?? 0) < 1) {
    missing.push("consumerInsight.unmetNeeds.length>=1");
  }
  const stats = insightEvidenceStats(insight);
  if (stats.accepted < 2) {
    missing.push("consumerInsight.insightEvidence.accepted>=2");
  }
  if (stats.pending > 0) {
    missing.push("consumerInsight.insightEvidence.pending=0");
  }
  if (missing.length > 0) {
    throw new ContractGateError(
      "用户洞察未完成可审计确认：请确认洞察陈述并审阅证据后再推进",
      missing,
    );
  }
}

/** 测试/迁移辅助：洞察证据全部标为采纳 */
export function acceptAllInsightEvidence(insight: ConsumerInsight): ConsumerInsight {
  return {
    ...insight,
    insightEvidence: (insight.insightEvidence || []).map((e) => ({
      ...e,
      reviewStatus: "accepted" as const,
      rejectReason: undefined,
    })),
  };
}

/** 测试辅助：证据采纳 + 判断确认 */
export function sealInsightForTests(insight: ConsumerInsight): ConsumerInsight {
  const withEvidence = acceptAllInsightEvidence(insight);
  const statement =
    (withEvidence.insightStatement || "").trim().length >= MIN_STATEMENT
      ? withEvidence.insightStatement!.trim()
      : `当「${withEvidence.targetCustomer}」处于关键场合时，真正要完成的是「${withEvidence.functionalJob || withEvidence.unmetNeeds[0] || "核心需求"}」，现有选项未能稳定提供确定感。`;
  return confirmInsightJudgment(withEvidence, {
    insightStatement: statement,
    primaryUnmetNeed: withEvidence.unmetNeeds[0],
    emotionalJob: withEvidence.emotionalJob,
    functionalJob: withEvidence.functionalJob,
  });
}
