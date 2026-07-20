import type { PrismaClient } from "@/generated/prisma";

import type { AuthenticatedUser } from "@/lib/auth-helpers";

type AdminAuditEntry = {
  route: string;
  action: string;
  targetType?: string;
  targetId?: string | null;
  input?: Record<string, unknown>;
  result?: Record<string, unknown>;
};

function createAuditKey(action: string) {
  return `admin-audit:${action}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;
}

function safeStringify(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({ error: "audit_serialize_failed" });
  }
}

export async function recordPlatformAdminAudit(
  prisma: PrismaClient,
  user: AuthenticatedUser,
  entry: AdminAuditEntry,
) {
  try {
    const owner = await prisma.owner.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!owner) return null;

    return prisma.memory.create({
      data: {
        ownerId: owner.id,
        type: "ADMIN_AUDIT",
        source: "admin",
        importance: 80,
        key: createAuditKey(entry.action),
        content: safeStringify({
          actor: {
            userId: user.id,
            email: user.email,
          },
          route: entry.route,
          action: entry.action,
          targetType: entry.targetType ?? null,
          targetId: entry.targetId ?? null,
          input: entry.input ?? null,
          result: entry.result ?? null,
          occurredAt: new Date().toISOString(),
        }),
      },
    });
  } catch (error) {
    console.error(
      `[platform-admin-audit] failed action=${entry.action} route=${entry.route}`,
      error,
    );
    return null;
  }
}
