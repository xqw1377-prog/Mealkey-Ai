import { CheckCircle2, CircleDashed, Flag } from "lucide-react";
import { cn } from "@/lib/utils";
import { MKCard } from "./MKCard";
import type { ProjectTask } from "@/types/operating";

type MKActionListProps = {
  tasks: ProjectTask[];
};

const priorityStyle: Record<ProjectTask["priority"], string> = {
  高优先级: "bg-[rgba(216,144,91,0.14)] text-[#b36e3e]",
  中优先级: "bg-[rgba(83,101,116,0.08)] text-[#536574]",
  观察: "bg-[rgba(32,33,36,0.06)] text-[#5f655d]",
};

export function MKActionList({ tasks }: MKActionListProps) {
  return (
    <MKCard eyebrow="Action List" title="下一步">
      <div className="space-y-3">
        {tasks.map((task) => (
          <div
            key={task.id}
            className="rounded-[24px] border border-[rgba(32,33,36,0.06)] bg-white/80 p-4 transition hover:-translate-y-0.5 hover:shadow-[0_12px_24px_rgba(32,33,36,0.06)]"
          >
            <div className="flex items-start gap-3">
              {task.completed ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-[#8faf8b]" />
              ) : (
                <CircleDashed className="mt-0.5 h-5 w-5 text-[#6f747b]" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-medium text-[#202124]">{task.title}</p>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[11px]",
                      priorityStyle[task.priority]
                    )}
                  >
                    {task.priority}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#5f655d]">{task.description}</p>
              </div>
              <Flag className="h-4 w-4 text-[#536574]" />
            </div>
          </div>
        ))}
      </div>
    </MKCard>
  );
}
