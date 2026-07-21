import { PageLoadingState } from "@/components/operating/PageState";

export default function DecisionsLoading() {
  return (
    <PageLoadingState
      eyebrow="行动"
      title="正在打开…"
      description="读取已确认的决策与验证进度。"
    />
  );
}
