import { PanelTopOpen } from "lucide-react";
import { MKCard } from "./MKCard";

type MKMemoryItem = {
  label: string;
  title: string;
  meta?: string;
};

type MKMemoryCardProps = {
  title?: string;
  eyebrow?: string;
  description?: string;
  items: MKMemoryItem[];
};

export function MKMemoryCard({
  title = "关键判断历史",
  eyebrow = "记忆",
  description = "不是记录，是长期理解",
  items,
}: MKMemoryCardProps) {
  return (
    <MKCard
      eyebrow={eyebrow}
      title={title}
      aside={
        description ? (
          <p className="text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">{description}</p>
        ) : (
          <PanelTopOpen className="h-5 w-5 text-[#66735E]" />
        )
      }
    >
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={`${item.label}-${index}`}
            className="rounded-[16px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] p-4"
          >
            <p className="text-[12px] leading-5 tracking-[0.01em] text-[#6f747b]">{item.label}</p>
            <p className="mt-1 text-[15px] leading-[1.7] text-[#202124]">{item.title}</p>
            {item.meta ? (
              <p className="mt-2 text-[13px] leading-5 text-[#66735E]">{item.meta}</p>
            ) : null}
          </div>
        ))}
      </div>
    </MKCard>
  );
}
