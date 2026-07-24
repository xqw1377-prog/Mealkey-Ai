"use client";

import Link from "next/link";

export type DecisionLoopStage =
  | "capture"
  | "judge"
  | "decide"
  | "act"
  | "review"
  | "today";

const STAGES: Array<{ id: DecisionLoopStage; label: string }> = [
  { id: "capture", label: "采集" },
  { id: "judge", label: "判断" },
  { id: "decide", label: "拍板" },
  { id: "act", label: "执行" },
  { id: "review", label: "复盘" },
  { id: "today", label: "对话" },
];

/**
 * 决策闭环轨道：采集 → 判断 → 拍板 → 执行 → 复盘 → 回对话。
 */
export function DecisionLoopRail({
  current,
  projectId,
  compact,
}: {
  current: DecisionLoopStage;
  projectId?: string;
  compact?: boolean;
}) {
  const idx = STAGES.findIndex((s) => s.id === current);
  return (
    <div
      className={
        compact
          ? "space-y-1.5"
          : "space-y-2 border-y border-[rgba(24,24,23,0.08)] py-3"
      }
    >
      {!compact ? (
        <p className="text-[11px] tracking-[0.12em] text-[#66735E]">
          决策闭环
        </p>
      ) : null}
      <ol className="flex items-center gap-1">
        {STAGES.map((s, i) => {
          const done = i < idx;
          const active = i === idx;
          return (
            <li key={s.id} className="flex min-w-0 flex-1 items-center gap-1">
              <span
                className={`flex h-8 w-full items-center justify-center rounded-[12px] text-[11px] font-medium tracking-wide ${
                  active
                    ? "bg-[#181817] text-white"
                    : done
                      ? "bg-[rgba(102,115,94,0.18)] text-[#4a5544]"
                      : "bg-white text-[#9aa0a6] ring-1 ring-[rgba(24,24,23,0.08)]"
                }`}
              >
                {s.label}
              </span>
              {i < STAGES.length - 1 ? (
                <span
                  className={`h-px w-1.5 shrink-0 sm:w-2 ${
                    done || active ? "bg-[#66735E]" : "bg-[rgba(24,24,23,0.1)]"
                  }`}
                  aria-hidden
                />
              ) : null}
            </li>
          );
        })}
      </ol>
      {projectId && !compact ? (
        <p className="text-[12px] leading-5 text-[#6f747b]">
          拍板后记得{" "}
          <Link
            href={`/projects/${projectId}/agent`}
            prefetch={false}
            className="font-medium text-[#181817] underline-offset-2 hover:underline"
          >
            回对话
          </Link>
          跟进。
        </p>
      ) : null}
    </div>
  );
}

type ExitVariant = "panel" | "links" | "onDark";

/** 标准三出口链接：回对话 · 去跟进 · 经营动态 */
export function DecisionExitLinks({
  projectId,
  variant = "links",
}: {
  projectId: string;
  variant?: Exclude<ExitVariant, "panel">;
}) {
  const onDark = variant === "onDark";
  const primary = onDark
    ? "inline-flex min-h-11 items-center justify-center rounded-full bg-white px-4 text-[13px] font-medium text-[#202124] no-underline touch-manipulation"
    : "inline-flex min-h-12 items-center justify-center rounded-[16px] bg-[#181817] px-5 text-[15px] font-semibold text-white no-underline touch-manipulation";
  const secondary = onDark
    ? "inline-flex min-h-11 items-center justify-center rounded-full border border-white/30 px-4 text-[13px] font-medium text-white no-underline touch-manipulation"
    : "inline-flex min-h-12 items-center justify-center rounded-[16px] border border-[rgba(24,24,23,0.12)] bg-white px-5 text-[14px] font-semibold text-[#181817] no-underline touch-manipulation";

  return (
    <div
      className={
        onDark
          ? "flex flex-wrap gap-2"
          : "flex flex-col gap-2 sm:flex-row sm:flex-wrap"
      }
    >
      <Link
        href={`/projects/${projectId}/agent`}
        prefetch={false}
        className={primary}
      >
        回对话
      </Link>
      <Link
        href={`/projects/${projectId}/decisions`}
        prefetch={false}
        className={secondary}
      >
        去跟进
      </Link>
      <Link href="/dashboard?radar=1" prefetch={false} className={secondary}>
        经营动态
      </Link>
    </div>
  );
}

/** 拍板成功后的标准三出口：回对话 · 去跟进 · 经营动态 */
export function DecisionClosedActions({
  projectId,
  onRestart,
  archiveOk,
  variant = "panel",
}: {
  projectId: string;
  onRestart?: () => void;
  archiveOk?: boolean;
  /** panel=结案卡；links=仅三链；onDark=深色结案区 */
  variant?: ExitVariant;
}) {
  if (variant === "links" || variant === "onDark") {
    return (
      <div className={variant === "onDark" ? "mt-4" : undefined}>
        <DecisionExitLinks projectId={projectId} variant={variant} />
        {onRestart ? (
          <button
            type="button"
            onClick={onRestart}
            className={`mt-2 inline-flex min-h-10 items-center justify-center text-[13px] font-medium touch-manipulation ${
              variant === "onDark" ? "text-white/70" : "text-[#6f747b]"
            }`}
          >
            再开一笔
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="border border-[rgba(102,115,94,0.28)] bg-[#EEF1EA] p-4">
      <p className="text-[14px] font-semibold text-[#202124]">
        {archiveOk ? "已拍板" : "本轮决策已结束"}
      </p>
      <p className="mt-1 text-[13px] leading-6 text-[#5f6368]">
        {archiveOk
          ? "回对话继续说，或去跟进执行与复盘。"
          : "可回对话，或去跟进。"}
      </p>
      <div className="mt-3">
        <DecisionExitLinks projectId={projectId} variant="links" />
      </div>
      {onRestart ? (
        <button
          type="button"
          onClick={onRestart}
          className="mt-2 inline-flex min-h-10 items-center justify-center text-[13px] font-medium text-[#6f747b] touch-manipulation"
        >
          再开一笔
        </button>
      ) : null}
    </div>
  );
}
