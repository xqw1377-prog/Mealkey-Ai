"use client";

import { Check } from "lucide-react";

export type WorkspaceJourneyStep = {
  id: string;
  label: string;
  note: string;
  status: "completed" | "current" | "upcoming";
};

type WorkspaceJourneyRailProps = {
  eyebrow: string;
  title: string;
  progress: number;
  summary: string;
  steps: WorkspaceJourneyStep[];
  palette?: {
    border?: string;
    title?: string;
    eyebrow?: string;
    cardBg?: string;
    progressBg?: string;
    progressTitle?: string;
    progressValue?: string;
    progressText?: string;
    completedTone?: string;
    currentTone?: string;
    upcomingTone?: string;
    note?: string;
  };
};

function JourneyRailItem({
  label,
  note,
  status,
  palette,
}: WorkspaceJourneyStep & {
  palette: NonNullable<WorkspaceJourneyRailProps["palette"]>;
}) {
  const tone =
    status === "completed"
      ? palette.completedTone
      : status === "current"
        ? palette.currentTone
        : palette.upcomingTone;

  return (
    <div className={`rounded-[18px] border p-3 ${palette.border} ${palette.cardBg}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border text-[11px] ${tone}`}>
          {status === "completed" ? <Check className="h-3.5 w-3.5" /> : "•"}
        </div>
        <div className="min-w-0">
          <p className={`text-[14px] font-medium leading-6 ${palette.title}`}>{label}</p>
          <p className={`text-[12px] leading-5 ${palette.note}`}>{note}</p>
        </div>
      </div>
    </div>
  );
}

export function WorkspaceJourneyRail({
  eyebrow,
  title,
  progress,
  summary,
  steps,
  palette,
}: WorkspaceJourneyRailProps) {
  const mergedPalette: NonNullable<WorkspaceJourneyRailProps["palette"]> = {
    border: palette?.border || "border-[rgba(24,24,23,0.08)]",
    title: palette?.title || "text-[#202124]",
    eyebrow: palette?.eyebrow || "text-[#66735E]",
    cardBg: palette?.cardBg || "bg-white",
    progressBg: palette?.progressBg || "bg-[linear-gradient(180deg,#F8F7F3_0%,#EEF1EA_100%)]",
    progressTitle: palette?.progressTitle || "text-[#66735E]",
    progressValue: palette?.progressValue || "text-[#202124]",
    progressText: palette?.progressText || "text-[#5f655d]",
    completedTone: palette?.completedTone || "border-[#66735E] bg-[#66735E] text-white",
    currentTone:
      palette?.currentTone || "border-[#B47C5C] bg-[rgba(180,124,92,0.12)] text-[#9A5B35]",
    upcomingTone:
      palette?.upcomingTone || "border-[rgba(102,115,94,0.12)] bg-white text-[#A0A5B0]",
    note: palette?.note || "text-[#6f747b]",
  };

  return (
    <div className={`rounded-[24px] border p-4 shadow-[0_14px_28px_rgba(24,24,23,0.05)] ${mergedPalette.border} ${mergedPalette.cardBg}`}>
      <p className={`text-[12px] tracking-[0.08em] ${mergedPalette.eyebrow}`}>{eyebrow}</p>
      <h3 className={`mt-2 text-[18px] font-semibold leading-[1.3] ${mergedPalette.title}`}>{title}</h3>
      <div className="mt-4 space-y-3">
        {steps.map((step) => (
          <JourneyRailItem key={step.id} {...step} palette={mergedPalette} />
        ))}
      </div>
      <div className={`mt-4 rounded-[18px] p-4 ${mergedPalette.progressBg}`}>
        <p className={`text-[12px] tracking-[0.08em] ${mergedPalette.progressTitle}`}>整体进度</p>
        <p className={`mt-2 text-[28px] font-semibold tracking-[-0.04em] ${mergedPalette.progressValue}`}>{progress}%</p>
        <p className={`mt-1 text-[13px] leading-6 ${mergedPalette.progressText}`}>{summary}</p>
      </div>
    </div>
  );
}
