"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buildMeetingHref, detectDepartmentFromTopic } from "@/lib/meeting";
import type { ProjectItem } from "@/types/operating";

type DashboardHomeData = {
  todayLabel: string;
  ownerName: string;
  projectStatus: string;
  homeMode: string;
  biggestRisk: string;
  currentProblemTitle: string;
  dailyJudgement: string;
  dailyRecommendation: string;
  dailyObservation: string;
  dailyDiagnosis: string;
  brainChanges: Array<{
    label: string;
    trend: string;
    reason: string;
  }>;
  pendingReviewItems?: Array<{
    title: string;
    conclusion: string;
    status: string;
  }>;
  decisionTimeline?: Array<{
    title: string;
    conclusion: string;
  }>;
  growthPlan?: {
    day30: string;
    day60: string;
    day90: string;
    startedAt: string;
    decisionSummary: string;
    horizonDays: number;
    daysRemaining: number;
  } | null;
  lastMeetingDecision?: {
    id: string;
    judgement: string;
    problem: string;
  } | null;
};

function statusTone(label: string): string {
  if (/待|不足|风险|弱/.test(label)) return "text-[#B47C5C]";
  if (/增长|强|稳定|完成|↑/.test(label)) return "text-[#66735E]";
  return "text-[#202124]";
}

export function DashboardPage({
  currentProject,
  home,
}: {
  currentProject?: ProjectItem | null;
  home?: DashboardHomeData | null;
}) {
  if (!currentProject || !home) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 pb-4 pt-8">
        <p className="text-[13px] tracking-[0.08em] text-[#66735E]">Founder OS</p>
        <h1 className="font-display text-[32px] font-semibold leading-tight tracking-[-0.04em] text-[#202124]">
          今日顾问简报
        </h1>
        <p className="text-[15px] leading-7 text-[#6f747b]">
          先建立企业，我才能开始关注你的生意。
        </p>
        <Link
          href="/onboarding"
          prefetch={false}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-[#181817] px-5 text-[15px] font-semibold text-white no-underline"
        >
          创建企业并开始
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  const companion = Boolean(home.growthPlan);
  const topic = home.currentProblemTitle || home.biggestRisk || "当前最重要的经营问题";
  const advice =
    home.dailyRecommendation ||
    home.dailyJudgement ||
    "召开一次评估会议，把分歧压成可验证决策。";
  const department = detectDepartmentFromTopic(topic);
  const meetingHref = buildMeetingHref(currentProject.id, topic, department);
  const reasons = (home.brainChanges ?? []).slice(0, 3);
  const validating = home.pendingReviewItems?.[0];

  const enterpriseStatus = [
    {
      label: "品牌",
      value: /定位|品牌|心智/.test(topic) ? "↑" : companion ? "↑" : "稳定",
    },
    {
      label: "组织",
      value: /组织|复制|加盟|扩张|股权/.test(topic) ? "→" : companion ? "→" : home.projectStatus || "推进中",
    },
    {
      label: "市场",
      value: /市场|增长|窗口/.test(topic) ? "↑" : companion ? "↑" : "观察中",
    },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-8 pt-6 md:pt-10">
      <header className="space-y-3">
        <p className="text-[13px] tracking-[0.08em] text-[#66735E]">Founder OS</p>
        <h1 className="font-display text-[28px] font-semibold leading-tight tracking-[-0.04em] text-[#202124] md:text-[34px]">
          早上好，{home.ownerName}
        </h1>
        {companion && home.growthPlan ? (
          <p className="text-[16px] leading-7 text-[#202124]">
            距离你的战略节点还有
            <span className="mx-1 font-semibold text-[#66735E]">{home.growthPlan.daysRemaining}</span>
            天。
          </p>
        ) : (
          <p className="text-[15px] leading-7 text-[#6f747b]">
            我正在关注你的企业：
            <span className="ml-1 font-medium text-[#202124]">{currentProject.name}</span>
          </p>
        )}
      </header>

      {companion && home.growthPlan ? (
        <section className="space-y-4 border-y border-[rgba(24,24,23,0.08)] py-6">
          <p className="text-[12px] tracking-[0.08em] text-[#6f747b]">上次我们决定</p>
          <h2 className="font-display text-[22px] font-semibold leading-[1.35] tracking-[-0.03em] text-[#202124] md:text-[26px]">
            {home.growthPlan.decisionSummary || home.lastMeetingDecision?.judgement}
          </h2>

          <div>
            <p className="text-[12px] tracking-[0.08em] text-[#6f747b]">90天成长计划</p>
            <ul className="mt-2 space-y-2 text-[15px] leading-7 text-[#202124]">
              <li>第30天：{home.growthPlan.day30}</li>
              <li>第60天：{home.growthPlan.day60}</li>
              <li>第90天：{home.growthPlan.day90}</li>
            </ul>
          </div>

          {validating ? (
            <p className="rounded-[14px] bg-[#FBFAF7] px-4 py-3 text-[13px] leading-6 text-[#B47C5C]">
              需要关注：{validating.title}
              {validating.conclusion ? ` · ${validating.conclusion}` : ""}
            </p>
          ) : null}

          <Link
            href={`/projects/${currentProject.id}/decisions`}
            prefetch={false}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-white px-4 text-[14px] font-medium text-[#202124] no-underline"
          >
            回填验证结果
          </Link>
          <Link
            href={meetingHref}
            prefetch={false}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-[#181817] px-5 text-[15px] font-semibold text-white no-underline"
          >
            召开跟进会议
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      ) : (
        <section className="space-y-4 border-y border-[rgba(24,24,23,0.08)] py-6">
          <p className="text-[12px] tracking-[0.08em] text-[#6f747b]">今天建议讨论</p>
          <h2 className="font-display text-[24px] font-semibold leading-[1.3] tracking-[-0.03em] text-[#202124] md:text-[30px]">
            {topic}
          </h2>

          <div>
            <p className="text-[12px] tracking-[0.08em] text-[#6f747b]">原因</p>
            <ul className="mt-2 space-y-2">
              {reasons.length > 0 ? (
                reasons.map((item) => (
                  <li key={`${item.label}-${item.trend}`} className="text-[15px] leading-7 text-[#202124]">
                    {item.trend === "need" || item.trend === "down" ? "⚠ " : "✓ "}
                    {item.label}
                    {item.reason ? <span className="text-[#6f747b]"> · {item.reason}</span> : null}
                  </li>
                ))
              ) : (
                <>
                  <li className="text-[15px] leading-7 text-[#202124]">
                    ✓ {home.dailyObservation || "已读取企业上下文"}
                  </li>
                  <li className="text-[15px] leading-7 text-[#202124]">
                    ⚠ {home.dailyDiagnosis || home.biggestRisk}
                  </li>
                </>
              )}
            </ul>
          </div>

          <div>
            <p className="text-[12px] tracking-[0.08em] text-[#B47C5C]">AI建议</p>
            <p className="mt-2 text-[17px] leading-[1.6] text-[#202124]">{advice}</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              href={meetingHref}
              prefetch={false}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-[#181817] px-5 text-[15px] font-semibold text-white no-underline"
            >
              开始会议
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={`/projects/${currentProject.id}/mission`}
              prefetch={false}
              className="inline-flex min-h-11 items-center justify-center text-[13px] font-medium text-[#66735E] no-underline"
            >
              或用一句话发起新议题 →
            </Link>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <p className="text-[12px] tracking-[0.08em] text-[#6f747b]">目前</p>
        <div className="grid grid-cols-3 gap-3">
          {enterpriseStatus.map((item) => (
            <div
              key={item.label}
              className="rounded-[16px] border border-[rgba(24,24,23,0.08)] bg-white px-3 py-3"
            >
              <p className="text-[12px] text-[#6f747b]">{item.label}</p>
              <p className={`mt-1 text-[14px] font-medium ${statusTone(item.value)}`}>{item.value}</p>
            </div>
          ))}
        </div>
        <Link
          href={`/projects/${currentProject.id}`}
          prefetch={false}
          className="inline-flex pt-1 text-[13px] font-medium text-[#66735E] no-underline"
        >
          查看企业世界 →
        </Link>
      </section>
    </div>
  );
}
