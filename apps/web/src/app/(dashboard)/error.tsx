"use client";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-sm flex-col items-center justify-center px-6 text-center">
      <p className="text-[11px] tracking-[0.12em] text-[#B47C5C]">页面出错</p>
      <h1 className="mt-2 font-display text-[22px] font-semibold tracking-[-0.03em] text-[#202124]">
        这一步暂时打不开
      </h1>
      <p className="mt-3 text-[14px] leading-6 text-[#6f747b]">
        若在百度 / 微信里打开，请改用 Safari 或系统浏览器再试。
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex min-h-12 items-center justify-center rounded-[16px] bg-[#181817] px-5 text-[14px] font-semibold text-white touch-manipulation active:scale-[0.98]"
      >
        重试
      </button>
    </div>
  );
}
