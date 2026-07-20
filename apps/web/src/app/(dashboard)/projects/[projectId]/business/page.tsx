"use client";

import { AgentConsultingWorkspace } from "@/components/operating/AgentConsultingWorkspace";

/**
 * M-BIZ 商业模式战略 — 商业顾问委员会（六步价值路径）
 * 采集 → 商业体检 → 四官出策 → 顾问委员会 → 模式报告 → 验证路径
 */
export default function BusinessPage({
  params,
}: {
  params: { projectId: string };
}) {
  return (
    <AgentConsultingWorkspace projectId={params.projectId} agentId="m-biz" />
  );
}
