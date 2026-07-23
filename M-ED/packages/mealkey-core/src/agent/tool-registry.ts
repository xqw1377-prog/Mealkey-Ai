/**
 * Agent Tool Registry
 *
 * 设计文档 §七：Agent Tool Contract
 * 三个基础工具：Knowledge Search, Diagnose Operation, Generate Report
 */

import type { AgentTool, ToolResult } from "@mealkey/agent-sdk";
export type { ToolResult } from "@mealkey/agent-sdk";

export interface KnowledgeSearchInput {
  query: string;
  category?: string;
  limit?: number;
}

export interface DiagnoseInput {
  projectInfo: Record<string, unknown>;
  ownerInfo: Record<string, unknown>;
}

export interface GenerateReportInput {
  title: string;
  conclusion: string;
  reasoning: Array<{ step: string; evidence: string }>;
  risks: string[];
  actions: Array<{ title: string; priority: number }>;
}

export class ChiefToolRegistry {
  private tools = new Map<string, AgentTool>();

  register(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
  }

  get(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  list(): AgentTool[] {
    return Array.from(this.tools.values());
  }

  async execute(name: string, input: unknown): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { success: false, data: null, error: `Tool "${name}" not found` };
    }
    try {
      return await tool.execute(input);
    } catch (error) {
      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  static createDefault(deps: {
    knowledgeEngine: {
      search(query: string, limit?: number): Promise<Array<{ key: string; value: unknown; importance: number }>>;
    };
    diagnosisEngine: {
      diagnose(project: Record<string, unknown>, owner: Record<string, unknown>): Promise<{
        risks: Array<{ type: string; description: string; level: string }>;
        score: number;
        recommendation: string;
      }>;
    };
    webSearch?: {
      search(query: string, category?: string, city?: string): Promise<Array<{ key: string; value: unknown; importance: number }>>;
    };
  }): ChiefToolRegistry {
    const registry = new ChiefToolRegistry();

    registry.register({
      name: "searchKnowledge",
      description: "搜索餐饮经营知识库，返回相关经营原则、规则、案例",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string" }, limit: { type: "number" } },
        required: ["query"],
      },
      execute: async (input): Promise<ToolResult> => {
        const { query, limit = 5 } = input as KnowledgeSearchInput;
        const results = await deps.knowledgeEngine.search(query, limit);
        return {
          success: true,
          data: results.map((r) => ({
            key: r.key,
            content: r.value,
            importance: r.importance,
          })),
        };
      },
    });

    registry.register({
      name: "diagnoseOperation",
      description: "诊断项目经营风险，输出风险列表和评分",
      inputSchema: {
        type: "object",
        properties: { projectInfo: { type: "object" }, ownerInfo: { type: "object" } },
        required: ["projectInfo"],
      },
      execute: async (input): Promise<ToolResult> => {
        const { projectInfo, ownerInfo = {} } = input as DiagnoseInput;
        const result = await deps.diagnosisEngine.diagnose(projectInfo, ownerInfo);
        return { success: true, data: result };
      },
    });

    registry.register({
      name: "generateReport",
      description: "生成结构化经营分析报告",
      inputSchema: {
        type: "object",
        properties: {
          title: { type: "string" },
          conclusion: { type: "string" },
          reasoning: { type: "array" },
          risks: { type: "array" },
          actions: { type: "array" },
        },
        required: ["title", "conclusion"],
      },
      execute: async (input): Promise<ToolResult> => {
        const data = input as GenerateReportInput;
        return {
          success: true,
          data: {
            type: "report",
            title: data.title,
            conclusion: data.conclusion,
            reasoning: data.reasoning ?? [],
            risks: data.risks ?? [],
            actions: data.actions ?? [],
            generatedAt: new Date().toISOString(),
          },
        };
      },
    });

    // 注册联网搜索工具（可选）
    if (deps.webSearch) {
      registry.register({
        name: "webSearch",
        description: "联网搜索餐饮行业最新市场数据、竞品动态、行业趋势",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string" },
            category: { type: "string" },
            city: { type: "string" },
          },
          required: ["query"],
        },
        execute: async (input): Promise<ToolResult> => {
          const { query, category, city } = input as { query: string; category?: string; city?: string };
          const results = await deps.webSearch!.search(query, category, city);
          return {
            success: true,
            data: results.map((r) => ({
              key: r.key,
              content: r.value,
              importance: r.importance,
            })),
          };
        },
      });
    }

    return registry;
  }
}
