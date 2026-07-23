import {
  Brain,
  CheckCircle2,
  LoaderCircle,
  Search,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type MKAgentStage =
  | "idle"
  | "thinking"
  | "researching"
  | "reasoning"
  | "completed";

type MKAgentStateProps = {
  state: MKAgentStage;
  title?: string;
  description?: string;
  references?: string[];
  className?: string;
};

const stateMeta: Record<
  MKAgentStage,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    tone: string;
    badge: string;
  }
> = {
  idle: {
    label: "等待进入议题",
    icon: Sparkles,
    tone: "bg-[rgba(119,128,95,0.08)] text-[#66735E]",
    badge: "准备中",
  },
  thinking: {
    label: "AI 正在理解你的项目",
    icon: LoaderCircle,
    tone: "bg-[rgba(119,128,95,0.10)] text-[#66735E]",
    badge: "理解中",
  },
  researching: {
    label: "正在参考案例与经营规则",
    icon: Search,
    tone: "bg-[rgba(119,128,95,0.10)] text-[#66735E]",
    badge: "检索中",
  },
  reasoning: {
    label: "正在形成判断",
    icon: Brain,
    tone: "bg-[rgba(119,128,95,0.12)] text-[#66735E]",
    badge: "推理中",
  },
  completed: {
    label: "本次判断已完成",
    icon: CheckCircle2,
    tone: "bg-[rgba(119,128,95,0.14)] text-[#66735E]",
    badge: "已完成",
  },
};

export function MKAgentState({
  state,
  title = "AI 正在工作",
  description,
  references = [],
  className,
}: MKAgentStateProps) {
  const meta = stateMeta[state];
  const Icon = meta.icon;

  return (
    <section
      className={cn(
        "rounded-[18px] border border-[rgba(24,24,23,0.08)] bg-white/82 p-4 shadow-[0_14px_28px_rgba(24,24,23,0.04)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12px] leading-5 tracking-[0.01em] text-[#77805F]">
            {title}
          </p>
          <h3 className="mt-1 text-[18px] font-semibold leading-[1.35] tracking-[-0.02em] text-[#171717]">
            {description || meta.label}
          </h3>
        </div>
        <div
          className={cn(
            "inline-flex min-h-8 items-center gap-2 rounded-full px-3 py-1 text-[12px] font-medium",
            meta.tone,
          )}
        >
          <Icon
            className={cn(
              "h-4 w-4",
              state === "thinking" ? "animate-spin" : undefined,
            )}
          />
          {meta.badge}
        </div>
      </div>

      {references.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {references.map((reference) => (
            <span
              key={reference}
              className="rounded-full border border-[rgba(24,24,23,0.08)] bg-[#F6F3ED] px-3 py-1 text-[12px] leading-5 text-[#5f5b54]"
            >
              {reference}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}
