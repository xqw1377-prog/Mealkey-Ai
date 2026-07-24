"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * 三易（冻结 MOBILE_THREE_EASY_IA_V1）
 * 易学 · 不用说明书 · 对话开口
 * 易做 · 拇指能点完 · 去拍板
 * 易管 · 决完能跟住 · 去跟进 / 经营动态
 */

export type ThreeEasyLane = {
  id: "learn" | "do" | "manage";
  label: string;
  feel: string;
  href: string;
  cta: string;
};

export function buildThreeEasyLanes(projectId: string): ThreeEasyLane[] {
  return [
    {
      id: "learn",
      label: "易学",
      feel: "有事直接说，不用填表",
      href: `/projects/${projectId}/agent`,
      cta: "去对话",
    },
    {
      id: "do",
      label: "易做",
      feel: "一件事说清，去拍板",
      href: `/projects/${projectId}/decision-room?intake=voice`,
      cta: "去拍板",
    },
    {
      id: "manage",
      label: "易管",
      feel: "拍板后跟住执行、复盘与经营动态",
      href: `/projects/${projectId}/decisions`,
      cta: "去跟进",
    },
  ];
}

/** 紧凑三行：放在页头下，不当英雄墙 */
export function ThreeEasyHint({
  projectId,
  className = "",
}: {
  projectId: string;
  className?: string;
}) {
  const lanes = buildThreeEasyLanes(projectId);
  return (
    <nav
      aria-label="三易"
      className={`flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-[#6f747b] ${className}`}
    >
      {lanes.map((lane) => (
        <Link
          key={lane.id}
          href={lane.href}
          prefetch={false}
          className="font-medium text-[#66735E] no-underline underline-offset-2 hover:underline"
        >
          <span className="text-[#9a968e]">{lane.label}</span>
          <span className="mx-1 text-[#c5c2ba]">·</span>
          {lane.cta}
        </Link>
      ))}
    </nav>
  );
}

/** 能力页 / 我的：三易车道（L1），每条一句话 + 一个 CTA */
export function ThreeEasyLanes({
  projectId,
  className = "",
}: {
  projectId: string;
  className?: string;
}) {
  const lanes = buildThreeEasyLanes(projectId);
  return (
    <section
      aria-label="三易入口"
      className={`divide-y divide-[rgba(24,24,23,0.08)] border-y border-[rgba(24,24,23,0.08)] ${className}`}
    >
      {lanes.map((lane) => (
        <Link
          key={lane.id}
          href={lane.href}
          prefetch={false}
          className="flex min-h-14 items-center justify-between gap-3 py-3.5 no-underline touch-manipulation active:bg-[rgba(24,24,23,0.03)]"
        >
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-[0.12em] text-[#66735E]">
              {lane.label}
            </p>
            <p className="mt-1 text-[15px] font-medium leading-6 text-[#202124]">
              {lane.feel}
            </p>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-[#181817]">
            {lane.cta}
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      ))}
    </section>
  );
}
