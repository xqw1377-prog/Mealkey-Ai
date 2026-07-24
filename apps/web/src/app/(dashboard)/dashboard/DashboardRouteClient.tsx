"use client";

import type { inferRouterOutputs } from "@trpc/server";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageErrorState, PageLoadingState } from "@/components/operating/PageState";
import { useProjectStore } from "@/stores/projectStore";
import { DashboardPage } from "@/components/operating/DashboardPage";
import { trpc } from "@/lib/trpc";
import type { AppRouter } from "@/server";
import { DashboardRouteSkeleton } from "./DashboardRouteSkeleton";

type DashboardHomeResponse = inferRouterOutputs<AppRouter>["dashboard"]["getHome"];

const SLOW_LOAD_MS = 12_000;

export function DashboardRouteClient({
  initialHomeResponse,
}: {
  initialHomeResponse?: DashboardHomeResponse;
}) {
  const router = useRouter();
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const currentProject = useProjectStore((s) => s.currentProject);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const useInitialHomeResponse =
    Boolean(initialHomeResponse) &&
    (!currentProjectId || initialHomeResponse?.currentProject?.id === currentProjectId);

  const { data, isLoading, isPending, error, isFetched } =
    trpc.dashboard.getHome.useQuery(
      currentProjectId ? { projectId: currentProjectId } : undefined,
      {
        initialData: useInitialHomeResponse ? initialHomeResponse : undefined,
        staleTime: useInitialHomeResponse ? 30_000 : 0,
        retry: 1,
      },
    );
  const homeResponse: DashboardHomeResponse | undefined = data ?? undefined;
  const gateProjectId =
    homeResponse?.currentProject?.id ?? currentProjectId ?? undefined;

  const { data: ripGate } = trpc.restaurantIntelligence.get.useQuery(
    { projectId: gateProjectId! },
    {
      enabled: Boolean(gateProjectId),
      retry: false,
      staleTime: 30_000,
    },
  );

  // 服务端 page.tsx 已在无 ?radar=1 时 redirect；此处兜底客户端直达 /dashboard
  useEffect(() => {
    if (!gateProjectId) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("radar") === "1") return;
    router.replace(`/projects/${gateProjectId}/agent`);
  }, [gateProjectId, router]);

  const errorMessage = error?.message?.toLowerCase() ?? "";
  const errorCode = error?.data?.code;
  const isAuthError =
    errorCode === "UNAUTHORIZED" ||
    errorMessage.includes("请先登录") ||
    errorMessage.includes("unauthorized") ||
    errorMessage.includes("server configuration");

  useEffect(() => {
    if (!homeResponse) return;
    if (
      homeResponse.currentProject &&
      homeResponse.currentProject.id !== currentProject?.id
    ) {
      setCurrentProject(homeResponse.currentProject);
    }
  }, [currentProject?.id, homeResponse, setCurrentProject]);

  const awaitingFirstHome = !isFetched && (isPending || isLoading) && !error;
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  useEffect(() => {
    if (!awaitingFirstHome) {
      setLoadTimedOut(false);
      return;
    }
    const timer = window.setTimeout(() => setLoadTimedOut(true), SLOW_LOAD_MS);
    return () => window.clearTimeout(timer);
  }, [awaitingFirstHome]);

  if (awaitingFirstHome) {
    if (loadTimedOut) {
      return (
        <PageLoadingState
          eyebrow="经营动态"
          title="打开较慢…"
          description="数据仍在同步。可先回对话，稍后再看经营动态。"
          primaryAction={
            gateProjectId
              ? {
                  href: `/projects/${gateProjectId}/agent`,
                  label: "回对话",
                }
              : { href: "/login", label: "去登录" }
          }
          secondaryAction={
            gateProjectId
              ? {
                  href: `/projects/${gateProjectId}/decision-room`,
                  label: "去拍板",
                }
              : { href: "/projects", label: "企业列表" }
          }
          slowHint="超过 12 秒仍未就绪时，优先回对话继续经营。"
        />
      );
    }
    return <DashboardRouteSkeleton />;
  }

  if (error && !homeResponse) {
    if (isAuthError) {
      return (
        <PageErrorState
          eyebrow="经营动态"
          title="需要重新登录"
          description="登录状态已失效。"
          primaryAction={{ href: "/login", label: "去登录" }}
          secondaryAction={{ href: "/projects", label: "看企业列表" }}
        />
      );
    }

    return (
      <PageErrorState
        eyebrow="经营动态"
        title="经营动态暂时打不开"
        description="数据还在同步，稍后再试。"
        primaryAction={
          gateProjectId
            ? {
                href: `/projects/${gateProjectId}/agent`,
                label: "回对话",
              }
            : { href: "/projects", label: "看企业" }
        }
        secondaryAction={
          gateProjectId
            ? {
                href: `/projects/${gateProjectId}/decision-room`,
                label: "去拍板",
              }
            : { href: "/profile", label: "账号设置" }
        }
      />
    );
  }

  const resolvedProject = homeResponse?.currentProject ?? null;
  const resolvedHome = homeResponse?.home ?? null;

  return (
    <div className="space-y-3">
      {gateProjectId && ripGate?.needsConfirm ? (
        <p className="text-[13px] leading-6 text-[#5f655d]">
          经营画像尚未确认——
          <Link
            href={`/projects/${gateProjectId}/restaurant-intelligence`}
            prefetch={false}
            className="font-medium text-[#66735E] underline-offset-2 hover:underline"
          >
            去确认画像
          </Link>
          ，确认后经营动态会更准。
        </p>
      ) : null}
      <DashboardPage currentProject={resolvedProject} home={resolvedHome} />
    </div>
  );
}
