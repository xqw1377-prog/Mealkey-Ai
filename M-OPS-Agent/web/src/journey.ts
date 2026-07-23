export type JourneyStage =
  | "intake"
  | "recognizing"
  | "portrait"
  | "voices"
  | "today"
  | "report"
  | "deeper";

export type JourneyStepDef = {
  id: JourneyStage;
  no: string;
  title: string;
  feel: string;
};

/** 对齐 M-PNT 旅程壳：最终交付是专家会审咨询报告 */
export const MOPS_JOURNEY: JourneyStepDef[] = [
  { id: "intake", no: "01", title: "说清楚", feel: "你的店是谁" },
  { id: "recognizing", no: "02", title: "认识中", feel: "正在观察外部世界" },
  { id: "portrait", no: "03", title: "经营画像", feel: "我怎么认识你的店" },
  { id: "voices", no: "04", title: "顾客声音", feel: "喜欢 / 犹豫 / 离开" },
  { id: "today", no: "05", title: "今日扫描", feel: "今天发生了什么" },
  { id: "report", no: "06", title: "会审报告", feel: "汇总结论 · 讨论附后" },
];

export const DEEPER_STEP: JourneyStepDef = {
  id: "deeper",
  no: "··",
  title: "病例学习",
  feel: "沉淀与回填",
};

export function journeyIndex(stage: JourneyStage): number {
  if (stage === "deeper") return MOPS_JOURNEY.length;
  return MOPS_JOURNEY.findIndex((s) => s.id === stage);
}

export function stepState(
  stepId: JourneyStage,
  current: JourneyStage,
): "active" | "passed" | "future" | "locked" {
  const cur = journeyIndex(current);
  const idx = journeyIndex(stepId);
  if (stepId === current) return "active";
  if (idx < cur) return "passed";
  if (current === "intake" || current === "recognizing") {
    return idx > cur ? "locked" : "future";
  }
  return "future";
}
