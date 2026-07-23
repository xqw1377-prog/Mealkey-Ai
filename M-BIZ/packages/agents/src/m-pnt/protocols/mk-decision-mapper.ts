import type { Evidence, MKContext, MKDecision } from "@mealkey/agent-sdk";
import { readPayload } from "../capabilities/_shared";

export function readStructured(
  d: MKDecision,
): Record<string, unknown> | undefined {
  return readPayload(d);
}

/**
 * Final positioning JSON (workflow step 7) → MKDecision for ChiefAgent.
 * Also accepts a chain of step MKDecisions to build a fused result offline.
 *
 * Structured extras live in evidence[source=structured] to stay frozen-protocol safe.
 */

export interface PositioningFinalJson {
  type?: string;
  summary?: string;
  confidence?: number;
  decision_recommend?: string;
  brandPositioning?: {
    brandName?: string;
    category?: string;
    targetCustomers?: string;
    priceRange?: string;
    differentiation?: string;
    brandTonality?: string;
    mentalPosition?: string;
  };
  why_choose_this?: string;
  why_not_others?: string;
  keyFindings?: Array<{
    dimension?: string;
    conclusion?: string;
    confidence?: number;
  }>;
  risks?: Array<{
    risk?: string;
    level?: string;
    code?: string;
    mitigation?: string;
  }>;
  validation?: {
    day30?: string[];
    day90?: string[];
    killCriteria?: string[];
  };
  mSolution?: {
    situation?: string;
    insight?: string;
    position?: string;
    strategy?: string;
    action?: string;
    validation?: string;
    decision?: string;
  };
  nextSteps?: Array<{ step?: string; priority?: string; timeline?: string }>;
  theory_vote_summary?: Record<string, unknown>;
  candidates?: unknown[];
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0.5;
  // allow 0-100 or 0-1
  const v = n > 1 ? n / 100 : n;
  return Math.max(0, Math.min(1, v));
}

export function mapFinalJsonToMKDecision(
  json: PositioningFinalJson,
  context: MKContext,
): MKDecision {
  const projectName =
    context.project.name ||
    `${context.project.category || "餐饮"}·${context.project.city || ""}`;
  const bp = json.brandPositioning || {};
  const m = json.mSolution || {};
  const confidence = clamp01(json.confidence ?? 0.75);

  const observation =
    m.situation ||
    [
      `品类:${bp.category || context.project.category || "-"}`,
      `客群:${bp.targetCustomers || "-"}`,
      `价格:${bp.priceRange || "-"}`,
    ].join("；");

  const diagnosis =
    m.insight ||
    json.why_not_others ||
    "定位问题集中在心智位置是否独特、有利、可防御。";

  // Prefer the sharp positioning line for ChiefAgent fusion readability
  const judgement =
    json.summary ||
    bp.mentalPosition ||
    m.position ||
    m.decision ||
    "待补充定位结论";

  const strategy =
    m.strategy ||
    [
      bp.differentiation ? `差异化：${bp.differentiation}` : null,
      bp.brandTonality ? `调性：${bp.brandTonality}` : null,
      json.why_choose_this ? `理由：${json.why_choose_this}` : null,
    ]
      .filter(Boolean)
      .join("；") || "见差异化与调性分析";

  const actions: string[] = [];
  if (m.action) actions.push(m.action);
  for (const s of json.nextSteps || []) {
    if (s.step) {
      actions.push(
        `${s.step}${s.timeline ? `（${s.timeline}）` : ""}${s.priority ? ` [${s.priority}]` : ""}`,
      );
    }
  }
  if (json.validation?.day30?.length) {
    actions.push(`30天验证：${json.validation.day30.join("；")}`);
  }
  const action = actions.join(" | ") || "按 nextSteps 执行验证";

  const evidence: Evidence[] = [];
  for (const f of json.keyFindings || []) {
    if (f.conclusion) {
      evidence.push({
        source: `finding:${f.dimension || "general"}`,
        content: f.conclusion,
        relevance: clamp01(f.confidence ?? 0.7),
      });
    }
  }
  for (const r of json.risks || []) {
    if (r.risk) {
      evidence.push({
        source: `risk:${r.code || r.level || "unspecified"}`,
        content: `${r.risk}${r.mitigation ? ` | 缓解: ${r.mitigation}` : ""}`,
        relevance: r.level === "high" ? 0.9 : 0.7,
      });
    }
  }
  if (evidence.length === 0) {
    evidence.push({
      source: "summary",
      content: json.summary || judgement,
      relevance: confidence,
    });
  }

  evidence.push({
    source: "structured",
    content: JSON.stringify({
      agentId: "m-pnt",
      project: projectName,
      decision_recommend: json.decision_recommend,
      brandPositioning: {
        brandName: bp.brandName || projectName,
        ...bp,
      },
      theory_vote_summary: json.theory_vote_summary,
      candidates: json.candidates,
      mSolution: m,
      risks: json.risks,
      validation: json.validation,
      nextSteps: json.nextSteps,
    }),
    relevance: 0.95,
  });

  return {
    id: `m-pnt_final_${Date.now()}`,
    problem: "品牌定位策略",
    observation,
    diagnosis,
    judgement,
    strategy,
    action,
    confidence,
    evidence,
  };
}

/** Offline fusion: chain of step decisions → single MKDecision for ChiefAgent. */
export function fuseStepDecisions(
  steps: MKDecision[],
  context: MKContext,
): MKDecision {
  const byPrefix = (prefix: string) =>
    steps.find((s) => s.id.startsWith(prefix) || s.problem.includes(labelOf(prefix)));

  function labelOf(prefix: string): string {
    const map: Record<string, string> = {
      category_analysis: "品类",
      customer_portrait: "客群",
      price_positioning: "价格",
      competitor_analysis: "竞争",
      differentiation: "差异化",
      brand_tonality: "调性",
    };
    return map[prefix] || prefix;
  }

  const cat = byPrefix("category_analysis") || steps[0];
  const cust = byPrefix("customer_portrait");
  const price = byPrefix("price_positioning");
  const comp = byPrefix("competitor_analysis");
  const diff = byPrefix("differentiation");
  const brand = byPrefix("brand_tonality");
  const last = steps[steps.length - 1];

  const diffPayload = (readPayload(diff || last) || {}) as {
    primaryDirection?: { oneLiner?: string; name?: string; id?: string };
    candidates?: unknown[];
    theoryViews?: unknown;
  };

  const primaryLine =
    diffPayload.primaryDirection?.oneLiner ||
    diff?.judgement ||
    last?.judgement ||
    "定位结论待确认";

  const json: PositioningFinalJson = {
    type: "positioning",
    summary: primaryLine,
    confidence: averageConfidence(steps),
    decision_recommend: "primary",
    brandPositioning: {
      brandName: context.project.name || undefined,
      category: String(context.project.category || ""),
      targetCustomers: cust?.judgement,
      priceRange: price?.judgement,
      differentiation: diffPayload.primaryDirection?.name || diff?.strategy,
      brandTonality: brand?.judgement,
      mentalPosition: primaryLine,
    },
    why_choose_this: diff?.strategy || last?.strategy,
    why_not_others: comp?.diagnosis,
    keyFindings: steps.map((s) => ({
      dimension: s.problem,
      conclusion: s.judgement,
      confidence: Math.round(s.confidence * 100),
    })),
    risks: [
      {
        risk: "候选方向未经真实市场验证",
        level: "medium",
        code: "R2",
        mitigation: "30/90 天验证路径",
      },
    ],
    validation: {
      day30: ["主场景到店话术与转述测试", "锚点套餐毛利验证"],
      day90: ["复购/转介绍是否指向同一心智锚"],
      killCriteria: ["心智转述发散", "主锚无法交付"],
    },
    mSolution: {
      situation: cat?.observation || "",
      insight: [cust?.diagnosis, comp?.diagnosis].filter(Boolean).join("；"),
      position: primaryLine,
      strategy: [diff?.strategy, brand?.strategy].filter(Boolean).join("；"),
      action: last?.action || diff?.action || "",
      validation: "30天验证主场景记忆；90天观察心智收敛",
      decision: primaryLine,
    },
    theory_vote_summary: (diffPayload.theoryViews || {}) as Record<
      string,
      unknown
    >,
    candidates: diffPayload.candidates as unknown[],
    nextSteps: [
      { step: "锁定主场景与一句话定位", priority: "high", timeline: "1周" },
      { step: "菜单与空间对齐主锚", priority: "high", timeline: "2-4周" },
      { step: "启动 30 天验证", priority: "medium", timeline: "1个月" },
    ],
  };

  return mapFinalJsonToMKDecision(json, context);
}

function averageConfidence(steps: MKDecision[]): number {
  if (!steps.length) return 0.6;
  return steps.reduce((a, s) => a + s.confidence, 0) / steps.length;
}
