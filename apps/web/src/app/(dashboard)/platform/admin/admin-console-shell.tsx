"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import {
  ArrowLeft,
  RefreshCcw,
  type LucideIcon,
} from "lucide-react";

import type { AdminInboxItem } from "@/server/services/platform-admin-inbox.service";
import type {
  PlatformAdminAlert,
  PlatformAdminMetric,
} from "@/server/services/platform-admin.service";
import { ConfirmDialog } from "@/components/operating/ConfirmDialog";
import { PageErrorBoundary } from "@/components/operating/PageErrorBoundary";
import { MKBrand } from "@/components/brand/MKBrand";
import {
  type AdminNavSectionId,
  type AdminPanel,
  type AdminWorkspaceId,
  NAV_SECTIONS,
  WORKSPACES,
  getPanelMeta,
} from "./admin-console-config";
import { CompactMetricStrip } from "./admin-console-ui";
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
  activeWorkspaceId,
  activeWorkspaceContextItems,
  derivedHeaderCards,
  derivedAlerts,
  interactiveAlertIds,
  navBadgeByWorkspace,
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
  const showFeedback = feedbackTone !== "idle" || Boolean(feedback);

  return (
    <div className="min-h-[calc(100vh-1rem)] lg:flex lg:min-h-screen">
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

      {/* 移动端顶部导航 */}
      <div className="sticky top-0 z-20 border-b border-[rgba(24,24,23,0.08)] bg-[#f7f6f2]/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <MKBrand compact subtitle={activeWorkspace.label} />
          </div>
          <button
            type="button"
            onClick={onRefreshOverview}
            disabled={isPending}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[rgba(24,24,23,0.08)] bg-white text-[#202124] disabled:opacity-50"
            aria-label="刷新"
          >
            <RefreshCcw className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3">
          {WORKSPACES.map((workspace) => {
            const panel = getPanelMeta(workspace.panel);
            const Icon = panel.icon;
            const active = workspace.id === activeWorkspaceId;
            const badge = navBadgeByWorkspace[workspace.id];
            return (
              <button
                key={workspace.id}
                type="button"
                onClick={() => onOpenWorkspace(workspace)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-[10px] px-3 py-2 text-[12px] font-medium ${
                  active
                    ? "bg-[#181817] text-white"
                    : "border border-[rgba(24,24,23,0.08)] bg-white text-[#5f6368]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {workspace.label}
                {badge ? (
                  <span
                    className={`rounded-full px-1.5 text-[10px] ${
                      active ? "bg-white/15" : "bg-[rgba(24,24,23,0.06)]"
                    }`}
                  >
                    {badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 左侧固定导航 */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-[rgba(24,24,23,0.08)] bg-[#f3f1ec] lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex">
        <div className="border-b border-[rgba(24,24,23,0.08)] px-4 py-5">
          <Link href="/dashboard" className="no-underline">
            <MKBrand compact subtitle="平台管理" />
          </Link>
        </div>

        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {NAV_SECTIONS.map((section) => {
            const sectionWorkspaces = WORKSPACES.filter(
              (w) => w.navSectionId === section.id,
            );
            return (
              <div key={section.id}>
                <p className="px-2 text-[11px] font-medium tracking-[0.1em] text-[#8a8f98]">
                  {section.title}
                </p>
                <div className="mt-1.5 space-y-0.5">
                  {sectionWorkspaces.map((workspace) => {
                    const panel = getPanelMeta(workspace.panel);
                    const Icon = panel.icon;
                    const active = workspace.id === activeWorkspaceId;
                    const badge = navBadgeByWorkspace[workspace.id];
                    return (
                      <button
                        key={workspace.id}
                        type="button"
                        onClick={() => onOpenWorkspace(workspace)}
                        className={`flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left transition ${
                          active
                            ? "bg-[#181817] text-white"
                            : "text-[#3d3f42] hover:bg-[rgba(24,24,23,0.05)]"
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            active ? "text-white" : "text-[#66735E]"
                          }`}
                        />
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium">
                          {workspace.label}
                        </span>
                        {badge ? (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                              active
                                ? "bg-white/15 text-white"
                                : "bg-[rgba(24,24,23,0.08)] text-[#6f747b]"
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
            );
          })}
        </nav>

        <div className="border-t border-[rgba(24,24,23,0.08)] px-3 py-3">
          <p className="px-2 text-[11px] font-medium tracking-[0.1em] text-[#8a8f98]">
            待办
          </p>
          <div className="mt-2 space-y-1">
            {sidebarQuickQueues.slice(0, 4).map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  className="flex w-full items-center gap-2 rounded-[10px] px-2.5 py-2 text-left text-[#3d3f42] transition hover:bg-[rgba(24,24,23,0.05)]"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-[#66735E]" />
                  <span className="min-w-0 flex-1 truncate text-[12px]">
                    {item.label}
                  </span>
                  <span className="text-[11px] text-[#6f747b]">{item.value}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-3 space-y-1 border-t border-[rgba(24,24,23,0.06)] pt-3">
            <Link
              href="/platform"
              className="flex items-center gap-2 rounded-[10px] px-2.5 py-2 text-[12px] text-[#5f6368] no-underline hover:bg-[rgba(24,24,23,0.05)] hover:text-[#181817]"
            >
              运行观测
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-[10px] px-2.5 py-2 text-[12px] text-[#5f6368] no-underline hover:bg-[rgba(24,24,23,0.05)] hover:text-[#181817]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              回今日
            </Link>
          </div>
        </div>
      </aside>

      {/* 右侧内容 */}
      <div className="min-w-0 flex-1 lg:ml-60">
        <header className="sticky top-0 z-10 hidden border-b border-[rgba(24,24,23,0.08)] bg-[#f7f6f2]/95 px-6 py-4 backdrop-blur lg:block">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[12px] text-[#8a8f98]">
                {activeNavSection.title}
                <span className="mx-1.5 text-[rgba(24,24,23,0.2)]">/</span>
                {activePanelMeta.label}
              </p>
              <h1 className="mt-1 text-[20px] font-semibold tracking-[-0.02em] text-[#181817]">
                {activeWorkspace.label}
              </h1>
              <p className="mt-1 max-w-[72ch] text-[13px] leading-5 text-[#6f747b]">
                {activeWorkspace.description}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={onRefreshOverview}
                disabled={isPending}
                className="inline-flex min-h-9 items-center gap-2 rounded-[10px] border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[13px] font-medium text-[#202124] disabled:opacity-50"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                刷新
              </button>
            </div>
          </div>
          {activeWorkspaceContextItems.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {activeWorkspaceContextItems.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[10px] border border-[rgba(24,24,23,0.06)] bg-white px-3 py-2"
                >
                  <p className="text-[10px] tracking-[0.06em] text-[#8a8f98]">
                    {item.label}
                  </p>
                  <p className="mt-0.5 text-[13px] font-semibold text-[#181817]">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </header>

        <div className="space-y-4 px-4 py-4 md:px-6 md:py-5">
          {domainLoading ? (
            <div
              role="status"
              aria-live="polite"
              className="rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-4 py-3 text-[13px] text-[#5f6368]"
            >
              正在按需加载当前域数据…
            </div>
          ) : null}

          {showFeedback ? (
            <div
              role={feedbackTone === "error" ? "alert" : "status"}
              aria-live={feedbackTone === "error" ? "assertive" : "polite"}
              className={`flex flex-col gap-1 rounded-[12px] border px-4 py-3 lg:flex-row lg:items-center lg:justify-between ${feedbackClassName}`}
            >
              <p className="text-[13px] leading-5">
                {feedback ?? "操作已完成"}
              </p>
              <p className="text-[11px] text-current/70">
                最近刷新 {formatDate(generatedAt)}
              </p>
            </div>
          ) : null}

          {derivedHeaderCards.length > 0 ? (
            <CompactMetricStrip
              metrics={derivedHeaderCards}
              formatMetricValue={formatMetricValue}
            />
          ) : null}

          {activePanel === "overview" && derivedAlerts.length > 0 ? (
            <AlertList
              alerts={derivedAlerts}
              onAlertClick={onAlertClick}
              interactiveAlertIds={interactiveAlertIds}
              formatNumber={formatNumber}
            />
          ) : null}

          {activePanel === "overview" ? (
            <div className="rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-white p-4 lg:hidden">
              <p className="text-[13px] font-semibold text-[#181817]">待办 Inbox</p>
              <div className="mt-3">
                <AdminInbox compact onOpenItem={onOpenInboxItem} />
              </div>
            </div>
          ) : null}

          <PageErrorBoundary
            key={`${activePanel}-${panelBoundaryKey}`}
            fallbackTitle={`${activePanelMeta.label}暂时无法打开`}
            onReset={onResetPanelBoundary}
          >
            {children}
          </PageErrorBoundary>
        </div>
      </div>
    </div>
  );
}
