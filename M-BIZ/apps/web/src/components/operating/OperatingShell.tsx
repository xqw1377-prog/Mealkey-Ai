"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/operating/BottomNav";
import { ShellHeader } from "@/components/operating/ShellHeader";
import { createShellNavItems, resolveShellNavigation } from "@/components/operating/shellNavigation";
import { useProjectStore } from "@/stores/projectStore";

type OperatingShellProps = {
  children: ReactNode;
};

export function OperatingShell({ children }: OperatingShellProps) {
  const pathname = usePathname() ?? "";
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const currentProject = useProjectStore((s) => s.currentProject);
  const pathProjectId = pathname.match(/^\/projects\/([^/]+)/)?.[1] ?? null;
  const defaultProjectId = pathProjectId ?? currentProjectId ?? currentProject?.id ?? null;
  const navItems = createShellNavItems(defaultProjectId);
  const { section: currentSection, contextHref, contextLabel } = resolveShellNavigation(pathname, defaultProjectId);
  const isMeetingFullscreen = /^\/projects\/[^/]+\/advisor$/.test(pathname);

  return (
    <div className="min-h-screen bg-[#faf9f6] text-[#202124]">
      <div className="pointer-events-none fixed inset-0 mk-shell-surface" />
      <div
        className={`relative mx-auto max-w-4xl px-4 pt-0 md:max-w-5xl md:px-6 md:pt-6 ${
          isMeetingFullscreen ? "pb-4 md:pb-10" : "pb-[calc(env(safe-area-inset-bottom)+5.75rem)] md:pb-14"
        }`}
      >
        {isMeetingFullscreen ? null : (
          <ShellHeader
            items={navItems}
            currentSection={currentSection}
            contextHref={contextHref}
            contextLabel={contextLabel}
            projectName={currentProject?.name ?? null}
          />
        )}

        <main className="relative">{children}</main>
        {isMeetingFullscreen ? null : (
          <BottomNav items={navItems} currentSection={currentSection} />
        )}
      </div>
    </div>
  );
}
