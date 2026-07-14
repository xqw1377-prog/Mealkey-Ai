/**
 * 系统日志 API
 *
 * GET /api/system/logs?limit=20
 * 需要认证
 *
 * 仅返回当前登录用户（Owner）范围内的 AgentRun / Decision / Mission。
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-helpers";

export async function GET(request: Request) {
  try {
    const authUser = await requireAuth();

    const owner = await prisma.owner.findUnique({
      where: { userId: authUser.id },
      select: { id: true },
    });

    if (!owner) {
      return NextResponse.json({
        agentRuns: [],
        decisions: [],
        missions: [],
        meta: { totalAgentRuns: 0, totalDecisions: 0, totalMissions: 0 },
      });
    }

    const url = new URL(request.url);
    const limit = Math.min(Math.max(1, parseInt(url.searchParams.get("limit") ?? "20", 10) || 20), 100);
    const ownerId = owner.id;

    const [agentRuns, decisions, missions, totalAgentRuns, totalDecisions, totalMissions] =
      await Promise.all([
        prisma.agentRun.findMany({
          where: { ownerId },
          orderBy: { createdAt: "desc" },
          take: limit,
          select: {
            id: true,
            agentId: true,
            status: true,
            duration: true,
            tokens: true,
            createdAt: true,
          },
        }),
        prisma.decision.findMany({
          where: { ownerId },
          orderBy: { createdAt: "desc" },
          take: limit,
          select: {
            id: true,
            problem: true,
            judgement: true,
            confidence: true,
            type: true,
            createdAt: true,
          },
        }),
        prisma.mission.findMany({
          where: { ownerId },
          orderBy: { createdAt: "desc" },
          take: limit,
          select: {
            id: true,
            sourceAgent: true,
            targetAgent: true,
            objective: true,
            status: true,
            duration: true,
            createdAt: true,
          },
        }),
        prisma.agentRun.count({ where: { ownerId } }),
        prisma.decision.count({ where: { ownerId } }),
        prisma.mission.count({ where: { ownerId } }),
      ]);

    return NextResponse.json({
      agentRuns,
      decisions,
      missions,
      meta: {
        totalAgentRuns,
        totalDecisions,
        totalMissions,
      },
    });
  } catch (error) {
    if ((error as Error)?.name === "AuthError") {
      return unauthorizedResponse();
    }
    return NextResponse.json({ error: "获取系统日志失败" }, { status: 500 });
  }
}
