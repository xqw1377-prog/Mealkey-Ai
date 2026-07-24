"use client";

import { lifecycleLabel, type MeetingLifecycle } from "@/lib/meeting";
import type { ActiveMeetingDraft } from "@/lib/meeting-session";

type DraftConflict = {
  draft: ActiveMeetingDraft;
  incomingTopic: string;
};

type Props = {
  draftConflict: DraftConflict | null;
  showResumeBanner: boolean;
  resumeTopic: string;
  resumeLifecycle: MeetingLifecycle;
  resumeRound: number;
  clearing?: boolean;
  onContinueDraft: (draft: ActiveMeetingDraft) => void;
  onReplaceWithIncoming: () => void;
  onDismissResume: () => void;
  onAbandonResume: () => void;
};

/**
 * 会商草稿冲突 / 恢复横幅
 */
export function MeetingDraftBanners({
  draftConflict,
  showResumeBanner,
  resumeTopic,
  resumeLifecycle,
  resumeRound,
  clearing,
  onContinueDraft,
  onReplaceWithIncoming,
  onDismissResume,
  onAbandonResume,
}: Props) {
  return (
    <>
      {draftConflict ? (
        <section className="border border-[rgba(180,124,92,0.28)] bg-[rgba(180,124,92,0.08)] p-4">
          <p className="text-[12px] tracking-[0.08em] text-[#B47C5C]">未完成的会商</p>
          <p className="mt-2 text-[15px] leading-7 text-[#202124]">
            上次：「{draftConflict.draft.topic}」（
            {lifecycleLabel(draftConflict.draft.lifecycle)}）
          </p>
          <p className="mt-1 text-[13px] leading-6 text-[#6f747b]">
            新入口：「{draftConflict.incomingTopic}」。选继续或换新议题。
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={clearing}
              onClick={() => onContinueDraft(draftConflict.draft)}
              className="inline-flex min-h-11 items-center justify-center bg-[#181817] px-4 text-[13px] font-semibold text-white touch-manipulation disabled:opacity-50"
            >
              继续上次
            </button>
            <button
              type="button"
              disabled={clearing}
              onClick={onReplaceWithIncoming}
              className="inline-flex min-h-11 items-center justify-center border border-[rgba(24,24,23,0.1)] bg-white px-4 text-[13px] font-medium text-[#202124] touch-manipulation disabled:opacity-50"
            >
              用新议题
            </button>
          </div>
        </section>
      ) : null}

      {showResumeBanner && !draftConflict ? (
        <section className="border border-[rgba(102,115,94,0.28)] bg-[#EEF1EA] p-4">
          <p className="text-[12px] tracking-[0.08em] text-[#66735E]">未完成的会商</p>
          <p className="mt-2 text-[15px] leading-7 text-[#202124]">
            {resumeTopic} · {lifecycleLabel(resumeLifecycle)}
            {resumeRound > 0 ? ` · 第 ${resumeRound} 轮` : ""}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onDismissResume}
              className="inline-flex min-h-11 items-center justify-center bg-[#181817] px-4 text-[13px] font-semibold text-white touch-manipulation"
            >
              继续
            </button>
            <button
              type="button"
              disabled={clearing}
              onClick={onAbandonResume}
              className="inline-flex min-h-11 items-center justify-center border border-[rgba(24,24,23,0.1)] bg-white px-4 text-[13px] font-medium text-[#202124] touch-manipulation disabled:opacity-50"
            >
              放弃重开
            </button>
          </div>
        </section>
      ) : null}
    </>
  );
}
