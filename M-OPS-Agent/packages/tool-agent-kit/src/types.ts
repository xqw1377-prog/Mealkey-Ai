/**
 * L3 Tool Agent 框架类型 — 见 docs/MEALKEY_TOOL_AGENT_FRAMEWORK_V1.md
 * 零业务依赖；不导入 Prisma / Web / 四席咨询内核。
 */

export type ToolAgentKind =
  | "ops"
  | "site"
  | "menu"
  | "campaign"
  | "hiring"
  | "content"
  | "audit"
  | "sop"
  | "finance"
  | "other";

export type ToolAgentPort = "signal" | "insight" | "work" | "gap";

export type ToolAgentStage = "idea" | "pilot" | "live" | "deprecated";

export type ToolPermission =
  | "READ_BRAIN_SLICE"
  | "READ_RIP"
  | "READ_EVIDENCE"
  | "EMIT_SIGNAL"
  | "EMIT_INSIGHT"
  | "EMIT_WORK"
  | "WRITE_MEMORY";

export type ToolInvokePurpose =
  | "radar"
  | "council"
  | "execution"
  | "standalone";

export interface ToolAgentComposeDecl {
  upstream?: string[];
  downstream?: string[];
  conflictsWith?: string[];
}

export interface ToolAgentInvokePolicy {
  /** true = 须已有批准决策 / Execution 授权 */
  requiresDecisionAuth: boolean;
  /** 高副作用须老板确认 */
  requiresBossConfirm: boolean;
  billable: boolean;
}

/** 每个 L3 Agent 的身份证 */
export interface ToolAgentManifest {
  id: string;
  name: string;
  version: string;
  kind: ToolAgentKind;
  stage: ToolAgentStage;
  ports: ToolAgentPort[];
  permissions: ToolPermission[];
  inputSchemaRef: string;
  outputSchemaRef: string;
  invokePolicy: ToolAgentInvokePolicy;
  compose?: ToolAgentComposeDecl;
  description?: string;
}

/** Engine 输入外壳（具体字段由各 Agent contracts 扩展） */
export interface ToolAgentRequest<TInput = unknown> {
  agentId: string;
  input: TInput;
  meta?: {
    projectId?: string;
    caseId?: string;
    horizon?: "today" | "7d" | "30d";
    purpose?: ToolInvokePurpose;
  };
}

/** 证据缺口（P4） */
export interface ToolEvidenceGap {
  field: string;
  reason: string;
  severity: "low" | "medium" | "high";
}

/** 执行物（P3）— 结构化，非战略终局 */
export interface ToolWorkResult {
  title: string;
  summary: string;
  artifacts?: Array<{
    kind: string;
    label: string;
    payload: unknown;
  }>;
}

/**
 * Engine 标准输出外壳。
 * 宿主只认 ports 声明过的字段；禁止塞 MKDecision / 拍板合同。
 */
export interface ToolAgentResult<TFinding = unknown> {
  agentId: string;
  ok: boolean;
  findings?: TFinding[];
  /** P1 — 由 signal-adapter 映射为 BusinessSignal */
  signalHints?: Array<{
    typeHint?: string;
    observation: string;
    meaning?: string;
    impact?: string;
    confidence: number;
    evidenceClaims?: string[];
  }>;
  /** P2 — 由 mk-insight-adapter 映射为 VerticalInsightSource */
  insightDraft?: {
    caseId: string;
    findings: Array<{
      domain: string;
      finding: string;
      reasoning: string;
      impact: string;
      confidence: number;
      evidenceClaims?: string[];
    }>;
  };
  /** P3 */
  work?: ToolWorkResult;
  /** P4 */
  gaps?: ToolEvidenceGap[];
  errorMessage?: string;
}

/** 纯 Engine 接口 — 可单测、可独立进程化 */
export interface ToolAgentEngine<TInput = unknown, TFinding = unknown> {
  manifest: ToolAgentManifest;
  run(request: ToolAgentRequest<TInput>): Promise<ToolAgentResult<TFinding>>;
}

/** Host 统一调用入参（Bridge 层） */
export interface ToolAgentInvokeInput<TInput = unknown> {
  agentId: string;
  projectId?: string;
  input: TInput;
  purpose: ToolInvokePurpose;
  auth?: {
    decisionId?: string;
    executionGrantId?: string;
  };
}
