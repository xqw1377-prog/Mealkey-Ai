"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useSession } from "next-auth/react";
import { MKBrand } from "@/components/brand/MKBrand";
import {
  INTERVIEW_QUESTIONS,
  buildEnterpriseUnderstanding,
  type InterviewAnswers,
} from "@/lib/onboarding-interview";
import { trpc } from "@/lib/trpc";
import { useProjectStore } from "@/stores/projectStore";

type Phase = "interview" | "understanding";

export default function OnboardingPage() {
  const router = useRouter();
  const { update } = useSession();
  const setCurrentProjectId = useProjectStore((s) => s.setCurrentProjectId);
  const { data: profile, isLoading } = trpc.user.getProfile.useQuery();
  const { data: projects } = trpc.project.list.useQuery(undefined, {
    enabled: Boolean(profile),
  });
  const completeOnboarding = trpc.user.completeOnboarding.useMutation({
    onSuccess: async (payload) => {
      setCurrentProjectId(payload.projectId ?? null);
      await update({ onboarded: true, email: profile?.email ?? undefined });
      router.push(payload.redirectTo);
      router.refresh();
    },
  });
  const resumeWorkspace = trpc.user.resumeWorkspace.useMutation({
    onSuccess: async (payload) => {
      setCurrentProjectId(payload.projectId ?? null);
      await update({ onboarded: true, email: profile?.email ?? undefined });
      router.push(payload.redirectTo);
      router.refresh();
    },
  });

  const [phase, setPhase] = useState<Phase>("interview");
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState("");
  const [answers, setAnswers] = useState<InterviewAnswers>({
    brandName: "",
    businessType: "",
    storeCount: "",
    biggestProblem: "",
  });

  const hasExistingWorkspace = (projects?.length ?? 0) > 0;
  const question = INTERVIEW_QUESTIONS[step];
  const understanding = useMemo(
    () => (phase === "understanding" ? buildEnterpriseUnderstanding(answers) : null),
    [answers, phase],
  );

  useEffect(() => {
    if (profile?.onboarded) {
      router.replace("/dashboard");
    }
  }, [profile?.onboarded, router]);

  function handleAnswer(event: FormEvent) {
    event.preventDefault();
    const value = draft.trim();
    if (!value || !question) return;

    const next = { ...answers, [question.id]: value };
    setAnswers(next);
    setDraft("");

    if (step < INTERVIEW_QUESTIONS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    setPhase("understanding");
  }

  function handleContinue() {
    completeOnboarding.mutate({
      brandName: answers.brandName,
      businessType: answers.businessType,
      storeCount: answers.storeCount,
      currentChallenge: answers.biggestProblem,
      yearlyGoal: answers.biggestProblem,
    });
  }

  return (
    <main className="min-h-screen bg-[#F6F3ED] px-6 py-10 text-[#171717]">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
        <header className="space-y-4">
          <MKBrand subtitle={null} />
          <div className="space-y-2">
            <p className="text-[12px] leading-5 tracking-[0.08em] text-[#77805F]">企业顾问助手</p>
            <h1 className="font-display text-[28px] font-semibold leading-[1.12] tracking-[-0.05em] text-[#171717] md:text-[34px]">
              {phase === "interview" ? "先让我了解你的企业" : "我对你的企业有了初步理解"}
            </h1>
            <p className="max-w-xl text-[15px] leading-[1.8] text-[#5f5b54]">
              {phase === "interview"
                ? "不是填表。四个问题，建立第一版企业关系。"
                : "这是第一次判断。接下来我们把它变成一次战略会议。"}
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
                  <p className="text-[13px] font-medium text-[#2F3A28]">检测到已有企业世界</p>
                  <p className="mt-1 text-[13px] leading-6 text-[#5f5b54]">可以直接恢复，不必重新访谈。</p>
                  <button
                    type="button"
                    onClick={() => resumeWorkspace.mutate()}
                    disabled={resumeWorkspace.isPending}
                    className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[rgba(24,24,23,0.08)] bg-[#181817] px-4 py-2 text-[14px] font-medium text-white transition active:scale-[0.98]"
                  >
                    <span>{resumeWorkspace.isPending ? "正在恢复…" : "直接进入"}</span>
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              ) : null}

              {phase === "interview" && question ? (
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
                      <div key={`done-${q.id}`} className="rounded-[16px] bg-[#FBFAF7] px-4 py-3">
                        <p className="text-[12px] text-[#77805F]">{q.prompt}</p>
                        <p className="mt-1 text-[15px] text-[#202124]">{answers[q.id]}</p>
                      </div>
                    ))}
                  </div>

                  <form className="space-y-4" onSubmit={handleAnswer}>
                    <p className="text-[18px] font-medium leading-7 text-[#202124]">{question.prompt}</p>
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
                      <span>{step === INTERVIEW_QUESTIONS.length - 1 ? "形成初步理解" : "继续"}</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </form>
                </div>
              ) : null}

              {phase === "understanding" && understanding ? (
                <div className="space-y-6">
                  <div className="space-y-3">
                    <h2 className="font-display text-[26px] font-semibold tracking-[-0.04em] text-[#202124]">
                      {understanding.brandName}
                    </h2>
                    <p className="text-[15px] leading-7 text-[#5f5b54]">{understanding.oneLiner}</p>
                    <div className="rounded-[16px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-4 py-3">
                      <p className="text-[12px] tracking-[0.06em] text-[#77805F]">当前阶段</p>
                      <p className="mt-1 text-[15px] font-medium text-[#202124]">{understanding.stageLabel}</p>
                    </div>
                    <div>
                      <p className="text-[12px] tracking-[0.06em] text-[#B47C5C]">我的初步判断</p>
                      <p className="mt-2 text-[16px] leading-7 text-[#202124]">{understanding.judgement}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[13px] font-medium text-[#202124]">我还需要确认 3 个关键问题</p>
                    <ol className="mt-3 space-y-2">
                      {understanding.confirmQuestions.map((q, i) => (
                        <li key={q} className="text-[14px] leading-7 text-[#5f5b54]">
                          {i + 1}. {q}
                        </li>
                      ))}
                    </ol>
                    <p className="mt-3 text-[13px] leading-6 text-[#9a968e]">
                      这些问题会在接下来的战略会议里被展开讨论。
                    </p>
                  </div>

                  {completeOnboarding.error || resumeWorkspace.error ? (
                    <div className="rounded-[14px] border border-[rgba(180,124,92,0.24)] bg-[rgba(180,124,92,0.08)] px-4 py-3 text-[13px] leading-6 text-[#8A4F31]">
                      {completeOnboarding.error?.message ||
                        resumeWorkspace.error?.message ||
                        "建立企业失败，请稍后重试。"}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleContinue}
                    disabled={completeOnboarding.isPending}
                    className="btn-primary w-full justify-center"
                  >
                    <span>{completeOnboarding.isPending ? "正在建立企业关系…" : "生成战略任务并开会"}</span>
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
