"use client";

import { useEffect, useId, useRef } from "react";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** 破坏性操作用危险色主按钮 */
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * 可访问确认层 — 替代 window.confirm
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "确定",
  cancelLabel = "取消",
  danger,
  busy,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        e.preventDefault();
        onCancel();
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prev?.focus?.();
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="关闭"
        className="absolute inset-0 bg-[rgba(24,24,23,0.45)]"
        disabled={busy}
        onClick={() => {
          if (!busy) onCancel();
        }}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        className="relative z-[1] w-full max-w-md border border-[rgba(24,24,23,0.10)] bg-[#FBFAF7] px-5 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] pt-5 shadow-[0_-12px_40px_rgba(20,20,19,0.12)] sm:p-5 sm:shadow-none"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[rgba(24,24,23,0.12)] sm:hidden" />
        <p
          id={titleId}
          className="font-display text-[20px] font-semibold tracking-[-0.03em] text-[#202124]"
        >
          {title}
        </p>
        {description ? (
          <p id={descId} className="mt-2 text-[14px] leading-7 text-[#6f747b]">
            {description}
          </p>
        ) : null}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="inline-flex min-h-12 items-center justify-center border border-[rgba(24,24,23,0.12)] bg-white px-4 text-[14px] font-medium text-[#202124] touch-manipulation disabled:opacity-50 sm:min-h-11"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`inline-flex min-h-12 items-center justify-center px-4 text-[14px] font-semibold text-white touch-manipulation active:scale-[0.98] disabled:opacity-50 sm:min-h-11 ${
              danger ? "bg-[#B47C5C]" : "bg-[#181817]"
            }`}
          >
            {busy ? "处理中…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
