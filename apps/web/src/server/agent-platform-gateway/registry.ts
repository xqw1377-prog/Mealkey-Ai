import { openClientSecret } from "@/lib/developers/access";
import { prisma } from "@/lib/prisma";
import type { ContextScope, RegisteredAgentV1 } from "./types";

const DEFAULT_SCOPES: ContextScope[] = [
  "basic",
  "facts",
  "review",
  "operation",
  "market",
];

const FORBIDDEN_DEFAULT_SECRET = "mk-sandbox-agent-secret";

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function resolveRegistrySecret(): string | null {
  const secret = process.env.MK_AGENT_SANDBOX_SECRET?.trim() || "";
  if (isProduction()) {
    if (!secret || secret === FORBIDDEN_DEFAULT_SECRET) {
      return null;
    }
    return secret;
  }
  return secret || FORBIDDEN_DEFAULT_SECRET;
}

/** V1：环境变量 MK_AGENT_REGISTRY_JSON 或内置 sandbox 官方样板 */
export function loadAgentRegistry(): RegisteredAgentV1[] {
  const raw = process.env.MK_AGENT_REGISTRY_JSON?.trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as RegisteredAgentV1[];
      if (Array.isArray(parsed) && parsed.length) {
        if (isProduction()) {
          const insecure = parsed.some(
            (a) => !a.clientSecret || a.clientSecret === FORBIDDEN_DEFAULT_SECRET,
          );
          if (insecure) {
            console.error(
              "[gateway] MK_AGENT_REGISTRY_JSON 含默认/空密钥，生产拒绝加载",
            );
            return [];
          }
        }
        return parsed;
      }
    } catch {
      /* fall through */
    }
  }

  const secret = resolveRegistrySecret();
  if (!secret) {
    console.error(
      "[gateway] 生产必须配置 MK_AGENT_SANDBOX_SECRET（非默认值）或 MK_AGENT_REGISTRY_JSON",
    );
    return [];
  }

  return [
    {
      agentId: "restaurant-diagnosis",
      clientSecret: secret,
      maxInsightLevel: 3,
      allowedScopes: DEFAULT_SCOPES,
      stage: "live",
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

export function resolveAgent(agentId: string): RegisteredAgentV1 | undefined {
  return loadAgentRegistry().find((a) => a.agentId === agentId);
}

/**
 * 解析已注册 Agent：env 优先，其次已发布 Partner（解密 clientSecretEnc）。
 * 生产仅 published；非生产允许 verified。
 */
export async function resolveAgentAsync(
  agentId: string,
): Promise<RegisteredAgentV1 | undefined> {
  const fromEnv = resolveAgent(agentId);
  if (fromEnv) return fromEnv;

  const app = await prisma.partnerAgentApplication.findUnique({
    where: { agentId },
    include: {
      versions: { orderBy: { createdAt: "desc" }, take: 4 },
    },
  });
  if (!app) return undefined;

  const allowedStatuses = isProduction()
    ? ["published"]
    : ["published", "verified"];
  if (!allowedStatuses.includes(app.lifecycleStatus)) {
    return undefined;
  }

  const version =
    app.versions.find((v) => v.id === app.currentVersionId) ?? app.versions[0];
  if (!version) return undefined;

  let skill: { clientSecretEnc?: string; maxInsightLevel?: number } = {};
  try {
    skill = JSON.parse(version.skillPackageJson || "{}") as typeof skill;
  } catch {
    skill = {};
  }

  const secret = openClientSecret(skill.clientSecretEnc);
  if (!secret) return undefined;

  let allowedScopes: ContextScope[] = ["basic", "facts", "review"];
  try {
    const manifest = JSON.parse(version.manifestJson) as {
      permissions?: string[];
      maxInsightLevel?: number;
    };
    if (Array.isArray(manifest.permissions) && manifest.permissions.includes("read:operation")) {
      allowedScopes = DEFAULT_SCOPES;
    }
  } catch {
    /* keep defaults */
  }

  const maxLevel = Math.min(
    5,
    Math.max(1, Number(skill.maxInsightLevel ?? 3)),
  ) as RegisteredAgentV1["maxInsightLevel"];

  return {
    agentId: app.agentId,
    clientSecret: secret,
    maxInsightLevel: maxLevel,
    allowedScopes,
    stage: app.lifecycleStatus === "published" ? "live" : "pilot",
  };
}
