"use client";

import type { inferRouterOutputs } from "@trpc/server";
import { ArrowRight, LoaderCircle } from "lucide-react";
import type { AppRouter } from "@/server";
import { trpc } from "@/lib/trpc";

export type FounderLoopRuntime = inferRouterOutputs<AppRouter>["founder"]["runLoop"];

type Props = {
  projectId: string;
  topic: string;
  onActivate: (runtime: FounderLoopRuntime) => void;
};

/**
 * Founder 协同闭环预跑预览 — 从顾问页抽出的独立展示块。
 */
export function FounderLoopPreviewPanel({
  projectId,
  topic,
  onActivate,
}: Props) {
  const runFounderLoop = trpc.founder.runLoop.useMutation();
  const preview = runFounderLoop.data;

  return (
    <section className="rounded-[18px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_14px_28px_rgba(24,24,23,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[12px] tracking-[0.08em] text-[#66735E]">Founder Layer</p>
          <h2 className="mt-1 text-[18px] font-semibold leading-[1.25] tracking-[-0.02em] text-[#202124]">
            协同闭环预览
          </h2>
          <p className="mt-2 text-[13px] leading-6 text-[#6f747b]">
            先预跑 Founder 协同闭环，再把结果一键接入会商。记忆写入会在服务端同步落库，不只停在前台预览。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={runFounderLoop.isPending || !topic.trim()}
            onClick={() =>
              runFounderLoop.mutate({
                projectId,
                message: topic,
              })
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[rgba(24,24,23,0.08)] bg-[#181817] px-4 py-2 text-[13px] font-medium text-white disabled:opacity-50"
          >
            {runFounderLoop.isPending ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
            运行 Founder Loop
          </button>
          {preview ? (
            <button
              type="button"
              onClick={() => onActivate(preview)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[rgba(24,24,23,0.08)] bg-[#F5F3EE] px-4 py-2 text-[13px] font-medium text-[#202124]"
            >
              接入会商
            </button>
          ) : null}
        </div>
      </div>

      {runFounderLoop.error ? (
        <div className="mt-4 rounded-[14px] bg-[rgba(180,124,92,0.10)] px-4 py-3 text-[13px] leading-6 text-[#B47C5C]">
          运行失败：{runFounderLoop.error.message}
        </div>
      ) : null}

      {preview ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-[16px] bg-[#F8F7F3] px-3 py-3">
              <p className="text-[12px] tracking-[0.08em] text-[#66735E]">Mission</p>
              <p className="mt-2 text-[13px] leading-6 text-[#202124]">
                {preview.mission.mission}
              </p>
            </div>
            <div className="rounded-[16px] bg-[#F8F7F3] px-3 py-3">
              <p className="text-[12px] tracking-[0.08em] text-[#66735E]">席位</p>
              <p className="mt-2 text-[13px] leading-6 text-[#202124]">
                {preview.mission.requiredAgents.join(" / ")}
              </p>
            </div>
            <div className="rounded-[16px] bg-[#F8F7F3] px-3 py-3">
              <p className="text-[12px] tracking-[0.08em] text-[#66735E]">会商冲突</p>
              <p className="mt-2 text-[13px] leading-6 text-[#202124]">
                {preview.meeting.conflicts.length} 个
              </p>
            </div>
            <div className="rounded-[16px] bg-[#F8F7F3] px-3 py-3">
              <p className="text-[12px] tracking-[0.08em] text-[#66735E]">记忆写入</p>
              <p className="mt-2 text-[13px] leading-6 text-[#202124]">
                {preview.memoryWrites.length} 条
              </p>
            </div>
          </div>

          <div className="rounded-[16px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-4 py-4">
            <p className="text-[12px] tracking-[0.08em] text-[#66735E]">Final Decision</p>
            <p className="mt-2 text-[15px] font-medium leading-7 text-[#202124]">
              {preview.finalDecision.chosen}
            </p>
            <div className="mt-2 space-y-2">
              {preview.finalDecision.reason.map((item) => (
                <p key={item} className="text-[13px] leading-6 text-[#5f655d]">
                  {item}
                </p>
              ))}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[16px] border border-[rgba(24,24,23,0.08)] bg-white px-4 py-4">
              <p className="text-[12px] tracking-[0.08em] text-[#66735E]">
                四席判断 · 顾问依据
              </p>
              <div className="mt-3 space-y-3">
                {preview.decisions.map((decision) => (
                  <div
                    key={decision.decisionId}
                    className="rounded-[14px] bg-[#F8F7F3] px-3 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[13px] font-medium text-[#202124]">
                        {decision.sourceAgent}
                      </p>
                      <p className="text-[12px] text-[#66735E]">
                        {Math.round(decision.confidence * 100)}%
                      </p>
                    </div>
                    <p className="mt-2 text-[13px] leading-6 text-[#5f655d]">
                      {decision.judgement}
                    </p>
                    {decision.evidence.length > 0 ? (
                      <ul className="mt-2 space-y-1">
                        {decision.evidence.slice(0, 3).map((ev) => (
                          <li
                            key={ev.evidenceId || ev.content}
                            className="text-[12px] leading-5 text-[#66735E]"
                          >
                            ✓ {ev.content}
                            {ev.evidenceId ? (
                              <span className="ml-1 text-[11px] text-[#9a968e]">
                                ({ev.evidenceId})
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {decision.evidenceSufficient === false ? (
                      <p className="mt-2 text-[11px] text-[#B47C5C]">证据不足 · 仅作假设</p>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[16px] border border-[rgba(24,24,23,0.08)] bg-white px-4 py-4">
              <p className="text-[12px] tracking-[0.08em] text-[#66735E]">Memory Writes</p>
              <div className="mt-3 space-y-3">
                {preview.memoryWrites.map((item) => (
                  <div
                    key={item.writeId}
                    className="rounded-[14px] bg-[#F8F7F3] px-3 py-3"
                  >
                    <p className="text-[13px] font-medium text-[#202124]">
                      {item.type} / {item.source}
                    </p>
                    <p className="mt-2 text-[13px] leading-6 text-[#5f655d]">
                      {item.summary}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
