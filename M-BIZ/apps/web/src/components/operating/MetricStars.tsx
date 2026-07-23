import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IndicatorMetric } from "@/types/operating";

type MetricStarsProps = {
  items: IndicatorMetric[];
};

const toneMap: Record<IndicatorMetric["tone"], string> = {
  positive: "text-[#9b7440]",
  warning: "text-[#b1603e]",
  neutral: "text-stone-500",
};

export function MetricStars({ items }: MetricStarsProps) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label} className="flex items-center justify-between gap-4">
          <span className="text-sm text-stone-600">{item.label}</span>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star
                key={`${item.label}-${index}`}
                className={cn(
                  "h-4 w-4",
                  index < item.value
                    ? `${toneMap[item.tone]} fill-current`
                    : "text-stone-300"
                )}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
