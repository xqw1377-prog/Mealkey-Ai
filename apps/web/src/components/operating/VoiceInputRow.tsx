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
    "min-h-12 w-full bg-transparent px-3 text-[15px] text-[#181817] outline-none placeholder:text-[#9a968e]";

  return (
    <div className={`space-y-2 ${className}`}>
      <HoldToTalkBanner
        recording={fieldRecording}
        seconds={recordingSeconds}
        maxSeconds={maxVoiceSeconds}
        tip={tip}
      />
      <div
        className={`flex items-end gap-1.5 rounded-[20px] border border-[rgba(24,24,23,0.12)] bg-white px-1.5 py-1.5 shadow-[0_8px_22px_rgba(24,24,23,0.06)] transition-shadow ${
          fieldRecording
            ? "border-[rgba(7,193,96,0.45)] bg-[rgba(7,193,96,0.06)]"
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
            className={`${sharedClass} max-h-28 resize-none py-3`}
          />
        ) : (
          <input
            value={value}
            disabled={disabled || speechUploading}
            placeholder={
              fieldRecording ? "正在听你说…" : placeholder
            }
            onChange={(e) => onChange(e.target.value)}
            className={sharedClass}
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
          className="inline-flex min-h-12 w-full items-center justify-center rounded-[16px] bg-[#181817] px-4 text-[14px] font-semibold text-white disabled:opacity-40 sm:hidden"
        >
          {submitLabel}
        </button>
      ) : (
        <p className="text-[11px] leading-4 text-[#9a968e] lg:hidden">
          按住说话松手写入；也可点按/空格切换，或直接打字
        </p>
      )}
    </div>
  );
}
