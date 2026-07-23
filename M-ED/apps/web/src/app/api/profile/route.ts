import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-helpers";
import { buildOwnerPortrait, getOwnerBundle, getPreferredProjectBundle } from "@/server/services/dashboard.service";
import { parseJsonField } from "@/lib/prisma";

export async function GET() {
  try {
    const authUser = await requireAuth();
    const [{ bundle, projects }, user, owner] = await Promise.all([
      getPreferredProjectBundle(prisma, authUser.id),
      prisma.user.findUnique({
        where: { id: authUser.id },
        select: { name: true, preferences: true },
      }),
      getOwnerBundle(prisma, authUser.id),
    ]);
    const [decisionCount, memoryCount] = owner.id
      ? await Promise.all([
          prisma.decision.count({ where: { ownerId: owner.id } }),
          prisma.memory.count({ where: { ownerId: owner.id } }),
        ])
      : [0, 0];

    return NextResponse.json(
      buildOwnerPortrait(
        bundle,
        {
          name: user?.name ?? null,
          preferences:
            typeof user?.preferences === "string"
              ? (parseJsonField(user.preferences) as Record<string, unknown>)
              : {},
        },
        {
          projectCount: projects.length,
          decisionCount,
          memoryCount,
        },
      ),
    );
  } catch (error) {
    if ((error as Error)?.name === "AuthError") {
      return unauthorizedResponse();
    }
    return NextResponse.json({ error: "获取画像失败" }, { status: 500 });
  }
}
