"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, History } from "lucide-react";
import { BrandSwitcher } from "@/components/operating/BrandSwitcher";
import type { ExpertSeat } from "@/lib/meeting";
import type { DepartmentBoardConfig } from "@/lib/department-board";

type DepartmentBoardShellProps = {
  board: DepartmentBoardConfig;
  projectId: string;
  meetingHref: string;
  issue: string;
  judgement: string;
  experts: ExpertSeat[];
  children?: ReactNode;
  siblingLinks?: Array<{ href: string; label: string }>;
};

/**
 * 四部门看板统一壳：部门名 + 当前议题 + 判断 + 专家席 + 唯一主 CTA（进会议）
 */
export function DepartmentBoardShell({
  board,
  projectId,
  meetingHref,
  issue,
  judgement,
  experts,
  children,
  siblingLinks,
}: DepartmentBoardShellProps) {
  return (
    <div className="space-y-5">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] tracking-[0.08em] text-[#66735E]">{board.label}</p>
          <div className="flex flex-wrap items-center gap-2">
            <BrandSwitcher projectId={projectId} />
            <Link
              href={`/projects/${projectId}/capability`}
              prefetch={false}
              className="inline-flex min-h-11 items-center border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[13px] font-medium text-[#66735E] no-underline touch-manipulation"
            >
              能力
            </Link>
            <Link
              href={`/projects/${projectId}/decisions`}
              prefetch={false}
              className="inline-flex min-h-11 items-center gap-1 border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[13px] font-medium text-[#202124] no-underline touch-manipulation"
            >
              <History className="h-3.5 w-3.5" />
              行动
            </Link>
          </div>
        </div>
        <h1 className="font-display text-[28px] font-semibold leading-[1.15] tracking-[-0.04em] text-[#202124] md:text-[36px]">
          {board.title}
        </h1>
        <p className="max-w-2xl text-[15px] leading-7 text-[#6f747b]">{board.subtitle}</p>
      </header>

      <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-[linear-gradient(180deg,#fbfaf7_0%,#eef1ea_100%)] p-4 md:p-5">
        <p className="text-[12px] tracking-[0.08em] text-[#6f747b]">现在谈</p>
        <h2 className="mt-2 text-[20px] font-semibold leading-snug tracking-[-0.02em] text-[#202124] md:text-[24px]">
          {issue}
        </h2>
        <p className="mt-3 text-[12px] tracking-[0.08em] text-[#B47C5C]">当前看法</p>
        <p className="mt-1 text-[16px] leading-[1.65] text-[#202124] md:text-[17px]">{judgement}</p>

        <div className="mt-4">
          <p className="text-[12px] tracking-[0.06em] text-[#6f747b]">谁会发言</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {experts.map((expert) => (
              <span
                key={expert.roleId}
                className="inline-flex min-h-10 items-center rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3.5 text-[13px] text-[#202124]"
              >
                {expert.displayName}
                <span className="ml-1 text-[#9a968e]">· {expert.duty}</span>
              </span>
            ))}
          </div>
        </div>

        <Link
          href={meetingHref}
          prefetch={false}
          className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[#181817] px-5 text-[15px] font-semibold text-white no-underline transition touch-manipulation active:scale-[0.98] sm:w-auto"
        >
          {board.meetingCta}
          <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="mt-3 text-[12px] leading-5 text-[#9a968e]">
          结论在会议里出；下面只补事实。
        </p>
      </section>

      {siblingLinks && siblingLinks.length > 0 ? (
        <div className="flex flex-wrap gap-2 text-[13px]">
          {siblingLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              prefetch={false}
              className="inline-flex min-h-11 items-center border border-[rgba(24,24,23,0.08)] bg-white px-3 font-medium text-[#66735E] no-underline touch-manipulation"
            >
              {link.label} →
            </Link>
          ))}
        </div>
      ) : null}

      {children}
    </div>
  );
}
