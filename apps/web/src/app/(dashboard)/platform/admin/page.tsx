import { MKPageHeader } from "@/components/operating";
import { PlatformDeniedState } from "@/components/operating/PlatformDeniedState";
import { getAuthenticatedUser, requirePlatformAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getPlatformAdminOverview } from "@/server/services/platform-admin.service";

import { PlatformAdminConsoleClient } from "./PlatformAdminConsoleClient";
import { AdminConsoleBoundary } from "./AdminConsoleBoundary";
import { isAdminPanel, type AdminPanel } from "./admin-console-config";

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
      <div className="space-y-5 pb-2">
        <MKPageHeader
          eyebrow="平台管理"
          title="经营驾驶舱"
          description="组织、计费、上架与学习复核的可写控制台。默认只看真实对象；演示种子仅非生产可用。"
          badge={
            <div className="inline-flex min-h-7 items-center rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">
              管理端
            </div>
          }
        />

        <AdminConsoleBoundary>
          <PlatformAdminConsoleClient
            initialOverview={overview}
            initialPanel={initialPanel}
            allowBootstrap={process.env.NODE_ENV !== "production"}
          />
        </AdminConsoleBoundary>
      </div>
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
