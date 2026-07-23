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

/**
 * 微信式按住说话：按下开始，松开结束。
 * 有文字时麦克风仍保留，旁边再出发送（方便接着说第二段）。
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
        className={`relative inline-flex min-h-11 min-w-11 touch-none select-none items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${
          recording
            ? "animate-pulse bg-[#07C160] text-white shadow-[0_0_0_4px_rgba(7,193,96,0.22)]"
            : hasContent
              ? "border border-[rgba(24,24,23,0.14)] bg-white text-[#181817] active:scale-95"
              : "bg-[#181817] text-white shadow-[0_6px_16px_rgba(24,24,23,0.18)] active:scale-95"
        }`}
        aria-label={recording ? "松开结束说话" : "按住说话"}
        title={recording ? "松开结束" : "按住说话，松手结束"}
        onPointerDown={(e) => {
          if (disabled) return;
          e.preventDefault();
          pressingRef.current = true;
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            // ignore
          }
          onPressStart();
        }}
        onPointerUp={(e) => {
          if (!pressingRef.current) return;
          pressingRef.current = false;
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {
            // ignore
          }
          onPressEnd();
        }}
        onPointerCancel={() => {
          if (!pressingRef.current) return;
          pressingRef.current = false;
          onPressEnd();
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
            正在听你说… 松手就结束
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
              随便说，说完松手；字不对可以改
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
