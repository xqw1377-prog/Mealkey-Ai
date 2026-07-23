import type { ToolAgentEngine, ToolAgentRequest } from "@mealkey/tool-agent-kit";
import {
  M_OPS_DIAG_AGENT_ID,
  M_OPS_DIAG_PRODUCT_NAME,
  type DiagnosisFinding,
  type RestaurantDiagnosisRequest,
  type RestaurantDiagnosisResult,
} from "./contracts";
import { mOpsDiagManifest } from "./manifest";
import { runDiagnosisOrchestrator } from "./reasoning/orchestrator";

/** 诊断引擎（同步）— 纯函数；零 Prisma / 零 UI */
export function diagnoseRestaurantSync(
  request: RestaurantDiagnosisRequest,
): RestaurantDiagnosisResult {
  const horizon = request.horizon || "7d";
  const focus = request.focus || "overall";
  const asOf = request.asOf || new Date().toISOString();

  const analyzed = runDiagnosisOrchestrator(request);

  return {
    agentId: M_OPS_DIAG_AGENT_ID,
    ok:
      analyzed.gaps.every((g) => g.severity !== "high") ||
      analyzed.findings.length > 0,
    productName: M_OPS_DIAG_PRODUCT_NAME,
    horizon,
    focus,
    asOf,
    health: analyzed.health,
    exam: analyzed.exam,
    consultation: analyzed.consultation,
    restaurantContext: analyzed.restaurantContext,
    evidenceLedger: analyzed.evidenceLedger,
    patterns: analyzed.patterns,
    caseRecord: analyzed.caseRecord,
    learningDraft: analyzed.learningDraft,
    evolution: analyzed.evolution,
    externalScan: analyzed.externalScan,
    findings: analyzed.findings,
    signals: analyzed.signals,
    insights: analyzed.insights,
    gaps: analyzed.gaps,
    customerLens: analyzed.customerLens,
  };
}

/** async 壳 — 兼容 ToolAgentEngine / Host await */
export async function runRestaurantDiagnosis(
  request: RestaurantDiagnosisRequest,
): Promise<RestaurantDiagnosisResult> {
  return diagnoseRestaurantSync(request);
}

/** 注册进 ToolAgentRegistry 用的 Engine 外壳 */
export const mOpsDiagEngine: ToolAgentEngine<
  RestaurantDiagnosisRequest,
  DiagnosisFinding
> = {
  manifest: mOpsDiagManifest,
  async run(request: ToolAgentRequest<RestaurantDiagnosisRequest>) {
    const result = await runRestaurantDiagnosis(request.input);
    return {
      agentId: M_OPS_DIAG_AGENT_ID,
      ok: result.ok,
      findings: result.findings,
      signalHints: result.signals.map((s) => ({
        typeHint: s.type,
        observation: s.observation,
        meaning: s.meaning,
        impact: s.impact,
        confidence: s.confidence,
        evidenceClaims: s.evidence.map((e) => e.fact),
      })),
      insightDraft: result.insights.length
        ? {
            caseId: request.meta?.caseId || `ops-diag-${Date.now()}`,
            findings: result.insights.map((i) => ({
              domain: i.domain,
              finding: i.finding,
              reasoning: i.reasoning,
              impact: i.impact,
              confidence: i.confidence,
              evidenceClaims: i.evidence.map((e) => e.claim),
            })),
          }
        : undefined,
      gaps: result.gaps,
      errorMessage: result.errorMessage,
    };
  },
};
