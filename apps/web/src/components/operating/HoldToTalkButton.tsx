"use client";

import { useRef } from "react";
import { Mic, Send, Square } from "lucide-react";

type Props = {
  recording: boolean;
  disabled?: boolean;
  /** 输入框已有内容时显示发送，而不是麦 */
  hasContent?: boolean;
  onSend?: () => void;
  onPressStart: () => void;
  onPressEnd: () => void;
  className?: string;
};

/** 短于此时长视为点按切换；更长视为按住说话 */
const TOGGLE_CLICK_MS = 280;

/**
 * 微信式按住说话：按下开始，松开结束。
 * 桌面补充：短点按 / 空格 / Enter 切换录音（键盘可达）。
 */
export function HoldToTalkButton({
  recording,
  disabled,
  hasContent,
  onSend,
  onPressStart,
  onPressEnd,
  className = "",
}: Props) {
  const pressingRef = useRef(false);
  const pressStartedAtRef = useRef(0);
  /** 点按/键盘进入的切换模式：松开指针不结束，需再点一次 */
  const toggleModeRef = useRef(false);

  const beginRecord = () => {
    if (disabled && !recording) return;
    onPressStart();
  };

  const endRecord = () => {
    onPressEnd();
    toggleModeRef.current = false;
  };

  const toggleRecord = () => {
    if (recording) {
      endRecord();
      return;
    }
    if (disabled) return;
    toggleModeRef.current = true;
    beginRecord();
  };

  return (
    <div className={`inline-flex shrink-0 items-center gap-1.5 ${className}`}>
      {!recording && hasContent ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onSend?.()}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-[#181817] text-white transition disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="发送"
        >
          <Send className="h-4 w-4" />
        </button>
      ) : null}
      <button
        type="button"
        disabled={disabled && !recording}
        aria-pressed={recording}
        className={`relative inline-flex min-h-11 min-w-11 touch-none select-none items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${
          recording
            ? "animate-pulse bg-[#07C160] text-white shadow-[0_0_0_4px_rgba(7,193,96,0.22)]"
            : hasContent
              ? "border border-[rgba(24,24,23,0.14)] bg-white text-[#181817] active:scale-95"
              : "bg-[#181817] text-white shadow-[0_6px_16px_rgba(24,24,23,0.18)] active:scale-95"
        }`}
        aria-label={
          recording
            ? "结束说话（再点一次或按空格）"
            : "按住说话，或点按/空格开始"
        }
        title={
          recording
            ? "再点一次或按空格结束"
            : "按住说话松手结束；也可点按或按空格切换"
        }
        onPointerDown={(e) => {
          if (disabled && !recording) return;
          // 切换模式录音中：再点结束
          if (recording && toggleModeRef.current) {
            e.preventDefault();
            endRecord();
            return;
          }
          e.preventDefault();
          pressingRef.current = true;
          pressStartedAtRef.current = Date.now();
          toggleModeRef.current = false;
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // ignore
          }
          if (!recording) beginRecord();
        }}
        onPointerUp={(e) => {
          if (!pressingRef.current) return;
          pressingRef.current = false;
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {
            // ignore
          }
          const heldMs = Date.now() - pressStartedAtRef.current;
          if (heldMs < TOGGLE_CLICK_MS) {
            // 短点：保持录音，进入切换模式
            toggleModeRef.current = true;
            return;
          }
          if (recording) endRecord();
        }}
        onPointerCancel={() => {
          if (!pressingRef.current) return;
          pressingRef.current = false;
          if (recording && !toggleModeRef.current) endRecord();
        }}
        onKeyDown={(e) => {
          if (e.key !== " " && e.key !== "Enter") return;
          e.preventDefault();
          if (e.repeat) return;
          toggleRecord();
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </button>
    </div>
  );
}

type BannerProps = {
  recording: boolean;
  seconds: number;
  maxSeconds: number;
  interimText?: string;
  tip?: string | null;
  onDismissTip?: () => void;
};

/** 录音中顶部提示条 */
export function HoldToTalkBanner({
  recording,
  seconds,
  maxSeconds,
  interimText,
  tip,
  onDismissTip,
}: BannerProps) {
  if (!recording && !tip) return null;
  return (
    <div className="mb-2 space-y-1.5">
      {tip ? (
        <div className="flex items-start justify-between gap-2 rounded-[14px] border border-[rgba(180,124,92,0.25)] bg-[rgba(180,124,92,0.08)] px-3 py-2 text-[13px] leading-5 text-[#8a5a3c]">
          <p>{tip}</p>
          {onDismissTip ? (
            <button
              type="button"
              onClick={onDismissTip}
              className="shrink-0 text-[12px] underline"
            >
              知道了
            </button>
          ) : null}
        </div>
      ) : null}
      {recording ? (
        <div className="rounded-[14px] border border-[rgba(7,193,96,0.35)] bg-[rgba(7,193,96,0.1)] px-3 py-2.5">
          <p className="text-[14px] font-semibold text-[#0a7a40]">
            正在听你说…
            <span className="ml-2 font-normal text-[#3d8f5f]">
              {seconds}s / {maxSeconds}s
            </span>
          </p>
          {interimText ? (
            <p className="mt-1 line-clamp-2 text-[13px] leading-5 text-[#2f6b48]">
              {interimText}
            </p>
          ) : (
            <p className="mt-1 text-[12px] text-[#3d8f5f]">
              按住则松手结束；点按或空格再点一次结束
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
