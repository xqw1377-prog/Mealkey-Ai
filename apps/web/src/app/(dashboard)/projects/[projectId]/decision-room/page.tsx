"use client";

import { PageErrorBoundary } from "@/components/operating/PageErrorBoundary";
import { DecisionRoom } from "@/components/operating/meeting/DecisionRoom";

export default function DecisionRoomPage({
  params,
}: {
  params: { projectId: string };
}) {
  return (
    <PageErrorBoundary fallbackTitle="决策室暂时无法打开">
      <DecisionRoom projectId={params.projectId} />
    </PageErrorBoundary>
  );
}
