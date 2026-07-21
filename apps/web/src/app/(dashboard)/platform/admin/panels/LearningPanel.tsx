"use client";

import Link from "next/link";

import type {
  LearningQueueRow,
  PlatformAdminMetric,
  PlatformAdminOverview,
} from "@/server/services/platform-admin.service";

import { LearningQueueTable } from "../admin-console-tables";
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

type LearningFilter = "all" | "pending" | "approved" | "rejected";

type AskConfirm = (opts: {
  title: string;
  description?: string;
  onConfirm: () => void;
}) => void;

export function LearningPanel({
  showSeededData,
  learningDomain,
  derivedLearningCards,
  filteredLearningQueue,
  learningFilter,
  setLearningFilter,
  selectedLearning,
  learningExecutionNote,
  isPending,
  formatMetricValue,
  formatNumber,
  formatScore,
  statusChipTone,
  priorityTone,
  formatSignedDelta,
  formatDate,
  navigateToLearningItem,
  askConfirm,
  onApproveLearning,
  onRejectLearning,
}: {
  showSeededData: boolean;
  learningDomain: PlatformAdminOverview["domains"]["learning"];
  derivedLearningCards: PlatformAdminMetric[];
  filteredLearningQueue: LearningQueueRow[];
  learningFilter: LearningFilter;
  setLearningFilter: (next: LearningFilter) => void;
  selectedLearning: LearningQueueRow | null;
  learningExecutionNote: string | null;
  isPending: boolean;
  formatMetricValue: (metric: PlatformAdminMetric) => string;
  formatNumber: (value: number | null | undefined) => string;
  formatScore: (score: number | null | undefined) => string;
  statusChipTone: (status: string) => string;
  priorityTone: (priority: "high" | "medium" | "low") => string;
  formatSignedDelta: (value: number | null | undefined) => string;
  formatDate: (value: string | null | undefined) => string;
  navigateToLearningItem: (id: string) => void;
  askConfirm: AskConfirm;
  onApproveLearning: (row: LearningQueueRow) => void;
  onRejectLearning: (row: LearningQueueRow) => void;
}) {
  const selectedLearningStatus = selectedLearning?.status.toLowerCase() ?? "";
  const learningActionLocked =
    selectedLearningStatus === "approved" || selectedLearningStatus === "rejected";
  const selectedOutsideFilter =
    Boolean(selectedLearning) &&
    !filteredLearningQueue.some((item) => item.id === selectedLearning?.id);

  return (
    <PanelShell>
      <SectionIntro
        eyebrow="学习复核"
        title="人工审核工作台"
        description="左侧选任务，右侧批准/驳回。批准会写入学习燃料（Memory），不会自动改写老板端经营判断。"
      />
      {!showSeededData ? (
        <FilterScopeNotice
          title="当前是“仅看真实对象”视图"
          description="学习复核仍保留全量认知记录。商业域已按真实对象过滤，学习治理域继续保持全量。"
        />
      ) : null}
      <MetricGrid metrics={derivedLearningCards} formatMetricValue={formatMetricValue} />
      <ObjectsTable
        id="learning-review-workbench"
        eyebrow="治理工作台"
        title="复核队列"
        description="默认看待审。审核完成后详情会保留，并显示执行结果。"
        aside={
          <span className="rounded-full bg-[rgba(24,24,23,0.06)] px-2.5 py-1 text-[12px] text-[#6f747b]">
            {formatNumber(filteredLearningQueue.length)} 条任务
          </span>
        }
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { key: "all", label: `全部 ${learningDomain.queue.length}` },
            {
              key: "pending",
              label: `待审 ${learningDomain.queue.filter((item) => item.status.toLowerCase() === "pending").length}`,
            },
            {
              key: "approved",
              label: `通过 ${learningDomain.queue.filter((item) => item.status.toLowerCase() === "approved").length}`,
            },
            {
              key: "rejected",
              label: `驳回 ${learningDomain.queue.filter((item) => item.status.toLowerCase() === "rejected").length}`,
            },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setLearningFilter(item.key as LearningFilter)}
              className={`inline-flex min-h-9 items-center rounded-full px-3 text-[13px] font-medium transition ${
                learningFilter === item.key
                  ? "bg-[#181817] text-white"
                  : "border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] text-[#5f6368]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {filteredLearningQueue.length === 0 && !selectedLearning ? (
          <EmptyState
            title="当前筛选下没有任务"
            description={
              learningFilter === "pending"
                ? "暂无待审记录。可切换到「全部」查看已处理项。"
                : "当前筛选为空。"
            }
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <div className="min-w-0 space-y-3">
              {filteredLearningQueue.length === 0 ? (
                <EmptyState
                  title="当前筛选列表为空"
                  description="右侧仍保留你刚处理的任务详情与执行结果。"
                />
              ) : (
                <LearningQueueTable
                  rows={filteredLearningQueue}
                  selectedId={selectedLearning?.id}
                  onSelect={navigateToLearningItem}
                  formatScore={formatScore}
                  priorityTone={priorityTone}
                  statusChipTone={statusChipTone}
                />
              )}
            </div>

            {selectedLearning ? (
              <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
                <WorkbenchDetailPanel
                  eyebrow="当前任务"
                  title={selectedLearning.title}
                  badge={
                    <span
                      className={`rounded-full px-2.5 py-1 text-[12px] ${statusChipTone(selectedLearning.status)}`}
                    >
                      {selectedLearning.status}
                    </span>
                  }
                  footer={
                    <div className="space-y-3">
                      {learningExecutionNote ? (
                        <div
                          role="status"
                          className="rounded-[12px] border border-[rgba(102,115,94,0.22)] bg-[rgba(102,115,94,0.08)] px-3 py-3 text-[13px] leading-5 text-[#3d4a34]"
                        >
                          <p className="text-[11px] font-medium tracking-[0.08em] text-[#66735E]">
                            执行结果
                          </p>
                          <p className="mt-1">{learningExecutionNote}</p>
                        </div>
                      ) : null}
                      {selectedOutsideFilter ? (
                        <p className="text-[12px] leading-5 text-[#8a8f98]">
                          当前任务不在「{learningFilter}」筛选内，仍保留详情便于核对执行结果。
                        </p>
                      ) : null}
                      <div className="grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          disabled={isPending || learningActionLocked}
                          onClick={() => {
                            askConfirm({
                              title: "批准该学习记录？",
                              description:
                                "确认后会标记为通过，并尝试写入 Memory 学习燃料（失败不回滚状态）。",
                              onConfirm: () => onApproveLearning(selectedLearning),
                            });
                          }}
                          className="inline-flex min-h-11 items-center justify-center rounded-[12px] bg-[#181817] px-4 text-[14px] font-semibold text-white disabled:opacity-50"
                        >
                          {selectedLearningStatus === "approved"
                            ? "已批准"
                            : isPending
                              ? "处理中…"
                              : "批准并写入学习燃料"}
                        </button>
                        <button
                          type="button"
                          disabled={isPending || learningActionLocked}
                          onClick={() => {
                            askConfirm({
                              title: "驳回该学习记录？",
                              description: "确认后仅更新复核状态为驳回，不会删除历史记录。",
                              onConfirm: () => onRejectLearning(selectedLearning),
                            });
                          }}
                          className="inline-flex min-h-11 items-center justify-center rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-4 text-[14px] font-semibold text-[#202124] disabled:opacity-50"
                        >
                          {selectedLearningStatus === "rejected"
                            ? "已驳回"
                            : isPending
                              ? "处理中…"
                              : "驳回该记录"}
                        </button>
                      </div>
                      {learningActionLocked ? (
                        <div className="rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] px-3 py-3 text-[12px] leading-5 text-[#5f6368]">
                          当前记录已完成复核。结果见上方「执行结果」；如需重开请走专门流程，勿在此重复写入。
                        </div>
                      ) : null}
                    </div>
                  }
                >
                  <div className="grid gap-3">
                    <DetailField
                      label="问题原文"
                      value={selectedLearning.problem ?? "未绑定判断"}
                    />
                    <DetailField
                      label="来源"
                      value={`${selectedLearning.sourceType} · ${selectedLearning.sourceId}`}
                    />
                    <DetailField label="评估摘要" value={selectedLearning.summary} />
                    <DetailField
                      label="质量信号"
                      value={`评分 ${formatScore(selectedLearning.score)} · 结论 ${selectedLearning.verdict ?? "--"} · 权重 ${formatSignedDelta(selectedLearning.weightDelta)}`}
                    />
                    <DetailField label="处理建议" value={selectedLearning.detailHint} />
                    <DetailField
                      label="创建时间"
                      value={`${formatDate(selectedLearning.createdAt)} · 已等待 ${selectedLearning.agingDays} 天`}
                    />
                    <DetailField
                      label="决策链路"
                      value={
                        selectedLearning.projectId && selectedLearning.decisionId ? (
                          <Link
                            href={`/projects/${selectedLearning.projectId}/decisions#decision-${selectedLearning.decisionId}`}
                            className="font-medium text-[#465240] underline-offset-2 hover:underline"
                          >
                            打开决策档案
                          </Link>
                        ) : (
                          selectedLearning.decisionId ?? "未绑定"
                        )
                      }
                    />
                  </div>
                </WorkbenchDetailPanel>
              </div>
            ) : (
              <EmptyState title="尚未选中任务" description="从左侧队列点选一条，再进行批准或驳回。" />
            )}
          </div>
        )}
      </ObjectsTable>
    </PanelShell>
  );
}
