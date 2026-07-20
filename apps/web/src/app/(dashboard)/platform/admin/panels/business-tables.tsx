"use client";

import type {
  BusinessPointsOrderRow,
  CapabilityPricingRow,
  ConsumptionEconomicsRow,
  ThirdPartyUsageAnomalyRow,
  ThirdPartyUsageRow,
  ThirdPartyUsageTrendPoint,
} from "@/server/services/platform-admin.service";

import { DemoChip, DetailField, EmptyState, FieldLabel, WorkbenchDetailPanel } from "../admin-console-ui";
import { alertToneClasses, capabilityAnchorId, consumptionAnchorId } from "./shared";

export type CapabilityConsumptionSummary = {
  capability: string;
  capabilityLabel: string;
  callCount: number;
  totalPoints: number;
  totalCostCents: number;
  grossProfitCents: number;
  grossMarginPercent: number | null;
  averagePointsPerCall: number;
  tokenTotal: number;
  topAgents: string[];
};

type FormatterProps = {
  formatDate: (value: string | null | undefined) => string;
  formatNumber: (value: number | null | undefined) => string;
  formatMoney: (cents: number | null | undefined, currency?: string) => string;
  formatMoneyValue: (amount: number | null | undefined, currency?: string, digits?: number) => string;
  statusChipTone: (status: string) => string;
};

export function PointsOrdersTable({
  rows,
  formatDate,
  formatMoney,
  formatNumber,
}: {
  rows: BusinessPointsOrderRow[];
} & Pick<FormatterProps, "formatDate" | "formatMoney" | "formatNumber">) {
  if (rows.length === 0) {
    return <EmptyState title="最近 30 天没有经营点充值订单" description="当前还没有可用于经营分析的充值订单样本。" />;
  }

  return (
    <>
      <div className="hidden xl:block overflow-x-auto rounded-[16px] border border-[rgba(24,24,23,0.06)]">
        <table className="min-w-full border-collapse text-left text-[13px] text-[#202124]">
          <thead className="bg-[#F5F3EE] text-[12px] uppercase tracking-[0.08em] text-[#6f747b]">
            <tr>
              <th className="px-4 py-3 font-medium">订单</th>
              <th className="px-4 py-3 font-medium">商品 / 账户</th>
              <th className="px-4 py-3 font-medium">经营者</th>
              <th className="px-4 py-3 font-medium">支付时间</th>
              <th className="px-4 py-3 font-medium text-right">金额</th>
              <th className="px-4 py-3 font-medium text-right">经营点</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {rows.map((order) => (
              <tr key={order.id} className="border-t border-[rgba(24,24,23,0.06)] align-top">
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{order.orderNo}</span>
                    {order.isSeeded ? <DemoChip /> : null}
                  </div>
                </td>
                <td className="px-4 py-3 text-[#5f6368]">
                  {order.planName ?? "未识别商品"} / {order.billingAccountName ?? "未绑定账户"}
                </td>
                <td className="px-4 py-3 text-[#5f6368]">{order.ownerName ?? "未绑定经营者"}</td>
                <td className="px-4 py-3 text-[#5f6368]">{formatDate(order.paidAt)}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatMoney(order.amountCents, order.currency)}</td>
                <td className="px-4 py-3 text-right">{formatNumber(order.pointsAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 xl:hidden">
        {rows.map((order) => (
          <div key={order.id} className="rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] p-4">
            <div className="flex flex-col gap-2 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[15px] font-semibold text-[#202124]">{order.orderNo}</p>
                  {order.isSeeded ? <DemoChip /> : null}
                </div>
                <p className="mt-1 text-[13px] leading-5 text-[#6f747b]">
                  {order.planName ?? "未识别商品"} · {order.billingAccountName ?? "未绑定账户"}
                </p>
                <p className="mt-2 text-[12px] leading-5 text-[#6f747b]">
                  {order.ownerName ?? "未绑定经营者"} · {formatDate(order.paidAt)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[14px] font-semibold text-[#202124]">{formatMoney(order.amountCents, order.currency)}</p>
                <p className="mt-1 text-[12px] leading-5 text-[#6f747b]">{formatNumber(order.pointsAmount)} 经营点</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function CapabilityPricingTable({
  rows,
  formatNumber,
}: {
  rows: CapabilityPricingRow[];
} & Pick<FormatterProps, "formatNumber">) {
  if (rows.length === 0) {
    return <EmptyState title="没有启用中的能力定价" description="请先初始化或写入 CapabilityPrice 规则。" />;
  }

  return (
    <div className="space-y-3">
      {rows.map((rule) => (
        <div
          key={rule.capability}
          className="grid gap-3 rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] px-4 py-4 xl:grid-cols-[0.8fr_1fr_1fr_0.9fr]"
        >
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[15px] font-semibold text-[#202124]">{rule.label}</p>
              {rule.isSeeded ? (
                <span className="rounded-full bg-[rgba(24,24,23,0.06)] px-2.5 py-1 text-[12px] text-[#5f6368]">
                  系统默认
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-[13px] leading-5 text-[#6f747b]">{rule.capability}</p>
          </div>
          <div>
            <FieldLabel>基础价格</FieldLabel>
            <p className="mt-1 text-[14px] leading-6 text-[#202124]">{formatNumber(rule.baseCost)} 经营点</p>
          </div>
          <div>
            <FieldLabel>深度 / 复杂度</FieldLabel>
            <p className="mt-1 text-[13px] leading-6 text-[#202124]">{rule.depthSummary}</p>
            <p className="text-[13px] leading-6 text-[#6f747b]">{rule.complexitySummary}</p>
          </div>
          <div>
            <FieldLabel>多 Agent 因子</FieldLabel>
            <p className="mt-1 text-[13px] leading-6 text-[#202124]">{rule.agentSummary ?? "默认 1x"}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ConsumptionEconomicsTable({
  rows,
  formatDate,
  formatMoney,
  formatNumber,
  statusChipTone,
}: {
  rows: ConsumptionEconomicsRow[];
} & Pick<FormatterProps, "formatDate" | "formatMoney" | "formatNumber" | "statusChipTone">) {
  if (rows.length === 0) {
    return <EmptyState title="最近 30 天还没有结算消耗" description="等真实调用结算后，这里会出现能力、成本和毛利投影。" />;
  }

  return (
    <>
      <div className="hidden xl:block overflow-x-auto rounded-[16px] border border-[rgba(24,24,23,0.06)]">
        <table className="min-w-full border-collapse text-left text-[13px] text-[#202124]">
          <thead className="bg-[#F5F3EE] text-[12px] uppercase tracking-[0.08em] text-[#6f747b]">
            <tr>
              <th className="px-4 py-3 font-medium">能力</th>
              <th className="px-4 py-3 font-medium">经营者</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium text-right">经营点</th>
              <th className="px-4 py-3 font-medium text-right">成本</th>
              <th className="px-4 py-3 font-medium text-right">毛利</th>
              <th className="px-4 py-3 font-medium text-right">Tokens</th>
              <th className="px-4 py-3 font-medium">模型 / Provider</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {rows.map((item) => {
              const isMissingCost = item.costCents <= 0;
              return (
                <tr
                  id={consumptionAnchorId(item.id)}
                  key={item.id}
                  className="scroll-mt-24 border-t border-[rgba(24,24,23,0.06)] align-top"
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{item.capabilityLabel}</span>
                      {item.isSeeded ? <DemoChip /> : null}
                    </div>
                    <p className="mt-1 text-[12px] text-[#6f747b]">{item.reason}</p>
                  </td>
                  <td className="px-4 py-3 text-[#5f6368]">
                    {item.ownerName ?? "未绑定经营者"}
                    <p className="mt-1 text-[12px]">{formatDate(item.createdAt)}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[12px] ${statusChipTone(item.status)}`}>{item.status}</span>
                      {isMissingCost ? (
                        <span className="rounded-full bg-[rgba(180,124,92,0.10)] px-2.5 py-1 text-[12px] text-[#8A5A40]">
                          成本待回传
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">{formatNumber(item.actualPoints)}</td>
                  <td className="px-4 py-3 text-right">{formatMoney(item.costCents, "CNY")}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${item.grossProfitCents >= 0 ? "text-[#465240]" : "text-[#8A5A40]"}`}>
                    {formatMoney(item.grossProfitCents, "CNY")}
                  </td>
                  <td className="px-4 py-3 text-right">{formatNumber(item.tokenTotal)}</td>
                  <td className="px-4 py-3 text-[#5f6368]">{`${item.model ?? "未记录"} / ${item.provider ?? "未记录"}`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 xl:hidden">
        {rows.map((item) => {
          const isMissingCost = item.costCents <= 0;

          return (
            <div
              id={consumptionAnchorId(item.id)}
              key={item.id}
              className="scroll-mt-24 rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] p-4"
            >
              <div className="flex flex-col gap-2 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[15px] font-semibold text-[#202124]">{item.capabilityLabel}</p>
                    <span className={`rounded-full px-2.5 py-1 text-[12px] ${statusChipTone(item.status)}`}>{item.status}</span>
                    {isMissingCost ? (
                      <span className="rounded-full bg-[rgba(180,124,92,0.10)] px-2.5 py-1 text-[12px] text-[#8A5A40]">
                        成本待回传
                      </span>
                    ) : null}
                    {item.isSeeded ? <DemoChip /> : null}
                  </div>
                  <p className="mt-1 text-[13px] leading-5 text-[#6f747b]">
                    {item.ownerName ?? "未绑定经营者"} · {formatDate(item.createdAt)}
                  </p>
                  <p className="mt-2 text-[12px] leading-5 text-[#6f747b]">{item.reason}</p>
                </div>
                <div className="text-right">
                  <p className={`text-[14px] font-semibold ${item.grossProfitCents >= 0 ? "text-[#465240]" : "text-[#8A5A40]"}`}>
                    毛利 {formatMoney(item.grossProfitCents, "CNY")}
                  </p>
                  <p className="mt-1 text-[12px] leading-5 text-[#6f747b]">
                    毛利率 {typeof item.grossMarginPercent === "number" ? `${item.grossMarginPercent}%` : "--"}
                  </p>
                </div>
              </div>
              <div className="mt-3 grid gap-2 xl:grid-cols-4">
                <DetailField label="结算经营点" value={`${formatNumber(item.actualPoints)} 点`} />
                <DetailField label="模型成本" value={formatMoney(item.costCents, "CNY")} />
                <DetailField label="消耗 Tokens" value={formatNumber(item.tokenTotal)} />
                <DetailField
                  label="模型 / Provider"
                  value={`${item.model ?? "未记录"} · ${item.provider ?? "未记录"}`}
                />
              </div>
              <div className="mt-3 text-[12px] leading-5 text-[#6f747b]">
                Agent 协同：{item.agentCodes.length > 0 ? item.agentCodes.join(" / ") : "单能力调用"}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function CapabilityConsumptionSummaryTable({
  rows,
  topConsumptionCapability,
  lowestMarginCapability,
  formatNumber,
  formatMoney,
}: {
  rows: CapabilityConsumptionSummary[];
  topConsumptionCapability: CapabilityConsumptionSummary | null;
  lowestMarginCapability: CapabilityConsumptionSummary | null;
} & Pick<FormatterProps, "formatNumber" | "formatMoney">) {
  if (rows.length === 0) {
    return <EmptyState title="还没有可聚合的能力消耗" description="等最近 30 天出现更多真实结算后，这里会自动长出能力毛利结构。" />;
  }

  return (
    <div className="space-y-3">
      {rows.map((item, index) => {
        const isTopConsumption = topConsumptionCapability?.capability === item.capability;
        const isLowestMargin = lowestMarginCapability?.capability === item.capability;

        return (
          <div
            id={capabilityAnchorId(item.capability)}
            key={item.capability}
            className="scroll-mt-24 grid gap-3 rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] px-4 py-4 xl:grid-cols-[0.9fr_0.8fr_0.8fr_0.8fr_1fr]"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[15px] font-semibold text-[#202124]">{item.capabilityLabel}</p>
                {isTopConsumption ? (
                  <span className="rounded-full bg-[rgba(102,115,94,0.10)] px-2.5 py-1 text-[12px] text-[#465240]">
                    消耗最高
                  </span>
                ) : null}
                {isLowestMargin ? (
                  <span className="rounded-full bg-[rgba(180,124,92,0.10)] px-2.5 py-1 text-[12px] text-[#8A5A40]">
                    毛利最低
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-[13px] leading-5 text-[#6f747b]">
                {formatNumber(item.callCount)} 次结算调用{index === 0 ? " · 当前最吃点" : ""}
              </p>
            </div>
            <div>
              <FieldLabel>经营点 / 单次均值</FieldLabel>
              <p className="mt-1 text-[14px] leading-6 text-[#202124]">
                {formatNumber(item.totalPoints)} 点
              </p>
              <p className="text-[12px] leading-5 text-[#6f747b]">
                单次 {formatNumber(item.averagePointsPerCall)} 点
              </p>
            </div>
            <div>
              <FieldLabel>成本 / Tokens</FieldLabel>
              <p className="mt-1 text-[14px] leading-6 text-[#202124]">{formatMoney(item.totalCostCents, "CNY")}</p>
              <p className="text-[12px] leading-5 text-[#6f747b]">{formatNumber(item.tokenTotal)} Tokens</p>
            </div>
            <div>
              <FieldLabel>毛利</FieldLabel>
              <p className={`mt-1 text-[14px] leading-6 ${item.grossProfitCents >= 0 ? "text-[#465240]" : "text-[#8A5A40]"}`}>
                {formatMoney(item.grossProfitCents, "CNY")}
              </p>
              <p className="text-[12px] leading-5 text-[#6f747b]">
                毛利率 {typeof item.grossMarginPercent === "number" ? `${item.grossMarginPercent}%` : "--"}
              </p>
            </div>
            <div>
              <FieldLabel>典型协同</FieldLabel>
              <p className="mt-1 text-[13px] leading-6 text-[#202124]">
                {item.topAgents.length > 0 ? item.topAgents.join(" / ") : "单能力调用"}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function TokenUsageSummaryTable({
  rows,
  options,
  formatDate,
  formatNumber,
  formatMoneyValue,
}: {
  rows: ThirdPartyUsageRow[];
  options: { emptyTitle: string; emptyDescription: string; secondaryLabel: string };
} & Pick<FormatterProps, "formatDate" | "formatNumber" | "formatMoneyValue">) {
  if (rows.length === 0) {
    return <EmptyState title={options.emptyTitle} description={options.emptyDescription} />;
  }

  return (
    <div className="space-y-3">
      {rows.map((item) => (
        <div
          key={item.key}
          className="grid gap-3 rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] px-4 py-4 xl:grid-cols-[0.95fr_0.9fr_0.8fr_0.8fr_1fr]"
        >
          <div>
            <p className="text-[15px] font-semibold text-[#202124]">{item.label}</p>
            <p className="mt-1 text-[13px] leading-5 text-[#6f747b]">
              {options.secondaryLabel}：{item.secondaryLabel}
            </p>
            <p className="mt-1 text-[12px] leading-5 text-[#6f747b]">
              {formatNumber(item.recordCount)} 条记录 · 可计费 {formatNumber(item.billableCount)} 条
            </p>
          </div>
          <div>
            <FieldLabel>总 Tokens / 占比</FieldLabel>
            <p className="mt-1 text-[14px] leading-6 text-[#202124]">{formatNumber(item.tokenTotal)}</p>
            <p className="text-[12px] leading-5 text-[#6f747b]">
              {typeof item.sharePercent === "number" ? `${item.sharePercent}%` : "--"}
            </p>
          </div>
          <div>
            <FieldLabel>输入 / 输出</FieldLabel>
            <p className="mt-1 text-[14px] leading-6 text-[#202124]">
              {formatNumber(item.tokenInput)} / {formatNumber(item.tokenOutput)}
            </p>
            <p className="text-[12px] leading-5 text-[#6f747b]">
              缓存 {formatNumber(item.tokenCached)} · 推理 {formatNumber(item.tokenReasoning)}
            </p>
          </div>
          <div>
            <FieldLabel>第三方成本</FieldLabel>
            <p className="mt-1 text-[14px] leading-6 text-[#202124]">
              {formatMoneyValue(item.costValue, item.currency, item.currency === "CNY" ? 2 : 6)}
            </p>
            <p className="text-[12px] leading-5 text-[#6f747b]">最近记录 {formatDate(item.latestOccurredAt)}</p>
          </div>
          <div>
            <FieldLabel>Usage Type</FieldLabel>
            <p className="mt-1 text-[13px] leading-6 text-[#202124]">
              {item.topUsageTypes.length > 0 ? item.topUsageTypes.join(" / ") : "暂无类型标记"}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function UsageTrendChart({
  points,
  formatNumber,
  formatMoneyValue,
}: {
  points: ThirdPartyUsageTrendPoint[];
} & Pick<FormatterProps, "formatNumber" | "formatMoneyValue">) {
  if (points.length === 0) {
    return <EmptyState title="还没有第三方耗用趋势" description="最近 7 天没有可用于绘制趋势的 UsageRecord。" />;
  }

  const maxTokens = Math.max(...points.map((item) => item.tokenTotal), 1);

  return (
    <div className="grid gap-3 xl:grid-cols-7">
      {points.map((item) => (
        <div key={item.day} className="rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] px-3 py-4">
          <p className="text-[12px] font-medium text-[#6f747b]">{item.label}</p>
          <div className="mt-3 h-24 rounded-[12px] bg-white/80 px-3 py-2">
            <div className="flex h-full items-end">
              <div
                className="w-full rounded-[10px] bg-[rgba(102,115,94,0.26)]"
                style={{ height: `${Math.max((item.tokenTotal / maxTokens) * 100, item.tokenTotal > 0 ? 14 : 0)}%` }}
              />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <p className="text-[14px] font-semibold text-[#202124]">{formatNumber(item.tokenTotal)} Tokens</p>
            <p className="text-[12px] leading-5 text-[#6f747b]">{formatNumber(item.recordCount)} 条记录</p>
            <p className="text-[12px] leading-5 text-[#6f747b]">
              {formatMoneyValue(item.costValue, item.currency, item.currency === "CNY" ? 2 : 6)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function UsageAnomalyList({
  rows,
  options,
  formatDate,
  formatNumber,
  formatMoneyValue,
}: {
  rows: ThirdPartyUsageAnomalyRow[] | undefined;
  options?: {
    selectedId?: string | null;
    onSelect?: (id: string) => void;
  };
} & Pick<FormatterProps, "formatDate" | "formatNumber" | "formatMoneyValue">) {
  if (!rows || rows.length === 0) {
    return (
      <EmptyState
        title="最近 30 天没有命中的耗用异常"
        description="当前 UsageRecord 没有命中缺 Provider、缺模型、未知 usageType 或高 Tokens 未计费等规则。"
      />
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => options?.onSelect?.(item.id)}
          className={`grid w-full gap-3 rounded-[16px] border px-4 py-4 text-left transition xl:grid-cols-[1fr_0.9fr_0.8fr_0.9fr] ${
            options?.selectedId === item.id
              ? "border-[rgba(24,24,23,0.14)] bg-white shadow-[0_10px_24px_rgba(24,24,23,0.05)]"
              : "border-[rgba(24,24,23,0.06)] bg-[#FCFBF8]"
          }`}
        >
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[12px] ${alertToneClasses(item.severity)}`}>
                {item.severity === "critical" ? "关键异常" : "关注异常"}
              </span>
              {item.anomalyFlags.map((flag) => (
                <span
                  key={`${item.key}-${flag}`}
                  className="rounded-full bg-[rgba(24,24,23,0.06)] px-2.5 py-1 text-[12px] text-[#6f747b]"
                >
                  {flag}
                </span>
              ))}
            </div>
            <p className="mt-3 text-[15px] font-semibold text-[#202124]">{item.summary}</p>
            <p className="mt-1 text-[13px] leading-5 text-[#6f747b]">
              {item.usageType} · {item.provider} · {item.model}
            </p>
            <p className="mt-1 text-[12px] leading-5 text-[#6f747b]">
              发生时间 {formatDate(item.occurredAt)} · 计费状态 {item.billable ? "billable" : "non-billable"}
            </p>
            <p className="mt-2">
              <span
                className={`rounded-full px-2.5 py-1 text-[12px] ${
                  item.reconciliationStatus === "reconciled"
                    ? "bg-[rgba(102,115,94,0.12)] text-[#465240]"
                    : item.reconciliationStatus === "suspected"
                      ? "bg-[rgba(186,160,92,0.12)] text-[#7A6941]"
                      : "bg-[rgba(180,124,92,0.12)] text-[#8A5A40]"
                }`}
              >
                {item.reconciliationLabel}
              </span>
            </p>
            {options?.selectedId === item.id ? (
              <p className="mt-2 text-[12px] font-medium text-[#465240]">当前查看详情</p>
            ) : null}
          </div>
          <div>
            <FieldLabel>Tokens / 成本</FieldLabel>
            <p className="mt-1 text-[14px] leading-6 text-[#202124]">{formatNumber(item.tokenTotal)} Tokens</p>
            <p className="text-[12px] leading-5 text-[#6f747b]">
              {formatMoneyValue(item.costValue, item.currency, item.currency === "CNY" ? 2 : 6)}
            </p>
          </div>
          <div>
            <FieldLabel>记录键</FieldLabel>
            <p className="mt-1 break-all text-[13px] leading-6 text-[#202124]">{item.id}</p>
          </div>
          <div>
            <FieldLabel>回传 / 排查</FieldLabel>
            <p className="mt-1 text-[13px] leading-6 text-[#202124]">
              {item.reconciliationStatus === "missing"
                ? "还没匹配到经营结算记录，优先检查回传链。"
                : item.reconciliationStatus === "suspected"
                  ? "已匹配到疑似结算记录，建议人工复核。"
                  : "已回传到经营结算层，可继续核对毛利。"}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}

export function UsageAnomalyDetail({
  item,
  formatDate,
  formatNumber,
  formatMoney,
  formatMoneyValue,
  jumpWithinBusiness,
}: {
  item: ThirdPartyUsageAnomalyRow | null;
  jumpWithinBusiness: (anchorId: string) => void;
} & Pick<FormatterProps, "formatDate" | "formatNumber" | "formatMoney" | "formatMoneyValue">) {
  if (!item) {
    return <EmptyState title="还没有选中的异常记录" description="从左侧异常列表中选一条记录，再查看完整 UsageRecord 结构。" />;
  }

  return (
    <WorkbenchDetailPanel
      eyebrow="UsageRecord 详情"
      title={item.id}
      badge={
        <div className="flex flex-wrap justify-end gap-2">
          <span className={`rounded-full px-2.5 py-1 text-[12px] ${alertToneClasses(item.severity)}`}>
            {item.severity === "critical" ? "关键异常" : "关注异常"}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-[12px] ${
              item.reconciliationStatus === "reconciled"
                ? "bg-[rgba(102,115,94,0.12)] text-[#465240]"
                : item.reconciliationStatus === "suspected"
                  ? "bg-[rgba(186,160,92,0.12)] text-[#7A6941]"
                  : "bg-[rgba(180,124,92,0.12)] text-[#8A5A40]"
            }`}
          >
            {item.reconciliationLabel}
          </span>
        </div>
      }
      footer={
        <div className="space-y-3">
          <div className="rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] px-4 py-4 text-[13px] leading-6 text-[#6f747b]">
            对账判断：{item.reconciliationReason}
          </div>
          {item.consumptionId ? (
            <button
              type="button"
              onClick={() => jumpWithinBusiness(consumptionAnchorId(item.consumptionId!))}
              className="rounded-full border border-[rgba(24,24,23,0.08)] bg-white px-3 py-2 text-[12px] text-[#202124] transition hover:bg-[#F5F3EE]"
            >
              跳到经营结算记录 · {item.consumptionId}
            </button>
          ) : null}
        </div>
      }
    >
      <div className="grid gap-3 xl:grid-cols-2">
        <DetailField label="异常摘要" value={item.summary} />
        <DetailField label="发生时间" value={formatDate(item.occurredAt)} />
        <DetailField label="回传状态" value={item.reconciliationLabel} />
        <DetailField label="对账说明" value={item.reconciliationReason} />
        <DetailField label="UsageType" value={item.usageType} />
        <DetailField label="计费状态" value={item.billable ? "billable" : "non-billable"} />
        <DetailField label="Provider" value={item.provider} />
        <DetailField label="Model" value={item.model} />
        <DetailField label="总 Tokens" value={formatNumber(item.tokenTotal)} />
        <DetailField
          label="第三方成本"
          value={formatMoneyValue(item.costValue, item.currency, item.currency === "CNY" ? 2 : 6)}
        />
        <DetailField label="输入 / 输出" value={`${formatNumber(item.tokenInput)} / ${formatNumber(item.tokenOutput)}`} />
        <DetailField
          label="缓存 / 推理"
          value={`${formatNumber(item.tokenCached)} / ${formatNumber(item.tokenReasoning)}`}
        />
        <DetailField label="结算记录" value={item.consumptionId ?? "未找到"} />
        <DetailField label="结算能力" value={item.consumptionCapability ?? "未回传"} />
        <DetailField
          label="结算收入"
          value={
            item.consumptionRevenueCents != null
              ? formatMoney(item.consumptionRevenueCents, "CNY")
              : "未回传"
          }
        />
        <DetailField
          label="结算成本 / 毛利"
          value={
            item.consumptionCostCents != null && item.consumptionGrossProfitCents != null
              ? `${formatMoney(item.consumptionCostCents, "CNY")} / ${formatMoney(item.consumptionGrossProfitCents, "CNY")}`
              : "未回传"
          }
        />
        <DetailField label="结算时间" value={item.consumptionCreatedAt ? formatDate(item.consumptionCreatedAt) : "未回传"} />
        <DetailField label="结算状态" value={item.consumptionStatus ?? "未回传"} />
        <DetailField label="异常标签" value={item.anomalyFlags.join(" / ")} />
        <DetailField label="记录键" value={<span className="break-all">{item.id}</span>} />
      </div>
    </WorkbenchDetailPanel>
  );
}
