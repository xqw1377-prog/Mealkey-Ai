"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { panelChrome, type AtelierProps } from "./atelier";

type Props = AtelierProps & {
  projectId: string;
  topic?: string;
  compact?: boolean;
  editableTopic?: boolean;
  onTopicChange?: (topic: string) => void;
};

export function MemoryRuntimePanel({
  projectId,
  topic,
  compact,
  editableTopic,
  onTopicChange,
  atelier,
}: Props) {
  const ui = panelChrome(atelier);
  const [draft, setDraft] = useState(topic || "");
  const [queryTopic, setQueryTopic] = useState(topic?.trim() || undefined);

  const { data, isLoading, error, isFetching, refetch } =
    trpc.memoryRuntime.recallForDecision.useQuery(
      { projectId, topic: queryTopic, limit: 6 },
      { enabled: Boolean(projectId) },
    );

  const recall = data?.recall;

  const runRecall = () => {
    const next = draft.trim() || undefined;
    setQueryTopic(next);
    onTopicChange?.(draft);
    void refetch();
  };

  if (isLoading && !recall) {
    return (
      <section className={ui.section}>
        <p className={ui.eyebrow}>记忆</p>
        <p className="mt-2 text-[13px] text-[#6f747b]">正在回忆企业记忆…</p>
      </section>
    );
  }

  if ((error && !recall) || !recall) {
    return (
      <section className={ui.section}>
        <p className={ui.eyebrow}>记忆</p>
        <p className="mt-2 text-[13px] text-[#a56b4d]">
          {error?.message || "暂无可用记忆先验"}
        </p>
      </section>
    );
  }

  const hasForbidden = recall.forbiddenReminders.length > 0;

  return (
    <section className={ui.section}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          {!atelier ? <p className={ui.eyebrow}>记忆</p> : null}
          {atelier ? (
            <h3 className={ui.title}>会前先验</h3>
          ) : (
            <p className={ui.blurb}>开会前先看历史教训与禁区，不改战略</p>
          )}
          {atelier ? (
            <p className={ui.blurb}>开会前先看历史教训与禁区，不改战略</p>
          ) : null}
        </div>
        {isFetching ? <p className={ui.meta}>刷新中…</p> : null}
      </div>

      {editableTopic ? (
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="min-w-0 flex-1">
            <span className="text-[11px] font-medium tracking-[0.12em] text-[#5f6b4e]">
              按议题回忆
            </span>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  runRecall();
                }
              }}
              placeholder="例如：是否继续拓店"
              className={ui.input}
            />
          </label>
          <button
            type="button"
            onClick={runRecall}
            disabled={isFetching}
            className={ui.primaryBtn}
          >
            回忆
          </button>
        </div>
      ) : recall.topic ? (
        <p className={`mt-3 ${ui.meta}`}>议题 · {recall.topic}</p>
      ) : null}

      {hasForbidden ? (
        <div className={`mt-5 ${ui.warnBox}`}>
          <p className="text-[12px] font-medium">禁区提醒</p>
          <ul className="mt-1.5 space-y-1.5 text-[13px] leading-6">
            {recall.forbiddenReminders.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className={`mt-5 ${ui.meta}`}>当前议题未命中历史禁区。</p>
      )}

      {!compact && recall.priorBlock ? (
        <div className="mt-5">
          <p className="text-[11px] font-medium tracking-[0.12em] text-[#5f6b4e]">
            先验摘要
          </p>
          {atelier ? (
            <p className="mt-2 border-l-2 border-[#141413] pl-4 font-serif-cn text-[16px] leading-8 text-[#141413]">
              {recall.priorBlock.slice(0, 280)}
              {recall.priorBlock.length > 280 ? "…" : ""}
            </p>
          ) : (
            <p className="mt-1.5 whitespace-pre-wrap text-[13px] leading-6 text-[#5f6368]">
              {recall.priorBlock.slice(0, 520)}
              {recall.priorBlock.length > 520 ? "…" : ""}
            </p>
          )}
        </div>
      ) : null}

      <div className={`mt-6 grid gap-4 ${compact ? "" : "md:grid-cols-2"}`}>
        <div className={atelier ? ui.item : ""}>
          <p className="text-[11px] font-medium tracking-[0.12em] text-[#5f6b4e]">
            教训
          </p>
          {recall.lessons.length === 0 ? (
            <p className="mt-2 text-[13px] text-[#b0b4ba]">暂无沉淀教训</p>
          ) : (
            <ul className="mt-2 space-y-2.5">
              {recall.lessons.slice(0, compact ? 2 : 4).map((lesson, i) => (
                <li key={`l-${i}`}>
                  <p className="text-[11px] text-[#6f747b]">
                    {lesson.kind === "failure"
                      ? "失败"
                      : lesson.kind === "partial"
                        ? "部分验证"
                        : "经验"}
                  </p>
                  <p className="text-[13px] leading-6 text-[#141413]">
                    {lesson.summary}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
        {!compact ? (
          <div className={atelier ? ui.item : ""}>
            <p className="text-[11px] font-medium tracking-[0.12em] text-[#5f6b4e]">
              相关决策
            </p>
            {recall.decisions.length === 0 ? (
              <p className="mt-2 text-[13px] text-[#b0b4ba]">暂无相关决策</p>
            ) : (
              <ul className="mt-2 space-y-2.5">
                {recall.decisions.slice(0, 4).map((d, i) => (
                  <li
                    key={`d-${i}`}
                    className="text-[13px] leading-6 text-[#141413]"
                  >
                    {d.summary}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
