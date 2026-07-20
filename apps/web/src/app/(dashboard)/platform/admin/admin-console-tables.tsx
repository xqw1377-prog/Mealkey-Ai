"use client";

import type { ReactNode } from "react";

import type {
  BillingAccountRow,
  LearningQueueRow,
  OrganizationRow,
  PlanRow,
} from "@/server/services/platform-admin.service";

function DemoBadge() {
  return (
    <span className="rounded-full bg-[rgba(102,115,94,0.08)] px-2 py-0.5 text-[11px] text-[#465240]">
      演示
    </span>
  );
}

type LearningQueueTableProps = {
  rows: LearningQueueRow[];
  selectedId?: string;
  onSelect: (id: string) => void;
  formatScore: (score: number | null | undefined) => string;
  priorityTone: (priority: "high" | "medium" | "low") => string;
  statusChipTone: (status: string) => string;
};

export function LearningQueueTable({
  rows,
  selectedId,
  onSelect,
  formatScore,
  priorityTone,
  statusChipTone,
}: LearningQueueTableProps) {
  return (
    <>
      <div className="hidden xl:block overflow-x-auto rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-white">
        <table className="min-w-full border-collapse text-left text-[13px] text-[#202124]">
          <thead className="bg-[#F7F5EF] text-[11px] uppercase tracking-[0.08em] text-[#6f747b]">
            <tr>
              <th className="px-4 py-3 font-medium">任务</th>
              <th className="px-4 py-3 font-medium">来源</th>
              <th className="px-4 py-3 font-medium">质量</th>
              <th className="px-4 py-3 font-medium">已等待</th>
              <th className="px-4 py-3 font-medium">优先级</th>
              <th className="px-4 py-3 font-medium">状态</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const active = selectedId === item.id;
              return (
                <tr
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className={`cursor-pointer border-t border-[rgba(24,24,23,0.06)] transition ${
                    active ? "bg-[rgba(102,115,94,0.08)]" : "bg-white hover:bg-[#FCFBF8]"
                  }`}
                >
                  <td className="px-4 py-3 align-top">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[#202124]">{item.title}</p>
                        {active ? (
                          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] text-[#465240]">
                            已定位
                          </span>
                        ) : null}
                      </div>
                      <p className="line-clamp-2 text-[12px] leading-5 text-[#6f747b]">
                        {item.problem ?? "未绑定判断"}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-[#5f6368]">
                    <div>{item.sourceType}</div>
                    <div className="mt-1 text-[12px]">{item.sourceId ?? "--"}</div>
                  </td>
                  <td className="px-4 py-3 align-top text-[#5f6368]">
                    <div>评分 {formatScore(item.score)}</div>
                    <div className="mt-1 text-[12px]">结论 {item.verdict ?? "--"}</div>
                  </td>
                  <td className="px-4 py-3 align-top text-[#5f6368]">{item.agingDays} 天</td>
                  <td className="px-4 py-3 align-top">
                    <span className={`rounded-full px-2.5 py-1 text-[12px] ${priorityTone(item.priority)}`}>
                      {item.priority === "high" ? "高优先" : item.priority === "medium" ? "中优先" : "低优先"}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <span className={`rounded-full px-2.5 py-1 text-[12px] ${statusChipTone(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 xl:hidden">
        {rows.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`w-full rounded-[16px] border px-4 py-4 text-left transition ${
              selectedId === item.id
                ? "border-[rgba(24,24,23,0.18)] bg-white shadow-[0_12px_28px_rgba(24,24,23,0.04)]"
                : "border-[rgba(24,24,23,0.06)] bg-[#FCFBF8]"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-[#202124]">{item.title}</p>
                <p className="mt-1 text-[13px] leading-5 text-[#6f747b]">
                  {item.problem ?? "未绑定判断"} · {item.sourceType}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] ${priorityTone(item.priority)}`}>
                {item.priority === "high" ? "高优先" : item.priority === "medium" ? "中优先" : "低优先"}
              </span>
            </div>
            <p className="mt-3 text-[12px] leading-5 text-[#6f747b]">
              评分 {formatScore(item.score)} · 结论 {item.verdict ?? "--"} · 已等待 {item.agingDays} 天
            </p>
          </button>
        ))}
      </div>
    </>
  );
}

type OrganizationSelectionTableProps = {
  rows: OrganizationRow[];
  selectedId?: string;
  onSelect: (id: string) => void;
  formatDate: (value: string | null | undefined) => string;
  statusChipTone: (status: string) => string;
  formatNumber: (value: number | null | undefined) => string;
};

export function OrganizationSelectionTable({
  rows,
  selectedId,
  onSelect,
  formatDate,
  statusChipTone,
  formatNumber,
}: OrganizationSelectionTableProps) {
  return (
    <>
      <div className="hidden xl:block overflow-x-auto rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-white">
        <table className="min-w-full border-collapse text-left text-[13px] text-[#202124]">
          <thead className="bg-[#F7F5EF] text-[11px] uppercase tracking-[0.08em] text-[#6f747b]">
            <tr>
              <th className="px-4 py-3 font-medium">组织</th>
              <th className="px-4 py-3 font-medium">类型</th>
              <th className="px-4 py-3 font-medium">成员</th>
              <th className="px-4 py-3 font-medium">项目</th>
              <th className="px-4 py-3 font-medium">账务</th>
              <th className="px-4 py-3 font-medium">状态</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const active = selectedId === item.id;
              return (
                <tr
                  key={item.id}
                  onClick={() => onSelect(item.id)}
                  className={`cursor-pointer border-t border-[rgba(24,24,23,0.06)] transition ${
                    active ? "bg-[rgba(102,115,94,0.08)]" : "bg-white hover:bg-[#FCFBF8]"
                  }`}
                >
                  <td className="px-4 py-3 align-top">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[#202124]">{item.name}</p>
                        {item.isSeeded ? <DemoBadge /> : null}
                        {active ? (
                          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] text-[#465240]">
                            已定位
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[12px] text-[#6f747b]">
                        {item.slug} · 创建于 {formatDate(item.createdAt)}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-[#5f6368]">{item.type}</td>
                  <td className="px-4 py-3 align-top text-[#5f6368]">{formatNumber(item.memberCount)}</td>
                  <td className="px-4 py-3 align-top text-[#5f6368]">{formatNumber(item.projectCount)}</td>
                  <td className="px-4 py-3 align-top text-[#5f6368]">{formatNumber(item.billingAccountCount)}</td>
                  <td className="px-4 py-3 align-top">
                    <span className={`rounded-full px-2.5 py-1 text-[12px] ${statusChipTone(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 xl:hidden">
        {rows.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            className={`w-full rounded-[16px] border px-4 py-4 text-left transition ${
              selectedId === item.id
                ? "border-[rgba(102,115,94,0.24)] bg-[rgba(102,115,94,0.08)]"
                : "border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] hover:border-[rgba(24,24,23,0.12)]"
            }`}
          >
            <div className="flex flex-col gap-2 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[15px] font-semibold text-[#202124]">{item.name}</p>
                  {item.isSeeded ? <DemoBadge /> : null}
                  {selectedId === item.id ? (
                    <span className="rounded-full bg-white/70 px-2.5 py-1 text-[12px] text-[#465240]">
                      已定位
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-[13px] leading-5 text-[#6f747b]">
                  {item.slug} · {item.type} · 创建于 {formatDate(item.createdAt)}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-[12px] ${statusChipTone(item.status)}`}>
                {item.status}
              </span>
            </div>
            <div className="mt-3 grid gap-2 xl:grid-cols-3">
              <InfoCell label="成员" value={formatNumber(item.memberCount)} />
              <InfoCell label="项目" value={formatNumber(item.projectCount)} />
              <InfoCell label="账务账户" value={formatNumber(item.billingAccountCount)} />
            </div>
          </button>
        ))}
      </div>
    </>
  );
}

type BillingAccountSelectionTableProps = {
  rows: BillingAccountRow[];
  selectedId?: string;
  onSelect: (id: string) => void;
  statusChipTone: (status: string) => string;
};

export function BillingAccountSelectionTable({
  rows,
  selectedId,
  onSelect,
  statusChipTone,
}: BillingAccountSelectionTableProps) {
  return (
    <>
      <div className="hidden xl:block overflow-x-auto rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-white">
        <table className="min-w-full border-collapse text-left text-[13px] text-[#202124]">
          <thead className="bg-[#F7F5EF] text-[11px] uppercase tracking-[0.08em] text-[#6f747b]">
            <tr>
              <th className="px-4 py-3 font-medium">账户</th>
              <th className="px-4 py-3 font-medium">组织</th>
              <th className="px-4 py-3 font-medium">归因</th>
              <th className="px-4 py-3 font-medium">币种</th>
              <th className="px-4 py-3 font-medium">状态</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((account) => {
              const active = selectedId === account.id;
              return (
                <tr
                  key={account.id}
                  onClick={() => onSelect(account.id)}
                  className={`cursor-pointer border-t border-[rgba(24,24,23,0.06)] transition ${
                    active ? "bg-[rgba(102,115,94,0.08)]" : "bg-white hover:bg-[#FCFBF8]"
                  }`}
                >
                  <td className="px-4 py-3 align-top">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[#202124]">{account.name}</p>
                        {account.isSeeded ? <DemoBadge /> : null}
                        {active ? (
                          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] text-[#465240]">
                            已定位
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[12px] text-[#6f747b]">{account.ownerId ?? "--"}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-[#5f6368]">
                    {account.organizationName ?? "未绑定组织"}
                  </td>
                  <td className="px-4 py-3 align-top text-[#5f6368]">
                    {account.hasOrganization ? "已绑定组织" : "待清理"}
                  </td>
                  <td className="px-4 py-3 align-top text-[#5f6368]">{account.currency}</td>
                  <td className="px-4 py-3 align-top">
                    <span className={`rounded-full px-2.5 py-1 text-[12px] ${statusChipTone(account.status)}`}>
                      {account.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 xl:hidden">
        {rows.map((account) => (
          <button
            key={account.id}
            type="button"
            onClick={() => onSelect(account.id)}
            className={`flex w-full items-center justify-between gap-3 rounded-[14px] border px-4 py-4 text-left transition ${
              selectedId === account.id
                ? "border-[rgba(102,115,94,0.24)] bg-[rgba(102,115,94,0.08)]"
                : "border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] hover:border-[rgba(24,24,23,0.12)]"
            }`}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[14px] font-semibold text-[#202124]">{account.name}</p>
                {account.isSeeded ? <DemoBadge /> : null}
                {selectedId === account.id ? (
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-[12px] text-[#465240]">
                    已定位
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-[12px] leading-5 text-[#6f747b]">
                {account.organizationName ?? "未绑定组织"} · {account.status}
              </p>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[12px] ${statusChipTone(account.status)}`}>
              {account.status}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

type PlanSelectionTableProps = {
  rows: PlanRow[];
  selectedId?: string;
  onSelect: (id: string) => void;
  formatBillingCycle: (plan: PlanRow) => string;
  formatMoney: (cents: number | null | undefined, currency?: string) => string;
};

export function PlanSelectionTable({
  rows,
  selectedId,
  onSelect,
  formatBillingCycle,
  formatMoney,
}: PlanSelectionTableProps) {
  return (
    <>
      <div className="hidden xl:block overflow-x-auto rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-white">
        <table className="min-w-full border-collapse text-left text-[13px] text-[#202124]">
          <thead className="bg-[#F7F5EF] text-[11px] uppercase tracking-[0.08em] text-[#6f747b]">
            <tr>
              <th className="px-4 py-3 font-medium">商品</th>
              <th className="px-4 py-3 font-medium">类别</th>
              <th className="px-4 py-3 font-medium">计费</th>
              <th className="px-4 py-3 font-medium">权益</th>
              <th className="px-4 py-3 font-medium">价格</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((plan) => {
              const active = selectedId === plan.id;
              return (
                <tr
                  key={plan.id}
                  onClick={() => onSelect(plan.id)}
                  className={`cursor-pointer border-t border-[rgba(24,24,23,0.06)] transition ${
                    active ? "bg-[rgba(102,115,94,0.08)]" : "bg-white hover:bg-[#FCFBF8]"
                  }`}
                >
                  <td className="px-4 py-3 align-top">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-[#202124]">{plan.name}</p>
                        {plan.isSeeded ? <DemoBadge /> : null}
                        {active ? (
                          <span className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] text-[#465240]">
                            已定位
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[12px] text-[#6f747b]">{plan.code}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 align-top text-[#5f6368]">{plan.categoryLabel}</td>
                  <td className="px-4 py-3 align-top text-[#5f6368]">{formatBillingCycle(plan)}</td>
                  <td className="px-4 py-3 align-top text-[#5f6368]">
                    {plan.pointsAmount ? `${plan.pointsAmount} 经营点` : plan.usageSummary || "标准权益"}
                  </td>
                  <td className="px-4 py-3 align-top text-[#202124]">
                    {formatMoney(plan.priceCents, plan.currency)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 xl:hidden">
        {rows.map((plan) => (
          <button
            key={plan.id}
            type="button"
            onClick={() => onSelect(plan.id)}
            className={`flex w-full items-center justify-between gap-3 rounded-[14px] border px-4 py-4 text-left transition ${
              selectedId === plan.id
                ? "border-[rgba(102,115,94,0.24)] bg-[rgba(102,115,94,0.08)]"
                : "border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] hover:border-[rgba(24,24,23,0.12)]"
            }`}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[14px] font-semibold text-[#202124]">{plan.name}</p>
                {plan.isSeeded ? <DemoBadge /> : null}
                {selectedId === plan.id ? (
                  <span className="rounded-full bg-white/70 px-2 py-0.5 text-[12px] text-[#465240]">
                    已定位
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-[12px] leading-5 text-[#6f747b]">
                {plan.categoryLabel} · {formatBillingCycle(plan)}
              </p>
            </div>
            <span className="text-[13px] font-medium text-[#202124]">
              {formatMoney(plan.priceCents, plan.currency)}
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

function InfoCell({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-[12px] border border-[rgba(24,24,23,0.06)] bg-white px-3 py-3">
      <p className="text-[11px] uppercase tracking-[0.08em] text-[#6f747b]">{label}</p>
      <div className="mt-1 text-[13px] font-medium text-[#202124]">{value}</div>
    </div>
  );
}
