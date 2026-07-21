"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  RefreshCcw,
  type LucideIcon,
} from "lucide-react";

import type { AdminInboxItem } from "@/server/services/platform-admin-inbox.service";
import type { PlatformAdminAlert, PlatformAdminMetric } from "@/server/services/platform-admin.service";
import { ConfirmDialog } from "@/components/operating/ConfirmDialog";
import { PageErrorBoundary } from "@/components/operating/PageErrorBoundary";
import {
  type AdminNavSectionId,
  type AdminPanel,
  type AdminWorkspaceId,
  NAV_SECTIONS,
  PANELS,
  getPanelMeta,
} from "./admin-console-config";
import { CompactMetricStrip, MetricGrid } from "./admin-console-ui";
import { AlertList } from "./panels/shared";
import { AdminInbox } from "./panels/AdminInbox";

type WorkspaceContextItem = {
  label: string;
  value: string;
};

type SidebarQuickQueueItem = {
  id: string;
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  onClick: () => void;
};

type PanelMeta = {
  id: AdminPanel;
  label: string;
  description: string;
  icon: LucideIcon;
};

type NavSectionMeta = {
  id: AdminNavSectionId;
  title: string;
  description: string;
  panels: AdminPanel[];
};

type WorkspaceMeta = {
  id: AdminWorkspaceId;
  navSectionId: AdminNavSectionId;
  panel: AdminPanel;
  label: string;
  description: string;
  sectionId?: string;
};

export function PlatformAdminConsoleShell({
  domainLoading,
  confirmOpen,
  confirmTitle,
  confirmDescription,
  isPending,
  onCancelConfirm,
  onConfirmConfirm,
  activePanel,
  activePanelMeta,
  activeNavSection,
  activeWorkspace,
  activeSectionWorkspaces,
  activeWorkspaceId,
  activeWorkspaceContextItems,
  derivedHeaderCards,
  derivedAlerts,
  interactiveAlertIds,
  navBadgeByPanel,
  navBadgeByWorkspace,
  sectionSummaryById,
  collapsedNavSections,
  sidebarQuickQueues,
  feedback,
  feedbackTone,
  feedbackClassName,
  generatedAt,
  formatMetricValue,
  formatNumber,
  formatDate,
  onRefreshOverview,
  onAlertClick,
  onOpenInboxItem,
  onNavigateToPanel,
  onToggleNavSection,
  onOpenWorkspace,
  panelBoundaryKey,
  onResetPanelBoundary,
  children,
}: {
  domainLoading: boolean;
  confirmOpen: boolean;
  confirmTitle: string;
  confirmDescription: string;
  isPending: boolean;
  onCancelConfirm: () => void;
  onConfirmConfirm: () => void;
  activePanel: AdminPanel;
  activePanelMeta: PanelMeta;
  activeNavSection: NavSectionMeta;
  activeWorkspace: WorkspaceMeta;
  activeSectionWorkspaces: WorkspaceMeta[];
  activeWorkspaceId: AdminWorkspaceId;
  activeWorkspaceContextItems: WorkspaceContextItem[];
  derivedHeaderCards: PlatformAdminMetric[];
  derivedAlerts: PlatformAdminAlert[];
  interactiveAlertIds: string[];
  navBadgeByPanel: Record<AdminPanel, string | null>;
  navBadgeByWorkspace: Record<AdminWorkspaceId, string | null>;
  sectionSummaryById: Record<AdminNavSectionId, string | null>;
  collapsedNavSections: Record<AdminNavSectionId, boolean>;
  sidebarQuickQueues: SidebarQuickQueueItem[];
  feedback: string | null;
  feedbackTone: "idle" | "loading" | "success" | "error";
  feedbackClassName: string;
  generatedAt: string;
  formatMetricValue: (metric: PlatformAdminMetric) => string;
  formatNumber: (value: number | null | undefined) => string;
  formatDate: (value: string | null | undefined) => string;
  onRefreshOverview: () => void;
  onAlertClick: (alert: PlatformAdminAlert) => void;
  onOpenInboxItem: (item: AdminInboxItem) => void;
  onNavigateToPanel: (panel: AdminPanel) => void;
  onToggleNavSection: (sectionId: AdminNavSectionId) => void;
  onOpenWorkspace: (workspace: WorkspaceMeta) => void;
  panelBoundaryKey: number;
  onResetPanelBoundary: () => void;
  children: ReactNode;
}) {
  return (
    <div className="space-y-5 pb-2">
      {domainLoading ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-white px-4 py-3 text-[13px] text-[#5f6368]"
        >
          正在按需加载当前域数据…
        </div>
      ) : null}
      <ConfirmDialog
        open={confirmOpen}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel="确认继续"
        danger
        busy={isPending}
        onCancel={onCancelConfirm}
        onConfirm={onConfirmConfirm}
      />
      {activePanel === "overview" ? (
        <section className="rounded-[24px] border border-[rgba(24,24,23,0.08)] bg-[linear-gradient(180deg,#fbfaf7_0%,#eef1ea_100%)] p-5 shadow-[0_14px_30px_rgba(24,24,23,0.04)]">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-[13px] leading-5 tracking-[0.01em] text-[#66735E]">平台管理</p>
              <h2 className="mt-1 text-[26px] font-semibold tracking-[-0.03em] text-[#202124]">平台经营驾驶舱</h2>
              <p className="mt-2 max-w-[96ch] text-[14px] leading-6 text-[#6f747b]">
                这个页面现在按六个域组织：总览、商业运营、上架与分润、学习复核、认知内核、对象管理。首页先看异常和待办，动作被收回工具层，不再抢主视野。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onRefreshOverview}
                disabled={isPending}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-white px-4 text-[14px] font-semibold text-[#202124] disabled:opacity-50"
              >
                <RefreshCcw className="h-4 w-4" />
                刷新概览
              </button>
              <Link
                href="/platform"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] bg-[#181817] px-4 text-[14px] font-semibold text-white no-underline"
              >
                回到平台观测
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="mt-5">
            <MetricGrid metrics={derivedHeaderCards} formatMetricValue={formatMetricValue} />
          </div>
        </section>
      ) : (
        <section className="rounded-[20px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_12px_28px_rgba(24,24,23,0.04)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#66735E]">
                <span>平台管理</span>
                <span>/</span>
                <span>{activeNavSection.title}</span>
                <span>/</span>
                <span>{activePanelMeta.label}</span>
              </div>
              <h2 className="mt-2 text-[22px] font-semibold tracking-[-0.03em] text-[#202124]">{activePanelMeta.label}</h2>
              <p className="mt-1 max-w-[96ch] text-[13px] leading-6 text-[#6f747b]">
                {activePanelMeta.description} 当前分类：{activeNavSection.title}，右侧工作区按子工作台查看数据、分析和操作。
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onRefreshOverview}
                disabled={isPending}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] px-3.5 text-[13px] font-semibold text-[#202124] disabled:opacity-50"
              >
                <RefreshCcw className="h-4 w-4" />
                刷新概览
              </button>
              <Link
                href="/platform"
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[12px] bg-[#181817] px-3.5 text-[13px] font-semibold text-white no-underline"
              >
                回到平台观测
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="mt-4">
            <CompactMetricStrip metrics={derivedHeaderCards} formatMetricValue={formatMetricValue} />
          </div>
        </section>
      )}

      {activePanel === "overview" && derivedAlerts.length > 0 ? (
        <AlertList
          alerts={derivedAlerts}
          onAlertClick={onAlertClick}
          interactiveAlertIds={interactiveAlertIds}
          formatNumber={formatNumber}
        />
      ) : null}

      <div className="space-y-3 xl:hidden">
        <div className="rounded-[20px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_12px_28px_rgba(24,24,23,0.04)]">
          <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#66735E]">移动待办</p>
          <p className="mt-1 text-[14px] font-semibold text-[#202124]">先清 Inbox，再进域处理</p>
          <p className="mt-1 text-[13px] text-[#6f747b]">小屏默认只看待办队列，完整导航请用桌面宽度。</p>
          <div className="mt-3">
            <AdminInbox compact onOpenItem={onOpenInboxItem} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {PANELS.map((panel) => (
            <button
              key={panel.id}
              type="button"
              onClick={() => onNavigateToPanel(panel.id)}
              className={`rounded-full px-3 py-1.5 text-[12px] ${
                activePanel === panel.id
                  ? "bg-[#181817] text-white"
                  : "border border-[rgba(24,24,23,0.08)] bg-white text-[#5f6368]"
              }`}
            >
              {panel.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)] 2xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="hidden space-y-3 xl:sticky xl:top-24 xl:block xl:self-start">
          <div className="rounded-[20px] border border-[rgba(24,24,23,0.08)] bg-white p-3 shadow-[0_12px_28px_rgba(24,24,23,0.04)]">
            <div className="border-b border-[rgba(24,24,23,0.06)] px-2 pb-3">
              <p className="text-[12px] font-medium uppercase tracking-[0.18em] text-[#66735E]">平台导航</p>
              <p className="mt-2 text-[13px] leading-5 text-[#6f747b]">桌面优先：左侧分类定位，右侧数据与对象处理。</p>
            </div>

            <nav className="space-y-3 px-2 py-3">
              {NAV_SECTIONS.map((section) => (
                <div key={section.title}>
                  <button
                    type="button"
                    onClick={() => onToggleNavSection(section.id)}
                    className={`flex w-full items-start justify-between gap-3 rounded-[14px] px-2 py-2 text-left transition ${
                      activeNavSection.id === section.id ? "bg-[rgba(102,115,94,0.08)]" : "hover:bg-[rgba(24,24,23,0.03)]"
                    }`}
                  >
                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#66735E]">{section.title}</p>
                      <p className="mt-1 text-[12px] leading-5 text-[#8A8F96]">{section.description}</p>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2">
                      {sectionSummaryById[section.id] ? (
                        <span className="rounded-full bg-[rgba(24,24,23,0.06)] px-2 py-0.5 text-[11px] text-[#6f747b]">
                          {sectionSummaryById[section.id]}
                        </span>
                      ) : null}
                      {collapsedNavSections[section.id] ? (
                        <ChevronRight className="h-4 w-4 text-[#8A8F96]" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-[#8A8F96]" />
                      )}
                    </div>
                  </button>
                  {collapsedNavSections[section.id] ? null : (
                    <div className="mt-2 space-y-1">
                      {section.panels.map((panelId) => {
                        const panel = getPanelMeta(panelId);
                        const Icon = panel.icon;
                        const active = activePanel === panel.id;
                        const badge = navBadgeByPanel[panel.id];
                        return (
                          <button
                            key={panel.id}
                            type="button"
                            onClick={() => onNavigateToPanel(panel.id)}
                            className={`w-full rounded-[14px] border px-3 py-3 text-left transition ${
                              active
                                ? "border-[rgba(102,115,94,0.20)] bg-[rgba(102,115,94,0.10)] text-[#202124]"
                                : "border-transparent bg-transparent text-[#5f6368] hover:border-[rgba(24,24,23,0.06)] hover:bg-[rgba(24,24,23,0.03)] hover:text-[#202124]"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <span
                                className={`mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-[10px] ${
                                  active ? "bg-white" : "bg-[rgba(24,24,23,0.05)]"
                                }`}
                              >
                                <Icon className="h-4 w-4 text-[#66735E]" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className="text-[14px] font-semibold">{panel.label}</p>
                                  {badge ? (
                                    <span className="rounded-full bg-[rgba(24,24,23,0.06)] px-2 py-0.5 text-[11px] text-[#6f747b]">
                                      {badge}
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-1 text-[12px] leading-5 text-[#6f747b]">{panel.description}</p>
                                {active && activeNavSection.id === section.id ? (
                                  <p className="mt-1 text-[11px] leading-5 text-[#66735E]">当前子工作台：{activeWorkspace.label}</p>
                                ) : null}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </div>

          <div className="rounded-[18px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_12px_28px_rgba(24,24,23,0.04)]">
            <p className="text-[13px] font-medium text-[#202124]">当前待办</p>
            <div className="mt-3 space-y-2">
              {sidebarQuickQueues.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onClick}
                    className="flex w-full items-start gap-3 rounded-[14px] border border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] px-3 py-3 text-left transition hover:border-[rgba(24,24,23,0.12)] hover:bg-white"
                  >
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white">
                      <Icon className="h-4 w-4 text-[#66735E]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold text-[#202124]">{item.label}</span>
                        <span className="rounded-full bg-[rgba(24,24,23,0.06)] px-2 py-0.5 text-[11px] text-[#6f747b]">
                          {item.value}
                        </span>
                      </span>
                      <span className="mt-1 block text-[12px] leading-5 text-[#6f747b]">{item.helper}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="min-w-0 space-y-4">
          <div
            role={feedbackTone === "error" ? "alert" : "status"}
            aria-live={feedbackTone === "error" ? "assertive" : "polite"}
            className={`flex flex-col gap-3 rounded-[18px] border px-4 py-3 transition lg:flex-row lg:items-center lg:justify-between ${feedbackClassName}`}
          >
            <div>
              <p className="text-[12px] font-medium leading-5 tracking-[0.01em]">系统反馈</p>
              <p className="text-[14px] leading-6">{feedback ?? "当前平台管理台已经切到驾驶舱形态，动作和分析被分层展示。"}</p>
            </div>
            <p className="text-[12px] leading-5 text-current/80">最近刷新 {formatDate(generatedAt)}</p>
          </div>
          <section className="rounded-[18px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_12px_28px_rgba(24,24,23,0.04)]">
            <div className="space-y-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#66735E]">
                    <span>平台管理</span>
                    <span>/</span>
                    <span>{activeNavSection.title}</span>
                    <span>/</span>
                    <span>{activePanelMeta.label}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <h3 className="text-[18px] font-semibold tracking-[-0.02em] text-[#202124]">{activeWorkspace.label}</h3>
                    {navBadgeByWorkspace[activeWorkspace.id] ? (
                      <span className="rounded-full bg-[rgba(24,24,23,0.06)] px-2.5 py-1 text-[11px] text-[#6f747b]">
                        {navBadgeByWorkspace[activeWorkspace.id]}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[13px] leading-5 text-[#6f747b]">{activeWorkspace.description}</p>
                  <p className="mt-1 text-[12px] leading-5 text-[#8A8F96]">{activeNavSection.description}</p>
                </div>
                <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[420px]">
                  {activeWorkspaceContextItems.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[14px] border border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] px-3 py-3"
                    >
                      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#6f747b]">{item.label}</p>
                      <p className="mt-1 text-[14px] font-semibold leading-6 text-[#202124]">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] p-2">
                <p className="px-2 pb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#66735E]">子工作台</p>
                <div className="flex flex-wrap gap-2">
                  {activeSectionWorkspaces.map((workspace) => {
                    const panel = getPanelMeta(workspace.panel);
                    const Icon = panel.icon;
                    const active = workspace.id === activeWorkspaceId;
                    const badge = navBadgeByWorkspace[workspace.id];
                    return (
                      <button
                        key={workspace.id}
                        type="button"
                        onClick={() => onOpenWorkspace(workspace)}
                        className={`inline-flex min-h-12 items-center gap-2 rounded-[12px] px-3 py-2 text-[13px] font-medium transition ${
                          active
                            ? "bg-[#181817] text-white"
                            : "border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] text-[#5f6368] hover:text-[#202124]"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {workspace.label}
                        {badge ? (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] ${
                              active ? "bg-white/12 text-white" : "bg-[rgba(24,24,23,0.06)] text-[#6f747b]"
                            }`}
                          >
                            {badge}
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <PageErrorBoundary
            key={`${activePanel}-${panelBoundaryKey}`}
            fallbackTitle={`${activePanelMeta.label}暂时无法打开`}
            onReset={onResetPanelBoundary}
          >
            {children}
          </PageErrorBoundary>
        </main>
      </div>
    </div>
  );
}
