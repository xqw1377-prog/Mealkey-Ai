"use client";

type ChiefAdvisorPanelProps = {
  title: string;
  summary: string;
  learned: string[];
  missing: string[];
  nextStep: string;
  palette?: {
    border?: string;
    containerBg?: string;
    title?: string;
    eyebrow?: string;
    chipBg?: string;
    chipText?: string;
    body?: string;
    softBg?: string;
    nextBorder?: string;
    nextBg?: string;
    note?: string;
  };
};

export function ChiefAdvisorPanel({
  title,
  summary,
  learned,
  missing,
  nextStep,
  palette,
}: ChiefAdvisorPanelProps) {
  const mergedPalette = {
    border: palette?.border || "border-[rgba(24,24,23,0.08)]",
    containerBg: palette?.containerBg || "bg-white",
    title: palette?.title || "text-[#202124]",
    eyebrow: palette?.eyebrow || "text-[#66735E]",
    chipBg: palette?.chipBg || "bg-[rgba(102,115,94,0.10)]",
    chipText: palette?.chipText || "text-[#66735E]",
    body: palette?.body || "text-[#5f655d]",
    softBg: palette?.softBg || "bg-[#F8F7F3]",
    nextBorder: palette?.nextBorder || "border-[rgba(24,24,23,0.08)]",
    nextBg: palette?.nextBg || "bg-[linear-gradient(180deg,#FFFFFF_0%,#F8F7F3_100%)]",
    note: palette?.note || "text-[#66735E]",
  };

  return (
    <section className={`rounded-[24px] border p-4 shadow-[0_14px_28px_rgba(24,24,23,0.05)] md:p-5 ${mergedPalette.border} ${mergedPalette.containerBg}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className={`text-[12px] tracking-[0.08em] ${mergedPalette.eyebrow}`}>AI Chief Advisor</p>
          <h3 className={`mt-1 text-[18px] font-semibold leading-[1.3] ${mergedPalette.title}`}>{title}</h3>
        </div>
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] ${mergedPalette.chipBg} ${mergedPalette.chipText}`}>
          在线分析
        </span>
      </div>
      <p className={`mt-3 text-[14px] leading-[1.8] ${mergedPalette.body}`}>{summary}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <div className={`rounded-[18px] p-4 ${mergedPalette.softBg}`}>
          <p className={`text-[12px] tracking-[0.08em] ${mergedPalette.eyebrow}`}>已掌握</p>
          <ul className={`mt-2 space-y-2 text-[13px] leading-6 ${mergedPalette.title}`}>
            {learned.map((item) => (
              <li key={item}>✓ {item}</li>
            ))}
          </ul>
        </div>
        <div className={`rounded-[18px] p-4 ${mergedPalette.softBg}`}>
          <p className={`text-[12px] tracking-[0.08em] ${mergedPalette.eyebrow}`}>待补</p>
          <ul className={`mt-2 space-y-2 text-[13px] leading-6 ${mergedPalette.title}`}>
            {missing.map((item) => (
              <li key={item}>○ {item}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className={`mt-4 rounded-[18px] border p-4 ${mergedPalette.nextBorder} ${mergedPalette.nextBg}`}>
        <p className={`text-[12px] tracking-[0.08em] ${mergedPalette.note}`}>建议下一步</p>
        <p className={`mt-2 text-[14px] leading-[1.8] ${mergedPalette.title}`}>{nextStep}</p>
      </div>
    </section>
  );
}
