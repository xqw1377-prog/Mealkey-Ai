/**
 * M-PNT Agent Runtime Workflow V1
 *
 * 核心改进：
 * 1. Workflow 分为三阶段：Situation→Position→Decision，每阶段内可并行
 * 2. 三理论矩阵从 Capability 内嵌提升为 Workflow 显式阶段
 * 3. 前序步骤（品类/客群/价格/竞争）共享 context，可并行执行
 * 4. 结构化 StepResult 链，替代 previousSummary 字符串拼接
 * 5. 短路机制：关键节点检查（如品类不推荐进入→提前终止）
 * 6. 母体 MKDecision 映射统一在 Final Stage 完成
 *
 * 执行链（V1）：
 * ┌─ Situation Stage ──────────────────────────────────────────┐
 * │   category_analysis │ 并行 │ customer_portrait  │ 并行   │
 * │   price_positioning │ ←── │ competitor_analysis │ ←──   │
 * └───────────────────────────────────────────────────────────┘
 *                            │
 *                            ▼
 * ┌─ Position Stage ───────────────────────────────────────────┐
 * │   candidate_generation（可选 LLM / 规则）                   │
 * │   ┌─ ries_agent ──┐                                        │
 * │   ├─ trout_agent ─┼─ 并行 ──► cross_fire ──► synthesis    │
 * │   └─ ye_agent ────┘                                        │
 * └───────────────────────────────────────────────────────────┘
 *                            │
 *                            ▼
 * ┌─ Decision Stage ───────────────────────────────────────────┐
 * │   brand_tonality（可选，若已有结论可跳过）                   │
 * │   quality_check ──► final_output → MKDecision              │
 * └───────────────────────────────────────────────────────────┘
 */
import type { MKContext, MKDecision, MPntRuntimeConfig } from "@mealkey/agent-sdk";
import type { LLMAdapter } from "./llm/types";
import { mPntCapabilities, getCapability } from "./capabilities";
import { runTheoryMatrix } from "./matrix/run-matrix";
import { buildMatrixInputPackage } from "./matrix/input-package";
import type { TheoryMatrixResult, PositionCandidate } from "./matrix/types";
import { fuseStepDecisions, readStructured, mapFinalJsonToMKDecision } from "./protocols/mk-decision-mapper";
import { readPayload } from "./capabilities/_shared";
import { setMPntOptions, clearMPntOptions } from "./llm/with-llm";
import { mPntKnowledgeSeeds } from "./knowledge/seeds";

// ─── 类型 ─────────────────────────────────────────────────────

export interface MPntRunResult {
  agentId: "m-pnt";
  missionId?: string;
  mode: "llm" | "heuristic" | "hybrid";
  /** V1: 三阶段结果，每阶段含结构化数据 */
  stages: {
    situation?: SituationStageResult;
    position?: PositionStageResult;
    decision?: DecisionStageResult;
  };
  /** 最终 MKDecision */
  decision: MKDecision;
  /** 运行时指标 */
  metrics: {
    totalMs: number;
    stageMs: Record<string, number>;
    modelCalls: number;
    shortCircuited: boolean;
    shortCircuitReason?: string;
  };
}

export interface MPntRunOptions {
  llm: LLMAdapter;
  runtimeConfig?: MPntRuntimeConfig;
  input?: Record<string, unknown>;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** V1: 允许跳过某些阶段（调试/快捷模式） */
  skipStages?: ("situation" | "position" | "decision")[];
  /** V1: 外部传入候选方向（跳过候选生成） */
  externalCandidates?: PositionCandidate[];
}

export interface MPntMissionRef {
  id?: string;
  objective?: string;
  type?: string;
  goal?: string;
}

// ─── 各阶段结果类型 ───────────────────────────────────────────

export interface SituationStageResult {
  /** 品类评估结论 */
  categoryAssessment: MKDecision;
  /** 客群画像 */
  customerPortrait?: MKDecision;
  /** 价格带定位 */
  pricePositioning?: MKDecision;
  /** 竞争分析 */
  competitorAnalysis?: MKDecision;
  /** 结构化中间数据 */
  structured: {
    marketOpportunity: "strong" | "adequate" | "weak" | "failed";
    competitionDensity: "blue_ocean" | "moderate" | "crowded" | "red_ocean";
    targetCustomerClarity: "clear" | "broad" | "vague";
    primaryScene?: string;
    resourceFit: "strong" | "adequate" | "weak";
  };
  /** 是否应终止（如品类不推荐进入） */
  shouldAbort: boolean;
  abortReason?: string;
}

export interface PositionStageResult {
  /** 候选方向 */
  candidates: PositionCandidate[];
  /** 三理论矩阵完整结果 */
  matrixResult: TheoryMatrixResult;
  /** 候选方向是否由 LLM 生成 */
  candidatesFromLlm: boolean;
}

export interface DecisionStageResult {
  /** 品牌调性（可选） */
  brandTonality?: MKDecision;
  /** Quality Check 结论 */
  qualityCheck: {
    pass: boolean;
    issues: string[];
    overallScore: number;
    mindPositionLevel: "A" | "B" | "C" | "D";
  };
  /** 最终融合的 MKDecision */
  finalDecision: MKDecision;
  /** M-Solution 结构 */
  mSolution: {
    situation: string;
    insight: string;
    position: string;
    strategy: string;
    action: string;
    validation: string;
    decision: string;
  };
}

// ─── 主入口 ───────────────────────────────────────────────────

/**
 * M-PNT V1 Runtime — 三阶段并行工作流
 *
 * 调用示例：
 *   const result = await runMPntV1(context, mission, {
 *     llm: getLLMAdapter(),
 *     runtimeConfig: { runMode: "llm" },
 *   });
 */
export async function runMPntV1(
  context: MKContext,
  mission?: MPntMissionRef,
  options: MPntRunOptions = { llm: { chat: async () => ({ content: "" }) } },
): Promise<MPntRunResult> {
  const started = Date.now();
  const { llm, input = {}, runtimeConfig, model, temperature, maxTokens, skipStages = [], externalCandidates } = options;

  // 设置 LLM 配置
  setMPntOptions({
    mode: "llm",
    llm,
    model,
    temperature,
    maxTokens,
    runtimeConfig,
  });

  // 注入知识种子
  const enrichedContext = enrichContextWithKnowledge(context, runtimeConfig);

  const stages: MPntRunResult["stages"] = {};
  const stageMs: Record<string, number> = {};
  let shortCircuited = false;
  let shortCircuitReason: string | undefined;
  let modelCalls = 0;

  try {
    // ═══════════════════════════════════════════════════════════
    // Stage 1: Situation — 品类 / 客群 / 价格 / 竞争（并行子集）
    // ═══════════════════════════════════════════════════════════
    if (!skipStages.includes("situation")) {
      const s1 = Date.now();

      // 并行执行前 4 步（品类分析 + 客群 + 价格 + 竞争）
      const situationResult = await runSituationStage(enrichedContext, input, runtimeConfig);

      modelCalls += Object.keys(situationResult).length;
      stageMs.situation = Date.now() - s1;
      stages.situation = situationResult;

      // 短路检查
      if (situationResult.shouldAbort) {
        shortCircuited = true;
        shortCircuitReason = situationResult.abortReason;

        // 构造终止决策
        const abortDecision = buildAbortDecision(enrichedContext, situationResult);
        return {
          agentId: "m-pnt",
          missionId: mission?.id,
          mode: "llm",
          stages: { situation: situationResult },
          decision: abortDecision,
          metrics: {
            totalMs: Date.now() - started,
            stageMs,
            modelCalls,
            shortCircuited: true,
            shortCircuitReason,
          },
        };
      }
    }

    // ═══════════════════════════════════════════════════════════
    // Stage 2: Position — 候选方向生成 + 三理论矩阵
    // ═══════════════════════════════════════════════════════════
    let positionResult: PositionStageResult | undefined;
    if (!skipStages.includes("position")) {
      const s2 = Date.now();

      positionResult = await runPositionStage(
        enrichedContext,
        input,
        stages.situation,
        externalCandidates,
      );

      modelCalls += positionResult.candidatesFromLlm ? 1 : 0;
      stageMs.position = Date.now() - s2;
      stages.position = positionResult;
    }

    // ═══════════════════════════════════════════════════════════
    // Stage 3: Decision — 品牌调性 + Quality + Final
    // ═══════════════════════════════════════════════════════════
    if (!skipStages.includes("decision")) {
      const s3 = Date.now();

      const decisionResult = await runDecisionStage(
        enrichedContext,
        stages.situation,
        stages.position,
      );

      modelCalls += decisionResult.brandTonality ? 1 : 0;
      // Quality Check 可能也调 LLM（当 LLM 模式时）
      modelCalls += 0; // quality check 目前是规则驱动
      stageMs.decision = Date.now() - s3;
      stages.decision = decisionResult;

      return {
        agentId: "m-pnt",
        missionId: mission?.id,
        mode: "llm",
        stages,
        decision: decisionResult.finalDecision,
        metrics: {
          totalMs: Date.now() - started,
          stageMs,
          modelCalls,
          shortCircuited: false,
        },
      };
    }

    // 如果没有 Decision Stage，返回 Position Stage 的合成结果
    const fallbackDecision = buildFallbackDecision(enrichedContext, stages);
    return {
      agentId: "m-pnt",
      missionId: mission?.id,
      mode: "llm",
      stages,
      decision: fallbackDecision,
      metrics: {
        totalMs: Date.now() - started,
        stageMs,
        modelCalls,
        shortCircuited,
        shortCircuitReason,
      },
    };
  } finally {
    clearMPntOptions();
  }
}

// ═══════════════════════════════════════════════════════════════
// Stage 1: Situation
// ═══════════════════════════════════════════════════════════════

async function runSituationStage(
  context: MKContext,
  input: Record<string, unknown>,
  runtimeConfig?: MPntRuntimeConfig,
): Promise<SituationStageResult> {
  // 前 4 步可并行：品类分析 / 客群画像 / 价格定位 / 竞争分析
  const capCategories = [
    { id: "category_analysis", key: "categoryAssessment" as const },
    { id: "customer_portrait", key: "customerPortrait" as const },
    { id: "price_positioning", key: "pricePositioning" as const },
    { id: "competitor_analysis", key: "competitorAnalysis" as const },
  ] as const;

  const results = await Promise.all(
    capCategories.map(async ({ id, key }) => {
      const cap = getCapability(id);
      if (!cap) return { key, decision: null };
      const decision = await cap.execute(
        { ...input, previousSummary: "", previousResults: "" },
        context,
      );
      return { key, decision };
    }),
  );

  // 提取结果
  const resultMap: Record<string, MKDecision | null> = {};
  for (const r of results) {
    resultMap[r.key] = r.decision;
  }

  const categoryAssessment = resultMap.categoryAssessment!;
  const customerPortrait = resultMap.customerPortrait;
  const pricePositioning = resultMap.pricePositioning;
  const competitorAnalysis = resultMap.competitorAnalysis;

  // 结构化中间数据（从 MKDecision 的 evidence 中提取，或规则推断）
  const structured = extractSituationStructure(
    categoryAssessment,
    customerPortrait,
    pricePositioning,
    competitorAnalysis,
    context,
  );

  // 短路判断
  const shouldAbort = structured.marketOpportunity === "failed";
  const abortReason = shouldAbort
    ? `品类「${context.project.category || "未知"}」在「${context.project.city || "目标城市"}」市场机会评估为「failed」，不建议进入`
    : undefined;

  return {
    categoryAssessment,
    customerPortrait: customerPortrait ?? undefined,
    pricePositioning: pricePositioning ?? undefined,
    competitorAnalysis: competitorAnalysis ?? undefined,
    structured,
    shouldAbort,
    abortReason,
  };
}

/**
 * 从各 Capability 的 MKDecision evidence 中提取结构化字段。
 * 回落：基于启发式规则推导。
 */
function extractSituationStructure(
  category: MKDecision,
  customer?: MKDecision | null,
  price?: MKDecision | null,
  competitor?: MKDecision | null,
  context?: MKContext,
): SituationStageResult["structured"] {
  // 尝试从 structured evidence 中提取
  const catPayload = readPayload(category) || {};

  const marketOpportunity = parseLevel(catPayload.market_opportunity?.level, [
    "strong", "adequate", "weak", "failed",
  ] as const, "adequate");

  const competitionDensity = parseLevel(catPayload.competition?.density, [
    "blue_ocean", "moderate", "crowded", "red_ocean",
  ] as const, "moderate");

  const customerClarity = customer
    ? (readPayload(customer)?.target_customer?.fit as any) || "broad"
    : "vague";

  const primaryScene = customer
    ? (readPayload(customer)?.scene_opportunity?.primary_scene as string) || undefined
    : undefined;

  // 资源匹配度推断
  const budget = Number(context?.project.budget || 0);
  const hasStrengths = (context?.owner.strengths?.length || 0) > 0;
  const resourceFit: "strong" | "adequate" | "weak" =
    budget >= 60 && hasStrengths ? "strong"
    : budget >= 30 ? "adequate"
    : "weak";

  return {
    marketOpportunity,
    competitionDensity,
    targetCustomerClarity: customerClarity as "clear" | "broad" | "vague",
    primaryScene,
    resourceFit,
  };
}

function parseLevel<T extends readonly string[]>(
  value: unknown,
  valid: T,
  fallback: T[number],
): T[number] {
  if (typeof value === "string" && (valid as readonly string[]).includes(value)) {
    return value as T[number];
  }
  return fallback;
}

// ═══════════════════════════════════════════════════════════════
// Stage 2: Position — 候选方向生成 + 三理论矩阵
// ═══════════════════════════════════════════════════════════════

async function runPositionStage(
  context: MKContext,
  input: Record<string, unknown>,
  situation?: SituationStageResult,
  externalCandidates?: PositionCandidate[],
): Promise<PositionStageResult> {
  // 确定候选方向（外部传入 或 默认生成 或 LLM 生成）
  let candidates: PositionCandidate[];
  let candidatesFromLlm = false;

  if (externalCandidates && externalCandidates.length > 0) {
    candidates = externalCandidates;
  } else {
    // 使用默认候选方向（从 input-package 的默认逻辑）
    const pkg = buildMatrixInputPackage(context, {
      previousSummary: situation ? buildSituationSummary(situation) : undefined,
    });
    candidates = pkg.candidates;
  }

  // 运行三理论矩阵
  const matrixResult = await runTheoryMatrix(context, {
    previousSummary: situation ? buildSituationSummary(situation) : undefined,
    candidates,
  });

  return {
    candidates,
    matrixResult,
    candidatesFromLlm,
  };
}

function buildSituationSummary(situation: SituationStageResult): string {
  const parts: string[] = [];
  parts.push(`[品类分析] ${situation.categoryAssessment.judgement}`);
  if (situation.customerPortrait) parts.push(`[客群画像] ${situation.customerPortrait.judgement}`);
  if (situation.pricePositioning) parts.push(`[价格定位] ${situation.pricePositioning.judgement}`);
  if (situation.competitorAnalysis) parts.push(`[竞争分析] ${situation.competitorAnalysis.judgement}`);
  return parts.join("\n");
}

// ═══════════════════════════════════════════════════════════════
// Stage 3: Decision — 品牌调性 + Quality + Final
// ═══════════════════════════════════════════════════════════════

async function runDecisionStage(
  context: MKContext,
  situation?: SituationStageResult,
  position?: PositionStageResult,
): Promise<DecisionStageResult> {
  // 品牌调性（可选，基于 synthesis 的主方向）
  let brandTonality: MKDecision | undefined;
  const synthesis = position?.matrixResult.synthesis;
  const primaryCandidate = synthesis
    ? position!.candidates.find(c => c.id === synthesis.preferred_candidate_id)
    : undefined;

  if (primaryCandidate && synthesis?.decision_recommend !== "reject") {
    const brandCap = getCapability("brand_tonality");
    if (brandCap) {
      brandTonality = await brandCap.execute(
        {
          primaryDirection: primaryCandidate.oneLiner,
          decision_recommend: synthesis.decision_recommend,
          previousSummary: position ? buildPositionSummary(position) : "",
        },
        context,
      );
    }
  }

  // Quality Check
  const qualityCheck = runQualityCheck(position, synthesis);

  // 构建 M-Solution
  const mSolution = buildMSolution(context, situation, position, brandTonality, qualityCheck);

  // 融合为最终 MKDecision
  const finalDecision = buildFinalDecision(context, situation, position, brandTonality, qualityCheck, mSolution);

  return {
    brandTonality,
    qualityCheck,
    finalDecision,
    mSolution,
  };
}

function buildPositionSummary(position: PositionStageResult): string {
  const s = position.matrixResult.synthesis;
  return `[三理论矩阵] 推荐: ${s.final_recommended_position} (${s.decision_recommend})
评分: ${s.overall_score} | 心智等级: ${s.mind_position_level} | 最大风险: ${s.max_risk_severity}
Ries: ${s.theory_vote_summary.ries.preferred} (${s.theory_vote_summary.ries.theory_recommend})
Trout: ${s.theory_vote_summary.trout.preferred} (${s.theory_vote_summary.trout.theory_recommend})
Ye: ${s.theory_vote_summary.ye_maozhong.preferred} (${s.theory_vote_summary.ye_maozhong.theory_recommend})
辩论叙事: ${position.matrixResult.crossFire.game_summary}`;
}

// ─── Quality Check ─────────────────────────────────────────────

interface QualityCheckResult {
  pass: boolean;
  issues: string[];
  overallScore: number;
  mindPositionLevel: "A" | "B" | "C" | "D";
}

function runQualityCheck(
  position?: PositionStageResult,
  synthesis?: PositionStageResult["matrixResult"]["synthesis"],
): QualityCheckResult {
  const issues: string[] = [];

  if (!synthesis) {
    return {
      pass: false,
      issues: ["缺少 Synthesis 结果"],
      overallScore: 0,
      mindPositionLevel: "D",
    };
  }

  // 五条底线检查
  if (!synthesis.final_recommended_position) {
    issues.push("缺少推荐结论");
  }
  if (!synthesis.why_choose_this || synthesis.why_choose_this.length < 10) {
    issues.push("缺少充分的推荐理由");
  }
  if (!synthesis.why_not_others || synthesis.why_not_others.length < 10) {
    issues.push("缺少不选其他方向的理由");
  }
  if (!synthesis.core_risk_summary) {
    issues.push("缺少主要风险评估");
  }
  if (!synthesis.validation_focus) {
    issues.push("缺少验证动作建议");
  }

  // R4 不得 primary（硬规则）
  if (synthesis.decision_recommend === "primary" && synthesis.max_risk_severity === "R4") {
    issues.push("R4 风险方向不得为 primary——违反硬规则");
  }

  const pass = issues.length === 0;
  return {
    pass,
    issues,
    overallScore: synthesis.overall_score,
    mindPositionLevel: synthesis.mind_position_level,
  };
}

// ─── M-Solution ─────────────────────────────────────────────────

interface MSolution {
  situation: string;
  insight: string;
  position: string;
  strategy: string;
  action: string;
  validation: string;
  decision: string;
}

function buildMSolution(
  context: MKContext,
  situation?: SituationStageResult,
  position?: PositionStageResult,
  brandTonality?: MKDecision,
  qualityCheck?: QualityCheckResult,
): MSolution {
  const synthesis = position?.matrixResult.synthesis;
  const cat = situation?.categoryAssessment;

  const situationText = cat?.observation || context.project.name || "项目待分析";

  const insight = [
    situation?.customerPortrait?.diagnosis,
    situation?.competitorAnalysis?.diagnosis,
  ].filter(Boolean).join("；") || "定位问题分析";

  const positionText = synthesis?.final_recommended_position || "待定";

  const strategy = [
    brandTonality?.strategy,
    synthesis?.why_choose_this ? `理由：${synthesis.why_choose_this}` : null,
  ].filter(Boolean).join("；") || "见差异化策略";

  const action = brandTonality?.action || "按验证计划执行";

  const validation = synthesis?.validation_focus || "30天验证主场景记忆；90天观察心智收敛";

  const decision = [
    synthesis?.decision_recommend ? `推荐：${synthesis.decision_recommend}` : null,
    synthesis?.final_recommended_position,
  ].filter(Boolean).join(" | ") || "待决策";

  return { situation: situationText, insight, position: positionText, strategy, action, validation, decision };
}

// ─── Final Decision ────────────────────────────────────────────

function buildFinalDecision(
  context: MKContext,
  situation?: SituationStageResult,
  position?: PositionStageResult,
  brandTonality?: MKDecision,
  qualityCheck?: QualityCheckResult,
  mSolution?: MSolution,
): MKDecision {
  const matrixResult = position?.matrixResult;
  const synthesis = matrixResult?.synthesis;

  // 构建 PositioningFinalJson 兼容结构
  const primaryCand = synthesis
    ? position!.candidates.find(c => c.id === synthesis.preferred_candidate_id)
    : undefined;

  const json: Record<string, unknown> = {
    type: "positioning",
    focus: "overall",
    summary: synthesis?.final_recommended_position || "定位结论待确认",
    confidence: synthesis?.confidence ?? 0.75,
    decision_recommend: synthesis?.decision_recommend || "primary",
    overall_score: qualityCheck?.overallScore ?? synthesis?.overall_score ?? 65,
    mind_position_level: qualityCheck?.mindPositionLevel ?? synthesis?.mind_position_level ?? "B",
    max_risk_severity: synthesis?.max_risk_severity ?? "R2",

    brandPositioning: {
      category: String(context.project.category || ""),
      targetCustomers: situation?.customerPortrait?.judgement || "",
      priceRange: situation?.pricePositioning?.judgement || "",
      differentiation: primaryCand?.oneLiner || "",
      brandTonality: brandTonality?.judgement || "",
      mentalPosition: synthesis?.final_recommended_position || "",
    },

    candidates: position?.candidates.map(c => {
      const ds = synthesis?.theory_vote_summary;
      const candScore = synthesis
        ? matrixResult?.views.ries.direction_scores.find(d => d.name === c.name)?.theory_score ?? 50
        : 50;
      return {
        id: c.id,
        name: c.name,
        oneLiner: c.oneLiner,
        type: c.type,
        decision_recommend: c.id === synthesis?.preferred_candidate_id
          ? "primary"
          : c.id === position?.candidates.find(c2 => synthesis?.secondary_option?.includes(c2.oneLiner))?.id
            ? "secondary"
            : "backup",
        score: candScore,
        reason: "",
      };
    }) || [],

    theory_vote_summary: synthesis ? {
      ries: { preferred: synthesis.theory_vote_summary.ries.preferred, theory_recommend: synthesis.theory_vote_summary.ries.theory_recommend },
      trout: { preferred: synthesis.theory_vote_summary.trout.preferred, theory_recommend: synthesis.theory_vote_summary.trout.theory_recommend },
      ye_maozhong: { preferred: synthesis.theory_vote_summary.ye_maozhong.preferred, theory_recommend: synthesis.theory_vote_summary.ye_maozhong.theory_recommend },
    } : {},

    why_choose_this: synthesis?.why_choose_this || "",
    why_not_others: synthesis?.why_not_others || situation?.competitorAnalysis?.diagnosis || "",

    keyFindings: [
      { dimension: "品类", conclusion: situation?.categoryAssessment.judgement || "", confidence: Math.round((situation?.categoryAssessment.confidence ?? 0.5) * 100) },
      { dimension: "客群", conclusion: situation?.customerPortrait?.judgement || "", confidence: Math.round((situation?.customerPortrait?.confidence ?? 0.5) * 100) },
      { dimension: "价格", conclusion: situation?.pricePositioning?.judgement || "", confidence: Math.round((situation?.pricePositioning?.confidence ?? 0.5) * 100) },
      { dimension: "竞争", conclusion: situation?.competitorAnalysis?.judgement || "", confidence: Math.round((situation?.competitorAnalysis?.confidence ?? 0.5) * 100) },
    ],

    risks: synthesis
      ? [
          ...(synthesis.core_risk_summary ? [{ risk: synthesis.core_risk_summary, level: synthesis.max_risk_severity === "R4" ? "high" : "medium", code: synthesis.max_risk_severity, mitigation: "见验证计划" }] : []),
          { risk: "候选方向未经真实市场验证", level: "medium", code: "R2", mitigation: "30/90 天验证路径" },
        ]
      : [{ risk: "候选方向未经真实市场验证", level: "medium", code: "R2", mitigation: "30/90 天验证路径" }],

    validation: {
      day30: [synthesis?.validation_focus ? `验证：${synthesis.validation_focus}` : "主场景到店话术与转述测试", "锚点套餐毛利验证"],
      day90: ["复购/转介绍是否指向同一心智锚"],
      killCriteria: [qualityCheck?.issues?.join("；") || "心智转述发散", "主锚无法交付"],
    },

    mSolution: mSolution || {
      situation: "", insight: "", position: "", strategy: "", action: "", validation: "", decision: "",
    },

    nextSteps: [
      { step: "锁定主场景与一句话定位", priority: "high", timeline: "1周" },
      { step: "菜单与空间对齐主锚", priority: "high", timeline: "2-4周" },
      { step: "启动 30 天验证", priority: "medium", timeline: "1个月" },
    ],

    // V1 扩展：保留三理论矩阵完整结果
    theoryMatrix: matrixResult ? {
      crossFireGameSummary: matrixResult.crossFire.game_summary,
      hardConsensus: matrixResult.crossFire.hard_consensus,
      softConsensus: matrixResult.crossFire.soft_consensus,
      eliminated: matrixResult.crossFire.eliminate,
      challenges: matrixResult.crossFire.challenges,
      elapsedMs: matrixResult.elapsedMs,
    } : undefined,
  };

  return mapFinalJsonToMKDecision(json as any, context);
}

// ─── 短路决策 ───────────────────────────────────────────────────

function buildAbortDecision(
  context: MKContext,
  situation: SituationStageResult,
): MKDecision {
  const json: Record<string, unknown> = {
    type: "positioning",
    focus: "overall",
    summary: `不建议进入「${context.project.category || "未知"}」品类`,
    confidence: 0.8,
    decision_recommend: "reject",
    overall_score: 25,
    mind_position_level: "D",
    max_risk_severity: "R3",

    brandPositioning: {
      category: String(context.project.category || ""),
      targetCustomers: "",
      priceRange: "",
      differentiation: "",
      brandTonality: "",
      mentalPosition: `不建议进入：${situation.abortReason || "市场机会评估不通过"}`,
    },

    candidates: [],
    theory_vote_summary: {},

    why_choose_this: situation.abortReason || "品类在目标城市缺乏足够市场机会",
    why_not_others: "无其他候选方向——不构成进入前提",

    keyFindings: [{
      dimension: "品类",
      conclusion: situation.categoryAssessment.judgement,
      confidence: Math.round(situation.categoryAssessment.confidence * 100),
    }],

    risks: [{
      risk: situation.abortReason || "品类无市场机会",
      level: "high",
      code: "R3",
      mitigation: "建议转向其他品类或城市",
    }],

    validation: {
      day30: [],
      day90: [],
      killCriteria: ["品类机会评估失败"],
    },

    mSolution: {
      situation: situation.categoryAssessment.observation,
      insight: situation.categoryAssessment.diagnosis,
      position: `不建议进入：${situation.abortReason || ""}`,
      strategy: "建议重新评估项目方向",
      action: "收集更多市场数据后重新分析",
      validation: "暂不进入——无验证必要",
      decision: "reject",
    },

    nextSteps: [
      { step: "收集更多市场数据，验证品类机会判断", priority: "high", timeline: "1-2周" },
      { step: "如判断确认，建议转向其他品类或城市", priority: "medium", timeline: "2-4周" },
    ],
  };

  return mapFinalJsonToMKDecision(json as any, context);
}

// ─── 回落决策（无 Decision Stage 时） ──────────────────────────

function buildFallbackDecision(
  context: MKContext,
  stages: MPntRunResult["stages"],
): MKDecision {
  if (stages.position?.matrixResult.synthesis) {
    const mSolution = buildMSolution(context, stages.situation, stages.position, undefined, undefined);
    return buildFinalDecision(context, stages.situation, stages.position, undefined, undefined, mSolution);
  }

  // 最低回落
  return mapFinalJsonToMKDecision({
    type: "positioning",
    summary: "定位分析未完成",
    confidence: 0.3,
    decision_recommend: "backup",
  } as any, context);
}

// ─── 知识注入 ───────────────────────────────────────────────────

function enrichContextWithKnowledge(
  context: MKContext,
  runtimeConfig?: MPntRuntimeConfig,
): MKContext {
  const knowledge = { ...(context.knowledge || {}) } as {
    nodes?: Array<{ id?: string; title?: string; content?: unknown; tags?: string[] }>;
    texts?: string[];
  };

  const builtinNodes = mPntKnowledgeSeeds.map((s) => ({
    id: s.id,
    title: s.title,
    content: s.content,
    tags: s.tags,
  }));

  if (runtimeConfig?.knowledgeEngine) {
    // knowledgeEngine 已注入，可在运行时调用
  }

  const existingIds = new Set((knowledge.nodes || []).map((n) => n.id));
  for (const node of builtinNodes) {
    if (!existingIds.has(node.id)) {
      knowledge.nodes = [...(knowledge.nodes || []), node as any];
    }
  }

  return { ...context, knowledge: knowledge as MKContext["knowledge"] };
}

// ─── 导出 ───────────────────────────────────────────────────────

export {
  runSituationStage,
  runPositionStage,
  runDecisionStage,
  enrichContextWithKnowledge,
};
