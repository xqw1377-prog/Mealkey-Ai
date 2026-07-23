"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { InAppBrowserBanner } from "@/components/InAppBrowserBanner";
import { BottomNav } from "@/components/operating/BottomNav";
import { ShellHeader } from "@/components/operating/ShellHeader";
import { createShellNavItems, resolveShellNavigation } from "@/components/operating/shellNavigation";
import { useProjectStore } from "@/stores/projectStore";
import { trpc } from "@/lib/trpc";

type OperatingShellProps = {
  children: ReactNode;
};

type PlatformAccessState = {
  loading: boolean;
  isAdmin: boolean;
};

function isPlatformPath(pathname: string) {
  return pathname.startsWith("/platform");
}

export function OperatingShell({ children }: OperatingShellProps) {
  const pathname = usePathname() ?? "";
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const currentProject = useProjectStore((s) => s.currentProject);
  const setCurrentProjectId = useProjectStore((s) => s.setCurrentProjectId);
  const pathProjectId = pathname.match(/^\/projects\/([^/]+)/)?.[1] ?? null;
  const isPlatformSurface = isPlatformPath(pathname);

  // 无 store 时拉企业列表，保证顶栏「对话」始终指向 /agent（不再落回旧驾驶舱）
  const { data: projectList } = trpc.project.list.useQuery(undefined, {
    staleTime: 30_000,
    enabled: !isPlatformSurface,
  });
  const listedProjectId = projectList?.[0]?.id ?? null;

  useEffect(() => {
    if (!currentProjectId && listedProjectId) {
      setCurrentProjectId(listedProjectId);
    }
  }, [currentProjectId, listedProjectId, setCurrentProjectId]);

  const defaultProjectId =
    pathProjectId ?? currentProjectId ?? currentProject?.id ?? listedProjectId ?? null;
  const navItems = createShellNavItems(defaultProjectId);
  const { section: currentSection, contextHref, contextLabel } = resolveShellNavigation(
    pathname,
    defaultProjectId,
  );
  // 决策沉浸：决策室 / 决策案；顾问咨询仍可全屏但不占底栏「决策」语义
  // Agent 是 Mobile 主入口：藏 ShellHeader + 底栏，页内 ChatGPT 壳自管导航
  const isAgentSurface = /^\/projects\/[^/]+\/agent$/.test(pathname);
  const isMeetingFullscreen =
    /^\/projects\/[^/]+\/advisor$/.test(pathname) ||
    /^\/projects\/[^/]+\/decision-room$/.test(pathname) ||
    /^\/projects\/[^/]+\/decision-case$/.test(pathname);
  const hideShellHeader = isMeetingFullscreen || isAgentSurface;
  const [platformAccess, setPlatformAccess] = useState<PlatformAccessState>({
    loading: isPlatformSurface,
    isAdmin: false,
  });

  useEffect(() => {
    if (!isPlatformSurface) {
      setPlatformAccess({ loading: false, isAdmin: false });
      return;
    }
    let cancelled = false;
    setPlatformAccess({ loading: true, isAdmin: false });
    void fetch("/api/platform/access", { cache: "no-store" })
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as {
          isAdmin?: boolean;
        } | null;
        if (!cancelled) {
          setPlatformAccess({
            loading: false,
            isAdmin: Boolean(body?.isAdmin),
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPlatformAccess({ loading: false, isAdmin: false });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isPlatformSurface, pathname]);

  const { data: brands } = trpc.project.listBrands.useQuery(
    { projectId: defaultProjectId! },
    { enabled: Boolean(defaultProjectId) && !isPlatformSurface },
  );

  const profileBrand =
    currentProject?.profile && typeof currentProject.profile === "object"
      ? (currentProject.profile as { brandName?: string }).brandName
      : undefined;
  const displayName =
    brands?.activeBrand?.brandName || profileBrand || currentProject?.name || null;

  if (isPlatformSurface) {
    // 管理控制台自带左侧固定导航，外层不再叠顶栏
    if (pathname.startsWith("/platform/admin")) {
      return (
        <div className="min-h-screen bg-[#f7f6f2] text-[#202124]">
          <InAppBrowserBanner variant="sticky" />
          <main className="relative">{children}</main>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#f7f6f2] text-[#202124]">
        <div className="pointer-events-none fixed inset-0 mk-shell-surface" />
        <div className="relative w-full max-w-none px-4 pb-10 pt-4 md:px-6 md:pb-14 md:pt-6 xl:px-8 2xl:px-10">
          <header className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(24,24,23,0.08)] pb-4">
            <div className="min-w-0">
              <p className="text-[12px] font-medium tracking-[0.04em] text-[#8a8f98]">PLATFORM</p>
              <p className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-[#181817]">
                {platformAccess.loading
                  ? "平台"
                  : platformAccess.isAdmin
                    ? "平台运行观测"
                    : "平台权限受限"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {platformAccess.isAdmin ? (
                <>
                  <a
                    href="/platform"
                    className={`inline-flex min-h-9 items-center rounded-[12px] px-3 text-[13px] font-medium ${
                      pathname === "/platform"
                        ? "bg-[#181817] text-white"
                        : "border border-[rgba(24,24,23,0.08)] bg-white text-[#5f6368]"
                    }`}
                  >
                    运行观测
                  </a>
                  <a
                    href="/platform/admin"
                    className="inline-flex min-h-9 items-center rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[13px] font-medium text-[#5f6368]"
                  >
                    管理控制台
                  </a>
                </>
              ) : platformAccess.loading ? null : (
                <a
                  href="/login?callbackUrl=%2Fplatform%2Fadmin"
                  className="inline-flex min-h-9 items-center rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[13px] font-medium text-[#5f6368]"
                >
                  切换管理员账号
                </a>
              )}
              <a
                href="/dashboard"
                className="inline-flex min-h-9 items-center rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[13px] font-medium text-[#5f6368]"
              >
                回今日
              </a>
            </div>
          </header>
          <InAppBrowserBanner variant="sticky" />
          <main className="relative">{children}</main>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen text-[#202124] ${
        isAgentSurface ? "bg-[#F7F6F2]" : "bg-[#faf9f6]"
      }`}
    >
      {isAgentSurface ? null : (
        <div className="pointer-events-none fixed inset-0 mk-shell-surface" />
      )}
      <div
        className={`relative mx-auto ${
          isAgentSurface
            ? "max-w-none px-0 pb-0 pt-0"
            : isMeetingFullscreen
              ? "max-w-4xl px-4 pb-4 pt-0 md:max-w-5xl md:px-6 md:pb-10 md:pt-6"
              : "max-w-4xl px-4 pb-[calc(env(safe-area-inset-bottom)+5.75rem)] pt-0 md:max-w-5xl md:px-6 md:pb-14 md:pt-6"
        }`}
      >
        {hideShellHeader ? null : (
          <ShellHeader
            items={navItems}
            currentSection={currentSection}
            contextHref={contextHref}
            contextLabel={contextLabel}
            projectName={displayName}
          />
        )}

        {isAgentSurface ? null : <InAppBrowserBanner variant="sticky" />}

        <main className="relative">{children}</main>
        {/* Agent = ChatGPT 壳：导航进左侧栏，不再叠底栏三 Tab */}
        {isMeetingFullscreen || isAgentSurface ? null : (
          <BottomNav items={navItems} currentSection={currentSection} />
        )}
      </div>
    </div>
  );
}
