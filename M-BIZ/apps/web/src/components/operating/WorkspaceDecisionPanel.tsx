"use client";

import type { ReactNode } from "react";

type WorkspaceDecisionPanelProps = {
  eyebrow: string;
  title: string;
  badge: string;
  summaryTitle: string;
  summaryBody: string;
  leftCards: Array<{
    title: string;
    body: ReactNode;
    tone?: "default" | "warning";
  }>;
  reasonsTitle: string;
  reasons: string[];
  rightTitle: string;
  rightHeading: string;
  rightBody: string;
  rightAction?: ReactNode;
  palette?: {
    border?: string;
    background?: string;
    eyebrow?: string;
    title?: string;
    badgeBg?: string;
    badgeText?: string;
    summaryBg?: string;
    summaryEyebrow?: string;
    summaryText?: string;
    cardBorder?: string;
    cardBg?: string;
    cardEyebrow?: string;
    cardText?: string;
    warningText?: string;
    reasonItemBg?: string;
    rightBg?: string;
    rightEyebrow?: string;
    rightText?: string;
    rightBodyText?: string;
  };
};

export function WorkspaceDecisionPanel({
  eyebrow,
  title,
  badge,
  summaryTitle,
  summaryBody,
  leftCards,
  reasonsTitle,
  reasons,
  rightTitle,
  rightHeading,
  rightBody,
  rightAction,
  palette,
}: WorkspaceDecisionPanelProps) {
  const merged = {
    border: palette?.border || "border-[rgba(24,24,23,0.08)]",
    background: palette?.background || "bg-white",
    eyebrow: palette?.eyebrow || "text-[#66735E]",
    title: palette?.title || "text-[#202124]",
    badgeBg: palette?.badgeBg || "bg-[rgba(102,115,94,0.10)]",
    badgeText: palette?.badgeText || "text-[#66735E]",
    summaryBg: palette?.summaryBg || "bg-[linear-gradient(180deg,#F8F7F3_0%,#EEF1EA_100%)]",
    summaryEyebrow: palette?.summaryEyebrow || "text-[#66735E]",
    summaryText: palette?.summaryText || "text-[#202124]",
    cardBorder: palette?.cardBorder || "border-[rgba(24,24,23,0.08)]",
    cardBg: palette?.cardBg || "bg-white",
    cardEyebrow: palette?.cardEyebrow || "text-[#66735E]",
    cardText: palette?.cardText || "text-[#202124]",
    warningText: palette?.warningText || "text-[#B47C5C]",
    reasonItemBg: palette?.reasonItemBg || "bg-[#F8F7F3]",
    rightBg: palette?.rightBg || "bg-[#202124]",
    rightEyebrow: palette?.rightEyebrow || "text-white/70",
    rightText: palette?.rightText || "text-white",
    rightBodyText: palette?.rightBodyText || "text-white/82",
  };

  return (
    <section className={`rounded-[24px] border p-5 shadow-[0_18px_34px_rgba(24,24,23,0.06)] ${merged.border} ${merged.background}`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={`text-[12px] tracking-[0.08em] ${merged.eyebrow}`}>{eyebrow}</p>
          <h3 className={`mt-2 text-[26px] leading-[1.2] tracking-[-0.04em] ${merged.title}`}>{title}</h3>
        </div>
        <div className={`inline-flex items-center rounded-full px-4 py-2 text-[13px] font-medium ${merged.badgeBg} ${merged.badgeText}`}>
          {badge}
        </div>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div className={`rounded-[20px] p-4 ${merged.summaryBg}`}>
            <p className={`text-[12px] tracking-[0.08em] ${merged.summaryEyebrow}`}>{summaryTitle}</p>
            <p className={`mt-2 text-[15px] leading-[1.9] ${merged.summaryText}`}>{summaryBody}</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {leftCards.map((card) => (
              <div key={card.title} className={`rounded-[20px] border p-4 ${merged.cardBorder} ${merged.cardBg}`}>
                <p className={`text-[12px] tracking-[0.08em] ${card.tone === "warning" ? merged.warningText : merged.cardEyebrow}`}>
                  {card.title}
                </p>
                <div className={`mt-2 text-[15px] leading-[1.8] ${card.tone === "warning" ? merged.warningText : merged.cardText}`}>
                  {card.body}
                </div>
              </div>
            ))}
          </div>
          <div className={`rounded-[20px] border p-4 ${merged.cardBorder} ${merged.cardBg}`}>
            <p className={`text-[12px] tracking-[0.08em] ${merged.cardEyebrow}`}>{reasonsTitle}</p>
            <div className="mt-3 space-y-2">
              {reasons.map((item) => (
                <div key={item} className={`rounded-[14px] px-3 py-3 text-[14px] leading-7 ${merged.reasonItemBg} ${merged.cardText}`}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className={`rounded-[22px] p-5 ${merged.rightBg} ${merged.rightText}`}>
          <p className={`text-[12px] tracking-[0.08em] ${merged.rightEyebrow}`}>{rightTitle}</p>
          <p className="mt-3 text-[22px] leading-[1.4] tracking-[-0.03em]">{rightHeading}</p>
          <p className={`mt-3 text-[14px] leading-[1.8] ${merged.rightBodyText}`}>{rightBody}</p>
          {rightAction ? <div className="mt-5">{rightAction}</div> : null}
        </div>
      </div>
    </section>
  );
}
