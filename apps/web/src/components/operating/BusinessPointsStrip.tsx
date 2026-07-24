"use client";

import Link from "next/link";
import { formatPoints, type WalletView } from "@/lib/business-wallet";

type Props = {
  wallet: WalletView;
  /** 首页晨报用紧凑条，不与问候标题抢英雄位 */
  compact?: boolean;
};

/**
 * 经营点余额条 — 卖价值，不卖 Token。
 */
export function BusinessPointsStrip({ wallet, compact }: Props) {
  if (compact) {
    return (
      <section className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-y border-[rgba(24,24,23,0.08)] py-3.5">
        <div className="min-w-0 flex items-baseline gap-2.5">
          <p className="shrink-0 text-[11px] tracking-[0.1em] text-[#6f747b]">
            余额
          </p>
          <p className="font-display text-[22px] font-semibold leading-none tracking-[-0.03em] text-[#202124]">
            {formatPoints(wallet.balance)}
          </p>
          {wallet.monthAnalyses > 0 ? (
            <p className="truncate text-[12px] text-[#6f747b]">
              本月决策 {wallet.monthAnalyses} 次
            </p>
          ) : null}
        </div>
        <Link
          href="/billing?tab=recharge"
          prefetch={false}
          className="inline-flex min-h-11 shrink-0 items-center justify-center border border-[rgba(24,24,23,0.14)] bg-transparent px-3.5 text-[13px] font-semibold text-[#181817] no-underline transition active:scale-[0.98] hover:bg-white/80 touch-manipulation"
        >
          充值
        </Link>
      </section>
    );
  }

  return (
    <section className="relative space-y-4 border-b border-[rgba(24,24,23,0.08)] pb-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[12px] tracking-[0.1em] text-[#6f747b]">余额</p>
          <p className="mt-2 font-display text-[36px] font-semibold leading-none tracking-[-0.04em] text-[#202124]">
            {formatPoints(wallet.balance)}
          </p>
        </div>
        <Link
          href="/billing?tab=recharge"
          prefetch={false}
          className="inline-flex min-h-11 items-center justify-center bg-[#181817] px-4 text-[14px] font-semibold text-white no-underline touch-manipulation active:scale-[0.98]"
        >
          充值
        </Link>
      </div>

      {wallet.monthAnalyses > 0 ? (
        <p className="text-[15px] leading-7 text-[#202124]">
          本月决策 <span className="font-semibold">{wallet.monthAnalyses}</span> 次
          {wallet.hoursSaved > 0 ? (
            <>
              <span className="mx-2 text-[#c5c2ba]">·</span>
              约省 <span className="font-semibold">{wallet.hoursSaved}</span> 小时
            </>
          ) : null}
        </p>
      ) : null}
    </section>
  );
}
