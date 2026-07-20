/**
 * 把蒸馏知识库接到三席思维引擎
 */
import {
  getCases,
  matchRulesToText,
  rulesToLawChecks,
  type TheorySource,
} from "../knowledge";
import type { LawCheck, ReasoningStep } from "./protocol";

export function enrichVerdictWithKnowledge(input: {
  source: TheorySource;
  directionText: string;
  baseChecks: LawCheck[];
  baseScore: number;
  trace: ReasoningStep[];
}): {
  checks: LawCheck[];
  score: number;
  trace: ReasoningStep[];
  caseHint?: string;
} {
  const matched = matchRulesToText(input.source, input.directionText, 6);
  const distilled = rulesToLawChecks(matched, input.directionText).map((c) => ({
    law: `蒸馏·${c.law}`,
    pass: c.pass,
    delta: Math.max(-15, Math.min(15, Math.round(c.delta / 2))),
    note: c.note,
  }));

  const distilledDelta = distilled.reduce((s, c) => s + c.delta, 0);
  const score = Math.max(
    0,
    Math.min(100, Math.round(input.baseScore + distilledDelta * 0.35)),
  );

  const cases = getCases(input.source).slice(0, 2);
  const caseHint = cases[0]
    ? `参考案例「${cases[0].brand_name}」：${cases[0].mental_takeaway}`
    : undefined;

  const trace: ReasoningStep[] = [
    ...input.trace,
    {
      step: "蒸馏知识检验",
      judgment: matched.length
        ? `命中 ${matched.length} 条学派规则：${matched.map((r) => r.name).join("、")}`
        : "未命中特定规则，沿用启发式商规",
      evidence: matched[0]?.principle,
    },
  ];
  if (caseHint) {
    trace.push({
      step: "案例启示",
      judgment: caseHint,
      evidence: cases[0]?.final_position,
    });
  }

  // 启发式 checks 在前，蒸馏补强在后（去重 law 名）
  const seen = new Set(input.baseChecks.map((c) => c.law));
  const merged = [
    ...input.baseChecks,
    ...distilled.filter((c) => {
      if (seen.has(c.law)) return false;
      seen.add(c.law);
      return true;
    }),
  ];

  return { checks: merged, score, trace, caseHint };
}
