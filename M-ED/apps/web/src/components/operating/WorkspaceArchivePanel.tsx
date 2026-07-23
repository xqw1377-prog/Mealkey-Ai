"use client";

type WorkspaceArchivePanelProps = {
  eyebrow: string;
  title: string;
  emptyText: string;
  items: Array<{
    id: string;
    title: string;
    summary?: string;
  }>;
  palette?: {
    border?: string;
    background?: string;
    eyebrow?: string;
    title?: string;
    itemBg?: string;
    itemTitle?: string;
    itemBody?: string;
    emptyBg?: string;
    emptyText?: string;
  };
};

export function WorkspaceArchivePanel({
  eyebrow,
  title,
  emptyText,
  items,
  palette,
}: WorkspaceArchivePanelProps) {
  const merged = {
    border: palette?.border || "border-[rgba(24,24,23,0.08)]",
    background: palette?.background || "bg-white",
    eyebrow: palette?.eyebrow || "text-[#66735E]",
    title: palette?.title || "text-[#202124]",
    itemBg: palette?.itemBg || "bg-[#F8F7F3]",
    itemTitle: palette?.itemTitle || "text-[#202124]",
    itemBody: palette?.itemBody || "text-[#5f655d]",
    emptyBg: palette?.emptyBg || "bg-[#F8F7F3]",
    emptyText: palette?.emptyText || "text-[#5f655d]",
  };

  return (
    <section className={`rounded-[24px] border p-5 shadow-[0_18px_34px_rgba(24,24,23,0.05)] ${merged.border} ${merged.background}`}>
      <p className={`text-[12px] tracking-[0.08em] ${merged.eyebrow}`}>{eyebrow}</p>
      <h2 className={`mt-1 text-[22px] leading-[1.25] tracking-[-0.03em] ${merged.title}`}>{title}</h2>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className={`rounded-[18px] px-4 py-4 text-[14px] leading-7 ${merged.emptyBg} ${merged.emptyText}`}>
            {emptyText}
          </div>
        ) : (
          items.map((item) => (
            <div key={item.id} className={`rounded-[16px] px-4 py-3 ${merged.itemBg}`}>
              <p className={`text-[14px] font-medium ${merged.itemTitle}`}>{item.title}</p>
              {item.summary ? (
                <p className={`mt-1 text-[13px] leading-6 ${merged.itemBody}`}>{item.summary}</p>
              ) : null}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
