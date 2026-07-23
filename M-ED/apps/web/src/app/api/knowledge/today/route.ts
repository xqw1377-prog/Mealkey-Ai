import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, unauthorizedResponse } from "@/lib/auth-helpers";
import { buildKnowledgeCenter, getKnowledgeNodesForBundle, getPreferredProjectBundle } from "@/server/services/dashboard.service";

export async function GET() {
  try {
    const authUser = await requireAuth();
    const { bundle } = await getPreferredProjectBundle(prisma, authUser.id);

    if (!bundle) {
      return NextResponse.json({ title: "暂无洞察", content: "知识库正在建设中" });
    }

    const nodes = await getKnowledgeNodesForBundle(prisma, bundle);
    return NextResponse.json(buildKnowledgeCenter(bundle, nodes));
  } catch (error) {
    if ((error as Error)?.name === "AuthError") {
      return unauthorizedResponse();
    }
    return NextResponse.json({ error: "获取知识失败" }, { status: 500 });
  }
}
