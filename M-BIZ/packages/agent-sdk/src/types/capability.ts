/**
 * Capability 能力定义
 * 
 * Capability 是 Agent 的能力单元。
 * Agent 是商业包装，Capability 是能力资产。
 */

export interface Capability {
  id: string;                    // "trade_area_analysis"
  name: string;                  // "商圈分析"
  description: string;
  tools: CapabilityTool[];       // 依赖的工具
  knowledge: string[];           // 依赖的知识库 ID
  execute(context: CapabilityContext): Promise<CapabilityResult>;
}

export interface CapabilityTool {
  id: string;
  name: string;
  description: string;
  parameters: Record<string, unknown>;  // JSON Schema
}

export interface CapabilityContext {
  userId: string;
  projectId: string;
  project: ProjectData;
  knowledge: KnowledgeData[];
  previousResults: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ProjectData {
  id: string;
  name: string;
  stage: string | null;
  city: string | null;
  district: string | null;
  category: string | null;
  profile: Record<string, unknown> | null;
}

export interface KnowledgeData {
  id: string;
  title: string;
  content: string;
  category: string;
  relevance: number;
}

export interface CapabilityResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  metadata?: {
    duration?: number;           // ms
    tokens?: number;
    cached?: boolean;
  };
}
