"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  AtSign,
  FolderKanban,
  ImageIcon,
  Library,
  MessageSquare,
  PanelLeftClose,
  Search,
  Settings,
  SquarePen,
  User,
} from "lucide-react";

export type AgentHistoryItem = {
  id: string;
  title: string;
  subtitle?: string;
  active?: boolean;
  kind: "current" | "asset" | "radar";
  categorySlug?: string;
  categoryLabel?: string;
};

type AgentChatSidebarProps = {
  open: boolean;
  onClose: () => void;
  projectId: string;
  projectName?: string | null;
  ownerName?: string | null;
  brandLine?: string | null;
  history: AgentHistoryItem[];
  onNewChat: () => void;
  onSelectHistory: (item: AgentHistoryItem) => void;
  newChatDisabled?: boolean;
};

/**
 * 对齐 ChatGPT Web 侧栏：
 * 顶图标轨（新聊天/图片/文件/项目/插件）→ 已置顶 / 最近 → 底账户
 * Mobile 仍用抽屉 + 底「聊天」按钮。
 */
export function AgentChatSidebar({
  open,
  onClose,
  projectId,
  projectName,
  ownerName,
  brandLine,
  history,
  onNewChat,
  onSelectHistory,
  newChatDisabled,
}: AgentChatSidebarProps) {
  const [query, setQuery] = useState("");

  const pinned = useMemo(
    () => history.filter((h) => h.active || h.kind === "current"),
    [history],
  );
  const recent = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = history.filter((h) => !(h.active || h.kind === "current"));
    if (!q) return base;
    return history.filter(
      (h) =>
        h.title.toLowerCase().includes(q) ||
        (h.categoryLabel || "").toLowerCase().includes(q) ||
        (h.subtitle || "").toLowerCase().includes(q),
    );
  }, [history, query]);

  return (
    <>
      <button
        type="button"
        aria-label="关闭菜单"
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(88vw,280px)] flex-col bg-[#f9f9f9] text-[#0d0d0d] transition-all duration-200 ease-out lg:static lg:z-0 lg:shrink-0 lg:border-r lg:border-black/[0.06] ${
          open
            ? "translate-x-0 lg:w-[260px] lg:opacity-100"
            : "-translate-x-full lg:w-0 lg:overflow-hidden lg:border-0 lg:opacity-0 lg:pointer-events-none"
        }`}
        aria-label="对话菜单"
      >
        {/* ChatGPT Web：顶图标轨 */}
        <div className="flex items-center justify-between gap-1 px-2 pb-1 pt-[max(0.65rem,env(safe-area-inset-top))] lg:pt-3">
          <div className="flex items-center gap-0.5">
            <IconBtn
              label="新聊天"
              disabled={newChatDisabled}
              onClick={() => {
                onNewChat();
                onClose();
              }}
            >
              <SquarePen className="h-[18px] w-[18px]" />
            </IconBtn>
            <IconLink href="/profile/assets" label="图片" onClick={onClose}>
              <ImageIcon className="h-[18px] w-[18px]" />
            </IconLink>
            <IconLink href="/profile/assets" label="文件" onClick={onClose}>
              <Library className="h-[18px] w-[18px]" />
            </IconLink>
            <IconLink
              href={`/projects/${projectId}`}
              label="项目"
              onClick={onClose}
            >
              <FolderKanban className="h-[18px] w-[18px]" />
            </IconLink>
            <IconLink
              href={`/projects/${projectId}/decision-room`}
              label="插件"
              onClick={onClose}
            >
              <AtSign className="h-[18px] w-[18px]" />
            </IconLink>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#5d5d5d] hover:bg-black/[0.05] lg:hidden"
            aria-label="收起"
          >
            <PanelLeftClose className="h-5 w-5" />
          </button>
        </div>

        <div className="px-3 pb-2 lg:hidden">
          <p className="truncate text-[15px] font-semibold">MealKey</p>
          <p className="truncate text-[11px] text-[#8e8e8e]">
            {brandLine || projectName || "餐饮经营 AI"}
          </p>
        </div>

        <div className="px-2 pb-2">
          <label className="flex min-h-9 items-center gap-2 rounded-lg bg-black/[0.04] px-2.5">
            <Search className="h-4 w-4 shrink-0 text-[#8e8e8e]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="搜索聊天"
              className="w-full bg-transparent py-2 text-[13px] outline-none placeholder:text-[#8e8e8e]"
            />
          </label>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {!query.trim() && pinned.length > 0 ? (
            <section className="mb-3">
              <p className="px-2 pb-1 text-[12px] font-medium text-[#8e8e8e]">
                已置顶
              </p>
              <ul className="space-y-0.5">
                {pinned.map((item) => (
                  <HistoryRow
                    key={`pin-${item.id}`}
                    item={item}
                    onSelect={() => {
                      onSelectHistory(item);
                      onClose();
                    }}
                  />
                ))}
              </ul>
            </section>
          ) : null}

          <section>
            <p className="px-2 pb-1 text-[12px] font-medium text-[#8e8e8e]">
              {query.trim() ? "搜索结果" : "最近"}
            </p>
            {recent.length === 0 ? (
              <p className="px-2 py-3 text-[13px] leading-5 text-[#8e8e8e]">
                {query.trim()
                  ? "没有匹配的对话。"
                  : "开始聊经营问题后，会按内容自动归类出现在这里。"}
              </p>
            ) : (
              <ul className="space-y-0.5">
                {recent.map((item) => (
                  <HistoryRow
                    key={item.id}
                    item={item}
                    onSelect={() => {
                      onSelectHistory(item);
                      onClose();
                    }}
                  />
                ))}
              </ul>
            )}
          </section>
        </nav>

        {/* Mobile 底聊天 */}
        <div className="flex items-center gap-2 border-t border-black/[0.06] px-3 py-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] lg:hidden">
          <button
            type="button"
            disabled={newChatDisabled}
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-[#0d6efd] px-4 text-[14px] font-semibold text-white disabled:opacity-40"
          >
            <SquarePen className="h-4 w-4" />
            聊天
          </button>
          <Link
            href="/profile"
            prefetch={false}
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/[0.08] no-underline"
            aria-label="设置"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>

        {/* Web 底账户 */}
        <Link
          href="/profile"
          prefetch={false}
          onClick={onClose}
          className="mt-auto hidden items-center gap-2.5 border-t border-black/[0.06] px-3 py-3 no-underline hover:bg-black/[0.03] lg:flex"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.06]">
            <User className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium">
              {ownerName || "经营者"}
            </span>
            <span className="block truncate text-[11px] text-[#8e8e8e]">
              设置与我的
            </span>
          </span>
        </Link>
      </aside>
    </>
  );
}

function IconBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#0d0d0d] hover:bg-black/[0.05] disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function IconLink({
  href,
  label,
  onClick,
  children,
}: {
  href: string;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      title={label}
      aria-label={label}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#0d0d0d] no-underline hover:bg-black/[0.05]"
    >
      {children}
    </Link>
  );
}

function HistoryRow({
  item,
  onSelect,
}: {
  item: AgentHistoryItem;
  onSelect: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left transition ${
          item.active
            ? "bg-black/[0.06] font-medium text-[#0d0d0d]"
            : "text-[#0d0d0d] hover:bg-black/[0.04]"
        }`}
      >
        <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 opacity-50" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] leading-5">{item.title}</span>
          {item.categoryLabel ? (
            <span className="mt-0.5 block truncate text-[11px] text-[#8e8e8e]">
              {item.categoryLabel}
            </span>
          ) : null}
        </span>
      </button>
    </li>
  );
}
