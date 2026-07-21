"use client";

import type { Dispatch, SetStateAction } from "react";

import type {
  BusinessPointsOrderRow,
  CapabilityPricingRow,
  ConsumptionEconomicsRow,
  InvoiceRow,
  PlanRow,
  PlatformAdminAlert,
  PlatformAdminMetric,
  SubscriptionRow,
  ThirdPartyUsageAnomalyRow,
  ThirdPartyUsageRow,
  ThirdPartyUsageSummary,
  ThirdPartyUsageTrendPoint,
} from "@/server/services/platform-admin.service";

import type { AdminWorkspaceId } from "../admin-console-config";
import {
  DemoChip,
  DetailField,
  EmptyState,
  FilterScopeNotice,
  MetricGrid,
  ObjectsTable,
  PanelShell,
  SectionIntro,
  SeededFilterToggle,
} from "../admin-console-ui";
import {
  CapabilityConsumptionSummaryTable,
  CapabilityPricingTable,
  ConsumptionEconomicsTable,
  PointsOrdersTable,
  TokenUsageSummaryTable,
  UsageAnomalyDetail,
  UsageAnomalyList,
  UsageTrendChart,
  type CapabilityConsumptionSummary,
} from "./business-tables";
import { AlertList } from "./shared";

type UsageAnomalyFilter = "all" | "metadata" | "billable_without_cost" | "high_token_unbillable";
type RefreshScope = "overview" | "billing" | "learning" | "marketplace" | "objects";

type RunAction = (
  action: () => Promise<unknown>,
  options: {
    successMessage: string;
    refreshScope?: RefreshScope | RefreshScope[];
    applyResult?: (result: unknown) => void;
  },
) => void;

type SubscriptionEdit = {
  status: string;
  seats: string;
  cancelAtPeriodEnd: boolean;
};

type InvoiceEdit = {
  planId: string;
  orderNo: string;
};

export function BusinessPanel({
  activeWorkspaceId,
  showSeededData,
  hiddenSeededCount,
  setShowSeededData,
  derivedBusinessCards,
  formatMetricValue,
  visibleBusinessPointsOrders,
  visibleBusinessConsumptions,
  visibleBusinessCapabilityPricing,
  visibleBusinessPlans,
  visibleBusinessSubscriptions,
  visibleBusinessInvoices,
  visibleBusinessUsageSummary,
  visibleBusinessUsageTrend,
  visibleBusinessUsageTypes,
  visibleBusinessUsageProviders,
  visibleBusinessUsageModels,
  visibleBusinessUsageAnomalies,
  visibleUsageMetadataAnomalyCount,
  visibleUsageBillableWithoutCostCount,
  visibleUsageHighTokenUnbillableCount,
  filteredBusinessUsageAnomalies,
  selectedUsageAnomaly,
  visibleSettledConsumptionPoints,
  visibleCostCoveragePercent,
  businessOperationalAlerts,
  usageAnomalyFilter,
  setUsageAnomalyFilter,
  capabilityConsumptionSummaries,
  topConsumptionCapability,
  lowestMarginCapability,
  getSubscriptionEdit,
  setSubscriptionEdits,
  getInvoiceEdit,
  setInvoiceEdits,
  runAction,
  readJson,
  isPending,
  formatDate,
  formatNumber,
  formatMoney,
  formatMoneyValue,
  formatBillingCycle,
  statusChipTone,
  jumpWithinBusiness,
  handleUsageAnomalySelect,
}: {
  activeWorkspaceId: AdminWorkspaceId;
  showSeededData: boolean;
  hiddenSeededCount: number;
  setShowSeededData: Dispatch<SetStateAction<boolean>>;
  derivedBusinessCards: PlatformAdminMetric[];
  formatMetricValue: (metric: PlatformAdminMetric) => string;
  visibleBusinessPointsOrders: BusinessPointsOrderRow[];
  visibleBusinessConsumptions: ConsumptionEconomicsRow[];
  visibleBusinessCapabilityPricing: CapabilityPricingRow[];
  visibleBusinessPlans: PlanRow[];
  visibleBusinessSubscriptions: SubscriptionRow[];
  visibleBusinessInvoices: InvoiceRow[];
  visibleBusinessUsageSummary: ThirdPartyUsageSummary;
  visibleBusinessUsageTrend: ThirdPartyUsageTrendPoint[];
  visibleBusinessUsageTypes: ThirdPartyUsageRow[];
  visibleBusinessUsageProviders: ThirdPartyUsageRow[];
  visibleBusinessUsageModels: ThirdPartyUsageRow[];
  visibleBusinessUsageAnomalies: ThirdPartyUsageAnomalyRow[];
  visibleUsageMetadataAnomalyCount: number;
  visibleUsageBillableWithoutCostCount: number;
  visibleUsageHighTokenUnbillableCount: number;
  filteredBusinessUsageAnomalies: ThirdPartyUsageAnomalyRow[];
  selectedUsageAnomaly: ThirdPartyUsageAnomalyRow | null;
  visibleSettledConsumptionPoints: number;
  visibleCostCoveragePercent: number | null;
  businessOperationalAlerts: PlatformAdminAlert[];
  usageAnomalyFilter: UsageAnomalyFilter;
  setUsageAnomalyFilter: (next: UsageAnomalyFilter) => void;
  capabilityConsumptionSummaries: CapabilityConsumptionSummary[];
  topConsumptionCapability: CapabilityConsumptionSummary | null;
  lowestMarginCapability: CapabilityConsumptionSummary | null;
  getSubscriptionEdit: (subscription: SubscriptionRow) => SubscriptionEdit;
  setSubscriptionEdits: Dispatch<SetStateAction<Record<string, SubscriptionEdit>>>;
  getInvoiceEdit: (invoice: InvoiceRow) => InvoiceEdit;
  setInvoiceEdits: Dispatch<SetStateAction<Record<string, InvoiceEdit>>>;
  runAction: RunAction;
  readJson: (response: Response) => Promise<unknown>;
  isPending: boolean;
  formatDate: (value: string | null | undefined) => string;
  formatNumber: (value: number | null | undefined) => string;
  formatMoney: (cents: number | null | undefined, currency?: string) => string;
  formatMoneyValue: (amount: number | null | undefined, currency?: string, digits?: number) => string;
  formatBillingCycle: (plan: PlanRow) => string;
  statusChipTone: (status: string) => string;
  jumpWithinBusiness: (anchorId: string) => void;
  handleUsageAnomalySelect: (id: string) => void;
}) {
  const tableFormatters = {
    formatDate,
    formatNumber,
    formatMoney,
    formatMoneyValue,
    statusChipTone,
  };

  function renderBusinessCoreLead() {
    return (
      <>
        <ObjectsTable
          id="business-alerts"
          title="经营异常提示"
          description="先把经营上最值得追的问题顶出来，再决定是去改定价、补成本回传，还是检查需求入口。"
        >
          <AlertList alerts={businessOperationalAlerts} formatNumber={formatNumber} />
        </ObjectsTable>

        {!showSeededData ? (
          <FilterScopeNotice
            title="能力定价规则仍显示当前生效配置"
            description="“仅看真实对象”会过滤演示订单与演示消耗，但能力定价属于平台当前生效的运营配置，会继续展示，便于你直接审视价格因子。"
          />
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <ObjectsTable id="business-points-orders" title="经营点充值订单" description="先看最近 30 天谁在充值、买了什么、对应多少经营点。">
            <PointsOrdersTable rows={visibleBusinessPointsOrders} formatDate={formatDate} formatMoney={formatMoney} formatNumber={formatNumber} />
          </ObjectsTable>
          <ObjectsTable
            id="business-consumption-economics"
            title="最近消耗与毛利"
            description="把能力消耗、模型成本和毛利放在同一张运营工作台里看。"
          >
            <ConsumptionEconomicsTable rows={visibleBusinessConsumptions} {...tableFormatters} />
          </ObjectsTable>
        </div>

        <ObjectsTable
          id="business-capability-structure"
          title="能力毛利结构"
          description="按能力聚合最近 30 天的调用、经营点、成本和毛利，直接看哪项能力最吃点、哪项能力最伤毛利。"
        >
          <CapabilityConsumptionSummaryTable
            rows={capabilityConsumptionSummaries}
            topConsumptionCapability={topConsumptionCapability}
            lowestMarginCapability={lowestMarginCapability}
            formatNumber={formatNumber}
            formatMoney={formatMoney}
          />
        </ObjectsTable>
      </>
    );
  }

  function renderBusinessThirdPartyLead() {
    return (
      <>
        <ObjectsTable
          id="business-third-party-summary"
          title="第三方耗用摘要"
          description="这层直接来自 UsageRecord，不依赖经营点是否完成结算。先看第三方真实耗用，再看经营结算有没有回传到同一口径。"
        >
          <div className="grid gap-2 xl:grid-cols-4">
            <DetailField label="30 天记录数" value={`${formatNumber(visibleBusinessUsageSummary.recordedEvents)} 条`} />
            <DetailField label="30 天总 Tokens" value={formatNumber(visibleBusinessUsageSummary.tokenTotal)} />
            <DetailField
              label="30 天第三方成本"
              value={formatMoneyValue(
                visibleBusinessUsageSummary.costValue,
                visibleBusinessUsageSummary.currency,
                visibleBusinessUsageSummary.currency === "CNY" ? 2 : 6,
              )}
            />
            <DetailField
              label="数据质量"
              value={`缺 Provider ${formatNumber(visibleBusinessUsageSummary.missingProviderCount)} / 缺 Model ${formatNumber(visibleBusinessUsageSummary.missingModelCount)}`}
            />
          </div>
        </ObjectsTable>

        <div className="grid gap-4 xl:grid-cols-2">
          <ObjectsTable
            id="business-usage-trend"
            eyebrow="7 天趋势"
            title="第三方耗用趋势"
            description="先看最近 7 天的 Tokens、记录数和成本波动，再判断是单日尖峰还是持续抬升。"
          >
            <UsageTrendChart points={visibleBusinessUsageTrend} formatNumber={formatNumber} formatMoneyValue={formatMoneyValue} />
          </ObjectsTable>
          <ObjectsTable
            id="business-usage-types"
            eyebrow="Usage Type"
            title="UsageType 分层"
            description="把 UsageRecord 按 usageType 聚合，区分聊天、推理、嵌入等不同底层耗用形态。"
          >
            <TokenUsageSummaryTable
              rows={visibleBusinessUsageTypes}
              options={{
                emptyTitle: "还没有可聚合的 usageType",
                emptyDescription: "当前最近 30 天还没有可用的 UsageRecord，usageType 分层暂时为空。",
                secondaryLabel: "覆盖资源",
              }}
              formatDate={formatDate}
              formatNumber={formatNumber}
              formatMoneyValue={formatMoneyValue}
            />
          </ObjectsTable>
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ObjectsTable
            id="business-provider-usage"
            title="第三方耗用结构"
            description="按 Provider 聚合最近 30 天的 Tokens、模型成本与毛利，直接看哪家底层模型服务商最吃资源。"
          >
            <TokenUsageSummaryTable
              rows={visibleBusinessUsageProviders}
              options={{
                emptyTitle: "还没有可聚合的 Provider 耗用",
                emptyDescription: "当前最近 30 天还没有可用的 UsageRecord，第三方耗用结构暂时为空。",
                secondaryLabel: "覆盖模型",
              }}
              formatDate={formatDate}
              formatNumber={formatNumber}
              formatMoneyValue={formatMoneyValue}
            />
          </ObjectsTable>
          <ObjectsTable
            id="business-model-usage"
            title="模型耗用结构"
            description="按具体 Model 聚合最近 30 天的 Tokens、成本与毛利，直接看哪一个模型在拖成本或吃掉大头。"
          >
            <TokenUsageSummaryTable
              rows={visibleBusinessUsageModels}
              options={{
                emptyTitle: "还没有可聚合的模型耗用",
                emptyDescription: "当前最近 30 天还没有可用的 UsageRecord，模型层耗用结构暂时为空。",
                secondaryLabel: "Provider",
              }}
              formatDate={formatDate}
              formatNumber={formatNumber}
              formatMoneyValue={formatMoneyValue}
            />
          </ObjectsTable>
        </div>

        <ObjectsTable
          id="business-usage-anomalies"
          eyebrow="异常下钻"
          title="第三方耗用异常清单"
          description="把最值得追的 UsageRecord 直接拉出来，优先排查缺元数据、billable 无成本和高 Tokens 未计费。"
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {([
                { id: "all", label: "全部异常", count: visibleBusinessUsageAnomalies.length },
                { id: "metadata", label: "元数据缺口", count: visibleUsageMetadataAnomalyCount },
                { id: "billable_without_cost", label: "billable 无成本", count: visibleUsageBillableWithoutCostCount },
                { id: "high_token_unbillable", label: "高 Tokens 未计费", count: visibleUsageHighTokenUnbillableCount },
              ] as Array<{ id: UsageAnomalyFilter; label: string; count: number }>).map((item) => {
                const active = usageAnomalyFilter === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setUsageAnomalyFilter(item.id)}
                    className={`rounded-full px-3 py-1.5 text-[12px] transition ${
                      active
                        ? "bg-[#181817] text-white"
                        : "border border-[rgba(24,24,23,0.08)] bg-white text-[#5f6368]"
                    }`}
                  >
                    {item.label} · {formatNumber(item.count)}
                  </button>
                );
              })}
            </div>
            <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
              <div>
                <UsageAnomalyList
                  rows={filteredBusinessUsageAnomalies}
                  options={{
                    selectedId: selectedUsageAnomaly?.id ?? null,
                    onSelect: handleUsageAnomalySelect,
                  }}
                  formatDate={formatDate}
                  formatNumber={formatNumber}
                  formatMoneyValue={formatMoneyValue}
                />
              </div>
              <div>
                <UsageAnomalyDetail
                  item={selectedUsageAnomaly}
                  formatDate={formatDate}
                  formatNumber={formatNumber}
                  formatMoney={formatMoney}
                  formatMoneyValue={formatMoneyValue}
                  jumpWithinBusiness={jumpWithinBusiness}
                />
              </div>
            </div>
          </div>
        </ObjectsTable>

        <ObjectsTable title="关联经营上下文" description="第三方耗用看完后，再回到经营口径确认这些模型成本有没有完整回传到结算层。">
          <div className="grid gap-2 xl:grid-cols-3">
            <DetailField label="经营异常" value={formatNumber(businessOperationalAlerts.length)} />
            <DetailField label="已结算经营点" value={`${formatNumber(visibleSettledConsumptionPoints)} 点`} />
            <DetailField label="模型成本覆盖率" value={typeof visibleCostCoveragePercent === "number" ? `${visibleCostCoveragePercent}%` : "--"} />
          </div>
        </ObjectsTable>
      </>
    );
  }

  const isThirdPartyWorkspace = activeWorkspaceId === "business-third-party";

  return (
    <PanelShell>
      <SectionIntro
        eyebrow={isThirdPartyWorkspace ? "第三方耗用" : "商业运营"}
        title={isThirdPartyWorkspace ? "先看模型耗用，再回到经营结算" : "围绕经营点与商品口径看商业健康度"}
        description={
          isThirdPartyWorkspace
            ? "这个工作台直接面向 Provider / Model / Tokens / Cost。先确认第三方实际耗用，再判断经营结算和毛利是不是完整接上。"
            : "这里先看最近 30 天的经营点收入、结算消耗、模型成本和毛利，再下钻到商品、订阅和发票对象。这样商业团队先看经营，再决定去修哪一层对象。"
        }
        aside={
          <SeededFilterToggle
            showSeededData={showSeededData}
            hiddenCount={hiddenSeededCount}
            onChange={setShowSeededData}
          />
        }
      />
      <MetricGrid metrics={derivedBusinessCards} formatMetricValue={formatMetricValue} />

      {isThirdPartyWorkspace ? renderBusinessThirdPartyLead() : renderBusinessCoreLead()}

      {isThirdPartyWorkspace ? (
        <ObjectsTable
          eyebrow="联动检查"
          title="关联经营工作台"
          description="如果第三方耗用已经确认，再回到经营对象层检查收入、订阅、发票和能力定价是否同步。"
        >
          <div className="grid gap-3 xl:grid-cols-3">
            <DetailField label="充值订单" value={`${formatNumber(visibleBusinessPointsOrders.length)} 笔`} />
            <DetailField label="结算消耗" value={`${formatNumber(visibleBusinessConsumptions.length)} 条`} />
            <DetailField label="能力定价规则" value={`${formatNumber(visibleBusinessCapabilityPricing.length)} 条`} />
          </div>
        </ObjectsTable>
      ) : (
        <ObjectsTable
          eyebrow="成本快照"
          title="第三方耗用快照"
          description="经营工作台先看商业健康度，但仍要知道第三方成本和数据质量是否稳定。"
        >
          <div className="grid gap-3 xl:grid-cols-4">
            <DetailField label="Usage 记录" value={`${formatNumber(visibleBusinessUsageSummary.recordedEvents)} 条`} />
            <DetailField label="第三方成本" value={formatMoneyValue(visibleBusinessUsageSummary.costValue, visibleBusinessUsageSummary.currency, visibleBusinessUsageSummary.currency === "CNY" ? 2 : 6)} />
            <DetailField label="缺 Provider" value={formatNumber(visibleBusinessUsageSummary.missingProviderCount)} />
            <DetailField label="缺 Model" value={formatNumber(visibleBusinessUsageSummary.missingModelCount)} />
          </div>
        </ObjectsTable>
      )}

      <ObjectsTable
        eyebrow="规则底表"
        title="能力定价规则"
        description="这是平台当前生效的能力价格底表，决定预授权和最终结算的经营点口径。"
        aside={
          <span className="rounded-full bg-[rgba(24,24,23,0.06)] px-2.5 py-1 text-[12px] text-[#6f747b]">
            {formatNumber(visibleBusinessCapabilityPricing.length)} 条规则
          </span>
        }
      >
        <CapabilityPricingTable rows={visibleBusinessCapabilityPricing} formatNumber={formatNumber} />
      </ObjectsTable>

      <ObjectsTable
        eyebrow="经营对象"
        title="商品结构"
        description="让运营先看清卖什么，而不是先滚对象。"
        aside={
          <span className="rounded-full bg-[rgba(24,24,23,0.06)] px-2.5 py-1 text-[12px] text-[#6f747b]">
            {formatNumber(visibleBusinessPlans.length)} 个商品
          </span>
        }
      >
        {visibleBusinessPlans.length === 0 ? (
          <EmptyState title="还没有平台商品" description="先去对象管理里创建计划或执行演示数据初始化。" />
        ) : (
          <div className="space-y-3">
            {visibleBusinessPlans.map((plan) => (
              <div
                key={plan.id}
                className="grid gap-3 rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] px-4 py-4 xl:grid-cols-[1.2fr_0.8fr_0.8fr]"
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[15px] font-semibold text-[#202124]">{plan.name}</p>
                    {plan.isSeeded ? <DemoChip /> : null}
                  </div>
                  <p className="mt-1 text-[13px] leading-5 text-[#6f747b]">
                    {plan.categoryLabel} · {plan.usageSummary}
                  </p>
                  {plan.isSeeded ? (
                    <p className="mt-2 text-[12px] leading-5 text-[#6f747b]">该商品来自演示初始化，用于展示平台经营对象结构。</p>
                  ) : null}
                </div>
                <div className="text-[13px] leading-6 text-[#202124]">
                  <p className="font-medium">{formatMoney(plan.priceCents, plan.currency)}</p>
                  <p className="text-[#6f747b]">{formatBillingCycle(plan)}</p>
                </div>
                <div className="flex items-center justify-start xl:justify-end">
                  <span className={`rounded-full px-2.5 py-1 text-[12px] ${statusChipTone(plan.status)}`}>{plan.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ObjectsTable>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <ObjectsTable
          eyebrow="续费与席位"
          title="订阅状态"
          description="这里要回答续费风险、席位变化和计划归属。"
        >
          {visibleBusinessSubscriptions.length === 0 ? (
            <EmptyState title="没有订阅对象" description="可在对象管理里直接创建订阅。" />
          ) : (
            <div className="space-y-3">
              {visibleBusinessSubscriptions.map((subscription) => (
                <div key={subscription.id} className="rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] p-4">
                  <div className="flex flex-col gap-2 xl:flex-row xl:items-start xl:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[15px] font-semibold text-[#202124]">
                          {subscription.organizationName ?? "未绑定组织"}
                        </p>
                        {subscription.isSeeded ? <DemoChip /> : null}
                      </div>
                      <p className="mt-1 text-[13px] leading-5 text-[#6f747b]">
                        {subscription.planLabel} · {subscription.billingAccountName ?? "未绑定账户"}
                      </p>
                      {subscription.isSeeded ? (
                        <p className="mt-2 text-[12px] leading-5 text-[#6f747b]">该订阅来自演示初始化，可用于串联发票和商品视图联调。</p>
                      ) : null}
                    </div>
                    <div className="text-[13px] leading-5 text-[#6f747b]">
                      到期 {formatDate(subscription.currentPeriodEnd)}
                      {subscription.daysToRenewal !== null ? ` · 剩余 ${subscription.daysToRenewal} 天` : ""}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-2 xl:grid-cols-4">
                    <select
                      value={getSubscriptionEdit(subscription).status}
                      onChange={(event) =>
                        setSubscriptionEdits((current) => ({
                          ...current,
                          [subscription.id]: {
                            ...getSubscriptionEdit(subscription),
                            status: event.target.value,
                          },
                        }))
                      }
                      className="rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 py-2 text-[13px] text-[#202124] outline-none"
                    >
                      <option value="active">active</option>
                      <option value="paused">paused</option>
                      <option value="canceled">canceled</option>
                    </select>
                    <input
                      value={getSubscriptionEdit(subscription).seats}
                      onChange={(event) =>
                        setSubscriptionEdits((current) => ({
                          ...current,
                          [subscription.id]: {
                            ...getSubscriptionEdit(subscription),
                            seats: event.target.value.replace(/\D+/g, ""),
                          },
                        }))
                      }
                      inputMode="numeric"
                      autoComplete="off"
                      onFocus={(event) => event.currentTarget.select()}
                      onMouseUp={(event) => {
                        event.preventDefault();
                        event.currentTarget.select();
                      }}
                      placeholder="席位数"
                      className="rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 py-2 text-[13px] text-[#202124] outline-none"
                    />
                    <label className="inline-flex min-h-[40px] items-center gap-2 rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 py-2 text-[13px] text-[#202124]">
                      <input
                        type="checkbox"
                        checked={getSubscriptionEdit(subscription).cancelAtPeriodEnd}
                        onChange={(event) =>
                          setSubscriptionEdits((current) => ({
                            ...current,
                            [subscription.id]: {
                              ...getSubscriptionEdit(subscription),
                              cancelAtPeriodEnd: event.target.checked,
                            },
                          }))
                        }
                        className="h-4 w-4"
                      />
                      <span>到期取消</span>
                    </label>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        runAction(async () => {
                          const draft = getSubscriptionEdit(subscription);
                          const response = await fetch("/api/platform/admin/billing", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              action: "update_subscription",
                              id: subscription.id,
                              status: draft.status,
                              seats: Number(draft.seats || subscription.seats),
                              cancelAtPeriodEnd: draft.cancelAtPeriodEnd,
                            }),
                          });
                          return readJson(response);
                        }, { successMessage: "订阅已更新", refreshScope: "billing" })
                      }
                      className="inline-flex min-h-10 items-center justify-center rounded-[12px] bg-[#181817] px-4 text-[13px] font-semibold text-white disabled:opacity-50"
                    >
                      保存
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ObjectsTable>

        <ObjectsTable
          id="business-invoices"
          eyebrow="归因检查"
          title="发票与归因"
          description="先补齐购买方案和订单归因，再把草稿发票推进到已确认、已开票状态。"
        >
          {visibleBusinessInvoices.length === 0 ? (
            <EmptyState title="没有发票对象" description="当前还没有进入平台管理视野的发票。" />
          ) : (
            <div className="space-y-3">
              {visibleBusinessInvoices.map((invoice) => (
                <div key={invoice.id} className="rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[14px] font-semibold text-[#202124]">{invoice.invoiceNo}</p>
                      <p className="mt-1 text-[13px] leading-5 text-[#6f747b]">
                        {invoice.billingAccountName ?? "未绑定账户"} · {invoice.planKindLabel}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[14px] font-semibold text-[#202124]">
                        {invoice.currency} {invoice.total}
                      </p>
                      <p className="text-[12px] leading-5 text-[#6f747b]">
                        创建 {formatDate(invoice.createdAt)}
                        {invoice.issuedAt ? ` · 开票 ${formatDate(invoice.issuedAt)}` : ""}
                        {invoice.paidAt ? ` · 支付 ${formatDate(invoice.paidAt)}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-[12px] ${statusChipTone(invoice.status)}`}>{invoice.status}</span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[12px] ${
                        invoice.planName
                          ? "bg-[rgba(24,24,23,0.06)] text-[#5f6368]"
                          : "bg-[rgba(186,160,92,0.10)] text-[#7A6941]"
                      }`}
                    >
                      {invoice.planName ?? "待补购买方案"}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[12px] ${
                        invoice.orderNo || invoice.isSeeded
                          ? "bg-[rgba(102,115,94,0.10)] text-[#465240]"
                          : "bg-[rgba(186,160,92,0.10)] text-[#7A6941]"
                      }`}
                    >
                      {invoice.orderNo
                        ? `订单 ${invoice.orderNo}`
                        : invoice.isSeeded
                          ? "演示草稿"
                          : invoice.isDraft
                            ? "草稿待生成订单"
                            : "缺少订单归因"}
                    </span>
                  </div>
                  {invoice.isUnlinked ? (
                    <p className="mt-3 text-[12px] leading-5 text-[#7A6941]">
                      这张发票还缺少明确的购买方案归因，请先补齐计划或订单号，再确认发票。
                    </p>
                  ) : invoice.isSeeded ? (
                    <p className="mt-3 text-[12px] leading-5 text-[#6f747b]">
                      该发票来自演示数据，购买语义已按当前订阅口径自动回填。
                    </p>
                  ) : null}
                  {invoice.status === "issued" || invoice.status === "paid" ? (
                    <div className="mt-3 rounded-[12px] border border-[rgba(102,115,94,0.14)] bg-[rgba(102,115,94,0.06)] px-3 py-3 text-[12px] leading-5 text-[#465240]">
                      {invoice.status === "paid"
                        ? "该发票已经随支付链路完成，不需要再由管理台重复推进。"
                        : "该发票已经推进到已开票状态，可继续做归档或对账。"}
                    </div>
                  ) : (
                    <div className="mt-3 grid gap-2 xl:grid-cols-[1fr_0.9fr_auto_auto]">
                      <select
                        value={getInvoiceEdit(invoice).planId}
                        onChange={(event) =>
                          setInvoiceEdits((current) => ({
                            ...current,
                            [invoice.id]: {
                              ...getInvoiceEdit(invoice),
                              planId: event.target.value,
                            },
                          }))
                        }
                        className="rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 py-2 text-[13px] text-[#202124] outline-none"
                      >
                        <option value="">选择购买方案</option>
                        {visibleBusinessPlans.map((plan) => (
                          <option key={plan.id} value={plan.id}>
                            {plan.name}
                          </option>
                        ))}
                      </select>
                      <input
                        value={getInvoiceEdit(invoice).orderNo}
                        onChange={(event) =>
                          setInvoiceEdits((current) => ({
                            ...current,
                            [invoice.id]: {
                              ...getInvoiceEdit(invoice),
                              orderNo: event.target.value,
                            },
                          }))
                        }
                        placeholder="订单号（可选）"
                        className="rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 py-2 text-[13px] text-[#202124] outline-none"
                      />
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() =>
                          runAction(async () => {
                            const draft = getInvoiceEdit(invoice);
                            const response = await fetch("/api/platform/admin/billing", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                action: "confirm_invoice",
                                id: invoice.id,
                                planId: draft.planId || null,
                                orderNo: draft.orderNo.trim() || null,
                              }),
                            });
                            return readJson(response);
                          }, { successMessage: invoice.status === "confirmed" ? "发票归因已更新" : "发票已确认归因", refreshScope: "billing" })
                        }
                        className="inline-flex min-h-10 items-center justify-center rounded-[12px] border border-[rgba(24,24,23,0.10)] bg-white px-4 text-[13px] font-semibold text-[#202124] disabled:opacity-50"
                      >
                        {invoice.status === "confirmed" ? "更新归因" : "确认归因"}
                      </button>
                      <button
                        type="button"
                        disabled={isPending || invoice.status !== "confirmed" || invoice.isUnlinked}
                        onClick={() =>
                          runAction(async () => {
                            const response = await fetch("/api/platform/admin/billing", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                action: "issue_invoice",
                                id: invoice.id,
                              }),
                            });
                            return readJson(response);
                          }, { successMessage: "发票已推进到已开票", refreshScope: "billing" })
                        }
                        className="inline-flex min-h-10 items-center justify-center rounded-[12px] bg-[#181817] px-4 text-[13px] font-semibold text-white disabled:opacity-50"
                      >
                        推进开票
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ObjectsTable>
      </div>
    </PanelShell>
  );
}
