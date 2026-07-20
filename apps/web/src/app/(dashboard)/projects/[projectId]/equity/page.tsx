"use client";

import { AgentConsultingWorkspace } from "@/components/operating/AgentConsultingWorkspace";

/**
 * M-ED 股权战略设计 — 股权治理委员会（六步价值路径）
 * 采集 → 结构扫描 → 四方顾问 → 治理会议室 → 股权方案 → 落地路径
 */
export default function EquityPage({
  params,
}: {
  params: { projectId: string };
}) {
  return (
    <AgentConsultingWorkspace projectId={params.projectId} agentId="m-ed" />
  );
}
