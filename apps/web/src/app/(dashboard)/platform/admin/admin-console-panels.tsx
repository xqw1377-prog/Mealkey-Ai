"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import Link from "next/link";

import type {
  BillingAccountRow,
  LearningQueueRow,
  OrganizationRow,
  PlanRow,
  PlatformAdminMetric,
  PlatformAdminOverview,
} from "@/server/services/platform-admin.service";

import type { AdminWorkspaceId } from "./admin-console-config";
import {
  BillingAccountSelectionTable,
  LearningQueueTable,
  OrganizationSelectionTable,
  PlanSelectionTable,
} from "./admin-console-tables";
import {
  DetailField,
  EmptyState,
  FieldLabel,
  FilterScopeNotice,
  MetricGrid,
  ObjectsTable,
  PanelShell,
  SectionIntro,
  SeededFilterToggle,
  WorkbenchDetailPanel,
} from "./admin-console-ui";

type RefreshScope = "overview" | "billing" | "learning" | "marketplace" | "objects";
type LearningFilter = "all" | "pending" | "approved" | "rejected";

type RunAction = (
  action: () => Promise<unknown>,
  options: {
    successMessage: string;
    refreshScope?: RefreshScope | RefreshScope[];
    applyResult?: (result: unknown) => void;
  },
) => void;

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

  return (
    <PanelShell>
      <SectionIntro
        eyebrow="学习复核"
        title="把学习记录从列表改成任务工作台"
        description="按队列处理待审记录。批准会写入学习燃料（Memory），但不会自动改写老板端经营判断；驳回仅更新复核状态。"
      />
      {!showSeededData ? (
        <FilterScopeNotice
          title="当前是“仅看真实对象”视图"
          description="学习复核仍保留全量认知记录，因为这里处理的是平台判断质量，而不是商品、订阅或发票对象。商业域已按真实对象过滤，学习治理域继续保持全量。"
        />
      ) : null}
      <MetricGrid metrics={derivedLearningCards} formatMetricValue={formatMetricValue} />
      <ObjectsTable
        id="learning-review-workbench"
        eyebrow="治理工作台"
        title="复核队列"
        description="按状态筛选后，直接进入单条详情处理。"
        aside={
          <span className="rounded-full bg-[rgba(24,24,23,0.06)] px-2.5 py-1 text-[12px] text-[#6f747b]">
            {formatNumber(filteredLearningQueue.length)} 条任务
          </span>
        }
      >
        <div className="mb-4 flex flex-wrap gap-2">
          {[
            { key: "all", label: `全部 ${learningDomain.queue.length}` },
            { key: "pending", label: `待审 ${learningDomain.queue.filter((item) => item.status === "pending").length}` },
            { key: "approved", label: `通过 ${learningDomain.queue.filter((item) => item.status === "approved").length}` },
            { key: "rejected", label: `驳回 ${learningDomain.queue.filter((item) => item.status === "rejected").length}` },
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

        {filteredLearningQueue.length === 0 ? (
          <EmptyState title="当前筛选下没有任务" description="可以切换筛选，或者先执行演示数据初始化。" />
        ) : (
          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <LearningQueueTable
              rows={filteredLearningQueue}
              selectedId={selectedLearning?.id}
              onSelect={navigateToLearningItem}
              formatScore={formatScore}
              priorityTone={priorityTone}
              statusChipTone={statusChipTone}
            />

            {selectedLearning ? (
              <WorkbenchDetailPanel
                eyebrow="当前任务"
                title={selectedLearning.title}
                badge={
                  <span className={`rounded-full px-2.5 py-1 text-[12px] ${statusChipTone(selectedLearning.status)}`}>
                    {selectedLearning.status}
                  </span>
                }
                footer={
                  <div className="grid gap-2 xl:grid-cols-2">
                    <button
                      type="button"
                      disabled={isPending || learningActionLocked}
                      onClick={() => {
                        askConfirm({
                          title: "批准该学习记录？",
                          description: "确认后会标记为通过，并尝试写入 Memory 学习燃料（失败不回滚状态）。",
                          onConfirm: () => onApproveLearning(selectedLearning),
                        });
                      }}
                      className="inline-flex min-h-11 items-center justify-center rounded-[14px] bg-[#181817] px-4 text-[14px] font-semibold text-white disabled:opacity-50"
                    >
                      {selectedLearningStatus === "approved" ? "该记录已批准" : "批准并写入学习燃料"}
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
                      className="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-white px-4 text-[14px] font-semibold text-[#202124] disabled:opacity-50"
                    >
                      {selectedLearningStatus === "rejected" ? "该记录已驳回" : "驳回该记录"}
                    </button>
                    {learningActionLocked ? (
                      <div className="xl:col-span-2 rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] px-3 py-3 text-[12px] leading-5 text-[#5f6368]">
                        当前记录已经完成复核。若要重新处理，请先通过后端脚本或专门的复核重开流程，而不是在工作台重复写入。
                      </div>
                    ) : null}
                  </div>
                }
              >
                <div className="grid gap-3 xl:grid-cols-2">
                  <DetailField label="问题原文" value={selectedLearning.problem ?? "未绑定判断"} />
                  <DetailField label="来源" value={`${selectedLearning.sourceType} · ${selectedLearning.sourceId}`} />
                  <DetailField label="评估摘要" value={selectedLearning.summary} />
                  <DetailField
                    label="当前质量"
                    value={`评分 ${formatScore(selectedLearning.score)} · 结论 ${selectedLearning.verdict ?? "--"} · 权重 ${formatSignedDelta(selectedLearning.weightDelta)}`}
                  />
                  <DetailField label="处理建议" value={selectedLearning.detailHint} />
                  <DetailField label="创建时间" value={`${formatDate(selectedLearning.createdAt)} · 已等待 ${selectedLearning.agingDays} 天`} />
                  <DetailField
                    label="关联决策"
                    value={
                      selectedLearning.projectId && selectedLearning.decisionId ? (
                        <Link
                          href={`/projects/${selectedLearning.projectId}/decisions#decision-${selectedLearning.decisionId}`}
                          className="font-medium text-[#181817] underline underline-offset-2"
                        >
                          只读打开决策
                        </Link>
                      ) : (
                        selectedLearning.decisionId ?? "未绑定"
                      )
                    }
                  />
                </div>
              </WorkbenchDetailPanel>
            ) : null}
          </div>
        )}
      </ObjectsTable>
    </PanelShell>
  );
}

export function ObjectsPanel({
  activeWorkspaceId,
  showSeededData,
  hiddenSeededCount,
  setShowSeededData,
  isPending,
  derivedObjectsCards,
  visibleObjectBillingAccounts,
  selectedObjectAccount,
  visibleObjectPlans,
  selectedObjectPlan,
  visibleObjectOrganizations,
  selectedOrganization,
  orgName,
  setOrgName,
  planCode,
  setPlanCode,
  planName,
  setPlanName,
  planPrice,
  setPlanPrice,
  listingName,
  setListingName,
  listingSlug,
  setListingSlug,
  listingPrice,
  setListingPrice,
  selectedBillingAccountId,
  setSelectedBillingAccountId,
  selectedPlanId,
  setSelectedPlanId,
  seats,
  setSeats,
  canCreateSubscription,
  formatMetricValue,
  formatNumber,
  formatDate,
  formatBillingCycle,
  formatMoney,
  statusChipTone,
  navigateToObject,
  askConfirm,
  runAction,
  allowBootstrap,
  onBootstrap,
  onCreateOrganization,
  onCreatePlan,
  onCreateListing,
  onCreateSubscription,
  resetEmail,
  setResetEmail,
  resetUrlPreview,
  resetExpiresAt,
  onIssuePasswordReset,
  onClearResetPreview,
}: {
  activeWorkspaceId: AdminWorkspaceId;
  showSeededData: boolean;
  hiddenSeededCount: number;
  setShowSeededData: (next: boolean) => void;
  isPending: boolean;
  allowBootstrap: boolean;
  resetEmail: string;
  setResetEmail: Dispatch<SetStateAction<string>>;
  resetUrlPreview: string | null;
  resetExpiresAt: string | null;
  onIssuePasswordReset: () => void;
  onClearResetPreview: () => void;
  derivedObjectsCards: PlatformAdminMetric[];
  visibleObjectBillingAccounts: BillingAccountRow[];
  selectedObjectAccount: BillingAccountRow | null;
  visibleObjectPlans: PlanRow[];
  selectedObjectPlan: PlanRow | null;
  visibleObjectOrganizations: OrganizationRow[];
  selectedOrganization: OrganizationRow | null;
  orgName: string;
  setOrgName: Dispatch<SetStateAction<string>>;
  planCode: string;
  setPlanCode: Dispatch<SetStateAction<string>>;
  planName: string;
  setPlanName: Dispatch<SetStateAction<string>>;
  planPrice: string;
  setPlanPrice: Dispatch<SetStateAction<string>>;
  listingName: string;
  setListingName: Dispatch<SetStateAction<string>>;
  listingSlug: string;
  setListingSlug: Dispatch<SetStateAction<string>>;
  listingPrice: string;
  setListingPrice: Dispatch<SetStateAction<string>>;
  selectedBillingAccountId: string;
  setSelectedBillingAccountId: Dispatch<SetStateAction<string>>;
  selectedPlanId: string;
  setSelectedPlanId: Dispatch<SetStateAction<string>>;
  seats: string;
  setSeats: Dispatch<SetStateAction<string>>;
  canCreateSubscription: boolean;
  formatMetricValue: (metric: PlatformAdminMetric) => string;
  formatNumber: (value: number | null | undefined) => string;
  formatDate: (value: string | null | undefined) => string;
  formatBillingCycle: (plan: PlanRow) => string;
  formatMoney: (cents: number | null | undefined, currency?: string) => string;
  statusChipTone: (status: string) => string;
  navigateToObject: (kind: "org" | "account" | "plan", id: string) => void;
  askConfirm: AskConfirm;
  runAction: RunAction;
  onBootstrap: () => void;
  onCreateOrganization: (input: {
    name: string;
    ownerUserId?: string | null;
    planId?: string | null;
    seats?: number;
  }) => void;
  onCreatePlan: () => void;
  onCreateListing: () => void;
  onCreateSubscription: () => void;
}) {
  const [orgWizardStep, setOrgWizardStep] = useState<1 | 2 | 3>(1);
  const [orgOwnerUserId, setOrgOwnerUserId] = useState("");
  const [orgWizardPlanId, setOrgWizardPlanId] = useState("");
  const [orgWizardSeats, setOrgWizardSeats] = useState("1");
  const isOrganizationsWorkspace = activeWorkspaceId === "objects-organizations";
  const isAccountsWorkspace = activeWorkspaceId === "objects-accounts";
  const isPlansWorkspace = activeWorkspaceId === "objects-plans";
  const operationsHubDescription = isOrganizationsWorkspace
    ? "组织工作台先看主体与承载关系，创建动作统一收在这里，避免和主视野混在一起。"
    : isAccountsWorkspace
      ? "账户工作台先看归因和绑定，新增组织、商品、订阅等动作集中放在这个操作区。"
      : isPlansWorkspace
        ? "商品工作台先看结构和权益，创建商品、Listing、订阅等动作统一在这里完成。"
        : "对象域的所有创建动作都集中在这里，不和对象索引与工作台首屏混排。";

  return (
    <PanelShell>
      <SectionIntro
        eyebrow={isAccountsWorkspace ? "账务账户" : isPlansWorkspace ? "商品/计划" : "对象管理"}
        title={
          isOrganizationsWorkspace
            ? "直接管理组织主体与承载关系"
            : isAccountsWorkspace
              ? "直接管理账务账户与归因结构"
              : isPlansWorkspace
                ? "直接管理商品结构与平台计划"
                : "把创建与编辑动作收回工具层，不污染总览"
        }
        description={
          isOrganizationsWorkspace
            ? "这个工作台优先回答：有哪些组织、主体状态如何、账务承载关系是否完整。"
            : isAccountsWorkspace
              ? "这个工作台优先回答：账务账户归到谁、是否有孤立账户、账户和商品绑定是否清晰。"
              : isPlansWorkspace
                ? "这个工作台优先回答：平台到底在卖什么、怎么计费、权益口径是否一致。"
                : "所有创建动作都集中在这里。首页和分析域只回答‘发生了什么’，对象管理才负责‘怎么操作它’。"
        }
        aside={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <SeededFilterToggle
              showSeededData={showSeededData}
              hiddenCount={hiddenSeededCount}
              onChange={setShowSeededData}
            />
            {allowBootstrap ? (
              <button
                type="button"
                onClick={() => {
                  askConfirm({
                    title: "填充演示数据？",
                    description: "此操作会写入样本数据到当前数据库，仅用于非生产联调。",
                    onConfirm: onBootstrap,
                  });
                }}
                disabled={isPending}
                className="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-white px-4 text-[14px] font-semibold text-[#202124] disabled:opacity-50"
              >
                填充演示数据
              </button>
            ) : (
              <span className="rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 py-2 text-[12px] text-[#6f747b]">
                生产已禁用演示种子
              </span>
            )}
          </div>
        }
      />
      <MetricGrid metrics={derivedObjectsCards} formatMetricValue={formatMetricValue} />

      <ObjectsTable
        id="account-assist"
        eyebrow="用户运营"
        title="账号协助"
        description="为忘记密码的用户签发一次性重置链接；链接仅短暂展示，请立即私发，勿截图长期留存。"
      >
        <div className="space-y-3">
          <div className="grid gap-2 xl:grid-cols-[1fr_auto]">
            <div>
              <FieldLabel>用户邮箱</FieldLabel>
              <input
                value={resetEmail}
                onChange={(event) => setResetEmail(event.target.value)}
                placeholder="user@example.com"
                className="mt-1 w-full rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] px-3 py-3 text-[14px] text-[#202124] outline-none"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                disabled={isPending || !resetEmail.trim()}
                onClick={() => {
                  askConfirm({
                    title: "签发密码重置链接？",
                    description: "将生成 1 小时有效的一次性链接，需私下发给用户。",
                    onConfirm: onIssuePasswordReset,
                  });
                }}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-[14px] bg-[#181817] px-4 text-[14px] font-semibold text-white disabled:opacity-50 xl:min-w-[160px]"
              >
                签发重置链接
              </button>
            </div>
          </div>
          {resetUrlPreview ? (
            <div className="rounded-[14px] border border-[rgba(180,124,92,0.25)] bg-[rgba(180,124,92,0.06)] px-4 py-3">
              <p className="text-[12px] font-medium text-[#8A5A40]">
                链接将在约 60 秒后自动隐藏
                {resetExpiresAt ? ` · 过期 ${formatDate(resetExpiresAt)}` : ""}
              </p>
              <p className="mt-2 break-all text-[13px] text-[#202124]">{resetUrlPreview}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(resetUrlPreview);
                  }}
                  className="inline-flex min-h-9 items-center rounded-[10px] bg-[#181817] px-3 text-[12px] font-semibold text-white"
                >
                  复制链接
                </button>
                <button
                  type="button"
                  onClick={onClearResetPreview}
                  className="inline-flex min-h-9 items-center rounded-[10px] border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[12px] font-semibold text-[#5f6368]"
                >
                  立即清除
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </ObjectsTable>

      {isAccountsWorkspace ? (
        <ObjectsTable
          id="objects-billing-accounts"
          eyebrow="账户工作台"
          title="账务账户工作台"
          description="先看账户归因、组织绑定和当前定位账户，再决定是否去创建订阅。"
          aside={
            <span className="rounded-full bg-[rgba(24,24,23,0.06)] px-2.5 py-1 text-[12px] text-[#6f747b]">
              {formatNumber(visibleObjectBillingAccounts.length)} 个账户
            </span>
          }
        >
          <div className="space-y-3">
            {visibleObjectBillingAccounts.length === 0 ? (
              <EmptyState title="还没有账务账户" description="先创建组织或补齐演示数据，账户索引会在这里出现。" />
            ) : (
              <BillingAccountSelectionTable
                rows={visibleObjectBillingAccounts}
                selectedId={selectedObjectAccount?.id}
                onSelect={(id) => navigateToObject("account", id)}
                statusChipTone={statusChipTone}
              />
            )}
            {selectedObjectAccount ? (
              <div className="rounded-[16px] border border-[rgba(102,115,94,0.18)] bg-[rgba(102,115,94,0.08)] px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[15px] font-semibold text-[#202124]">当前定位账户</p>
                  <span className="rounded-full bg-white/70 px-2.5 py-1 text-[12px] text-[#465240]">{selectedObjectAccount.name}</span>
                </div>
                <div className="mt-3 grid gap-2 xl:grid-cols-3">
                  <DetailField label="账户" value={selectedObjectAccount.name} />
                  <DetailField label="组织" value={selectedObjectAccount.organizationName ?? "未绑定组织"} />
                  <DetailField label="归因状态" value={selectedObjectAccount.hasOrganization ? "已绑定组织" : "待清理"} />
                </div>
              </div>
            ) : null}
          </div>
        </ObjectsTable>
      ) : null}

      {isPlansWorkspace ? (
        <ObjectsTable
          id="objects-plan-structure"
          eyebrow="商品工作台"
          title="商品 / 计划工作台"
          description="先看平台商品结构、计费方式和权益，再决定是否创建订阅或上架。"
          aside={
            <span className="rounded-full bg-[rgba(24,24,23,0.06)] px-2.5 py-1 text-[12px] text-[#6f747b]">
              {formatNumber(visibleObjectPlans.length)} 个商品
            </span>
          }
        >
          <div className="space-y-3">
            {visibleObjectPlans.length === 0 ? (
              <EmptyState title="还没有平台商品" description="先创建平台商品，或执行演示数据初始化。" />
            ) : (
              <PlanSelectionTable
                rows={visibleObjectPlans}
                selectedId={selectedObjectPlan?.id}
                onSelect={(id) => navigateToObject("plan", id)}
                formatBillingCycle={formatBillingCycle}
                formatMoney={formatMoney}
              />
            )}
            {selectedObjectPlan ? (
              <div className="rounded-[16px] border border-[rgba(102,115,94,0.18)] bg-[rgba(102,115,94,0.08)] px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[15px] font-semibold text-[#202124]">当前定位商品</p>
                  <span className="rounded-full bg-white/70 px-2.5 py-1 text-[12px] text-[#465240]">{selectedObjectPlan.name}</span>
                </div>
                <div className="mt-3 grid gap-2 xl:grid-cols-4">
                  <DetailField label="类别" value={selectedObjectPlan.categoryLabel} />
                  <DetailField label="计费" value={formatBillingCycle(selectedObjectPlan)} />
                  <DetailField label="价格" value={formatMoney(selectedObjectPlan.priceCents, selectedObjectPlan.currency)} />
                  <DetailField
                    label="权益"
                    value={
                      selectedObjectPlan.pointsAmount
                        ? `${formatNumber(selectedObjectPlan.pointsAmount)} 经营点`
                        : selectedObjectPlan.usageSummary || "标准权益"
                    }
                  />
                </div>
              </div>
            ) : null}
          </div>
        </ObjectsTable>
      ) : null}

      {isOrganizationsWorkspace ? (
        <ObjectsTable
          id="objects-organizations"
          eyebrow="组织工作台"
          title="组织主体工作台"
          description="进入这个工作台后，先看主体列表和当前定位组织，再决定是否创建或清理。"
          aside={
            <span className="rounded-full bg-[rgba(24,24,23,0.06)] px-2.5 py-1 text-[12px] text-[#6f747b]">
              {formatNumber(visibleObjectOrganizations.length)} 个组织
            </span>
          }
        >
          <div className="space-y-4">
            {selectedOrganization ? (
              <div className="rounded-[16px] border border-[rgba(102,115,94,0.18)] bg-[rgba(102,115,94,0.08)] px-4 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[15px] font-semibold text-[#202124]">当前定位组织</p>
                  <span className="rounded-full bg-white/70 px-2.5 py-1 text-[12px] text-[#465240]">
                    {selectedOrganization.name}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 xl:grid-cols-4">
                  <DetailField label="Slug" value={selectedOrganization.slug} />
                  <DetailField label="状态" value={selectedOrganization.status} />
                  <DetailField label="成员" value={formatNumber(selectedOrganization.memberCount)} />
                  <DetailField label="账务账户" value={formatNumber(selectedOrganization.billingAccountCount)} />
                </div>
                <div className="mt-3 grid gap-2 xl:grid-cols-3">
                  <DetailField label="项目数量" value={formatNumber(selectedOrganization.projectCount)} />
                  <DetailField label="主体类型" value={selectedOrganization.type} />
                  <DetailField label="创建时间" value={formatDate(selectedOrganization.createdAt)} />
                </div>
              </div>
            ) : null}

            {visibleObjectOrganizations.length === 0 ? (
              <EmptyState title="还没有组织主体" description="可以新建组织，或使用演示数据快速起盘。" />
            ) : (
              <OrganizationSelectionTable
                rows={visibleObjectOrganizations}
                selectedId={selectedOrganization?.id}
                onSelect={(id) => navigateToObject("org", id)}
                formatDate={formatDate}
                statusChipTone={statusChipTone}
                formatNumber={formatNumber}
              />
            )}
          </div>
        </ObjectsTable>
      ) : null}

      <ObjectsTable
        eyebrow="操作区"
        title="对象操作区"
        description={operationsHubDescription}
        aside={
          <span className="rounded-full bg-[rgba(24,24,23,0.06)] px-2.5 py-1 text-[12px] text-[#6f747b]">
            4 类动作
          </span>
        }
      >
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-[20px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_12px_28px_rgba(24,24,23,0.04)]">
            <p className="text-[16px] font-semibold text-[#202124]">组织开通向导</p>
            <p className="mt-1 text-[13px] leading-5 text-[#6f747b]">
              组织 → 成员 → 账务 → 可选订阅，避免孤立主体。
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[12px]">
              {[1, 2, 3].map((step) => (
                <span
                  key={step}
                  className={`rounded-full px-2.5 py-1 ${
                    orgWizardStep === step
                      ? "bg-[#181817] text-white"
                      : "bg-[rgba(24,24,23,0.06)] text-[#6f747b]"
                  }`}
                >
                  {step === 1 ? "1 主体" : step === 2 ? "2 负责人" : "3 订阅"}
                </span>
              ))}
            </div>

            {orgWizardStep === 1 ? (
              <div className="mt-4 space-y-2">
                <FieldLabel>组织名称</FieldLabel>
                <input
                  value={orgName}
                  onChange={(event) => setOrgName(event.target.value)}
                  placeholder="例如：Mealkey North China"
                  className="w-full rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] px-3 py-3 text-[14px] text-[#202124] outline-none"
                />
                <button
                  type="button"
                  disabled={!orgName.trim()}
                  onClick={() => setOrgWizardStep(2)}
                  className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-[14px] bg-[#181817] px-4 text-[14px] font-semibold text-white disabled:opacity-50"
                >
                  下一步：负责人
                </button>
              </div>
            ) : null}

            {orgWizardStep === 2 ? (
              <div className="mt-4 space-y-2">
                <FieldLabel>负责人用户 ID（可选）</FieldLabel>
                <input
                  value={orgOwnerUserId}
                  onChange={(event) => setOrgOwnerUserId(event.target.value)}
                  placeholder="User.id，留空则仅建组织+账务"
                  className="w-full rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] px-3 py-3 text-[14px] text-[#202124] outline-none"
                />
                <p className="text-[12px] text-[#6f747b]">填写后会写入 OWNER 成员，并能绑定 Owner 账务主体。</p>
                <div className="mt-2 grid gap-2 xl:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setOrgWizardStep(1)}
                    className="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-white px-4 text-[14px] font-semibold text-[#202124]"
                  >
                    上一步
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrgWizardStep(3)}
                    className="inline-flex min-h-11 items-center justify-center rounded-[14px] bg-[#181817] px-4 text-[14px] font-semibold text-white"
                  >
                    下一步：订阅
                  </button>
                </div>
              </div>
            ) : null}

            {orgWizardStep === 3 ? (
              <div className="mt-4 space-y-2">
                <FieldLabel>可选：创建时绑定计划</FieldLabel>
                <select
                  value={orgWizardPlanId}
                  onChange={(event) => setOrgWizardPlanId(event.target.value)}
                  className="w-full rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] px-3 py-3 text-[14px] text-[#202124] outline-none"
                >
                  <option value="">暂不创建订阅</option>
                  {visibleObjectPlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} · {plan.code}
                    </option>
                  ))}
                </select>
                {orgWizardPlanId ? (
                  <>
                    <FieldLabel>席位数</FieldLabel>
                    <input
                      value={orgWizardSeats}
                      onChange={(event) => setOrgWizardSeats(event.target.value.replace(/\D+/g, ""))}
                      inputMode="numeric"
                      autoComplete="off"
                      onFocus={(event) => event.currentTarget.select()}
                      onMouseUp={(event) => {
                        event.preventDefault();
                        event.currentTarget.select();
                      }}
                      className="w-full rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] px-3 py-3 text-[14px] text-[#202124] outline-none"
                    />
                  </>
                ) : null}
                <div className="mt-2 grid gap-2 xl:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setOrgWizardStep(2)}
                    className="inline-flex min-h-11 items-center justify-center rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-white px-4 text-[14px] font-semibold text-[#202124]"
                  >
                    上一步
                  </button>
                  <button
                    type="button"
                    disabled={isPending || !orgName.trim()}
                    onClick={() => {
                      askConfirm({
                        title: "确认创建组织？",
                        description: orgWizardPlanId
                          ? "将创建组织、OWNER 成员（若有）、账务账户与订阅。"
                          : "将创建组织、OWNER 成员（若有）与账务账户。",
                        onConfirm: () => {
                          onCreateOrganization({
                            name: orgName.trim(),
                            ownerUserId: orgOwnerUserId.trim() || null,
                            planId: orgWizardPlanId || null,
                            seats: Number(orgWizardSeats || 1),
                          });
                          setOrgWizardStep(1);
                          setOrgOwnerUserId("");
                          setOrgWizardPlanId("");
                          setOrgWizardSeats("1");
                        },
                      });
                    }}
                    className="inline-flex min-h-11 items-center justify-center rounded-[14px] bg-[#181817] px-4 text-[14px] font-semibold text-white disabled:opacity-50"
                  >
                    确认创建
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <form
            className="rounded-[20px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_12px_28px_rgba(24,24,23,0.04)]"
            onSubmit={(event) => {
              event.preventDefault();
              onCreatePlan();
            }}
          >
            <p className="text-[16px] font-semibold text-[#202124]">创建平台商品</p>
            <p className="mt-1 text-[13px] leading-5 text-[#6f747b]">这里面向母体席位、专项咨询包和经营点商品，不再是纯技术计划对象。</p>
            <div className="mt-4 grid gap-2">
              <FieldLabel>计划编码</FieldLabel>
              <input
                value={planCode}
                onChange={(event) => setPlanCode(event.target.value)}
                placeholder="points_growth"
                className="w-full rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] px-3 py-3 text-[14px] text-[#202124] outline-none"
              />
              <FieldLabel>计划名称</FieldLabel>
              <input
                value={planName}
                onChange={(event) => setPlanName(event.target.value)}
                placeholder="例如：经营点成长包"
                className="w-full rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] px-3 py-3 text-[14px] text-[#202124] outline-none"
              />
              <FieldLabel>价格（分）</FieldLabel>
              <input
                value={planPrice}
                onChange={(event) => setPlanPrice(event.target.value.replace(/\D+/g, ""))}
                placeholder="29900"
                inputMode="numeric"
                autoComplete="off"
                onFocus={(event) => event.currentTarget.select()}
                onMouseUp={(event) => {
                  event.preventDefault();
                  event.currentTarget.select();
                }}
                className="w-full rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] px-3 py-3 text-[14px] text-[#202124] outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isPending || !planCode.trim() || !planName.trim()}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-[14px] bg-[#181817] px-4 text-[14px] font-semibold text-white disabled:opacity-50"
            >
              新建平台商品
            </button>
          </form>

          <form
            className="rounded-[20px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_12px_28px_rgba(24,24,23,0.04)]"
            onSubmit={(event) => {
              event.preventDefault();
              onCreateListing();
            }}
          >
            <p className="text-[16px] font-semibold text-[#202124]">创建 Listing</p>
            <p className="mt-1 text-[13px] leading-5 text-[#6f747b]">把能力打包成可上架、可分润、可运营的对象。</p>
            <div className="mt-4 grid gap-2">
              <FieldLabel>Listing 名称</FieldLabel>
              <input
                value={listingName}
                onChange={(event) => setListingName(event.target.value)}
                placeholder="Listing 名称"
                className="w-full rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] px-3 py-3 text-[14px] text-[#202124] outline-none"
              />
              <FieldLabel>Slug</FieldLabel>
              <input
                value={listingSlug}
                onChange={(event) => setListingSlug(event.target.value)}
                placeholder="slug（可选）"
                className="w-full rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] px-3 py-3 text-[14px] text-[#202124] outline-none"
              />
              <FieldLabel>价格（分）</FieldLabel>
              <input
                value={listingPrice}
                onChange={(event) => setListingPrice(event.target.value.replace(/\D+/g, ""))}
                placeholder="29900"
                inputMode="numeric"
                autoComplete="off"
                onFocus={(event) => event.currentTarget.select()}
                onMouseUp={(event) => {
                  event.preventDefault();
                  event.currentTarget.select();
                }}
                className="w-full rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] px-3 py-3 text-[14px] text-[#202124] outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={isPending || !listingName.trim()}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-[14px] bg-[#181817] px-4 text-[14px] font-semibold text-white disabled:opacity-50"
            >
              新建上架对象
            </button>
          </form>

          <div className="rounded-[20px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_12px_28px_rgba(24,24,23,0.04)]">
            <p className="text-[16px] font-semibold text-[#202124]">创建订阅</p>
            <p className="mt-1 text-[13px] leading-5 text-[#6f747b]">将账务账户与平台商品绑定起来，形成真正的商业对象。</p>
            <div className="mt-4 grid gap-2">
              <FieldLabel>Billing Account</FieldLabel>
              <select
                value={selectedBillingAccountId}
                onChange={(event) => setSelectedBillingAccountId(event.target.value)}
                className="w-full rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] px-3 py-3 text-[14px] text-[#202124] outline-none"
              >
                <option value="">选择 Billing Account</option>
                {visibleObjectBillingAccounts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.organizationName ?? item.name}
                  </option>
                ))}
              </select>
              <FieldLabel>Plan</FieldLabel>
              <select
                value={selectedPlanId}
                onChange={(event) => setSelectedPlanId(event.target.value)}
                className="w-full rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] px-3 py-3 text-[14px] text-[#202124] outline-none"
              >
                <option value="">选择 Plan</option>
                {visibleObjectPlans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name}
                  </option>
                ))}
              </select>
              <FieldLabel>席位数</FieldLabel>
              <input
                value={seats}
                onChange={(event) => setSeats(event.target.value.replace(/\D+/g, ""))}
                placeholder="1"
                inputMode="numeric"
                autoComplete="off"
                onFocus={(event) => event.currentTarget.select()}
                onMouseUp={(event) => {
                  event.preventDefault();
                  event.currentTarget.select();
                }}
                className="w-full rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] px-3 py-3 text-[14px] text-[#202124] outline-none"
              />
            </div>
            <button
              type="button"
              onClick={onCreateSubscription}
              disabled={isPending || !canCreateSubscription}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-[14px] bg-[#181817] px-4 text-[14px] font-semibold text-white disabled:opacity-50"
            >
              绑定订阅
            </button>
          </div>
        </div>
      </ObjectsTable>

      <ObjectsTable
        eyebrow="对象索引"
        title="对象索引总览"
        description="其余对象仍保留在这里，便于从当前工作台快速跳到相邻对象域。"
      >
        <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
          <ObjectsTable title="组织主体" description="查看哪些组织、项目和账务关系已经长出来。">
            <div className="space-y-3">
              {visibleObjectOrganizations.slice(0, 6).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => navigateToObject("org", item.id)}
                  className={`w-full rounded-[16px] border px-4 py-4 text-left transition ${
                    selectedOrganization?.id === item.id
                      ? "border-[rgba(102,115,94,0.24)] bg-[rgba(102,115,94,0.08)]"
                      : "border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] hover:border-[rgba(24,24,23,0.12)]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[14px] font-semibold text-[#202124]">{item.name}</p>
                      </div>
                      <p className="mt-1 text-[12px] leading-5 text-[#6f747b]">{item.slug}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[12px] ${statusChipTone(item.status)}`}>{item.status}</span>
                  </div>
                </button>
              ))}
            </div>
          </ObjectsTable>

          <ObjectsTable title="账务与对象索引" description="帮助平台快速看清账务账户、商品与上架对象的结构。">
            <div className="space-y-3">
              <div id="objects-billing-accounts" className="scroll-mt-24 rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] px-4 py-4">
                <p className="text-[14px] font-semibold text-[#202124]">账务账户</p>
                <div className="mt-3 space-y-2">
                  {visibleObjectBillingAccounts.slice(0, 6).map((account) => (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => navigateToObject("account", account.id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-[12px] px-3 py-3 text-left transition ${
                        selectedObjectAccount?.id === account.id
                          ? "bg-[rgba(102,115,94,0.10)]"
                          : "bg-white hover:bg-[rgba(24,24,23,0.03)]"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[#202124]">{account.name}</p>
                        <p className="text-[12px] text-[#6f747b]">{account.organizationName ?? "未绑定组织"}</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[12px] ${statusChipTone(account.status)}`}>{account.status}</span>
                    </button>
                  ))}
                </div>
                {selectedObjectAccount ? (
                  <div className="mt-3 rounded-[14px] border border-[rgba(24,24,23,0.06)] bg-white px-3 py-3">
                    <div className="grid gap-2 xl:grid-cols-3">
                      <DetailField label="账户" value={selectedObjectAccount.name} />
                      <DetailField label="组织" value={selectedObjectAccount.organizationName ?? "未绑定组织"} />
                      <DetailField label="归因状态" value={selectedObjectAccount.hasOrganization ? "已绑定组织" : "待清理"} />
                    </div>
                  </div>
                ) : null}
              </div>
              <div id="objects-plan-structure" className="scroll-mt-24 rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] px-4 py-4">
                <p className="text-[14px] font-semibold text-[#202124]">当前商品结构</p>
                <div className="mt-3 space-y-2">
                  {visibleObjectPlans.slice(0, 6).map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => navigateToObject("plan", plan.id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-[12px] px-3 py-3 text-left transition ${
                        selectedObjectPlan?.id === plan.id
                          ? "bg-[rgba(102,115,94,0.10)]"
                          : "bg-white hover:bg-[rgba(24,24,23,0.03)]"
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-[#202124]">{plan.name}</p>
                        <p className="text-[12px] text-[#6f747b]">{plan.categoryLabel}</p>
                      </div>
                      <span className="text-[12px] font-medium text-[#202124]">{formatMoney(plan.priceCents, plan.currency)}</span>
                    </button>
                  ))}
                </div>
                {selectedObjectPlan ? (
                  <div className="mt-3 rounded-[14px] border border-[rgba(24,24,23,0.06)] bg-white px-3 py-3">
                    <div className="grid gap-2 xl:grid-cols-4">
                      <DetailField label="商品" value={selectedObjectPlan.name} />
                      <DetailField label="类别" value={selectedObjectPlan.categoryLabel} />
                      <DetailField label="计费" value={formatBillingCycle(selectedObjectPlan)} />
                      <DetailField
                        label="权益"
                        value={
                          selectedObjectPlan.pointsAmount
                            ? `${formatNumber(selectedObjectPlan.pointsAmount)} 经营点`
                            : selectedObjectPlan.usageSummary || "标准权益"
                        }
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </ObjectsTable>
        </div>
      </ObjectsTable>
    </PanelShell>
  );
}
