"use client";

import { Suspense } from "react";
import { PageErrorBoundary } from "@/components/operating/PageErrorBoundary";
import { PageLoadingState } from "@/components/operating/PageState";
import { DecisionIntelligenceRoom } from "@/components/operating/DecisionIntelligenceRoom";

export default function DecisionCasePage({
  params,
}: {
  params: { projectId: string };
}) {
  return (
    <PageErrorBoundary fallbackTitle="扩店决策暂时无法打开">
      <Suspense
        fallback={
          <PageLoadingState
            eyebrow="扩店决策"
            title="正在打开…"
            description="准备事实、方案与挑战。"
          />
        }
      >
        <DecisionIntelligenceRoom projectId={params.projectId} />
      </Suspense>
    </PageErrorBoundary>
  );
}
