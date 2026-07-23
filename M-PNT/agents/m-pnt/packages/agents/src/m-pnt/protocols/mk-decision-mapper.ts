import type { Evidence, MKContext, MKDecision } from "@mealkey/agent-sdk";
import { readPayload } from "../capabilities/_shared";
import { getCreativeTemplate } from "../strategy/creative-templates";
import type { CreativeTemplate } from "../strategy/creative-templates";

export function readStructured(
  d: MKDecision,
): Record<string, unknown> | undefined {
  return readPayload(d);
}

// ─── 专题页出参结构 ───────────────────────────────────────────

export interface PositioningPageOutput {
  /** 定位结论（一句话） */
  summary: string;
  /** 决策推荐等级 */
  decision_recommend: "primary" | "secondary" | "backup" | "reject";
  /** 综合评分 0-100 */
  overall_score: number;
  /** 心智占位等级 */
  mind_position_level: "A" | "B" | "C" | "D";
  /** 最大风险等级 */
  max_risk_severity: "R1" | "R2" | "R3" | "R4";

  /** 品类定位 */
  category: string;
  /** 目标心智客户 */
  target_customers: string;
  /** 价格带 */
  price_range: string;
  /** 差异化核心 */
  differentiation: string;
  /** 品牌调性 */
  brand_tonality: string;
  /** 心智位置一句话 */
  mental_position: string;

  /** 为什么选这个方向 */
  why_choose_this: string;
  /** 为什么不选其他 */
  why_not_others: string;

  /** 候选方向列表 */
  candidates: Array<{
    id: string;
    name: string;
    oneLiner: string;
    style: string;
    score: number;
    recommend: string;
    reason?: string;
  }>;

  /** 三理论投票摘要 */
  theory_vote_summary: Array<{
    agent: string;
    preferred: string;
    theory_recommend: string;
  }>;

  /** Cross-Fire 辩论叙事 */
  cross_fire_game_summary: string;

  /** 风险清单 */
  risks: Array<{
    risk: string;
    severity: string;
    mitigation?: string;
  }>;

  /** 验证计划 */
  validation: {
    day30: string[];
    day90: string[];
    kill_criteria: string[];
  };

  /** 下一步行动 */
  next_steps: Array<{
    step: string;
    priority: string;
    timeline: string;
  }>;

  /** M-Solution 完整结构 */
  m_solution: {
    situation: string;
    insight: string;
    position: string;
    strategy: string;
    action: string;
    validation: string;
    decision: string;
  };

  /** 六维诊断摘要 */
  six_dimension_summary?: string;

  /** 创意策略与落地执行 */
  creative_strategy: {
    /** 品牌口号 */
    slogan: string;
    /** 视觉调性 */
    visual: string[];
    /** 传播策略 */
    communication: string[];
    /** 落地执行路径 */
    execution: Array<{ week: string; actions: string[] }>;
    /** 里程碑 */
    milestones: Array<{ month: string; target: string; metric: string }>;
    /** 不做什么（品牌边界） */
    not_doing: string[];
  };
}

/**
 * 将 MKDecision 转换为专题页输出
 *
 * 调用方式：
 *   const pageOutput = decisionToPageOutput(result.decision);
 *   // 前端直接渲染 pageOutput
 */
export function decisionToPageOutput(
  decision: MKDecision,
): PositioningPageOutput {
  const structured = readStructured(decision) || {};

  const bp = (structured.brandPositioning || {}) as Record<string, string>;
  const mSolution = (structured.mSolution || {}) as Record<string, string>;
  const theoryVote = (structured.theory_vote_summary || {}) as Record<string, { preferred: string; theory_recommend: string }>;
  const risks = (structured.risks || []) as Array<{ risk?: string; severity?: string; mitigation?: string }>;
  const validation = (structured.validation || {}) as Record<string, unknown>;
  const nextSteps = (structured.nextSteps || []) as Array<{ step?: string; priority?: string; timeline?: string }>;
  const candidates = (structured.candidates || []) as Array<{ id?: string; name?: string; oneLiner?: string; type?: string; theory_score?: number; theory_recommend?: string }>;
  const crossFire = (structured.crossFire || structured.cross_fire || {}) as Record<string, unknown>;

  return {
    summary: String(structured.summary || bp.mental_position || decision.judgement || ""),
    decision_recommend: (structured.decision_recommend || "primary") as "primary" | "secondary" | "backup" | "reject",
    overall_score: Number(structured.overall_score ?? 65),
    mind_position_level: (structured.mind_position_level || "B") as "A" | "B" | "C" | "D",
    max_risk_severity: (structured.max_risk_severity || "R2") as "R1" | "R2" | "R3" | "R4",

    category: String(bp.category || ""),
    target_customers: String(bp.targetCustomers || ""),
    price_range: String(bp.priceRange || ""),
    differentiation: String(bp.differentiation || ""),
    brand_tonality: String(bp.brandTonality || ""),
    mental_position: String(bp.mentalPosition || decision.judgement || ""),

    why_choose_this: String(structured.why_choose_this || decision.strategy || ""),
    why_not_others: String(structured.why_not_others || decision.diagnosis || ""),

    candidates: candidates.map((c) => ({
      id: String(c.id || ""),
      name: String(c.name || ""),
      oneLiner: String(c.oneLiner || ""),
      style: String((c as any).type || (c as any).style || "稳健型"),
      score: Number(c.theory_score ?? 50),
      recommend: String(c.theory_recommend || "neutral"),
    })),

    theory_vote_summary: Object.entries(theoryVote).map(([agent, v]) => ({
      agent,
      preferred: String(v.preferred || ""),
      theory_recommend: String(v.theory_recommend || "neutral"),
    })),

    cross_fire_game_summary: String((crossFire as any).game_summary || ""),

    risks: risks.map((r) => ({
      risk: String(r.risk || ""),
      severity: String(r.severity || "R1"),
      mitigation: r.mitigation ? String(r.mitigation) : undefined,
    })),

    validation: {
      day30: (validation.day30 as string[]) || [],
      day90: (validation.day90 as string[]) || [],
      kill_criteria: (validation.killCriteria as string[]) || [],
    },

    next_steps: nextSteps.map((s) => ({
      step: String(s.step || ""),
      priority: String(s.priority || "medium"),
      timeline: String(s.timeline || ""),
    })),

    m_solution: {
      situation: String(mSolution.situation || decision.observation || ""),
      insight: String(mSolution.insight || decision.diagnosis || ""),
      position: String(mSolution.position || decision.judgement || ""),
      strategy: String(mSolution.strategy || decision.strategy || ""),
      action: String(mSolution.action || decision.action || ""),
      validation: String(mSolution.validation || ""),
      decision: String(mSolution.decision || decision.judgement || ""),
    },

    // 创意策略与落地执行
    creative_strategy: buildCreativeStrategy(structured, bp, decision),
  };
}

function buildCreativeStrategy(
  structured: Record<string, unknown>,
  bp: Record<string, string>,
  decision: MKDecision,
): PositioningPageOutput["creative_strategy"] {
  const candidates = (structured.candidates || []) as Array<{ style?: string; type?: string; name?: string }>;
  const primaryType = candidates[0]?.style || candidates[0]?.type || "";
  const category = String(bp.category || "");
  // 优先从 structured.project 或 observation 中提取城市
  const project = (structured as any).project || "";
  let city = typeof project === "string" && project.includes("·") ? project.split("·")[1] || "" : "";
  if (!city) {
    // 回落：从 observation 解析（格式："品类:湘菜；客群:...；价格:..."）
    const obsParts = decision.observation.split("；");
    const catPart = obsParts.find((p) => p.startsWith("品类:"));
    if (catPart) {
      const raw = catPart.replace("品类:", "").trim();
      // raw 可能是 "湘菜" 不带城市，尝试从 projectName 拿
      city = raw;
    }
  }

  // 获取创意模版
  const tmpl: CreativeTemplate = getCreativeTemplate(primaryType, category, city);

  return {
    slogan: tmpl.slogan,
    visual: tmpl.visual,
    communication: tmpl.communication,
    execution: tmpl.execution.map((e) => ({ week: e.week, actions: e.actions })),
    milestones: tmpl.milestones,
    not_doing: tmpl.not_doing,
  };
}

// ─── 原有 MKDecision 映射（保持兼容）──────────────────────────

export interface PositioningFinalJson {
  type?: string;
  summary?: string;
  confidence?: number;
  decision_recommend?: string;
  overall_score?: number;
  mind_position_level?: string;
  max_risk_severity?: string;
  brandPositioning?: {
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
  distillation?: Record<string, unknown>;
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0.5;
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
      overall_score: json.overall_score,
      mind_position_level: json.mind_position_level,
      max_risk_severity: json.max_risk_severity,
      brandPositioning: bp,
      theory_vote_summary: json.theory_vote_summary,
      candidates: json.candidates,
      distillation: json.distillation,
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

  const diffPayload = (readPayload(diff || last) || {}) as Record<string, unknown>;

  const primaryLine =
    (diffPayload.primaryDirection as any)?.oneLiner ||
    diff?.judgement ||
    last?.judgement ||
    "定位结论待确认";

  const json: PositioningFinalJson = {
    type: "positioning",
    summary: primaryLine,
    confidence: averageConfidence(steps),
    decision_recommend: String(diffPayload.decision_recommend || "primary"),
    overall_score: Number(diffPayload.overall_score ?? 65),
    mind_position_level: String(diffPayload.mind_position_level ?? "B"),
    max_risk_severity: String(diffPayload.max_risk_severity ?? "R2"),
    brandPositioning: {
      category: String(context.project.category || ""),
      targetCustomers: cust?.judgement,
      priceRange: price?.judgement,
      differentiation: (diffPayload.primaryDirection as any)?.name || diff?.strategy,
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
    theory_vote_summary: (diffPayload.theoryViews || diffPayload.theory_vote_summary || {}) as Record<string, unknown>,
    candidates: (diffPayload.candidates || []) as unknown[],
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
