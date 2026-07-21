import type { ContextScope, RegisteredAgentV1 } from "./types";

const DEFAULT_SCOPES: ContextScope[] = [
  "basic",
  "facts",
  "review",
  "operation",
  "market",
];

/** V1：环境变量 MK_AGENT_REGISTRY_JSON 或内置 sandbox 官方样板 */
export function loadAgentRegistry(): RegisteredAgentV1[] {
  const raw = process.env.MK_AGENT_REGISTRY_JSON?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as RegisteredAgentV1[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    } catch {
      /* fall through */
    }
  }

  const secret =
    process.env.MK_AGENT_SANDBOX_SECRET?.trim() || "mk-sandbox-agent-secret";

  return [
    {
      agentId: "m-ops-diag",
      clientSecret: secret,
      maxInsightLevel: 3,
      allowedScopes: DEFAULT_SCOPES,
      stage: "pilot",
    },
    {
      agentId: "restaurant-diagnosis",
      clientSecret: secret,
      maxInsightLevel: 3,
      allowedScopes: DEFAULT_SCOPES,
      stage: "sandbox",
    },
    {
      agentId: "partner.acme.diagnosis",
      clientSecret: secret,
      maxInsightLevel: 3,
      allowedScopes: ["basic", "facts", "review"],
      stage: "sandbox",
    },
  ];
}

export function resolveAgent(
  agentId: string,
): RegisteredAgentV1 | undefined {
  return loadAgentRegistry().find((a) => a.agentId === agentId);
}
