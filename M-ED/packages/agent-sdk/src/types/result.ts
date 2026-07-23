/**
 * AgentResult 统一输出契约
 * 
 * 所有 Agent 输出必须遵循此标准。
 * 这是 Agent 可组合的基础。
 */

// ─── Agent 结果 ───

export interface AgentResult {
  status: "success" | "failed";
  decision?: Decision;
  report?: Report;
  actions?: Action[];
  nextMission?: import("./mission").MissionRequest;
  ui?: UIBlock[];
}

// ─── 决策 ───

export interface Decision {
  summary: string;               // "建议进入下一阶段"
  confidence: number;            // 0-100
  reasoning?: string;            // 推理过程
}

// ─── 报告 ───

export interface Report {
  template: string;              // 报告模板 ID
  title: string;
  summary: string;
  sections: ReportSection[];
  data: Record<string, unknown>;
  metadata?: {
    generatedAt: string;
    agentId: string;
    version: string;
  };
}

export interface ReportSection {
  id: string;
  title: string;
  content: string;               // Markdown
  type: "cover" | "summary" | "decision" | "reasoning" | "risk" | "action";
}

// ─── 报告模板 ───

export interface ReportTemplate {
  sections: ReportTemplateSection[];
}

export interface ReportTemplateSection {
  id: string;
  title: string;
  type: "cover" | "summary" | "decision" | "reasoning" | "risk" | "action";
  template?: string;             // Handlebars 风格的模板字符串
}

// ─── 行动建议 ───

export interface Action {
  id: string;
  label: string;                 // "验证客群"
  description: string;
  type: "confirm" | "input" | "execute";
  payload?: Record<string, unknown>;
}

// ─── UI Block（前端渲染指令）───

export interface UIBlock {
  type: UIBlockType;
  title?: string;
  data: Record<string, unknown>;
}

export type UIBlockType =
  | "score"       // 评分展示
  | "chart"       // 图表
  | "table"       // 表格
  | "risk"        // 风险列表
  | "timeline"    // 时间线
  | "map"         // 地图
  | "text"        // 文本
  | "action";     // 行动按钮
