"use client";

/**
 * 移动端信息采集统一壳：上方色块引导 + 底部固定对话栏
 * 取代「每字段一格 + 每字段一麦」的表单网格。
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import {
  HoldToTalkBanner,
  HoldToTalkButton,
} from "@/components/operating/HoldToTalkButton";
import { useSpeechToTextField } from "@/hooks/useSpeechToTextField";

export type GuidedSlot = {
  id: string;
  label: string;
  prompt: string;
  hint?: string;
  placeholder?: string;
  required?: boolean;
  choices?: Array<{ label: string; value: string }>;
};

type Props = {
  projectId: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  slots: GuidedSlot[];
  values: Record<string, string>;
  onChange: (id: string, value: string) => void;
  busy?: boolean;
  voiceTitle?: string;
  /** 点选项或底栏发送后回调（可写后端）；默认只更新 values */
  onCommitSlot?: (id: string, value: string) => void | Promise<void>;
  completeLabel?: string;
  onComplete?: () => void;
  completePending?: boolean;
  /** 完成按钮额外禁用（如必填未齐） */
  completeDisabled?: boolean;
};

function clip(s: string, n: number) {
  const t = s.trim();
  if (t.length <= n) return t;
  return `${t.slice(0, n - 1)}…`;
}

function isFilled(v: string | undefined, required?: boolean) {
  const t = (v || "").trim();
  if (t.length < 2) return false;
  if (required && (t === "无" || t === "没有")) return false;
  return true;
}

export function GuidedColorIntake({
  projectId,
  eyebrow,
  title,
  subtitle,
  slots,
  values,
  onChange,
  busy,
  voiceTitle = "MealKey经营语音",
  onCommitSlot,
  completeLabel,
  onComplete,
  completePending,
  completeDisabled,
}: Props) {
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);

  const firstOpen = useMemo(() => {
    const open = slots.find(
      (s) => !isFilled(values[s.id], s.required),
    );
    return open?.id || slots[0]?.id || null;
  }, [slots, values]);

  useEffect(() => {
    if (!activeId || !slots.some((s) => s.id === activeId)) {
      setActiveId(firstOpen);
    }
  }, [activeId, firstOpen, slots]);

  const active = slots.find((s) => s.id === activeId) || null;
  const activeIndex = Math.max(
    0,
    slots.findIndex((s) => s.id === activeId),
  );
  const answeredCount = slots.filter((s) =>
    isFilled(values[s.id], s.required),
  ).length;
  const mustOk = slots
    .filter((s) => s.required)
    .every((s) => isFilled(values[s.id], true));
  const allOk = slots.every((s) => isFilled(values[s.id], s.required));

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

  const fieldId = `guided-${activeId || "none"}`;
  const fieldRecording = recording && activeFieldId === fieldId;

  useEffect(() => {
    // 切换题时清空底栏草稿（已记内容在色卡「已记」）
    setDraft("");
  }, [activeId]);

  function focusComposer() {
    window.setTimeout(() => composerRef.current?.focus(), 40);
  }

  function selectSlot(id: string) {
    setActiveId(id);
    focusComposer();
  }

  async function commit(value: string) {
    if (!active || busy) return;
    const v = value.trim();
    if (v.length < 2) return;
    onChange(active.id, v);
    setDraft("");
    if (onCommitSlot) {
      await onCommitSlot(active.id, v);
    }
    const nextValues = { ...values, [active.id]: v };
    const remaining = slots.find(
      (s) => s.id !== active.id && !isFilled(nextValues[s.id], s.required),
    );
    if (remaining) {
      setActiveId(remaining.id);
      focusComposer();
    }
  }

  async function onPickChoice(value: string) {
    await commit(value);
  }

  async function onSend() {
    const text = draft.trim();
    if (!text) return;
    await commit(text);
  }

  if (!slots.length) {
    return (
      <p className="text-[14px] text-[#6f747b]">暂无待采集项。</p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 px-0.5">
        <div className="min-w-0 space-y-0.5">
          {eyebrow ? (
            <p className="text-[11px] font-medium tracking-[0.12em] text-[#5f6b4e]">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="font-serif-cn text-[22px] font-semibold text-[#141413] md:text-[24px]">
            {title}
          </h2>
          {subtitle ? (
            <p className="text-[13px] leading-5 text-[#6f747b]">{subtitle}</p>
          ) : null}
        </div>
        <p className="shrink-0 text-[12px] tabular-nums text-[#8a8680]">
          {answeredCount}/{slots.length}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 px-0.5">
        {slots.map((s, i) => {
          const activeDot = s.id === activeId;
          const answered = isFilled(values[s.id], s.required);
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => selectSlot(s.id)}
              className={`h-2.5 rounded-full transition-all ${
                activeDot
                  ? "w-7 bg-[#5f6b4e]"
                  : answered
                    ? "w-2.5 bg-[rgba(95,107,78,0.45)]"
                    : "w-2.5 bg-[rgba(20,20,19,0.12)]"
              }`}
              aria-label={`第 ${i + 1} 题${activeDot ? "（当前）" : ""}`}
            />
          );
        })}
      </div>

      {active ? (
        <div className="space-y-3 rounded-[20px] border border-[rgba(95,107,78,0.35)] bg-[linear-gradient(165deg,#E8EDE4_0%,#F7F6F2_50%,#FFFFFF_100%)] px-4 py-4 shadow-[0_12px_32px_rgba(95,107,78,0.12)]">
          <p className="text-[11px] font-medium text-[#4a5344]">
            {activeIndex + 1}/{slots.length}
            {active.label ? ` · ${active.label}` : ""}
            {active.required === false ? " · 可跳过" : ""}
          </p>
          <p className="text-[17px] font-semibold leading-6 tracking-[-0.02em] text-[#141413]">
            {active.prompt}
          </p>
          {active.hint ? (
            <p className="text-[12px] leading-5 text-[#6f747b]">{active.hint}</p>
          ) : null}
          {active.choices?.length ? (
            <div className="flex flex-wrap gap-2">
              {active.choices.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={busy}
                  onClick={() => void onPickChoice(opt.value)}
                  className="min-h-11 rounded-[14px] border border-[rgba(20,20,19,0.12)] bg-white px-3.5 py-2 text-[13px] font-medium text-[#141413] shadow-[0_2px_8px_rgba(20,20,19,0.04)] transition active:scale-[0.98] disabled:opacity-50"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : isFilled(values[active.id], active.required) ? (
            <p className="rounded-xl border border-[rgba(95,107,78,0.2)] bg-white/90 px-3 py-2 text-[13px] leading-5 text-[#3a3a38]">
              {values[active.id]}
            </p>
          ) : null}
        </div>
      ) : null}

      {slots.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {slots.map((s, i) => {
            if (s.id === activeId) return null;
            const answered = isFilled(values[s.id], s.required);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => selectSlot(s.id)}
                className="min-w-[6.5rem] shrink-0 rounded-2xl border border-[rgba(20,20,19,0.08)] bg-white px-3 py-2.5 text-left"
              >
                <p className="text-[10px] text-[#9a968e]">
                  {answered ? "已记" : i + 1}
                </p>
                <p className="mt-0.5 line-clamp-2 text-[12px] leading-4 text-[#3a3a38]">
                  {s.label || clip(s.prompt, 18)}
                </p>
              </button>
            );
          })}
        </div>
      ) : null}

      {completeLabel && onComplete && (mustOk || allOk) ? (
        <button
          type="button"
          disabled={busy || completePending || completeDisabled || !mustOk}
          onClick={() => onComplete()}
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-[#141413] px-6 text-[15px] font-semibold text-white disabled:opacity-40"
        >
          {completePending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
          {completeLabel}
        </button>
      ) : null}

      {/* 底栏固定对话 */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[rgba(20,20,19,0.08)] bg-[#F7F6F2]/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md md:sticky md:inset-x-auto md:bottom-auto md:z-0 md:mt-2 md:border md:border-[rgba(20,20,19,0.08)] md:bg-white md:px-3 md:pb-3 md:pt-3 md:backdrop-blur-none">
        <div className="mx-auto max-w-3xl">
          <HoldToTalkBanner
            recording={fieldRecording}
            seconds={recordingSeconds}
            maxSeconds={maxVoiceSeconds}
            tip={
              speechError ||
              (speechUploading
                ? "正在听成字…"
                : !speechSupported
                  ? "语音受限时可打字"
                  : null)
            }
          />
          <div className="flex items-end gap-1.5 rounded-[28px] border border-[rgba(20,20,19,0.1)] bg-white px-1.5 py-1.5 shadow-[0_8px_28px_rgba(20,20,19,0.06)]">
            <textarea
              ref={composerRef}
              value={draft}
              disabled={busy || speechUploading}
              rows={1}
              placeholder={
                fieldRecording
                  ? "正在听你说…"
                  : active?.placeholder || "按住说话，或打字"
              }
              onChange={(e) => setDraft(e.target.value)}
              className="max-h-28 min-h-[48px] flex-1 resize-none bg-transparent px-2 py-3 text-[15px] leading-6 text-[#141413] outline-none placeholder:text-[#9a968e]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void onSend();
                }
              }}
            />
            {busy && !fieldRecording ? (
              <div className="flex h-12 w-12 items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin text-[#5f6b4e]" />
              </div>
            ) : (
              <HoldToTalkButton
                recording={fieldRecording}
                disabled={Boolean(busy || speechUploading)}
                hasContent={draft.trim().length >= 2}
                onSend={() => void onSend()}
                onPressStart={() => {
                  void startFieldRecording(fieldId, draft, setDraft);
                }}
                onPressEnd={() => stopRecording()}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
