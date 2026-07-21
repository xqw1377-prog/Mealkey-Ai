import { MkError } from "./errors";
import type {
  GapIngressV1,
  InsightIngressV1,
  SignalIngressV1,
  WorkIngressV1,
} from "./types";

const FORBIDDEN =
  /请批准|已决策|签字确认|全面升级|降本增效|赋能/;

function assertConfidence(n: number) {
  if (typeof n !== "number" || n < 0 || n > 1) {
    throw new MkError("SCHEMA_INVALID", "confidence must be 0–1");
  }
}

/** Client-side Signal builder — rejects empty evidence / decision verbs */
export function signal(input: SignalIngressV1): SignalIngressV1 {
  assertConfidence(input.confidence);
  if (!input.evidence?.length) {
    throw new MkError("NO_EVIDENCE", "signal.evidence required");
  }
  if (input.watchHint && FORBIDDEN.test(input.watchHint)) {
    throw new MkError("FORBIDDEN_DECISION", "watchHint must not contain decision verbs");
  }
  return input;
}

export function insight(input: InsightIngressV1): InsightIngressV1 {
  assertConfidence(input.confidence);
  if (!input.evidence?.length) {
    throw new MkError("NO_EVIDENCE", "insight.evidence required");
  }
  const text = `${input.recommendation || ""} ${input.decisionTopic || ""}`;
  if (FORBIDDEN.test(text)) {
    throw new MkError("FORBIDDEN_DECISION", "insight must not contain decision verbs");
  }
  return input;
}

export function gap(input: GapIngressV1): GapIngressV1 {
  if (!input.field?.trim() || !input.reason?.trim()) {
    throw new MkError("SCHEMA_INVALID", "gap.field and gap.reason required");
  }
  return input;
}

export function work(input: WorkIngressV1): WorkIngressV1 {
  if (!input.requiresDecisionId?.trim()) {
    throw new MkError("WORK_NO_AUTH", "work.requiresDecisionId required for L5");
  }
  return input;
}
