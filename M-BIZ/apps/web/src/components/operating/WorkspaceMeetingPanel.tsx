"use client";

type WorkspaceMeetingItem = {
  title: string;
  body: string;
  toneNote?: string;
};

type WorkspaceMeetingPanelProps = {
  eyebrow: string;
  title: string;
  items: WorkspaceMeetingItem[];
  summary: string;
  summaryLabel?: string;
  conflict?: string;
  conflictLabel?: string;
  palette?: {
    border?: string;
    background?: string;
    eyebrow?: string;
    title?: string;
    itemBorder?: string;
    itemBg?: string;
    itemTitle?: string;
    itemBody?: string;
    itemToneBg?: string;
    itemToneText?: string;
    summaryBg?: string;
    summaryText?: string;
    summaryLabel?: string;
    summaryNoteBg?: string;
    summaryNoteText?: string;
  };
};

export function WorkspaceMeetingPanel({
  eyebrow,
  title,
  items,
  summary,
  summaryLabel = "AI 主持总结",
  conflict,
  conflictLabel = "核心冲突",
  palette,
}: WorkspaceMeetingPanelProps) {
  const merged = {
    border: palette?.border || "border-[rgba(24,24,23,0.08)]",
    background: palette?.background || "bg-[linear-gradient(180deg,#FFFFFF_0%,#F8F7F3_100%)]",
    eyebrow: palette?.eyebrow || "text-[#66735E]",
    title: palette?.title || "text-[#202124]",
    itemBorder: palette?.itemBorder || "border-[rgba(24,24,23,0.08)]",
    itemBg: palette?.itemBg || "bg-white",
    itemTitle: palette?.itemTitle || "text-[#202124]",
    itemBody: palette?.itemBody || "text-[#202124]",
    itemToneBg: palette?.itemToneBg || "bg-[rgba(180,124,92,0.08)]",
    itemToneText: palette?.itemToneText || "text-[#B47C5C]",
    summaryBg: palette?.summaryBg || "bg-[#202124]",
    summaryText: palette?.summaryText || "text-white",
    summaryLabel: palette?.summaryLabel || "text-white/70",
    summaryNoteBg: palette?.summaryNoteBg || "bg-white/10",
    summaryNoteText: palette?.summaryNoteText || "text-white/88",
  };

  return (
    <section className={`rounded-[24px] border p-5 shadow-[0_18px_32px_rgba(24,24,23,0.06)] ${merged.border} ${merged.background}`}>
      <div>
        <p className={`text-[12px] tracking-[0.08em] ${merged.eyebrow}`}>{eyebrow}</p>
        <h3 className={`mt-1 text-[22px] leading-[1.3] tracking-[-0.03em] ${merged.title}`}>{title}</h3>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={`${item.title}-${index}`} className={`rounded-[18px] border px-4 py-4 ${merged.itemBorder} ${merged.itemBg}`}>
              <p className={`text-[12px] tracking-[0.08em] ${merged.eyebrow}`}>{item.title}</p>
              <p className={`mt-2 text-[14px] leading-[1.8] ${merged.itemBody}`}>{item.body}</p>
              {item.toneNote ? (
                <div className={`mt-3 rounded-[14px] px-3 py-3 text-[13px] leading-6 ${merged.itemToneBg} ${merged.itemToneText}`}>
                  {item.toneNote}
                </div>
              ) : null}
            </div>
          ))}
        </div>
        <div className={`rounded-[20px] p-5 ${merged.summaryBg} ${merged.summaryText}`}>
          <p className={`text-[12px] tracking-[0.08em] ${merged.summaryLabel}`}>{summaryLabel}</p>
          <p className="mt-3 text-[20px] leading-[1.45] tracking-[-0.03em]">{summary}</p>
          {conflict ? (
            <div className={`mt-4 rounded-[16px] px-4 py-4 ${merged.summaryNoteBg} ${merged.summaryNoteText}`}>
              <p className={`text-[12px] tracking-[0.08em] ${merged.summaryLabel}`}>{conflictLabel}</p>
              <p className="mt-2 text-[14px] leading-[1.8]">{conflict}</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
