"use client";

import Link from "next/link";
import { ArrowRight, Gavel, Users } from "lucide-react";

type Props = {
  projectId: string;
  onChooseConsulting: () => void;
};

/**
 * 选题大厅：专业咨询（研究）× 决策室（拍板）
 */
export function MeetingHub({ projectId, onChooseConsulting }: Props) {
  return (
    <section className="space-y-5 border border-[rgba(24,24,23,0.08)] bg-white p-5 md:space-y-6 md:p-8">
      <header>
        <p className="text-[12px] tracking-[0.1em] text-[#66735E]">选题</p>
        <h2 className="mt-2 font-display text-[24px] font-semibold tracking-[-0.03em] text-[#202124] md:text-[26px]">
          先研究，还是直接拍板？
        </h2>
        <p className="mt-2 max-w-xl text-[14px] leading-6 text-[#6f747b]">
          选一条路走完；拍板只在决策室。
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2">
        <button
          type="button"
          onClick={onChooseConsulting}
          className="group flex min-h-[7.5rem] flex-col items-start border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] p-5 text-left transition touch-manipulation active:scale-[0.99] hover:border-[#181817]"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center border border-[rgba(24,24,23,0.1)] bg-white text-[#181817]">
            <Users className="h-4 w-4" />
          </span>
          <span className="mt-4 font-display text-[20px] font-semibold tracking-[-0.02em] text-[#202124]">
            专业咨询
          </span>
          <span className="mt-2 text-[13px] leading-6 text-[#6f747b]">
            品牌 / 市场 / 商业 / 组织 — 把问题谈透。
          </span>
          <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-[#181817]">
            去选题
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </span>
        </button>

        <Link
          href={`/projects/${projectId}/decision-room`}
          prefetch={false}
          className="group flex min-h-[7.5rem] flex-col items-start border border-[rgba(24,24,23,0.08)] bg-[#181817] p-5 text-left text-white no-underline transition touch-manipulation active:scale-[0.99] hover:bg-[#2a2a28]"
        >
          <span className="inline-flex h-9 w-9 items-center justify-center border border-white/20 bg-white/10">
            <Gavel className="h-4 w-4" />
          </span>
          <span className="mt-4 font-display text-[20px] font-semibold tracking-[-0.02em]">
            决策室
          </span>
          <span className="mt-2 text-[13px] leading-6 text-white/70">
            重大事项或专项会，直接拍板。
          </span>
          <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold">
            去拍板
            <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
          </span>
        </Link>
      </div>
    </section>
  );
}
