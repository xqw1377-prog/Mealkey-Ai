"use client";

/**
 * M-MKT / M-BIZ / M-ED 共用六步咨询工作台
 * 视觉与交互对齐 M-PNT 品牌战略委员会
 */
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  Download,
  Loader2,
  Printer,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { BrandSwitcher } from "@/components/operating/BrandSwitcher";
import { ConfirmDialog } from "@/components/operating/ConfirmDialog";
import { EngineDegradationBanner } from "@/components/operating/EngineDegradationBanner";
import { MpntReportDoc } from "@/components/operating/MpntReportDoc";
import { PageErrorState, PageLoadingState } from "@/components/operating/PageState";
import { SeatPrimaryFactsEditor } from "@/components/operating/SeatPrimaryFactsEditor";
import { PRODUCT_BRAND_TITLE } from "@/lib/product-brand";
import { trpc } from "@/lib/trpc";
import {
  SIX_STEP_ORDER,
  SixStepId,
  type AgentConsultingBlueprint,
  type AgentConsultingProject,
  type ConsultingAgentKind,
  type DecisionArtifact,
  type JourneyNextStep,
  type ResearchPack,
} from "../../../../../packages/agents/src/consulting-os";

function stepRank(step: SixStepId) {
  return SIX_STEP_ORDER.indexOf(step);
}

function researchPackToMarkdown(pack: ResearchPack, title: string): string {
  const lines = [
    `# ${title}`,
    ``,
    `> ${pack.headline}`,
    ``,
    ...pack.sections.flatMap((s) => [`## ${s.title}`, ``, s.body, ``]),
  ];
  if (pack.risks?.length) {
    lines.push(`## 风险提示`, ``, ...pack.risks.map((r) => `- ${r}`), ``);
  }
  return lines.join("\n");
}

const ADVISOR_TOP_BORDER = [
  "border-t-[#5f6b4e]",
  "border-t-[#3d5a80]",
  "border-t-[#a56b4d]",
  "border-t-[#6b5a4e]",
];

const MEETING_AGENDA = [
  { id: "call_to_order", label: "宣布开会" },
  { id: "pitch", label: "各述本案" },
  { id: "crossfire", label: "交叉质询" },
  { id: "rebuttal", label: "当场反驳" },
  { id: "revise", label: "修正策略表" },
  { id: "chair_synthesis", label: "主席综合" },
  { id: "founder_vote", label: "老板拍板" },
  { id: "resolution", label: "形成决议" },
] as const;

const TURN_KIND_LABEL: Record<string, string> = {
  host: "主持",
  pitch: "亮策",
  challenge: "质询",
  rebuttal: "反驳",
  revise: "改策",
  synthesis: "综合",
  vote: "投票",
  decision: "决议",
};

const DELIVERY_PACK_BY_AGENT: Record<
  ConsultingAgentKind,
  { eyebrow: string; title: string; lines: string[] }
> = {
  "m-mkt": {
    eyebrow: "进入作战卡",
    title: "进入作战卡（可贴试点店）",
    lines: [
      "城市 / 场景切口 / 主推品",
      "成功指标：复购 · 客单 · 原话",
      "杀出线：未达标不扩第二点",
    ],
  },
  "m-biz": {
    eyebrow: "模式作战卡",
    title: "模式作战卡（可贴周会）",
    lines: [
      "唯一北极星（利润 / 增长 / 品牌）",
      "主推品与单位经济周报",
      "可交接 SOP 一页纸",
    ],
  },
  "m-ed": {
    eyebrow: "协议清单包",
    title: "协议清单包（可交律师）",
    lines: [
      "控制权底线与否决事项",
      "章程 / 股东协议 / vesting",
      "激励池比例与融资缓冲",
    ],
  },
};

type RouterKey = "mMktConsulting" | "mBizConsulting" | "mEdConsulting";

const ROUTER_BY_AGENT: Record<ConsultingAgentKind, RouterKey> = {
  "m-mkt": "mMktConsulting",
  "m-biz": "mBizConsulting",
  "m-ed": "mEdConsulting",
};

const CONSULTING_LABEL_BY_AGENT: Record<ConsultingAgentKind, string> = {
  "m-mkt": "市场机会咨询",
  "m-biz": "商业模式咨询",
  "m-ed": "股权设计咨询",
};

export function AgentConsultingWorkspace({
  projectId,
  agentId,
}: {
  projectId: string;
  agentId: ConsultingAgentKind;
}) {
  const consultingLabel = CONSULTING_LABEL_BY_AGENT[agentId];
  const routerKey = ROUTER_BY_AGENT[agentId];
  const utils = trpc.useUtils();
  // 三席 router 同构；按 agent 选客户端
  const api = (trpc as any)[routerKey] as typeof trpc.mMktConsulting;

  const { data, isLoading, error } = api.getProject.useQuery({ projectId });
  const invalidate = () => {
    switch (agentId) {
      case "m-mkt":
        return utils.mMktConsulting.getProject.invalidate({ projectId });
      case "m-biz":
        return utils.mBizConsulting.getProject.invalidate({ projectId });
      case "m-ed":
        return utils.mEdConsulting.getProject.invalidate({ projectId });
    }
  };

  const saveBasics = api.saveBasics.useMutation({ onSuccess: invalidate });
  const answerFollowup = api.answerFollowup.useMutation({
    onSuccess: invalidate,
  });
  const runResearch = api.runResearch.useMutation({ onSuccess: invalidate });
  const confirmResearch = api.confirmResearch.useMutation({
    onSuccess: invalidate,
  });
  const upsertPrimaryFacts = api.upsertPrimaryFacts.useMutation({
    onSuccess: invalidate,
  });
  const openWarRoom = api.openWarRoom.useMutation({ onSuccess: invalidate });
  const voteWarRoom = api.voteWarRoom.useMutation({ onSuccess: invalidate });
  const confirmStrategy = api.confirmStrategy.useMutation({
    onSuccess: invalidate,
  });
  const acceptExecution = api.acceptExecution.useMutation({
    onSuccess: invalidate,
  });
  const signReport = api.signReport.useMutation({ onSuccess: invalidate });
  const exportPackage = api.exportPackage.useMutation();
  const reset = api.reset.useMutation({ onSuccess: invalidate });

  const [blendNote, setBlendNote] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [basicsForm, setBasicsForm] = useState<Record<string, string>>({});
  const [followupAnswer, setFollowupAnswer] = useState("");
  const [basicsHydrated, setBasicsHydrated] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  const consulting = data?.consulting as AgentConsultingProject | undefined;
  const blueprint = data?.blueprint as AgentConsultingBlueprint | undefined;
  const nextStep = data?.nextStep as JourneyNextStep | undefined;
  const basicsFields = (data?.basicsFields || []) as Array<{
    key: string;
    label: string;
    prompt: string;
    placeholder: string;
    requirement: "must" | "should";
    minLength: number;
  }>;
  const followupUi = data?.followupUi as
    | {
        status: string;
        questions: Array<{
          id: string;
          prompt: string;
          whyNeeded: string;
          priority: string;
          answered: boolean;
        }>;
      }
    | null
    | undefined;
  const intakeChecklist = data?.intakeChecklist as
    | {
        summary: string;
        items: Array<{
          id: string;
          label: string;
          source: string;
          ok: boolean;
          detail: string;
        }>;
        canCompleteIntake: boolean;
        canConfirmResearch: boolean;
      }
    | undefined;

  useEffect(() => {
    if (!data?.basicsUi || basicsHydrated) return;
    const values = (data.basicsUi as { values?: Record<string, string> })
      .values;
    if (values) setBasicsForm(values);
    setBasicsHydrated(true);
  }, [data?.basicsUi, basicsHydrated]);

  const pending =
    saveBasics.isPending ||
    answerFollowup.isPending ||
    runResearch.isPending ||
    confirmResearch.isPending ||
    upsertPrimaryFacts.isPending ||
    openWarRoom.isPending ||
    voteWarRoom.isPending ||
    confirmStrategy.isPending ||
    acceptExecution.isPending ||
    signReport.isPending ||
    exportPackage.isPending ||
    reset.isPending;

  const basicsReady = basicsFields
    .filter((f) => f.requirement === "must")
    .every((f) => (basicsForm[f.key] || "").trim().length >= f.minLength);

  const currentFollowup = useMemo(() => {
    if (!followupUi?.questions?.length) return null;
    return followupUi.questions.find((q) => !q.answered) || null;
  }, [followupUi]);

  async function run(fn: () => Promise<unknown>) {
    setActionError(null);
    try {
      await fn();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "操作失败");
    }
  }

  async function handleCta() {
    if (!nextStep) return;
    switch (nextStep.actionId) {
      case "intake.continue":
        document.getElementById("step-intake")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        return;
      case "research.run":
        await run(() => runResearch.mutateAsync({ projectId }));
        return;
      case "research.confirm": {
        const research = (
          data?.consulting as AgentConsultingProject | undefined
        )?.assets?.research;
        if (research?.collectionMode === "heuristic") {
          setActionError(
            "已降级，不能当正式确认。修好外呼或补来源后再往下。",
          );
          return;
        }
        await run(() => confirmResearch.mutateAsync({ projectId }));
        return;
      }
      case "advisors.run":
      case "warroom.open":
        await run(() => openWarRoom.mutateAsync({ projectId }));
        return;
      case "warroom.vote":
        document.getElementById("step-warroom-vote")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        return;
      case "strategy.confirmReport":
        await run(() => confirmStrategy.mutateAsync({ projectId }));
        return;
      case "execution.generate":
      case "execution.accept":
        await run(() => acceptExecution.mutateAsync({ projectId }));
        return;
      default:
        return;
    }
  }

  if (isLoading) {
    return (
      <PageLoadingState
        eyebrow={consultingLabel}
        title="正在打开…"
        description="准备这一轮咨询。"
      />
    );
  }

  if (error || !consulting || !blueprint || !nextStep) {
    return (
      <PageErrorState
        eyebrow={consultingLabel}
        title="暂时打不开"
        description={error?.message || "回能力页再进一次。"}
        primaryAction={{
          href: `/projects/${projectId}/capability`,
          label: "回能力",
        }}
      />
    );
  }

  const focus = nextStep.step;
  const done = nextStep.actionId === "done";
  const assets = consulting.assets;
  const advisorsMeta = Object.fromEntries(
    blueprint.advisors.map((a) => [a.id, a]),
  );
  const flowDescription = [
    "采集",
    blueprint.stepLabels[SixStepId.RESEARCH].title,
    blueprint.stepLabels[SixStepId.ADVISORS].title,
    blueprint.stepLabels[SixStepId.WAR_ROOM].title,
    blueprint.reportTitle,
    blueprint.stepLabels[SixStepId.EXECUTION_PATH].title,
  ].join(" → ");

  return (
    <div className="mpnt-atelier mx-auto max-w-4xl space-y-8 pb-[calc(env(safe-area-inset-bottom)+12.5rem)] pt-6 md:pb-20 md:pt-10">
      <header className="space-y-4 px-1">
        <p className="text-[11px] font-medium tracking-[0.18em] text-[#5f6b4e]">
          {blueprint.committeeName}
        </p>
        <h1 className="font-serif-cn text-[32px] font-semibold leading-[1.15] tracking-[-0.03em] text-[#141413] md:text-[40px]">
          {blueprint.productName}
        </h1>
        <p className="max-w-2xl text-[15px] leading-7 text-[#6f747b]">
          {done
            ? "本轮做完了。可回看报告，或重置再开一轮。"
            : "按步骤走完：说清楚 → 调研 → 开会 → 确认 → 落地。"}
        </p>
        <BrandSwitcher projectId={projectId} variant="full" />
      </header>

      <section className="mpnt-atelier overflow-hidden border border-[rgba(20,20,19,0.1)] bg-[var(--mpnt-paper)]">
        <div className="border-b border-[rgba(20,20,19,0.08)] px-5 py-7 md:px-8 md:py-9">
          <p className="text-[11px] font-medium tracking-[0.18em] text-[#5f6b4e]">
            {PRODUCT_BRAND_TITLE} · {blueprint.committeeName}
          </p>
          <h2 className="mt-3 font-serif-cn text-[28px] font-semibold text-[#141413] md:text-[34px]">
            {done ? "本轮已完成" : nextStep.label.title}
          </h2>
          <p className="mt-2 text-[15px] leading-7 text-[#6f747b]">
            {done
              ? "报告已定，可看落地路径。"
              : nextStep.label.feel}
          </p>
          <p className="mt-2 text-[13px] leading-6 text-[#6f747b]">
            {flowDescription}
          </p>
          <ol className="mpnt-step-rail mt-7 flex gap-2 overflow-x-auto pb-1 snap-x snap-mandatory lg:grid lg:grid-cols-6 lg:overflow-visible lg:pb-0 lg:snap-none">
            {SIX_STEP_ORDER.map((step, i) => {
              const meta = blueprint.stepLabels[step];
              const active = step === focus;
              const passed = stepRank(step) < stepRank(focus) || done;
              return (
                <li
                  key={step}
                  className={`mpnt-rise relative min-h-14 min-w-[6.25rem] shrink-0 snap-start border px-3 py-3 lg:min-h-0 lg:min-w-0 lg:px-2.5 lg:py-2.5 ${
                    active
                      ? "border-[#141413] bg-[#141413] text-white"
                      : passed
                        ? "border-[rgba(95,107,78,0.35)] bg-[rgba(95,107,78,0.08)] text-[#5f6b4e]"
                        : "border-[rgba(20,20,19,0.08)] text-[#9aa0a6]"
                  }`}
                  style={{ animationDelay: `${i * 0.04}s` }}
                >
                  <p className="text-[10px] tracking-[0.12em] opacity-75">
                    {meta.no}
                  </p>
                  <p className="mt-1 text-[13px] font-medium leading-4">
                    {meta.title}
                  </p>
                  {passed && !active ? (
                    <Check className="absolute right-1.5 top-1.5 h-3 w-3 opacity-70" />
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>

        <div
          className={`mpnt-sticky-cta sticky top-0 z-30 flex flex-col gap-3 border-b px-5 py-4 md:flex-row md:items-center md:justify-between md:px-8 ${
            done
              ? "border-[rgba(95,107,78,0.3)] bg-[rgba(95,107,78,0.1)]"
              : "border-[#141413] bg-[#141413] text-white"
          }`}
        >
          <div>
            <p
              className={`text-[11px] tracking-[0.12em] ${
                done ? "text-[#5f6b4e]" : "text-white/55"
              }`}
            >
              {done ? "已交付" : "现在 · 只做这一步"}
            </p>
            <p
              className={`mt-1 text-[16px] font-semibold ${
                done ? "text-[#141413]" : "text-white"
              }`}
            >
              {nextStep.title}
            </p>
            <p
              className={`mt-0.5 text-[13px] ${
                done ? "text-[#5f6b4e]" : "text-white/65"
              }`}
            >
              {nextStep.detail}
            </p>
          </div>
          {nextStep.actionId !== "done" ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => void handleCta()}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-white px-5 text-[14px] font-semibold text-[#141413] touch-manipulation active:scale-[0.98] disabled:opacity-50 md:min-h-11 md:w-auto"
            >
              {pending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {nextStep.actionId === "research.run"
                    ? "情报采集中…"
                    : nextStep.actionId === "research.confirm"
                      ? "生成顾问案卷…"
                      : nextStep.actionId === "warroom.open"
                        ? "开会中…"
                        : nextStep.actionId === "strategy.confirmReport"
                          ? "生成报告中…"
                          : nextStep.actionId === "execution.generate" ||
                              nextStep.actionId === "execution.accept"
                            ? "生成执行路径…"
                            : "处理中…"}
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4" />
                  {nextStep.actionId === "warroom.vote"
                    ? "滚到拍板区"
                    : nextStep.ctaLabel}
                </>
              )}
            </button>
          ) : null}
        </div>

        <div className="space-y-8 px-5 py-7 md:px-8 md:py-9">
          {assets.research &&
          (focus === SixStepId.RESEARCH ||
            stepRank(focus) > stepRank(SixStepId.RESEARCH) ||
            done) ? (
            <ResearchBlock
              pack={assets.research}
              title={blueprint.stepLabels[SixStepId.RESEARCH].title}
              agentId={agentId}
              primary={focus === SixStepId.RESEARCH}
              primaryFacts={assets.primaryFacts}
              factsLocked={assets.signOffStatus === "signed"}
              factsPending={upsertPrimaryFacts.isPending}
              onSaveFacts={async (facts) => {
                try {
                  await upsertPrimaryFacts.mutateAsync({ projectId, facts });
                } catch (e) {
                  throw new Error(
                    e instanceof Error ? e.message : "保存事实失败",
                  );
                }
              }}
            />
          ) : null}

          {assets.advisors &&
          (focus === SixStepId.ADVISORS ||
            focus === SixStepId.WAR_ROOM ||
            stepRank(focus) > stepRank(SixStepId.WAR_ROOM) ||
            done) ? (
            <AdvisorsBlock
              set={assets.advisors}
              meta={advisorsMeta}
              title={blueprint.stepLabels[SixStepId.ADVISORS].title}
              primary={focus === SixStepId.ADVISORS}
            />
          ) : null}

          {assets.warRoom &&
          (focus === SixStepId.WAR_ROOM ||
            stepRank(focus) > stepRank(SixStepId.WAR_ROOM) ||
            done) ? (
            <WarRoomBlock
              room={assets.warRoom}
              advisors={blueprint.advisors}
              strategies={assets.advisors?.strategies}
              title={blueprint.stepLabels[SixStepId.WAR_ROOM].title}
              agentId={agentId}
              busy={pending}
              blendNote={blendNote}
              onBlendNote={setBlendNote}
              primary={focus === SixStepId.WAR_ROOM}
              onVote={(preference) =>
                void run(() =>
                  voteWarRoom.mutateAsync({
                    projectId,
                    preference,
                    blendNote: blendNote || undefined,
                  }),
                )
              }
            />
          ) : null}

          {assets.warRoom?.status === "agreed" &&
          (focus === SixStepId.STRATEGY_LOCK ||
            focus === SixStepId.EXECUTION_PATH ||
            done) ? (
            <ReportBlock
              title={blueprint.reportTitle}
              committeeName={blueprint.committeeName}
              oneLiner={assets.warRoom.consensusOneLiner}
              bullets={assets.warRoom.consensusBullets}
              decision={assets.decisionArtifact}
              markdown={assets.strategyReportMarkdown}
              confirmed={Boolean(assets.strategyConfirmedAt)}
              primary={focus === SixStepId.STRATEGY_LOCK}
              enableSignOff={
                agentId === "m-biz" ||
                agentId === "m-mkt" ||
                agentId === "m-ed"
              }
              contractFrozen={
                agentId === "m-mkt"
                  ? assets.entryContract?.status === "frozen"
                  : agentId === "m-ed"
                    ? assets.governanceContract?.status === "frozen"
                    : assets.modeContract?.status === "frozen"
              }
              signOffStatus={assets.signOffStatus}
              signedByName={assets.signedBy}
              signOffLabel={
                agentId === "m-mkt"
                  ? "方案已定，签字后可导出。"
                  : agentId === "m-ed"
                    ? "方案已定，签字后可导出。"
                    : "方案已定，签字后可导出。"
              }
              busy={pending}
              onSign={async (signedBy) => {
                await run(() =>
                  signReport.mutateAsync({ projectId, signedBy }),
                );
              }}
              onExport={async (preview) => {
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
                  setActionError(
                    e instanceof Error ? e.message : "导出失败",
                  );
                }
              }}
            />
          ) : null}

          {assets.executionRoadmap &&
          (focus === SixStepId.EXECUTION_PATH || done) ? (
            <RoadmapBlock
              roadmap={assets.executionRoadmap}
              title={blueprint.stepLabels[SixStepId.EXECUTION_PATH].title}
              agentId={agentId}
              primary={focus === SixStepId.EXECUTION_PATH || done}
            />
          ) : null}

          {!assets.research && focus === SixStepId.RESEARCH ? (
            <div className="mpnt-rise border border-dashed border-[rgba(20,20,19,0.15)] px-6 py-10 text-center">
              <Sparkles className="mx-auto h-5 w-5 text-[#5f6b4e]" />
              <p className="mt-3 font-serif-cn text-[20px] text-[#141413]">
                {blueprint.stepLabels[SixStepId.RESEARCH].title}准备开始
              </p>
              <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-[#6f747b]">
                点上方黑条开始{blueprint.stepLabels[SixStepId.RESEARCH].title}，不是空白表单。
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {actionError ? (
        <section className="border border-[rgba(165,107,77,0.35)] bg-[rgba(165,107,77,0.08)] px-4 py-3 text-[14px] text-[#a56b4d]">
          {actionError}
        </section>
      ) : null}

      {consulting.intakeStatus !== "complete" ? (
        <section
          id="step-intake"
          className="mpnt-rise border border-[rgba(20,20,19,0.1)] bg-white"
        >
          <div className="border-b border-[rgba(20,20,19,0.08)] bg-[var(--mpnt-field)] px-5 py-4 md:px-7">
            <p className="text-[11px] tracking-[0.14em] text-[#5f6b4e]">
              01 · INTAKE · 对齐 M-PNT
            </p>
            <p className="mt-1 text-[14px] text-[#6f747b]">
              第一轮基础档案 → 第二轮动态追问 → 工具调研
            </p>
          </div>
          <div className="space-y-6 p-5 md:p-7">
            {intakeChecklist ? (
              <div className="border border-[rgba(20,20,19,0.08)] bg-[var(--mpnt-field)] px-4 py-3 text-[13px]">
                <p className="font-medium text-[#141413]">信息收集清单</p>
                <p className="mt-1 text-[#6f747b]">{intakeChecklist.summary}</p>
                <ul className="mt-2 space-y-1">
                  {intakeChecklist.items.slice(0, 8).map((item) => (
                    <li key={item.id} className="flex gap-2 text-[12px]">
                      <span className={item.ok ? "text-[#5f6b4e]" : "text-[#a56b4d]"}>
                        {item.ok ? "✓" : "○"}
                      </span>
                      <span className="text-[#141413]">{item.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {consulting.assets.basics?.status !== "complete" ? (
              <div className="space-y-4">
                <h2 className="font-serif-cn text-[22px] font-semibold text-[#141413]">
                  基础档案（固定必填）
                </h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {basicsFields.map((field) => (
                    <label
                      key={field.key}
                      className={`flex flex-col gap-1 ${
                        field.key.includes("pain") ||
                        field.key.includes("rivals") ||
                        field.key.includes("capTable") ||
                        field.key.includes("unitEconomics")
                          ? "md:col-span-2"
                          : ""
                      }`}
                    >
                      <span className="text-[13px] font-medium text-[#141413]">
                        {field.label}
                        {field.requirement === "must" ? (
                          <span className="ml-1 text-[#a56b4d]">*</span>
                        ) : null}
                      </span>
                      <span className="text-[12px] text-[#6f747b]">
                        {field.prompt}
                      </span>
                      <input
                        value={basicsForm[field.key] || ""}
                        disabled={pending}
                        placeholder={field.placeholder}
                        onChange={(e) =>
                          setBasicsForm((prev) => ({
                            ...prev,
                            [field.key]: e.target.value,
                          }))
                        }
                        className="min-h-11 border border-[rgba(20,20,19,0.12)] bg-[var(--mpnt-field)] px-3 text-[14px] outline-none focus:border-[#141413]"
                      />
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  disabled={pending || !basicsReady}
                  onClick={() =>
                    void run(() =>
                      saveBasics.mutateAsync({
                        projectId,
                        basics: basicsForm,
                        complete: true,
                      }),
                    )
                  }
                  className="inline-flex min-h-12 items-center gap-2 bg-[#141413] px-6 text-[15px] font-semibold text-white disabled:opacity-40"
                >
                  {saveBasics.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  档案齐了，生成动态追问
                </button>
              </div>
            ) : currentFollowup ? (
              <div className="space-y-4">
                <h2 className="font-serif-cn text-[22px] font-semibold text-[#141413]">
                  动态追问
                </h2>
                <p className="text-[17px] font-medium text-[#141413]">
                  {currentFollowup.prompt}
                </p>
                <p className="text-[13px] text-[#6f747b]">
                  为什么问：{currentFollowup.whyNeeded}
                </p>
                <div className="flex gap-2">
                  <input
                    value={followupAnswer}
                    onChange={(e) => setFollowupAnswer(e.target.value)}
                    className="min-h-12 flex-1 border border-[rgba(20,20,19,0.12)] px-3 text-[14px] outline-none focus:border-[#141413]"
                    placeholder="用具体事实回答"
                  />
                  <button
                    type="button"
                    disabled={pending || followupAnswer.trim().length < 2}
                    onClick={() =>
                      void run(async () => {
                        await answerFollowup.mutateAsync({
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
                采集将完成编译，请稍候或点击上方「开始工具调研」。
              </p>
            )}
          </div>
        </section>
      ) : null}

      <button
        type="button"
        disabled={pending}
        onClick={() => setResetOpen(true)}
        className="inline-flex items-center gap-2 text-[13px] text-[#6f747b]"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        重置咨询项目
      </button>

      <ConfirmDialog
        open={resetOpen}
        title="重置这一轮？"
        description="进度会清空，需重新开始。"
        confirmLabel="确认重置"
        danger
        busy={reset.isPending}
        onCancel={() => setResetOpen(false)}
        onConfirm={() => {
          void run(async () => {
            await reset.mutateAsync({ projectId });
            setBasicsHydrated(false);
            setBasicsForm({});
            setResetOpen(false);
          });
        }}
      />
    </div>
  );
}

function ResearchBlock({
  pack,
  title,
  agentId,
  primary,
  primaryFacts,
  factsLocked,
  factsPending,
  onSaveFacts,
}: {
  pack: NonNullable<AgentConsultingProject["assets"]["research"]>;
  title: string;
  agentId: ConsultingAgentKind;
  primary?: boolean;
  primaryFacts?: AgentConsultingProject["assets"]["primaryFacts"];
  factsLocked?: boolean;
  factsPending?: boolean;
  onSaveFacts?: (
    facts: Array<{ factId?: string; claim: string; sourceRef: string }>,
  ) => Promise<void>;
}) {
  const reportMd = pack.fullMarkdown || researchPackToMarkdown(pack, title);
  const degraded = Boolean(pack.degradationNote) || pack.collectionMode === "heuristic";
  const modeLabel =
    pack.collectionMode === "engine"
      ? "引擎外呼"
      : pack.collectionMode === "hybrid"
        ? "混合扫描"
        : pack.collectionMode === "heuristic"
          ? "启发式（已降级）"
          : null;
  const scopeRows: Array<[string, string]> = pack.scope
    ? agentId === "m-biz"
      ? [
          ["阶段", pack.scope.city],
          ["主矛盾", pack.scope.category],
          ["90 天优先", pack.scope.intent],
          ["最紧资源", pack.scope.constraint],
        ]
      : agentId === "m-ed"
        ? [
            ["阶段", pack.scope.city],
            ["议题", pack.scope.category],
            ["控制权底线", pack.scope.intent],
            ["团队", pack.scope.constraint],
          ]
        : [
            ["城市", pack.scope.city],
            ["品类", pack.scope.category],
            ["意图", pack.scope.intent],
            ["约束", pack.scope.constraint],
          ]
    : [];
  return (
    <div
      className={`mpnt-rise space-y-5 border border-[rgba(20,20,19,0.1)] bg-white p-5 md:p-7 ${
        primary ? "" : "opacity-90"
      }`}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] tracking-[0.14em] text-[#5f6b4e]">
            02 · RESEARCH
          </p>
          <h3 className="mt-1 font-serif-cn text-[22px] font-semibold text-[#141413]">
            {title}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {modeLabel ? (
            <span
              className={`border px-3 py-1 text-[11px] ${
                degraded
                  ? "border-[rgba(180,124,92,0.45)] bg-[rgba(180,124,92,0.08)] text-[#a56b4d]"
                  : "border-[rgba(20,20,19,0.12)] text-[#6f747b]"
              }`}
            >
              {modeLabel}
            </span>
          ) : null}
          {pack.status === "confirmed" ? (
            <span className="inline-flex h-fit items-center gap-1.5 border border-[rgba(95,107,78,0.35)] bg-[rgba(95,107,78,0.08)] px-3 py-1 text-[12px] text-[#5f6b4e]">
              <Check className="h-3.5 w-3.5" /> 已确认
            </span>
          ) : (
            <span className="h-fit border border-[rgba(165,107,77,0.4)] bg-[rgba(165,107,77,0.08)] px-3 py-1 text-[12px] text-[#a56b4d]">
              待你确认
            </span>
          )}
        </div>
      </div>
      <EngineDegradationBanner
        mode={pack.collectionMode}
        note={pack.degradationNote}
        blockConfirm={pack.status !== "confirmed"}
      />
      {onSaveFacts ? (
        <SeatPrimaryFactsEditor
          facts={primaryFacts}
          disabled={factsLocked}
          pending={factsPending}
          onSave={onSaveFacts}
        />
      ) : null}
      <p className="border-l-2 border-[#141413] pl-4 font-serif-cn text-[18px] leading-8 text-[#141413] md:text-[20px]">
        {pack.headline}
      </p>
      {scopeRows.length ? (
        <div className="grid gap-2 border border-[rgba(20,20,19,0.08)] bg-[var(--mpnt-field)] p-4 sm:grid-cols-2">
          <p className="text-[11px] tracking-[0.1em] text-[#5f6b4e] sm:col-span-2">
            {agentId === "m-biz"
              ? "体检范围卡"
              : agentId === "m-ed"
                ? "扫描范围卡"
                : "市场扫描范围卡"}
          </p>
          {scopeRows.map(([k, v]) => (
            <p key={k} className="text-[13px] leading-5 text-[#2a2a28]">
              <span className="text-[#9aa0a6]">{k} · </span>
              {v}
            </p>
          ))}
        </div>
      ) : null}
      {pack.competitorBriefs?.length ? (
        <div className="space-y-2">
          <p className="text-[11px] tracking-[0.1em] text-[#5f6b4e]">
            竞对三联
          </p>
          <div className="grid gap-2 md:grid-cols-3">
            {pack.competitorBriefs.map((b) => (
              <div
                key={b.name}
                className="border border-[rgba(20,20,19,0.08)] bg-white p-3"
              >
                <p className="text-[14px] font-semibold text-[#141413]">
                  {b.name}
                </p>
                <p className="mt-1 text-[12px] leading-5 text-[#6f747b]">
                  {b.play}
                </p>
                <p className="mt-2 text-[12px] leading-5 text-[#a56b4d]">
                  威胁：{b.threat}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {pack.sections
        .filter(
          (s) =>
            s.title === "本轮唯一问题" || s.title === "所以呢（决策含义）",
        )
        .map((s) => (
          <div
            key={s.title}
            className="border border-[#141413] bg-[var(--mpnt-field)] px-4 py-3"
          >
            <p className="text-[11px] font-medium tracking-[0.1em] text-[#5f6b4e]">
              {s.title}
            </p>
            <p className="mt-1.5 text-[15px] leading-7 text-[#141413]">
              {s.body}
            </p>
          </div>
        ))}
      <div className="grid gap-4 md:grid-cols-2">
        {pack.sections
          .filter(
            (s) =>
              s.title !== "本轮唯一问题" && s.title !== "所以呢（决策含义）",
          )
          .map((s, i) => (
            <div
              key={s.title}
              className={`mpnt-rise border border-[rgba(20,20,19,0.08)] bg-[var(--mpnt-field)] p-4 mpnt-rise-delay-${Math.min(i + 1, 3)}`}
            >
              <p className="text-[11px] tracking-[0.1em] text-[#5f6b4e]">
                {s.title}
              </p>
              <p className="mt-2 text-[14px] leading-7 text-[#2a2a28]">
                {s.body}
              </p>
            </div>
          ))}
      </div>
      {pack.risks?.length ? (
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
      <div className="border border-[rgba(20,20,19,0.1)] bg-[var(--mpnt-paper)]">
        <div className="border-b border-[rgba(20,20,19,0.08)] px-4 py-3">
          <p className="text-[12px] font-medium tracking-[0.08em] text-[#5f6b4e]">
            调研报告
          </p>
        </div>
        <div className="px-4 py-5 md:px-6">
          <MpntReportDoc
            markdown={reportMd}
            maxHeightClass="max-h-[32rem]"
            showToc
          />
        </div>
      </div>
    </div>
  );
}

function AdvisorsBlock({
  set,
  meta,
  title,
  primary,
}: {
  set: NonNullable<AgentConsultingProject["assets"]["advisors"]>;
  meta: Record<
    string,
    {
      name: string;
      model: string;
      initial: string;
      toneClass: string;
      question: string;
    }
  >;
  title: string;
  primary?: boolean;
}) {
  return (
    <div className={`mpnt-rise space-y-5 ${primary ? "" : "opacity-95"}`}>
      <div>
        <p className="text-[11px] tracking-[0.14em] text-[#5f6b4e]">
          03 · EXPERT DOSSIER
        </p>
        <h3 className="mt-1 font-serif-cn text-[22px] font-semibold text-[#141413]">
          {title}
        </h3>
        <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[#6f747b]">
          {set.conflictSummary}
        </p>
        {set.gameSummary ? (
          <p className="mt-2 max-w-2xl border-l-2 border-[#a56b4d] pl-3 text-[13px] leading-6 text-[#a56b4d]">
            交火 · {set.gameSummary}
          </p>
        ) : null}
        <p className="mt-3 inline-flex border border-[rgba(165,107,77,0.35)] bg-[rgba(165,107,77,0.06)] px-3 py-1.5 text-[12px] text-[#a56b4d]">
          席位互斥 · 看差异，别揉成一团
        </p>
      </div>
      <div className={`grid gap-4 ${set.strategies.length >= 4 ? "lg:grid-cols-2" : "lg:grid-cols-2 xl:grid-cols-3"}`}>
        {set.strategies.map((s, i) => {
          const m = meta[s.advisorId];
          const es = s.entryScheme;
          const rows: Array<[string, string]> = [
            ["战场", s.battlefield],
            ["差异", s.differentiation],
            ["证明", s.proof],
            ["必须牺牲/不做", s.doNotDo],
            ["风险", s.risk],
          ];
          return (
            <article
              key={s.advisorId}
              className={`mpnt-seat mpnt-rise border border-[rgba(20,20,19,0.1)] border-t-[3px] bg-white mpnt-rise-delay-${Math.min(i + 1, 3)} ${ADVISOR_TOP_BORDER[i % ADVISOR_TOP_BORDER.length]}`}
            >
              <div className="border-b border-[rgba(20,20,19,0.08)] px-4 py-4">
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-10 w-10 items-center justify-center text-[15px] font-semibold ${m?.toneClass || "bg-[#141413] text-white"}`}
                  >
                    {m?.initial || s.advisorId.slice(0, 1)}
                  </span>
                  <div>
                    <p className="text-[15px] font-semibold text-[#141413]">
                      {m?.name || s.advisorId}
                    </p>
                    <p className="text-[12px] text-[#6f747b]">
                      {m?.model}
                      {m?.question ? ` · ${m.question}` : ""}
                    </p>
                  </div>
                </div>
                <p className="mt-3 font-serif-cn text-[17px] font-semibold leading-7 text-[#141413]">
                  {s.oneLiner}
                </p>
                <p className="mt-2 text-[12px] leading-5 text-[#6f747b]">
                  {s.rationale}
                </p>
              </div>
              <dl className="divide-y divide-[rgba(20,20,19,0.06)]">
                {rows.map(([k, v]) => (
                  <div
                    key={k}
                    className="grid grid-cols-[5.5rem_1fr] gap-2 px-4 py-2.5"
                  >
                    <dt className="text-[11px] tracking-[0.06em] text-[#9aa0a6]">
                      {k}
                    </dt>
                    <dd className="text-[13px] leading-5 text-[#141413]">
                      {v || "—"}
                    </dd>
                  </div>
                ))}
              </dl>
              {es ? (
                <div className="border-t border-[rgba(20,20,19,0.08)] bg-[var(--mpnt-field)] px-4 py-4">
                  <p className="text-[11px] tracking-[0.1em] text-[#5f6b4e]">
                    {s.governScheme
                      ? "治理方案包"
                      : s.modeScheme
                        ? "模式方案包"
                        : "进入方案包"}{" "}
                    · {es.title}
                  </p>
                  <p className="mt-2 text-[13px] leading-5 text-[#141413]">
                    {s.governScheme
                      ? `先锁：${s.governScheme.lockFirst}`
                      : s.modeScheme
                        ? `北极星：${s.modeScheme.northStar}`
                        : `切口：${es.sceneCut}`}
                  </p>
                  <p className="mt-1 text-[13px] leading-5 text-[#141413]">
                    {s.governScheme
                      ? `落签：${s.governScheme.mustSign.join(" · ")}`
                      : s.modeScheme
                        ? `证明：${s.modeScheme.proofPlan.join("；")}`
                        : `主推：${es.menuPilot.join("；")}`}
                  </p>
                  <p className="mt-1 text-[13px] leading-5 text-[#a56b4d]">
                    杀出：{es.killLine}
                  </p>
                  <p className="mt-2 text-[12px] leading-5 text-[#6f747b]">
                    本周：{es.weekProof}
                  </p>
                  {es.scorecard?.length ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-[11px] tracking-[0.08em] text-[#9aa0a6]">
                        记分卡
                      </p>
                      {es.scorecard.map((row) => (
                        <div
                          key={row.label}
                          className="flex items-start justify-between gap-3 border border-[rgba(20,20,19,0.08)] bg-white px-2.5 py-2"
                        >
                          <div className="min-w-0">
                            <p className="text-[12px] font-medium text-[#141413]">
                              {row.label}
                            </p>
                            {row.note ? (
                              <p className="mt-0.5 text-[11px] leading-4 text-[#6f747b]">
                                {row.note}
                              </p>
                            ) : null}
                          </div>
                          <span className="shrink-0 font-serif-cn text-[16px] font-semibold text-[#141413]">
                            {row.score}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {s.crossFireNote ? (
                    <p className="mt-3 border-l-2 border-[#a56b4d] pl-2 text-[12px] leading-5 text-[#a56b4d]">
                      交火弹药：{s.crossFireNote}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

function WarRoomBlock({
  room,
  advisors,
  strategies,
  title,
  agentId,
  busy,
  blendNote,
  onBlendNote,
  onVote,
  primary,
}: {
  room: NonNullable<AgentConsultingProject["assets"]["warRoom"]>;
  advisors: AgentConsultingBlueprint["advisors"];
  strategies?: NonNullable<
    AgentConsultingProject["assets"]["advisors"]
  >["strategies"];
  title: string;
  agentId: ConsultingAgentKind;
  busy?: boolean;
  blendNote: string;
  onBlendNote: (v: string) => void;
  onVote: (p: string) => void;
  primary?: boolean;
}) {
  const byId = useMemo(
    () => Object.fromEntries((strategies || []).map((s) => [s.advisorId, s])),
    [strategies],
  );

  const blendPlaceholder =
    agentId === "m-biz"
      ? "例：主轴认战略官的北极星；财务官只设杀出线；产品/运营做护栏"
      : agentId === "m-ed"
        ? "例：主轴锁创始人控制权底线；风险顾问协议清单必须同步；激励池后置"
        : "例：主轴认战略席的场景切口；经营只定菜单护栏；投资只管杀出线";

  const phaseBlocks = useMemo(() => {
    const blocks: Array<{ phase: string; turns: typeof room.turns }> = [];
    for (const t of room.turns) {
      const phase = t.agendaLabel || t.agendaPhase || "会议进行中";
      const last = blocks[blocks.length - 1];
      if (last && last.phase === phase) last.turns.push(t);
      else blocks.push({ phase, turns: [t] });
    }
    return blocks;
  }, [room.turns]);

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
  }, [room.roomId, phaseBlocks.length]);

  const awaiting = room.status === "awaiting_user";
  const agendaRevealed = visiblePhases >= phaseBlocks.length;
  const current =
    room.currentAgenda ||
    (awaiting
      ? "founder_vote"
      : room.status === "agreed"
        ? "resolution"
        : "pitch");
  const shownBlocks = phaseBlocks.slice(0, visiblePhases);
  const blendReady = Boolean(blendNote.trim());

  return (
    <div
      className={`mpnt-rise overflow-hidden border border-[rgba(20,20,19,0.1)] ${
        primary ? "" : "opacity-95"
      }`}
    >
      <div className="bg-[#141413] px-5 py-6 text-white md:px-7">
        <p className="text-[11px] tracking-[0.14em] text-white/50">
          04 · 开会
        </p>
        <h3 className="mt-1 font-serif-cn text-[22px] font-semibold">
          {title}
        </h3>
        <p className="mt-2 text-[14px] text-white/65">
          {room.agendaTitle || "有议程、有质询、有决议"}
        </p>

        <ol className="mt-5 flex flex-wrap gap-1.5">
          {MEETING_AGENDA.map((a) => {
            const active = a.id === current && agendaRevealed;
            const idx = MEETING_AGENDA.findIndex((x) => x.id === a.id);
            const currentIdx = MEETING_AGENDA.findIndex((x) => x.id === current);
            const passed = agendaRevealed
              ? idx < currentIdx
              : idx < Math.min(visiblePhases, currentIdx);
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

        <div className="mt-8 flex flex-col items-center gap-6">
          <div className="flex flex-wrap justify-center gap-6 md:gap-10">
            {advisors.map((a) => (
              <div key={a.id} className="flex flex-col items-center gap-2">
                <span
                  className={`flex h-11 w-11 items-center justify-center text-[14px] font-semibold ring-2 ring-white/20 ${a.toneClass}`}
                >
                  {a.initial}
                </span>
                <span className="text-[11px] text-white/75">{a.name}</span>
              </div>
            ))}
          </div>
          <div className="relative w-full max-w-md">
            <div className="mx-auto h-16 w-[85%] rounded-[100%] border border-white/25 bg-white/5" />
            <p className="absolute inset-0 flex items-center justify-center text-[11px] tracking-[0.16em] text-white/45">
              会议桌
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
            {block.turns.map((t, i) => (
              <div
                key={`${block.phase}-${i}-${t.at}`}
                className={`border-b border-[rgba(20,20,19,0.06)] px-5 py-3.5 md:px-7 ${
                  t.kind === "challenge"
                    ? "bg-[rgba(165,107,77,0.07)]"
                    : t.kind === "rebuttal"
                      ? "bg-[rgba(61,90,128,0.07)]"
                      : t.kind === "revise"
                        ? "bg-[rgba(95,107,78,0.08)]"
                        : t.kind === "decision" || t.kind === "synthesis"
                          ? "bg-[rgba(95,107,78,0.08)]"
                          : t.speaker === "user"
                            ? "bg-white"
                            : "bg-white/70"
                }`}
              >
                <p className="text-[11px] tracking-[0.08em] text-[#9aa0a6]">
                  {t.speaker === "host"
                    ? "主持人"
                    : t.speaker === "user"
                      ? "老板"
                      : advisors.find((a) => a.id === t.speaker)?.name ||
                        t.speaker}
                  {TURN_KIND_LABEL[t.kind] ? ` · ${TURN_KIND_LABEL[t.kind]}` : ""}
                </p>
                <p className="mt-1 whitespace-pre-line text-[14px] leading-6 text-[#141413]">
                  {t.text}
                </p>
              </div>
            ))}
          </div>
        ))}
        {visiblePhases < phaseBlocks.length ? (
          <p className="animate-pulse px-5 py-3 text-[12px] font-medium text-[#5f6b4e] md:px-7">
            议程推进中…请听完质询与改策再拍板
          </p>
        ) : null}
      </div>

      {awaiting ? (
        <div
          id="step-warroom-vote"
          className="space-y-4 border-t border-[rgba(20,20,19,0.08)] bg-white px-5 py-6 md:px-7"
        >
          {room.decisionCard ? (
            <div className="mpnt-decision-card border border-[rgba(20,20,19,0.12)] bg-[var(--mpnt-field)]">
              <div className="border-b border-[rgba(20,20,19,0.08)] px-4 py-3 md:px-5">
                <p className="text-[11px] tracking-[0.12em] text-[#5f6b4e]">
                  呈交 · 一页纸决策卡
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
              <div
                className={`grid gap-0 divide-y divide-[rgba(20,20,19,0.08)] md:divide-x md:divide-y-0 ${
                  room.decisionCard.options.length >= 4
                    ? "md:grid-cols-2 lg:grid-cols-4"
                    : "md:grid-cols-3"
                }`}
              >
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
                    {o.ifNot ? (
                      <p className="mt-2 text-[12px] leading-5 text-[#a56b4d]">
                        不选：{o.ifNot}
                      </p>
                    ) : null}
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
              议程 · 老板拍板
            </p>
            <p className="mt-1 font-serif-cn text-[20px] font-semibold text-[#141413]">
              主轴选哪条？
            </p>
            <p className="mt-1 text-[13px] text-[#6f747b]">
              先读决策卡。案卷互斥。选主轴，或折中并写清谁主谁辅。
              <span className="font-medium text-[#a56b4d]">
                {" "}
                没有拍板不能散会。
              </span>
            </p>
          </div>
          <div
            className={`grid gap-3 sm:grid-cols-2 ${
              advisors.length >= 4 ? "lg:grid-cols-3 xl:grid-cols-5" : "lg:grid-cols-4"
            }`}
          >
            {advisors.map((a) => (
              <button
                key={a.id}
                type="button"
                disabled={busy || !agendaRevealed}
                onClick={() => onVote(a.id)}
                className="mpnt-seat border border-[rgba(20,20,19,0.12)] px-4 py-4 text-left hover:border-[#141413] disabled:opacity-50"
              >
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center text-[13px] ${a.toneClass}`}
                >
                  {a.initial}
                </span>
                <p className="mt-3 text-[14px] font-semibold text-[#141413]">
                  主轴 · {a.name}
                </p>
                <p className="mt-1 text-[12px] leading-5 text-[#6f747b]">
                  {byId[a.id]?.oneLiner || a.question}
                </p>
              </button>
            ))}
            <button
              type="button"
              disabled={busy || !agendaRevealed || !blendReady}
              onClick={() => onVote("blend")}
              className="mpnt-seat border border-[#141413] bg-[#141413] px-4 py-4 text-left text-white disabled:opacity-50"
              title={!blendReady ? "请先填写折中说明（谁主谁辅）" : undefined}
            >
              <Sparkles className="h-4 w-4" />
              <p className="mt-3 text-[14px] font-semibold">折中（须写主辅）</p>
              <p className="mt-1 text-[12px] text-white/65">
                {blendReady ? "谁主轴、谁只做约束" : "先填写下方折中说明"}
              </p>
            </button>
          </div>
          <label className="block space-y-1.5">
            <span className="text-[12px] text-[#6f747b]">
              折中说明（选折中时必填）
            </span>
            <input
              value={blendNote}
              onChange={(e) => onBlendNote(e.target.value)}
              className="w-full border border-[rgba(20,20,19,0.12)] bg-[var(--mpnt-field)] px-3 py-2.5 text-[14px] outline-none focus:border-[#141413]"
              placeholder={blendPlaceholder}
            />
          </label>
        </div>
      ) : null}

      {room.status === "agreed" && room.consensusOneLiner ? (
        <div className="mpnt-decision-card border-t border-[rgba(95,107,78,0.3)] bg-[rgba(95,107,78,0.08)] px-5 py-5 md:px-7">
          <p className="text-[11px] tracking-[0.1em] text-[#5f6b4e]">
            会议决议 · 一页纸
          </p>
          <p className="mt-1 font-serif-cn text-[18px] font-semibold text-[#141413]">
            {room.consensusOneLiner}
          </p>
          {room.consensusBullets?.length ? (
            <ul className="mt-3 space-y-1 text-[13px] leading-6 text-[#2a2a28]">
              {room.consensusBullets.slice(0, 4).map((b) => (
                <li key={b} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#5f6b4e]" />
                  {b}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function RoadmapBlock({
  roadmap,
  title,
  agentId,
  primary,
}: {
  roadmap: NonNullable<AgentConsultingProject["assets"]["executionRoadmap"]>;
  title: string;
  agentId: ConsultingAgentKind;
  primary?: boolean;
}) {
  const delivery =
    roadmap.entryPack || roadmap.modePack || roadmap.governancePack;
  const [showWall, setShowWall] = useState(false);

  return (
    <div className={`mpnt-rise space-y-5 ${primary ? "" : ""}`}>
      <div>
        <p className="text-[11px] tracking-[0.14em] text-[#5f6b4e]">
          06 · EXECUTION
        </p>
        <h3 className="mt-1 font-serif-cn text-[22px] font-semibold text-[#141413]">
          {roadmap.horizonDays} 天{title}
        </h3>
        <p className="mt-2 max-w-2xl border-l-2 border-[#141413] pl-4 font-serif-cn text-[17px] leading-7 text-[#141413]">
          {roadmap.positioningOneLiner}
        </p>
      </div>

      {delivery ? (
        <div className="border border-[rgba(20,20,19,0.12)] bg-[var(--mpnt-field)]">
          <div className="border-b border-[rgba(20,20,19,0.08)] px-5 py-4">
            <p className="text-[11px] tracking-[0.12em] text-[#5f6b4e]">
              {roadmap.entryPack
                ? "进入作战卡"
                : roadmap.modePack
                  ? "模式作战卡"
                  : "协议清单包"}
              {delivery.seatLabel ? ` · ${delivery.seatLabel}` : ""}
            </p>
            <p className="mt-1 font-serif-cn text-[18px] font-semibold text-[#141413]">
              {delivery.oneLiner}
            </p>
          </div>
          <div className="grid gap-0 divide-y divide-[rgba(20,20,19,0.08)] md:grid-cols-3 md:divide-x md:divide-y-0">
            <div className="px-5 py-4">
              <p className="text-[11px] tracking-[0.08em] text-[#9aa0a6]">
                {roadmap.governancePack
                  ? "控制权 / 战场"
                  : roadmap.modePack
                    ? "北极星"
                    : "城市 / 场景"}
              </p>
              <p className="mt-2 text-[13px] leading-6 text-[#141413]">
                {delivery.cityScene || "—"}
              </p>
            </div>
            <div className="px-5 py-4">
              <p className="text-[11px] tracking-[0.08em] text-[#9aa0a6]">
                {roadmap.governancePack
                  ? "给律师 / 落签"
                  : roadmap.modePack
                    ? "周会纪律"
                    : "店员简报"}
              </p>
              <p className="mt-2 whitespace-pre-line text-[13px] leading-6 text-[#141413]">
                {delivery.staffBrief || delivery.menuPilot || "—"}
              </p>
              {delivery.menuPilot && delivery.staffBrief ? (
                <p className="mt-2 text-[12px] leading-5 text-[#6f747b]">
                  {roadmap.governancePack ? "落签" : "主推/证明"}：
                  {delivery.menuPilot}
                </p>
              ) : null}
            </div>
            <div className="px-5 py-4">
              <p className="text-[11px] tracking-[0.08em] text-[#9aa0a6]">
                不做 / 杀出
              </p>
              <p className="mt-2 text-[13px] leading-6 text-[#a56b4d]">
                {delivery.doNotDo}
              </p>
              {delivery.killLine ? (
                <p className="mt-2 text-[12px] leading-5 text-[#141413]">
                  杀出：{delivery.killLine}
                </p>
              ) : null}
            </div>
          </div>
          {delivery.wallCard ? (
            <div className="border-t border-[rgba(20,20,19,0.08)] px-5 py-3">
              <button
                type="button"
                onClick={() => setShowWall((v) => !v)}
                className="text-[12px] font-medium text-[#5f6b4e] underline-offset-2 hover:underline"
              >
                {showWall ? "收起墙上卡" : "展开墙上卡（可打印）"}
              </button>
              {showWall ? (
                <pre className="mt-3 overflow-auto border border-[rgba(20,20,19,0.1)] bg-white p-3 text-[12px] leading-5 text-[#141413] whitespace-pre-wrap">
                  {delivery.wallCard}
                </pre>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="border border-[rgba(20,20,19,0.12)] bg-[var(--mpnt-field)] px-5 py-4">
          <p className="text-[11px] tracking-[0.12em] text-[#5f6b4e]">
            {DELIVERY_PACK_BY_AGENT[agentId].eyebrow}
          </p>
          <p className="mt-1 font-serif-cn text-[17px] font-semibold text-[#141413]">
            {DELIVERY_PACK_BY_AGENT[agentId].title}
          </p>
          <ul className="mt-3 space-y-1.5 text-[13px] leading-6 text-[#2a2a28]">
            {DELIVERY_PACK_BY_AGENT[agentId].lines.map((line) => (
              <li key={line} className="flex gap-2">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#141413]" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ol className="relative space-y-0 pl-2">
        <div className="mpnt-timeline-line absolute bottom-4 left-[19px] top-4 w-px" />
        {roadmap.milestones.map((m, i) => (
          <li
            key={m.milestoneId}
            className={`mpnt-rise relative flex gap-4 pb-6 mpnt-rise-delay-${Math.min(i + 1, 3)}`}
          >
            <div className="relative z-[1] flex h-10 w-10 shrink-0 items-center justify-center border border-[#141413] bg-white text-[12px] font-semibold">
              W{m.weekStart}
            </div>
            <div className="flex-1 border border-[rgba(20,20,19,0.1)] bg-white p-4">
              <p className="text-[12px] text-[#5f6b4e]">
                第 {m.weekStart}–{m.weekEnd} 周 · {m.ownerHint}
              </p>
              <p className="mt-1 text-[16px] font-semibold text-[#141413]">
                {m.title}
              </p>
              <ul className="mt-2 space-y-1 text-[13px] text-[#6f747b]">
                {m.actions.map((a) => (
                  <li key={a}>· {a}</li>
                ))}
              </ul>
              <p className="mt-3 text-[12px] leading-5 text-[#5f6b4e]">
                验收：{m.doneWhen}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ReportBlock({
  title,
  committeeName,
  oneLiner,
  bullets,
  decision,
  markdown,
  confirmed,
  primary,
  enableSignOff,
  contractFrozen,
  signOffStatus,
  signedByName,
  signOffLabel,
  busy,
  onSign,
  onExport,
}: {
  title: string;
  committeeName: string;
  oneLiner?: string;
  bullets?: string[];
  decision?: DecisionArtifact;
  markdown?: string;
  confirmed?: boolean;
  primary?: boolean;
  enableSignOff?: boolean;
  contractFrozen?: boolean;
  signOffStatus?: "draft" | "in_review" | "signed";
  signedByName?: string;
  signOffLabel?: string;
  busy?: boolean;
  onSign?: (signedBy: string) => Promise<void>;
  onExport?: (preview: boolean) => Promise<void>;
}) {
  const [signedBy, setSignedBy] = useState(signedByName || "");
  const signed = signOffStatus === "signed";

  function download() {
    if (!markdown) return;
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}_${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }
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
              05 · DECISION PACK
            </p>
            <h3 className="mt-2 font-serif-cn text-[26px] font-semibold tracking-[-0.02em] text-[#141413] md:text-[30px]">
              {title}
            </h3>
            <p className="mt-2 text-[13px] text-[#6f747b]">
              {PRODUCT_BRAND_TITLE} · {committeeName} · 决策包
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
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 border border-[rgba(20,20,19,0.15)] bg-white/70 px-4 text-[13px] text-[#141413] touch-manipulation hover:border-[#141413]"
                >
                  <Printer className="h-3.5 w-3.5" />
                  打印
                </button>
                <button
                  type="button"
                  onClick={download}
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 border border-[rgba(20,20,19,0.15)] bg-white/70 px-4 text-[13px] text-[#141413] touch-manipulation hover:border-[#141413]"
                >
                  <Download className="h-3.5 w-3.5" />
                  导出会议稿
                </button>
              </>
            ) : null}
          </div>
        </div>
        {decision?.governingQuestion ? (
          <p className="mt-6 text-[14px] leading-7 text-[#6f747b]">
            <span className="text-[11px] tracking-[0.1em] text-[#5f6b4e]">
              本轮唯一问题 ·{" "}
            </span>
            {decision.governingQuestion}
          </p>
        ) : null}
        {decision?.recommendation || oneLiner ? (
          <blockquote className="mt-6 border-l-[3px] border-[#141413] pl-5">
            <p className="font-serif-cn text-[22px] font-semibold leading-9 text-[#141413] md:text-[26px]">
              {decision?.recommendation || oneLiner}
            </p>
            <p className="mt-2 text-[12px] tracking-[0.08em] text-[#6f747b]">
              会议结论
            </p>
          </blockquote>
        ) : null}
        {decision?.tradeoffAccepted ? (
          <p className="mt-4 text-[14px] leading-7 text-[#2a2a28]">
            <span className="font-medium text-[#141413]">取舍：</span>
            {decision.tradeoffAccepted}
          </p>
        ) : null}

        {enableSignOff && confirmed ? (
          <div className="mt-8 border border-[rgba(20,20,19,0.1)] bg-white/55 px-4 py-4 md:px-5">
            <p className="text-[12px] font-medium tracking-[0.1em] text-[#5f6b4e]">
              签字导出
            </p>
            <p className="mt-1 text-[13px] leading-6 text-[#6f747b]">
              {contractFrozen
                ? signOffLabel ||
                  "方案已定，签字后可导出。"
                : "确认后锁定方案；证据不足先补事实。"}
            </p>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              {!signed ? (
                <>
                  <label className="min-w-[160px] flex-1 text-[12px] text-[#6f747b]">
                    签字人
                    <input
                      value={signedBy}
                      onChange={(e) => setSignedBy(e.target.value)}
                      placeholder="你的名字"
                      className="mt-1 w-full border border-[rgba(20,20,19,0.15)] bg-white px-3 py-2 text-[14px] text-[#141413] outline-none focus:border-[#141413]"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={busy || !signedBy.trim() || !onSign}
                    onClick={() => void onSign?.(signedBy.trim())}
                    className="inline-flex min-h-11 w-full items-center justify-center bg-[#141413] px-4 text-[13px] font-semibold text-white touch-manipulation disabled:opacity-50 sm:w-auto"
                  >
                    确认签字
                  </button>
                </>
              ) : null}
              <button
                type="button"
                disabled={busy || !onExport}
                onClick={() => void onExport?.(true)}
                className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 border border-[rgba(20,20,19,0.15)] bg-white px-4 text-[13px] text-[#141413] touch-manipulation disabled:opacity-50 sm:w-auto"
              >
                <Download className="h-3.5 w-3.5" />
                预览草稿
              </button>
              {signed ? (
                <button
                  type="button"
                  disabled={busy || !onExport}
                  onClick={() => void onExport?.(false)}
                  className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 bg-[#5f6b4e] px-4 text-[13px] font-semibold text-white touch-manipulation disabled:opacity-50 sm:w-auto"
                >
                  <Download className="h-3.5 w-3.5" />
                  导出方案
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {decision ? (
        <div className="grid gap-0 border-b border-[rgba(20,20,19,0.08)] md:grid-cols-2">
          <div className="border-b border-[rgba(20,20,19,0.08)] px-6 py-6 md:border-b-0 md:border-r md:px-10">
            <p className="text-[12px] font-medium tracking-[0.1em] text-[#a56b4d]">
              停手条件
            </p>
            <ul className="mt-3 space-y-2 text-[14px] leading-6 text-[#2a2a28]">
              {decision.killCriteria.map((k) => (
                <li key={k} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#a56b4d]" />
                  {k}
                </li>
              ))}
            </ul>
          </div>
          <div className="px-6 py-6 md:px-10">
            <p className="text-[12px] font-medium tracking-[0.1em] text-[#5f6b4e]">
              本周动作（周一开工）
            </p>
            <ol className="mt-3 list-decimal space-y-2 pl-4 text-[14px] leading-6 text-[#141413]">
              {decision.mondayMoves.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ol>
          </div>
        </div>
      ) : null}

      {decision?.whatWeWontDo?.length ? (
        <div className="border-b border-[rgba(20,20,19,0.08)] px-6 py-5 md:px-10">
          <p className="text-[12px] font-medium tracking-[0.1em] text-[#6f747b]">
            明确不做
          </p>
          <ul className="mt-2 space-y-1 text-[14px] text-[#2a2a28]">
            {decision.whatWeWontDo.map((w) => (
              <li key={w}>· {w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {bullets?.length && !decision ? (
        <ul className="space-y-2 border-b border-[rgba(20,20,19,0.08)] px-6 py-7 text-[14px] leading-7 text-[#2a2a28] md:px-10">
          {bullets.map((b) => (
            <li key={b} className="flex gap-2">
              <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-[#5f6b4e]" />
              {b}
            </li>
          ))}
        </ul>
      ) : null}

      {markdown ? (
        <div className="bg-[var(--mpnt-paper)] px-4 py-6 md:px-8 md:py-8">
          <p className="mb-4 text-[12px] font-medium tracking-[0.08em] text-[#5f6b4e]">
            战略报告
          </p>
          <MpntReportDoc
            markdown={markdown}
            maxHeightClass="max-h-[40rem]"
            showToc
          />
        </div>
      ) : null}
    </div>
  );
}
