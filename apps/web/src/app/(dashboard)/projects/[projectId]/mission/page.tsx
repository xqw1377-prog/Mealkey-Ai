"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { understandMissionGoal } from "@/lib/mission";
import {
  MKPageHeader,
  mkPageHeaderPrimaryCtaClass,
  mkPageHeaderSecondaryCtaClass,
} from "@/components/operating/MKPageHeader";
import { OpsSecondaryLinks } from "@/components/operating/OpsSecondaryLinks";
import { PageContent } from "@/components/operating/PageContent";
import { PageErrorBoundary } from "@/components/operating/PageErrorBoundary";
import { PageLoadingState } from "@/components/operating/PageState";

function MissionContent({ projectId }: { projectId: string }) {
  const searchParams = useSearchParams();
  const presetGoal = searchParams?.get("goal")?.trim() || "";
  const [goal, setGoal] = useState(presetGoal);
  const [submitted, setSubmitted] = useState(Boolean(presetGoal));

  useEffect(() => {
    if (!presetGoal) return;
    setGoal(presetGoal);
    setSubmitted(true);
  }, [presetGoal]);

  const understanding = useMemo(() => {
    if (!submitted || !goal.trim()) return null;
    try {
      return understandMissionGoal(goal);
    } catch {
      return null;
    }
  }, [submitted, goal]);

  return (
    <PageContent width="console" inset="shell" className="space-y-8">
      <MKPageHeader
        eyebrow="新议题"
        title="一句话说目标"
        description="说完进决策室，不用填表。"
        meta={
          <OpsSecondaryLinks
            projectId={projectId}
            links={[
              { href: `/projects/${projectId}/agent`, label: "回对话" },
              {
                href: `/projects/${projectId}/decision-room`,
                label: "决策室",
              },
            ]}
          />
        }
      />

      {!understanding ? (
        <section className="space-y-4 border-y border-[rgba(24,24,23,0.08)] py-6">
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={4}
            placeholder="例如：我想把湘宴做到100家店。"
            className="w-full resize-none rounded-[16px] border border-[rgba(24,24,23,0.12)] bg-white px-4 py-3 text-[16px] leading-7 text-[#202124] placeholder:text-[#9a968e] focus:outline-none focus:ring-2 focus:ring-[rgba(102,115,94,0.25)]"
          />
          <button
            type="button"
            disabled={!goal.trim()}
            onClick={() => setSubmitted(true)}
            className={mkPageHeaderPrimaryCtaClass}
          >
            <Sparkles className="h-4 w-4" />
            下一步
          </button>
        </section>
      ) : (
        <section className="space-y-6">
          <div className="space-y-2 border-y border-[rgba(24,24,23,0.08)] py-6">
            <p className="text-[11px] tracking-[0.12em] text-[#6f747b]">理解成</p>
            <h2 className="font-display text-[22px] font-semibold leading-snug tracking-[-0.02em] text-[#202124]">
              {understanding.understoodGoal}
            </h2>
          </div>

          <div>
            <p className="text-[11px] tracking-[0.12em] text-[#6f747b]">开会先谈</p>
            <ol className="mt-3 space-y-2">
              {understanding.questions.map((q, i) => (
                <li key={q} className="text-[15px] leading-7 text-[#202124]">
                  {i + 1}. {q}
                </li>
              ))}
            </ol>
          </div>

          <div>
            <p className="text-[11px] tracking-[0.12em] text-[#6f747b]">谁会到场</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {understanding.invitedExperts.map((expert) => (
                <span
                  key={expert.displayName}
                  className="rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-3 py-2 text-[13px] text-[#202124]"
                >
                  {expert.displayName}
                  <span className="ml-1 text-[#9a968e]">· {expert.duty}</span>
                </span>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
            <Link
              href={understanding.meetingHref(projectId)}
              prefetch={false}
              className={mkPageHeaderPrimaryCtaClass}
            >
              进决策室
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setGoal(understanding.rawGoal);
              }}
              className={mkPageHeaderSecondaryCtaClass}
            >
              改目标
            </button>
          </div>
        </section>
      )}
    </PageContent>
  );
}

export default function MissionPage({
  params,
}: {
  params: { projectId: string };
}) {
  return (
    <PageErrorBoundary fallbackTitle="目标页暂时打不开">
      <Suspense
        fallback={
          <PageContent width="console" inset="shell">
            <PageLoadingState
              eyebrow="新议题"
              title="正在打开…"
              description="准备一句话目标。"
              inset="shell"
            />
          </PageContent>
        }
      >
        <MissionContent projectId={params.projectId} />
      </Suspense>
    </PageErrorBoundary>
  );
}
