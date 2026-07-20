"use client";

import type { ReactNode } from "react";
import {
  PAGE_CONTENT_WIDTH,
  type PageContentWidth,
} from "@/lib/page-layout";

type Props = {
  children: ReactNode;
  width?: PageContentWidth;
  className?: string;
  /**
   * shell：外层 OperatingShell 已有水平 padding，内页不再叠一层
   * page：独立页自带水平留白（默认）
   */
  inset?: "shell" | "page";
};

/** 页面内容容器：统一最大宽度；壳内用 inset=shell 避免双层 padding */
export function PageContent({
  children,
  width = "default",
  className = "",
  inset = "page",
}: Props) {
  const padX = inset === "shell" ? "px-0" : "px-4 md:px-6";
  return (
    <div
      className={`mx-auto w-full ${PAGE_CONTENT_WIDTH[width]} ${padX} pb-12 pt-1 md:pb-14 md:pt-2 ${className}`}
    >
      {children}
    </div>
  );
}
