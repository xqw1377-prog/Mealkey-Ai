import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

import type { AuthenticatedUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export function hashClientSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

export function mintClientSecret() {
  return `mk_live_${randomBytes(24).toString("hex")}`;
}

function getSecretKek(): Buffer {
  const kek = process.env.MK_AGENT_SECRET_KEK?.trim();
  if (kek) {
    return createHash("sha256").update(kek, "utf8").digest();
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("生产环境必须配置 MK_AGENT_SECRET_KEK");
  }
  const fallback =
    process.env.MK_AGENT_SANDBOX_SECRET?.trim() || "mk-sandbox-agent-secret";
  return createHash("sha256").update(fallback, "utf8").digest();
}

/** 可恢复封装：Gateway HMAC 验签用；明文密钥仍只在创建时返回一次 */
export function sealClientSecret(secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getSecretKek(), iv);
  const enc = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}.${tag.toString("hex")}.${enc.toString("hex")}`;
}

export function openClientSecret(sealed: string | null | undefined): string | null {
  if (!sealed || typeof sealed !== "string") return null;
  if (process.env.NODE_ENV === "production" && !process.env.MK_AGENT_SECRET_KEK?.trim()) {
    return null;
  }
  const parts = sealed.split(".");
  if (parts.length !== 3) return null;
  const [ivHex, tagHex, dataHex] = parts;
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      getSecretKek(),
      Buffer.from(ivHex!, "hex"),
    );
    decipher.setAuthTag(Buffer.from(tagHex!, "hex"));
    const out = Buffer.concat([
      decipher.update(Buffer.from(dataHex!, "hex")),
      decipher.final(),
    ]);
    return out.toString("utf8");
  } catch {
    return null;
  }
}

export class DeveloperAccessError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function resolveDeveloperAccount(user: AuthenticatedUser) {
  const email = (user.email ?? "").toLowerCase().trim();

  const byUser = await prisma.developerAccount.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  if (byUser) return byUser;

  if (!email) return null;

  const byEmail = await prisma.developerAccount.findFirst({
    where: { contactEmail: email },
    orderBy: { createdAt: "desc" },
  });
  if (!byEmail) return null;

  // 仅允许绑定尚未绑定的账号；禁止抢绑他人 userId
  if (byEmail.userId && byEmail.userId !== user.id) {
    throw new DeveloperAccessError(
      "该联系邮箱已绑定其他登录账号，请使用原账号或联系管理员",
      403,
    );
  }

  if (!byEmail.userId) {
    return prisma.developerAccount.update({
      where: { id: byEmail.id },
      data: { userId: user.id },
    });
  }

  return byEmail;
}

export function assertConsoleAccess<T extends { status: string; id: string } | null>(
  account: T,
): asserts account is NonNullable<T> {
  if (!account) {
    throw new DeveloperAccessError("请先完成开发者入驻申请", 403);
  }
  if (account.status === "rejected" || account.status === "suspended") {
    throw new DeveloperAccessError("开发者账号不可用", 403);
  }
}

export function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function agentIdLooksValid(agentId: string) {
  return /^partner\.[a-z0-9-]+\.[a-z0-9-]+$/.test(agentId) || /^m-[a-z0-9-]+$/.test(agentId);
}

export function buildDefaultManifest(input: {
  agentId: string;
  name: string;
  category: string;
  capabilityIds: string[];
  endpointUrl?: string | null;
}) {
  return {
    id: input.agentId,
    name: input.name,
    version: "1.0.0",
    provider: "partner",
    runtimeMode: "cloud_https",
    stage: "sandbox",
    capabilityIds: input.capabilityIds,
    ports: ["signal", "insight", "gap"],
    maxInsightLevel: 3,
    permissions: ["read:restaurant", "read:evidence"],
    skillPackageRef: `skill.${input.agentId}.v1`,
    schemas: { inputRef: "ContextPackageV1", outputRef: "IngressBatchV1" },
    invokePolicy: {
      requiresDecisionAuth: false,
      requiresBossConfirm: false,
      billable: true,
    },
    quality: {
      minEvidenceSteps: 2,
      allowsInferenceOnly: false,
    },
    endpointUrl: input.endpointUrl ?? null,
    category: input.category,
  };
}

export function completionSteps(app: {
  lifecycleStatus: string;
  endpointUrl: string | null;
  _count?: { sandboxRuns?: number; reviewTasks?: number };
  versions?: Array<{ releaseChannel: string }>;
}) {
  const hasManifest = (app.versions?.length ?? 0) > 0;
  const hasConnect = Boolean(app.endpointUrl);
  const hasSandbox =
    (app._count?.sandboxRuns ?? 0) > 0 ||
    ["sandboxing", "submitted", "verified", "published"].includes(app.lifecycleStatus);
  const hasSubmit =
    (app._count?.reviewTasks ?? 0) > 0 ||
    ["submitted", "verified", "published"].includes(app.lifecycleStatus);

  const checks = [hasManifest, hasConnect, hasSandbox, hasSubmit];
  const done = checks.filter(Boolean).length;
  return {
    percent: Math.round((done / checks.length) * 100),
    steps: {
      manifest: hasManifest,
      connect: hasConnect,
      sandbox: hasSandbox,
      submit: hasSubmit,
    },
  };
}
