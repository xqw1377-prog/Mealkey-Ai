/**
 * M-ED HTTP Client — 对接 agents/m-ed FastAPI (:8001)
 */

export type MEdAction =
  | "design_equity"
  | "adjust_equity"
  | "simulate"
  | "compliance_check"
  | "generate_document"
  | "get_context"
  | "reset_context";

export type MEdRequest = {
  session_id?: string;
  user_id: string;
  language?: string;
  action: MEdAction;
  payload: Record<string, unknown>;
};

export type MEdResponse = {
  session_id: string;
  status: "success" | "error" | string;
  data?: Record<string, unknown> | null;
  error?: { code?: string; message?: string; details?: unknown };
};

function getMEdBaseUrl() {
  return (
    process.env.MED_API_BASE_URL ||
    process.env.M_ED_API_BASE_URL ||
    "http://127.0.0.1:8001"
  ).replace(/\/$/, "");
}

function getMEdToken(): string | null {
  return process.env.MED_API_KEY || process.env.M_ED_API_KEY || null;
}

export async function checkMEdHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${getMEdBaseUrl()}/v1/agent/equity/health`, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
}

export async function medEquity(
  request: MEdRequest,
  init?: { timeoutMs?: number },
): Promise<MEdResponse> {
  const controller = new AbortController();
  const timeoutMs = init?.timeoutMs ?? 20000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const token = getMEdToken();

  let response: Response;
  try {
    response = await fetch(`${getMEdBaseUrl()}/v1/agent/equity`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        language: "zh-CN",
        ...request,
      }),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (error) {
    clearTimeout(timeout);
    if ((error as Error)?.name === "AbortError") {
      throw new Error("M-ED 请求超时，服务可能未启动");
    }
    throw new Error(`M-ED 服务连接失败: ${(error as Error)?.message || "请启动 m-ed:8001"}`);
  }
  clearTimeout(timeout);

  const payload = (await response.json().catch(() => null)) as MEdResponse | null;
  if (!response.ok) {
    throw new Error(
      payload?.error?.message || `M-ED 请求失败 (${response.status})`,
    );
  }
  if (!payload) {
    throw new Error("M-ED 没有返回有效响应");
  }
  if (payload.status === "error") {
    throw new Error(payload.error?.message || "M-ED 业务处理失败");
  }
  return payload;
}

export function inferMEdAction(message: string): MEdAction {
  if (/稀释|融资轮|轮次|模拟/.test(message)) return "simulate";
  if (/合规|vesting|税务|协议审查/.test(message)) return "compliance_check";
  if (/调整|贡献|里程碑/.test(message)) return "adjust_equity";
  if (/协议|文档|董事会决议/.test(message)) return "generate_document";
  return "design_equity";
}

export function buildDefaultEquityPayload(input: {
  projectName: string;
  stage?: string;
  message: string;
}): Record<string, unknown> {
  const stage = `${input.stage || ""} ${input.message}`.toLowerCase();
  // M-ED DesignEquityPayload 仅接受: idea | seed | angel | pre-a | a
  let projectStage = "seed";
  if (/idea|构思|立项/.test(stage)) projectStage = "idea";
  else if (/angel|天使/.test(stage)) projectStage = "angel";
  else if (/pre-?a|prea|pre_a/.test(stage)) projectStage = "pre-a";
  else if (/\ba轮\b|\ba-round\b|series.?a/.test(stage)) projectStage = "a";
  else projectStage = "seed";

  return {
    project_name: input.projectName || "当前项目",
    project_stage: projectStage,
    team_members: [
      {
        role: "创始人",
        name: "创始人",
        contribution_type: "全职",
        responsibility: "战略与经营",
      },
      {
        role: "联合创始人",
        name: "核心合伙人",
        contribution_type: "全职",
        responsibility: "业务执行",
      },
    ],
    context_note: input.message,
  };
}
