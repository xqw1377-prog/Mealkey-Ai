"use client";

/**
 * M-PNT 品牌战略咨询工作台 — 六步价值路径为主
 * Intake：Round A 基础档案 → Round B 自适应定位追问 → 编译 Brief
 */
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, RotateCcw } from "lucide-react";
import { BrandSwitcher } from "@/components/operating/BrandSwitcher";
import { ConfirmDialog } from "@/components/operating/ConfirmDialog";
import { ConsultingSixStepJourney } from "@/components/operating/ConsultingSixStepJourney";
import { GuidedColorIntake } from "@/components/operating/GuidedColorIntake";
import { IntakeHeardConfirm } from "@/components/operating/IntakeHeardConfirm";
import { PageErrorState, PageLoadingState } from "@/components/operating/PageState";
import {
  dialogueTurnsReady,
  getIntakeDialogueTurns,
  hydrateDialogueValues,
  listWeakBasicsNotes,
  microSlotsForBasics,
  type ParseUtteranceResult,
} from "@/lib/intake-dialogue-turns";
import { buildMeetingHref } from "@/lib/meeting";
import { trpc } from "@/lib/trpc";
import {
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
  const ingestTurn = trpc.mPntConsulting.ingestDialogueTurn.useMutation({
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
  const [dialogueValues, setDialogueValues] = useState<Record<string, string>>(
    {},
  );
  const [microSlots, setMicroSlots] = useState<
    Array<{ id: string; label: string; prompt: string; keys: string[] }>
  >([]);
  const [lastParsed, setLastParsed] = useState<ParseUtteranceResult | null>(
    null,
  );
  const [followupAnswer, setFollowupAnswer] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const dialogueTurns = useMemo(() => getIntakeDialogueTurns("m-pnt"), []);
  const intakeSlots = useMemo(
    () => [
      ...dialogueTurns.map((t) => ({
        id: t.id,
        label: t.label,
        prompt: t.prompt,
        hint: t.hint,
        placeholder: "按住说话，或打字",
        required: t.required !== false,
      })),
      ...microSlots.map((m) => ({
        id: m.id,
        label: m.label,
        prompt: m.prompt,
        placeholder: "按住说话，补这一条",
        required: true,
      })),
    ],
    [dialogueTurns, microSlots],
  );

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
    const values = basicsUi.values || {};
    setBasicsForm(values);
    setDialogueValues(
      hydrateDialogueValues(dialogueTurns, values as Record<string, string>),
    );
    setMicroSlots(
      microSlotsForBasics("m-pnt", values as Record<string, string>),
    );
    setHydrated(true);
  }, [basicsUi, hydrated, dialogueTurns]);

  const pending =
    completeDiscovery.isPending ||
    ingestTurn.isPending ||
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

  const basicsAsRecord = basicsForm as Record<string, string>;
  const weakNotes = useMemo(
    () => listWeakBasicsNotes("m-pnt", basicsAsRecord),
    [basicsAsRecord],
  );
  const basicsReady =
    dialogueTurnsReady("m-pnt", basicsAsRecord) && weakNotes.length === 0;

  useEffect(() => {
    if (!hydrated) return;
    setMicroSlots(microSlotsForBasics("m-pnt", basicsAsRecord));
  }, [hydrated, basicsAsRecord]);

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
    <div className="mpnt-atelier mx-auto max-w-4xl space-y-5 px-4 pb-[calc(env(safe-area-inset-bottom)+7.5rem)] pt-[calc(env(safe-area-inset-top)+1rem)] md:space-y-8 md:px-6 md:pb-20 md:pt-10">
      <header className="space-y-3 px-1 md:space-y-4">
        <Link
          href={`/projects/${projectId}/agent`}
          prefetch={false}
          className="inline-flex min-h-10 items-center gap-1.5 text-[13px] font-medium text-[#5f6b4e] no-underline"
        >
          <ArrowLeft className="h-4 w-4" />
          回对话
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-[0.18em] text-[#5f6b4e]">
              专业能力 · 品牌定位
            </p>
            <h1 className="mt-1.5 font-serif-cn text-[26px] font-semibold leading-[1.12] tracking-[-0.03em] text-[#141413] md:text-[36px]">
              品牌战略定位
            </h1>
          </div>
          <BrandSwitcher projectId={projectId} variant="full" />
        </div>
        {journeyDone ? (
          <p className="text-[14px] leading-6 text-[#5c6168]">本轮已完成。</p>
        ) : null}
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
          className="mpnt-rise border border-[rgba(20,20,19,0.1)] bg-white p-5 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] md:p-7 md:pb-7"
        >
          {stage === "DISCOVERY" || !stage ? (
            <div className="space-y-3">
              {lastParsed ? (
                <IntakeHeardConfirm
                  parsed={lastParsed}
                  onDismiss={() => setLastParsed(null)}
                />
              ) : null}
              {weakNotes.length ? (
                <div className="rounded-2xl border border-[rgba(165,107,77,0.35)] bg-[rgba(165,107,77,0.08)] px-4 py-3 text-[13px] leading-5 text-[#8a5a3d]">
                  <p className="font-medium">还差几条具体事实，答完才能生成追问：</p>
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-4">
                    {weakNotes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <GuidedColorIntake
                projectId={projectId}
                title="我先问你几句"
                voiceTitle="品牌定位·口述档案"
                busy={pending}
                slots={intakeSlots}
                values={dialogueValues}
                onChange={(id, value) => {
                  setDialogueValues((prev) => ({ ...prev, [id]: value }));
                }}
                onCommitSlot={async (id, value) => {
                  await run(async () => {
                    const res = await ingestTurn.mutateAsync({
                      projectId,
                      turnId: id,
                      utterance: value,
                    });
                    const nextBasics = (res.basicsValues || {}) as Partial<
                      Record<BrandBasicsFieldKey, string>
                    >;
                    setBasicsForm(nextBasics);
                    setDialogueValues((prev) => ({ ...prev, [id]: value }));
                    setLastParsed(res.parsed);
                    setMicroSlots(
                      res.microSlots?.length
                        ? res.microSlots
                        : microSlotsForBasics(
                            "m-pnt",
                            nextBasics as Record<string, string>,
                          ),
                    );
                  });
                }}
                completeLabel="生成追问"
                completePending={completeDiscovery.isPending}
                completeDisabled={!basicsReady}
                completeHint={
                  !basicsReady
                    ? "请先回答上方橙色提示里的缺口（底栏继续说）"
                    : undefined
                }
                onComplete={() => {
                  if (!basicsReady) {
                    setActionError(
                      weakNotes.length
                        ? `还差更具体的信息：${weakNotes.join("；")}`
                        : "还有信息没抓准，请先答完追问",
                    );
                    return;
                  }
                  const basics = { ...basicsAsRecord };
                  void run(() =>
                    completeDiscovery.mutateAsync({
                      projectId,
                      basics,
                      businessGoal: basics.businessGoal,
                      notes: basics.mainPain,
                    }),
                  );
                }}
              />
            </div>
          ) : null}

          {stage === "BRAND_BRIEF" ? (
            followupUi?.status === "ready_to_compile" ? (
              <div className="space-y-3">
                <h2 className="font-serif-cn text-[22px] font-semibold text-[#141413]">
                  可以编译简报了
                </h2>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    void run(() => compileBrief.mutateAsync({ projectId }))
                  }
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[#141413] px-6 text-[15px] font-semibold text-white disabled:opacity-40"
                >
                  {compileBrief.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  编译简报
                </button>
              </div>
            ) : currentFollowup ? (
              <GuidedColorIntake
                projectId={projectId}
                title="还想确认一点"
                voiceTitle="品牌定位·追问"
                busy={pending}
                slots={[
                  {
                    id: currentFollowup.id,
                    label: "",
                    prompt: currentFollowup.prompt,
                    hint:
                      "whyNeeded" in currentFollowup
                        ? currentFollowup.whyNeeded || undefined
                        : undefined,
                    placeholder: "按住说话，或打字",
                    required: true,
                  },
                ]}
                values={{ [currentFollowup.id]: followupAnswer }}
                onChange={(_id, value) => setFollowupAnswer(value)}
                onCommitSlot={async (id, value) => {
                  await run(async () => {
                    await answerBrief.mutateAsync({
                      projectId,
                      questionId: id,
                      answer: value,
                    });
                    setFollowupAnswer("");
                  });
                }}
              />
            ) : (
              <p className="text-[14px] text-[#6f747b]">追问尚未生成，请重置重试。</p>
            )
          ) : null}
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
            setDialogueValues({});
            setMicroSlots([]);
            setLastParsed(null);
            setResetOpen(false);
          });
        }}
      />
    </div>
  );
}
