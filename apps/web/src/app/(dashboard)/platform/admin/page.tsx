import { MKPageHeader } from "@/components/operating";
import { PageErrorState } from "@/components/operating/PageState";
import { requirePlatformAdmin } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getPlatformAdminOverview } from "@/server/services/platform-admin.service";

import { PlatformAdminConsoleClient } from "./PlatformAdminConsoleClient";

export default async function PlatformAdminPage() {
  try {
    await requirePlatformAdmin();
    const overview = await getPlatformAdminOverview(prisma);

    return (
      <div className="space-y-5 pb-2">
        <MKPageHeader
          eyebrow="平台管理"
          title="平台管理控制台"
          description="直接管理组织、计费、上架与学习复核，不再停留在只读观测。"
          badge={
            <div className="inline-flex min-h-7 items-center rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">
              Platform Admin
            </div>
          }
        />

        <PlatformAdminConsoleClient initialOverview={overview} />
      </div>
    );
  } catch (error) {
    return (
      <div className="space-y-5 pb-2 pt-6 md:pt-8">
        <PageErrorState
          eyebrow="平台管理"
          title="平台管理端暂时无法生成"
          description={error instanceof Error ? error.message : "平台管理对象层读取失败"}
          primaryAction={{ href: "/platform", label: "回到平台观测" }}
          secondaryAction={{ href: "/dashboard", label: "回到今日" }}
        />
      </div>
    );
  }
}
