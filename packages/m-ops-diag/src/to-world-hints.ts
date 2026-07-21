/**
 * DiagnosisSignal → 宿主雷达可消费的 world hint（不依赖 web 包）
 */
import type { DiagnosisSignal } from "./contracts";

export type OpsDiagWorldHint = {
  id: string;
  kind: "review" | "customer" | "alert";
  title: string;
  detail: string;
  decisionTopic?: string;
  source: "m-ops-diag";
};

export function diagnosisSignalsToWorldHints(
  signals: DiagnosisSignal[],
): OpsDiagWorldHint[] {
  return signals.map((s) => ({
    id: s.id.startsWith("m-ops-diag:") ? s.id : `m-ops-diag:${s.id}`,
    kind:
      s.type === "CUSTOMER"
        ? ("customer" as const)
        : s.severity === "HIGH" || s.severity === "CRITICAL"
          ? ("alert" as const)
          : ("review" as const),
    title: s.title,
    detail: [s.observation, s.pattern, s.meaning].filter(Boolean).join(" · "),
    decisionTopic: s.decisionTopic,
    source: "m-ops-diag" as const,
  }));
}
