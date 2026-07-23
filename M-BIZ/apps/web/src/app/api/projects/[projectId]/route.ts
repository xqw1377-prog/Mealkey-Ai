import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-helpers";
import { buildProjectOverview, getProjectInsightBundle } from "@/server/services/dashboard.service";

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
    const overview = buildProjectOverview(bundle);

    return NextResponse.json({
      id: bundle.project.id,
      name: bundle.project.name,
      stage: bundle.project.stage,
      score: overview.score,
      risk: overview.biggestRisk,
      nextAction: overview.tasks.find((task) => !task.completed)?.title ?? overview.tasks[0]?.title ?? "",
    });
  } catch (error) {
    if ((error as Error)?.name === "AuthError") {
      return unauthorizedResponse();
    }
    return NextResponse.json({ error: "获取项目失败" }, { status: 500 });
  }
}
