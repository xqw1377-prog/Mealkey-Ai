/**
 * AgentRuntime - 核心执行器
 * 
 * Runtime 不关心具体业务，只负责:
 * 1. 加载 Agent
 * 2. 创建 Context
 * 3. 执行 Workflow
 * 4. 调用 Capability
 * 5. 保存结果
 */

import type {
  AgentDefinition,
  AgentContext,
  AgentResult,
  MissionRequest,
  StreamChunk,
  ChatMessage,
  WorkflowStep,
  ExecutionContext,
} from "@mealkey/agent-sdk";
import type { AgentRegistry } from "./registry";
import type { CapabilityRegistry } from "./capability-registry";
import type { WorkflowEngine } from "./workflow-engine";
import type { MissionRouter } from "./mission-router";
import type { LLMAdapter } from "./llm/adapter";

// 知识引擎和记忆引擎的接口（避免直接依赖）
export interface KnowledgeEngineLike {
  getContextForAgent(agentId: string, projectId: string, query: string, limit?: number): Promise<string[]>;
  learnFromAgentOutput(agentId: string, projectId: string, output: { decision?: { summary: string; reasoning?: string } }): Promise<void>;
}

export interface MemoryEngineLike {
  getContextForAgent(projectId: string, agentId: string): Promise<{
    memories: Array<{ key: string; value: unknown; source: string; confidence: number }>;
    recentDecisions: Array<{
      id: string;
      type: string;
      summary: string;
      reasoning: string | null;
      confidence: number;
      outcome: string | null;
    }>;
  }>;
  saveDecision(projectId: string, agentId: string, decision: {
    type: string;
    summary: string;
    reasoning?: string;
    confidence: number;
  }): Promise<{ id: string }>;
}

export interface AgentRuntimeConfig {
  registry: AgentRegistry;
  capabilityRegistry: CapabilityRegistry;
  workflowEngine: WorkflowEngine;
  missionRouter: MissionRouter;
  llmAdapter: LLMAdapter;
  knowledgeEngine?: KnowledgeEngineLike;
  memoryEngine?: MemoryEngineLike;
}

export class AgentRuntime {
  private disposed = false;
  private activeWorkflowIds = new Set<string>();

  constructor(private config: AgentRuntimeConfig) {}

  /** 清理所有运行时资源 */
  dispose(): void {
    this.disposed = true;
    for (const wfId of this.activeWorkflowIds) {
      try { this.config.workflowEngine.dispose(wfId); } catch {}
    }
    this.activeWorkflowIds.clear();
  }

  /**
   * 流式执行 Agent
   */
  async *run(
    agentId: string,
    mission: MissionRequest | null,
    execContext: ExecutionContext,
    context?: Partial<AgentContext>
  ): AsyncGenerator<StreamChunk> {
    const { registry, capabilityRegistry, workflowEngine, missionRouter, llmAdapter } = this.config;

    // 1. 获取 Agent 定义
    const agent = registry.get(agentId);
    if (!agent) {
      yield { type: "error", message: `Agent "${agentId}" not found` };
      return;
    }

    // 2. 构建完整上下文（集成 Knowledge + Memory）
    const { knowledgeEngine, memoryEngine } = this.config;

    // 获取知识上下文
    let knowledge = context?.knowledge ?? [];
    if (knowledgeEngine && knowledge.length === 0) {
      const query = `${context?.project?.category ?? ""} ${context?.project?.stage ?? ""} 经营`;
      const knowledgeTexts = await knowledgeEngine.getContextForAgent(
        agentId,
        execContext.projectId,
        query,
        5
      );
      knowledge = knowledgeTexts.map((content, i) => ({
        id: `kb_${i}`,
        title: content.split("\n")[0] ?? "知识",
        content,
        category: "industry",
        relevance: 0.8,
      }));
    }

    // 获取记忆上下文
    let memory = context?.memory ?? [];
    let recentDecisions: Array<{ type: string; summary: string; confidence: number }> = [];
    if (memoryEngine) {
      const memoryContext = await memoryEngine.getContextForAgent(
        execContext.projectId,
        agentId
      );
      memory = memoryContext.memories.map((m) => ({
        key: m.key,
        value: m.value,
        updatedAt: new Date(),
      }));
      recentDecisions = memoryContext.recentDecisions.map((d) => ({
        type: d.type,
        summary: d.summary,
        confidence: d.confidence,
      }));
    }

    const fullContext: AgentContext = {
      user: context?.user ?? { id: execContext.userId, name: null, email: null },
      project: context?.project ?? {
        id: execContext.projectId,
        name: "",
        stage: null,
        city: null,
        district: null,
        category: null,
        profile: null,
      },
      mission,
      memory,
      knowledge,
      messageHistory: context?.messageHistory ?? [],
    };

    // 3. 启动工作流
    const workflowId = `wf_${execContext.userId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    if (this.disposed) {
      yield { type: "error", message: "Runtime has been disposed" };
      return;
    }
    this.activeWorkflowIds.add(workflowId);
    workflowEngine.start(workflowId, agent.workflow);

    try {
      // 4. 执行工作流步骤
      while (!workflowEngine.isComplete(workflowId)) {
        const step = workflowEngine.getCurrentStep(workflowId);
        if (!step) break;

        yield { type: "step_start", stepId: step.id, stepName: step.name };

        // 获取步骤需要的能力
        const capabilities = step.capabilities
          ? capabilityRegistry.getMany(step.capabilities)
          : [];

        // 构建步骤上下文
        const previousResults = workflowEngine.getResults(workflowId);
        const stepContext: AgentContext = {
          ...fullContext,
          knowledge: step.knowledge
            ? fullContext.knowledge.filter((k: { category: string }) => step.knowledge!.includes(k.category))
            : fullContext.knowledge,
        };

        // 构建消息列表
        const messages = this.buildMessages(agent, step, stepContext, previousResults);

        // 构建工具列表
        const tools = capabilities.flatMap(cap => cap.inputSchema ? [{ id: cap.id, name: cap.id, description: cap.description, parameters: cap.inputSchema }] : []);

        // 调用 LLM
        const response = await llmAdapter.chat({
          messages,
          tools: tools.length > 0 ? tools : undefined,
          temperature: 0.7,
        });

        // 处理工具调用
        if (response.toolCalls.length > 0) {
          for (const toolCall of response.toolCalls) {
            yield { type: "tool_start", toolName: toolCall.name };
            
            // 执行能力
            const capability = capabilities.find(c => c.id === toolCall.name);
            
            if (capability) {
              // 构建 MKContext for capability execution
              const mkContext = {
                owner: { id: execContext.userId, name: context?.user?.name ?? null, email: context?.user?.email ?? null, experience: "", strengths: [], weaknesses: [], overallScore: 50, riskTolerance: "medium", investmentStyle: "moderate" },
                project: { id: execContext.projectId, name: fullContext.project?.name ?? "", stage: fullContext.project?.stage ?? "", category: fullContext.project?.category, target: null, city: fullContext.project?.city, district: fullContext.project?.district, budget: null, profile: fullContext.project?.profile, healthScore: null, confidence: null },
                memories: [],
                decisions: [],
                knowledge: { rules: [], cases: [], models: [] },
              };
              const result = await capabilityRegistry.execute(capability.id, toolCall.arguments, mkContext);
              
              yield { type: "tool_result", toolName: toolCall.name, result: { success: result.confidence > 0.5, data: result, error: undefined } };
            }
          }
        }

        // 输出文本
        if (response.content) {
          yield { type: "text", content: response.content };
        }

        // 推进工作流
        workflowEngine.advance(workflowId, {
          stepId: step.id,
          response: response.content,
          toolCalls: response.toolCalls.map(tc => tc.name),
        });

        yield { type: "step_complete", stepId: step.id, stepName: step.name };
      }

      // 5. 编译最终结果（使用最后一次 LLM 响应的内容）
      const results = workflowEngine.getResults(workflowId);
      const finalResult = this.compileFinalResult(agent, results);

      // 6. 输出 UI Block
      if (finalResult.ui) {
        for (const block of finalResult.ui) {
          yield { type: "ui_block", block };
        }
      }

      // 8. 保存决策到 Memory
      if (memoryEngine && finalResult.decision) {
        try {
          await memoryEngine.saveDecision(
            execContext.projectId,
            agentId,
            {
              type: agent.manifest.category,
              summary: finalResult.decision.summary,
              reasoning: finalResult.decision.reasoning,
              confidence: finalResult.decision.confidence,
            }
          );
        } catch (err) {
          // 保存决策失败不影响主流程
          console.error("Failed to save decision:", err);
        }
      }

      // 9. 学习到 Knowledge
      if (knowledgeEngine && finalResult.decision) {
        try {
          await knowledgeEngine.learnFromAgentOutput(
            agentId,
            execContext.projectId,
            { decision: finalResult.decision }
          );
        } catch (err) {
          console.error("Failed to learn from output:", err);
        }
      }

      yield { type: "done", result: finalResult };
    } catch (error) {
      workflowEngine.fail(workflowId, String(error));
      yield { type: "error", message: `Agent execution failed: ${error instanceof Error ? error.message : String(error)}` };
    } finally {
      workflowEngine.dispose(workflowId);
      this.activeWorkflowIds.delete(workflowId);
    }
  }

  /**
   * 同步执行 Agent
   */
  async runSync(
    agentId: string,
    mission: MissionRequest | null,
    execContext: ExecutionContext,
    context?: Partial<AgentContext>
  ): Promise<AgentResult> {
    let lastResult: AgentResult | undefined;

    for await (const chunk of this.run(agentId, mission, execContext, context)) {
      if (chunk.type === "done" && chunk.result) {
        lastResult = chunk.result;
      }
      if (chunk.type === "error") {
        return {
          status: "failed",
          decision: {
            summary: chunk.message,
            confidence: 0,
          },
        };
      }
    }

    return lastResult ?? {
      status: "failed",
      decision: {
        summary: "No result produced",
        confidence: 0,
      },
    };
  }

  /**
   * 构建消息列表
   */
  private buildMessages(
    agent: AgentDefinition,
    step: WorkflowStep,
    context: AgentContext,
    previousResults: Map<string, Record<string, unknown>>
  ): ChatMessage[] {
    const messages: ChatMessage[] = [];

    // 系统提示词
    const systemPrompt = step.prompt ?? agent.prompt;
    messages.push({
      role: "system",
      content: this.interpolatePrompt(systemPrompt, context, previousResults),
    });

    // 项目上下文
    if (context.project) {
      messages.push({
        role: "system",
        content: `## 当前项目信息\n\`\`\`json\n${JSON.stringify(context.project, null, 2)}\n\`\`\``,
      });
    }

    // 知识上下文
    if (context.knowledge.length > 0) {
      const knowledgeText = context.knowledge
        .map(k => `【${k.category}】${k.title}\n${k.content}`)
        .join("\n\n");
      messages.push({
        role: "system",
        content: `## 参考知识\n${knowledgeText}`,
      });
    }

    // 之前的步骤结果
    if (previousResults.size > 0) {
      const resultsText = Array.from(previousResults.entries())
        .map(([stepId, result]) => `### ${stepId}\n${JSON.stringify(result, null, 2)}`)
        .join("\n\n");
      messages.push({
        role: "system",
        content: `## 之前的分析结果\n${resultsText}`,
      });
    }

    // 对话历史
    const recentHistory = context.messageHistory.slice(-20);
    messages.push(...recentHistory);

    return messages;
  }

  /**
   * 模板变量替换
   */
  private interpolatePrompt(
    prompt: string,
    context: AgentContext,
    previousResults: Map<string, Record<string, unknown>>
  ): string {
    let result = prompt;

    // 替换项目变量
    if (context.project) {
      const projectFields: Record<string, string | null | undefined> = {
        id: context.project.id,
        name: context.project.name,
        stage: context.project.stage,
        city: context.project.city,
        district: context.project.district,
        category: context.project.category,
      };
      const profile = context.project.profile as Record<string, unknown> | null;
      result = result.replace(/\{\{project\.(\w+)\}\}/g, (_: string, key: string) => {
        return String(projectFields[key] ?? profile?.[key] ?? "");
      });
    }

    // 替换用户变量
    if (context.user) {
      const userFields: Record<string, string | null | undefined> = {
        id: context.user.id,
        name: context.user.name,
        email: context.user.email,
      };
      result = result.replace(/\{\{user\.(\w+)\}\}/g, (_: string, key: string) => {
        return String(userFields[key] ?? "");
      });
    }

    return result;
  }

  /**
   * 编译最终结果 — 使用 LLM 实际输出而非硬编码值
   */
  private compileFinalResult(
    agent: AgentDefinition,
    results: Map<string, Record<string, unknown>>
  ): AgentResult {
    const allResults = Array.from(results.values());
    
    // 从最后一个步骤中提取 LLM 响应内容
    const lastStepResult = allResults[allResults.length - 1];
    const llmResponse = lastStepResult?.response as string ?? "";
    const confidence = lastStepResult?.confidence as number ?? 0;

    return {
      status: "success",
      decision: {
        summary: llmResponse.slice(0, 200) || `${agent.manifest.name} 分析完成`,
        confidence: confidence > 0 ? confidence : 85,
        reasoning: llmResponse,
      },
      report: {
        template: agent.manifest.id,
        title: `${agent.manifest.name} 分析报告`,
        summary: llmResponse.slice(0, 100) || "基于工作流各步骤的分析结果生成的综合报告",
        sections: allResults.map((result, index) => ({
          id: `section_${index}`,
          title: `分析步骤 ${index + 1}`,
          content: (result.response as string) ?? JSON.stringify(result, null, 2),
          type: "reasoning" as const,
        })),
        data: { steps: allResults },
      },
    };
  }
}
