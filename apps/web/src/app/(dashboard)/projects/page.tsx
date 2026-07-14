"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
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
        eyebrow="企业世界"
        title="正在读取你的企业"
        description="AI 对企业的长期记忆。"
      />
    );
  }

  if (error) {
    return (
      <div className="space-y-5 pb-2 pt-6 md:pt-8">
        <PageErrorState
          eyebrow="企业世界"
          title="暂时不可用"
          description="先回今日判断。"
          primaryAction={{ href: "/dashboard", label: "今日判断" }}
          secondaryAction={{ href: "/profile", label: "AI认知" }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-8 pt-6 md:pt-10">
      <header className="space-y-2">
        <p className="text-[13px] tracking-[0.08em] text-[#66735E]">企业世界</p>
        <h1 className="font-display text-[32px] font-semibold leading-none tracking-[-0.04em] text-[#202124]">
          我的企业
        </h1>
        <p className="text-[14px] leading-6 text-[#6f747b]">
          AI 对企业的长期记忆。不是 CRM。
        </p>
      </header>

      {items.length === 0 ? (
        <section className="space-y-4 border-y border-[rgba(24,24,23,0.08)] py-6">
          <p className="text-[18px] text-[#202124]">还没有企业世界</p>
          <p className="text-[14px] leading-6 text-[#6f747b]">先建立，我才能开始判断。</p>
          <button
            type="button"
            onClick={() => createProjectMutation.mutate({ name: "我的企业" })}
            disabled={createProjectMutation.isPending}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-[#181817] px-5 text-[15px] font-semibold text-white disabled:opacity-60"
          >
            {createProjectMutation.isPending ? "创建中…" : "建立企业"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </section>
      ) : (
        <div className="space-y-4">
          {items.map((item) => {
            const profile = (item.profile || {}) as ProjectProfile;
            const issue = String(
              profile.currentProblemTitle ||
                profile.biggestRisk ||
                "当前议题待识别",
            );
            const aiState = String(profile.biggestRisk || item.stage || "理解中");
            return (
              <Link
                key={item.id}
                href={`/projects/${item.id}`}
                prefetch={false}
                className="block rounded-[20px] border border-[rgba(24,24,23,0.08)] bg-white p-5 no-underline transition hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-[#202124]">
                      {item.name}
                    </h2>
                    <p className="mt-1 text-[13px] text-[#6f747b]">
                      {[item.category, item.stage].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className="text-[13px] text-[#66735E]">进入 ›</span>
                </div>
                <p className="mt-4 text-[12px] tracking-[0.06em] text-[#6f747b]">AI状态</p>
                <p className="mt-1 text-[14px] leading-6 text-[#202124]">{aiState}</p>
                <p className="mt-3 text-[12px] tracking-[0.06em] text-[#6f747b]">当前议题</p>
                <p className="mt-1 text-[15px] leading-6 text-[#202124]">{issue}</p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
