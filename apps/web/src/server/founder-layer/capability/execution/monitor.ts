/**
 * 经营偏航检测 — 只建议复会，不终局改战略
 */

import type { ValidationTask } from "../../contracts/validation";
import type {
  DeviationCommittee,
  DeviationReport,
  DeviationSeverity,
} from "../../contracts/execution-runtime";
import { projectRisksFromDeviation } from "../risk/detect";
import { mergeRiskAlertsIntoProfile } from "../risk/profile";

function buildId(prefix: string) {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? `${prefix}_${crypto.randomUUID().slice(0, 8)}`
    : `${prefix}_${Date.now().toString(36)}`;
}

function committeeFromTask(task: ValidationTask): DeviationCommittee {
  const c = task.committee;
  if (c === "brand" || c === "market" || c === "business" || c === "capital") {
    return c;
  }
  return "council";
}

/**
 * 根据验证任务状态生成偏航报告；无偏航返回 null
 */
export function detectDeviation(input: {
  projectId: string;
  task: ValidationTask;
  /** 可选：品牌主张，用于 strategy_mismatch 文案 */
  positioning?: string | null;
}): DeviationReport | null {
  const { task, projectId } = input;
  const failedMetrics = (task.metrics || []).filter((m) => m.status === "failed");
  const triggerFired = (task.triggers || []).filter((t) => t.fired);
  const atRisk =
    task.lifecycle === "REVIEW" ||
    task.lifecycle === "FAILED" ||
    task.status === "at_risk" ||
    triggerFired.length > 0;

  if (!atRisk && failedMetrics.length === 0) {
    return null;
  }

  let severity: DeviationSeverity = "medium";
  if (task.lifecycle === "FAILED" || failedMetrics.length >= 2) {
    severity = "high";
  } else if (triggerFired.some((t) => t.type === "metric_drop")) {
    severity = "high";
  } else if (task.lifecycle === "REVIEW" || failedMetrics.length === 1) {
    severity = "medium";
  }

  const kind =
    failedMetrics.length > 0 || triggerFired.some((t) => t.type === "metric_drop")
      ? ("metric_miss" as const)
      : triggerFired.some((t) => t.type === "time_delay")
        ? ("time_slip" as const)
        : task.lifecycle === "FAILED"
          ? ("evidence_invalidated" as const)
          : ("strategy_mismatch" as const);

  const metricHint = failedMetrics[0]
    ? `指标「${failedMetrics[0].label || failedMetrics[0].name}」未达目标`
    : triggerFired[0]?.reason || task.aiJudgement || "验证路径出现偏航";

  const hypothesis = task.hypothesis?.statement || task.objective || "当前经营假设";
  const summary = `${metricHint}。假设「${hypothesis.slice(0, 48)}」需要委员会复核。`;

  const suggestCommittee = committeeFromTask(task);
  const topicBase = task.title || hypothesis;
  const suggestedCouncilTopic = `复盘：${topicBase}`.slice(0, 120);

  return {
    reportId: buildId("dev"),
    projectId,
    decisionId: task.decisionId,
    validationTaskId: task.id || task.taskId,
    kind,
    severity,
    summary: summary.slice(0, 240),
    suggestedCouncilTopic,
    suggestCommittee,
    createdAt: new Date().toISOString(),
  };
}

/** 高/中偏航写入 profile 补丁（建议复会）；可选合并 Risk Alert */
export function applyDeviationToProfile(
  profile: Record<string, unknown>,
  report: DeviationReport,
  opts?: { ownerId?: string },
): Record<string, unknown> {
  const shouldMeeting = report.severity === "high" || report.severity === "medium";
  let next: Record<string, unknown> = {
    ...profile,
    lastDeviationReport: report,
    ...(shouldMeeting
      ? {
          suggestedNextMeeting: {
            topic: report.suggestedCouncilTopic,
            reason: report.summary,
          },
        }
      : {}),
  };

  if (opts?.ownerId && shouldMeeting) {
    const alerts = projectRisksFromDeviation({
      ownerId: opts.ownerId,
      projectId: report.projectId,
      report,
    });
    next = mergeRiskAlertsIntoProfile(next, alerts);
  }

  return next;
}
