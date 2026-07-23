import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * 系统状态 — 仅返回当前用户范围的计数，避免全局数据泄露
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ status: "error", message: "Unauthorized" }, { status: 401 });
    }

    const owner = await prisma.owner.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });

    if (!owner) {
      return Response.json({
        status: "ok",
        version: "0.2.0",
        timestamp: new Date().toISOString(),
        database: {
          projects: 0,
          decisions: 0,
          memories: 0,
          knowledgeNodes: 0,
        },
        runtime: { available: true },
      });
    }

    const [projectCount, decisionCount, memoryCount, knowledgeCount] = await Promise.all([
      prisma.project.count({ where: { ownerId: owner.id, status: "active" } }),
      prisma.decision.count({ where: { ownerId: owner.id } }),
      prisma.memory.count({ where: { ownerId: owner.id } }),
      prisma.knowledgeNode.count({ where: { status: "published" } }),
    ]);

    return Response.json({
      status: "ok",
      version: "0.2.0",
      timestamp: new Date().toISOString(),
      database: {
        projects: projectCount,
        decisions: decisionCount,
        memories: memoryCount,
        knowledgeNodes: knowledgeCount,
      },
      runtime: { available: true },
    });
  } catch (error) {
    return Response.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
