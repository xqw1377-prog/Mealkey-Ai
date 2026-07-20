"use client";

import { AgentConsultingWorkspace } from "@/components/operating/AgentConsultingWorkspace";

/**
 * M-MKT 市场机会战略 — 市场战略委员会（六步价值路径）
 * 采集 → 市场调研 → 三顾问 → 四方会议 → 机会战略报告 → 进入路径
 */
export default function MarketPage({
  params,
}: {
  params: { projectId: string };
}) {
  return (
    <AgentConsultingWorkspace projectId={params.projectId} agentId="m-mkt" />
  );
}
