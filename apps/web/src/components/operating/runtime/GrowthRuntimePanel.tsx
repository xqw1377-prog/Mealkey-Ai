"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CapabilityEightRadar } from "@/components/operating/CapabilityEightRadar";
import { IntelligenceProfilePanel } from "@/components/operating/IntelligenceProfilePanel";
import { buildMeetingHref, detectDepartmentFromTopic } from "@/lib/meeting";
import { trpc } from "@/lib/trpc";
import { panelChrome, type AtelierProps } from "./atelier";

type Props = AtelierProps & {
  projectId: string;
  showRadar?: boolean;
};

const EVENT_LABEL: Record<string, string> = {
  validation_completed: "验证完成",
  decision_pattern: "决策模式",
  cognitive_gap: "认知差距",
  capability_refresh: "能力刷新",
};

export function GrowthRuntimePanel({
  projectId,
  showRadar = true,
  atelier,
}: Props) {
  const ui = panelChrome(atelier);
  const { data, isLoading, error } = trpc.growthRuntime.getSnapshot.useQuery(
    { projectId },
    { enabled: Boolean(projectId) },
  );
  const { data: tasksData } = trpc.growthRuntime.listTasks.useQuery(
    { projectId },
    { enabled: Boolean(projectId) },
  );
  const { data: eventsData } = trpc.growthRuntime.listEvents.useQuery(
    { projectId },
    { enabled: Boolean(projectId) },
  );

  const growth = data?.growth;
  const tasks = tasksData?.tasks ?? [];
  const events = eventsData?.events ?? [];

  return (
    <section className="space-y-0">
      <div className={atelier ? "" : "border-y border-[rgba(24,24,23,0.08)] py-5"}>
        {!atelier ? (
          <>
            <p className={ui.eyebrow}>成长</p>
            <p className={ui.blurb}>短板、质量与下一步任务</p>
          </>
        ) : null}

        {isLoading ? (
          <p className="mt-2 text-[13px] text-[#6f747b]">加载成长快照…</p>
        ) : error ? (
          <p className="mt-2 text-[13px] text-[#a56b4d]">{error.message}</p>
        ) : (
          <div className={atelier ? "space-y-3" : "mt-4 space-y-3"}>
            {growth?.cognitiveGap ? (
              <div>
                {atelier ? (
                  <p className="border-l-2 border-[#141413] pl-4 font-serif-cn text-[18px] leading-8 text-[#141413]">
                    {growth.cognitiveGap.summary}
                  </p>
                ) : (
                  <p className="text-[14px] leading-7 text-[#202124]">
                    {growth.cognitiveGap.summary}
                  </p>
                )}
                <p className="mt-2 text-[13px] leading-6 text-[#6f747b]">
                  别只归因「{growth.cognitiveGap.believedCause}」—
                  {growth.cognitiveGap.likelyRootCause}
                </p>
              </div>
            ) : growth?.lastDecisionPattern?.lesson ? (
              <p
                className={
                  atelier
                    ? "border-l-2 border-[#141413] pl-4 font-serif-cn text-[18px] leading-8 text-[#141413]"
                    : "text-[14px] leading-7 text-[#202124]"
                }
              >
                {growth.lastDecisionPattern.lesson}
              </p>
            ) : (
              <div
                className={
                  atelier
                    ? "border border-dashed border-[rgba(20,20,19,0.14)] bg-[var(--mpnt-field)] px-6 py-8 text-center"
                    : ""
                }
              >
                <p className={ui.emptyTitle}>
                  {atelier ? "还没有成长记录" : "打卡验证后会出现短板与下一步。"}
                </p>
                {atelier ? (
                  <p className="mt-2 text-[13px] text-[#6f747b]">
                    打卡验证后会出现短板与下一步。
                  </p>
                ) : null}
              </div>
            )}
            {typeof growth?.decisionQuality?.total === "number" ? (
              <p className={ui.meta}>
                决策质量 {growth.decisionQuality.total}
                {typeof growth.decisionQuality.judgement === "number"
                  ? ` · 判断 ${growth.decisionQuality.judgement}`
                  : ""}
                {typeof growth.decisionQuality.execution === "number"
                  ? ` · 执行 ${growth.decisionQuality.execution}`
                  : ""}
                {typeof growth.decisionQuality.result === "number"
                  ? ` · 结果 ${growth.decisionQuality.result}`
                  : ""}
              </p>
            ) : null}
          </div>
        )}
      </div>

      {showRadar && growth?.eightDim && growth.eightDim.length >= 4 ? (
        <div className={atelier ? "mt-6 border-t border-[rgba(20,20,19,0.08)] pt-6" : ""}>
          <CapabilityEightRadar
            dimensions={growth.eightDim.map((d) => ({
              dim: d.dim,
              label: d.label,
              score: d.score,
              note: d.note ?? undefined,
            }))}
            decisionQualityTotal={growth.decisionQuality?.total ?? null}
            variant={atelier ? "atelier" : "os"}
          />
        </div>
      ) : null}

      {tasks.length > 0 ? (
        <div
          className={
            atelier
              ? "mt-6 border-t border-[rgba(20,20,19,0.08)] pt-6"
              : "border-b border-[rgba(24,24,23,0.08)] py-5"
          }
        >
          <p className="text-[11px] font-medium tracking-[0.14em] text-[#5f6b4e]">
            成长任务
          </p>
          <ul className="mt-3 space-y-3">
            {tasks.slice(0, 6).map((task) => (
              <li key={task.taskId || task.goal} className={atelier ? ui.item : ""}>
                <p className="text-[14px] leading-6 text-[#141413]">{task.goal}</p>
                {task.suggestedTopic ? (
                  <Link
                    href={buildMeetingHref(
                      projectId,
                      task.suggestedTopic,
                      detectDepartmentFromTopic(task.suggestedTopic),
                      { confirmSpend: true, spendKind: "growth" },
                    )}
                    prefetch={false}
                    className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-[#141413] no-underline"
                  >
                    成长议题开会 <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {events.length > 0 ? (
        <div
          className={
            atelier
              ? "mt-6 border-t border-[rgba(20,20,19,0.08)] pt-6"
              : "border-b border-[rgba(24,24,23,0.08)] py-5"
          }
        >
          <p className="text-[11px] font-medium tracking-[0.14em] text-[#6f747b]">
            近期成长事件 · {events.length}
          </p>
          <ul className="mt-3 space-y-2">
            {events.slice(0, 8).map((ev) => (
              <li key={ev.eventId} className="text-[13px] leading-6 text-[#6f747b]">
                <span className="text-[#5f6b4e]">
                  {EVENT_LABEL[ev.type] || ev.type}
                </span>
                {ev.summary ? ` · ${ev.summary}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div
        className={
          atelier
            ? "mt-6 border-t border-[rgba(20,20,19,0.08)] pt-6"
            : "border-b border-[rgba(24,24,23,0.08)] py-5"
        }
      >
        <p className="text-[11px] font-medium tracking-[0.14em] text-[#66735E]">
          经营镜像 · User Intelligence
        </p>
        <div className="mt-3">
          <IntelligenceProfilePanel projectId={projectId} compact={atelier} />
        </div>
      </div>
    </section>
  );
}
