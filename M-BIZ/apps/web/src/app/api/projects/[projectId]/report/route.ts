import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-helpers";
import { buildReportSnapshot, getProjectInsightBundle } from "@/server/services/dashboard.service";

export async function POST(
  _request: Request,
  { params }: { params: { projectId: string } }
) {
  try {
    const authUser = await requireAuth();
    const bundle = await getProjectInsightBundle(prisma, authUser.id, params.projectId);
    if (!bundle) {
      return NextResponse.json({ error: "项目不存在" }, { status: 404 });
    }
    const report = buildReportSnapshot(bundle);
    return NextResponse.json({
      projectId: params.projectId,
      score: report.score,
      conclusion: report.conclusion,
      positioning: report.positioning,
      risk: report.riskTitle,
      counterArgument: report.counterArgument,
      nextAction: report.validationAction,
    });
  } catch (error) {
    if ((error as Error)?.name === "AuthError") {
      return unauthorizedResponse();
    }
    return NextResponse.json({ error: "获取报告失败" }, { status: 500 });
  }
}
