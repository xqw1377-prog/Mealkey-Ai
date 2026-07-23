import type { MKContext, MKDecision } from "@mealkey/agent-sdk";

/**
 * Parse LLM free-form or JSON response into MKDecision.
 * Accepts either pure JSON or markdown fenced ```json blocks.
 */
export function parseLlmToMKDecision(
  content: string,
  opts: {
    idPrefix: string;
    problem: string;
    context: MKContext;
    fallback?: MKDecision;
  },
): MKDecision {
  const json = extractJsonObject(content);
  if (!json) {
    if (opts.fallback) return opts.fallback;
    return textFallback(content, opts);
  }

  const confidenceRaw = Number(json.confidence ?? json.score ?? 0.75);
  const confidence =
    confidenceRaw > 1
      ? Math.min(1, confidenceRaw / 100)
      : Math.max(0, Math.min(1, confidenceRaw));

  const evidenceRaw = Array.isArray(json.evidence) ? json.evidence : [];
  const evidence = evidenceRaw
    .map((e: unknown) => {
      const row = (e || {}) as Record<string, unknown>;
      return {
        source: String(row.source || "llm"),
        content: String(row.content || row.text || ""),
        relevance: Number(row.relevance ?? 0.7),
      };
    })
    .filter((e: { content: string }) => e.content.length > 0);

  if (evidence.length === 0) {
    evidence.push({
      source: "llm",
      content: content.slice(0, 500),
      relevance: 0.7,
    });
  }

  // Keep full JSON as structured for fusion
  evidence.push({
    source: "structured",
    content: JSON.stringify({ ...json, engine: "llm" }),
    relevance: 0.9,
  });

  return {
    id: `${opts.idPrefix}_${Date.now()}`,
    problem: String(json.problem || opts.problem),
    observation: String(json.observation || ""),
    diagnosis: String(json.diagnosis || ""),
    judgement: String(json.judgement || json.judgment || json.summary || ""),
    strategy: String(json.strategy || ""),
    action: String(json.action || ""),
    confidence,
    evidence,
  };
}

function extractJsonObject(content: string): Record<string, unknown> | null {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1].trim() : content.trim();
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // try first { ... } span
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
  }
  return null;
}

function textFallback(
  content: string,
  opts: { idPrefix: string; problem: string },
): MKDecision {
  return {
    id: `${opts.idPrefix}_${Date.now()}`,
    problem: opts.problem,
    observation: content.slice(0, 400),
    diagnosis: "LLM 未返回结构化 JSON，已降级为文本观察",
    judgement: content.slice(0, 200),
    strategy: "请人工复核或重跑 LLM 步骤",
    action: "检查 Prompt / 模型输出格式约束",
    confidence: 0.4,
    evidence: [
      { source: "llm_raw", content: content.slice(0, 1000), relevance: 0.5 },
    ],
  };
}
