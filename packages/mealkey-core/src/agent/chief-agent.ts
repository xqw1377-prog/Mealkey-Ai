/**
 * Chief Agent (Kernel Agent) — MealKey 经营大脑
 *
 * 这是 MealKey Core 的统一对外入口。
 * 解决了以下问题:
 *   1. 与 IntelligenceOrchestrator 职责重叠 → 合并
 *   2. DefaultJudgmentChain 无 LLM 参与 → 每步调用 LLM
 *   3. 规则判断链作为降级路径
 *   4. 假设识别默认走 LLM
 *
 * 流程:
 *   1. 接收 MKContext（由 Factory 构建）
 *   2. Problem Understanding — LLM 分析真实经营意图
 *   3. Judgment Chain — 5 步 LLM 驱动判断链（Observation→Diagnosis→Evaluation→Strategy→Action）
 *   4. Risk Analysis — 规则引擎 + LLM 补充
 *   5. Tool Execution — 调用工具
 *   6. Decision — 生成 MKDecision
 *   7. Challenge — 反方挑战（高风险时激活）
 *   8. Memory Update — 更新记忆
 *   9. AgentRun Tracking — 追踪执行记录
 */

import type { MKDecision, MKContext, MemoryInput } from "@mealkey/agent-sdk";
import type { JudgmentResult, Risk } from "../cognition/types";
import { DefaultJudgmentChain } from "../cognition/chain";
import { ProblemUnderstandingEngine, type ProblemAnalysis } from "./problem-understanding";
import { ChiefToolRegistry, type ToolResult as ChiefToolResult } from "./tool-registry";
import { AgentRunTracker } from "./agent-run-tracker";
import type { LearningEngine } from "../intelligence/learning-engine";
import { globalAutoExtractor } from "../intelligence/auto-extractor";
import { DefaultRiskAnalyzer } from "../cognition/risk-analyzer";
import { ChallengeEngine } from "../runtime/decision/challenge-engine";
import type { ChallengeResult } from "../runtime/decision/challenge-engine";
import { globalLLMCache } from "../llm";
import { matchRules, findSimilarCases } from "@mealkey/knowledge-engine";
import type { DecisionRule, CaseStudy } from "@mealkey/knowledge-engine";

// ─── Agent 输入 ───

export interface AgentInput {
  userId: string;
  message: string;
  projectId?: string;
  missionId?: string;
  conversationId?: string;
  /** 由 Factory 构建的完整上下文 */
  context: MKContext;
}

// ─── Agent 输出 ───

export interface AgentResult {
  message: string;
  mkDecision: MKDecision;
  assessment: Assessment;
  metadata: AgentMetadata;
  nextSteps: string[];
  recommendations: string[];
  memoryUpdates: MemoryUpdate[];
  challenges?: ChallengeResult | null;
}

export interface Assessment {
  framework: string;
  overall: number;
  strengths: string[];
  weaknesses: string[];
  biggestRisk: string;
}

export interface KnowledgeRef {
  id: string;
  type: "rule" | "case" | "model";
  title: string;
  relevance: number;
}

export interface RuleValidationItem {
  ruleId: string;
  matched: boolean;
  judgement: string;
  risk: string;
  llmConsistent: boolean; // LLM 判断是否与规则一致
}

export interface AgentMetadata {
  intent: string;
  problemAnalysis?: ProblemAnalysis;
  confidence: number;
  processingTime: number;
  enginesUsed: string[];
  agentRunId?: string;
  /** 判断链是否使用了 LLM */
  usedLLM: boolean;
  /** 本次判断引用的知识节点（可追溯） */
  knowledgeRefs?: KnowledgeRef[];
  /** 规则引擎对 LLM 判断的校验结果 */
  ruleValidation?: RuleValidationItem[];
}

export interface MemoryUpdate {
  layer: string;
  key: string;
  value: unknown;
  importance: number;
}

// ─── 流式输出 ───

export type AgentChunk =
  | { type: "thinking"; content: string }
  | { type: "context"; data: MKContext }
  | { type: "knowledge"; data: Array<{ id: string; title: string; content: string; relevance: number }> }
  | { type: "tool_start"; toolName: string }
  | { type: "tool_result"; toolName: string; result: ChiefToolResult }
  | { type: "assessment"; data: Assessment }
  | { type: "mk_decision"; data: MKDecision }
  | { type: "challenges"; data: ChallengeResult }
  | { type: "message"; content: string }
  | { type: "done"; data: AgentResult }
  | { type: "error"; message: string };

// ─── LLM 接口 ───

export interface ChiefLLMAdapter {
  chat(params: {
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    max_tokens?: number;
  }): Promise<{ content: string }>;
}

// ─── Chief Agent 依赖 ───

export interface ChiefAgentDeps {
  llm: ChiefLLMAdapter;
  memoryStore: {
    save(userId: string, memory: MemoryInput): Promise<void>;
    saveDecision(userId: string, projectId: string, decision: MKDecision, knowledgeRefs?: KnowledgeRef[]): Promise<string>;
    search(userId: string, query: string, limit?: number): Promise<Array<{ key: string; value: unknown; importance: number }>>;
  };
  toolRegistry?: ChiefToolRegistry;
  runTracker?: AgentRunTracker;
  learningEngine?: LearningEngine;
}

// ─── Chief Agent ───

export class ChiefAgent {
  private problemEngine: ProblemUnderstandingEngine;
  private toolRegistry: ChiefToolRegistry | null;
  private runTracker: AgentRunTracker | null;
  private riskAnalyzer: DefaultRiskAnalyzer;
  private challengeEngine: ChallengeEngine;

  constructor(private deps: ChiefAgentDeps) {
    this.problemEngine = new ProblemUnderstandingEngine({ llm: deps.llm });
    this.toolRegistry = deps.toolRegistry ?? null;
    this.runTracker = deps.runTracker ?? null;
    this.riskAnalyzer = new DefaultRiskAnalyzer();
    this.challengeEngine = new ChallengeEngine({
      chat: deps.llm.chat.bind(deps.llm),
    });
  }

  /**
   * 处理用户输入 — 唯一入口（流式）。
   *
   * MealKey 是流式操作系统，所有输出统一走 AsyncGenerator。
   * 同步消费者使用 `for await` 消费。
   *
   * @deprecated 同步版本 process() 已于 V0.2 移除，统一为 processStream()。
   */
  async *process(input: AgentInput): AsyncGenerator<AgentChunk> {
    const startTime = Date.now();
    let runId: string | undefined;

    if (this.runTracker) {
      runId = await this.runTracker.startRun({
        agentId: "chief-agent",
        userId: input.userId,
        projectId: input.projectId,
        missionId: input.missionId,
        conversationId: input.conversationId,
        input: { message: input.message },
      });
    }

    try {
      const ctx = input.context;

      // 1. 加载上下文
      yield { type: "thinking", content: "正在了解你的情况..." };
      yield { type: "context", data: ctx };

      // 2. Problem Understanding
      yield { type: "thinking", content: "理解你的问题..." };
      const problemAnalysis = await this.problemEngine.analyze(input.message, {
        project: {
          name: ctx.project.name,
          stage: ctx.project.stage,
          category: ctx.project.category ?? undefined,
          city: ctx.project.city ?? undefined,
        },
        recentDecisions: ctx.decisions.map((d: { problem: string }) => d.problem),
        userCapabilities: {},
      });

      // 3. 加载反馈记忆
      const feedbackHistory = await this.loadFeedbackMemory(input.userId, input.projectId);
      const enrichedCtx = {
        ...ctx,
        _feedbackHistory: feedbackHistory,
      };

      // 4. 检索知识
      yield { type: "thinking", content: "调用餐饮知识..." };
      const knowledgeItems = [
        ...ctx.knowledge.rules.map(r => ({ id: r.id, title: r.title, content: r.content, relevance: 0.8 })),
        ...ctx.knowledge.cases.map(c => ({ id: c.id, title: c.title, content: c.outcome, relevance: 0.7 })),
      ];
      if (knowledgeItems.length > 0) {
        yield { type: "knowledge", data: knowledgeItems };
      }

      // 5. 并行执行：LLM 判断链 + 规则引擎 + 风险分析
      yield { type: "thinking", content: "分析中..." };
      let usedLLM = true;
      let judgment: JudgmentResult;
      let ruleJudgment: JudgmentResult | null = null;
      let knowledgeRefs: KnowledgeRef[] = [];
      let matchedRules: DecisionRule[] = [];
      let matchedCases: CaseStudy[] = [];

      // 构建规则匹配条件
      const ruleFacts: Record<string, unknown> = {
        city: ctx.project.city,
        category: ctx.project.category,
        stage: ctx.project.stage,
        experience_years: parseInt(ctx.owner.experience) || 0,
        investment: ctx.project.budget ? ctx.project.budget * 10000 : undefined, // 万 → 元
      };
      // 从 owner.strengths/weaknesses 推断能力字段
      if (ctx.owner.strengths.includes("品牌") || ctx.owner.strengths.includes("brand")) {
        ruleFacts.brand_power = "high";
      } else if (ctx.owner.weaknesses.includes("品牌") || ctx.owner.weaknesses.includes("brand")) {
        ruleFacts.brand_power = "low";
      }
      if (ctx.owner.strengths.includes("产品") || ctx.owner.strengths.includes("product")) {
        ruleFacts.has_signature_dish = true;
      }

      // 并行执行 LLM 链和规则匹配
      const [llmResult, ruleResult] = await Promise.allSettled([
        this.runLLMJudgmentChain(input, enrichedCtx as unknown as MKContext, problemAnalysis),
        this.executeRuleJudgment(input, enrichedCtx as unknown as MKContext),
      ]);

      if (llmResult.status === "fulfilled") {
        judgment = llmResult.value;
      } else {
        console.warn("LLM judgment chain failed:", llmResult.reason);
        usedLLM = false;
        judgment = ruleResult.status === "fulfilled"
          ? ruleResult.value
          : await this.executeRuleJudgment(input, enrichedCtx as unknown as MKContext);
      }

      if (ruleResult.status === "fulfilled") {
        ruleJudgment = ruleResult.value;
      }

      // 用 knowledge-engine 的结构化查询替代ctx.knowledge拼接
      matchedRules = matchRules(ruleFacts);
      const llmRiskLevel = judgment.diagnosis.riskLevel;
      // 检查 LLM 的 riskLevel 是否与匹配到的高风险规则一致
      const highRiskRules = matchedRules.filter(r => r.risk === "high");
      const llmRiskConsistent = highRiskRules.length === 0 || llmRiskLevel === "high";

      matchedCases = findSimilarCases({
        category: ctx.project.category,
        city: ctx.project.city,
        stage: ctx.project.stage,
      });

      knowledgeRefs = [
        ...matchedRules.slice(0, 5).map(r => ({
          id: r.id,
          type: "rule" as const,
          title: r.description,
          relevance: r.weight,
        })),
        ...matchedCases.slice(0, 3).map(c => ({
          id: c.id,
          type: "case" as const,
          title: c.title,
          relevance: c.confidence,
        })),
      ];

      // 构建规则校验结果
      const ruleValidation: RuleValidationItem[] = matchedRules.slice(0, 8).map(r => {
        const llmRiskMatches = judgment.diagnosis.riskFactors.some(
          f => f.includes(r.description.slice(0, 10))
        );
        return {
          ruleId: r.id,
          matched: true,
          judgement: r.judgement,
          risk: r.risk,
          llmConsistent: llmRiskMatches,
        };
      });

      // 如果有规则匹配到高风险但 LLM 没识别，补充到 diagnosis.riskFactors
      if (!llmRiskConsistent && usedLLM) {
        for (const rule of highRiskRules.slice(0, 2)) {
          if (!judgment.diagnosis.riskFactors.includes(rule.judgement)) {
            judgment.diagnosis.riskFactors.push(`【规则校验】${rule.judgement}`);
          }
        }
        // 如果 LLM 设了 low 但规则匹配到 high，升级 riskLevel
        if (judgment.diagnosis.riskLevel === "low") {
          judgment.diagnosis.riskLevel = "medium";
        }
      }

      // 6. 风险分析（与规则引擎并行）
      yield { type: "thinking", content: "评估风险..." };
      const risks = this.riskAnalyzer.identifyRisks(
        {
          city: ctx.project.city ?? undefined,
          category: ctx.project.category ?? undefined,
          stage: ctx.project.stage,
          investment: ctx.project.budget ?? undefined,
        },
        {
          experience_level: this.inferExperienceLevel(ctx.owner.experience),
          strengths: ctx.owner.strengths,
          blindspots: ctx.owner.weaknesses,
        }
      );

      // 7. 调用工具
      const toolResults: ChiefToolResult[] = [];
      if (this.toolRegistry) {
        for (const capability of problemAnalysis.requiredCapabilities) {
          const toolName = this.mapCapabilityToTool(capability);
          if (toolName) {
            yield { type: "tool_start", toolName };
            const toolResult = await this.toolRegistry.execute(toolName, {
              query: input.message,
              projectInfo: ctx.project,
              ownerInfo: ctx.owner,
            });
            toolResults.push(toolResult);
            yield { type: "tool_result", toolName, result: toolResult };
          }
        }
      }

      // 8. 生成 MKDecision（带知识引用）
      const mkDecision = this.generateMKDecision(judgment, risks, problemAnalysis, ctx, toolResults, matchedRules, matchedCases);
      yield { type: "mk_decision", data: mkDecision };

      // 8. 反方挑战
      let challenges: ChallengeResult | null = null;
      if (judgment.diagnosis.riskLevel === "high" || judgment.evaluation.overall < 70) {
        challenges = await this.challengeEngine.generateChallenges(
          input.message,
          {
            owner: {
              id: ctx.owner.id,
              userId: input.userId,
              experienceYears: parseInt(ctx.owner.experience) || 0,
              overallScore: ctx.owner.overallScore ?? 50,
              capabilities: [],
              strengths: ctx.owner.strengths,
              blindspots: ctx.owner.weaknesses,
              riskTolerance: ctx.owner.riskTolerance,
              preferences: {
                investmentStyle: "moderate",
                productFocus: false,
                brandAwareness: false,
                dataDriven: false,
              },
            },
            situation: {
              currentGoal: problemAnalysis.realProblem,
              problemType: problemAnalysis.requiredCapabilities[0],
              urgency: judgment.diagnosis.riskLevel === "high" ? "high" : "medium",
              context: {},
            },
            memories: [],
            knowledge: ctx.knowledge.rules.map(r => ({
              id: r.id,
              type: "RULE",
              title: r.title,
              summary: r.content,
              content: r.content,
              category: "",
              confidence: 0.8,
              relevance: 0.7,
            })),
            history: [],
          }
        );
        if (challenges.challenges.length > 0) {
          yield { type: "challenges", data: challenges };
        }
      }

      // 9. 生成评估
      yield {
        type: "assessment",
        data: {
          framework: judgment.evaluation.framework,
          overall: judgment.evaluation.overall,
          strengths: judgment.evaluation.strengths,
          weaknesses: judgment.evaluation.weaknesses,
          biggestRisk: judgment.diagnosis.riskFactors[0] ?? "暂无",
        },
      };

      // 10. 格式化输出
      const outputMessage = this.formatOutput(judgment, mkDecision, ctx, challenges);
      yield { type: "message", content: outputMessage };

      // 11. 更新记忆（带 knowledgeRefs，沉淀到记忆系统）
      const memoryUpdates = await this.updateMemory(input, judgment, mkDecision, runId, knowledgeRefs);

      // 12. 生成建议
      const nextSteps = this.generateNextSteps(judgment);
      const recommendations = this.generateRecommendations(judgment);

      const enginesUsed = usedLLM
        ? ["llm_judgment_chain", "rule_validator", "problem_understanding", "risk_analysis", "decision_generation", "tool_execution", "challenge_engine"]
        : ["rule_judgment_chain", "problem_understanding", "risk_analysis", "decision_generation", "tool_execution", "challenge_engine"];

      const result: AgentResult = {
        message: outputMessage,
        mkDecision,
        assessment: {
          framework: judgment.evaluation.framework,
          overall: judgment.evaluation.overall,
          strengths: judgment.evaluation.strengths,
          weaknesses: judgment.evaluation.weaknesses,
          biggestRisk: judgment.diagnosis.riskFactors[0] ?? "暂无",
        },
        metadata: {
          intent: problemAnalysis.realProblem,
          problemAnalysis,
          confidence: judgment.overallConfidence,
          processingTime: Date.now() - startTime,
          enginesUsed,
          agentRunId: runId,
          usedLLM,
          knowledgeRefs,
          ruleValidation: ruleValidation.length > 0 ? ruleValidation : undefined,
        },
        nextSteps,
        recommendations,
        memoryUpdates,
        challenges: challenges && challenges.challenges.length > 0 ? challenges : null,
      };

      if (this.runTracker && runId) {
        await this.runTracker.completeRun(runId, {
          decision: mkDecision,
          assessment: result.assessment,
        }, {
          duration: Date.now() - startTime,
          resultType: "decision",
        });
      }

      yield { type: "done", data: result };
    } catch (error) {
      if (this.runTracker && runId) {
        await this.runTracker.failRun(runId, String(error));
      }
      yield {
        type: "error",
        message: "Agent 执行失败，请稍后重试",
      };
    }
  }

  /**
   * 加载用户的反馈记忆 — 让过去的反馈影响今天的判断
   *
   * 读取两类的历史记录：
   * 1. feedback_ 前缀的用户反馈（正面/负面）
   * 2. knowledge_refs_ 前缀的学习沉淀（含知识引用 ID）
   * 让 LLM 知道之前哪里出过问题，以及之前的判断引用了哪些知识。
   */
  private async loadFeedbackMemory(userId: string, projectId?: string): Promise<string[]> {
    try {
      // 并发读取两种记忆
      const [feedbackResults, knowledgeRefResults] = await Promise.all([
        this.deps.memoryStore.search(
          userId,
          projectId ? `feedback_${projectId}` : "feedback",
          10
        ),
        this.deps.memoryStore.search(
          userId,
          "knowledge_refs_",
          5
        ),
      ]);

      const feedbacks: string[] = [];

      // 1. 用户反馈
      for (const r of feedbackResults) {
        if (r.value && typeof r.value === 'object') {
          const v = r.value as Record<string, unknown>;
          if (v.type === 'negative_feedback' || (v as { helpful?: boolean }).helpful === false) {
            feedbacks.push(`之前对"${v.problem || '某问题'}"的判断，用户反馈有偏差: ${(v as { comment?: string }).comment || '未说明原因'}`);
          } else if ((v as { helpful?: boolean }).helpful === true) {
            feedbacks.push(`之前对"${v.problem || '某问题'}"的判断，用户确认正确: ${(v as { comment?: string }).comment || ''}`);
          }
        }
      }

      // 2. 历史知识引用 — 过去判断中用到了哪些知识
      for (const r of knowledgeRefResults) {
        if (r.value && typeof r.value === 'object') {
          const v = r.value as Record<string, unknown>;
          const refs = v.refs as Array<{ id: string; type: string; title: string }> | undefined;
          if (refs && refs.length > 0) {
            const refSummary = refs.slice(0, 3).map(ref =>
              `[${ref.type}:${ref.id}] ${ref.title}`
            ).join("、");
            feedbacks.push(`之前对"${v.problem || '某问题'}"的判断（评分: ${v.score}）参考了: ${refSummary}`);
          }
        }
      }

      return feedbacks;
    } catch {
      return [];
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 内部方法 — LLM 驱动的五步判断链
  // ═══════════════════════════════════════════════════════════════

  /**
   * 执行 LLM 驱动的五步判断链
   * Observation → Diagnosis → Evaluation → Strategy → Action
   *
   * 每步都调用 LLM 生成结果。
   * 如果 LLM 调用失败，降级到 DefaultJudgmentChain（规则引擎）。
   */
  private async executeLLMJudgment(
    input: AgentInput,
    ctx: MKContext,
    problem: ProblemAnalysis
  ): Promise<JudgmentResult> {
    try {
      // 使用 LLM 执行五步判断链
      return await this.runLLMJudgmentChain(input, ctx, problem);
    } catch (llmError) {
      // LLM 失败，降级到规则判断链
      console.warn("LLM judgment chain failed, falling back to rule-based:", llmError);
      return this.executeRuleJudgment(input, ctx);
    }
  }

  /**
   * LLM 五步判断链 — 一次调用完成所有判断
   */
  private async runLLMJudgmentChain(
    input: AgentInput,
    ctx: MKContext,
    problem: ProblemAnalysis
  ): Promise<JudgmentResult> {
    const projectInfo = [
      ctx.project.name ? `项目: ${ctx.project.name}` : "",
      ctx.project.stage ? `阶段: ${ctx.project.stage}` : "",
      ctx.project.category ? `品类: ${ctx.project.category}` : "",
      ctx.project.city ? `城市: ${ctx.project.city}` : "",
      ctx.project.budget ? `预算: ${ctx.project.budget}万` : "",
    ].filter(Boolean).join(", ");

    const ownerInfo = [
      ctx.owner.name ? `姓名: ${ctx.owner.name}` : "",
      ctx.owner.experience ? `经验: ${ctx.owner.experience}` : "",
      ctx.owner.strengths.length > 0 ? `优势: ${ctx.owner.strengths.join(", ")}` : "",
      ctx.owner.weaknesses.length > 0 ? `盲区: ${ctx.owner.weaknesses.join(", ")}` : "",
      ctx.owner.riskTolerance ? `风险偏好: ${ctx.owner.riskTolerance}` : "",
    ].filter(Boolean).join(", ");

    // 使用 knowledge-engine 结构化查询替代 ctx.knowledge 全量拼接
    const ruleFacts: Record<string, unknown> = {
      city: ctx.project.city,
      category: ctx.project.category,
      stage: ctx.project.stage,
      experience_years: parseInt(ctx.owner.experience) || 0,
      investment: ctx.project.budget ? ctx.project.budget * 10000 : undefined,
    };
    if (ctx.owner.strengths.includes("品牌") || ctx.owner.strengths.includes("brand")) {
      ruleFacts.brand_power = "high";
    }

    const matchedRules = matchRules(ruleFacts);
    const matchedCases = findSimilarCases({
      category: ctx.project.category,
      city: ctx.project.city,
      stage: ctx.project.stage,
    });

    // 只传匹配到的知识，按权重排序取前 8 条规则 + 前 4 个案例
    const knowledgeContext = [
      ...matchedRules.slice(0, 8).map(r =>
        `【规则#${r.id}】${r.description}\n判断: ${r.judgement}\n建议: ${r.recommendation}`
      ),
      ...matchedCases.slice(0, 4).map(c =>
        `【案例#${c.id}】${c.title}\n结果: ${c.outcome.status === "success" ? "成功" : "失败"}\n教训: ${c.lessons.join("；")}`
      ),
    ];

    const recentDecisions = ctx.decisions
      .slice(-5)
      .map(d => `- 问题: ${d.problem}, 判断: ${d.judgement}`)
      .join("\n");

    const restaurantBrainBlock =
      ctx.restaurantContext?.priorBlock?.trim() ||
      "暂无餐厅大脑上下文（未知处不得编造，应先提问）";

    const prompt = `你是 MealKey 餐饮经营认知系统的首席经营顾问，拥有30年餐饮经营智慧。

## 任务
基于以下用户输入和上下文，执行完整的五步判断链。
输出必须包含：观察 → 诊断 → 评估 → 策略 → 行动
铁律：建议必须锚定「餐厅经营大脑」中的事实与历史；未知处先提问；禁止通用空谈。

## 用户输入
"${input.message}"

## 餐厅经营大脑（长期认知）
${restaurantBrainBlock}

## 项目上下文
${projectInfo || "暂无项目信息"}

## 经营者画像
${ownerInfo || "暂无经营者信息"}

## 匹配的经营规则（ID 可追溯）
${matchedRules.length > 0
  ? matchedRules.slice(0, 8).map(r =>
      `- [${r.id}] ${r.description}（风险: ${r.risk}）→ ${r.judgement}`
    ).join("\n")
  : "暂无可匹配规则"}

## 相似案例参考
${matchedCases.length > 0
  ? matchedCases.slice(0, 4).map(c =>
      `- [${c.id}] ${c.title}（${c.outcome.status === "success" ? "成功" : "失败"}）`
    ).join("\n")
  : "暂无可参考案例"}

## 历史决策
${recentDecisions || "暂无历史决策"}

## 历史反馈
${(ctx as unknown as { _feedbackHistory?: string[] })._feedbackHistory?.length
  ? (ctx as unknown as { _feedbackHistory?: string[] })._feedbackHistory!.join("\n")
  : "暂无历史反馈"}

## 输出格式
严格按照以下 JSON 格式输出，不要输出其他内容：

{
  "observation": {
    "facts": ["提取的关键事实1", "关键事实2"],
    "context": "情境描述"
  },
  "diagnosis": {
    "problem": "核心问题",
    "rootCause": "根本原因",
    "riskLevel": "low|medium|high",
    "riskFactors": ["风险因素1", "风险因素2"]
  },
  "evaluation": {
    "framework": "使用的评估框架",
    "scores": { "市场": 70, "产品": 80, "运营": 60, "品牌": 50, "团队": 40 },
    "overall": 60,
    "strengths": ["优势维度"],
    "weaknesses": ["薄弱维度"]
  },
  "strategy": {
    "recommendation": "核心建议",
    "alternatives": ["替代方案1", "替代方案2"],
    "reasoning": "推理过程",
    "timeframe": "建议时间框架"
  },
  "action": {
    "nextSteps": ["步骤1", "步骤2"],
    "immediate": ["立即行动1", "立即行动2"],
    "shortTerm": ["短期计划1"],
    "longTerm": ["长期规划1"]
  }
}`;

    // 使用 LLM 缓存（temperature <= 0.5 的确定性调用自动缓存）
    const responseContent = await globalLLMCache.getOrFetch(
      [
        { role: "system", content: "你是 MealKey 首席经营顾问。严格按照指定 JSON 格式输出。不要输出其他内容。" },
        { role: "user", content: prompt },
      ],
      0.3,
      async () => {
        const res = await this.deps.llm.chat({
          messages: [
            { role: "system", content: "你是 MealKey 首席经营顾问。严格按照指定 JSON 格式输出。不要输出其他内容。" },
            { role: "user", content: prompt },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        });
        return res.content;
      },
      5 * 60 * 1000 // 5 分钟 TTL
    );

    const response = { content: responseContent };

    const parsed = this.tryParseJSON(response.content);
    if (!parsed) {
      throw new Error("Failed to parse LLM judgment result");
    }

    // 安全提取各步骤结果
    const observation = parsed.observation as Record<string, unknown> || {};
    const diagnosis = parsed.diagnosis as Record<string, unknown> || {};
    const evaluation = parsed.evaluation as Record<string, unknown> || {};
    const strategy = parsed.strategy as Record<string, unknown> || {};
    const action = parsed.action as Record<string, unknown> || {};

    // 计算分数置信度
    const scores = (evaluation.scores as Record<string, number>) || {};
    const scoreValues = Object.values(scores);
    const avgScore = scoreValues.length > 0
      ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length
      : 50;

    return {
      observation: {
        facts: (observation.facts as string[]) || [input.message],
        entities: {},
        context: (observation.context as string) || problem.surfaceIntent,
      },
      diagnosis: {
        problem: (diagnosis.problem as string) || "需要进一步分析",
        rootCause: (diagnosis.rootCause as string) || "信息不足",
        riskLevel: (diagnosis.riskLevel as "low" | "medium" | "high") || "medium",
        riskFactors: (diagnosis.riskFactors as string[]) || [],
      },
      evaluation: {
        framework: (evaluation.framework as string) || "餐饮经营综合评估",
        scores,
        overall: (evaluation.overall as number) || Math.round(avgScore),
        strengths: (evaluation.strengths as string[]) || [],
        weaknesses: (evaluation.weaknesses as string[]) || [],
      },
      strategy: {
        recommendation: (strategy.recommendation as string) || "继续完善方案",
        alternatives: (strategy.alternatives as string[]) || [],
        reasoning: (strategy.reasoning as string) || "",
        timeframe: (strategy.timeframe as string) || "待定",
      },
      action: {
        nextSteps: (action.nextSteps as string[]) || [],
        immediate: (action.immediate as string[]) || [],
        shortTerm: (action.shortTerm as string[]) || [],
        longTerm: (action.longTerm as string[]) || [],
      },
      overallConfidence: Math.round(avgScore),
    };
  }

  /**
   * 规则判断链（降级路径）
   */
  private executeRuleJudgment(
    input: AgentInput,
    ctx: MKContext
  ): Promise<JudgmentResult> {
    const experienceYears = parseInt(ctx.owner.experience) || 0;

    const chain = new DefaultJudgmentChain({
      project: {
        city: ctx.project.city ?? undefined,
        category: ctx.project.category ?? undefined,
        stage: ctx.project.stage,
      },
      owner: {
        experience_level: experienceYears > 5 ? "expert" :
                         experienceYears > 2 ? "intermediate" : "beginner",
        strengths: ctx.owner.strengths,
        blindspots: ctx.owner.weaknesses,
      },
      memory: {
        recentDecisions: ctx.decisions.map(d => ({
          question: d.problem,
          recommendation: d.judgement,
        })),
        userPreferences: {},
        projectHistory: [],
      },
    });

    return chain.execute();
  }

  // ═══════════════════════════════════════════════════════════════
  // 工具方法
  // ═══════════════════════════════════════════════════════════════

  private async executeTools(
    problem: ProblemAnalysis,
    input: AgentInput,
    ctx: MKContext
  ): Promise<ChiefToolResult[]> {
    if (!this.toolRegistry) return [];

    const results: ChiefToolResult[] = [];
    for (const capability of problem.requiredCapabilities) {
      const toolName = this.mapCapabilityToTool(capability);
      if (toolName) {
        const result = await this.toolRegistry.execute(toolName, {
          query: input.message,
          projectInfo: ctx.project,
          ownerInfo: ctx.owner,
        });
        results.push(result);
      }
    }
    return results;
  }

  private mapCapabilityToTool(capability: string): string | null {
    const mapping: Record<string, string> = {
      positioning: "searchKnowledge",
      brand: "searchKnowledge",
      finance: "diagnoseOperation",
      location: "diagnoseOperation",
      product: "searchKnowledge",
      marketing: "searchKnowledge",
      team: "searchKnowledge",
      risk: "diagnoseOperation",
    };
    return mapping[capability] ?? null;
  }

  /**
   * 生成 MKDecision — Protocol 2 (FROZEN)
   * 对应判断链：观察 → 诊断 → 评估 → 策略 → 行动
   * evidence 现在携带知识 ID，可追溯、可验证
   */
  private generateMKDecision(
    judgment: JudgmentResult,
    risks: Risk[],
    problem: ProblemAnalysis,
    ctx: MKContext,
    toolResults: ChiefToolResult[],
    matchedRules: DecisionRule[] = [],
    matchedCases: CaseStudy[] = [],
  ): MKDecision {
    const evidence: Array<{ source: string; content: string; relevance: number }> = [];

    for (const fact of judgment.observation.facts) {
      evidence.push({ source: "observation", content: fact, relevance: 0.9 });
    }

    // 使用结构化匹配的规则（带 ID），而非 ctx.knowledge 全量
    for (const rule of matchedRules.slice(0, 5)) {
      evidence.push({
        source: `knowledge_rule:${rule.id}`,
        content: `${rule.description}: ${rule.judgement}`,
        relevance: rule.weight,
      });
    }

    // 使用匹配的案例
    for (const c of matchedCases.slice(0, 3)) {
      evidence.push({
        source: `knowledge_case:${c.id}`,
        content: `${c.title}: ${c.outcome.status === "success" ? "成功" : "失败"} - ${c.lessons[0] || ""}`,
        relevance: c.confidence,
      });
    }

    for (const risk of risks.slice(0, 3)) {
      evidence.push({ source: "risk_analysis", content: `${risk.type}: ${risk.description}`, relevance: risk.probability });
    }

    for (const tr of toolResults) {
      if (tr.success && tr.data) {
        evidence.push({
          source: "tool",
          content: typeof tr.data === "string" ? tr.data : JSON.stringify(tr.data).slice(0, 200),
          relevance: 0.8,
        });
      }
    }

    return {
      id: `decision_${Date.now()}`,
      problem: problem.realProblem,
      observation: judgment.observation.context || problem.surfaceIntent,
      diagnosis: judgment.diagnosis.problem,
      judgement: judgment.strategy.recommendation,
      strategy: judgment.strategy.alternatives.length > 0
        ? judgment.strategy.alternatives[0]
        : judgment.strategy.recommendation,
      action: judgment.action.immediate.length > 0
        ? judgment.action.immediate[0]
        : judgment.action.nextSteps[0] ?? "继续完善信息",
      confidence: judgment.overallConfidence / 100,
      evidence,
    };
  }

  private formatOutput(
    judgment: JudgmentResult,
    mkDecision: MKDecision,
    ctx: MKContext,
    challenges?: ChallengeResult | null
  ): string {
    const parts: string[] = [];

    parts.push(`## 观察\n${mkDecision.observation}`);
    parts.push(`\n## 诊断\n${mkDecision.diagnosis}`);
    parts.push(`\n## 判断\n${mkDecision.judgement}`);
    parts.push(`\n## 策略\n${mkDecision.strategy}`);
    parts.push(`\n## 行动\n${mkDecision.action}`);

    parts.push(`\n## 评估\n综合评分: ${judgment.evaluation.overall}/100`);
    if (judgment.evaluation.strengths.length > 0) {
      parts.push(`优势: ${judgment.evaluation.strengths.join(", ")}`);
    }
    if (judgment.evaluation.weaknesses.length > 0) {
      parts.push(`需要加强: ${judgment.evaluation.weaknesses.join(", ")}`);
    }

    if (judgment.diagnosis.riskFactors.length > 0) {
      parts.push(`\n## 风险`);
      judgment.diagnosis.riskFactors.forEach(r => parts.push(`- ${r}`));
    }

    if (challenges && challenges.challenges.length > 0) {
      parts.push(`\n## 需要验证的假设`);
      for (const challenge of challenges.challenges) {
        parts.push(`- ${challenge.assumption} (风险: ${challenge.risk})`);
        parts.push(`  ${challenge.question}`);
      }
      if (challenges.recommendedActions.length > 0) {
        parts.push(`\n验证行动:`);
        challenges.recommendedActions.forEach(a => parts.push(`- ${a}`));
      }
    }

    return parts.join("\n");
  }

  private async updateMemory(
    input: AgentInput,
    judgment: JudgmentResult,
    mkDecision: MKDecision,
    runId?: string,
    knowledgeRefs?: KnowledgeRef[],
  ): Promise<MemoryUpdate[]> {
    const updates: MemoryUpdate[] = [];

    // ════════════════════════════════════════════════════════
    // Auto-Extract: 从输入和决策中自动提取知识碎片
    // ════════════════════════════════════════════════════════
    try {
      const userFragments = globalAutoExtractor.extractFromUserMessage(
        input.userId,
        input.message,
        input.context,
      );
      const decisionFragments = globalAutoExtractor.extractFromDecision(
        mkDecision,
        input.context,
      );
      const allFragments = [...userFragments, ...decisionFragments];

      for (const fragment of allFragments.slice(0, 5)) {
        const memory = globalAutoExtractor.toMemoryFormat([fragment])[0];
        await this.deps.memoryStore.save(
          input.userId,
          memory,
        );
        updates.push({
          layer: memory.layer,
          key: memory.key,
          value: memory.value,
          importance: memory.importance / 100,
        });
      }
    } catch (err) {
      // Auto-extraction 是辅助功能，失败不应影响主流程
      console.warn("Auto-extraction failed:", err);
    }

    const decisionId = await this.deps.memoryStore.saveDecision(
      input.userId,
      input.projectId ?? "",
      mkDecision,
      knowledgeRefs,
    );

    if (this.runTracker && runId && decisionId) {
      try {
        await this.runTracker.attachDecision(runId, decisionId);
      } catch (err) {
        console.warn("Failed to attach decision to AgentRun:", err);
      }
    }

    updates.push({
      layer: "decision",
      key: `decision_${Date.now()}`,
      value: mkDecision,
      importance: 0.8,
    });

    if (judgment.evaluation.weaknesses.length > 0) {
      await this.deps.memoryStore.save(input.userId, {
        layer: "learning",
        key: "capability_weaknesses",
        value: judgment.evaluation.weaknesses,
        importance: 0.7,
        source: "ai_observed",
        projectId: input.projectId,
      });

      updates.push({
        layer: "learning",
        key: `learning_${Date.now()}`,
        value: judgment.evaluation.weaknesses,
        importance: 0.7,
      });
    }

    // 触发学习引擎（异步，不影响主流程）
    if (this.deps.learningEngine) {
      this.deps.learningEngine.learnFromOutcome(input.userId, mkDecision, {
        decisionId: mkDecision.id,
        result: mkDecision.action,
        score: mkDecision.confidence,
        correct: judgment.evaluation.strengths,
        incorrect: judgment.evaluation.weaknesses,
        lessons: judgment.evaluation.weaknesses.length > 0
          ? [`需要加强: ${judgment.evaluation.weaknesses.join(", ")}`]
          : [],
        knowledgeRefs,
      }).catch((err: Error) => console.error("Learning engine error:", err));
    }

    return updates;
  }

  private generateNextSteps(judgment: JudgmentResult): string[] {
    return judgment.action.immediate.length > 0
      ? judgment.action.immediate
      : judgment.action.shortTerm.slice(0, 3);
  }

  private generateRecommendations(judgment: JudgmentResult): string[] {
    const recommendations: string[] = [];

    // 基于评估弱点动态生成建议
    for (const weakness of judgment.evaluation.weaknesses) {
      switch (weakness.toLowerCase()) {
        case "brand":
        case "品牌":
          recommendations.push("建议加强品牌建设，明确品牌定位和价值主张");
          break;
        case "operation":
        case "运营":
          recommendations.push("建议提升运营管理能力，建立标准化流程");
          break;
        case "market":
        case "市场":
          recommendations.push("建议深入市场调研，验证目标客群需求");
          break;
        case "product":
        case "产品":
          recommendations.push("建议打磨产品力，建立差异化竞争优势");
          break;
        case "finance":
        case "财务":
        case "financial":
          recommendations.push("建议优化财务结构，控制成本风险");
          break;
        case "team":
        case "团队":
          recommendations.push("建议加强团队建设，引进关键人才");
          break;
        default:
          recommendations.push(`建议重点关注: ${weakness}`);
          break;
      }
    }

    // 基于风险等级
    if (judgment.diagnosis.riskLevel === "high") {
      recommendations.push("建议先解决关键风险再推进，不要急于扩张");
    }

    // 如果没有弱点，给出通用建议
    if (recommendations.length === 0) {
      if (judgment.evaluation.overall >= 80) {
        recommendations.push("项目整体健康，建议按计划推进");
      } else if (judgment.evaluation.overall >= 60) {
        recommendations.push("项目基本可行，建议继续完善细节");
      } else {
        recommendations.push("建议重新评估项目可行性，补充更多信息");
      }
    }

    return recommendations;
  }

  /**
   * 推断经验等级
   */
  private inferExperienceLevel(experience: string): "beginner" | "intermediate" | "expert" {
    const years = parseInt(experience) || 0;
    if (years > 5) return "expert";
    if (years > 2) return "intermediate";
    return "beginner";
  }

  /**
   * 尝试解析 JSON（支持 markdown 代码块包裹）
   */
  private tryParseJSON(text: string): Record<string, unknown> | null {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = match ? match[1] : text;
    try {
      return JSON.parse(jsonStr.trim()) as Record<string, unknown>;
    } catch {
      // 尝试提取第一个 { } 块
      const braceMatch = text.match(/\{[\s\S]*\}/);
      if (braceMatch) {
        try {
          return JSON.parse(braceMatch[0]) as Record<string, unknown>;
        } catch {
          return null;
        }
      }
      return null;
    }
  }
}
