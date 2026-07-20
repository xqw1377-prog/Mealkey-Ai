"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { greetingByHour } from "@/lib/time-greeting";
import type { DailyScanV1 } from "@/server/founder-layer/contracts/decision-center";
import {
  DecisionReadinessPanel,
  readinessFromScanFocus,
} from "@/components/operating/DecisionReadinessPanel";
import { VoiceDecisionComposer } from "@/components/operating/VoiceDecisionComposer";
import { VoiceDecisionDialogue } from "@/components/operating/VoiceDecisionDialogue";
import { DecisionLoopRail } from "@/components/operating/DecisionLoopRail";
import {
  decisionEntryPath,
  decisionReadyPath,
} from "@/lib/decision-entry";
import { saveDecisionVoiceBrief } from "@/lib/decision-voice-brief";

const TOPIC_HINTS = [
  "要不要换菜牌",
  "要不要开出这名员工",
  "周末要不要做促销",
  "要不要涨价 / 改套餐",
];

function healthStars(score: number | null | undefined): number {
  if (score == null || !Number.isFinite(score)) return 0;
  if (score >= 90) return 5;
  if (score >= 75) return 4;
  if (score >= 55) return 3;
  if (score >= 35) return 2;
  if (score > 0) return 1;
  return 0;
}

function feedToneLabel(kind: "risk" | "opportunity" | "action_bundle") {
  if (kind === "risk") return "风险";
  if (kind === "opportunity") return "机会";
  return "建议";
}

function bucketLabel(
  bucket: "pending_decide" | "watching" | "executing" | "reviewing",
) {
  if (bucket === "pending_decide") return "待判断";
  if (bucket === "watching") return "观察中";
  if (bucket === "executing") return "执行中";
  return "复盘中";
}

function SecondaryFeedItem({
  card,
}: {
  card: NonNullable<DailyScanV1["primaryCard"]>;
}) {
  const toneText =
    card.tone === "red"
      ? "text-[#B47C5C]"
      : card.tone === "yellow"
        ? "text-[#A68B3C]"
        : "text-[#66735E]";

  return (
    <article className="space-y-1.5 border-l-2 border-[rgba(24,24,23,0.12)] py-2.5 pl-4">
      <p className={`text-[11px] tracking-[0.1em] ${toneText}`}>
        {feedToneLabel(card.kind)}
      </p>
      <h3 className="font-display text-[16px] font-semibold leading-snug text-[#202124]">
        {card.title}
      </h3>
      <p className="text-[13px] leading-5 text-[#6f747b]">{card.situationLine}</p>
      <Link
        href={card.href}
        prefetch={false}
        className="inline-flex min-h-11 items-center gap-1 text-[13px] font-medium text-[#181817] no-underline underline-offset-4 touch-manipulation hover:underline"
      >
        去判断
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </article>
  );
}

export function DecisionCenterMorning({
  scan,
  projectId,
  onToggleAction,
  pendingActionId,
  recentActionUpdate,
}: {
  scan: DailyScanV1;
  projectId: string;
  onToggleAction?: (actionId: string) => void;
  pendingActionId?: string | null;
  recentActionUpdate?: { id: string; done: boolean; title: string } | null;
}) {
  const router = useRouter();
  const [topicDraft, setTopicDraft] = useState("");
  const [intakeMode, setIntakeMode] = useState<"dialogue" | "oneshot">(
    "dialogue",
  );
  const d = scan.diagnosis;
  const focus = scan.todayFocus;
  const identity = scan.identityHint;
  const greeting = greetingByHour();
  const stars = healthStars(d.healthScore);
  const secondary = scan.secondaryCards.slice(0, 3);
  const readiness = readinessFromScanFocus({
    stars: focus.readinessStars,
    known: focus.known,
    missing: focus.missing,
    externalIntelReady: identity.externalIntelReady,
  });

  const hasSystemFocus = focus.kind === "decide" || focus.kind === "watch";
  const inboxItems = scan.inbox.items || [];
  const bucketFirstHref = useMemo(() => {
    const archive = `/projects/${projectId}/decisions`;
    const pending = inboxItems.find((i) => i.bucket === "pending_decide");
    const watching = inboxItems.find((i) => i.bucket === "watching");
    const executing = inboxItems.find((i) => i.bucket === "executing");
    const reviewing = inboxItems.find((i) => i.bucket === "reviewing");
    return {
      待判断: pending?.href || focus.href || archive,
      观察中: watching?.href || archive,
      执行中: executing?.href || archive,
      复盘中: reviewing?.href || archive,
    } as Record<string, string>;
  }, [inboxItems, projectId, focus.href]);

  const focusCta =
    scan.primaryCta.label ||
    (focus.kind === "observe"
      ? identity.missingAnchors.length
        ? "补齐经营身份"
        : "自己发起一笔决策"
      : "进入决策");

  function goWithTopic(topic: string) {
    const t = topic.trim();
    if (!t) return;
    router.push(decisionEntryPath(projectId, t));
  }

  function startHint(hint: string) {
    if (intakeMode === "oneshot") {
      setTopicDraft(hint);
      goWithTopic(hint);
      return;
    }
    saveDecisionVoiceBrief(projectId, {
      topic: hint,
      whyNow: "工作中需要尽快拍板",
      decisionQuestion: hint,
      constraints: "不突破现金底线、合规底线与团队稳定",
      successLooksLike: "有明确选择、能执行、能复盘成败",
    });
    router.push(
      `/projects/${projectId}/decision-room?intake=voice&topic=${encodeURIComponent(hint)}`,
    );
  }

  const voiceBlock = (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] tracking-[0.12em] text-[#66735E]">
          {hasSystemFocus ? "或自己说一笔" : "语音说清这件事"}
        </p>
        <button
          type="button"
          onClick={() =>
            setIntakeMode((m) => (m === "dialogue" ? "oneshot" : "dialogue"))
          }
          className="text-[12px] font-medium text-[#66735E] underline-offset-4 touch-manipulation hover:underline"
        >
          {intakeMode === "dialogue" ? "改成一句话" : "改回对话引导"}
        </button>
      </div>

      {intakeMode === "dialogue" ? (
        <VoiceDecisionDialogue
          projectId={projectId}
          seedTopic={hasSystemFocus ? focus.title : undefined}
          completeLabel="采齐了，去判断"
          onComplete={(brief) => {
            saveDecisionVoiceBrief(projectId, brief);
            router.push(decisionReadyPath(projectId, brief.topic));
          }}
        />
      ) : (
        <VoiceDecisionComposer
          projectId={projectId}
          value={topicDraft}
          onChange={setTopicDraft}
          onSubmit={() => goWithTopic(topicDraft)}
          submitLabel="进入决策"
          placeholder="例如：滞销菜要不要换掉…"
          compact
        />
      )}

      <div className="flex flex-wrap gap-2">
        {TOPIC_HINTS.map((hint) => (
          <button
            key={hint}
            type="button"
            onClick={() => startHint(hint)}
            className="inline-flex min-h-10 items-center rounded-full border border-[rgba(24,24,23,0.1)] bg-white px-3 text-[12px] text-[#3a3d41] touch-manipulation"
          >
            {hint}
          </button>
        ))}
      </div>
    </section>
  );

  const focusBlock = (
    <section className="space-y-4 border-y border-[rgba(24,24,23,0.1)] py-6">
      <p className="text-[11px] tracking-[0.14em] text-[#66735E]">
        {focus.kind === "decide"
          ? "今天最该先定"
          : focus.kind === "watch"
            ? "今天先盯紧"
            : "今天暂无强制事项"}
      </p>
      <h2 className="font-display text-[22px] font-semibold leading-snug tracking-[-0.03em] text-[#202124] md:text-[26px]">
        {focus.title}
      </h2>
      <p className="text-[15px] leading-7 text-[#3a3d41]">{focus.whyToday}</p>
      {hasSystemFocus ? (
        <DecisionReadinessPanel readiness={readiness} compact />
      ) : null}
      <Link
        href={scan.primaryCta.href || focus.href}
        prefetch={false}
        className={`inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] px-5 text-[15px] font-semibold no-underline touch-manipulation active:scale-[0.98] md:w-auto ${
          hasSystemFocus
            ? "bg-[#181817] text-white"
            : "border border-[rgba(24,24,23,0.14)] bg-white text-[#181817]"
        }`}
      >
        {focusCta}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );

  return (
    <div className="space-y-8">
      <header className="space-y-2.5">
        <p className="text-[11px] font-medium tracking-[0.16em] text-[#66735E]">
          餐启 · 今日决策
        </p>
        <h1 className="font-display text-[30px] font-semibold leading-[1.1] tracking-[-0.045em] text-[#202124] md:text-[36px]">
          {greeting}，{d.greetingName}
        </h1>
        <p className="text-[15px] leading-6 text-[#3a3d41]">
          今天工作上，有没有需要你拍板的事？
        </p>
        <p className="text-[13px] leading-6 text-[#6f747b]">
          {d.restaurantName}
          {d.healthScore != null ? (
            <span className="ml-2 text-[#9aa0a6]">
              {"★".repeat(stars)}
              {"☆".repeat(Math.max(0, 5 - stars))}
            </span>
          ) : null}
        </p>
        <DecisionLoopRail current="capture" projectId={projectId} compact />
      </header>

      {/* 有系统焦点：主 CTA 独占；自助发起退到次级，避免首屏抢注意力 */}
      {hasSystemFocus ? (
        <>
          {focusBlock}
          <details className="border-t border-[rgba(24,24,23,0.06)] pt-4">
            <summary className="cursor-pointer list-none text-[13px] font-medium text-[#6f747b] underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden">
              或自己发起一笔决策
            </summary>
            <div className="mt-4">{voiceBlock}</div>
          </details>
        </>
      ) : (
        <>
          {voiceBlock}
          {focusBlock}
        </>
      )}

      {secondary.length > 0 ? (
        <details className="space-y-3">
          <summary className="cursor-pointer list-none text-[11px] tracking-[0.12em] text-[#66735E] underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden">
            另外留意 · {secondary.length}
          </summary>
          <div className="mt-3 space-y-3">
            {secondary.map((card) => (
              <SecondaryFeedItem key={card.cardId} card={card} />
            ))}
          </div>
        </details>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <p className="text-[11px] tracking-[0.12em] text-[#66735E]">
            决策收件箱
          </p>
          <Link
            href={`/projects/${projectId}/decisions`}
            prefetch={false}
            className="text-[12px] font-medium text-[#66735E] underline-offset-4 hover:underline"
          >
            全部档案
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(
            [
              ["待判断", scan.inbox.pendingDecide],
              ["观察中", scan.inbox.watching],
              ["执行中", scan.inbox.executing],
              ["复盘中", scan.inbox.reviewing],
            ] as const
          ).map(([label, count]) => {
            const href =
              count > 0
                ? bucketFirstHref[label] || `/projects/${projectId}/decisions`
                : decisionEntryPath(projectId, "我现在该先决定什么");
            return (
              <Link
                key={label}
                href={href}
                prefetch={false}
                className="rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-3 py-2.5 no-underline transition-colors touch-manipulation hover:border-[rgba(24,24,23,0.18)] hover:bg-white"
              >
                <p className="text-[11px] tracking-[0.08em] text-[#6f747b]">
                  {label}
                </p>
                <p className="mt-1 font-display text-[20px] font-semibold tracking-[-0.03em] text-[#202124]">
                  {count}
                </p>
              </Link>
            );
          })}
        </div>
        {inboxItems.length > 0 ? (
          <ul className="space-y-1 border-t border-[rgba(24,24,23,0.06)] pt-3">
            {inboxItems.slice(0, 4).map((it) => (
              <li key={it.id}>
                <Link
                  href={it.href}
                  prefetch={false}
                  className="flex min-h-11 items-center justify-between gap-3 text-[14px] text-[#202124] no-underline underline-offset-4 touch-manipulation hover:underline"
                >
                  <span className="min-w-0 truncate">{it.title}</span>
                  <span className="shrink-0 text-[12px] text-[#66735E]">
                    {bucketLabel(it.bucket)}
                    <ArrowRight className="ml-1 inline h-3.5 w-3.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] leading-6 text-[#6f747b]">
            还没有待跟进事项。拍板后会出现在这里。
          </p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <p className="text-[11px] tracking-[0.12em] text-[#66735E]">
            今日要做的
          </p>
          <Link
            href={`/projects/${projectId}/decisions`}
            prefetch={false}
            className="text-[12px] font-medium text-[#66735E] underline-offset-4 hover:underline"
          >
            去打卡
          </Link>
        </div>
        {recentActionUpdate ? (
          <p
            role="status"
            aria-live="polite"
            className={`rounded-[14px] px-3 py-2 text-[12px] font-medium ${
              recentActionUpdate.done
                ? "bg-[rgba(102,115,94,0.10)] text-[#465240]"
                : "bg-[rgba(24,24,23,0.06)] text-[#5f6368]"
            }`}
          >
            {recentActionUpdate.done
              ? `已完成：${recentActionUpdate.title}`
              : `已恢复未完成：${recentActionUpdate.title}`}
          </p>
        ) : null}
        {scan.actions.length === 0 ? (
          <p className="text-[13px] leading-6 text-[#6f747b]">
            拍板后的动作会出现在这里。
          </p>
        ) : (
          <ul className="space-y-2">
            {scan.actions.map((a) => {
              const busy = pendingActionId === a.id;
              const justUpdated = recentActionUpdate?.id === a.id;
              return (
                <li
                  key={a.id}
                  className={`flex items-start gap-3 rounded-[16px] px-3 py-3 transition ${
                    justUpdated
                      ? recentActionUpdate?.done
                        ? "bg-[rgba(102,115,94,0.10)] ring-1 ring-[rgba(102,115,94,0.16)]"
                        : "bg-[rgba(24,24,23,0.04)] ring-1 ring-[rgba(24,24,23,0.08)]"
                      : a.done
                        ? "bg-[rgba(24,24,23,0.03)]"
                        : "bg-white"
                  }`}
                >
                  {a.checkable && onToggleAction ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onToggleAction(a.id)}
                      className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center touch-manipulation disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label={a.done ? "标为未完成" : "标为完成"}
                    >
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-[6px] border ${
                          a.done
                            ? "border-[#66735E] bg-[#66735E] text-white"
                            : "border-[rgba(24,24,23,0.2)] bg-white"
                        }`}
                      >
                        {a.done ? <Check className="h-3.5 w-3.5" /> : null}
                      </span>
                    </button>
                  ) : (
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c5c2ba]" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[15px] leading-6 ${
                          a.done ? "text-[#6f747b] line-through" : "text-[#202124]"
                        }`}
                      >
                        {a.title}
                      </span>
                      {a.done ? (
                        <span className="inline-flex items-center rounded-full bg-[rgba(102,115,94,0.12)] px-2.5 py-1 text-[11px] font-medium text-[#465240]">
                          已完成
                        </span>
                      ) : null}
                      {justUpdated && !recentActionUpdate?.done ? (
                        <span className="inline-flex items-center rounded-full bg-[rgba(24,24,23,0.08)] px-2.5 py-1 text-[11px] font-medium text-[#5f6368]">
                          已恢复
                        </span>
                      ) : null}
                    </div>
                    {justUpdated ? (
                      <p className="mt-1 text-[12px] text-[#66735E]">
                        {recentActionUpdate?.done
                          ? "已同步到今日执行清单"
                          : "已回到待完成状态"}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <details className="space-y-2 border-t border-[rgba(24,24,23,0.08)] pt-5">
        <summary className="cursor-pointer list-none text-[11px] tracking-[0.12em] text-[#66735E] underline-offset-4 hover:underline [&::-webkit-details-marker]:hidden">
          经营身份
          {!identity.externalIntelReady ? " · 待补齐" : ""}
        </summary>
        <div className="mt-3 space-y-2">
          <p
            className={`text-[13px] leading-6 ${
              identity.externalIntelReady ? "text-[#6f747b]" : "text-[#B47C5C]"
            }`}
          >
            {identity.summaryLine}
          </p>
          {!identity.externalIntelReady ? (
            <Link
              href={identity.patchHref}
              prefetch={false}
              className="inline-flex items-center gap-1 text-[14px] font-medium text-[#181817] underline-offset-4 hover:underline"
            >
              补齐品牌与地理，才能用外部证据
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <Link
              href={`/projects/${projectId}/business-identity`}
              prefetch={false}
              className="inline-flex text-[13px] text-[#66735E] underline-offset-4 hover:underline"
            >
              查看经营身份
            </Link>
          )}
          {d.stageLabel ? (
            <p className="text-[12px] text-[#6f747b]">
              {d.stageLabel}
              {d.primaryCause ? ` · ${d.primaryCause}` : ""}
            </p>
          ) : null}
        </div>
      </details>
    </div>
  );
}
