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

export function OperatingShell({ children }: OperatingShellProps) {
  const pathname = usePathname() ?? "";
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const currentProject = useProjectStore((s) => s.currentProject);
  const pathProjectId = pathname.match(/^\/projects\/([^/]+)/)?.[1] ?? null;
  const defaultProjectId = pathProjectId ?? currentProjectId ?? currentProject?.id ?? null;
  const navItems = createShellNavItems(defaultProjectId);
  const { section: currentSection, contextHref, contextLabel } = resolveShellNavigation(
    pathname,
    defaultProjectId,
  );
  // 决策沉浸：决策室 / 决策案；顾问咨询仍可全屏但不占底栏「决策」语义
  const isMeetingFullscreen =
    /^\/projects\/[^/]+\/advisor$/.test(pathname) ||
    /^\/projects\/[^/]+\/decision-room$/.test(pathname) ||
    /^\/projects\/[^/]+\/decision-case$/.test(pathname);
  // 管理平台独立壳：不挂老板底栏 / 不占「成长」导航语义
  const isPlatformSurface = pathname.startsWith("/platform");
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
    <div className="min-h-screen bg-[#faf9f6] text-[#202124]">
      <div className="pointer-events-none fixed inset-0 mk-shell-surface" />
      <div
        className={`relative mx-auto max-w-4xl px-4 pt-0 md:max-w-5xl md:px-6 md:pt-6 ${
          isMeetingFullscreen
            ? "pb-4 md:pb-10"
            : "pb-[calc(env(safe-area-inset-bottom)+5.75rem)] md:pb-14"
        }`}
      >
        {isMeetingFullscreen ? null : (
          <ShellHeader
            items={navItems}
            currentSection={currentSection}
            contextHref={contextHref}
            contextLabel={contextLabel}
            projectName={displayName}
          />
        )}

        <InAppBrowserBanner variant="sticky" />

        <main className="relative">{children}</main>
        {isMeetingFullscreen ? null : (
          <BottomNav items={navItems} currentSection={currentSection} />
        )}
      </div>
    </div>
  );
}
