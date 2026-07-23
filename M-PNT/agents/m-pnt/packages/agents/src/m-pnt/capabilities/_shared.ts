import type { Evidence, MKContext, MKDecision } from "@mealkey/agent-sdk";

export function asList(value: string[] | string | undefined | null): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return String(value).split(/[,，、;；]/).map((s) => s.trim()).filter(Boolean);
}

export function projectLabel(context: MKContext): string {
  const p = context.project;
  return p.name || `${p.category || "餐饮"}·${p.city || "目标城市"}`;
}

export function evidence(source: string, content: string, relevance = 0.8): Evidence {
  return { source, content, relevance };
}

export function decision(partial: {
  idPrefix: string;
  problem: string;
  observation: string;
  diagnosis: string;
  judgement: string;
  strategy: string;
  action: string;
  confidence: number;
  evidence: Evidence[];
  payload?: Record<string, unknown>;
}): MKDecision {
  const confidence = Math.max(0, Math.min(1, partial.confidence));
  const evidence = [...partial.evidence];
  if (partial.payload) {
    evidence.push({ source: "structured", content: JSON.stringify(partial.payload), relevance: 0.9 });
  }
  return {
    id: `${partial.idPrefix}_${Date.now()}`,
    problem: partial.problem,
    observation: partial.observation,
    diagnosis: partial.diagnosis,
    judgement: partial.judgement,
    strategy: partial.strategy,
    action: partial.action,
    confidence,
    evidence,
  };
}

export function readPayload(d: MKDecision): Record<string, unknown> | undefined {
  const hit = d.evidence.find((e) => e.source === "structured");
  if (!hit) return undefined;
  try { return JSON.parse(hit.content) as Record<string, unknown>; }
  catch { return undefined; }
}
