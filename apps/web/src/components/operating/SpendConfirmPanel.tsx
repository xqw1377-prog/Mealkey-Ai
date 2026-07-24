"use client";

import { useEffect, useId, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import {
  formatPoints,
  humanizeWalletError,
  isWalletPaywallError,
  type SpendOffer,
} from "@/lib/business-wallet";

type Props = {
  offer: SpendOffer;
  balance: number;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
};

/**
 * 消耗确认 — dialog 层；用户感知：购买一次专业判断
 */
export function SpendConfirmPanel({
  offer,
  balance,
  loading,
  error,
  onConfirm,
  onCancel,
  confirmLabel = "进入决策室",
}: Props) {
  const titleId = useId();
  const descId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const insufficient = balance < offer.cost || isWalletPaywallError(error);
  const displayError = error
    ? humanizeWalletError(error, offer.cost, balance)
    : balance < offer.cost
      ? `当前经营点不足\n本次分析需要：${formatPoints(offer.cost)}点\n余额：${formatPoints(balance)}`
      : null;

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const focusable = panelRef.current?.querySelector<HTMLElement>(
      "button:not([disabled]), a[href]",
    );
    focusable?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading && onCancel) {
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
  }, [loading, onCancel]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="关闭消耗确认"
        className="absolute inset-0 bg-[rgba(24,24,23,0.45)]"
        disabled={loading}
        onClick={() => {
          if (!loading) onCancel?.();
        }}
      />
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative z-[1] flex max-h-[min(92dvh,40rem)] w-full max-w-lg flex-col border border-[rgba(24,24,23,0.08)] bg-white shadow-[0_-12px_40px_rgba(20,20,19,0.12)] sm:max-h-[min(88vh,40rem)] sm:shadow-none"
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-[rgba(24,24,23,0.12)] sm:hidden" />
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 pb-3 pt-4 md:space-y-6 md:px-8 md:pt-8">
          <header className="space-y-2">
            <p className="text-[12px] tracking-[0.1em] text-[#66735E]">确认消耗</p>
            <h2
              id={titleId}
              className="font-display text-[24px] font-semibold tracking-[-0.03em] text-[#202124] md:text-[26px]"
            >
              {offer.title}
            </h2>
            <p id={descId} className="text-[14px] leading-6 text-[#6f747b]">
              {offer.committee}
            </p>
          </header>

          <div className="border-y border-[rgba(24,24,23,0.08)] py-4 md:py-5">
            <p className="text-[12px] tracking-[0.08em] text-[#6f747b]">本次</p>
            <p className="mt-2 font-display text-[32px] font-semibold tracking-[-0.04em] text-[#202124]">
              {formatPoints(offer.cost)}
              <span className="ml-2 text-[15px] font-normal text-[#6f747b]">点</span>
            </p>
            <p className="mt-2 text-[13px] text-[#66735E]">{offer.capabilityLift}</p>
          </div>

          <div>
            <p className="text-[12px] tracking-[0.08em] text-[#6f747b]">你会得到</p>
            <ul className="mt-3 space-y-2">
              {offer.includes.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-[15px] leading-6 text-[#202124]"
                >
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#66735E]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[14px] text-[#6f747b]">
            余额：
            <span className="ml-1 font-medium text-[#202124]">
              {formatPoints(balance)}
            </span>
          </p>

          {displayError ? (
            <div className="whitespace-pre-line border border-[rgba(180,124,92,0.25)] bg-[rgba(180,124,92,0.08)] px-4 py-3 text-[14px] leading-6 text-[#B47C5C]">
              {displayError}
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-[rgba(24,24,23,0.08)] bg-white px-5 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-3 md:px-8 md:pb-8 md:pt-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            {insufficient ? (
              <Link
                href="/billing?tab=recharge"
                prefetch={false}
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 bg-[#181817] px-5 text-[15px] font-semibold text-white no-underline touch-manipulation active:scale-[0.98]"
              >
                去充值
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={onConfirm}
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 bg-[#181817] px-5 text-[15px] font-semibold text-white touch-manipulation active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? "进入中…" : confirmLabel}
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
            {onCancel ? (
              <button
                type="button"
                disabled={loading}
                onClick={onCancel}
                className="inline-flex min-h-11 items-center justify-center border border-[rgba(24,24,23,0.12)] bg-white px-4 text-[14px] font-medium text-[#6f747b] touch-manipulation sm:border-0"
              >
                取消
              </button>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

type RefundProps = {
  points: number;
  onClose?: () => void;
};

export function SpendRefundNotice({ points, onClose }: RefundProps) {
  return (
    <section className="mx-auto max-w-lg border border-[rgba(102,115,94,0.25)] bg-[rgba(102,115,94,0.08)] p-5">
      <p className="text-[15px] font-medium text-[#202124]">未完成，已退点</p>
      <p className="mt-2 text-[14px] leading-6 text-[#66735E]">
        已退回 {formatPoints(points)} 点
      </p>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="mt-4 inline-flex min-h-11 items-center text-[14px] font-medium text-[#181817] touch-manipulation"
        >
          知道了
        </button>
      ) : null}
    </section>
  );
}

type ReceiptProps = {
  spent: number;
  balanceAfter: number;
  gainedHint?: string;
  onClose?: () => void;
};

export function SpendReceiptNotice({
  spent,
  balanceAfter,
  gainedHint = "判断、建议动作与验证计划",
  onClose,
}: ReceiptProps) {
  return (
    <section className="mx-auto max-w-lg border border-[rgba(24,24,23,0.08)] bg-[#F8F7F3] p-5">
      <p className="text-[12px] tracking-[0.08em] text-[#66735E]">已扣</p>
      <p className="mt-2 font-display text-[28px] font-semibold tracking-[-0.03em] text-[#202124]">
        {formatPoints(spent)}
        <span className="ml-2 text-[14px] font-normal text-[#6f747b]">点</span>
      </p>
      <p className="mt-2 text-[14px] leading-6 text-[#5f655d]">
        包含：{gainedHint}
      </p>
      <p className="mt-1 text-[13px] text-[#6f747b]">
        余额 {formatPoints(balanceAfter)} 点
      </p>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          className="mt-4 inline-flex min-h-11 items-center text-[14px] font-medium text-[#181817] touch-manipulation"
        >
          知道了
        </button>
      ) : null}
    </section>
  );
}
