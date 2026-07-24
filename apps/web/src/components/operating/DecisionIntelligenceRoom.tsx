"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { PageContent } from "@/components/operating/PageContent";
import { PageErrorState, PageLoadingState } from "@/components/operating/PageState";
import { DecisionReadinessPanel } from "@/components/operating/DecisionReadinessPanel";
import { ChallengeLayerPanel } from "@/components/operating/ChallengeLayerPanel";
import {
  DecisionClosedActions,
  DecisionExitLinks,
  DecisionLoopRail,
} from "@/components/operating/DecisionLoopRail";
import { readinessFromContext } from "@/server/founder-layer/capability/decision-intelligence/readiness";
import { buildChallengeReport } from "@/server/founder-layer/capability/decision-intelligence/challenge-layer";
import { toUserFacingGapLabel } from "@/lib/i18n/user-facing";

const fieldClass =
  "w-full rounded-[12px] border border-[rgba(24,24,23,0.12)] bg-white px-3 py-2.5 text-[15px] text-[#202124] outline-none focus:border-[#66735E]";

const primaryBtnClass =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-[#181817] px-5 text-[15px] font-semibold text-white touch-manipulation active:scale-[0.98] disabled:opacity-60";

const secondaryBtnClass =
  "inline-flex min-h-12 items-center justify-center rounded-[16px] border border-[rgba(24,24,23,0.15)] bg-white px-5 text-[15px] font-semibold text-[#181817] touch-manipulation active:scale-[0.98] disabled:opacity-60";

function Stars({ n }: { n: number }) {
  const filled = Math.max(0, Math.min(5, n));
  return (
    <span className="tracking-wide text-[#202124]" aria-label={`${filled} 星`}>
      {"★".repeat(filled)}
      {"☆".repeat(5 - filled)}
    </span>
  );
}

function LayerEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] tracking-[0.12em] text-[#66735E]">{children}</p>
  );
}

export function DecisionIntelligenceRoom({ projectId }: { projectId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const decisionId = searchParams.get("id") || "";
  const utils = trpc.useUtils();

  const openMut = trpc.decisionIntelligence.openExpansionCase.useMutation();
  const refreshMut = trpc.decisionIntelligence.refreshContext.useMutation();
  const delveMut = trpc.decisionIntelligence.startDeliberation.useMutation();
  const decideMut = trpc.decisionIntelligence.founderDecide.useMutation();
  const execMut = trpc.decisionIntelligence.commitExecution.useMutation();
  const learnMut = trpc.decisionIntelligence.recordLearning.useMutation();

  const query = trpc.decisionIntelligence.getExpansionCase.useQuery(
    { projectId, decisionId },
    { enabled: Boolean(decisionId) },
  );

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [insistReason, setInsistReason] = useState("");
  const [showInsist, setShowInsist] = useState(false);
  const [learnNote, setLearnNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (decisionId) return;
    let cancelled = false;
    (async () => {
      try {
        const bundle = await openMut.mutateAsync({ projectId });
        if (cancelled) return;
        router.replace(
          `/projects/${projectId}/decision-case?id=${encodeURIComponent(bundle.case.id)}`,
        );
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "无法打开决策");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, decisionId]);

  const data = query.data;
  useEffect(() => {
    if (!data?.context.options.length) return;
    const rec =
      data.context.options.find((o) => o.isRecommended) ||
      data.context.options[0];
    setSelectedOptionId((prev) => prev || rec?.id || null);
  }, [data?.context.options]);

  const busy =
    openMut.isPending ||
    refreshMut.isPending ||
    delveMut.isPending ||
    decideMut.isPending ||
    execMut.isPending ||
    learnMut.isPending ||
    (!decisionId && !error);

  const recommendedId = useMemo(
    () => data?.context.options.find((o) => o.isRecommended)?.id,
    [data?.context.options],
  );

  async function afterMut() {
    await utils.decisionIntelligence.getExpansionCase.invalidate();
    await utils.dashboard.getHome.invalidate();
  }

  if (busy && !data) {
    return (
      <PageLoadingState
        eyebrow="扩店决策"
        title="正在打开专项决策…"
        description={
          decisionId
            ? "读取事实、方案与挑战层。"
            : "正在创建或恢复决策案，请稍候。"
        }
        steps={[
          {
            label: decisionId ? "读取决策案" : "创建 / 打开决策案",
            status: "active",
          },
          { label: "整理事实与方案", status: "pending" },
          { label: "进入判断", status: "pending" },
        ]}
      />
    );
  }

  if ((error || query.isError) && !data) {
    const detail =
      error ||
      query.error?.message ||
      "专项决策暂时打不开，可重试或回对话。";
    return (
      <div className="space-y-5 pb-2 pt-6 md:pt-8">
        <PageErrorState
          eyebrow="扩店决策"
          title="专项决策暂时打不开"
          description={detail}
          primaryAction={{
            href: `/projects/${projectId}/decision-case?retry=${Date.now()}`,
            label: "重试打开",
          }}
          secondaryAction={{
            href: `/projects/${projectId}/agent`,
            label: "回对话",
          }}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <PageLoadingState
        eyebrow="扩店决策"
        title="正在同步决策内容…"
        description="后端已响应，正在渲染事实与方案。"
      />
    );
  }

  const { case: c, context, assessment } = data;
  const decided =
    c.status === "DECIDED" ||
    c.status === "EXECUTING" ||
    c.status === "LEARNING";
  const cityFact = context.facts.find((f) =>
    /城市|区域|位置|地址/.test(f.label),
  );
  const brandFact = context.facts.find((f) =>
    /品牌|店名|名称/.test(f.label),
  );
  const geoReady = Boolean(cityFact?.value) && cityFact!.value !== "未采集";
  const readiness = readinessFromContext({
    assessment,
    context,
    hasBrand: Boolean(brandFact?.value && brandFact.value !== "未命名"),
    hasGeo: geoReady,
  });
  const selectedOpt =
    context.options.find((o) => o.id === selectedOptionId) ||
    context.options.find((o) => o.isRecommended) ||
    context.options[0];
  const challengeReport = buildChallengeReport({
    opinions: context.expertOpinions,
    decisionId: c.id,
    optionId: selectedOpt?.id,
    optionName: selectedOpt?.name,
    openGaps: context.openGaps,
    unknowns: context.unknowns,
  });
  const statusLabel =
    c.status === "DISCOVERED"
      ? "发现问题"
      : c.status === "ANALYZING"
        ? "补充信息 / 分析中"
        : c.status === "DELIBERATING"
          ? "挑战中"
          : c.status === "DECIDED"
            ? "等待执行"
            : c.status === "EXECUTING"
              ? "执行中"
              : c.status === "LEARNING"
                ? "复盘学习"
                : c.status;

  return (
    <PageContent width="console" inset="shell" className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/projects/${projectId}/agent`}
          prefetch={false}
          className="inline-flex min-h-11 items-center gap-1 rounded-[12px] border border-[rgba(24,24,23,0.12)] bg-white px-3 text-[13px] font-medium text-[#66735E] no-underline touch-manipulation"
        >
          <ArrowLeft className="h-4 w-4" />
          回对话
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/projects/${projectId}/decisions`}
            prefetch={false}
            className="inline-flex min-h-11 items-center rounded-[12px] px-2.5 text-[13px] font-medium text-[#6f747b] no-underline touch-manipulation"
          >
            去跟进
          </Link>
          <Link
            href="/dashboard?radar=1"
            prefetch={false}
            className="inline-flex min-h-11 items-center rounded-[12px] px-2.5 text-[13px] font-medium text-[#6f747b] no-underline touch-manipulation"
          >
            经营动态
          </Link>
          <button
            type="button"
            disabled={refreshMut.isPending}
            onClick={async () => {
              setError(null);
              try {
                await refreshMut.mutateAsync({ projectId, decisionId: c.id });
                await afterMut();
              } catch (e) {
                setError(e instanceof Error ? e.message : "刷新失败");
              }
            }}
            className="inline-flex min-h-11 items-center border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[13px] font-medium text-[#66735E] touch-manipulation disabled:opacity-60"
          >
            刷新事实
          </button>
        </div>
      </div>

      <header className="space-y-3 border-b border-[rgba(24,24,23,0.08)] pb-6">
        <LayerEyebrow>扩店决策 · 专项闭环</LayerEyebrow>
        <DecisionLoopRail
          current={
            c.status === "DECIDED"
              ? "act"
              : c.status === "EXECUTING" || c.status === "LEARNING"
                ? "review"
                : c.status === "DELIBERATING"
                  ? "judge"
                  : "capture"
          }
          projectId={projectId}
          compact
        />
        <h1 className="font-display text-[22px] font-semibold leading-snug tracking-[-0.03em] text-[#202124] md:text-[26px]">
          {c.question}
        </h1>
        <p className="text-[13px] leading-5 text-[#6f747b]">
          影响 <Stars n={c.impactStars} /> · 期限 {c.deadline || "—"} ·{" "}
          {statusLabel}
        </p>
        <DecisionReadinessPanel
          readiness={readiness}
          onSupplement={
            readiness.missing.length
              ? () => {
                  document
                    .getElementById("die-layer-why")
                    ?.scrollIntoView({ behavior: "smooth" });
                }
              : undefined
          }
        />
      </header>

      {error ? <p className="text-[13px] text-[#B47C5C]">{error}</p> : null}

      <section className="space-y-3">
        <LayerEyebrow>1 · 发生了什么？</LayerEyebrow>
        <ul className="space-y-2">
          {context.facts.map((f) => (
            <li key={f.factId} className="text-[14px] leading-6 text-[#202124]">
              <span className="text-[#6f747b]">{f.label}</span>：{f.value}
              <span className="ml-2 text-[11px] text-[#6f747b]">
                来源 {f.source}
              </span>
            </li>
          ))}
        </ul>
        <ul className="space-y-2 border-t border-[rgba(24,24,23,0.06)] pt-3">
          {context.evidences.slice(0, 6).map((e) => (
            <li
              key={e.id}
              className="border-l-2 border-[rgba(24,24,23,0.12)] py-1 pl-3 text-[13px] leading-5 text-[#3a3d41]"
            >
              {e.content}
              <span className="ml-2 text-[11px] text-[#6f747b]">
                {e.source} · 权重 {e.weight.toFixed(2)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section id="die-layer-why" className="space-y-3">
        <LayerEyebrow>2 · 为什么会这样？</LayerEyebrow>
        <p className="text-[15px] leading-7 text-[#202124]">
          真正问题不是「市场热不热」，而是：组织与单店模型是否已支撑第二增长曲线。
        </p>
        {context.unknowns.length > 0 ? (
          <div className="space-y-1 rounded-[14px] bg-[rgba(180,124,92,0.06)] px-3 py-3">
            <p className="text-[12px] font-medium text-[#B47C5C]">我们还不知道</p>
            {context.unknowns.map((u) => (
              <p key={u} className="text-[13px] leading-5 text-[#3a3d41]">
                · {toUserFacingGapLabel(u)}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-[#66735E]">关键未知项已收敛。</p>
        )}
        {context.openGaps.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[11px] tracking-[0.1em] text-[#6f747b]">
              建议补充（≤3）
            </p>
            {context.openGaps.map((g) => (
              <p key={g.gapId} className="text-[14px] text-[#202124]">
                {toUserFacingGapLabel(g.question)}
                <span className="block text-[12px] text-[#6f747b]">
                  {g.reason}
                </span>
              </p>
            ))}
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <LayerEyebrow>3 · 我们有哪些选择？</LayerEyebrow>
        <div className="space-y-3">
          {context.options.map((opt) => {
            const selected = selectedOptionId === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={decided}
                onClick={() => setSelectedOptionId(opt.id)}
                className={`w-full space-y-2 rounded-[12px] border px-4 py-3.5 text-left touch-manipulation active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 ${
                  selected
                    ? "border-[#181817] bg-[rgba(24,24,23,0.04)]"
                    : "border-[rgba(24,24,23,0.1)] bg-[#FBFAF7]"
                }`}
              >
                <p className="text-[15px] font-semibold text-[#202124]">
                  {opt.name}
                  {opt.isRecommended ? (
                    <span className="ml-2 text-[11px] font-normal text-[#66735E]">
                      系统倾向
                    </span>
                  ) : null}
                </p>
                <p className="text-[13px] leading-5 text-[#3a3d41]">
                  {opt.description}
                </p>
                <p className="text-[12px] text-[#6f747b]">
                  把握 {opt.successProbabilityBand} · 风险 {opt.riskLevel} ·{" "}
                  {opt.successProbabilityRationale}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <div className="space-y-3">
        <ChallengeLayerPanel report={challengeReport} />
        {c.status === "ANALYZING" || c.status === "DISCOVERED" ? (
          <button
            type="button"
            disabled={delveMut.isPending}
            onClick={async () => {
              setError(null);
              try {
                await delveMut.mutateAsync({ projectId, decisionId: c.id });
                await afterMut();
              } catch (e) {
                setError(e instanceof Error ? e.message : "进入审议失败");
              }
            }}
            className="inline-flex min-h-11 items-center gap-1 text-[14px] font-semibold text-[#181817] underline-offset-4 touch-manipulation hover:underline disabled:opacity-60"
          >
            记录为挑战中 <ArrowRight className="h-4 w-4" />
          </button>
        ) : null}
        <Link
          href={`/projects/${projectId}/decision-room?topic=${encodeURIComponent(c.question)}`}
          prefetch={false}
          className="inline-flex text-[13px] text-[#66735E] underline-offset-4 hover:underline"
        >
          去拍板加深（七常委）
        </Link>
      </div>

      <section className="space-y-4">
        <LayerEyebrow>4 · 每个选择未来会怎样？</LayerEyebrow>
        <div className="space-y-3">
          {context.options.map((opt) => {
            const sim = context.simulations.find((s) => s.optionId === opt.id);
            if (!sim) return null;
            return (
              <div
                key={`sim-${opt.id}`}
                className={`space-y-2 rounded-[14px] border px-4 py-3 ${
                  selectedOptionId === opt.id
                    ? "border-[#181817] bg-[rgba(24,24,23,0.03)]"
                    : "border-[rgba(24,24,23,0.08)] bg-[#FBFAF7]"
                }`}
              >
                <p className="text-[14px] font-medium text-[#202124]">
                  {opt.name}
                </p>
                <ul className="space-y-1 text-[13px] text-[#6f747b]">
                  {sim.scenarios.map((s) => (
                    <li key={s.stage}>
                      {s.stage}：{s.outcome}
                      {s.risk ? `（风险：${s.risk}）` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4 border-t border-[rgba(24,24,23,0.08)] pt-6">
        <LayerEyebrow>5 · 我应该怎么决定？</LayerEyebrow>
        <p className="text-[14px] leading-6 text-[#202124]">
          综合判断：
          {context.options.find((o) => o.isRecommended)?.name || "先补证据再定"}
          。
        </p>
        <p className="text-[13px] text-[#6f747b]">
          状态：{readiness.stateLabel}
          <span className="mx-2 text-[#c5c2ba]">·</span>
          准备度 <Stars n={readiness.stars} />
        </p>
        <ul className="space-y-1 text-[13px] text-[#6f747b]">
          {assessment.rationale.map((r) => (
            <li key={r}>✓ {r}</li>
          ))}
        </ul>

        {!decided ? (
          <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              disabled={decideMut.isPending || !selectedOptionId}
              onClick={async () => {
                if (!selectedOptionId) return;
                setError(null);
                setShowInsist(false);
                try {
                  const mode =
                    selectedOptionId === recommendedId ? "accept" : "modify";
                  await decideMut.mutateAsync({
                    projectId,
                    decisionId: c.id,
                    optionId: selectedOptionId,
                    mode,
                  });
                  await afterMut();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "裁决失败");
                }
              }}
              className={`${primaryBtnClass} w-full sm:w-auto`}
            >
              接受所选方案
            </button>
            <button
              type="button"
              disabled={decideMut.isPending}
              onClick={() => setShowInsist(true)}
              className={`${secondaryBtnClass} w-full sm:w-auto`}
            >
              坚持原方案（需确认风险）
            </button>
          </div>
        ) : (
          <p className="text-[14px] text-[#66735E]">
            已裁决：{data.trace?.founderChoice || c.selectedOptionId}
          </p>
        )}

        {showInsist && !decided ? (
          <div className="space-y-3 rounded-[14px] bg-[rgba(180,124,92,0.08)] p-4">
            <p className="text-[14px] leading-6 text-[#202124]">
              你选择了可能与系统倾向不同的路径。请说明为什么——将写入经营记忆。
            </p>
            <textarea
              value={insistReason}
              onChange={(e) => setInsistReason(e.target.value)}
              rows={3}
              className={fieldClass}
              placeholder="例如：已谈定店长合伙人，现金已到位…"
            />
            <button
              type="button"
              disabled={decideMut.isPending || !selectedOptionId}
              onClick={async () => {
                if (!selectedOptionId) return;
                setError(null);
                try {
                  await decideMut.mutateAsync({
                    projectId,
                    decisionId: c.id,
                    optionId: selectedOptionId,
                    mode: "insist",
                    founderReason: insistReason,
                  });
                  setShowInsist(false);
                  await afterMut();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "确认失败");
                }
              }}
              className={`${primaryBtnClass} min-h-11 text-[14px]`}
            >
              我了解风险，仍然坚持
            </button>
          </div>
        ) : null}

        {data.habitReminder?.reminder ? (
          <div className="space-y-2 border-l-2 border-[rgba(24,24,23,0.12)] py-2 pl-4">
            <p className="text-[11px] tracking-[0.12em] text-[#66735E]">
              经营决策习惯
            </p>
            <p className="text-[13px] leading-6 text-[#202124]">
              {data.habitReminder.reminder}
            </p>
            {data.habitReminder.lastLesson ? (
              <p className="text-[12px] text-[#6f747b]">
                最近一课：{data.habitReminder.lastLesson}
              </p>
            ) : null}
          </div>
        ) : null}

        {c.status === "DECIDED" ? (
          <div className="space-y-4">
            <DecisionLoopRail current="act" projectId={projectId} compact />
            {data.packagePreview?.actions?.length ? (
              <div className="space-y-2 rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-4 py-3">
                <p className="text-[11px] tracking-[0.1em] text-[#66735E]">
                  90 天执行准备（预览）
                </p>
                <ul className="space-y-1.5">
                  {data.packagePreview.actions.map((a) => (
                    <li
                      key={a.title}
                      className="text-[13px] leading-5 text-[#3a3d41]"
                    >
                      · {a.title}
                      {a.dueInDays != null ? (
                        <span className="text-[#6f747b]">
                          {" "}
                          （{a.dueInDays} 天内）
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <button
              type="button"
              disabled={execMut.isPending}
              onClick={async () => {
                setError(null);
                try {
                  await execMut.mutateAsync({ projectId, decisionId: c.id });
                  await afterMut();
                  await utils.dashboard.getHome.invalidate();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "创建执行失败");
                }
              }}
              className={`${primaryBtnClass} w-full sm:w-auto`}
            >
              确认并开始执行
              <ArrowRight className="h-4 w-4" />
            </button>
            <DecisionExitLinks projectId={projectId} />
          </div>
        ) : null}

        {c.status === "EXECUTING" || c.status === "LEARNING" ? (
          <div className="space-y-3 rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] p-4">
            <p className="text-[13px] font-medium text-[#202124]">
              决策旅程 · 复盘（预测 vs 实际）
            </p>
            {data.learning ? (
              <div className="space-y-3">
                <div className="space-y-1 text-[13px] text-[#3a3d41]">
                  <p>预测：{data.learning.prediction}</p>
                  <p>实际：{data.learning.actualResult}</p>
                  <p className="text-[#6f747b]">{data.learning.difference}</p>
                </div>
                <DecisionClosedActions projectId={projectId} archiveOk />
              </div>
            ) : (
              <>
                <textarea
                  value={learnNote}
                  onChange={(e) => setLearnNote(e.target.value)}
                  rows={2}
                  className={fieldClass}
                  placeholder="实际结果：例如 90 天后店长可独立 / 或利润承压…"
                />
                <div className="flex flex-wrap gap-2">
                  {(["success", "partial", "fail"] as const).map((band) => (
                    <button
                      key={band}
                      type="button"
                      disabled={
                        learnMut.isPending || learnNote.trim().length < 4
                      }
                      onClick={async () => {
                        setError(null);
                        try {
                          await learnMut.mutateAsync({
                            projectId,
                            decisionId: c.id,
                            actualResult: learnNote.trim(),
                            successBand: band,
                          });
                          await afterMut();
                        } catch (e) {
                          setError(
                            e instanceof Error ? e.message : "学习写入失败",
                          );
                        }
                      }}
                      className="min-h-11 rounded-[12px] border border-[rgba(24,24,23,0.12)] bg-white px-3.5 text-[13px] font-medium text-[#202124] touch-manipulation active:scale-[0.98] disabled:opacity-50"
                    >
                      记录为
                      {band === "success"
                        ? "成功"
                        : band === "partial"
                          ? "部分达成"
                          : "未达预期"}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : null}
      </section>
    </PageContent>
  );
}
