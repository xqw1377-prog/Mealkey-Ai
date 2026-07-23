import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-helpers";
import { getProjectInsightBundle } from "@/server/services/dashboard.service";

export async function GET(
  _request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const authUser = await requireAuth();
    const bundle = await getProjectInsightBundle(prisma, authUser.id, params.projectId);
    if (!bundle) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }
    return NextResponse.json(
      bundle.decisions.map((decision) => ({
        type: decision.type ?? "general",
        score: Math.round(decision.confidence * 100),
        risk: [decision.diagnosis],
        action: decision.action,
        reasoning: [decision.observation, decision.diagnosis, decision.strategy].filter(Boolean),
      })),
    );
  } catch (error) {
    if ((error as Error)?.name === "AuthError") {
      return unauthorizedResponse();
    }
    return NextResponse.json({ error: "获取决策失败" }, { status: 500 });
  }
}
