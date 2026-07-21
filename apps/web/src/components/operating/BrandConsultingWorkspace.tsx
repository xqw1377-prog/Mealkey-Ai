"use client";

/**
 * M-PNT 品牌战略咨询工作台 — 六步价值路径为主
 * Intake：Round A 基础档案 → Round B 自适应定位追问 → 编译 Brief
 */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Loader2, RotateCcw } from "lucide-react";
import { BrandSwitcher } from "@/components/operating/BrandSwitcher";
import { ConfirmDialog } from "@/components/operating/ConfirmDialog";
import { ConsultingSixStepJourney } from "@/components/operating/ConsultingSixStepJourney";
import { PageErrorState, PageLoadingState } from "@/components/operating/PageState";
import { buildMeetingHref } from "@/lib/meeting";
import { trpc } from "@/lib/trpc";
import {
  BRAND_BASICS_FIELDS,
  type BrandBasicsFieldKey,
  type BrandStrategyProject,
} from "@mealkey/agents/m-pnt/consulting";

export function BrandConsultingWorkspace({ projectId }: { projectId: string }) {
  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.mPntConsulting.getProject.useQuery({
    projectId,
  });

  const invalidate = () =>
    utils.mPntConsulting.getProject.invalidate({ projectId });

  const completeDiscovery = trpc.mPntConsulting.completeDiscovery.useMutation({
    onSuccess: invalidate,
  });
  const answerBrief = trpc.mPntConsulting.answerBrief.useMutation({
    onSuccess: invalidate,
  });
  const compileBrief = trpc.mPntConsulting.compileBrief.useMutation({
    onSuccess: invalidate,
  });
  const reset = trpc.mPntConsulting.reset.useMutation({
    onSuccess: invalidate,
  });

  const [basicsForm, setBasicsForm] = useState<
    Partial<Record<BrandBasicsFieldKey, string>>
  >({});
  const [followupAnswer, setFollowupAnswer] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const consulting = data?.consulting as BrandStrategyProject | undefined;
  const basicsUi = data?.basicsUi as
    | {
        status: string;
        values: Partial<Record<BrandBasicsFieldKey, string>>;
        missingMust: BrandBasicsFieldKey[];
      }
    | undefined;
  const followupUi = data?.followupUi as
    | {
        status: string;
        questions: Array<{
          id: string;
          prompt: string;
          whyNeeded: string;
          priority: "must" | "should";
          answered: boolean;
          answer: string;
        }>;
        progress: {
          answered: number;
          total: number;
          mustAnswered: number;
          mustTotal: number;
          current: { id: string; prompt: string; whyNeeded: string } | null;
        } | null;
      }
    | null
    | undefined;

  useEffect(() => {
    if (!basicsUi || hydrated) return;
    setBasicsForm(basicsUi.values || {});
    setHydrated(true);
  }, [basicsUi, hydrated]);

  const pending =
    completeDiscovery.isPending ||
    answerBrief.isPending ||
    compileBrief.isPending ||
    reset.isPending;

  const briefDone = consulting?.assets?.brandBrief?.status === "complete";
  const stage = consulting?.stage;
  const journeyDone =
    consulting?.assets?.journey?.executionRoadmap?.status === "accepted";
  const statement = consulting?.assets?.positioningContract?.statement;
  const oneLiner =
    (statement &&
      [statement.ourBrandIs, statement.thatValue].filter(Boolean).join(" · ")) ||
    consulting?.assets?.brandBrief?.brandAmbition ||
    "验证我们的品牌定位是否站得住";
  const positioningMeetingHref = buildMeetingHref(
    projectId,
    `定位拍板：${oneLiner}`,
    "brand",
    { confirmSpend: true, spendKind: "m-pnt" },
  );

  const mustKeys = useMemo(
    () =>
      BRAND_BASICS_FIELDS.filter((f) => f.requirement === "must").map(
        (f) => f.key,
      ),
    [],
  );

  const basicsReady = BRAND_BASICS_FIELDS.filter(
    (f) => f.requirement === "must",
  ).every((f) => {
    const v = (basicsForm[f.key] || "").trim();
    return v.length >= f.minLength && v !== "无" && v !== "没有";
  });

  const currentFollowup = useMemo(() => {
    if (!followupUi?.questions?.length) return null;
    return (
      followupUi.questions.find((q) => !q.answered) ||
      followupUi.progress?.current ||
      null
    );
  }, [followupUi]);

  async function run(fn: () => Promise<unknown>) {
    setActionError(null);
    try {
      await fn();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "操作失败");
    }
  }

  if (isLoading) {
    return (
      <PageLoadingState
        eyebrow="定位"
        title="正在打开…"
        description="准备你的品牌方案。"
      />
    );
  }

  if (error || !consulting) {
    return (
      <PageErrorState
        eyebrow="定位"
        title="暂时打不开"
        description={error?.message || "先回能力页再试。"}
        primaryAction={{
          href: `/projects/${projectId}/capability`,
          label: "回能力",
        }}
      />
    );
  }

  return (
    <div className="mpnt-atelier mx-auto max-w-4xl space-y-8 pb-[calc(env(safe-area-inset-bottom)+12.5rem)] pt-6 md:pb-20 md:pt-10">
      <header className="space-y-4 px-1">
        <p className="text-[11px] font-medium tracking-[0.18em] text-[#5f6b4e]">
          定位 · 品牌
        </p>
        <h1 className="font-serif-cn text-[28px] font-semibold leading-[1.15] tracking-[-0.03em] text-[#141413] md:text-[40px]">
          品牌战略定位
        </h1>
        <p className="max-w-2xl text-[15px] leading-7 text-[#6f747b]">
          {journeyDone
            ? "本轮已完成。可回看调研与会议，或重新开始。"
            : "先收齐品牌事实，再按缺口追问。"}
        </p>
        <BrandSwitcher projectId={projectId} variant="full" />
      </header>

      <ConsultingSixStepJourney
        projectId={projectId}
        consulting={consulting}
        pending={pending}
        onScrollIntake={() =>
          document.getElementById("step-intake")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          })
        }
      />

      {actionError ? (
        <section className="border border-[rgba(165,107,77,0.35)] bg-[rgba(165,107,77,0.08)] px-4 py-3 text-[14px] text-[#a56b4d]">
          {actionError}
        </section>
      ) : null}

      {!briefDone ? (
        <section
          id="step-intake"
          className="mpnt-rise overflow-hidden border border-[rgba(20,20,19,0.1)] bg-white"
        >
          <div className="border-b border-[rgba(20,20,19,0.08)] bg-[var(--mpnt-field)] px-5 py-4 md:px-7">
            <p className="text-[11px] tracking-[0.14em] text-[#5f6b4e]">
              01 · INTAKE
            </p>
            <p className="mt-1 text-[14px] text-[#6f747b]">
              第一轮基础档案 → 第二轮定位追问 → 编译简报
            </p>
          </div>

          <div className="space-y-6 p-5 md:p-7">
            {stage === "DISCOVERY" || !stage ? (
              <div className="space-y-6">
                <div>
                  <h2 className="font-serif-cn text-[24px] font-semibold text-[#141413]">
                    品牌基础档案
                  </h2>
                  <p className="mt-2 text-[14px] leading-6 text-[#6f747b]">
                    必填项收齐后，系统会根据你的情况生成下一步该问什么——不是固定五问。
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {BRAND_BASICS_FIELDS.map((field) => {
                    const value = basicsForm[field.key] || "";
                    const missing = mustKeys.includes(field.key)
                      ? value.trim().length < 2
                      : false;
                    return (
                      <label
                        key={field.key}
                        className={`flex flex-col gap-1.5 ${
                          field.key === "competitors" ||
                          field.key === "advantages" ||
                          field.key === "currentPositioning" ||
                          field.key === "businessGoal" ||
                          field.key === "mainPain"
                            ? "md:col-span-2"
                            : ""
                        }`}
                      >
                        <span className="text-[13px] font-medium text-[#141413]">
                          {field.label}
                          {field.requirement === "must" ? (
                            <span className="ml-1 text-[#a56b4d]">*</span>
                          ) : (
                            <span className="ml-1 text-[#6f747b]">选填</span>
                          )}
                        </span>
                        <span className="text-[12px] leading-5 text-[#6f747b]">
                          {field.prompt}
                        </span>
                        <input
                          value={value}
                          disabled={pending}
                          onChange={(e) =>
                            setBasicsForm((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                          placeholder={field.placeholder}
                          className={`min-h-11 border px-3 text-[14px] outline-none focus:border-[#141413] ${
                            missing
                              ? "border-[rgba(165,107,77,0.45)] bg-[rgba(165,107,77,0.04)]"
                              : "border-[rgba(20,20,19,0.12)] bg-[var(--mpnt-field)]"
                          }`}
                        />
                      </label>
                    );
                  })}
                </div>

                <button
                  type="button"
                  disabled={pending || !basicsReady}
                  onClick={() =>
                    void run(() =>
                      completeDiscovery.mutateAsync({
                        projectId,
                        basics: basicsForm as Record<string, string>,
                        businessGoal: basicsForm.businessGoal,
                        notes: basicsForm.mainPain,
                      }),
                    )
                  }
                  className="inline-flex min-h-12 items-center gap-2 bg-[#141413] px-6 text-[15px] font-semibold text-white disabled:opacity-40"
                >
                  {completeDiscovery.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  档案齐了，生成定位追问
                </button>
              </div>
            ) : null}

            {stage === "BRAND_BRIEF" ? (
              <div className="space-y-6">
                <div>
                  <p className="text-[12px] text-[#5f6b4e]">
                    定位追问 ·{" "}
                    {followupUi?.progress
                      ? `${followupUi.progress.mustAnswered}/${followupUi.progress.mustTotal} 必答`
                      : "准备中"}
                  </p>
                  <h2 className="mt-1 font-serif-cn text-[24px] font-semibold text-[#141413]">
                    基于你的档案，还差这些信息
                  </h2>
                  <p className="mt-2 text-[14px] leading-6 text-[#6f747b]">
                    问题由基础档案缺口生成；答完必答题才能编译简报。
                  </p>
                  {followupUi?.progress ? (
                    <div className="mt-3 h-1.5 overflow-hidden bg-[rgba(20,20,19,0.06)]">
                      <div
                        className="h-full bg-[#5f6b4e] transition-all duration-500"
                        style={{
                          width: `${
                            followupUi.progress.mustTotal
                              ? (followupUi.progress.mustAnswered /
                                  followupUi.progress.mustTotal) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  ) : null}
                </div>

                {followupUi?.status === "ready_to_compile" ? (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      void run(() => compileBrief.mutateAsync({ projectId }))
                    }
                    className="inline-flex min-h-12 items-center gap-2 bg-[#141413] px-6 text-[15px] font-semibold text-white disabled:opacity-40"
                  >
                    {compileBrief.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                    编译简报，开始市场调研
                  </button>
                ) : currentFollowup ? (
                  <div className="space-y-4">
                    <p className="text-[17px] font-medium leading-7 text-[#141413]">
                      {currentFollowup.prompt}
                    </p>
                    {"whyNeeded" in currentFollowup &&
                    currentFollowup.whyNeeded ? (
                      <p className="text-[13px] leading-5 text-[#6f747b]">
                        为什么问：{currentFollowup.whyNeeded}
                      </p>
                    ) : null}
                    <div className="flex gap-2">
                      <input
                        value={followupAnswer}
                        onChange={(e) => setFollowupAnswer(e.target.value)}
                        className="min-h-12 flex-1 border border-[rgba(20,20,19,0.12)] px-3 text-[14px] outline-none focus:border-[#141413]"
                        placeholder="用具体事实回答，避免「好吃/性价比」这类空话"
                      />
                      <button
                        type="button"
                        disabled={pending || followupAnswer.trim().length < 2}
                        onClick={() =>
                          void run(async () => {
                            await answerBrief.mutateAsync({
                              projectId,
                              questionId: currentFollowup.id,
                              answer: followupAnswer,
                            });
                            setFollowupAnswer("");
                          })
                        }
                        className="bg-[#141413] px-5 text-[14px] font-medium text-white disabled:opacity-40"
                      >
                        提交
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-[14px] text-[#6f747b]">
                    追问会话尚未生成，请重置后重新填写基础档案。
                  </p>
                )}

                {followupUi?.questions?.length ? (
                  <ul className="space-y-2 border-t border-[rgba(20,20,19,0.08)] pt-4">
                    {followupUi.questions.map((q) => (
                      <li
                        key={q.id}
                        className="flex items-start justify-between gap-3 text-[13px]"
                      >
                        <span
                          className={
                            q.answered ? "text-[#6f747b] line-through" : "text-[#141413]"
                          }
                        >
                          {q.priority === "must" ? "必答 · " : "选答 · "}
                          {q.prompt}
                        </span>
                        <span className="shrink-0 text-[#5f6b4e]">
                          {q.answered ? "已答" : "待答"}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {(journeyDone ||
        consulting.assets?.positioningContract?.status === "frozen") && (
        <section className="space-y-4 border border-[rgba(20,20,19,0.1)] bg-[#F7F6F2] px-5 py-5 md:px-7">
          <div>
            <p className="text-[11px] tracking-[0.14em] text-[#5f6b4e]">
              NEXT · 把定位变成经营动作
            </p>
            <h2 className="mt-2 font-serif-cn text-[22px] font-semibold text-[#141413]">
              接下来三步
            </h2>
            <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[#6f747b]">
              报告不是终点：开会拍板 → 留下决策 → 回头验证。
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={positioningMeetingHref}
              prefetch={false}
              className="inline-flex min-h-12 items-center justify-center gap-2 bg-[#181817] px-5 text-[14px] font-semibold text-white no-underline"
            >
              带进会议
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={`/projects/${projectId}/decisions`}
              prefetch={false}
              className="inline-flex min-h-12 items-center justify-center gap-2 border border-[rgba(20,20,19,0.14)] bg-white px-5 text-[14px] font-medium text-[#141413] no-underline"
            >
              看决策
            </Link>
            <Link
              href={`/projects/${projectId}/decisions#validation`}
              prefetch={false}
              className="inline-flex min-h-12 items-center justify-center gap-2 border border-[rgba(20,20,19,0.14)] bg-white px-5 text-[14px] font-medium text-[#141413] no-underline"
            >
              去验证任务
            </Link>
          </div>
        </section>
      )}

      <div className="flex flex-wrap gap-3 px-1 pt-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => setResetOpen(true)}
          className="inline-flex min-h-11 items-center gap-2 border border-[rgba(20,20,19,0.12)] px-4 text-[13px] text-[#6f747b] hover:border-[#141413] hover:text-[#141413] disabled:opacity-40"
        >
          {reset.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RotateCcw className="h-4 w-4" />
          )}
          重置本轮咨询
        </button>
      </div>

      <ConfirmDialog
        open={resetOpen}
        title="重置整个品牌战略咨询项目？"
        description="调研、会议与执行路径将清空，确定后需重新开始本轮。"
        confirmLabel="确认重置"
        danger
        busy={reset.isPending}
        onCancel={() => setResetOpen(false)}
        onConfirm={() => {
          void run(async () => {
            await reset.mutateAsync({ projectId });
            setHydrated(false);
            setBasicsForm({});
            setResetOpen(false);
          });
        }}
      />
    </div>
  );
}
