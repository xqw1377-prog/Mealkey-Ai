"use client";

/**
 * M-PNT 六步价值路径 — 顶级咨询交付体验
 * 文档：docs/M_PNT_SIX_STEP_VALUE_PATH_FREEZE.md
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  Download,
  Loader2,
  Printer,
  Sparkles,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import {
  ADVISOR_META,
  MPNT_JOURNEY_LABEL,
  MPNT_JOURNEY_ORDER,
  resolveMpntJourneyNextStep,
  buildPositioningStrategyReportMarkdown,
  evaluatePositioningIntakeChecklist,
  type AdvisorId,
  type AdvisorStrategyCard,
  type AdvisorMasterScheme,
  type BrandStrategyProject,
  type MpntJourneyStep,
} from "@mealkey/agents/m-pnt/consulting";
import { EngineDegradationBanner } from "@/components/operating/EngineDegradationBanner";
import { MpntReportDoc } from "@/components/operating/MpntReportDoc";
import { useSpeechToTextField } from "@/hooks/useSpeechToTextField";
import { PRODUCT_BRAND_TITLE } from "@/lib/product-brand";
import { formatTrpcMutationError } from "@/lib/trpc-mutation-error";

type Props = {
  projectId: string;
  consulting: BrandStrategyProject;
  pending?: boolean;
  onBusy?: (busy: boolean) => void;
  onScrollIntake?: () => void;
};

const ADVISOR_INITIAL: Record<AdvisorId, string> = {
  ries: "心",
  trout: "空",
  ye: "冲",
  growth: "增",
  huayehu: "华",
  kotler: "科",
  culture: "文",
};

const ADVISOR_TONE: Record<AdvisorId, string> = {
  ries: "bg-[#141413] text-white",
  trout: "bg-[#5f6b4e] text-white",
  ye: "bg-[#3d4a5c] text-white",
  growth: "bg-[#4a5c3d] text-white",
  huayehu: "bg-[#5c4a3d] text-white",
  kotler: "bg-[#3d455c] text-white",
  culture: "bg-[#5c3d4a] text-white",
};

type WarRoomVotePreference = "ries" | "trout" | "ye" | "blend";

function toWarRoomVotePreference(
  preference: AdvisorId | "blend",
): WarRoomVotePreference {
  if (
    preference === "blend" ||
    preference === "ries" ||
    preference === "trout" ||
    preference === "ye"
  ) {
    return preference;
  }
  return "blend";
}

export function ConsultingSixStepJourney({
  projectId,
  consulting,
  pending,
  onBusy,
  onScrollIntake,
}: Props) {
  const utils = trpc.useUtils();
  const invalidate = () =>
    utils.mPntConsulting.getProject.invalidate({ projectId });

  const runResearch = trpc.mPntConsulting.runMarketResearch.useMutation({
    onSettled: invalidate,
  });
  const confirmResearch = trpc.mPntConsulting.confirmMarketResearch.useMutation({
    onSettled: invalidate,
  });
  const fillVisit = trpc.mPntConsulting.fillStoreVisit.useMutation({
    onSuccess: invalidate,
  });
  const adoptWhitespace = trpc.mPntConsulting.adoptWhitespaceSuggestion.useMutation({
    onSuccess: invalidate,
  });
  const runAdvisors = trpc.mPntConsulting.runAdvisorStrategies.useMutation({
    onSuccess: invalidate,
  });
  const openRoom = trpc.mPntConsulting.openWarRoom.useMutation({
    onSuccess: invalidate,
  });
  const voteRoom = trpc.mPntConsulting.voteWarRoom.useMutation({
    onSuccess: invalidate,
  });
  const genExec = trpc.mPntConsulting.generateExecutionPath.useMutation({
    onSuccess: invalidate,
  });
  const acceptExec = trpc.mPntConsulting.acceptExecutionPath.useMutation({
    onSuccess: invalidate,
  });
  const confirmStrategy = trpc.mPntConsulting.confirmStrategyReport.useMutation({
    onSuccess: invalidate,
  });
  const signReport = trpc.mPntConsulting.signReport.useMutation({
    onSuccess: invalidate,
  });
  const exportPackage = trpc.mPntConsulting.exportPackage.useMutation();

  const journey = consulting.assets.journey || {};
  const next = useMemo(
    () => resolveMpntJourneyNextStep(consulting, journey),
    [consulting, journey],
  );
  const intakeChecklist = useMemo(
    () => evaluatePositioningIntakeChecklist(consulting),
    [consulting],
  );
  const [blendNote, setBlendNote] = useState("");
  const [ctaError, setCtaError] = useState<string | null>(null);
  const busy =
    pending ||
    runResearch.isPending ||
    confirmResearch.isPending ||
    fillVisit.isPending ||
    adoptWhitespace.isPending ||
    runAdvisors.isPending ||
    openRoom.isPending ||
    voteRoom.isPending ||
    genExec.isPending ||
    acceptExec.isPending ||
    confirmStrategy.isPending ||
    signReport.isPending ||
    exportPackage.isPending;

  async function run(fn: () => Promise<unknown>) {
    onBusy?.(true);
    try {
      await fn();
    } finally {
      onBusy?.(false);
    }
  }

  async function handleCta() {
    setCtaError(null);
    const guarded = async (fn: () => Promise<unknown>) => {
      try {
        await run(fn);
      } catch (e) {
        setCtaError(formatTrpcMutationError(e));
      }
    };
    switch (next.actionId) {
      case "intake.continue":
        onScrollIntake?.();
        return;
      case "research.run":
        await guarded(() => runResearch.mutateAsync({ projectId }));
        return;
      case "research.confirm":
        if (!intakeChecklist.canConfirmMarketResearch) {
          setCtaError(intakeChecklist.summary);
          return;
        }
        await guarded(() => confirmResearch.mutateAsync({ projectId }));
        return;
      case "advisors.run":
        await guarded(() => runAdvisors.mutateAsync({ projectId }));
        return;
      case "warroom.open":
        await guarded(() => openRoom.mutateAsync({ projectId }));
        return;
      case "warroom.vote":
        return;
      case "strategy.confirmReport":
        await guarded(() => confirmStrategy.mutateAsync({ projectId }));
        return;
      case "execution.generate":
        await guarded(() => genExec.mutateAsync({ projectId }));
        return;
      case "execution.accept":
        await guarded(() => acceptExec.mutateAsync({ projectId }));
        return;
      case "staff.pack": {
        const el = document.querySelector(".mpnt-staff-pack");
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      default:
        return;
    }
  }

  const reportMarkdown =
    journey.warRoom?.status === "agreed"
      ? journey.strategyReportMarkdown ||
        buildPositioningStrategyReportMarkdown({
          research: journey.marketResearch,
          advisors: journey.advisorStrategies,
          warRoom: journey.warRoom,
        })
      : undefined;

  const focus = next.step;
  const done = next.actionId === "done";
  const stepRailRef = useRef<HTMLOListElement | null>(null);
  const activeStepRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    const activeEl = activeStepRef.current;
    if (!activeEl) return;
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      return;
    }
    activeEl.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [focus]);

  return (
    <section className="mpnt-atelier overflow-hidden border border-[rgba(20,20,19,0.1)] bg-[var(--mpnt-paper)] pb-4 md:pb-0">
      {/* Hero */}
      <div className="border-b border-[rgba(20,20,19,0.08)] px-5 py-5 md:px-8 md:py-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[11px] font-medium tracking-[0.18em] text-[#5f6b4e]">
            {PRODUCT_BRAND_TITLE} · 品牌定位
          </p>
          <p className="text-[12px] tabular-nums text-[#5c6168]">
            第 {Math.min(MPNT_JOURNEY_ORDER.indexOf(focus) + 1, 6)} / 6 步
          </p>
        </div>
        <h2 className="mt-2 font-serif-cn text-[26px] font-semibold leading-tight tracking-[-0.02em] text-[#141413] md:mt-3 md:text-[34px]">
          {done ? "本轮已完成" : next.label.title}
        </h2>
        <p className="mt-1.5 max-w-xl text-[14px] leading-6 text-[#5c6168] md:text-[15px] md:leading-7">
          {done
            ? "定位已定，可签字导出或看怎么干。"
            : next.label.feel}
        </p>

        <div className="mt-4 h-1 overflow-hidden rounded-full bg-[rgba(20,20,19,0.08)] md:mt-5">
          <div
            className="h-full rounded-full bg-[#66735E] transition-[width] duration-500 ease-out"
            style={{
              width: `${done ? 100 : Math.round(((MPNT_JOURNEY_ORDER.indexOf(focus) + 1) / 6) * 100)}%`,
            }}
          />
        </div>

        <ol
          ref={stepRailRef}
          className="mpnt-step-rail mt-4 -mx-5 flex gap-2 overflow-x-auto scroll-px-5 px-5 pb-1 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:mt-5 lg:grid lg:grid-cols-6 lg:overflow-visible lg:scroll-px-0 lg:px-0 lg:pb-0 lg:snap-none"
        >
          {MPNT_JOURNEY_ORDER.map((step, i) => {
            const meta = MPNT_JOURNEY_LABEL[step];
            const active = step === focus;
            const passed = stepRank(step) < stepRank(focus) || done;
            return (
              <li
                key={step}
                ref={active ? activeStepRef : undefined}
                className={`mpnt-rise relative min-h-[3.75rem] min-w-[7rem] shrink-0 snap-center rounded-[12px] border px-3 py-2.5 transition-colors lg:min-h-0 lg:min-w-0 lg:rounded-none lg:px-2.5 lg:py-2.5 ${
                  active
                    ? "border-[#141413] bg-[#141413] text-white shadow-[0_8px_20px_rgba(20,20,19,0.18)]"
                    : passed
                      ? "border-[rgba(95,107,78,0.4)] bg-[rgba(95,107,78,0.1)] text-[#3d4638]"
                      : "border-[rgba(20,20,19,0.1)] bg-white text-[#5c6168]"
                }`}
                style={{ animationDelay: `${i * 0.04}s` }}
              >
                <p className="text-[10px] tracking-[0.12em] opacity-80">
                  {meta.no}
                </p>
                <p className="mt-1 text-[14px] font-semibold leading-4 lg:text-[13px] lg:font-medium">
                  {meta.title}
                </p>
                {passed && !active ? (
                  <Check className="absolute right-1.5 top-1.5 h-3.5 w-3.5 opacity-80" />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>

      {/* 采集期不渲染阶段条：底栏只留给对话；其它阶段贴顶单层精简 */}
      {next.actionId !== "intake.continue" ? (
        <div
          className={`mpnt-sticky-cta sticky top-0 z-30 flex flex-col gap-2 border-b px-5 py-2.5 md:flex-row md:items-center md:justify-between md:gap-3 md:px-8 md:py-3.5 ${
            done
              ? "border-[rgba(95,107,78,0.3)] bg-[rgba(95,107,78,0.1)]"
              : "border-[#141413] bg-[#141413] text-white"
          }`}
        >
          <div className="min-w-0 md:flex-1">
            <p
              className={`text-[11px] tracking-[0.12em] ${
                done ? "text-[#5f6b4e]" : "text-white/60"
              }`}
            >
              {done ? "已完成" : "现在只做这一步"}
            </p>
            <p
              className={`mt-0.5 text-[15px] font-semibold leading-5 md:mt-1 md:text-[16px] md:leading-6 ${
                done ? "text-[#141413]" : "text-white"
              }`}
            >
              {next.title}
            </p>
            <p
              className={`mt-0.5 hidden text-[13px] leading-5 md:block ${
                done ? "text-[#5f6b4e]" : "text-white/70"
              }`}
            >
              {next.detail}
            </p>
          </div>
          {next.actionId !== "warroom.vote" && next.actionId !== "done" ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleCta()}
              className="inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-[14px] bg-white px-5 text-[14px] font-semibold text-[#141413] transition touch-manipulation hover:bg-[#f3f1eb] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 md:min-h-11 md:w-auto md:rounded-none"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {next.actionId === "research.run"
                    ? "情报采集中…"
                    : next.actionId === "research.confirm"
                      ? "确认并召集顾问…"
                      : next.actionId?.includes("advisor")
                        ? "三席出策中…"
                        : next.actionId?.includes("war")
                          ? "会商中…"
                          : "处理中…"}
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4" />
                  {next.ctaLabel}
                </>
              )}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-8 px-5 py-7 md:px-8 md:py-9">
        {ctaError ? (
          <p className="border border-[rgba(165,107,77,0.35)] bg-[rgba(165,107,77,0.08)] px-4 py-3 text-[13px] text-[#a56b4d]">
            {ctaError}
          </p>
        ) : null}

        {journey.challengeBrief &&
        (focus === "INTAKE" ||
          focus === "MARKET_RESEARCH" ||
          stepRank(focus) > stepRank("INTAKE") ||
          done) ? (
          <ChallengeBriefPanel brief={journey.challengeBrief} />
        ) : null}

        {/* Progressive: research */}
        {journey.marketResearch &&
        (focus === "MARKET_RESEARCH" ||
          stepRank(focus) > stepRank("MARKET_RESEARCH") ||
          done) ? (
          <ResearchPanel
            pack={journey.marketResearch}
            humanTruth={journey.humanTruth}
            projectId={projectId}
            primary={focus === "MARKET_RESEARCH"}
            busy={busy}
            onFillVisit={(input) =>
              void run(() =>
                fillVisit.mutateAsync({
                  projectId,
                  ...input,
                }),
              )
            }
            onAdoptWhitespace={() =>
              void run(() =>
                adoptWhitespace.mutateAsync({ projectId }),
              )
            }
            onRerunWithVisits={() =>
              void run(async () => {
                const pending =
                  journey.marketResearch?.storeVisitPlan?.tasks?.find(
                    (t) => t.status === "pending",
                  );
                // 若有已回填，直接重跑顾问；否则提示先回填
                if (
                  !(journey.marketResearch?.storeVisitPlan?.tasks || []).some(
                    (t) => t.status === "filled",
                  )
                ) {
                  return;
                }
                if (pending) {
                  /* 允许只回填部分后就重跑 */
                }
                await runAdvisors.mutateAsync({ projectId });
              })
            }
          />
        ) : null}

        {journey.advisorStrategies &&
        (focus === "THREE_ADVISORS" ||
          focus === "WAR_ROOM" ||
          stepRank(focus) > stepRank("WAR_ROOM") ||
          done) ? (
          <AdvisorPanel
            set={journey.advisorStrategies}
            primary={focus === "THREE_ADVISORS"}
          />
        ) : null}

        {journey.warRoom &&
        (focus === "WAR_ROOM" ||
          stepRank(focus) > stepRank("WAR_ROOM") ||
          done) ? (
          <WarRoomPanel
            room={journey.warRoom}
            strategies={journey.advisorStrategies?.strategies}
            busy={busy}
            blendNote={blendNote}
            onBlendNote={setBlendNote}
            primary={focus === "WAR_ROOM"}
            onVote={(preference) =>
              void run(() =>
                voteRoom.mutateAsync({
                  projectId,
                  preference: toWarRoomVotePreference(preference),
                  blendNote: blendNote || undefined,
                }),
              )
            }
          />
        ) : null}

        {journey.warRoom?.status === "agreed" &&
        (focus === "STRATEGY_LOCK" ||
          focus === "EXECUTION_PATH" ||
          done) ? (
          <StrategyReportPanel
            projectId={projectId}
            markdown={reportMarkdown}
            oneLiner={journey.warRoom.consensusOneLiner}
            statement={journey.warRoom.consensusStatement}
            confirmed={Boolean(journey.strategyConfirmedAt)}
            primary={focus === "STRATEGY_LOCK"}
            contractFrozen={
              consulting.assets.positioningContract?.status === "frozen"
            }
            brandSystemComplete={
              consulting.assets.brandSystem?.status === "complete"
            }
            signOffStatus={consulting.assets.reportOutline?.signOffStatus}
            signedByName={consulting.assets.reportOutline?.signedBy}
            busy={busy}
            onSign={async (signedBy) => {
              setCtaError(null);
              try {
                await run(() =>
                  signReport.mutateAsync({ projectId, signedBy }),
                );
              } catch (e) {
                setCtaError(e instanceof Error ? e.message : "签字失败");
              }
            }}
            onExport={async (preview) => {
              setCtaError(null);
              try {
                const res = await exportPackage.mutateAsync({
                  projectId,
                  preview,
                });
                const blob = new Blob([res.markdown], {
                  type: "text/markdown;charset=utf-8",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = res.filename;
                a.click();
                URL.revokeObjectURL(url);
              } catch (e) {
                setCtaError(e instanceof Error ? e.message : "导出失败");
              }
            }}
          />
        ) : null}

        {journey.executionRoadmap &&
        (focus === "EXECUTION_PATH" || done) ? (
          <RoadmapPanel
            roadmap={journey.executionRoadmap}
            primary={focus === "EXECUTION_PATH" || done}
          />
        ) : null}

        {!journey.marketResearch && focus === "MARKET_RESEARCH" ? (
          <EmptyStage
            title="准备采集市场信息"
            detail="会抓取区域、竞对与用户侧公开信号。本地推断不算调研完成。"
          />
        ) : null}
      </div>
      {/* 给贴底 CTA + 底栏留空 */}
      <div className="h-28 md:hidden" aria-hidden />
    </section>
  );
}

function stepRank(step: MpntJourneyStep | string): number {
  return MPNT_JOURNEY_ORDER.indexOf(step as MpntJourneyStep);
}

function EmptyStage({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="mpnt-rise border border-dashed border-[rgba(20,20,19,0.15)] px-6 py-10 text-center">
      <Sparkles className="mx-auto h-5 w-5 text-[#5f6b4e]" />
      <p className="mt-3 font-serif-cn text-[20px] text-[#141413]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-[#6f747b]">
        {detail}
      </p>
    </div>
  );
}

function MasterSchemeBlock({ scheme }: { scheme: AdvisorMasterScheme }) {
  const scripts = scheme.scripts;
  return (
    <div className="border-t border-[rgba(20,20,19,0.08)] px-4 py-3 text-[12px] leading-5">
      <p className="text-[11px] tracking-[0.08em] text-[#5f6b4e]">
        {scheme.title}
      </p>
      {scheme.school === "ries" ? (
        <ul className="mt-2 space-y-1 text-[#141413]">
          <li>
            品牌名：{scheme.brandNameAssessment.currentName}（
            {scheme.brandNameAssessment.score}分 ·{" "}
            {scheme.brandNameAssessment.verdict === "keep"
              ? "保留"
              : scheme.brandNameAssessment.verdict === "sharpen"
                ? "补强"
                : "建议改名"}
            ）
          </li>
          <li className="text-[#6f747b]">
            {scheme.brandNameAssessment.rationale}
          </li>
          {scheme.brandNameAssessment.renameSuggestion ? (
            <li>改名方向：{scheme.brandNameAssessment.renameSuggestion}</li>
          ) : null}
          <li>心智一词：{scheme.mentalWord}</li>
          <li className="text-[#6f747b]">
            品类：{scheme.categoryMining.ladderNote}
          </li>
          <li className="text-[#6f747b]">
            公关→广告：{scheme.prThenAds}
          </li>
        </ul>
      ) : null}
      {scheme.school === "trout" ? (
        <ul className="mt-2 space-y-1 text-[#141413]">
          <li>战法：{scheme.warTypeLabel}</li>
          <li>对立轴：{scheme.dualityAxis}</li>
          <li>我方 / 对方：{scheme.ourPole} · {scheme.rivalPole}</li>
          <li className="text-[#6f747b]">{scheme.competitiveFrame}</li>
          <li className="text-[#6f747b]">{scheme.firstAssociation}</li>
        </ul>
      ) : null}
      {scheme.school === "ye" ? (
        <ul className="mt-2 space-y-1 text-[#141413]">
          <li>语言钉：{scheme.verbalNail}</li>
          <li className="text-[#6f747b]">视觉锤：{scheme.visualHammer}</li>
          <li className="text-[#6f747b]">{scheme.conflictLine}</li>
          <li className="text-[#6f747b]">洞察：{scheme.consumerTruth}</li>
          <li className="text-[#6f747b]">{scheme.brandNameNote}</li>
        </ul>
      ) : null}
      <div className="mt-3 space-y-1 border border-[rgba(20,20,19,0.08)] bg-white px-2.5 py-2 text-[#2a2a28]">
        <p className="text-[11px] tracking-[0.08em] text-[#5f6b4e]">
          本席传播话术
        </p>
        <p>门头：{scripts.storefront}</p>
        <p>迎客：{scripts.greeting}</p>
        <p>点餐：{scripts.counter}</p>
        <p>外卖：{scripts.takeaway}</p>
        <p>短视频：{scripts.shortVideo}</p>
        <p className="text-[#a56b4d]">禁说：{scripts.forbidden.join("；")}</p>
      </div>
      <ul className="mt-2 space-y-1 text-[#6f747b]">
        {scheme.marketingMoves.map((m) => (
          <li key={m}>· {m}</li>
        ))}
      </ul>
      <ul className="mt-2 space-y-1 text-[#a56b4d]">
        {scheme.sacrificeList.map((m) => (
          <li key={m}>牺牲：{m}</li>
        ))}
      </ul>
    </div>
  );
}

function StoreVisitFillRow({
  task,
  busy,
  whitespace,
  projectId,
  onSubmit,
}: {
  task: {
    rivalName: string;
    mentalHypothesis: string;
    checklist: string[];
    whyMatters: string;
    status: "pending" | "filled";
    observedMentalWord?: string;
    observedEvidence?: string;
    observedThreat?: string;
    filledNote?: string;
    attachments?: Array<{
      assetId: string;
      kind: "image" | "audio";
      publicUrl: string;
      fileName: string;
      title?: string;
      transcript?: string;
    }>;
  };
  busy?: boolean;
  whitespace?: string;
  projectId: string;
  onSubmit: (data: {
    observedMentalWord: string;
    evidenceSentence: string;
    threatToWhitespace?: string;
    note?: string;
    assetIds?: string[];
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mental, setMental] = useState(task.observedMentalWord || "");
  const [evidence, setEvidence] = useState(task.observedEvidence || "");
  const [threat, setThreat] = useState(task.observedThreat || "");
  const [pendingAssets, setPendingAssets] = useState<
    Array<{
      assetId: string;
      kind: "image" | "audio";
      publicUrl: string;
      fileName: string;
      transcript?: string;
    }>
  >([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const cloudSpeech = useMemo(
    () => ({
      projectId,
      title: `店访·${task.rivalName}·口述证据`,
      categorySlug: "market-research",
      forbidTranscriptHint: true as const,
    }),
    [projectId, task.rivalName],
  );
  const {
    speechSupported,
    recording: speechRecording,
    uploading: speechUploading,
    activeFieldId,
    speechError,
    startFieldRecording,
    stopRecording: stopSpeechRecording,
  } = useSpeechToTextField(cloudSpeech);
  const filled = task.status === "filled";
  const savedAttachments = task.attachments || [];
  const evidenceFieldId = `store-visit-evidence-${task.rivalName}`;
  const hasTranscripts = pendingAssets.some(
    (a) => a.transcript && a.transcript !== "[无语音内容]",
  );

  const applyTranscriptToEvidence = (
    text: string,
    mode: "replace" | "append",
  ) => {
    const t = text.trim();
    if (!t || t === "[无语音内容]") return;
    setEvidence((prev) => {
      if (mode === "replace" || !prev.trim()) return t.slice(0, 280);
      if (prev.includes(t.slice(0, 24))) return prev;
      return `${prev.trim()}；${t}`.slice(0, 280);
    });
  };

  const uploadFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setUploadError(null);
    try {
      const next = [...pendingAssets];
      for (const file of Array.from(files)) {
        if (next.length >= 6) break;
        const isImage = file.type.startsWith("image/");
        const isAudio = file.type.startsWith("audio/");
        if (!isImage && !isAudio) {
          setUploadError("仅支持照片或录音");
          continue;
        }
        const formData = new FormData();
        formData.append("file", file);
        formData.append("projectId", projectId);
        formData.append("categorySlug", "market-research");
        formData.append(
          "title",
          `店访·${task.rivalName}·${isImage ? "照片" : "录音"}`,
        );
        // 注意：服务端若有 transcriptHint 会优先当转写结果；店访录音必须走真实音频转写
        const response = await fetch("/api/assets/upload", {
          method: "POST",
          body: formData,
        });
        if (!response.ok) {
          const errBody = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(errBody.error || `上传失败（${response.status}）`);
        }
        const payload = (await response.json()) as {
          asset?: {
            id: string;
            kind: string;
            publicUrl: string;
            fileName: string;
            transcript?: string | null;
          };
        };
        if (!payload.asset) throw new Error("上传后没有返回资料");
        const kind =
          payload.asset.kind === "audio" ? "audio" : ("image" as const);
        const transcript = payload.asset.transcript?.trim() || undefined;
        if (
          !next.some((a) => a.assetId === payload.asset!.id) &&
          (kind === "image" || kind === "audio")
        ) {
          next.push({
            assetId: payload.asset.id,
            kind,
            publicUrl: payload.asset.publicUrl,
            fileName: payload.asset.fileName,
            transcript,
          });
          if (kind === "audio") {
            if (transcript && transcript !== "[无语音内容]") {
              applyTranscriptToEvidence(transcript, "append");
            } else if (!transcript) {
              setUploadError(
                "录音已上传，但转写未成功（检查 DashScope/通义 Key），可手填证据句",
              );
            }
          }
        }
      }
      setPendingAssets(next.slice(0, 6));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  };

  return (
    <li className="border border-[rgba(20,20,19,0.08)] bg-white/70 px-3 py-3 text-[13px] leading-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium text-[#141413]">
            {task.rivalName}
            <span
              className={`ml-2 text-[11px] font-normal ${
                filled ? "text-[#5f6b4e]" : "text-[#a56b4d]"
              }`}
            >
              {filled ? "已回填" : "待店访"}
            </span>
          </p>
          <p className="text-[12px] text-[#6f747b]">
            假说：{task.mentalHypothesis}
          </p>
          {filled && task.observedMentalWord ? (
            <p className="mt-1 text-[12px] text-[#5f6b4e]">
              现场心智词：{task.observedMentalWord}
              {task.observedEvidence ? ` · ${task.observedEvidence}` : ""}
            </p>
          ) : (
            <p className="text-[12px] text-[#2a2a28]">{task.whyMatters}</p>
          )}
          {filled && savedAttachments.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {savedAttachments.map((a) => (
                <li key={a.assetId} className="space-y-1">
                  <a
                    href={a.publicUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 border border-[rgba(20,20,19,0.12)] px-2 py-1 text-[11px] text-[#5f6b4e] hover:border-[#141413]"
                  >
                    {a.kind === "image" ? "照片" : "录音"} · {a.fileName}
                  </a>
                  {a.transcript ? (
                    <p className="text-[11px] leading-5 text-[#6f747b]">
                      转写：{a.transcript}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {!filled ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="shrink-0 border border-[rgba(20,20,19,0.15)] px-2.5 py-1 text-[12px] text-[#141413] hover:border-[#141413]"
          >
            {open ? "收起" : "回填店访"}
          </button>
        ) : null}
      </div>
      {!filled ? (
        <ul className="mt-2 space-y-0.5 text-[12px] text-[#6f747b]">
          {task.checklist.slice(0, 3).map((c) => (
            <li key={c} className="flex gap-2">
              <span className="text-[#a56b4d]">□</span>
              {c}
            </li>
          ))}
        </ul>
      ) : null}
      {open && !filled ? (
        <div className="mt-3 space-y-2 border-t border-[rgba(20,20,19,0.06)] pt-3">
          <label className="block space-y-1">
            <span className="text-[11px] text-[#6f747b]">
              现场心智词（门头/客人可复述）
            </span>
            <input
              value={mental}
              onChange={(e) => setMental(e.target.value)}
              className="w-full border border-[rgba(20,20,19,0.12)] bg-[var(--mpnt-field)] px-2.5 py-2 text-[13px] outline-none focus:border-[#141413]"
              placeholder="例：家庭放心湘菜"
            />
          </label>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] text-[#6f747b]">
                店访证据句（原话/所见，可口述或录音转写）
              </span>
              {speechSupported ? (
                <button
                  type="button"
                  disabled={
                    (busy || uploading || speechUploading) &&
                    !(speechRecording && activeFieldId === evidenceFieldId)
                  }
                  className={`inline-flex min-h-9 touch-none select-none items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition ${
                    speechRecording && activeFieldId === evidenceFieldId
                      ? "animate-pulse border-[#07C160] bg-[#07C160] text-white shadow-[0_0_0_3px_rgba(7,193,96,0.25)]"
                      : "border-[rgba(20,20,19,0.15)] bg-white text-[#141413]"
                  }`}
                  onPointerDown={(e) => {
                    if (busy || uploading || speechUploading) return;
                    e.preventDefault();
                    try {
                      e.currentTarget.setPointerCapture(e.pointerId);
                    } catch {
                      /* ignore */
                    }
                    void startFieldRecording(
                      evidenceFieldId,
                      evidence,
                      setEvidence,
                    );
                  }}
                  onPointerUp={(e) => {
                    try {
                      e.currentTarget.releasePointerCapture(e.pointerId);
                    } catch {
                      /* ignore */
                    }
                    stopSpeechRecording();
                  }}
                  onPointerCancel={() => {
                    stopSpeechRecording();
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                >
                  {speechRecording && activeFieldId === evidenceFieldId ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  ) : null}
                  {speechUploading && activeFieldId === evidenceFieldId
                    ? "转写中…"
                    : speechRecording && activeFieldId === evidenceFieldId
                      ? "松手结束"
                      : "按住说话"}
                </button>
              ) : (
                <span className="text-[11px] text-[#5c6168]">
                  不支持口述时可上传录音，或用手机浏览器打开
                </span>
              )}
            </div>
            <textarea
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              rows={2}
              className={`w-full border bg-[var(--mpnt-field)] px-2.5 py-2 text-[13px] outline-none transition-colors ${
                speechRecording && activeFieldId === evidenceFieldId
                  ? "border-[#07C160] ring-2 ring-[rgba(7,193,96,0.2)]"
                  : "border-[rgba(20,20,19,0.12)] focus:border-[#141413]"
              }`}
              placeholder="不会打字就按住说话：门头写啥、客人怎么说…"
            />
            {speechError ? (
              <p className="text-[11px] text-[#a56b4d]">{speechError}</p>
            ) : null}
          </div>
          <label className="block space-y-1">
            <span className="text-[11px] text-[#6f747b]">
              空位威胁（可选，相对「{whitespace || "本稿空位"}」）
            </span>
            <input
              value={threat}
              onChange={(e) => setThreat(e.target.value)}
              className="w-full border border-[rgba(20,20,19,0.12)] bg-[var(--mpnt-field)] px-2.5 py-2 text-[13px] outline-none focus:border-[#141413]"
              placeholder="例：已占家庭场景，空位需拉开对立"
            />
          </label>
          <div className="space-y-1.5">
            <span className="text-[11px] text-[#6f747b]">
              照片 / 录音附件（录音自动转写，最多 6）
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center border border-[rgba(20,20,19,0.15)] px-2.5 py-1.5 text-[12px] text-[#141413] hover:border-[#141413]">
                {uploading ? "上传并转写中…" : "选择文件"}
                <input
                  type="file"
                  accept="image/*,audio/*"
                  multiple
                  className="hidden"
                  disabled={busy || uploading || pendingAssets.length >= 6}
                  onChange={(e) => {
                    void uploadFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
              {pendingAssets.length > 0 ? (
                <span className="text-[11px] text-[#5f6b4e]">
                  已挂 {pendingAssets.length} 份
                  {hasTranscripts ? " · 含转写" : ""}
                </span>
              ) : null}
            </div>
            {uploadError ? (
              <p className="text-[11px] text-[#a56b4d]">{uploadError}</p>
            ) : null}
            {pendingAssets.length > 0 ? (
              <ul className="space-y-2">
                {pendingAssets.map((a) => (
                  <li
                    key={a.assetId}
                    className="border border-[rgba(20,20,19,0.1)] px-2 py-2 text-[11px]"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={a.publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[#5f6b4e] hover:underline"
                      >
                        {a.kind === "image" ? "照片" : "录音"} · {a.fileName}
                      </a>
                      <button
                        type="button"
                        className="text-[#6f747b] hover:text-[#141413]"
                        onClick={() =>
                          setPendingAssets((prev) =>
                            prev.filter((x) => x.assetId !== a.assetId),
                          )
                        }
                      >
                        移除
                      </button>
                      {a.kind === "audio" &&
                      a.transcript &&
                      a.transcript !== "[无语音内容]" ? (
                        <button
                          type="button"
                          className="border border-[rgba(20,20,19,0.12)] px-1.5 py-0.5 text-[#141413] hover:border-[#141413]"
                          onClick={() =>
                            applyTranscriptToEvidence(a.transcript!, "append")
                          }
                        >
                          写入证据句
                        </button>
                      ) : null}
                    </div>
                    {a.kind === "audio" ? (
                      <p className="mt-1 leading-5 text-[#6f747b]">
                        {a.transcript
                          ? `转写：${a.transcript}`
                          : "转写未生成（可手填证据句）"}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <button
            type="button"
            disabled={
              busy ||
              uploading ||
              mental.trim().length < 2 ||
              (evidence.trim().length < 6 && !hasTranscripts)
            }
            onClick={() =>
              onSubmit({
                observedMentalWord: mental.trim(),
                evidenceSentence: evidence.trim(),
                threatToWhitespace: threat.trim() || undefined,
                assetIds: pendingAssets.map((a) => a.assetId),
              })
            }
            className="inline-flex min-h-9 items-center border border-[#141413] bg-[#141413] px-3 text-[12px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            提交回填（升级竞对三联）
          </button>
        </div>
      ) : null}
    </li>
  );
}

function ChallengeBriefPanel({
  brief,
}: {
  brief: NonNullable<
    BrandStrategyProject["assets"]["journey"]
  >["challengeBrief"];
}) {
  if (!brief) return null;
  return (
    <div className="mpnt-rise border border-[rgba(20,20,19,0.1)] bg-white px-5 py-5 md:px-7">
      <p className="text-[11px] tracking-[0.14em] text-[#5f6b4e]">
        00 · BRAND CHALLENGE BRIEF
      </p>
      <h3 className="mt-1 font-serif-cn text-[20px] font-semibold text-[#141413]">
        {brief.projectLabel}
      </h3>
      <dl className="mt-4 grid gap-3 md:grid-cols-2">
        <div>
          <dt className="text-[11px] tracking-[0.08em] text-[#9aa0a6]">
            战略目标
          </dt>
          <dd className="mt-1 text-[14px] leading-6 text-[#141413]">
            {brief.strategicGoal}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] tracking-[0.08em] text-[#9aa0a6]">
            核心挑战
          </dt>
          <dd className="mt-1 text-[14px] leading-6 text-[#141413]">
            {brief.coreChallenge}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function ResearchPanel({
  pack,
  humanTruth,
  projectId,
  primary,
  busy,
  onFillVisit,
  onAdoptWhitespace,
  onRerunWithVisits,
}: {
  pack: NonNullable<BrandStrategyProject["assets"]["journey"]>["marketResearch"];
  humanTruth?: NonNullable<
    BrandStrategyProject["assets"]["journey"]
  >["humanTruth"];
  projectId: string;
  primary?: boolean;
  busy?: boolean;
  onFillVisit?: (input: {
    rivalName: string;
    observedMentalWord: string;
    evidenceSentence: string;
    threatToWhitespace?: string;
    note?: string;
    assetIds?: string[];
    rerunAdvisors?: boolean;
  }) => void;
  onAdoptWhitespace?: () => void;
  onRerunWithVisits?: () => void;
}) {
  if (!pack) return null;
  const modeLabel =
    pack.collectionMode === "live_crawl"
      ? "公开检索抓取"
      : pack.collectionMode === "hybrid"
        ? "检索 + 本地情报库"
        : pack.collectionMode === "local_intel"
          ? "本地情报库"
          : "调研产出";
  const filledCount =
    pack.storeVisitPlan?.tasks?.filter((t) => t.status === "filled").length || 0;
  const researchDegraded =
    pack.collectionMode === "local_intel" ||
    !(pack.sources && pack.sources.length > 0);

  return (
    <div
      className={`mpnt-rise space-y-5 border border-[rgba(20,20,19,0.1)] bg-white p-5 md:p-7 ${
        primary ? "" : "opacity-90"
      }`}
    >
      {researchDegraded ? (
        <EngineDegradationBanner
          mode={pack.collectionMode || "local_intel"}
          note={
            pack.collectionMode === "local_intel"
              ? "联网采集不足，当前报告主要来自本地情报骨架，不能当作已完成的市场调研。"
              : "公开检索来源不足，请补店访或修好检索后再确认。"
          }
          blockConfirm={pack.status !== "confirmed"}
        />
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] tracking-[0.14em] text-[#5f6b4e]">
            02 · MARKET RESEARCH · {modeLabel}
          </p>
          <h3 className="mt-1 font-serif-cn text-[22px] font-semibold text-[#141413]">
            市场调研报告
          </h3>
          {pack.scope ? (
            <p className="mt-2 text-[13px] leading-6 text-[#6f747b]">
              {pack.scope.city}
              {pack.scope.district ? `·${pack.scope.district}` : ""}
              {" · "}
              {pack.scope.businessFormat}/{pack.scope.category}
              {" · "}
              {pack.scope.brandStage}
              {" · 竞对 "}
              {pack.scope.rivals.slice(0, 3).join("、")}
            </p>
          ) : null}
        </div>
        {pack.status === "confirmed" ? (
          <span className="inline-flex items-center gap-1.5 border border-[rgba(95,107,78,0.35)] bg-[rgba(95,107,78,0.08)] px-3 py-1 text-[12px] text-[#5f6b4e]">
            <Check className="h-3.5 w-3.5" /> 已确认
          </span>
        ) : (
          <span className="border border-[rgba(165,107,77,0.4)] bg-[rgba(165,107,77,0.08)] px-3 py-1 text-[12px] text-[#a56b4d]">
            待你确认
          </span>
        )}
      </div>
      <p className="border-l-2 border-[#141413] pl-4 font-serif-cn text-[18px] leading-8 text-[#141413] md:text-[20px]">
        {pack.headline}
      </p>
      {pack.pillarCoverage ? (
        <div className="border border-[rgba(20,20,19,0.08)] bg-[var(--mpnt-field)] px-4 py-3">
          <p className="text-[11px] tracking-[0.12em] text-[#5f6b4e]">
            采集三柱 · {pack.pillarCoverage.allOk ? "已齐" : "未齐"}
          </p>
          <p className="mt-1 text-[13px] text-[#6f747b]">
            {pack.pillarCoverage.summary}
          </p>
          <ul className="mt-3 grid gap-2 md:grid-cols-3">
            {pack.pillarCoverage.pillars.map((p) => (
              <li
                key={p.id}
                className="border border-[rgba(20,20,19,0.08)] bg-white px-3 py-2 text-[12px]"
              >
                <p className="font-medium text-[#141413]">
                  {p.ok ? "✓" : "○"} {p.label}
                </p>
                <p className="mt-1 text-[#6f747b]">
                  {p.hitCount}/{p.requiredHits} · {p.detail}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {humanTruth ? (
        <div className="border border-[rgba(95,107,78,0.25)] bg-[rgba(95,107,78,0.06)] px-4 py-4">
          <p className="text-[11px] tracking-[0.12em] text-[#5f6b4e]">
            HUMAN TRUTH · 行为 → 矛盾 → 未满足 → 机会
          </p>
          <ol className="mt-3 grid gap-2 md:grid-cols-2">
            {[
              ["行为", humanTruth.behavior],
              ["隐藏矛盾", humanTruth.contradiction],
              ["未满足需求", humanTruth.unmetNeed],
              ["战略机会", humanTruth.strategicOpportunity],
            ].map(([k, v]) => (
              <li key={k} className="text-[13px] leading-6 text-[#2a2a28]">
                <span className="font-medium text-[#141413]">{k}：</span>
                {v}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {[
          ["品类趋势", pack.categoryTrend],
          ["客人变化", pack.consumerShift],
          ["竞争格局", pack.competitiveLandscape],
          ["可打空位", pack.whitespace],
        ].map(([title, body], i) => (
          <div
            key={title}
            className={`mpnt-rise border border-[rgba(20,20,19,0.08)] bg-[var(--mpnt-field)] p-4 mpnt-rise-delay-${i + 1}`}
          >
            <p className="text-[11px] tracking-[0.1em] text-[#5f6b4e]">
              {title}
            </p>
            <p className="mt-2 text-[14px] leading-7 text-[#2a2a28]">{body}</p>
          </div>
        ))}
      </div>
      {pack.competitorBriefs?.length ? (
        <div>
          <p className="text-[12px] font-medium tracking-[0.08em] text-[#5f6b4e]">
            竞对深描（摘要）
          </p>
          <ul className="mt-2 space-y-2">
            {pack.competitorBriefs.slice(0, 6).map((c) => (
              <li
                key={c.name}
                className="border border-[rgba(20,20,19,0.08)] px-3 py-2 text-[13px] leading-6 text-[#141413]"
              >
                <span className="font-medium">{c.name}</span>
                {c.mentalPosition ? (
                  <span className="text-[#6f747b]">
                    {" "}
                    · 心智词：{c.mentalPosition}
                  </span>
                ) : null}
                {c.evidenceSentence ? (
                  <span className="mt-1 block text-[12px] text-[#5f6b4e]">
                    证据：{c.evidenceSentence}
                  </span>
                ) : null}
                {c.threatToWhitespace ? (
                  <span className="mt-1 block text-[12px] text-[#a56b4d]">
                    威胁：{c.threatToWhitespace}
                  </span>
                ) : (
                  <span className="mt-1 block text-[#6f747b]">{c.summary}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {pack.storeVisitPlan?.tasks?.length ? (
        <div className="border border-[rgba(165,107,77,0.35)] bg-[rgba(165,107,77,0.05)] px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[12px] font-medium tracking-[0.08em] text-[#a56b4d]">
                {pack.storeVisitPlan.title}
              </p>
              <p className="mt-1 text-[12px] leading-5 text-[#6f747b]">
                {pack.storeVisitPlan.honestyNote}
              </p>
            </div>
            {filledCount > 0 ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => onRerunWithVisits?.()}
                className="border border-[#141413] bg-[#141413] px-3 py-1.5 text-[12px] text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                用店访证据重跑三席
              </button>
            ) : null}
          </div>
          {filledCount > 0 ? (
            <p className="mt-2 text-[12px] text-[#5f6b4e]">
              已回填 {filledCount} 家 · 竞对三联已升级 · 下游顾问/会议已作废，请重跑
            </p>
          ) : null}
          <ul className="mt-3 space-y-4">
            {pack.storeVisitPlan.tasks.slice(0, 5).map((t) => (
              <StoreVisitFillRow
                key={t.rivalName}
                task={t}
                busy={busy}
                whitespace={pack.whitespace}
                projectId={projectId}
                onSubmit={(data) =>
                  onFillVisit?.({
                    rivalName: t.rivalName,
                    ...data,
                  })
                }
              />
            ))}
          </ul>
        </div>
      ) : null}
      {pack.storeVisitInsight?.compares?.length ? (
        <div className="border border-[rgba(95,107,78,0.35)] bg-[rgba(95,107,78,0.05)] px-4 py-4">
          <p className="text-[12px] font-medium tracking-[0.08em] text-[#5f6b4e]">
            假说 vs 现场 · 空位修正建议
          </p>
          <p className="mt-1 text-[12px] leading-5 text-[#6f747b]">
            回填后自动对比；建议供确认，不自动改主空位。
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[28rem] border-collapse text-left text-[12px]">
              <thead>
                <tr className="border-b border-[rgba(20,20,19,0.12)] text-[#6f747b]">
                  <th className="py-1.5 pr-2 font-medium">竞对</th>
                  <th className="py-1.5 pr-2 font-medium">假说心智</th>
                  <th className="py-1.5 pr-2 font-medium">现场心智</th>
                  <th className="py-1.5 font-medium">结论</th>
                </tr>
              </thead>
              <tbody>
                {pack.storeVisitInsight.compares.map((c) => (
                  <tr
                    key={c.rivalName}
                    className="border-b border-[rgba(20,20,19,0.06)] text-[#141413]"
                  >
                    <td className="py-2 pr-2 font-medium">{c.rivalName}</td>
                    <td className="py-2 pr-2 text-[#6f747b]">
                      {c.hypothesisMental}
                    </td>
                    <td className="py-2 pr-2">{c.observedMental || "—"}</td>
                    <td className="py-2">
                      {c.verdict === "confirmed"
                        ? "一致"
                        : c.verdict === "partial"
                          ? "部分改写"
                          : c.verdict === "overturned"
                            ? "推翻"
                            : "未知"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-3 space-y-1.5 text-[12px] leading-5 text-[#6f747b]">
            {pack.storeVisitInsight.compares.map((c) => (
              <li key={`${c.rivalName}-note`}>
                <span className="font-medium text-[#141413]">{c.rivalName}</span>
                ：{c.deltaNote}
              </li>
            ))}
          </ul>
          {pack.storeVisitInsight.whitespaceSuggestion ? (
            <div className="mt-4 border border-[rgba(20,20,19,0.1)] bg-white px-3 py-3">
              <p className="text-[11px] tracking-[0.1em] text-[#5f6b4e]">
                空位建议 ·{" "}
                {pack.storeVisitInsight.whitespaceSuggestion.severity === "keep"
                  ? "维持"
                  : pack.storeVisitInsight.whitespaceSuggestion.severity ===
                      "sharpen"
                    ? "收紧"
                    : pack.storeVisitInsight.whitespaceSuggestion.severity ===
                        "pivot"
                      ? "校准"
                      : "避撞车"}
              </p>
              <p className="mt-2 text-[13px] leading-6 text-[#141413]">
                <span className="text-[#6f747b]">当前：</span>
                {pack.storeVisitInsight.whitespaceSuggestion.currentWhitespace}
              </p>
              <p className="mt-1 text-[14px] font-medium leading-6 text-[#141413]">
                <span className="text-[#6f747b] font-normal">建议：</span>
                {
                  pack.storeVisitInsight.whitespaceSuggestion
                    .suggestedWhitespace
                }
              </p>
              <p className="mt-2 text-[12px] leading-5 text-[#6f747b]">
                {pack.storeVisitInsight.whitespaceSuggestion.rationale}
              </p>
              <ul className="mt-2 space-y-1 text-[12px] leading-5 text-[#2a2a28]">
                {pack.storeVisitInsight.whitespaceSuggestion.actions.map((a) => (
                  <li key={a} className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#5f6b4e]" />
                    {a}
                  </li>
                ))}
              </ul>
              {pack.storeVisitInsight.whitespaceSuggestion.severity !==
              "keep" ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onAdoptWhitespace?.()}
                  className="mt-3 border border-[#141413] bg-[#141413] px-3 py-1.5 text-[12px] text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  采纳建议空位（清下游重跑）
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {pack.risks.length > 0 ? (
        <div>
          <p className="text-[12px] font-medium tracking-[0.08em] text-[#a56b4d]">
            风险提示
          </p>
          <ul className="mt-2 space-y-1.5 text-[13px] leading-6 text-[#6f747b]">
            {pack.risks.map((r) => (
              <li key={r} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#a56b4d]" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {pack.reportMarkdown ? (
        <div className="border border-[rgba(20,20,19,0.1)] bg-[var(--mpnt-paper)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[rgba(20,20,19,0.08)] px-4 py-3">
            <p className="text-[12px] font-medium tracking-[0.08em] text-[#5f6b4e]">
              调研报告
            </p>
            <p className="text-[11px] text-[#9aa0a6]">
              {pack.collectionMode === "live_crawl"
                ? "公开检索"
                : pack.collectionMode === "hybrid"
                  ? "检索+情报库"
                  : "情报库骨架"}
            </p>
          </div>
          <div className="px-4 py-5 md:px-6">
            <MpntReportDoc
              markdown={pack.reportMarkdown}
              maxHeightClass="max-h-[40rem]"
              showToc
            />
          </div>
        </div>
      ) : null}
      {pack.sources?.length ? (
        <details className="border border-[rgba(20,20,19,0.08)]">
          <summary className="cursor-pointer px-4 py-2 text-[12px] text-[#6f747b]">
            证据来源（{pack.sources.length}）
          </summary>
          <ul className="space-y-2 px-4 pb-3 text-[12px] leading-5 text-[#6f747b]">
            {pack.sources.slice(0, 12).map((s, i) => (
              <li key={`${s.url}-${i}`}>
                {s.url ? (
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#5f6b4e] underline-offset-2 hover:underline"
                  >
                    {s.title || s.url}
                  </a>
                ) : (
                  s.title
                )}
                {s.snippet ? ` — ${s.snippet.slice(0, 80)}` : ""}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
      {pack.evidenceNotes?.length ? (
        <p className="text-[11px] leading-5 text-[#9aa0a6]">
          备注：{pack.evidenceNotes.slice(0, 3).join("；")}
        </p>
      ) : null}
    </div>
  );
}

function AdvisorPanel({
  set,
  primary,
}: {
  set: NonNullable<
    BrandStrategyProject["assets"]["journey"]
  >["advisorStrategies"];
  primary?: boolean;
}) {
  if (!set) return null;
  const modeLabel =
    set.theoryMode === "llm_hybrid"
      ? "专家矩阵 · LLM hybrid"
      : set.theoryMode === "template_fallback"
        ? "模板降级（异常）"
        : "专家矩阵 · 商规/维度启发式";
  const schemeMode =
    set.masterSchemeMode === "llm_hybrid"
      ? "大师方案 · LLM 厚写"
      : "大师方案 · 启发式";
  return (
    <div className={`mpnt-rise space-y-5 ${primary ? "" : "opacity-95"}`}>
      <div>
        <p className="text-[11px] tracking-[0.14em] text-[#5f6b4e]">
          03 · EXPERT DOSSIER · {modeLabel} · {schemeMode}
        </p>
        <h3 className="mt-1 font-serif-cn text-[22px] font-semibold text-[#141413]">
          三位顾问
        </h3>
        <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[#6f747b]">
          {set.conflictSummary}
        </p>
        {set.crossFire?.gameSummary ? (
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#5f6b4e]">
            交火：{set.crossFire.gameSummary}
          </p>
        ) : null}
        <p className="mt-3 inline-flex border border-[rgba(165,107,77,0.35)] bg-[rgba(165,107,77,0.06)] px-3 py-1.5 text-[12px] text-[#a56b4d]">
          三席互斥 · 看差异，别揉成一团
        </p>
      </div>
      {set.strategyOptions?.options?.length ? (
        <div className="border border-[rgba(20,20,19,0.1)] bg-[rgba(20,20,19,0.02)] px-4 py-4 md:px-5">
          <p className="text-[11px] tracking-[0.12em] text-[#5f6b4e]">
            05 · 选一条路
          </p>
          <p className="mt-2 text-[13px] leading-6 text-[#6f747b]">
            {set.strategyOptions.mutualExclusionNote}
          </p>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">
            {set.strategyOptions.options.map((opt) => (
              <article
                key={opt.optionId}
                className="border border-[rgba(20,20,19,0.1)] bg-white px-4 py-4"
              >
                <p className="text-[11px] tracking-[0.1em] text-[#9aa0a6]">
                  {opt.title}
                </p>
                <p className="mt-2 font-serif-cn text-[16px] font-semibold leading-7 text-[#141413]">
                  {opt.claim}
                </p>
                <dl className="mt-3 space-y-2 text-[12px] leading-5 text-[#6f747b]">
                  <div>
                    <dt className="text-[#5f6b4e]">优势</dt>
                    <dd className="text-[#2a2a28]">{opt.advantage}</dd>
                  </div>
                  <div>
                    <dt className="text-[#a56b4d]">风险</dt>
                    <dd className="text-[#2a2a28]">{opt.risk}</dd>
                  </div>
                  <div>
                    <dt className="text-[#141413]">牺牲</dt>
                    <dd className="text-[#2a2a28]">{opt.sacrifice}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-3">
        {set.strategies.map((s, i) => {
          const meta = ADVISOR_META[s.advisorId];
          const dossier = s.theoryDossier;
          const rows: Array<[string, string]> = [
            ["给谁", s.forWhom],
            ["要解决", s.jobToBeDone],
            ["参照系", s.frameOfReference],
            ["差异点", s.pointOfDifference],
            ["可信理由", s.proof],
            ["必须牺牲", s.sacrifice],
          ];
          return (
            <article
              key={s.advisorId}
              className={`mpnt-seat mpnt-rise border border-[rgba(20,20,19,0.1)] border-t-[3px] bg-white mpnt-rise-delay-${i + 1} ${
                s.advisorId === "ries"
                  ? "border-t-[#5f6b4e]"
                  : s.advisorId === "trout"
                    ? "border-t-[#3d5a80]"
                    : "border-t-[#a56b4d]"
              }`}
            >
              <div className="border-b border-[rgba(20,20,19,0.08)] px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-10 w-10 items-center justify-center text-[15px] font-semibold ${ADVISOR_TONE[s.advisorId]}`}
                    >
                      {ADVISOR_INITIAL[s.advisorId]}
                    </span>
                    <div>
                    <p className="text-[15px] font-semibold text-[#141413]">
                      {meta.name}
                      {"code" in meta && meta.code ? (
                        <span className="ml-2 text-[11px] font-normal tracking-[0.08em] text-[#9aa0a6]">
                          {meta.code}
                        </span>
                      ) : null}
                    </p>
                      <p className="text-[12px] text-[#6f747b]">{meta.model}</p>
                    </div>
                  </div>
                  {dossier ? (
                    <div className="text-right">
                      <p className="font-serif-cn text-[22px] font-semibold leading-none text-[#141413]">
                        {dossier.totalScore}
                      </p>
                      <p className="mt-1 text-[10px] tracking-[0.08em] text-[#9aa0a6]">
                        {dossier.recommend}
                      </p>
                    </div>
                  ) : null}
                </div>
                <p className="mt-3 font-serif-cn text-[17px] font-semibold leading-7 text-[#141413]">
                  {s.oneLiner}
                </p>
                <p className="mt-2 text-[12px] leading-5 text-[#6f747b]">
                  {s.positioningStatement}
                </p>
              </div>
              {dossier?.dimensionBreakdown?.length ? (
                <div className="border-b border-[rgba(20,20,19,0.06)] bg-[var(--mpnt-field)] px-4 py-3">
                  <p className="text-[11px] tracking-[0.08em] text-[#5f6b4e]">
                    理论记分卡
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {dossier.dimensionBreakdown.slice(0, 8).map((d) => (
                      <li
                        key={`${d.name}-${d.note}`}
                        className="grid grid-cols-[1fr_auto] gap-2 text-[12px] leading-5"
                      >
                        <span className="text-[#141413]">
                          <span className="text-[#6f747b]">{d.name}</span>
                          {d.note ? ` · ${d.note}` : ""}
                        </span>
                        <span
                          className={
                            (d.score ?? 0) >= 0
                              ? "text-[#5f6b4e]"
                              : "text-[#a56b4d]"
                          }
                        >
                          {typeof d.score === "number"
                            ? `${d.score >= 0 ? "+" : ""}${d.score}`
                            : "—"}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {dossier.coreLogic ? (
                    <p className="mt-3 whitespace-pre-line text-[11px] leading-5 text-[#6f747b]">
                      {dossier.coreLogic.split("\n").slice(0, 6).join("\n")}
                    </p>
                  ) : null}
                </div>
              ) : null}
              <dl className="divide-y divide-[rgba(20,20,19,0.06)]">
                {rows.map(([k, v]) => (
                  <div
                    key={k}
                    className="grid grid-cols-[4.5rem_1fr] gap-2 px-4 py-2.5"
                  >
                    <dt className="text-[11px] tracking-[0.06em] text-[#9aa0a6]">
                      {k}
                    </dt>
                    <dd className="text-[13px] leading-5 text-[#141413]">{v}</dd>
                  </div>
                ))}
              </dl>
              <div className="space-y-1.5 border-t border-[rgba(20,20,19,0.08)] bg-[var(--mpnt-field)] px-4 py-3 text-[12px] leading-5">
                <p className="text-[#5f6b4e]">
                  证明 · 菜单：{s.proofPlan?.menu || "待补全"}
                </p>
                <p className="text-[#5f6b4e]">
                  证明 · 话术：{s.proofPlan?.script || "待补全"}
                </p>
                <p className="text-[#a56b4d]">不做：{s.doNotDo || "—"}</p>
                <p className="text-[#6f747b]">风险：{s.risk || "—"}</p>
              </div>
              {s.masterScheme ? (
                <MasterSchemeBlock scheme={s.masterScheme} />
              ) : null}
            </article>
          );
        })}
      </div>
      {set.crossFire?.challenges?.length ? (
        <div className="border border-[rgba(20,20,19,0.1)] bg-white px-4 py-4">
          <p className="text-[11px] tracking-[0.08em] text-[#a56b4d]">
            CROSS-FIRE · 理论开火点
          </p>
          <ul className="mt-3 space-y-2">
            {set.crossFire.challenges.slice(0, 6).map((c, idx) => (
              <li
                key={`${c.from}-${c.to}-${idx}`}
                className="text-[13px] leading-6 text-[#141413]"
              >
                <span className="text-[#6f747b]">
                  {c.from} → {c.to}
                  {c.severity ? ` · ${c.severity}` : ""}：
                </span>
                {c.attack}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

const MEETING_AGENDA = [
  { id: "call_to_order", label: "宣布开议" },
  { id: "pitch", label: "各述本案" },
  { id: "crossfire", label: "交叉质询" },
  { id: "rebuttal", label: "当场反驳" },
  { id: "revise", label: "修正策略表" },
  { id: "chair_synthesis", label: "主席综合" },
  { id: "founder_vote", label: "老板拍板" },
  { id: "resolution", label: "形成决议" },
] as const;

function WarRoomPanel({
  room,
  strategies,
  busy,
  blendNote,
  onBlendNote,
  onVote,
  primary,
}: {
  room: NonNullable<BrandStrategyProject["assets"]["journey"]>["warRoom"];
  strategies?: AdvisorStrategyCard[];
  busy?: boolean;
  blendNote: string;
  onBlendNote: (v: string) => void;
  onVote: (p: AdvisorId | "blend") => void;
  primary?: boolean;
}) {
  const phaseBlocks = useMemo(() => {
    const blocks: Array<{
      phase: string;
      turns: NonNullable<typeof room>["turns"];
    }> = [];
    if (!room) return blocks;
    for (const t of room.turns) {
      const phase = t.agendaLabel || t.agendaPhase || "会商进行中";
      const last = blocks[blocks.length - 1];
      if (last && last.phase === phase) last.turns.push(t);
      else blocks.push({ phase, turns: [t] });
    }
    return blocks;
  }, [room]);

  /** 渐进披露：逐段打开议程，避免剧本瞬间刷完 */
  const [visiblePhases, setVisiblePhases] = useState(1);
  useEffect(() => {
    setVisiblePhases(1);
    if (phaseBlocks.length <= 1) return;
    let n = 1;
    const timer = window.setInterval(() => {
      n += 1;
      setVisiblePhases(n);
      if (n >= phaseBlocks.length) window.clearInterval(timer);
    }, 520);
    return () => window.clearInterval(timer);
  }, [room?.roomId, phaseBlocks.length]);

  if (!room) return null;

  const awaiting =
    room.status === "awaiting_user" || room.status === "debating";
  const current =
    room.currentAgenda ||
    (awaiting ? "founder_vote" : room.status === "agreed" ? "resolution" : "pitch");

  const byId = Object.fromEntries(
    (strategies || []).map((s) => [s.advisorId, s]),
  ) as Partial<Record<AdvisorId, AdvisorStrategyCard>>;

  const shownBlocks = phaseBlocks.slice(0, visiblePhases);

  return (
    <div
      className={`mpnt-rise overflow-hidden border border-[rgba(20,20,19,0.1)] ${
        primary ? "" : "opacity-95"
      }`}
    >
      <div className="bg-[#141413] px-5 py-6 text-white md:px-7">
        <p className="text-[11px] tracking-[0.14em] text-white/50">
          04 · 会商
        </p>
        <h3 className="mt-1 font-serif-cn text-[22px] font-semibold">
          品牌会商
        </h3>
        <p className="mt-2 text-[14px] text-white/65">
          {room.agendaTitle || "有议程、有质询、有决议"}
        </p>

        <ol className="mt-5 flex flex-wrap gap-1.5">
          {MEETING_AGENDA.map((a) => {
            const active = a.id === current;
            const passed =
              MEETING_AGENDA.findIndex((x) => x.id === a.id) <
              MEETING_AGENDA.findIndex((x) => x.id === current);
            return (
              <li
                key={a.id}
                className={`border px-2.5 py-1 text-[11px] ${
                  active
                    ? "border-white bg-white text-[#141413]"
                    : passed
                      ? "border-white/30 text-white/80"
                      : "border-white/15 text-white/40"
                }`}
              >
                {a.label}
              </li>
            );
          })}
        </ol>

        {/* 会议桌席位 */}
        <div className="mt-8 flex flex-col items-center gap-6">
          <div className="flex justify-center gap-10">
            {(["ries", "trout", "ye"] as AdvisorId[]).map((id) => (
              <div key={id} className="flex flex-col items-center gap-2">
                <span
                  className={`flex h-11 w-11 items-center justify-center text-[14px] font-semibold ring-2 ring-white/20 ${ADVISOR_TONE[id]}`}
                >
                  {ADVISOR_INITIAL[id]}
                </span>
                <span className="text-[11px] text-white/75">
                  {ADVISOR_META[id].name}
                </span>
              </div>
            ))}
          </div>
          <div className="relative w-full max-w-md">
            <div className="mx-auto h-16 w-[85%] rounded-[100%] border border-white/25 bg-white/5" />
            <p className="absolute inset-0 flex items-center justify-center text-[11px] tracking-[0.16em] text-white/45">
              会商桌
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="flex h-11 w-11 items-center justify-center border border-white/50 text-[13px] font-semibold">
              你
            </span>
            <span className="text-[11px] text-white/75">老板 · 拍板</span>
          </div>
        </div>
      </div>

      <div className="max-h-[28rem] space-y-0 overflow-auto bg-[var(--mpnt-field)]">
        {shownBlocks.map((block) => (
          <div key={block.phase} className="mpnt-turn-in">
            <div className="sticky top-0 z-10 border-y border-[rgba(20,20,19,0.08)] bg-[#ebe8e0] px-5 py-2 text-[11px] font-medium tracking-[0.12em] text-[#5f6b4e] md:px-7">
              {block.phase}
            </div>
            {block.turns.map((t, i) => {
              const isChallenge = t.kind === "challenge";
              const isRebuttal = t.kind === "rebuttal";
              const isRevise = t.kind === "revise";
              const isUser = t.speaker === "user";
              const isHost = t.speaker === "host";
              return (
                <div
                  key={`${block.phase}-${i}-${t.at}`}
                  className={`border-b border-[rgba(20,20,19,0.06)] px-5 py-3.5 md:px-7 ${
                    isChallenge
                      ? "bg-[rgba(165,107,77,0.07)]"
                      : isRebuttal
                        ? "bg-[rgba(61,90,128,0.07)]"
                        : isRevise
                          ? "bg-[rgba(95,107,78,0.08)]"
                          : isUser
                            ? "bg-white"
                            : isHost
                              ? "bg-transparent"
                              : "bg-white/70"
                  }`}
                >
                  <p className="text-[11px] tracking-[0.08em] text-[#9aa0a6]">
                    {speakerLabel(t.speaker)}
                    {isChallenge ? " · 质询" : ""}
                    {isRebuttal ? " · 反驳" : ""}
                    {isRevise ? " · 改策" : ""}
                    {t.kind === "pitch" ? " · 亮策" : ""}
                    {t.kind === "decision" ? " · 决议" : ""}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-[14px] leading-6 text-[#141413]">
                    {t.text}
                  </p>
                </div>
              );
            })}
          </div>
        ))}
        {visiblePhases < phaseBlocks.length ? (
          <p className="px-5 py-3 text-[12px] text-[#6f747b] md:px-7">
            议程推进中…
          </p>
        ) : null}
      </div>

      {awaiting ? (
        <div className="space-y-4 border-t border-[rgba(20,20,19,0.08)] bg-white px-5 py-6 md:px-7">
          {room.decisionCard ? (
            <div className="mpnt-decision-card border border-[rgba(20,20,19,0.12)] bg-[var(--mpnt-field)]">
              <div className="border-b border-[rgba(20,20,19,0.08)] px-4 py-3 md:px-5">
                <p className="text-[11px] tracking-[0.12em] text-[#5f6b4e]">
                  一页纸决策卡
                </p>
                <p className="mt-1 font-serif-cn text-[18px] font-semibold text-[#141413]">
                  {room.decisionCard.title}
                </p>
                <p className="mt-1 text-[13px] text-[#6f747b]">
                  {room.decisionCard.subtitle}
                </p>
                <p className="mt-3 border-l-2 border-[#141413] pl-3 text-[14px] font-medium text-[#141413]">
                  {room.decisionCard.question}
                </p>
              </div>
              <div className="grid gap-0 divide-y divide-[rgba(20,20,19,0.08)] md:grid-cols-3 md:divide-x md:divide-y-0">
                {room.decisionCard.options.map((o) => (
                  <div key={o.advisorId} className="px-4 py-4 md:px-5">
                    <p className="text-[11px] tracking-[0.08em] text-[#5f6b4e]">
                      {o.seatName} · {o.seatCode}
                    </p>
                    <p className="mt-2 font-serif-cn text-[15px] font-semibold leading-6 text-[#141413]">
                      {o.oneLiner}
                    </p>
                    <p className="mt-3 text-[11px] tracking-[0.06em] text-[#9aa0a6]">
                      必须牺牲
                    </p>
                    <p className="mt-0.5 text-[12px] leading-5 text-[#2a2a28]">
                      {o.sacrifice}
                    </p>
                    <p className="mt-3 text-[11px] tracking-[0.06em] text-[#9aa0a6]">
                      本周证明
                    </p>
                    <p className="mt-0.5 text-[12px] leading-5 text-[#2a2a28]">
                      {o.thisWeekProof}
                    </p>
                    <p className="mt-3 text-[12px] leading-5 text-[#5f6b4e]">
                      选它：{o.ifChoose}
                    </p>
                  </div>
                ))}
              </div>
              <div className="border-t border-[rgba(20,20,19,0.08)] px-4 py-3 text-[12px] leading-5 text-[#6f747b] md:px-5">
                <p>{room.decisionCard.blendHint}</p>
                <p className="mt-1 font-medium text-[#a56b4d]">
                  {room.decisionCard.rule}
                </p>
              </div>
            </div>
          ) : null}
          <div>
            <p className="text-[11px] tracking-[0.12em] text-[#5f6b4e]">
              议程 5 · 老板拍板
            </p>
            <p className="mt-1 font-serif-cn text-[20px] font-semibold text-[#141413]">
              主轴选哪条？
            </p>
            <p className="mt-1 text-[13px] text-[#6f747b]">
              先读决策卡。三案互斥。选主轴，或折中并写清谁主谁辅。没有拍板不能散会。
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(ADVISOR_META) as AdvisorId[]).map((id) => (
              <button
                key={id}
                type="button"
                disabled={busy}
                onClick={() => onVote(id)}
                className="mpnt-seat border border-[rgba(20,20,19,0.12)] px-4 py-4 text-left hover:border-[#141413] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center text-[13px] ${ADVISOR_TONE[id]}`}
                >
                  {ADVISOR_INITIAL[id]}
                </span>
                <p className="mt-3 text-[14px] font-semibold text-[#141413]">
                  主轴 · {ADVISOR_META[id].name}
                </p>
                <p className="mt-1 text-[12px] leading-5 text-[#6f747b]">
                  {byId[id]?.oneLiner || ADVISOR_META[id].model}
                </p>
              </button>
            ))}
            <button
              type="button"
              disabled={busy}
              onClick={() => onVote("blend")}
              className="mpnt-seat border border-[#141413] bg-[#141413] px-4 py-4 text-left text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Sparkles className="h-4 w-4" />
              <p className="mt-3 text-[14px] font-semibold">折中（须写主辅）</p>
              <p className="mt-1 text-[12px] text-white/65">
                谁主轴、谁只做约束
              </p>
            </button>
          </div>
          <label className="block space-y-1.5">
            <span className="text-[12px] text-[#6f747b]">
              折中说明（选折中时必填更有用）
            </span>
            <input
              value={blendNote}
              onChange={(e) => onBlendNote(e.target.value)}
              className="w-full border border-[rgba(20,20,19,0.12)] bg-[var(--mpnt-field)] px-3 py-2.5 text-[14px] outline-none focus:border-[#141413]"
              placeholder="例：主轴用心智官的心智词；空位官只写不像谁；冲突官负责场合证明"
            />
          </label>
        </div>
      ) : null}

      {room.status === "agreed" && room.consensusOneLiner ? (
        <div className="border-t border-[rgba(95,107,78,0.3)] bg-[rgba(95,107,78,0.08)] px-5 py-5 md:px-7">
          <p className="text-[11px] tracking-[0.1em] text-[#5f6b4e]">
            会商决议
          </p>
          <p className="mt-1 font-serif-cn text-[18px] font-semibold leading-7 text-[#141413]">
            {room.consensusOneLiner}
          </p>
          {room.consensusStatement ? (
            <dl className="mt-4 grid gap-2 border border-[rgba(95,107,78,0.25)] bg-white/50 p-3 text-[13px] sm:grid-cols-2">
              {(
                [
                  ["给谁", room.consensusStatement.forAudience],
                  ["要解决", room.consensusStatement.whoNeed],
                  ["参照系", room.consensusStatement.ourBrandIs],
                  ["核心利益", room.consensusStatement.thatValue],
                  ["可信", room.consensusStatement.because],
                  ["不像", room.consensusStatement.unlike],
                ] as const
              ).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[11px] text-[#9aa0a6]">{k}</dt>
                  <dd className="text-[#141413]">{v}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function StrategyReportPanel({
  markdown,
  oneLiner,
  statement,
  confirmed,
  primary,
  contractFrozen,
  brandSystemComplete,
  signOffStatus,
  signedByName,
  busy,
  onSign,
  onExport,
}: {
  projectId: string;
  markdown?: string;
  oneLiner?: string;
  statement?: {
    forAudience: string;
    whoNeed: string;
    ourBrandIs: string;
    thatValue: string;
    because: string;
    unlike: string;
  };
  confirmed?: boolean;
  primary?: boolean;
  contractFrozen?: boolean;
  brandSystemComplete?: boolean;
  signOffStatus?: "draft" | "in_review" | "signed";
  signedByName?: string;
  busy?: boolean;
  onSign?: (signedBy: string) => Promise<void>;
  onExport?: (preview: boolean) => Promise<void>;
}) {
  const [signedBy, setSignedBy] = useState(signedByName || "");
  const signed = signOffStatus === "signed";

  function downloadJourneyMarkdown() {
    if (!markdown) return;
    const blob = new Blob([markdown], {
      type: "text/markdown;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `品牌定位策略报告_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const rows = statement
    ? [
        ["For 给谁", statement.forAudience],
        ["Who 要解决", statement.whoNeed],
        ["Is 参照系", statement.ourBrandIs],
        ["That 核心利益", statement.thatValue],
        ["Because 可信", statement.because],
        ["Unlike 不像谁", statement.unlike],
      ]
    : [];

  return (
    <div
      className={`mpnt-doc mpnt-rise border border-[rgba(20,20,19,0.1)] ${
        primary ? "" : ""
      }`}
    >
      <div className="border-b border-[rgba(20,20,19,0.08)] px-6 py-8 md:px-10 md:py-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[11px] tracking-[0.16em] text-[#5f6b4e]">
              05 · 定位方案
            </p>
            <h3 className="mt-2 font-serif-cn text-[26px] font-semibold tracking-[-0.02em] text-[#141413] md:text-[30px]">
              定位策略报告
            </h3>
            <p className="mt-2 text-[13px] text-[#6f747b]">
              陈述 · 牺牲 · 证明 — 不是宣传文案
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {confirmed ? (
              <span className="inline-flex items-center gap-1.5 border border-[rgba(95,107,78,0.4)] bg-white/60 px-3 py-1.5 text-[12px] text-[#5f6b4e]">
                <Check className="h-3.5 w-3.5" /> 已确认
              </span>
            ) : (
              <span className="border border-[rgba(165,107,77,0.45)] bg-white/60 px-3 py-1.5 text-[12px] text-[#a56b4d]">
                待确认
              </span>
            )}
            {signed ? (
              <span className="inline-flex items-center gap-1.5 border border-[rgba(95,107,78,0.4)] bg-white/60 px-3 py-1.5 text-[12px] text-[#5f6b4e]">
                <Check className="h-3.5 w-3.5" /> 已签字
                {signedByName ? ` · ${signedByName}` : ""}
              </span>
            ) : null}
            {markdown ? (
              <>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 border border-[rgba(20,20,19,0.15)] bg-white/70 px-3 py-1.5 text-[12px] text-[#141413] hover:border-[#141413]"
                >
                  打印呈交
                </button>
                <button
                  type="button"
                  onClick={downloadJourneyMarkdown}
                  className="inline-flex items-center gap-1.5 border border-[rgba(20,20,19,0.15)] bg-white/70 px-3 py-1.5 text-[12px] text-[#141413] hover:border-[#141413]"
                >
                  <Download className="h-3.5 w-3.5" />
                  导出会商稿
                </button>
              </>
            ) : null}
          </div>
        </div>

        {oneLiner ? (
          <blockquote className="mt-8 border-l-[3px] border-[#141413] pl-5">
            <p className="font-serif-cn text-[22px] font-semibold leading-9 text-[#141413] md:text-[26px]">
              {oneLiner}
            </p>
            <p className="mt-2 text-[12px] tracking-[0.08em] text-[#6f747b]">
              一句话定位
            </p>
          </blockquote>
        ) : null}

        {confirmed ? (
          <div className="mt-8 border border-[rgba(20,20,19,0.1)] bg-white/55 px-4 py-4 md:px-5">
            <p className="text-[12px] font-medium tracking-[0.1em] text-[#5f6b4e]">
              签字导出
            </p>
            <p className="mt-1 text-[13px] leading-6 text-[#6f747b]">
              {contractFrozen && brandSystemComplete
                ? "定位已定，签字后可导出。"
                : "确认后锁定方案；证据不足先补事实。"}
            </p>
            <div className="mt-4 flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3">
              {!signed ? (
                <>
                  <label className="min-w-0 flex-1 text-[12px] text-[#6f747b] sm:min-w-[160px]">
                    签字人
                    <input
                      value={signedBy}
                      onChange={(e) => setSignedBy(e.target.value)}
                      placeholder="你的名字"
                      className="mt-1 min-h-11 w-full border border-[rgba(20,20,19,0.15)] bg-white px-3 py-2 text-[14px] text-[#141413] outline-none focus:border-[#141413]"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy || !signedBy.trim() || !onSign}
                    onClick={() => void onSign?.(signedBy.trim())}
                    className="inline-flex min-h-11 items-center justify-center bg-[#141413] px-4 text-[13px] font-semibold text-white touch-manipulation disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    确认签字
                  </button>
                </>
              ) : null}
              <button
                type="button"
                disabled={busy || !onExport}
                onClick={() => void onExport?.(true)}
                className="inline-flex min-h-11 items-center justify-center gap-1.5 border border-[rgba(20,20,19,0.15)] bg-white px-4 text-[13px] text-[#141413] touch-manipulation disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-3.5 w-3.5" />
                预览草稿
              </button>
              {signed ? (
                <button
                  type="button"
                  disabled={busy || !onExport}
                  onClick={() => void onExport?.(false)}
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 bg-[#5f6b4e] px-4 text-[13px] font-semibold text-white touch-manipulation disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  导出方案
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {rows.length > 0 ? (
        <div className="px-6 py-7 md:px-10">
          <p className="text-[12px] font-medium tracking-[0.1em] text-[#5f6b4e]">
            标准定位陈述
          </p>
          <dl className="mt-4 divide-y divide-[rgba(20,20,19,0.08)] border border-[rgba(20,20,19,0.08)] bg-white/50">
            {rows.map(([k, v]) => (
              <div
                key={k}
                className="grid gap-1 px-4 py-3.5 sm:grid-cols-[7rem_1fr] sm:gap-4"
              >
                <dt className="text-[12px] tracking-[0.06em] text-[#6f747b]">
                  {k}
                </dt>
                <dd className="text-[15px] leading-6 text-[#141413]">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {markdown ? (
        <div className="border-t border-[rgba(20,20,19,0.08)] px-6 py-6 md:px-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <p className="text-[12px] font-medium tracking-[0.1em] text-[#5f6b4e]">
              完整报告正文
            </p>
            <p className="text-[11px] text-[#9aa0a6]">
              可导出 Markdown · 屏幕呈交排版如下
            </p>
          </div>
          <div className="border border-[rgba(20,20,19,0.08)] bg-white/60 px-4 py-5 md:px-6">
            <MpntReportDoc markdown={markdown} maxHeightClass="max-h-[42rem]" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RoadmapPanel({
  roadmap,
  primary,
}: {
  roadmap: NonNullable<
    BrandStrategyProject["assets"]["journey"]
  >["executionRoadmap"];
  primary?: boolean;
}) {
  const [copyHint, setCopyHint] = useState<string | null>(null);
  if (!roadmap) return null;
  const staff = roadmap.staffDelivery;

  async function copyText(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyHint(`已复制${label}`);
      window.setTimeout(() => setCopyHint(null), 2000);
    } catch {
      setCopyHint("复制失败，请长按选中文字");
      window.setTimeout(() => setCopyHint(null), 2500);
    }
  }

  function printStaffPack() {
    document.body.classList.add("mpnt-print-staff");
    const cleanup = () => {
      document.body.classList.remove("mpnt-print-staff");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    window.print();
    window.setTimeout(cleanup, 1500);
  }

  return (
    <div className={`mpnt-rise space-y-6 ${primary ? "" : ""}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] tracking-[0.14em] text-[#5f6b4e]">
            06 · EXECUTION PATH
          </p>
          <h3 className="mt-1 font-serif-cn text-[22px] font-semibold text-[#141413]">
            {roadmap.horizonDays} 天落地执行路径
          </h3>
          <p className="mt-2 max-w-xl text-[14px] leading-6 text-[#6f747b]">
            {roadmap.positioningOneLiner}
          </p>
        </div>
        {roadmap.status === "accepted" ? (
          <span className="inline-flex items-center gap-1.5 border border-[rgba(95,107,78,0.35)] bg-[rgba(95,107,78,0.08)] px-3 py-1 text-[12px] text-[#5f6b4e]">
            <Check className="h-3.5 w-3.5" /> 已确认执行
          </span>
        ) : null}
      </div>

      {staff ? (
        <div className="mpnt-staff-pack border border-[rgba(20,20,19,0.12)] bg-white">
          <div className="border-b border-[rgba(20,20,19,0.08)] px-4 py-3 md:px-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[11px] tracking-[0.12em] text-[#5f6b4e]">
                  店员怎么说
                  {staff.seatLabel ? ` · ${staff.seatLabel}` : ""}
                </p>
                <p className="mt-1 font-serif-cn text-[18px] font-semibold text-[#141413]">
                  一句话 · 迎客 · 不做
                </p>
                <p className="mt-1 text-[13px] text-[#6f747b]">
                  可贴吧台。店员只练这一套，别另起卖点。
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void copyText("墙卡", staff.wallCard)}
                  className="inline-flex items-center gap-1.5 border border-[rgba(20,20,19,0.16)] bg-white px-3 py-1.5 text-[12px] text-[#141413]"
                >
                  <Copy className="h-3.5 w-3.5" /> 复制墙卡
                </button>
                <button
                  type="button"
                  onClick={() => void copyText("迎客话术", staff.greetScript)}
                  className="inline-flex items-center gap-1.5 border border-[rgba(20,20,19,0.16)] bg-white px-3 py-1.5 text-[12px] text-[#141413]"
                >
                  <Copy className="h-3.5 w-3.5" /> 复制迎客话术
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void copyText("店员包", staff.markdown || staff.wallCard)
                  }
                  className="inline-flex items-center gap-1.5 border border-[rgba(20,20,19,0.16)] bg-white px-3 py-1.5 text-[12px] text-[#141413]"
                >
                  <Copy className="h-3.5 w-3.5" /> 复制整页
                </button>
                <button
                  type="button"
                  onClick={printStaffPack}
                  className="inline-flex items-center gap-1.5 border border-[#141413] bg-[#141413] px-3 py-1.5 text-[12px] text-white"
                >
                  <Printer className="h-3.5 w-3.5" /> 打印店员包
                </button>
              </div>
            </div>
            {copyHint ? (
              <p className="mt-2 text-[12px] text-[#5f6b4e]">{copyHint}</p>
            ) : null}
          </div>
          <div className="grid gap-0 md:grid-cols-3 md:divide-x md:divide-[rgba(20,20,19,0.08)]">
            <div className="px-4 py-4 md:px-5">
              <p className="text-[11px] tracking-[0.08em] text-[#9aa0a6]">
                一句话（背会）
              </p>
              <p className="mt-2 font-serif-cn text-[16px] font-semibold leading-7 text-[#141413]">
                {staff.oneLiner}
              </p>
            </div>
            <div className="border-t border-[rgba(20,20,19,0.08)] px-4 py-4 md:border-t-0 md:px-5">
              <p className="text-[11px] tracking-[0.08em] text-[#9aa0a6]">
                迎客脚本
              </p>
              <p className="mt-2 whitespace-pre-line text-[13px] leading-6 text-[#2a2a28]">
                {staff.greetScript}
              </p>
            </div>
            <div className="border-t border-[rgba(20,20,19,0.08)] px-4 py-4 md:border-t-0 md:px-5">
              <p className="text-[11px] tracking-[0.08em] text-[#a56b4d]">
                不做清单
              </p>
              <p className="mt-2 text-[13px] leading-6 text-[#2a2a28]">
                {staff.doNotSay}
              </p>
              <p className="mt-3 text-[11px] tracking-[0.06em] text-[#9aa0a6]">
                本周菜单证明
              </p>
              <p className="mt-1 text-[12px] leading-5 text-[#5f6b4e]">
                {staff.menuProof}
              </p>
            </div>
          </div>
          <details
            open
            className="border-t border-[rgba(20,20,19,0.08)] px-4 py-3 md:px-5"
          >
            <summary className="cursor-pointer text-[12px] text-[#6f747b]">
              墙上作战卡（一键复制上方按钮）
            </summary>
            <pre className="mt-2 whitespace-pre-wrap font-sans text-[12px] leading-5 text-[#141413]">
              {staff.wallCard}
            </pre>
          </details>
        </div>
      ) : null}

      <ol className="relative space-y-0 pl-2">
        <div className="mpnt-timeline-line absolute bottom-4 left-[19px] top-4 w-px" />
        {roadmap.milestones.map((m, i) => (
          <li
            key={m.milestoneId}
            className={`mpnt-rise relative flex gap-4 pb-6 mpnt-rise-delay-${Math.min(i + 1, 3)}`}
          >
            <div className="relative z-[1] flex h-10 w-10 shrink-0 items-center justify-center border border-[#141413] bg-white text-[12px] font-semibold text-[#141413]">
              W{m.weekStart}
            </div>
            <div className="min-w-0 flex-1 border border-[rgba(20,20,19,0.1)] bg-white p-4 md:p-5">
              <p className="text-[12px] text-[#5f6b4e]">
                第 {m.weekStart}–{m.weekEnd} 周 · {m.ownerHint}
              </p>
              <p className="mt-1 text-[16px] font-semibold text-[#141413]">
                {m.title}
              </p>
              <ul className="mt-3 space-y-1.5 text-[13px] leading-6 text-[#6f747b]">
                {m.actions.map((a) => (
                  <li key={a} className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#5f6b4e]" />
                    {a}
                  </li>
                ))}
              </ul>
              <p className="mt-3 border-t border-[rgba(20,20,19,0.06)] pt-3 text-[12px] text-[#9aa0a6]">
                完成标准：{m.doneWhen}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function speakerLabel(s: string): string {
  if (s === "host") return "主持人";
  if (s === "user") return "老板";
  if (s === "ries" || s === "trout" || s === "ye") return ADVISOR_META[s].name;
  return s;
}
