import { MkAuthError, MkError, MkScopeError } from "./errors";
import type {
  AgentClientConfig,
  ContextPackageV1,
  ContextScope,
  IngressAckV1,
  IngressBatchV1,
  InstallStatusV1,
  LearningEventV1,
} from "./types";

async function sha256Hex(body: string): Promise<string> {
  const data = new TextEncoder().encode(body);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function sign(
  secret: string,
  method: string,
  path: string,
  timestamp: string,
  body: string,
  agentId: string,
): Promise<string> {
  const bodyHash = await sha256Hex(body);
  const payload = `${method}\n${path}\n${timestamp}\n${bodyHash}\n${agentId}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payload),
  );
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export type AgentPlatformClient = {
  getRestaurantContext: (
    restaurantId: string,
    options: {
      scopes: ContextScope[];
      userAccessToken: string;
      purpose?: "standalone" | "radar" | "council" | "execution";
    },
  ) => Promise<ContextPackageV1>;
  submitIngress: (batch: IngressBatchV1) => Promise<IngressAckV1>;
  submitLearning: (args: {
    restaurantId: string;
    userAccessToken: string;
    event: LearningEventV1;
    invokeId?: string;
  }) => Promise<IngressAckV1>;
  auth: {
    getInstallStatus: (
      restaurantId: string,
      userAccessToken: string,
    ) => Promise<InstallStatusV1>;
    getAuthorizeUrl: (args: {
      redirectUri: string;
      restaurantId: string;
      scopes: ContextScope[];
      state: string;
    }) => string;
  };
  handoff: {
    decisionRoom: (args: {
      restaurantId: string;
      topic: string;
      invokeId?: string;
    }) => string;
    today: (args: { restaurantId: string; signalId?: string }) => string;
  };
  billing: {
    reportUsage: (args: {
      restaurantId: string;
      userAccessToken: string;
      event: string;
      units: number;
      meta?: Record<string, string>;
    }) => Promise<{ ok: boolean }>;
  };
  sandbox: {
    getRestaurantFixture: (fixtureId: string) => Promise<ContextPackageV1>;
  };
};

function resolveBase(config: AgentClientConfig): string {
  const root = config.baseUrl.replace(/\/$/, "");
  if (config.env === "sandbox" && !root.includes("sandbox")) {
    return `${root}/sandbox`;
  }
  return root;
}

function osWebBase(): string {
  try {
    const g = globalThis as { process?: { env?: Record<string, string> } };
    return (
      g.process?.env?.MK_OS_WEB_URL?.replace(/\/$/, "") ||
      "https://app.mealkey.com"
    );
  } catch {
    return "https://app.mealkey.com";
  }
}

/**
 * Gateway client — docs/MEALKEY_AGENT_SDK_V1.md
 * No Prisma / no Brain direct access.
 */
export function createAgentClient(
  config: AgentClientConfig,
): AgentPlatformClient {
  const base = resolveBase(config);
  const timeout = config.timeoutMs ?? 15_000;

  async function request<T>(
    method: string,
    path: string,
    opts: {
      userAccessToken?: string;
      body?: unknown;
      query?: Record<string, string>;
    } = {},
  ): Promise<T> {
    const qs = opts.query
      ? `?${new URLSearchParams(opts.query).toString()}`
      : "";
    const pathOnly = path;
    const fullPath = `${pathOnly}${qs}`;
    const url = `${base}${fullPath}`;
    const bodyStr = opts.body === undefined ? "" : JSON.stringify(opts.body);
    const timestamp = String(Date.now());
    const signature = await sign(
      config.clientSecret,
      method,
      pathOnly,
      timestamp,
      bodyStr,
      config.agentId,
    );

    const headers: Record<string, string> = {
      "X-Agent-Id": config.agentId,
      "X-Timestamp": timestamp,
      "X-Signature": signature,
      Accept: "application/json",
    };
    if (config.manifestVersion) {
      headers["X-Manifest-Version"] = config.manifestVersion;
    }
    if (opts.userAccessToken) {
      headers.Authorization = `Bearer ${opts.userAccessToken}`;
    }
    if (bodyStr) {
      headers["Content-Type"] = "application/json";
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    try {
      const res = await fetch(url, {
        method,
        headers,
        body: bodyStr || undefined,
        signal: ctrl.signal,
      });
      const text = await res.text();
      const data = text ? (JSON.parse(text) as unknown) : {};
      if (res.status === 401 || res.status === 403) {
        throw new MkAuthError(
          typeof data === "object" && data && "message" in data
            ? String((data as { message: string }).message)
            : `HTTP ${res.status}`,
        );
      }
      if (!res.ok) {
        const code =
          typeof data === "object" && data && "code" in data
            ? String((data as { code: string }).code)
            : "NETWORK_ERROR";
        throw new MkError(code, `Gateway ${res.status}`, {
          httpStatus: res.status,
          details: data,
        });
      }
      return data as T;
    } finally {
      clearTimeout(timer);
    }
  }

  const web = osWebBase();

  return {
    async getRestaurantContext(restaurantId, options) {
      const pkg = await request<ContextPackageV1>(
        "GET",
        `/v1/gateway/context/restaurant/${encodeURIComponent(restaurantId)}`,
        {
          userAccessToken: options.userAccessToken,
          query: {
            scope: options.scopes.join(","),
            ...(options.purpose ? { purpose: options.purpose } : {}),
          },
        },
      );
      for (const s of options.scopes) {
        if (
          !pkg.scopesGranted?.includes(s) &&
          pkg.scopesDenied?.includes(s)
        ) {
          throw new MkScopeError(s);
        }
      }
      return pkg;
    },

    async submitIngress(batch) {
      return request<IngressAckV1>("POST", "/v1/gateway/ingress", {
        userAccessToken: batch.userAccessToken,
        body: {
          agentId: config.agentId,
          restaurantId: batch.restaurantId,
          invokeId: batch.invokeId,
          horizon: batch.horizon,
          items: batch.items,
        },
      });
    },

    async submitLearning(args) {
      return request<IngressAckV1>("POST", "/v1/gateway/ingress", {
        userAccessToken: args.userAccessToken,
        body: {
          agentId: config.agentId,
          restaurantId: args.restaurantId,
          invokeId: args.invokeId || `learn-${Date.now()}`,
          items: [{ port: "learning", payload: args.event }],
        },
      });
    },

    auth: {
      async getInstallStatus(restaurantId, userAccessToken) {
        return request<InstallStatusV1>(
          "GET",
          `/v1/gateway/agents/${encodeURIComponent(config.agentId)}/install`,
          {
            userAccessToken,
            query: { restaurantId },
          },
        );
      },
      getAuthorizeUrl(args) {
        const q = new URLSearchParams({
          client_id: config.agentId,
          redirect_uri: args.redirectUri,
          restaurant_id: args.restaurantId,
          scope: args.scopes.join(" "),
          state: args.state,
          response_type: "code",
        });
        return `${base}/v1/gateway/oauth/authorize?${q.toString()}`;
      },
    },

    handoff: {
      decisionRoom(args) {
        const q = new URLSearchParams({
          restaurantId: args.restaurantId,
          topic: args.topic,
          ...(args.invokeId ? { invokeId: args.invokeId } : {}),
        });
        return `${web}/decision-room?${q.toString()}`;
      },
      today(args) {
        const q = new URLSearchParams({
          restaurantId: args.restaurantId,
          ...(args.signalId ? { focus: "signal", id: args.signalId } : {}),
        });
        return `${web}/dashboard?${q.toString()}`;
      },
    },

    billing: {
      async reportUsage(args) {
        return request<{ ok: boolean }>("POST", "/v1/gateway/billing/usage", {
          userAccessToken: args.userAccessToken,
          body: {
            restaurantId: args.restaurantId,
            event: args.event,
            units: args.units,
            meta: args.meta,
          },
        });
      },
    },

    sandbox: {
      async getRestaurantFixture(fixtureId) {
        return request<ContextPackageV1>(
          "GET",
          `/v1/gateway/sandbox/fixtures/${encodeURIComponent(fixtureId)}`,
          {},
        );
      },
    },
  };
}
