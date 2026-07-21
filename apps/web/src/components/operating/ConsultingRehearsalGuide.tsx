"use client";

import { useEffect, useMemo, useState } from "react";
import {
  allGuideAnswersSelected,
  buildRehearsalGuide,
  composeRetellFromGuideAnswers,
  DEFAULT_REHEARSAL_CHECKLIST,
  type PositioningStatement,
  type PositionRehearsalChecklist,
} from "@mealkey/agents/m-pnt/consulting";
import { VoiceMicButton } from "@/components/operating/ConsultingGuidedIntake";

type Answers = Partial<Record<keyof PositioningStatement, string>>;

function shuffleOptions<T>(items: T[], seed: string): T[] {
  const arr = [...items];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  for (let i = arr.length - 1; i > 0; i--) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const j = h % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function ConsultingRehearsalGuide({
  statement,
  founderRetell,
  setFounderRetell,
  checklist,
  setChecklist,
  pending,
  speech,
  onSubmit,
  feedback,
  status,
  score,
}: {
  statement: PositioningStatement;
  founderRetell: string;
  setFounderRetell: (v: string) => void;
  checklist: PositionRehearsalChecklist;
  setChecklist: (v: PositionRehearsalChecklist) => void;
  pending?: boolean;
  speech?: {
    supported: boolean;
    active: boolean;
    onToggle?: () => void;
    onPressStart?: () => void;
    onPressEnd?: () => void;
  };
  onSubmit: () => void;
  feedback?: string | null;
  status?: string | null;
  score?: number | null;
}) {
  const guide = useMemo(() => buildRehearsalGuide(statement), [statement]);
  const [answers, setAnswers] = useState<Answers>({});
  const [showFree, setShowFree] = useState(false);

  const progress = Object.keys(answers).filter((k) =>
    Boolean(answers[k as keyof PositioningStatement]?.trim()),
  ).length;
  const ready = allGuideAnswersSelected(answers) || founderRetell.trim().length >= 40;
  const checklistOk = Object.values(checklist).every(Boolean);
  const passed = status === "passed";

  useEffect(() => {
    if (!allGuideAnswersSelected(answers)) return;
    const composed = composeRetellFromGuideAnswers(statement, answers);
    setFounderRetell(composed);
    setChecklist({ ...DEFAULT_REHEARSAL_CHECKLIST });
  }, [answers, statement, setFounderRetell, setChecklist]);

  function pick(field: keyof PositioningStatement, text: string) {
    setAnswers((prev) => ({ ...prev, [field]: text }));
  }

  return (
    <div className="space-y-4 border border-[rgba(24,24,23,0.08)] px-4 py-4">
      <div className="space-y-1">
        <p className="text-[12px] tracking-[0.08em] text-[#66735E]">
          店员话术核对
          {passed ? " · 已对齐" : progress > 0 ? ` · 已点 ${progress}/6` : " · 待对齐"}
          {score != null && passed ? ` · 清晰度 ${score}` : ""}
        </p>
        <p className="text-[15px] font-medium text-[#202124]">
          帮你把定位说成店员也能讲的一句话
        </p>
        <p className="text-[13px] leading-6 text-[#6f747b]">
          不是考试。每题点一个「最像你们」的答案即可；点齐后系统自动拼好话术。
        </p>
      </div>

      <div className="space-y-5">
        {guide.map((item) => {
          const options = shuffleOptions(
            [item.correct, ...item.distractors],
            `${item.field}:${item.correct.text}`,
          );
          const selected = answers[item.field];
          return (
            <div key={item.field} className="space-y-2">
              <p className="text-[14px] font-medium text-[#202124]">{item.question}</p>
              <div className="flex flex-col gap-2">
                {options.map((opt) => {
                  const active = selected === opt.text;
                  const isCorrect = opt.text === item.correct.text;
                  return (
                    <button
                      key={`${item.field}:${opt.label}`}
                      type="button"
                      disabled={pending}
                      onClick={() => pick(item.field, opt.text)}
                      className={`min-h-11 border px-3 py-2.5 text-left text-[14px] leading-6 transition-colors disabled:opacity-50 ${
                        active
                          ? "border-[#181817] bg-[#181817] text-white"
                          : "border-[rgba(24,24,23,0.1)] bg-[#FBFAF7] text-[#202124] hover:border-[#181817]"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {!isCorrect ? (
                        <span
                          className={`mt-0.5 block text-[11px] ${
                            active ? "text-white/70" : "text-[#9a968e]"
                          }`}
                        >
                          （对照项 · 一般不是你们）
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {founderRetell.trim().length >= 40 ? (
        <div className="space-y-2 border border-[rgba(24,24,23,0.06)] bg-[#FBFAF7] px-3 py-3">
          <p className="text-[12px] tracking-[0.06em] text-[#66735E]">
            给店员的说法（点齐六问后自动生成）
          </p>
          <p className="text-[14px] leading-7 text-[#202124]">{founderRetell}</p>
          {checklistOk ? (
            <p className="text-[12px] text-[#66735E]">已默认确认：你能一口气说完，店员也能复述。</p>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        className="text-[13px] text-[#66735E] underline-offset-2 hover:underline"
        onClick={() => setShowFree((v) => !v)}
      >
        {showFree ? "收起自由改写" : "想改几个字？点开（可选）"}
      </button>

      {showFree ? (
        <label className="block space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] text-[#6f747b]">
              自由改写 · {founderRetell.trim().length} 字
            </span>
            {speech?.supported ? (
              <VoiceMicButton
                active={speech.active}
                supported={speech.supported}
                disabled={pending}
                label="按住说话"
                onPressStart={speech.onPressStart}
                onPressEnd={speech.onPressEnd}
                onClick={
                  speech.onPressStart ? undefined : speech.onToggle
                }
              />
            ) : null}
          </div>
          <textarea
            value={founderRetell}
            onChange={(e) => setFounderRetell(e.target.value)}
            rows={4}
            placeholder="用大白话改：给谁、解决什么、我们是什么、好处、凭什么、跟谁不同"
            className="w-full border border-[rgba(24,24,23,0.1)] bg-[#FBFAF7] px-3 py-2.5 text-[15px] text-[#202124] outline-none focus:border-[#181817]"
          />
        </label>
      ) : null}

      {feedback ? (
        <p
          className={`text-[13px] leading-6 ${
            passed ? "text-[#66735E]" : "text-[#8B4513]"
          }`}
        >
          {feedback}
        </p>
      ) : null}

      {!ready ? (
        <p className="text-[13px] text-[#B47C5C]">再点几题就齐了（{progress}/6）</p>
      ) : null}

      <button
        type="button"
        disabled={pending || !ready || !checklistOk}
        onClick={onSubmit}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 bg-[#181817] px-5 text-[15px] font-semibold text-white disabled:opacity-50 sm:w-auto"
      >
        确认这套店员话术
      </button>
    </div>
  );
}
