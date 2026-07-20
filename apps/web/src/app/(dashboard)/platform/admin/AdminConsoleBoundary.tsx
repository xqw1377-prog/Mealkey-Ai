"use client";

import type { ReactNode } from "react";
import { PageErrorBoundary } from "@/components/operating/PageErrorBoundary";

export function AdminConsoleBoundary({ children }: { children: ReactNode }) {
  return (
    <PageErrorBoundary fallbackTitle="平台管理控制台暂时无法打开">
      {children}
    </PageErrorBoundary>
  );
}
