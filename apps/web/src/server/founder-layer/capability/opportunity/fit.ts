/**
 * Opportunity O2 — Fit Engine（是不是你的机会）
 */

import type { FounderMemorySnapshot } from "../../contracts";
import { buildForbiddenReminders } from "../../memory/reminders";

export function scoreCompanyFit(input: {
  baseFit?: number;
  memory?: FounderMemorySnapshot | null;
  topic?: string;
  /** Growth 最弱能力分 0–100，越低越压 Fit */
  weakestScore?: number;
  hasCapabilityGap?: boolean;
}): number {
  let fit =
    typeof input.baseFit === "number" && Number.isFinite(input.baseFit)
      ? input.baseFit
      : 0.7;

  const reminders = buildForbiddenReminders(input.memory, input.topic);
  if (reminders.length > 0) {
    fit *= 0.35; // 禁区冲突大幅降分
  }

  if (typeof input.weakestScore === "number") {
    if (input.weakestScore < 40) fit *= 0.7;
    else if (input.weakestScore < 55) fit *= 0.85;
  }

  if (input.hasCapabilityGap) fit *= 0.8;

  if (fit < 0) return 0;
  if (fit > 1) return 1;
  return Math.round(fit * 100) / 100;
}
