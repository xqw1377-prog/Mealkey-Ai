"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  MKPageHeader,
  mkPageHeaderPrimaryCtaClass,
  mkPageHeaderSecondaryCtaClass,
} from "@/components/operating/MKPageHeader";
import { OpsSecondaryLinks } from "@/components/operating/OpsSecondaryLinks";
import { PageContent } from "@/components/operating/PageContent";
import { useProjectStore } from "@/stores/projectStore";
import { trpc } from "@/lib/trpc";

/** 无项目时的能力入口占位 */
export default function CapabilityIndexPage() {
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const { data: projects } = trpc.project.list.useQuery();
  const fallbackId = currentProjectId || projects?.[0]?.id;

  if (fallbackId) {
    return (
      <PageContent width="narrow" inset="shell" className="space-y-6 py-10">
        <MKPageHeader
          eyebrow="能力"
          title="能力"
          description="打开当前企业的能力一览。"
          meta={
            <OpsSecondaryLinks
              projectId={fallbackId}
              links={[
                { href: `/projects/${fallbackId}/agent`, label: "回对话" },
                { href: "/dashboard?radar=1", label: "经营动态" },
              ]}
            />
          }
        >
          <Link
            href={`/projects/${fallbackId}/capability`}
            prefetch={false}
            className={mkPageHeaderPrimaryCtaClass}
          >
            打开
            <ArrowRight className="h-4 w-4" />
          </Link>
        </MKPageHeader>
      </PageContent>
    );
  }

  return (
    <PageContent width="narrow" inset="shell" className="space-y-6 py-10">
      <MKPageHeader
        eyebrow="能力"
        title="能力"
        description="先创建企业，再看能力短板与决策跟进。"
        meta={
          <OpsSecondaryLinks
            links={[{ href: "/dashboard?radar=1", label: "经营动态" }]}
          />
        }
      >
        <div className="flex flex-wrap gap-3">
          <Link
            href="/onboarding"
            prefetch={false}
            className={mkPageHeaderPrimaryCtaClass}
          >
            创建企业
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/dashboard?radar=1"
            prefetch={false}
            className={mkPageHeaderSecondaryCtaClass}
          >
            经营动态
          </Link>
        </div>
      </MKPageHeader>
    </PageContent>
  );
}
