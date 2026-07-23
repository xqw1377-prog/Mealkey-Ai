"use client";

import Link from "next/link";
import { ArrowRight, ShieldAlert, History } from "lucide-react";
import { MKPageHeader } from "@/components/operating";
import { PageEmptyState, PageErrorState, PageLoadingState } from "@/components/operating/PageState";
import { trpc } from "@/lib/trpc";

function ReportMetric({
  label,
  stars,
  width,
}: {
  label: string;
  stars: string;
  width: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3 text-[15px] leading-6 text-[#202124]">
        <span className="truncate">{label}</span>
        <span className="whitespace-nowrap font-display text-[#66735E]">{stars}</span>
      </div>
      <span className="block h-1.5 w-full overflow-hidden rounded-full bg-[rgba(102,115,94,0.12)]">
        <span className="block h-full rounded-full bg-[#66735E]" style={{ width }} />
      </span>
    </div>
  );
}

export default function ReportPage({
  params,
}: {
  params: { projectId: string };
}) {
  const { data, isLoading, error } = trpc.dashboard.getReportSnapshot.useQuery({ projectId: params.projectId });

  if (isLoading) {
    return <PageLoadingState eyebrow="项目报告" title="AI 正在整理这份报告" description="正在读取结论、依据和反方挑战。" />;
  }

  if (error) {
    return (
      <div className="space-y-5 pb-2 pt-6 md:pt-8">
        <PageErrorState
          eyebrow="项目报告"
          title="这份报告暂时无法生成"
          description="项目数据还没完全同步。先进入会议继续推进。"
          primaryAction={{ href: `/projects/${params.projectId}/advisor`, label: "进入经营会议" }}
          secondaryAction={{ href: "/projects", label: "回到世界" }}
        />
      </div>
    );
  }

  if (!data?.currentProject) {
    return (
      <div className="space-y-5 pb-2 pt-6 md:pt-8">
        <PageEmptyState
          eyebrow="项目报告"
          title="这份报告当前不可用"
          description="当前项目不可用。先回到世界重新进入。"
          primaryAction={{ href: "/projects", label: "回到世界" }}
          secondaryAction={{ href: "/dashboard", label: "回到今日" }}
        />
      </div>
    );
  }

  const project = data.currentProject;
  const report = data.report;
  const positioningBrandName = project.name;
  const positioningCategory = project.category || "待补";
  const positioningMentalPosition = report?.positioning || "待补";

  if (!report?.latestReport) {
    return (
      <div className="space-y-5 pb-2">
        <MKPageHeader
          eyebrow="项目报告"
          title="项目报告"
          description="结论、依据、反方一次看完。"
          badge={
            <div className="inline-flex min-h-7 items-center rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">
              暂无报告
            </div>
          }
        />

        <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-[linear-gradient(180deg,#fbfaf7_0%,#eef1ea_100%)] p-5 shadow-[0_14px_30px_rgba(24,24,23,0.04)]">
          <p className="text-[13px] leading-5 tracking-[0.01em] text-[#66735E]">暂无决策资产</p>
          <p className="mt-2 text-[22px] leading-[1.3] tracking-[-0.03em] text-[#202124]">
            当前项目还没有形成正式报告
          </p>
          <p className="mt-3 text-[14px] leading-[1.7] text-[#6f747b]">
            先进入经营会议，形成第一次结构化判断。
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Link
              href={`/projects/${project.id}/advisor`}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[#181817] px-4 text-[15px] font-semibold text-white no-underline transition hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <span>进入会议</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={`/projects/${project.id}`}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#F5F3EE] px-4 text-[15px] font-semibold text-[#202124] no-underline transition hover:-translate-y-0.5 active:scale-[0.98]"
            >
              <span>回到世界</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-2">
      <MKPageHeader
        eyebrow="项目报告"
        title="项目报告"
        description="结论、依据、反方一次看完。"
        badge={
          <div className="inline-flex min-h-7 items-center rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">
            {report.reportTypeLabel}
          </div>
        }
      />

      <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-[linear-gradient(180deg,#fbfaf7_0%,#eef1ea_100%)] p-4 shadow-[0_14px_30px_rgba(24,24,23,0.04)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] leading-5 tracking-[0.01em] text-[#66735E]">结论</p>
            <h2 className="mt-1 text-[18px] font-semibold leading-[1.25] tracking-[-0.02em] text-[#202124]">本次结论</h2>
          </div>
          <p className="text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">结论先行</p>
        </div>

        <div className="mt-4 flex items-end gap-4 max-[420px]:flex-col max-[420px]:items-start">
          <div className="rounded-[18px] bg-white/80 p-3">
            <p className="text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">经营信心</p>
            <div className="font-display text-[44px] leading-[0.92] tracking-[-0.05em] text-[#202124] md:text-[60px]">{report.score}</div>
          </div>

          <div className="min-w-0">
            <p className="text-[17px] leading-[1.42] tracking-[-0.02em] text-[#202124]">
              建议：{report.conclusion}
            </p>
            <p className="mt-2 text-[14px] leading-[1.7] tracking-[-0.02em] text-[#202124]">
              心智位置：{positioningMentalPosition}
            </p>
            <p className="mt-2 text-[14px] leading-[1.7] tracking-[-0.02em] text-[#6f747b]">
              最大风险：{report.riskTitle}
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[16px] border border-[rgba(24,24,23,0.08)] bg-white px-4 py-3">
            <p className="text-[12px] leading-5 tracking-[0.01em] text-[#6f747b]">品牌名</p>
            <p className="mt-1 text-[15px] leading-6 text-[#181817]">{positioningBrandName}</p>
          </div>
          <div className="rounded-[16px] border border-[rgba(24,24,23,0.08)] bg-white px-4 py-3">
            <p className="text-[12px] leading-5 tracking-[0.01em] text-[#6f747b]">品类</p>
            <p className="mt-1 text-[15px] leading-6 text-[#181817]">{positioningCategory}</p>
          </div>
          <div className="rounded-[16px] border border-[rgba(24,24,23,0.08)] bg-white px-4 py-3">
            <p className="text-[12px] leading-5 tracking-[0.01em] text-[#6f747b]">心智位置</p>
            <p className="mt-1 text-[15px] leading-6 text-[#181817]">{positioningMentalPosition}</p>
          </div>
          <div className="rounded-[16px] border border-[rgba(24,24,23,0.08)] bg-white px-4 py-3">
            <p className="text-[12px] leading-5 tracking-[0.01em] text-[#6f747b]">阶段</p>
            <p className="mt-1 text-[15px] leading-6 text-[#181817]">{project.stage || "待判断"}</p>
          </div>
        </div>
      </section>

      <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_14px_28px_rgba(24,24,23,0.04)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] leading-5 tracking-[0.01em] text-[#66735E]">依据</p>
            <h2 className="mt-1 text-[18px] font-semibold leading-[1.25] tracking-[-0.02em] text-[#202124]">判断依据</h2>
          </div>
          <p className="text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">四项拆解</p>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {report.metrics.map((item) => (
            <ReportMetric key={item.label} label={item.label} stars={item.stars} width={item.width} />
          ))}
        </div>
      </section>

      <section className="rounded-[22px] border border-[rgba(24,24,23,0.14)] bg-[linear-gradient(180deg,#ffffff_0%,rgba(180,124,92,0.12)_100%)] p-4 shadow-[0_14px_28px_rgba(24,24,23,0.04)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[13px] leading-5 tracking-[0.01em] text-[#66735E]">反方</p>
            <h2 className="mt-1 text-[18px] font-semibold leading-[1.25] tracking-[-0.02em] text-[#202124]">反方挑战</h2>
          </div>
          <ShieldAlert className="h-5 w-5 text-[#B47C5C]" />
        </div>

        <div className="mt-4 border-t border-[rgba(24,24,23,0.08)] pt-4">
          <p className="text-[18px] leading-[1.25] tracking-[-0.02em] text-[#202124]">如果失败</p>
          <p className="mt-2 text-[14px] leading-[1.7] tracking-[-0.02em] text-[#202124]">
            最可能原因：{report.counterArgument}
          </p>
          <p className="mt-2 text-[14px] leading-[1.7] text-[#B47C5C]">建议验证：{report.validationAction}</p>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Link
            href={`/projects/${project.id}/score`}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#F5F3EE] px-4 text-[15px] font-semibold text-[#202124] no-underline transition hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <span>查看体检</span>
            <ShieldAlert className="h-4 w-4" />
          </Link>
          <Link
            href={`/projects/${project.id}/decisions`}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#F5F3EE] px-4 text-[15px] font-semibold text-[#202124] no-underline transition hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <History className="h-4 w-4" />
            <span>决策历史</span>
          </Link>
          <Link
            href={`/projects/${project.id}/advisor`}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[#181817] px-4 text-[15px] font-semibold text-white no-underline transition hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <span>进入会议</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
