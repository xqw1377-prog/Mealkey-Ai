type TimelineItem = {
  date: string;
  title: string;
  conclusion: string;
};

type MKDecisionTimelineProps = {
  title?: string;
  items: TimelineItem[];
};

export function MKDecisionTimeline({
  title = "最近经营判断",
  items,
}: MKDecisionTimelineProps) {
  return (
    <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_14px_28px_rgba(24,24,23,0.04)]">
      <div>
        <p className="text-[13px] leading-5 tracking-[0.01em] text-[#66735E]">经营判断时间线</p>
        <h2 className="mt-1 text-[19px] font-semibold leading-[1.25] tracking-[-0.02em] text-[#202124]">{title}</h2>
      </div>

      <div className="mt-5 space-y-0">
        {items.map((item, index) => (
          <div key={`${item.date}-${item.title}-${index}`} className="grid grid-cols-[54px_1fr] gap-3">
            <div className="flex flex-col items-center">
              <div className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-[rgba(102,115,94,0.10)] px-2 text-[11px] font-medium leading-5 text-[#66735E]">
                {item.date}
              </div>
              {index < items.length - 1 ? <div className="mt-2 h-full w-px bg-[rgba(24,24,23,0.08)]" /> : null}
            </div>
            <div className="pb-4">
              <div className="rounded-[16px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-4 py-3">
                <p className="text-[15px] leading-6 text-[#202124]">{item.title}</p>
                <p className="mt-2 text-[14px] leading-[1.7] text-[#6f747b]">{item.conclusion}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
