/**
 * 验证结果 → 建议复会 / 学习钩子（不替代 Growth 权威）
 */

import type { ValidationImpact, ValidationTask } from "../../contracts/validation";
import { detectDeviation, applyDeviationToProfile } from "./monitor";

/**
 * complete / 强偏航后的 profile 补丁：复会催办 + 最近学习摘要
 */
export function applyExecutionFeedbackToProfile(
  profile: Record<string, unknown>,
  input: {
    task: ValidationTask;
    result: "aligned" | "partial" | "off";
    impact: ValidationImpact;
    summary: string;
    positioning?: string | null;
  },
): Record<string, unknown> {
  let next = { ...profile };

  next.lastExecutionFeedback = {
    decisionId: input.task.decisionId,
    taskId: input.task.id || input.task.taskId,
    result: input.result,
    impact: input.impact,
    summary: input.summary.slice(0, 300),
    at: new Date().toISOString(),
  };

  if (input.result === "off" || input.impact === "invalidated") {
    const report = detectDeviation({
      projectId: input.task.projectId,
      task: {
        ...input.task,
        lifecycle: "FAILED",
        status: "at_risk",
      },
      positioning: input.positioning,
    });
    if (report) {
      next = applyDeviationToProfile(next, {
        ...report,
        severity: "high",
        kind: "evidence_invalidated",
        summary: input.summary.slice(0, 240) || report.summary,
      });
    } else {
      next.suggestedNextMeeting = {
        topic: `复盘：${input.task.hypothesis?.statement || input.task.title || "验证失败"}`.slice(
          0,
          120,
        ),
        reason: input.summary || "验证未通过，建议委员会复核路径",
      };
    }
  } else if (input.result === "partial") {
    const report = detectDeviation({
      projectId: input.task.projectId,
      task: {
        ...input.task,
        lifecycle: "REVIEW",
        status: "at_risk",
      },
      positioning: input.positioning,
    });
    if (report) {
      next = applyDeviationToProfile(next, {
        ...report,
        severity: "medium",
      });
    }
  }

  return next;
}
