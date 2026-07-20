"use client";

import { BrandConsultingWorkspace } from "@/components/operating/BrandConsultingWorkspace";

/**
 * M-PNT 品牌定位 — 品牌战略委员会（六步价值路径）
 * 采集 → 市场调研 → 三顾问 → 四方会议 → 策略报告 → 执行路径
 */
export default function PositioningPage({
  params,
}: {
  params: { projectId: string };
}) {
  return <BrandConsultingWorkspace projectId={params.projectId} />;
}
