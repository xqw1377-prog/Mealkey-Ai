import { cn } from "@/lib/utils";
import { MKCard } from "./MKCard";
import type { ProjectStageItem } from "@/types/operating";

type MKTimelineProps = {
  items: ProjectStageItem[];
  currentLabel: string;
  progress: number;
  nextStage: string;
};

export function MKTimeline({
  items,
  currentLabel,
  progress,
  nextStage,
}: MKTimelineProps) {
  return (
    <MKCard eyebrow="项目生命周期" title="项目阶段">
      <div className="space-y-5">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {items.map((item, index) => {
            const isCurrent = item.label === currentLabel;
            return (
              <div key={item.key} className="flex min-w-max items-center gap-2">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={cn(
                      "h-3 w-3 rounded-full border",
                      isCurrent
                        ? "border-[#8d6737] bg-[#b79458]"
                        : "border-stone-300 bg-white"
                    )}
                  />
                  <div className="text-center">
                    <p className={cn("text-sm", isCurrent ? "font-semibold text-stone-900" : "text-stone-500")}>
                      {item.label}
                    </p>
                    <p className="mt-1 max-w-[108px] text-[11px] leading-5 text-stone-500">
                      {item.summary}
                    </p>
                  </div>
                </div>
                {index < items.length - 1 && (
                  <div className="mb-10 h-px w-10 bg-[linear-gradient(90deg,#b79458_0%,rgba(183,148,88,0.12)_100%)] md:w-16" />
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm text-stone-600">
            <span>{currentLabel}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-stone-200/80">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#7d5b31_0%,#c9ab6e_100%)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="rounded-[20px] border border-[rgba(40,33,24,0.08)] bg-white/70 px-4 py-3 text-sm text-stone-600">
          下一阶段：
          <span className="ml-2 font-medium text-stone-900">{nextStage}</span>
        </div>
      </div>
    </MKCard>
  );
}
