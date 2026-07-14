"use client";

import type { inferRouterOutputs } from "@trpc/server";
import { useEffect } from "react";
import { PageErrorState, PageLoadingState } from "@/components/operating/PageState";
import { useProjectStore } from "@/stores/projectStore";
import { DashboardPage } from "@/components/operating/DashboardPage";
import { trpc } from "@/lib/trpc";
import type { AppRouter } from "@/server";

type DashboardHomeResponse = inferRouterOutputs<AppRouter>["dashboard"]["getHome"];

export default function DashboardRoutePage() {
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject);
  const currentProject = useProjectStore((s) => s.currentProject);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const { data, isLoading, error } = trpc.dashboard.getHome.useQuery(
    currentProjectId ? { projectId: currentProjectId } : undefined
  );
  const homeResponse: DashboardHomeResponse | undefined = data ?? undefined;
  const errorMessage = error?.message?.toLowerCase() ?? "";
  const errorCode = error?.data?.code;
  const isAuthError =
    errorCode === "UNAUTHORIZED" ||
    errorMessage.includes("请先登录") ||
    errorMessage.includes("unauthorized") ||
    errorMessage.includes("server configuration");

  useEffect(() => {
    if (homeResponse?.currentProject && homeResponse.currentProject.id !== currentProject?.id) {
      setCurrentProject(homeResponse.currentProject);
    }
  }, [currentProject?.id, homeResponse?.currentProject, setCurrentProject]);

  if (isLoading && !currentProject && !homeResponse?.currentProject) {
    return (
      <PageLoadingState
        eyebrow="今日"
        title="AI 正在校准今天的经营状态"
        description="正在读取世界、判断和下一步。"
        steps={[
          { label: "读取经营世界与最新反馈", status: "done" },
          { label: "识别今天最关键的问题", status: "active" },
          { label: "生成今日判断与行动", status: "pending" },
        ]}
      />
    );
  }

  if (error && !currentProject && !homeResponse?.currentProject) {
    if (isAuthError) {
      return (
        <PageErrorState
          eyebrow="今日"
          title="经营身份还没有接通"
          description="当前会话未接通。先回经营世界，或重新登录。"
          primaryAction={{ href: "/projects", label: "进入经营世界" }}
          secondaryAction={{ href: "/login", label: "恢复进入状态" }}
          highlights={[
            "更像一次会话中断。",
            "恢复后今日页会继续生成。",
          ]}
        />
      );
    }

    return (
      <PageErrorState
        eyebrow="今日"
        title="今日经营驾驶舱暂时无法生成"
        description="项目数据还在同步。先去经营世界或经营会议。"
        primaryAction={{ href: "/projects", label: "进入经营世界" }}
        secondaryAction={{ href: "/profile", label: "先看我的经营大脑" }}
        highlights={[
            "你可以继续补项目背景或会议记录。",
            "当前异常只影响今日页。",
        ]}
      />
    );
  }

  return <DashboardPage currentProject={homeResponse?.currentProject ?? currentProject} home={homeResponse?.home} />;
}
