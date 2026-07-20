"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Volume2, VolumeX } from "lucide-react";
import {
  HoldToTalkBanner,
  HoldToTalkButton,
} from "@/components/operating/HoldToTalkButton";
import { useSpeechToTextField } from "@/hooks/useSpeechToTextField";
import type { DecisionVoiceBrief } from "@/lib/decision-voice-brief";
import { deriveDecisionBriefFromSpeech } from "@/components/operating/VoiceDecisionComposer";

const MAX_SECONDS = 60;

type StepId = "topic" | "whyNow" | "constraints" | "success";

type Step = {
  id: StepId;
  title: string;
  prompt: string;
  hint: string;
};

const STEPS: Step[] = [
  {
    id: "topic",
    title: "决什么",
    prompt: "你现在纠结要拍什么板？像跟同事说话一样说就行。",
    hint: "例如：要不要换掉两道滞销菜",
  },
  {
    id: "whyNow",
    title: "为何现在",
    prompt: "为什么今天或这几天必须定？晚定会怎样？",
    hint: "例如：周末客流要来了，菜单得先定",
  },
  {
    id: "constraints",
    title: "底线",
    prompt: "有什么不能碰的底线？钱、人、时间、口碑都可以说。",
    hint: "例如：库存别浪费太多，厨房别再加人手",
  },
  {
    id: "success",
    title: "做成什么样",
    prompt: "做成了，你希望两周后看到什么结果？",
    hint: "例如：滞销菜占比下去，客诉不升",
  },
];

function speakPrompt(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "zh-CN";
    u.rate = 1.05;
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
}

function stopSpeak() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* ignore */
  }
}

type Props = {
  projectId: string;
  /** 系统建议题，可预填第一步 */
  seedTopic?: string;
  disabled?: boolean;
  onComplete: (brief: DecisionVoiceBrief) => void;
  /** 完成按钮文案 */
  completeLabel?: string;
};

/**
 * 手机优先：语音对话引导采集决策信息 → 输出 Brief。
 * 不新开 Runtime；ASR 复用既有云端能力；提示音用浏览器 TTS。
 */
export function VoiceDecisionDialogue({
  projectId,
  seedTopic,
  disabled,
  onComplete,
  completeLabel = "信息齐了，开始决策",
}: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [answers, setAnswers] = useState<Partial<Record<StepId, string>>>({
    topic: seedTopic?.trim() || "",
  });
  const [phase, setPhase] = useState<"talk" | "summary">("talk");
  const [voiceGuide, setVoiceGuide] = useState(true);
  const [seconds, setSeconds] = useState(0);

  const cloud = useMemo(
    () => ({
      projectId,
      title: `决策对话·第${stepIndex + 1}轮`,
      categorySlug: "decision-review" as const,
    }),
    [projectId, stepIndex],
  );

  const {
    speechSupported,
    recording,
    uploading,
    speechError,
    startFieldRecording,
    stopRecording,
  } = useSpeechToTextField(cloud);

  const step = STEPS[stepIndex]!;
  const fieldId = `voice-dialogue-${step.id}`;
  const progress = `${stepIndex + 1} / ${STEPS.length}`;

  useEffect(() => {
    if (phase !== "talk") return;
    if (!voiceGuide) return;
    const t = window.setTimeout(() => speakPrompt(step.prompt), 280);
    return () => {
      window.clearTimeout(t);
      stopSpeak();
    };
  }, [phase, step.prompt, stepIndex, voiceGuide]);

  useEffect(() => {
    if (!recording) {
      setSeconds(0);
      return;
    }
    const started = Date.now();
    const id = window.setInterval(() => {
      setSeconds(Math.min(MAX_SECONDS, Math.floor((Date.now() - started) / 1000)));
    }, 250);
    return () => window.clearInterval(id);
  }, [recording]);

  // 进入某步时，带上已答内容便于续说
  useEffect(() => {
    if (phase !== "talk") return;
    setDraft(answers[step.id] || "");
  }, [answers, phase, step.id]);

  const commitStep = useCallback(() => {
    const text = draft.trim();
    if (!text) return;
    stopSpeak();
    const nextAnswers = { ...answers, [step.id]: text };
    setAnswers(nextAnswers);
    if (stepIndex >= STEPS.length - 1) {
      setPhase("summary");
      return;
    }
    setStepIndex((i) => i + 1);
    setDraft("");
  }, [answers, draft, step.id, stepIndex]);

  const brief: DecisionVoiceBrief = useMemo(() => {
    const derived = deriveDecisionBriefFromSpeech({
      spoken: [answers.topic, answers.whyNow, answers.constraints, answers.success]
        .filter(Boolean)
        .join("；"),
      topic: answers.topic,
      whyNow: answers.whyNow,
      decisionQuestion: answers.topic,
      constraints: answers.constraints,
      successLooksLike: answers.success,
    });
    return {
      ...derived,
      spokenTurns: STEPS.map((s) => answers[s.id] || "").filter(Boolean),
    };
  }, [answers]);

  const busy = Boolean(disabled || uploading || recording);

  if (phase === "summary") {
    return (
      <div className="space-y-4 rounded-[16px] border border-[rgba(24,24,23,0.1)] bg-[#FBFAF7] p-4">
        <p className="text-[11px] tracking-[0.12em] text-[#66735E]">
          事项已齐 · 可以判断了
        </p>
        <h3 className="font-display text-[20px] font-semibold leading-snug text-[#202124]">
          {brief.topic}
        </h3>
        <ul className="space-y-2 text-[13px] leading-6 text-[#3a3d41]">
          <li>
            <span className="text-[#6f747b]">为何现在 · </span>
            {brief.whyNow}
          </li>
          <li>
            <span className="text-[#6f747b]">底线 · </span>
            {brief.constraints}
          </li>
          <li>
            <span className="text-[#6f747b]">做成什么样 · </span>
            {brief.successLooksLike}
          </li>
        </ul>
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            disabled={disabled}
            onClick={() => onComplete(brief)}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#181817] px-4 text-[15px] font-semibold text-white touch-manipulation disabled:opacity-50"
          >
            {completeLabel}
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setPhase("talk");
              setStepIndex(0);
            }}
            className="inline-flex min-h-12 items-center justify-center rounded-[14px] border border-[rgba(24,24,23,0.12)] bg-white px-4 text-[14px] font-medium text-[#181817] touch-manipulation"
          >
            再采一轮
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-[16px] border border-[rgba(24,24,23,0.1)] bg-[#FBFAF7] p-3 md:p-4">
      <div className="flex items-start justify-between gap-2 px-1">
        <div className="min-w-0">
          <p className="text-[11px] tracking-[0.12em] text-[#66735E]">
            语音采集 · {progress}
          </p>
          <p className="mt-1 text-[12px] text-[#6f747b]">
            我问一句，你说一句
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const next = !voiceGuide;
            setVoiceGuide(next);
            if (!next) stopSpeak();
            else speakPrompt(step.prompt);
          }}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-[rgba(24,24,23,0.1)] bg-white text-[#202124] touch-manipulation"
          aria-label={voiceGuide ? "关闭语音引导" : "打开语音引导"}
          title={voiceGuide ? "关闭语音引导" : "打开语音引导"}
        >
          {voiceGuide ? (
            <Volume2 className="h-4 w-4" />
          ) : (
            <VolumeX className="h-4 w-4" />
          )}
        </button>
      </div>

      <div className="rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-white px-4 py-3">
        <p className="text-[11px] tracking-[0.08em] text-[#66735E]">
          {step.title}
        </p>
        <p className="mt-1.5 text-[16px] font-medium leading-7 text-[#202124]">
          {step.prompt}
        </p>
        <p className="mt-1 text-[12px] leading-5 text-[#6f747b]">{step.hint}</p>
      </div>

      <div className="flex gap-1.5 px-1">
        {STEPS.map((s, i) => (
          <span
            key={s.id}
            className={`h-1.5 flex-1 rounded-full ${
              i < stepIndex
                ? "bg-[#66735E]"
                : i === stepIndex
                  ? "bg-[#181817]"
                  : "bg-[rgba(24,24,23,0.08)]"
            }`}
          />
        ))}
      </div>

      <HoldToTalkBanner
        recording={recording}
        seconds={seconds}
        maxSeconds={MAX_SECONDS}
        interimText={recording ? draft : undefined}
      />
      {uploading ? (
        <p className="px-1 text-[12px] text-[#66735E]">正在听成字…</p>
      ) : null}
      {speechError ? (
        <p className="px-1 text-[12px] text-[#B47C5C]">{speechError}</p>
      ) : null}
      {!speechSupported ? (
        <p className="px-1 text-[12px] text-[#B47C5C]">
          当前环境不好用语音，可临时打几个字；微信里建议 ··· → 系统浏览器。
        </p>
      ) : null}

      <div className="flex items-end gap-1.5">
        <textarea
          id={fieldId}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          placeholder={recording ? "正在听你说…" : "按住右边说，字会出现在这里"}
          disabled={busy && !recording}
          className="min-h-[72px] w-full resize-none rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 py-2 text-[16px] text-[#202124] outline-none placeholder:text-[#9aa0a6] md:text-[15px]"
        />
        <HoldToTalkButton
          recording={recording}
          disabled={Boolean(disabled || uploading)}
          hasContent={Boolean(draft.trim())}
          onSend={commitStep}
          onPressStart={() => {
            stopSpeak();
            void startFieldRecording(fieldId, draft, setDraft);
          }}
          onPressEnd={() => stopRecording()}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={!draft.trim() || busy}
          onClick={commitStep}
          className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#181817] px-4 text-[15px] font-semibold text-white touch-manipulation disabled:cursor-not-allowed disabled:opacity-45"
        >
          {stepIndex >= STEPS.length - 1 ? "采齐了，看摘要" : "说完了，下一问"}
          <ArrowRight className="h-4 w-4" />
        </button>
        {stepIndex > 0 ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              stopSpeak();
              setStepIndex((i) => Math.max(0, i - 1));
            }}
            className="inline-flex min-h-12 items-center justify-center rounded-[14px] border border-[rgba(24,24,23,0.12)] bg-white px-4 text-[14px] text-[#181817] touch-manipulation"
          >
            上一问
          </button>
        ) : null}
        {stepIndex > 0 ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              const fallback =
                step.id === "whyNow"
                  ? "工作中需要尽快拍板"
                  : step.id === "constraints"
                    ? "不突破现金底线、合规底线与团队稳定"
                    : "有明确选择、能执行、能复盘成败";
              const text = (answers[step.id] || fallback).trim();
              const nextAnswers = { ...answers, [step.id]: text };
              setAnswers(nextAnswers);
              stopSpeak();
              if (stepIndex >= STEPS.length - 1) {
                setPhase("summary");
                return;
              }
              setStepIndex((i) => i + 1);
              setDraft("");
            }}
            className="inline-flex min-h-12 items-center justify-center rounded-[14px] px-3 text-[13px] text-[#6f747b] touch-manipulation"
          >
            这问先跳过
          </button>
        ) : null}
      </div>
    </div>
  );
}
