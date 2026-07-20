"use client";

import { Mic, Square } from "lucide-react";

export type ModuleIntakeField = {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
};

export function ModuleIntakeCard({
  title,
  description,
  fields,
  recordingFieldId,
  speechSupported,
  speechError,
  onStartVoiceField,
  onStopVoiceField,
  onToggleVoiceField,
  onApply,
  applyLabel = "写入判断区",
}: {
  title: string;
  description: string;
  fields: ModuleIntakeField[];
  recordingFieldId?: string | null;
  speechSupported?: boolean;
  speechError?: string | null;
  /** 按住说话（推荐） */
  onStartVoiceField?: (field: ModuleIntakeField) => void;
  onStopVoiceField?: () => void;
  /** 兼容旧点一下开关 */
  onToggleVoiceField?: (field: ModuleIntakeField) => void;
  onApply: () => void;
  applyLabel?: string;
}) {
  const holdMode = Boolean(onStartVoiceField && onStopVoiceField);

  return (
    <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_14px_28px_rgba(24,24,23,0.04)]">
      <div className="flex flex-col gap-1.5">
        <p className="text-[13px] leading-5 tracking-[0.01em] text-[#66735E]">
          最少信息收集 · 可按住说话
        </p>
        <h3 className="text-[18px] font-semibold leading-[1.25] tracking-[-0.02em] text-[#202124]">
          {title}
        </h3>
        <p className="text-[13px] leading-6 text-[#6f747b]">{description}</p>
      </div>

      <div className="mt-4 space-y-3">
        {fields.map((field) => {
          const active = recordingFieldId === field.id;
          const canVoice =
            speechSupported &&
            (holdMode || Boolean(onToggleVoiceField));
          return (
            <label key={field.id} className="block space-y-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] leading-5 tracking-[0.01em] text-[#66735E]">
                  {field.label}
                </span>
                {canVoice ? (
                  <button
                    type="button"
                    disabled={false}
                    className={`inline-flex min-h-10 touch-none select-none items-center justify-center gap-2 rounded-full px-3 py-2 text-[12px] transition active:scale-[0.98] ${
                      active
                        ? "bg-[#07C160] text-white"
                        : "border border-[rgba(24,24,23,0.08)] bg-[#F5F3EE] text-[#202124]"
                    }`}
                    aria-label={active ? `松开结束${field.label}` : `按住说${field.label}`}
                    title={active ? "松开结束" : "按住说话，松手转成字"}
                    onClick={
                      holdMode
                        ? undefined
                        : () => onToggleVoiceField?.(field)
                    }
                    onPointerDown={
                      holdMode
                        ? (e) => {
                            e.preventDefault();
                            try {
                              e.currentTarget.setPointerCapture(e.pointerId);
                            } catch {
                              /* ignore */
                            }
                            onStartVoiceField?.(field);
                          }
                        : undefined
                    }
                    onPointerUp={
                      holdMode
                        ? (e) => {
                            try {
                              e.currentTarget.releasePointerCapture(e.pointerId);
                            } catch {
                              /* ignore */
                            }
                            onStopVoiceField?.();
                          }
                        : undefined
                    }
                    onPointerCancel={
                      holdMode ? () => onStopVoiceField?.() : undefined
                    }
                    onContextMenu={(e) => e.preventDefault()}
                  >
                    {active ? (
                      <Square className="h-3.5 w-3.5" />
                    ) : (
                      <Mic className="h-3.5 w-3.5" />
                    )}
                    {active ? "松手结束" : "按住说话"}
                  </button>
                ) : null}
              </div>
              <textarea
                value={field.value}
                onChange={(event) => field.onChange(event.target.value)}
                rows={field.rows ?? 2}
                className="w-full resize-none rounded-[16px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-4 py-3 text-[16px] leading-[1.7] text-[#202124] outline-none focus:border-[#66735E]"
                placeholder={field.placeholder}
              />
            </label>
          );
        })}
      </div>

      {speechError ? (
        <p className="mt-3 text-[12px] leading-5 text-[#B47C5C]">{speechError}</p>
      ) : null}

      <div className="mt-4 flex items-center justify-end">
        <button
          type="button"
          onClick={onApply}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#181817] px-5 py-2 text-[13px] font-medium text-white transition active:scale-[0.98]"
        >
          {applyLabel}
        </button>
      </div>
    </section>
  );
}
