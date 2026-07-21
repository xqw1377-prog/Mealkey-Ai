"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
      <PageContent width="narrow" inset="shell" className="py-16 text-center">
        <p className="text-[12px] tracking-[0.14em] text-[#66735E]">能力</p>
        <h1 className="mt-3 font-display text-[28px] font-semibold text-[#202124]">
          能力
        </h1>
        <Link
          href={`/projects/${fallbackId}/capability`}
          prefetch={false}
          className="mt-6 inline-flex min-h-12 items-center gap-2 bg-[#181817] px-5 text-[15px] font-semibold text-white no-underline"
        >
          打开
          <ArrowRight className="h-4 w-4" />
        </Link>
      </PageContent>
    );
  }

  return (
    <PageContent width="narrow" inset="shell" className="space-y-4 py-16">
      <p className="text-[12px] tracking-[0.14em] text-[#66735E]">能力</p>
      <h1 className="font-display text-[32px] font-semibold tracking-[-0.04em] text-[#202124]">
        能力
      </h1>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/onboarding"
          prefetch={false}
          className="inline-flex min-h-12 items-center gap-2 bg-[#181817] px-5 text-[15px] font-semibold text-white no-underline"
        >
          创建企业
          <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/dashboard"
          prefetch={false}
          className="inline-flex min-h-12 items-center gap-2 border border-[rgba(24,24,23,0.08)] bg-white px-5 text-[15px] font-medium text-[#202124] no-underline"
        >
          今日
        </Link>
      </div>
    </PageContent>
  );
}
