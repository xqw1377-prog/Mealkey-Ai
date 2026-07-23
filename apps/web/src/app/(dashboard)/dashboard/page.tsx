import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { resolveHomeData } from "@/server/routers/dashboard";
import { DashboardRouteClient } from "./DashboardRouteClient";

/**
 * Phase 1：默认进 ChatGPT 式对话页。
 * 仅 ?radar=1 留在经营动态驾驶舱。
 */
export default async function DashboardRoutePage({
  searchParams,
}: {
  searchParams?: { radar?: string };
}) {
  let initialHomeResponse:
    | Awaited<ReturnType<typeof resolveHomeData>>
    | null = null;

  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (userId) {
      const owner = await prisma.owner.findUnique({
        where: { userId },
        select: { id: true },
      });
      initialHomeResponse = await resolveHomeData(
        { userId, ownerId: owner?.id },
        undefined,
        true,
      );
    }
  } catch {
    initialHomeResponse = null;
  }

  const stayOnRadar = searchParams?.radar === "1";
  const projectId = initialHomeResponse?.currentProject?.id;
  if (!stayOnRadar && projectId) {
    redirect(`/projects/${projectId}/agent`);
  }

  return (
    <DashboardRouteClient
      initialHomeResponse={initialHomeResponse ?? undefined}
    />
  );
}
