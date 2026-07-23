/**
 * Agent Tool 标准契约
 *
 * 所有 Agent 工具必须遵循此接口。
 */

export interface AgentTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  execute(input: unknown): Promise<ToolResult>;
}

export interface ToolResult {
  success: boolean;
  data: unknown;
  error?: string;
}
