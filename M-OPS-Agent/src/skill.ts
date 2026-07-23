/**
 * Decision Skill：餐厅健康评估（外置）
 * 引擎复用 @mealkey/m-ops-diag；接入只经 Platform SDK。
 */
import type { ContextPackageV1 } from "@mealkey/agent-sdk/platform";
import {
  advanceDiagnosisCase,
  buildDiagnosisRequest,
  diagnoseRestaurantSync,
  type DiagnosisEvidenceItem,
  type DiagnosisLearning,
  type DiagnosisSignal,
  type RestaurantHealthSnapshot,
  type RestaurantDiagnosisResult,
} from "@mealkey/m-ops-diag";
import { gap, insight, signal } from "@mealkey/agent-sdk/platform";
import type { IngressItemV1 } from "@mealkey/agent-sdk/platform";

export type DiagnosisSkillResult = {
  result: RestaurantDiagnosisResult;
  ingressItems: IngressItemV1[];
};

export type DiagnosisSkillRuntime = {
  previousSnapshot?: RestaurantHealthSnapshot;
  previousLearnings?: DiagnosisLearning[];
  onResult?: (payload: DiagnosisSkillResult) => void;
};

function contextToEvidence(ctx: ContextPackageV1): DiagnosisEvidenceItem[] {
  return (ctx.evidence || []).map((e, i) => ({
    id: e.id || `ev-${i}`,
    source: e.source,
    claim: e.claim,
    sentiment: e.sentiment,
    theme: e.theme,
    observedAt: e.observedAt,
  }));
}

function signalToIngress(s: DiagnosisSignal): IngressItemV1 {
  return {
    port: "signal",
    level: 2,
    payload: signal({
      type: s.type,
      title: s.title.slice(0, 12),
      severity: s.severity,
      observation: s.observation,
      pattern: s.pattern,
      meaning: s.meaning,
      impact: s.impact,
      confidence: s.confidence,
      evidence: s.evidence.length
        ? s.evidence
        : [{ source: "diagnosis", fact: s.observation }],
      evidenceChain: [
        { kind: "external_intel", claim: s.observation },
        { kind: "inference", claim: s.pattern },
      ],
      watchHint: s.watchHint,
    }),
  };
}

/** 纯 Skill：Context Package → 诊断 → Ingress items（≤L3） */
export function runRestaurantDiagnosisSkill(
  ctx: ContextPackageV1,
  runtime?: DiagnosisSkillRuntime,
): DiagnosisSkillResult {
  const evidence = contextToEvidence(ctx);
  const result = diagnoseRestaurantSync(
    buildDiagnosisRequest({
      restaurantContext: {
        brandName: ctx.identity?.brand,
        storeName: ctx.identity?.storeName,
        category: ctx.identity?.category,
        city: ctx.identity?.city,
        address: ctx.identity?.district,
        projectId: ctx.restaurantId,
      },
      facts: (ctx.facts || []).map((f) => ({
        kind: f.kind,
        claim: f.claim,
        asOf: f.asOf,
      })),
      evidence,
      focus: "overall",
      horizon: "7d",
      asOf: ctx.asOf,
      previousSnapshot: runtime?.previousSnapshot,
      previousLearnings: runtime?.previousLearnings,
    }),
  );

  if (result.caseRecord) {
    result.caseRecord = advanceDiagnosisCase(
      result.caseRecord,
      result.signals.length ? "VALIDATED" : "ANALYZING",
    );
  }

  const ingressItems: IngressItemV1[] = [];

  for (const s of result.signals.slice(0, 3)) {
    ingressItems.push(signalToIngress(s));
  }

  for (const g of result.gaps.slice(0, 5)) {
    ingressItems.push({
      port: "gap",
      level: 1,
      payload: gap({
        field: g.field,
        reason: g.reason,
        severity: g.severity,
      }),
    });
  }

  const top = result.insights[0];
  if (top) {
    ingressItems.push({
      port: "insight",
      level: 3,
      payload: insight({
        topic: top.domain,
        finding: top.finding,
        reasoning: top.reasoning,
        impact: top.impact,
        confidence: top.confidence,
        evidence: top.evidence.map((e) => ({
          claim: e.claim,
          source: e.source,
        })),
        unknowns: top.unknowns,
        recommendation: result.signals[0]?.watchHint,
      }),
    });
  }

  if (result.caseRecord && ingressItems.length) {
    result.caseRecord = advanceDiagnosisCase(result.caseRecord, "TRANSFERRED");
  }

  const payload = { result, ingressItems };
  runtime?.onResult?.(payload);
  return payload;
}
