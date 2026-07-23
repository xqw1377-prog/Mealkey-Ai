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

/** 拍板成功后的标准三 CTA：回对话（主）· 去执行 · 再开一笔 */
export function DecisionClosedActions({
  projectId,
  onRestart,
  archiveOk,
}: {
  projectId: string;
  onRestart?: () => void;
  archiveOk?: boolean;
}) {
  return (
    <div className="space-y-3">
      <DecisionLoopRail current="today" projectId={projectId} />
      <div className="border border-[rgba(102,115,94,0.28)] bg-[#EEF1EA] p-4">
        <p className="text-[14px] font-semibold text-[#202124]">
          {archiveOk ? "已拍板" : "本轮决策已结束"}
        </p>
        <p className="mt-1 text-[13px] leading-6 text-[#5f6368]">
          {archiveOk
            ? "回对话继续经营，或去行动打卡。下次有判断，还从对话进。"
            : "可回对话，或去行动跟进。"}
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Link
            href={`/projects/${projectId}/agent`}
            prefetch={false}
            className="inline-flex min-h-12 items-center justify-center rounded-[16px] bg-[#181817] px-5 text-[15px] font-semibold text-white no-underline touch-manipulation"
          >
            回对话
          </Link>
          <Link
            href={`/projects/${projectId}/decisions`}
            prefetch={false}
            className="inline-flex min-h-12 items-center justify-center rounded-[16px] border border-[rgba(24,24,23,0.12)] bg-white px-5 text-[14px] font-semibold text-[#181817] no-underline touch-manipulation"
          >
            去打卡执行
          </Link>
          {onRestart ? (
            <button
              type="button"
              onClick={onRestart}
              className="inline-flex min-h-12 items-center justify-center rounded-[16px] px-4 text-[13px] font-medium text-[#6f747b] touch-manipulation"
            >
              再开一笔决策
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
