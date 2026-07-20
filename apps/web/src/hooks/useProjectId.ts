"use client";

import { useParams } from "next/navigation";

/**
 * 统一从路由取 projectId（兼容 App Router params）
 */
export function useProjectId(fallback?: string | null): string | null {
  const params = useParams();
  const raw = params?.projectId;
  if (typeof raw === "string" && raw.trim()) return raw;
  if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0];
  return fallback ?? null;
}
