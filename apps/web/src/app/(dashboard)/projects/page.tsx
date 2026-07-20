"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { PageContent } from "@/components/operating/PageContent";
import { PageErrorState, PageLoadingState } from "@/components/operating/PageState";
import { trpc } from "@/lib/trpc";
import type { ProjectProfile } from "@/types/operating";

export default function ProjectsPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { data: projects, isLoading, error } = trpc.project.list.useQuery();
  const createProjectMutation = trpc.project.create.useMutation({
    onSuccess: async (project) => {
      await utils.project.list.invalidate();
      router.push(`/projects/${project.id}`);
    },
  });

  const items = projects || [];

  if (isLoading) {
    return (
      <PageLoadingState
        eyebrow="企业"
        title="正在打开…"
        description="读取你的企业。"
      />
    );
  }

  if (error) {
    return (
      <PageContent width="narrow" inset="shell">
        <PageErrorState
          eyebrow="企业"
          title="暂时打不开"
          description="先回今日。"
          primaryAction={{ href: "/dashboard", label: "回今日" }}
          secondaryAction={{ href: "/profile", label: "成长" }}
        />
      </PageContent>
    );
  }

  return (
    <PageContent width="narrow" inset="shell" className="space-y-8">
      <header className="space-y-2">
        <p className="text-[11px] tracking-[0.14em] text-[#66735E]">企业</p>
        <h1 className="font-display text-[30px] font-semibold leading-none tracking-[-0.04em] text-[#202124] md:text-[34px]">
          我的企业
        </h1>
        <p className="text-[14px] leading-6 text-[#6f747b]">
          选一家进入今日与会议。
        </p>
      </header>

      {items.length === 0 ? (
        <section className="space-y-4 border-y border-[rgba(24,24,23,0.08)] py-6">
          <p className="text-[18px] font-semibold text-[#202124]">还没有企业</p>
          <p className="text-[14px] leading-6 text-[#6f747b]">
            先创建，才能开始用。
          </p>
          <button
            type="button"
            onClick={() => createProjectMutation.mutate({ name: "我的企业" })}
            disabled={createProjectMutation.isPending}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-[#181817] px-5 text-[15px] font-semibold text-white touch-manipulation active:scale-[0.98] disabled:opacity-60"
          >
            {createProjectMutation.isPending ? "创建中…" : "创建企业"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      ) : (
        <div className="divide-y divide-[rgba(24,24,23,0.08)] border-y border-[rgba(24,24,23,0.08)]">
          {items.map((item) => {
            const profile = (item.profile || {}) as ProjectProfile;
            const issue = String(
              profile.currentProblemTitle ||
                profile.biggestRisk ||
                "议题待识别",
            );
            return (
              <Link
                key={item.id}
                href={`/projects/${item.id}`}
                prefetch={false}
                className="block py-5 no-underline touch-manipulation active:bg-[rgba(24,24,23,0.03)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-[20px] font-semibold tracking-[-0.02em] text-[#202124]">
                      {item.name}
                    </h2>
                    <p className="mt-1 text-[13px] text-[#6f747b]">
                      {[item.category, item.stage].filter(Boolean).join(" · ") ||
                        "餐饮"}
                    </p>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-0.5 pt-1 text-[13px] font-medium text-[#66735E]">
                    进入
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
                <p className="mt-3 text-[11px] tracking-[0.1em] text-[#6f747b]">
                  当前议题
                </p>
                <p className="mt-1 text-[15px] leading-6 text-[#202124]">
                  {issue}
                </p>
              </Link>
            );
          })}
        </div>
      )}

      {items.length > 0 ? (
        <button
          type="button"
          onClick={() => createProjectMutation.mutate({ name: "新企业" })}
          disabled={createProjectMutation.isPending}
          className="inline-flex min-h-11 items-center justify-center gap-1 text-[14px] font-medium text-[#66735E] underline-offset-4 touch-manipulation hover:underline disabled:opacity-60"
        >
          {createProjectMutation.isPending ? "创建中…" : "再创建一家"}
        </button>
      ) : null}
    </PageContent>
  );
}
