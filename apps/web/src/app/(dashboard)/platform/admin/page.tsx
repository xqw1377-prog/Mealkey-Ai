import { PlatformDeniedState } from "@/components/operating/PlatformDeniedState";
import { getAuthenticatedUser, requirePlatformAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getPlatformAdminOverview } from "@/server/services/platform-admin.service";

import { PlatformAdminConsoleClient } from "./PlatformAdminConsoleClient";
import { AdminConsoleBoundary } from "./AdminConsoleBoundary";
import { isAdminPanel, type AdminPanel } from "./admin-console-config";

export const dynamic = "force-dynamic";

export default async function PlatformAdminPage({
  searchParams,
}: {
  searchParams?: { panel?: string };
}) {
  try {
    await requirePlatformAdmin();
    const overview = await getPlatformAdminOverview(prisma, { mode: "summary" });
    const panelParam = searchParams?.panel;
    const initialPanel: AdminPanel =
      panelParam && isAdminPanel(panelParam) ? panelParam : "overview";

    return (
      <AdminConsoleBoundary>
        <PlatformAdminConsoleClient
          initialOverview={overview}
          initialPanel={initialPanel}
          allowBootstrap={process.env.NODE_ENV !== "production"}
        />
      </AdminConsoleBoundary>
    );
  } catch (error) {
    const user = await getAuthenticatedUser();
    return (
      <PlatformDeniedState
        surface="admin"
        error={error}
        currentEmail={user?.email}
      />
    );
  }
}
