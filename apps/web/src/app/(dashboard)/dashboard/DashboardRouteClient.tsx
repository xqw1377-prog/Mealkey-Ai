"use client";

import type { inferRouterOutputs } from "@trpc/server";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageErrorState } from "@/components/operating/PageState";
import { useProjectStore } from "@/stores/projectStore";
import { DashboardPage } from "@/components/operating/DashboardPage";
import { trpc } from "@/lib/trpc";
import type { AppRouter } from "@/server";
import { DashboardRouteSkeleton } from "./DashboardRouteSkeleton";

type DashboardHomeResponse = inferRouterOutputs<AppRouter>["dashboard"]["getHome"];

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
      },
    );
  const homeResponse: DashboardHomeResponse | undefined = data ?? undefined;
  const gateProjectId =
    homeResponse?.currentProject?.id ?? currentProjectId ?? undefined;

  const { data: ripGate, isFetched: ripFetched } =
    trpc.restaurantIntelligence.get.useQuery(
      { projectId: gateProjectId! },
      {
        enabled: Boolean(gateProjectId),
        retry: false,
        staleTime: 30_000,
      },
    );

  // Phase 1：有企业后默认进对话 Agent；?radar=1 留在经营动态看板。
  // 未确认 RIP 不再整页拦截看板（只顶部提示），避免「看板打不开」。
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

  if (awaitingFirstHome) {
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
        primaryAction={{ href: "/projects", label: "看企业" }}
        secondaryAction={{ href: "/profile", label: "账号设置" }}
      />
    );
  }

  const resolvedProject = homeResponse?.currentProject ?? null;
  const resolvedHome = homeResponse?.home ?? null;

  return (
    <div className="space-y-3">
      {gateProjectId && ripGate?.needsConfirm ? (
        <div className="flex flex-col gap-2 rounded-[12px] border border-[rgba(102,115,94,0.22)] bg-[linear-gradient(180deg,#FBFAF7_0%,#F1F3EC_100%)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[14px] leading-6 text-[#2F3A28]">
            经营画像尚未确认——确认后驾驶舱会更懂你的生意。
          </p>
          <Link
            href={`/projects/${gateProjectId}/restaurant-intelligence`}
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-[14px] bg-[#181817] px-4 text-[14px] font-semibold text-white no-underline"
          >
            去确认画像
          </Link>
        </div>
      ) : null}
      <DashboardPage currentProject={resolvedProject} home={resolvedHome} />
    </div>
  );
}
