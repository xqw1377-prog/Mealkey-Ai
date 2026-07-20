import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { resolveHomeData } from "@/server/routers/dashboard";
import { DashboardRouteClient } from "./DashboardRouteClient";

export default async function DashboardRoutePage() {
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

  return <DashboardRouteClient initialHomeResponse={initialHomeResponse ?? undefined} />;
}
