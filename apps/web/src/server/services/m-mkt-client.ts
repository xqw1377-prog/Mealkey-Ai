/**
 * M-MKT HTTP Client — 对接 agents/m-mkt FastAPI 薄层 (:8002)
 */

export type MMktAnalyzeRequest = {
  category: string;
  city?: string | null;
  experience?: string;
  capital_level?: string;
  team_size?: string;
  mode?: "default" | "light";
  message?: string;
};

export type MMktAnalyzeData = {
  engine?: string;
  category?: string;
  city?: string | null;
  message?: string;
  opportunity_score?: number;
  opportunity_level?: string;
  raw_score?: number;
  dimension_scores?: Record<string, number>;
  dimension_details?: Array<Record<string, unknown>>;
  category_info?: Record<string, unknown> | null;
  city_info?: Record<string, unknown> | null;
  matched_cases?: Array<Record<string, unknown>>;
  related_cases?: Array<Record<string, unknown>>;
  positioning_suggestions?: string[];
  strategic_recommendations?: string[];
  rule_notes?: string[];
  warnings?: string[];
  risk_warnings?: string[];
  [key: string]: unknown;
};

function getMMktBaseUrl() {
  return (
    process.env.MMKT_API_BASE_URL ||
    process.env.M_MKT_API_BASE_URL ||
    "http://127.0.0.1:8002"
  ).replace(/\/$/, "");
}

export async function checkMMktHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${getMMktBaseUrl()}/v1/health`, {
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

export async function mmktAnalyze(
  request: MMktAnalyzeRequest,
  init?: { timeoutMs?: number },
): Promise<MMktAnalyzeData> {
  const controller = new AbortController();
  const timeoutMs = init?.timeoutMs ?? 15000;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${getMMktBaseUrl()}/v1/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (error) {
    clearTimeout(timeout);
    if ((error as Error)?.name === "AbortError") {
      throw new Error("M-MKT 请求超时，服务可能未启动");
    }
    throw new Error(`M-MKT 服务连接失败: ${(error as Error)?.message || "请启动 m-mkt:8002"}`);
  }
  clearTimeout(timeout);

  const payload = (await response.json().catch(() => null)) as {
    code?: number;
    message?: string;
    data?: MMktAnalyzeData;
  } | null;

  if (!response.ok) {
    throw new Error(payload?.message || `M-MKT 请求失败 (${response.status})`);
  }
  if (!payload?.data) {
    throw new Error("M-MKT 没有返回有效数据");
  }
  if (typeof payload.code === "number" && payload.code !== 0) {
    throw new Error(payload.message || "M-MKT 业务处理失败");
  }
  return payload.data;
}

/** 从用户问题 / 企业上下文推断品类与城市 */
export function inferMMktCategoryCity(input: {
  message: string;
  industry?: string;
  city?: string;
}): { category: string; city: string } {
  const text = `${input.message} ${input.industry || ""}`;
  const cityMatch = text.match(
    /(北京|上海|广州|深圳|杭州|成都|重庆|武汉|西安|南京|苏州|长沙|郑州|天津|青岛|厦门|福州|合肥|南昌|昆明|贵阳|南宁|海口|三亚)/,
  );
  const categoryMatch = text.match(
    /(湘菜|川菜|粤菜|火锅|烧烤|咖啡|茶饮|烘焙|面馆|日料|韩料|西餐|快餐|夜宵|卤味|轻食|甜品)/,
  );
  return {
    category: categoryMatch?.[1] || input.industry?.replace(/餐饮|行业/g, "").trim() || "餐饮",
    city: cityMatch?.[1] || input.city || "长沙",
  };
}
