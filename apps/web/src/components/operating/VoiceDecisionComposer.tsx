"use client";

import { useEffect, useMemo, useState } from "react";
import {
  HoldToTalkBanner,
  HoldToTalkButton,
} from "@/components/operating/HoldToTalkButton";
import { useSpeechToTextField } from "@/hooks/useSpeechToTextField";

const MAX_SECONDS = 60;

type Props = {
  projectId: string;
  value: string;
  onChange: (value: string) => void;
  /** 有内容时的主操作（进入决策 / 开案） */
  onSubmit?: () => void;
  submitLabel?: string;
  placeholder?: string;
  /** 上传资产标题，便于资料库识别 */
  cloudTitle?: string;
  fieldId?: string;
  rows?: number;
  disabled?: boolean;
  /** 紧凑：用于经营动态主入口 */
  compact?: boolean;
};

/**
 * 决策室语音主体：按住说 → 松手成字 → 可改可再加 → 一键进入。
 * 复用咨询会同一套云端 ASR，不新开 Runtime。
 */
export function VoiceDecisionComposer({
  projectId,
  value,
  onChange,
  onSubmit,
  submitLabel = "进入决策",
  placeholder = "按住右边说，松手成字；不对可改",
  cloudTitle = "决策室·口述议题",
  fieldId = "decision-topic",
  rows = 3,
  disabled,
  compact,
}: Props) {
  const cloud = useMemo(
    () => ({
      projectId,
      title: cloudTitle,
      categorySlug: "decision-review",
    }),
    [cloudTitle, projectId],
  );
  const {
    speechSupported,
    recording,
    uploading,
    speechError,
    startFieldRecording,
    stopRecording,
  } = useSpeechToTextField(cloud);

  const [seconds, setSeconds] = useState(0);

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

  const busy = Boolean(disabled || uploading);
  const hasContent = Boolean(value.trim());

  return (
    <div
      className={`w-full rounded-[16px] border border-[rgba(24,24,23,0.1)] bg-[#FBFAF7] ${
        compact ? "px-2 py-2" : "px-3 py-3"
      }`}
    >
      <HoldToTalkBanner
        recording={recording}
        seconds={seconds}
        maxSeconds={MAX_SECONDS}
        interimText={recording ? value : undefined}
      />
      {uploading ? (
        <p className="mb-1 px-2 text-[12px] leading-5 text-[#66735E]">
          正在听成字…
        </p>
      ) : null}
      {speechError ? (
        <p className="mb-2 px-2 text-[12px] leading-5 text-[#B47C5C]">
          {speechError}
        </p>
      ) : null}
      {!speechSupported ? (
        <p className="mb-2 px-2 text-[12px] leading-5 text-[#B47C5C]">
          当前环境不好用语音，可直接打字；微信里可点 ··· 用系统浏览器打开。
        </p>
      ) : null}

      <div className="flex items-end gap-1.5">
        <div className="min-w-0 flex-1">
          <textarea
            id={fieldId}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={recording ? "正在听你说…" : placeholder}
            rows={rows}
            disabled={busy && !recording}
            className="block min-h-[56px] w-full resize-none rounded-[12px] border-0 bg-transparent px-2 py-2 text-[16px] text-[#202124] placeholder:text-[#9aa0a6] outline-none focus:ring-0 md:text-[15px]"
          />
        </div>
        <HoldToTalkButton
          recording={recording}
          disabled={busy}
          hasContent={false}
          onPressStart={() => {
            void startFieldRecording(fieldId, value, onChange);
          }}
          onPressEnd={() => stopRecording()}
        />
      </div>

      {onSubmit ? (
        <button
          type="button"
          disabled={!hasContent || busy || recording}
          onClick={onSubmit}
          className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-[14px] bg-[#181817] px-4 text-[15px] font-semibold text-white touch-manipulation disabled:cursor-not-allowed disabled:opacity-45"
        >
          {submitLabel}
        </button>
      ) : null}
    </div>
  );
}

/** 从口述文本补齐决策 Brief（缺字段才填，不覆盖用户已写） */
export function deriveDecisionBriefFromSpeech(input: {
  spoken: string;
  topic?: string;
  whyNow?: string;
  decisionQuestion?: string;
  constraints?: string;
  successLooksLike?: string;
}) {
  const spoken = input.spoken.replace(/\s+/g, " ").trim();
  const topic =
    (input.topic || "").trim() ||
    spoken.slice(0, 72) ||
    "今日工作决策";
  return {
    topic,
    whyNow:
      (input.whyNow || "").trim() ||
      (spoken ? spoken.slice(0, 160) : "工作中需要尽快拍板"),
    decisionQuestion:
      (input.decisionQuestion || "").trim() || topic,
    constraints:
      (input.constraints || "").trim() ||
      "不突破现金底线、合规底线与团队稳定",
    successLooksLike:
      (input.successLooksLike || "").trim() ||
      "有明确选择、能执行、能复盘成败",
  };
}
