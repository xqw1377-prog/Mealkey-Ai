type MBizRequestInit = RequestInit & {
  bodyJson?: unknown;
};

const MEALKEY_M_BIZ_AGENT_ID = "mealkey-web-m-biz";

export type MBizChatRequest = {
  session_id?: string;
  message: string;
  enterprise_name?: string;
  industry?: string;
  stage?: string;
};

export type MBizVerifyRequest = {
  session_id: string;
  task_id: string;
  result: string;
  actual_data?: Record<string, unknown>;
  conclusion?: string;
  user_feedback?: string;
  new_insights?: string[];
};

function getMBizBaseUrl() {
  return (
    process.env.MBIZ_API_BASE_URL ||
    process.env.BMJM_API_BASE_URL ||
    "http://127.0.0.1:8000/api/v1/bmjm"
  ).replace(/\/$/, "");
}

function getMBizToken() {
  const token = process.env.MBIZ_API_TOKEN || process.env.BMJM_API_TOKEN;
  if (!token) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("请配置 MBIZ_API_TOKEN（生产环境禁止使用默认开发 Token）");
    }
    return "mbiz-dev-token-2026";
  }
  return token;
}

function buildMBizHeaders(initHeaders?: HeadersInit): HeadersInit {
  const requestId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `mealkey-${Date.now()}`;

  return {
    Authorization: `Bearer ${getMBizToken()}`,
    "Content-Type": "application/json",
    "X-Agent-Id": MEALKEY_M_BIZ_AGENT_ID,
    "X-Request-Id": requestId,
    ...(initHeaders || {}),
  };
}

/**
 * 检查 M-BIZ 服务是否可用（通过快速连接检测）
 */
export async function checkMBizHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${getMBizBaseUrl()}/health`, {
      method: "GET",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

async function mbizFetch<T>(path: string, init: MBizRequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = init.timeoutMs || 15000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${getMBizBaseUrl()}${path}`, {
      ...init,
      headers: buildMBizHeaders(init.headers),
      body: init.bodyJson !== undefined ? JSON.stringify(init.bodyJson) : init.body,
      cache: "no-store",
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeout);
    if ((error as Error)?.name === "AbortError") {
      throw new Error("M-BIZ 请求超时，服务可能未启动");
    }
    throw new Error(`M-BIZ 服务连接失败: ${(error as Error)?.message || "请确保 M-BIZ 服务已启动"}`);
  }
  clearTimeout(timeout);

  const payload = (await response.json().catch(() => null)) as
    | { code?: number; message?: string; data?: T }
    | null;

  if (!response.ok) {
    throw new Error(payload?.message || `M-BIZ 请求失败 (${response.status})`);
  }

  if (!payload) {
    throw new Error("M-BIZ 没有返回有效响应");
  }

  if (typeof payload.code === "number" && payload.code !== 0) {
    throw new Error(payload.message || "M-BIZ 业务处理失败");
  }

  return (payload.data ?? (payload as T)) as T;
}

/** M-BIZ 无服务时的启发式降级回复 */
export function mbizDegradedResponse(message: string): {
  session_id: string;
  status: string;
  current_layer: string;
  reply: string;
  pending_questions: string[];
  fact_nodes: Array<Record<string, unknown>>;
  dimension_scores: Record<string, { score: number; summary: string }>;
  rule_judgments: Array<Record<string, unknown>>;
  suggestions: Array<Record<string, unknown>>;
  verification_tasks: Array<Record<string, unknown>>;
  progress: number;
} {
  return {
    session_id: `degraded-${Date.now()}`,
    status: "degraded",
    current_layer: "L2",
    reply: `【商业模式引擎暂不可用】\n\n系统检测到 M-BIZ 服务未就绪，当前以启发式规则提供初步判断：\n\n> "${message}"\n\n**初步分析**：\n这是一个商业模式类问题。在 M-BIZ 服务恢复前，建议先完善以下基础信息：\n- 当前的收入结构与成本模型\n- 核心资源与关键合作伙伴\n- 目标客户的付费意愿与复购逻辑\n\n请启动 M-BIZ 服务后重新提问以获得完整的九维模型分析。`,
    pending_questions: [
      "当前的收入来源有哪些？",
      "最大的成本项是什么？",
      "目标客户的复购率如何？",
    ],
    fact_nodes: [
      {
        node_id: "degraded-1",
        category: "business_model",
        statement: `用户提问：${message.slice(0, 120)}`,
        confidence: 0.5,
        source: "degraded",
        needs_verification: true,
        verification_status: "unverified",
        follow_up_questions: [],
        createdAt: new Date().toISOString(),
      },
    ],
    dimension_scores: {
      RS: { score: 2, summary: "基础信息不足，无法准确评分" },
    },
    rule_judgments: [
      {
        rule_id: "degraded-default",
        domain: "business_model",
        input_fact_ids: ["degraded-1"],
        conclusion: "商业模式分析需要完整的经营数据支撑，建议先补充收入、成本和客户数据。",
        confidence: 0.5,
        severity: "info",
      },
    ],
    suggestions: [
      {
        suggestion_id: "degraded-s1",
        priority: "high",
        dimension: "business_model",
        action: "完善商业模式基础信息",
        expected_impact: "支撑更精准的商业模型评估",
        verification_action: "收集收入结构、成本模型、客户数据",
        estimated_verification_period: "3-7 天",
      },
    ],
    verification_tasks: [],
    progress: 0.2,
  };
}

export function normalizeBizIndustry(_projectCategory?: string | null) {
  return "retail";
}

export function normalizeBizStage(projectStage?: string | null) {
  switch ((projectStage || "").toLowerCase()) {
    case "growth":
    case "opening":
      return "growth";
    case "paused":
    case "archived":
      return "decline";
    case "setup":
      return "growth";
    case "location":
    case "positioning":
    case "idea":
    default:
      return "seed";
  }
}

export async function mbizChat(request: MBizChatRequest) {
  return mbizFetch<{
    session_id: string;
    status: string;
    current_layer: string;
    reply: string;
    pending_questions?: string[];
    fact_nodes?: Array<Record<string, unknown>>;
    dimension_scores?: Record<string, { score: number; summary: string }>;
    rule_judgments?: Array<Record<string, unknown>>;
    suggestions?: Array<Record<string, unknown>>;
    verification_tasks?: Array<Record<string, unknown>>;
    progress: number;
  }>("/chat", {
    method: "POST",
    bodyJson: request,
  });
}

export async function mbizScan(request: MBizChatRequest) {
  return mbizFetch<{
    session_id: string;
    status: string;
    current_layer: string;
    reply: string;
    pending_questions?: string[];
    fact_nodes?: Array<Record<string, unknown>>;
    dimension_scores?: Record<string, { score: number; summary: string }>;
    rule_judgments?: Array<Record<string, unknown>>;
    suggestions?: Array<Record<string, unknown>>;
    verification_tasks?: Array<Record<string, unknown>>;
    progress: number;
  }>("/chat/scan", {
    method: "POST",
    bodyJson: request,
  });
}

export async function mbizAnalyze(dimension: string, request: MBizChatRequest) {
  return mbizFetch<{
    session_id: string;
    status: string;
    current_layer: string;
    reply: string;
    pending_questions?: string[];
    fact_nodes?: Array<Record<string, unknown>>;
    dimension_scores?: Record<string, { score: number; summary: string }>;
    rule_judgments?: Array<Record<string, unknown>>;
    suggestions?: Array<Record<string, unknown>>;
    verification_tasks?: Array<Record<string, unknown>>;
    progress: number;
  }>(`/chat/analyze/${encodeURIComponent(dimension)}`, {
    method: "POST",
    bodyJson: request,
  });
}

export async function mbizVerify(request: MBizVerifyRequest) {
  return mbizFetch<{
    session_id: string;
    status: string;
    current_layer: string;
    reply: string;
    pending_questions?: string[];
    fact_nodes?: Array<Record<string, unknown>>;
    dimension_scores?: Record<string, { score: number; summary: string }>;
    rule_judgments?: Array<Record<string, unknown>>;
    suggestions?: Array<Record<string, unknown>>;
    verification_tasks?: Array<Record<string, unknown>>;
    progress: number;
  }>("/chat/verify", {
    method: "POST",
    bodyJson: request,
  });
}

export async function mbizGetSession(sessionId: string) {
  return mbizFetch<{
    session_id: string;
    status: string;
    current_layer: string;
    reply: string;
    pending_questions?: string[];
    fact_nodes?: Array<Record<string, unknown>>;
    dimension_scores?: Record<string, { score: number; summary: string }>;
    rule_judgments?: Array<Record<string, unknown>>;
    suggestions?: Array<Record<string, unknown>>;
    verification_tasks?: Array<Record<string, unknown>>;
    progress: number;
  }>(`/chat/session/${encodeURIComponent(sessionId)}`);
}
