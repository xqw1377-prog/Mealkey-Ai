"use client";

export default function OnboardingError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F6F3ED] px-6">
      <div className="max-w-sm space-y-4 text-center">
        <p className="text-[12px] tracking-[0.08em] text-[#B47C5C]">建企页出错</p>
        <h1 className="text-[22px] font-semibold text-[#202124]">这一步暂时打不开</h1>
        <p className="text-[14px] leading-6 text-[#6f747b]">
          若在百度 / 微信里打开，请改用 Safari 或系统浏览器再试。
        </p>
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#181817] px-5 text-[14px] font-medium text-white"
        >
          重试
        </button>
      </div>
    </main>
  );
}
