"use client";

/**
 * 移动端语音优先输入行：打字 + 按住说话（有字仍保留麦）
 * 咨询席 / 经营画像等长表单复用，避免每页自研 pointer 逻辑。
 */

import { HoldToTalkBanner, HoldToTalkButton } from "@/components/operating/HoldToTalkButton";
import { useSpeechToTextField } from "@/hooks/useSpeechToTextField";

type Props = {
  projectId: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  disabled?: boolean;
  /** 云端 ASR 标题（含场景词便于审计） */
  voiceTitle?: string;
  /** 同页多字段时需唯一，避免录音态串扰 */
  fieldId?: string;
  multiline?: boolean;
  rows?: number;
  className?: string;
  inputClassName?: string;
  onSubmit?: () => void;
  submitLabel?: string;
  showSubmit?: boolean;
};

export function VoiceInputRow({
  projectId,
  value,
  onChange,
  placeholder = "按住说话，或打字",
  disabled,
  voiceTitle = "MealKey经营语音",
  fieldId = "voice-input-row",
  multiline,
  rows = 2,
  className = "",
  inputClassName = "",
  onSubmit,
  submitLabel = "提交",
  showSubmit,
}: Props) {
  const {
    speechSupported,
    recording,
    uploading: speechUploading,
    speechError,
    recordingSeconds,
    maxVoiceSeconds,
    activeFieldId,
    startFieldRecording,
    stopRecording,
  } = useSpeechToTextField({
    projectId,
    title: voiceTitle,
  });

  const fieldRecording = recording && activeFieldId === fieldId;
  const tip =
    speechError ||
    (!speechSupported
      ? "语音受限时可打字；微信请用系统浏览器打开以启用麦克风"
      : null);

  const sharedClass =
    inputClassName ||
    "min-h-12 w-full border border-[rgba(20,20,19,0.12)] bg-white px-3 text-[15px] outline-none focus:border-[#141413]";

  return (
    <div className={`space-y-2 ${className}`}>
      <HoldToTalkBanner
        recording={fieldRecording}
        seconds={recordingSeconds}
        maxSeconds={maxVoiceSeconds}
        tip={tip}
      />
      <div
        className={`flex items-end gap-2 rounded-[16px] p-1 transition-shadow ${
          fieldRecording
            ? "bg-[rgba(7,193,96,0.06)] shadow-[0_0_0_1px_rgba(7,193,96,0.35)]"
            : ""
        }`}
      >
        {multiline ? (
          <textarea
            value={value}
            disabled={disabled || speechUploading}
            rows={rows}
            placeholder={
              fieldRecording ? "正在听你说…" : placeholder
            }
            onChange={(e) => onChange(e.target.value)}
            className={`${sharedClass} resize-none rounded-[12px] py-3 ${
              fieldRecording
                ? "border-[#07C160] ring-2 ring-[rgba(7,193,96,0.18)]"
                : ""
            }`}
          />
        ) : (
          <input
            value={value}
            disabled={disabled || speechUploading}
            placeholder={
              fieldRecording ? "正在听你说…" : placeholder
            }
            onChange={(e) => onChange(e.target.value)}
            className={`${sharedClass} rounded-[12px] ${
              fieldRecording
                ? "border-[#07C160] ring-2 ring-[rgba(7,193,96,0.18)]"
                : ""
            }`}
            onKeyDown={(e) => {
              if (e.key === "Enter" && onSubmit) {
                e.preventDefault();
                onSubmit();
              }
            }}
          />
        )}
        <HoldToTalkButton
          recording={fieldRecording}
          disabled={Boolean(disabled || speechUploading)}
          hasContent={Boolean(value.trim()) && Boolean(showSubmit && onSubmit)}
          onSend={onSubmit}
          onPressStart={() => {
            void startFieldRecording(fieldId, value, onChange);
          }}
          onPressEnd={() => stopRecording()}
        />
      </div>
      {showSubmit && onSubmit ? (
        <button
          type="button"
          disabled={disabled || value.trim().length < 1}
          onClick={onSubmit}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-[14px] bg-[#141413] px-4 text-[14px] font-semibold text-white disabled:opacity-40 sm:hidden"
        >
          {submitLabel}
        </button>
      ) : (
        <p className="text-[11px] leading-4 text-[#5c6168] lg:hidden">
          按住黑色麦克风说话，松手写入；也可直接打字。
        </p>
      )}
    </div>
  );
}
