/**
 * 外呼/调研降级强制可见条：不可当「已完成」忽略。
 */
export function EngineDegradationBanner({
  mode,
  note,
  blockConfirm = false,
}: {
  mode?: string | null;
  note?: string | null;
  /** 为 true 时强调：不能点确认当正式交付 */
  blockConfirm?: boolean;
}) {
  const degraded =
    Boolean(note) ||
    mode === "heuristic" ||
    mode === "local_intel";
  if (!degraded) return null;

  const modeText =
    mode === "heuristic"
      ? "已降级：不是正式结果"
      : mode === "local_intel"
        ? "联网不足，主要靠本地信息"
        : mode === "hybrid"
          ? "部分能力已降级"
          : "顾问能力已降级";

  return (
    <div
      role="alert"
      className="sticky top-0 z-30 border border-[rgba(180,124,92,0.4)] bg-[rgba(255,248,240,0.98)] px-3 py-3 shadow-[0_1px_0_rgba(24,24,23,0.06)] backdrop-blur-sm"
    >
      <p className="text-[13px] font-semibold leading-5 text-[#8a5a3c]">
        {modeText}
      </p>
      {note ? (
        <p className="mt-1 text-[13px] leading-6 text-[#6f4a35]">{note}</p>
      ) : null}
      <p className="mt-1.5 text-[12px] leading-5 text-[#9a6b4f]">
        {blockConfirm
          ? "可以先看，修好后再正式确认。"
          : "别把降级结果当最终方案。"}
      </p>
    </div>
  );
}
