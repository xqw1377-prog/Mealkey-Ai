"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { understandMissionGoal } from "@/lib/mission";

export default function MissionPage({
  params,
}: {
  params: { projectId: string };
}) {
  const searchParams = useSearchParams();
  const presetGoal = searchParams?.get("goal")?.trim() || "";
  const [goal, setGoal] = useState(presetGoal);
  const [submitted, setSubmitted] = useState(Boolean(presetGoal));

  useEffect(() => {
    if (!presetGoal) return;
    setGoal(presetGoal);
    setSubmitted(true);
  }, [presetGoal]);

  const understanding = useMemo(
    () => (submitted && goal.trim() ? understandMissionGoal(goal) : null),
    [submitted, goal],
  );

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-10 pt-6 md:pt-10">
      <header className="space-y-2">
        <p className="text-[13px] tracking-[0.08em] text-[#66735E]">发起商业议题</p>
        <h1 className="font-display text-[30px] font-semibold leading-none tracking-[-0.04em] text-[#202124]">
          用一句话说目标
        </h1>
        <p className="text-[15px] leading-7 text-[#6f747b]">
          不必选顾问、不必填表单。你说目标，我组织会议。
        </p>
      </header>

      {!understanding ? (
        <section className="space-y-4">
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={4}
            placeholder="例如：我想把湘宴做到100家店。"
            className="w-full resize-none rounded-[18px] border border-[rgba(24,24,23,0.08)] bg-white px-4 py-3 text-[16px] leading-7 text-[#202124] placeholder:text-[#9a968e] focus:outline-none focus:ring-2 focus:ring-[rgba(102,115,94,0.25)]"
          />
          <button
            type="button"
            disabled={!goal.trim()}
            onClick={() => setSubmitted(true)}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-[#181817] px-5 text-[15px] font-semibold text-white disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            让我理解这个目标
          </button>
          <Link
            href={`/projects/${params.projectId}`}
            prefetch={false}
            className="inline-flex text-[13px] text-[#66735E] no-underline"
          >
            返回企业世界
          </Link>
        </section>
      ) : (
        <section className="space-y-6">
          <div className="space-y-2 border-y border-[rgba(24,24,23,0.08)] py-6">
            <p className="text-[12px] tracking-[0.08em] text-[#6f747b]">我理解你的目标</p>
            <h2 className="text-[22px] font-semibold leading-snug tracking-[-0.02em] text-[#202124]">
              {understanding.understoodGoal}
            </h2>
          </div>

          <div>
            <p className="text-[12px] tracking-[0.08em] text-[#6f747b]">我建议先解决三个问题</p>
            <ol className="mt-3 space-y-2">
              {understanding.questions.map((q, i) => (
                <li key={q} className="text-[15px] leading-7 text-[#202124]">
                  {i + 1}. {q}
                </li>
              ))}
            </ol>
          </div>

          <div>
            <p className="text-[12px] tracking-[0.08em] text-[#6f747b]">我准备邀请</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {understanding.invitedExperts.map((expert) => (
                <span
                  key={expert.displayName}
                  className="rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-3 py-2 text-[13px] text-[#202124]"
                >
                  {expert.displayName}
                  <span className="ml-1 text-[#9a968e]">· {expert.duty}</span>
                </span>
              ))}
            </div>
            <p className="mt-3 text-[14px] leading-6 text-[#6f747b]">
              这个问题需要一次战略评审会议。
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={understanding.meetingHref(params.projectId)}
              prefetch={false}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-[#181817] px-5 text-[15px] font-semibold text-white no-underline"
            >
              开始会议
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setGoal(understanding.rawGoal);
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-white px-4 text-[14px] font-medium text-[#202124]"
            >
              调整目标
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
