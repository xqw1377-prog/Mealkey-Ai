"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  COUNCIL_PROBLEMS,
  SPEND_OFFERS,
  formatPoints,
  type SpendKind,
} from "@/lib/business-wallet";
import { buildMeetingHref } from "@/lib/meeting";

type Props = {
  projectId: string;
  /** 不直接开案时，把选择回传给父级做消耗确认 */
  onSelect?: (payload: { topic: string; spendKind: SpendKind; label: string }) => void;
};

/**
 * 决策室选题入口 — 最高价值入口不是 Agent 列表。
 */
export function CouncilProblemPicker({ projectId, onSelect }: Props) {
  const [selected, setSelected] = useState(COUNCIL_PROBLEMS[0]?.id ?? "new_store");
  const problem = COUNCIL_PROBLEMS.find((p) => p.id === selected) || COUNCIL_PROBLEMS[0];
  const offer = SPEND_OFFERS[problem.spendKind];

  const href = buildMeetingHref(projectId, problem.topic, "general", {
    autoStart: false,
  });

  return (
    <section className="space-y-5 border border-[rgba(24,24,23,0.08)] bg-white p-5 md:space-y-6 md:p-8">
      <header>
        <p className="text-[12px] tracking-[0.1em] text-[#66735E]">决策室</p>
        <h2 className="mt-2 font-display text-[22px] font-semibold tracking-[-0.03em] text-[#202124] md:text-[24px]">
          今天要解决什么？
        </h2>
      </header>

      <div className="space-y-2">
        {COUNCIL_PROBLEMS.map((item) => {
          const active = item.id === selected;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelected(item.id)}
              className={`flex min-h-12 w-full items-center gap-3 border px-4 py-3 text-left text-[15px] transition touch-manipulation active:scale-[0.99] ${
                active
                  ? "border-[#181817] bg-[#181817] text-white"
                  : "border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] text-[#202124]"
              }`}
            >
              <span
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                  active ? "border-white" : "border-[rgba(24,24,23,0.25)]"
                }`}
              >
                {active ? <span className="h-2 w-2 rounded-full bg-white" /> : null}
              </span>
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="border-t border-[rgba(24,24,23,0.08)] pt-4">
        <p className="text-[12px] tracking-[0.08em] text-[#6f747b]">预计</p>
        <p className="mt-2 font-display text-[28px] font-semibold tracking-[-0.03em] text-[#202124]">
          {formatPoints(offer.cost)}
          <span className="ml-2 text-[14px] font-normal text-[#6f747b]">点</span>
        </p>
      </div>

      {onSelect ? (
        <button
          type="button"
          onClick={() =>
            onSelect({
              topic: problem.topic,
              spendKind: problem.spendKind,
              label: problem.label,
            })
          }
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[#181817] px-5 text-[15px] font-semibold text-white touch-manipulation active:scale-[0.98]"
        >
          进入决策室
          <ArrowRight className="h-4 w-4" />
        </button>
      ) : (
        <Link
          href={href}
          prefetch={false}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[#181817] px-5 text-[15px] font-semibold text-white no-underline touch-manipulation active:scale-[0.98]"
        >
          进入决策室
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </section>
  );
}
