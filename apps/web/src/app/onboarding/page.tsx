"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { MKBrand } from "@/components/brand/MKBrand";
import {
  EMPTY_INTERVIEW_ANSWERS,
  INTERVIEW_QUESTIONS,
  answerDisplayLabel,
  buildBusinessIdentity,
  buildIdentityUnderstanding,
  type InterviewAnswers,
} from "@/lib/onboarding-interview";
import { trpc } from "@/lib/trpc";
import { useProjectStore } from "@/stores/projectStore";
import { InAppBrowserBanner } from "@/components/InAppBrowserBanner";

type Phase = "interview" | "understanding";

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#F6F3ED] px-6 py-10 text-[#171717]">
          <p className="text-sm text-[#6c685f]">正在打开…</p>
        </main>
      }
    >
      <OnboardingPageInner />
    </Suspense>
  );
}

function OnboardingPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forceBasics = searchParams?.get("force") === "1";
  const { update } = useSession();
  const setCurrentProjectId = useProjectStore((s) => s.setCurrentProjectId);
  const { data: profile, isLoading } = trpc.user.getProfile.useQuery();
  const { data: projects } = trpc.project.list.useQuery(undefined, {
    enabled: Boolean(profile),
  });

  const goAfterOnboarding = async (payload: {
    projectId?: string | null;
    redirectTo: string;
  }) => {
    setCurrentProjectId(payload.projectId ?? null);
    try {
      await update({ onboarded: true, email: profile?.email ?? undefined });
    } catch {
      // 弱 WebView 上 session.update 可能失败
    }
    router.replace(payload.redirectTo);
  };

  const completeOnboarding = trpc.user.completeOnboarding.useMutation({
    onSuccess: (payload) => {
      void goAfterOnboarding(payload);
    },
  });
  const resumeWorkspace = trpc.user.resumeWorkspace.useMutation({
    onSuccess: (payload) => {
      void goAfterOnboarding(payload);
    },
  });

  const [phase, setPhase] = useState<Phase>("interview");
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState("");
  const [answers, setAnswers] = useState<InterviewAnswers>(EMPTY_INTERVIEW_ANSWERS);

  const hasExistingWorkspace = (projects?.length ?? 0) > 0;
  const question = INTERVIEW_QUESTIONS[step];
  const understanding = useMemo(
    () => (phase === "understanding" ? buildIdentityUnderstanding(answers) : null),
    [answers, phase],
  );
  const liveIdentity = useMemo(() => {
    if (!answers.objectName && !answers.brandName) return null;
    return buildBusinessIdentity({
      ...answers,
      scope: answers.scope || "store",
      storeCountBand: answers.storeCountBand || "1",
      focus: answers.focus || "growth",
      brandName: answers.brandName || answers.objectName,
      location: answers.location || "",
      biggestProblem: answers.biggestProblem || "",
    });
  }, [answers]);

  useEffect(() => {
    // 已完成且非补填：回主入口；?force=1 允许重修基础信息
    if (profile?.onboarded && !forceBasics) {
      router.replace("/dashboard");
    }
  }, [forceBasics, profile?.onboarded, router]);

  function commitAnswer(value: string) {
    const trimmed = value.trim();
    if (!trimmed || !question) return;

    const next = { ...answers, [question.id]: trimmed } as InterviewAnswers;
    // 品牌题：若用户未改且 objectName 已填，允许自动带入
    if (question.id === "brandName" && !answers.brandName && answers.objectName) {
      // already using trimmed
    }
    if (question.id === "objectName" && !answers.brandName) {
      next.brandName = trimmed;
    }
    setAnswers(next);
    setDraft("");

    if (step < INTERVIEW_QUESTIONS.length - 1) {
      setStep((s) => s + 1);
      // 进入品牌题时预填
      const nextQ = INTERVIEW_QUESTIONS[step + 1];
      if (nextQ?.id === "brandName" && next.brandName) {
        setDraft(next.brandName);
      }
      return;
    }
    setPhase("understanding");
  }

  function handleAnswer(event: FormEvent) {
    event.preventDefault();
    commitAnswer(draft);
  }

  function handleContinue() {
    const id = buildBusinessIdentity(answers);
    completeOnboarding.mutate({
      brandName: id.brandName,
      businessType: "餐饮",
      objectName: id.objectName,
      scope: id.scope,
      city: id.city,
      district: id.district,
      address: id.address,
      storeCountBand: id.storeCountBand,
      focus: id.focus,
      decisionHorizon: id.decisionHorizon,
      storeCount: String(id.storeCountApprox),
      currentChallenge: id.biggestProblem,
      yearlyGoal: id.biggestProblem
        ? `围绕「${id.biggestProblem}」形成可验证的一年经营目标`
        : `围绕${FOCUS_LABEL_SAFE(id.focus)}形成可验证目标`,
    });
  }

  return (
    <main className="min-h-screen bg-[#F6F3ED] px-6 py-10 text-[#171717]">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <header className="space-y-4">
          <MKBrand subtitle={null} />
          <InAppBrowserBanner variant="blocking" />
          <div className="space-y-2">
            <p className="text-[12px] leading-5 tracking-[0.08em] text-[#77805F]">
              首次登录 · 基础信息
              {phase === "interview" ? " · 经营速写" : " · 确认后进入对话"}
            </p>
            <h1 className="font-display text-[28px] font-semibold leading-[1.12] tracking-[-0.05em] text-[#171717] md:text-[34px]">
              {phase === "interview"
                ? "先认识你的生意，再开始对话"
                : "基础信息已齐，可以进入对话了"}
            </h1>
            <p className="max-w-xl text-[15px] leading-[1.8] text-[#5f5b54]">
              {phase === "interview"
                ? "店名、位置、规模和当下最想解决的事——一两分钟填完，餐饮经营 AI 才知道该怎么帮你。"
                : "确认无误后进入对话。之后还能在对话里继续补充经营认知。"}
            </p>
          </div>
        </header>

        <section className="rounded-[28px] border border-[rgba(23,23,23,0.08)] bg-white p-6 shadow-[0_14px_30px_rgba(24,24,23,0.04)]">
          {isLoading ? (
            <p className="text-sm leading-7 text-[#6c685f]">正在接通…</p>
          ) : (
            <div className="space-y-5">
              {hasExistingWorkspace ? (
                <div className="rounded-[18px] border border-[rgba(102,115,94,0.16)] bg-[linear-gradient(180deg,#FBFAF7_0%,#F1F3EC_100%)] p-4">
                  <p className="text-[13px] font-medium text-[#2F3A28]">已有企业</p>
                  <p className="mt-1 text-[13px] leading-6 text-[#5f5b54]">
                    可直接进入对话，不必重答。
                  </p>
                  <button
                    type="button"
                    onClick={() => resumeWorkspace.mutate()}
                    disabled={resumeWorkspace.isPending}
                    className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[rgba(24,24,23,0.08)] bg-[#181817] px-4 py-2 text-[14px] font-medium text-white transition active:scale-[0.98]"
                  >
                    <span>{resumeWorkspace.isPending ? "进入中…" : "进入对话"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ) : null}

              {phase === "interview" && question ? (
                <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
                  <div className="space-y-5">
                    <div className="flex gap-2">
                      {INTERVIEW_QUESTIONS.map((q, index) => (
                        <span
                          key={q.id}
                          className={`h-1.5 flex-1 rounded-full ${
                            index <= step ? "bg-[#66735E]" : "bg-[rgba(24,24,23,0.08)]"
                          }`}
                        />
                      ))}
                    </div>

                    <div className="space-y-3">
                      {INTERVIEW_QUESTIONS.slice(0, step).map((q) => (
                        <div
                          key={`done-${q.id}`}
                          className="rounded-[16px] bg-[#FBFAF7] px-4 py-3"
                        >
                          <p className="text-[12px] text-[#77805F]">{q.prompt}</p>
                          <p className="mt-1 text-[15px] text-[#202124]">
                            {answerDisplayLabel(q.id, String(answers[q.id] || ""))}
                          </p>
                        </div>
                      ))}
                    </div>

                    {question.kind === "choice" ? (
                      <div className="space-y-4">
                        <p className="text-[18px] font-medium leading-7 text-[#202124]">
                          {question.prompt}
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {question.options.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => commitAnswer(opt.value)}
                              className="min-h-12 rounded-[14px] border border-[rgba(24,24,23,0.12)] bg-[#FBFAF7] px-4 text-left text-[15px] font-medium text-[#202124] transition hover:border-[#66735E] active:scale-[0.99]"
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <form className="space-y-4" onSubmit={handleAnswer}>
                        <p className="text-[18px] font-medium leading-7 text-[#202124]">
                          {question.prompt}
                        </p>
                        <input
                          autoFocus
                          type="text"
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          className="w-full rounded-[14px] border border-[rgba(24,24,23,0.12)] bg-white px-4 py-3 text-[15px] text-[#171717] outline-none transition focus:border-[#66735E]"
                          placeholder={question.placeholder}
                          required
                        />
                        <button type="submit" className="btn-primary w-full justify-center">
                          <span>
                            {step === INTERVIEW_QUESTIONS.length - 1 ? "生成认识摘要" : "继续"}
                          </span>
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </form>
                    )}
                  </div>

                  <aside className="space-y-3 rounded-[18px] border border-[rgba(24,24,23,0.06)] bg-[#FBFAF7] p-4">
                    <p className="text-[11px] tracking-[0.12em] text-[#66735E]">已了解</p>
                    {liveIdentity ? (
                      <div className="space-y-2 text-[13px] leading-6 text-[#3a3d41]">
                        <p className="font-medium text-[#202124]">
                          {liveIdentity.objectName || "…"}
                        </p>
                        <p>品牌：{liveIdentity.brandName || "待确认"}</p>
                        <p>
                          位置：
                          {liveIdentity.city
                            ? [liveIdentity.city, liveIdentity.district]
                                .filter(Boolean)
                                .join(" · ")
                            : "待补充（外部情报需要）"}
                        </p>
                        <p>
                          规模：
                          {answers.storeCountBand
                            ? answerDisplayLabel("storeCountBand", answers.storeCountBand)
                            : "…"}
                        </p>
                        {!liveIdentity.externalIntelReady ? (
                          <p className="text-[#B47C5C]">品牌与位置齐后，才能采外部信息。</p>
                        ) : (
                          <p className="text-[#66735E]">外部情报锚点已就绪。</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-[13px] leading-6 text-[#8a8f96]">
                        回答后，这里会实时更新我对你生意的认识。
                      </p>
                    )}
                  </aside>
                </div>
              ) : null}

              {phase === "understanding" && understanding ? (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <p className="text-[13px] text-[#5f5b54]">我已经初步认识你的经营：</p>
                    <h2 className="font-display text-[26px] font-semibold tracking-[-0.04em] text-[#202124]">
                      {understanding.objectName}
                    </h2>
                    <p className="text-[14px] text-[#6f747b]">
                      品牌 {understanding.brandName} · {understanding.locationLine}
                    </p>
                    <div className="rounded-[16px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-4 py-3">
                      <p className="text-[12px] tracking-[0.06em] text-[#77805F]">阶段</p>
                      <p className="mt-1 text-[15px] font-medium text-[#202124]">
                        {understanding.stageLabel}
                      </p>
                    </div>
                    <div className="rounded-[16px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-4 py-3">
                      <p className="text-[12px] tracking-[0.06em] text-[#77805F]">当前重点</p>
                      <p className="mt-1 text-[15px] font-medium text-[#202124]">
                        {understanding.focusLabel}
                      </p>
                    </div>
                    <div>
                      <p className="text-[12px] tracking-[0.06em] text-[#66735E]">
                        下一步我会重点帮你关注
                      </p>
                      <ul className="mt-2 space-y-1">
                        {understanding.watchLines.map((line) => (
                          <li key={line} className="text-[15px] text-[#202124]">
                            · {line}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {!understanding.externalIntelReady ? (
                      <p className="text-[13px] text-[#B47C5C]">
                        品牌或位置不完整时，系统不会假装懂你的区域市场。
                      </p>
                    ) : null}
                  </div>

                  {completeOnboarding.error || resumeWorkspace.error ? (
                    <div className="rounded-[14px] border border-[rgba(180,124,92,0.24)] bg-[rgba(180,124,92,0.08)] px-4 py-3 text-[13px] leading-6 text-[#8A4F31]">
                      {completeOnboarding.error?.message ||
                        resumeWorkspace.error?.message ||
                        "建立失败，请稍后重试。"}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleContinue}
                    disabled={completeOnboarding.isPending}
                    className="btn-primary w-full justify-center"
                  >
                    <span>
                      {completeOnboarding.isPending
                        ? "正在保存基础信息…"
                        : "完成并进入对话"}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function FOCUS_LABEL_SAFE(focus: string) {
  const map: Record<string, string> = {
    growth: "增长",
    profit: "利润",
    org: "组织",
    product: "产品",
    expansion: "扩张",
  };
  return map[focus] || "经营";
}
