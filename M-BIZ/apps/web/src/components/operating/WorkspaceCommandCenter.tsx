"use client";

type WorkspaceCommandCenterProps = {
  eyebrow: string;
  title: string;
  description: string;
  mapTitle: string;
  axes: {
    top: string;
    bottom: string;
    left: string;
    right: string;
  };
  centerLabel: string;
  judgment: string;
  summary: string;
  palette?: {
    border?: string;
    background?: string;
    title?: string;
    eyebrow?: string;
    body?: string;
    mapCardBg?: string;
    mapInnerBg?: string;
    axis?: string;
    centerBorder?: string;
    centerBg?: string;
    centerText?: string;
    line?: string;
    summaryCardBg?: string;
    summaryCardText?: string;
    summaryLabel?: string;
    summaryNoteBg?: string;
    summaryNoteText?: string;
  };
};

export function WorkspaceCommandCenter({
  eyebrow,
  title,
  description,
  mapTitle,
  axes,
  centerLabel,
  judgment,
  summary,
  palette,
}: WorkspaceCommandCenterProps) {
  const merged = {
    border: palette?.border || "border-[rgba(24,24,23,0.08)]",
    background: palette?.background || "bg-[linear-gradient(180deg,#FBFAF7_0%,#EEF1EA_100%)]",
    title: palette?.title || "text-[#202124]",
    eyebrow: palette?.eyebrow || "text-[#66735E]",
    body: palette?.body || "text-[#5f655d]",
    mapCardBg: palette?.mapCardBg || "bg-white",
    mapInnerBg: palette?.mapInnerBg || "bg-[linear-gradient(180deg,#F8F7F3_0%,#EEF1EA_100%)]",
    axis: palette?.axis || "text-[#202124]",
    centerBorder: palette?.centerBorder || "border-[rgba(102,115,94,0.30)]",
    centerBg: palette?.centerBg || "bg-[rgba(102,115,94,0.12)]",
    centerText: palette?.centerText || "text-[#66735E]",
    line: palette?.line || "bg-[rgba(24,24,23,0.12)]",
    summaryCardBg: palette?.summaryCardBg || "bg-[#202124]",
    summaryCardText: palette?.summaryCardText || "text-white",
    summaryLabel: palette?.summaryLabel || "text-white/70",
    summaryNoteBg: palette?.summaryNoteBg || "bg-white/8",
    summaryNoteText: palette?.summaryNoteText || "text-white/82",
  };

  return (
    <section className={`rounded-[24px] border p-5 shadow-[0_18px_34px_rgba(24,24,23,0.05)] md:p-6 ${merged.border} ${merged.background}`}>
      <p className={`text-[13px] leading-5 tracking-[0.08em] ${merged.eyebrow}`}>{eyebrow}</p>
      <h2 className={`mt-2 text-[28px] leading-[1.15] tracking-[-0.04em] md:text-[34px] ${merged.title}`}>{title}</h2>
      <p className={`mt-3 max-w-3xl text-[15px] leading-[1.8] ${merged.body}`}>{description}</p>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className={`rounded-[22px] border p-5 ${merged.border} ${merged.mapCardBg}`}>
          <p className={`text-[12px] tracking-[0.08em] ${merged.eyebrow}`}>{mapTitle}</p>
          <div className={`mt-5 flex min-h-[210px] items-center justify-center rounded-[20px] p-4 ${merged.mapInnerBg}`}>
            <div className="relative h-[160px] w-full max-w-[420px]">
              <div className={`absolute left-1/2 top-0 -translate-x-1/2 text-[13px] ${merged.axis}`}>{axes.top}</div>
              <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 text-[13px] ${merged.axis}`}>{axes.bottom}</div>
              <div className={`absolute left-0 top-1/2 -translate-y-1/2 text-[13px] ${merged.axis}`}>{axes.left}</div>
              <div className={`absolute right-0 top-1/2 -translate-y-1/2 text-[13px] ${merged.axis}`}>{axes.right}</div>
              <div className={`absolute left-1/2 top-1/2 flex h-24 w-24 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border px-2 text-center text-[13px] font-medium leading-5 ${merged.centerBorder} ${merged.centerBg} ${merged.centerText}`}>
                {centerLabel}
              </div>
              <div className={`absolute left-1/2 top-5 h-[calc(50%-28px)] w-px -translate-x-1/2 ${merged.line}`} />
              <div className={`absolute bottom-5 left-1/2 h-[calc(50%-28px)] w-px -translate-x-1/2 ${merged.line}`} />
              <div className={`absolute left-5 top-1/2 h-px w-[calc(50%-28px)] -translate-y-1/2 ${merged.line}`} />
              <div className={`absolute right-5 top-1/2 h-px w-[calc(50%-28px)] -translate-y-1/2 ${merged.line}`} />
            </div>
          </div>
        </div>
        <div className={`rounded-[22px] border p-5 ${merged.border} ${merged.summaryCardBg} ${merged.summaryCardText}`}>
          <p className={`text-[12px] tracking-[0.08em] ${merged.summaryLabel}`}>当前判断</p>
          <p className="mt-3 text-[24px] leading-[1.3] tracking-[-0.03em]">{judgment}</p>
          <div className={`mt-5 rounded-[18px] p-4 text-[13px] leading-6 ${merged.summaryNoteBg} ${merged.summaryNoteText}`}>
            {summary}
          </div>
        </div>
      </div>
    </section>
  );
}
