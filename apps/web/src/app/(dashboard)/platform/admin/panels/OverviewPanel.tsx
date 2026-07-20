"use client";

import type { Dispatch, SetStateAction } from "react";

import { EngineHealthPanel } from "@/components/platform/EngineHealthPanel";
import { ProductAcceptancePanel } from "@/components/platform/ProductAcceptancePanel";
import { StalePaymentsPanel } from "@/components/platform/StalePaymentsPanel";
import type {
  PlatformAdminAlert,
  PlatformAdminMetric,
  PlatformAdminOverview,
} from "@/server/services/platform-admin.service";
import type { AdminInboxItem } from "@/server/services/platform-admin-inbox.service";

import { MetricGrid, ObjectsTable, PanelShell, SectionIntro } from "../admin-console-ui";
import { AdminInbox } from "./AdminInbox";
import { AlertList, ConsoleSubsection } from "./shared";

export function OverviewPanel({
  overview,
  derivedOverviewCards,
  derivedOverviewQueues,
  formatMetricValue,
  showEngineeringTools,
  setShowEngineeringTools,
  formatDate,
  derivedAlerts,
  handleOperationalAlertClick,
  businessOperationalAlerts,
  formatNumber,
  onOpenInboxItem,
}: {
  overview: PlatformAdminOverview;
  derivedOverviewCards: PlatformAdminMetric[];
  derivedOverviewQueues: PlatformAdminMetric[];
  formatMetricValue: (metric: PlatformAdminMetric) => string;
  showEngineeringTools: boolean;
  setShowEngineeringTools: Dispatch<SetStateAction<boolean>>;
  formatDate: (value: string | null | undefined) => string;
  derivedAlerts: PlatformAdminAlert[];
  handleOperationalAlertClick: (alert: PlatformAdminAlert) => void;
  businessOperationalAlerts: PlatformAdminAlert[];
  formatNumber: (value: number | null | undefined) => string;
  onOpenInboxItem: (item: AdminInboxItem) => void;
}) {
  return (
    <PanelShell>
      <SectionIntro
        eyebrow="总览"
        title="先看异常，再决定去哪一域处理"
        description="平台首页应该先回答：今天哪里有问题、问题有多大、应该先处理哪条队列。这里不再堆对象卡片，而是先聚焦告警和待办。"
        aside={
          <div className="rounded-[16px] border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] px-4 py-3 text-[13px] text-[#5f6368]">
            最近刷新：{formatDate(overview.generatedAt)}
          </div>
        }
      />
      <MetricGrid metrics={derivedOverviewCards} formatMetricValue={formatMetricValue} />
      <MetricGrid metrics={derivedOverviewQueues} formatMetricValue={formatMetricValue} />
      <div className="rounded-[16px] border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] px-4 py-3">
        <button
          type="button"
          onClick={() => setShowEngineeringTools((open) => !open)}
          className="flex w-full items-center justify-between text-left"
        >
          <div>
            <p className="text-[12px] font-medium tracking-[0.04em] text-[#8a8f98]">工程工具区</p>
            <p className="mt-1 text-[14px] font-semibold text-[#202124]">引擎健康 · 支付巡检 · 交付验收</p>
            <p className="mt-1 text-[13px] text-[#6f747b]">日常运营默认折叠，避免交付噪音占驾驶舱主视野。</p>
          </div>
          <span className="text-[13px] text-[#5f6368]">{showEngineeringTools ? "收起" : "展开"}</span>
        </button>
        {showEngineeringTools ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 xl:grid-cols-2">
              <ConsoleSubsection
                eyebrow="系统健康"
                title="引擎健康检查"
                description="统一查看引擎状态、失败信号和当前健康面。"
              >
                <EngineHealthPanel />
              </ConsoleSubsection>
              <ConsoleSubsection
                eyebrow="支付巡检"
                title="陈旧支付与挂起项"
                description="把需要追踪的支付陈旧项集中在一个巡检位。"
              >
                <StalePaymentsPanel />
              </ConsoleSubsection>
            </div>
            <ConsoleSubsection
              eyebrow="交付验收"
              title="产品验收与交付信号"
              description="仅 staging / 交付排查时使用；不计入日常经营待办。"
            >
              <ProductAcceptancePanel />
            </ConsoleSubsection>
          </div>
        ) : null}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <ObjectsTable
          eyebrow="风险总览"
          title="平台告警"
          description="需要优先处理的系统级问题会在这里集中显示。"
          aside={
            <span className="rounded-full bg-[rgba(24,24,23,0.06)] px-2.5 py-1 text-[12px] text-[#6f747b]">
              {formatNumber(derivedAlerts.length)} 项异常
            </span>
          }
        >
          <AlertList
            alerts={derivedAlerts}
            onAlertClick={handleOperationalAlertClick}
            interactiveAlertIds={businessOperationalAlerts.map((alert) => alert.id)}
            formatNumber={formatNumber}
          />
        </ObjectsTable>
        <div className="hidden xl:block">
          <ObjectsTable
            eyebrow="统一待办"
            title="Inbox"
            description="学习、发票、认知、用量异常同源分页；角标与列表一致，避免「有数看不见」。"
            aside={
              <span className="rounded-full bg-[rgba(24,24,23,0.06)] px-2.5 py-1 text-[12px] text-[#6f747b]">
                {formatNumber(overview.summary.learningPending + overview.summary.draftInvoices)}+ 待办源
              </span>
            }
          >
            <AdminInbox onOpenItem={onOpenInboxItem} />
          </ObjectsTable>
        </div>
      </div>
    </PanelShell>
  );
}
