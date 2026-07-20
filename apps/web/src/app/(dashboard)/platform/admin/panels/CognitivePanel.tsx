"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type {
  CognitiveSessionRow,
  PlatformAdminMetric,
  PlatformAdminOverview,
} from "@/server/services/platform-admin.service";
import type { CognitiveTraceRow } from "@/server/services/platform-admin-inbox.service";

import {
  DetailField,
  EmptyState,
  FilterScopeNotice,
  MetricGrid,
  ObjectsTable,
  PanelShell,
  SectionIntro,
  WorkbenchDetailPanel,
} from "../admin-console-ui";

export function CognitivePanel({
  showSeededData,
  cognitiveDomain,
  formatMetricValue,
  selectedSession,
  navigateToCognitiveSession,
  formatNumber,
  formatPercent,
  priorityTone,
  statusChipTone,
}: {
  showSeededData: boolean;
  cognitiveDomain: PlatformAdminOverview["domains"]["cognitive"];
  formatMetricValue: (metric: PlatformAdminMetric) => string;
  selectedSession: CognitiveSessionRow | null;
  navigateToCognitiveSession: (sessionId: string) => void;
  formatNumber: (value: number | null | undefined) => string;
  formatPercent: (value: number | null | undefined, digits?: number) => string;
  priorityTone: (priority: "high" | "medium" | "low") => string;
  statusChipTone: (status: string) => string;
}) {
  const [traces, setTraces] = useState<CognitiveTraceRow[]>([]);
  const [evidenceCount, setEvidenceCount] = useState<number | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceError, setTraceError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedSession?.id) {
      setTraces([]);
      setEvidenceCount(null);
      return;
    }
    let cancelled = false;
    setTraceLoading(true);
    setTraceError(null);
    void fetch(
      `/api/platform/admin/cognitive/traces?sessionId=${encodeURIComponent(selectedSession.id)}&limit=40`,
      { cache: "no-store" },
    )
      .then(async (res) => {
        const body = (await res.json()) as {
          ok?: boolean;
          error?: string;
          traces?: CognitiveTraceRow[];
          evidenceCount?: number;
        };
        if (!res.ok || body.ok === false) {
          throw new Error(body.error || "Trace 加载失败");
        }
        if (cancelled) return;
        setTraces(body.traces ?? []);
        setEvidenceCount(typeof body.evidenceCount === "number" ? body.evidenceCount : null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setTraceError(err instanceof Error ? err.message : "Trace 加载失败");
      })
      .finally(() => {
        if (!cancelled) setTraceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSession?.id]);

  return (
    <PanelShell>
      <SectionIntro
        eyebrow="认知内核"
        title="把会话复核从数字展示改成链路检查"
        description="这里的重点不是列出会话 ID，而是帮助平台判断：哪些会话置信度低、哪里缺证据、是否需要回溯 decision 与 trace。"
      />
      {!showSeededData ? (
        <FilterScopeNotice
          title="当前是“仅看真实对象”视图"
          description="认知内核继续展示全量会话，因为低置信、缺证据和异常 trace 属于平台级质量治理，不会随着商业对象过滤一起隐藏。"
        />
      ) : null}
      <MetricGrid metrics={cognitiveDomain.cards} formatMetricValue={formatMetricValue} />
      <ObjectsTable
        id="cognitive-review-workbench"
        eyebrow="质量治理"
        title="认知会话复核台"
        description="左边选会话，右边检查链路完整度和风险标记。"
        aside={
          <span className="rounded-full bg-[rgba(24,24,23,0.06)] px-2.5 py-1 text-[12px] text-[#6f747b]">
            {formatNumber(cognitiveDomain.sessions.length)} 个会话
          </span>
        }
      >
        {cognitiveDomain.sessions.length === 0 ? (
          <EmptyState title="暂无认知会话" description="等业务流转产生会话后，这里会显示核心复核对象。" />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-3">
              {cognitiveDomain.sessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => navigateToCognitiveSession(session.id)}
                  className={`w-full rounded-[16px] border px-4 py-4 text-left transition ${
                    selectedSession?.id === session.id
                      ? "border-[rgba(24,24,23,0.18)] bg-white shadow-[0_12px_28px_rgba(24,24,23,0.04)]"
                      : "border-[rgba(24,24,23,0.06)] bg-[#FCFBF8]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-[#202124]">{session.id}</p>
                      <p className="mt-1 text-[13px] leading-5 text-[#6f747b]">
                        {session.source} · 置信度 {formatPercent(session.overall)}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] ${priorityTone(session.priority)}`}>
                      {session.priority === "high" ? "高风险" : session.priority === "medium" ? "关注" : "稳定"}
                    </span>
                  </div>
                  <p className="mt-3 text-[12px] leading-5 text-[#6f747b]">
                    链路 {formatNumber(session.traceCount)} · 证据 {formatNumber(session.evidenceCount)}
                  </p>
                </button>
              ))}
            </div>

            {selectedSession ? (
              <WorkbenchDetailPanel
                eyebrow="当前会话"
                title={selectedSession.id}
                badge={
                  <span className={`rounded-full px-2.5 py-1 text-[12px] ${statusChipTone(selectedSession.status)}`}>
                    {selectedSession.status}
                  </span>
                }
                footer={
                  <div className="space-y-2 rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] px-4 py-4 text-[13px] leading-6 text-[#6f747b]">
                    <p>认知域为治理只读面：不在此复制经营判断 UI。</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedSession.projectId && selectedSession.decisionId ? (
                        <Link
                          href={`/projects/${selectedSession.projectId}/decisions#decision-${selectedSession.decisionId}`}
                          className="inline-flex min-h-10 items-center rounded-[12px] bg-[#181817] px-3 text-[13px] font-semibold text-white"
                        >
                          只读打开关联决策
                        </Link>
                      ) : null}
                      {selectedSession.projectId ? (
                        <Link
                          href={`/projects/${selectedSession.projectId}/decision-room`}
                          className="inline-flex min-h-10 items-center rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[13px] font-semibold text-[#202124]"
                        >
                          打开项目决策室
                        </Link>
                      ) : null}
                    </div>
                  </div>
                }
              >
                <div className="grid gap-3 xl:grid-cols-2">
                  <DetailField label="来源" value={selectedSession.source} />
                  <DetailField label="决策 ID" value={selectedSession.decisionId ?? "未绑定"} />
                  <DetailField label="项目 ID" value={selectedSession.projectId ?? "未绑定"} />
                  <DetailField label="置信度" value={formatPercent(selectedSession.overall)} />
                  <DetailField
                    label="证据完整度"
                    value={`链路 ${selectedSession.traceCount} · 证据 ${evidenceCount ?? selectedSession.evidenceCount}`}
                  />
                  <DetailField
                    label="风险标记"
                    value={
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full px-2.5 py-1 text-[12px] ${priorityTone(selectedSession.priority)}`}>
                          {selectedSession.priority === "high" ? "高风险" : selectedSession.priority === "medium" ? "关注" : "稳定"}
                        </span>
                        {selectedSession.lowConfidence ? (
                          <span className="rounded-full bg-[rgba(180,124,92,0.12)] px-2.5 py-1 text-[12px] text-[#8A5A40]">
                            低置信
                          </span>
                        ) : null}
                        {selectedSession.missingEvidence ? (
                          <span className="rounded-full bg-[rgba(186,160,92,0.10)] px-2.5 py-1 text-[12px] text-[#7A6941]">
                            缺证据
                          </span>
                        ) : null}
                      </div>
                    }
                  />
                  <DetailField label="处理建议" value={selectedSession.detailHint} />
                </div>

                <div className="mt-4 space-y-2">
                  <p className="text-[13px] font-semibold text-[#202124]">Trace 只读链路</p>
                  {traceLoading ? <p className="text-[13px] text-[#6f747b]">正在加载 trace…</p> : null}
                  {traceError ? <p className="text-[13px] text-[#8A5A40]">{traceError}</p> : null}
                  {!traceLoading && !traceError && traces.length === 0 ? (
                    <p className="text-[13px] text-[#6f747b]">该会话暂无 trace 记录。</p>
                  ) : null}
                  <div className="max-h-[320px] space-y-2 overflow-y-auto">
                    {traces.map((trace) => (
                      <div
                        key={trace.id}
                        className="rounded-[12px] border border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] px-3 py-2"
                      >
                        <p className="text-[12px] font-semibold text-[#202124]">
                          #{trace.sequence} · {trace.type} · {trace.sourceType}
                        </p>
                        <p className="mt-1 text-[12px] text-[#6f747b]">
                          置信 {formatPercent(trace.confidence)}
                          {trace.sourceId ? ` · 源 ${trace.sourceId}` : ""}
                        </p>
                        {trace.outputPreview ? (
                          <p className="mt-1 text-[12px] leading-5 text-[#5f6368]">{trace.outputPreview}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </WorkbenchDetailPanel>
            ) : null}
          </div>
        )}
      </ObjectsTable>
    </PanelShell>
  );
}
