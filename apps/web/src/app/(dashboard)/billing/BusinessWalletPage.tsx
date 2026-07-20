"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, CreditCard, Sparkles } from "lucide-react";
import { WechatNativePayPanel } from "@/components/billing/WechatNativePayPanel";
import { InAppBrowserBanner } from "@/components/InAppBrowserBanner";
import { MKPageHeader } from "@/components/operating";
import { PageContent } from "@/components/operating/PageContent";
import {
  RECHARGE_PACKS,
  WALLET_USAGE_LINES,
  buildRecentSpend,
  buildValueArchive,
  buildWalletView,
  formatPoints,
  type BillingSnapshotLite,
  type WalletApiPayload,
} from "@/lib/business-wallet";
import { shouldGuideOpenInBrowserForWechatPay } from "@/lib/wechat-browser";
import { trpc } from "@/lib/trpc";

type Plan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceCents: number;
  includedRuns: number;
};

type Snapshot = BillingSnapshotLite & {
  plan?: Plan;
  balanceCents: number;
  remainingRuns: number;
  periodRunsUsed: number;
  usageByAgent: Array<{ agentCode: string; name: string; runsUsed: number }>;
};

type CheckoutResult = {
  ok: boolean;
  error?: string;
  mode?: "live" | "sandbox";
  activated?: boolean;
  order?: {
    id: string;
    orderNo: string;
    status: string;
    amountCents: number;
    channel: string;
    planCode?: string | null;
    planName?: string | null;
    planKind?: "platform" | "specialty_pack" | "credit_pack" | null;
  } | null;
  pay?: {
    channel: string;
    codeUrl: string | null;
    payUrl: string | null;
    sandbox?: boolean;
  } | null;
};

type Tab = "wallet" | "recharge" | "archive";

function resolvePlanForPack(plans: Plan[], packCode: string, priceYuan: number) {
  const byCode = plans.find((p) => p.code === packCode);
  if (byCode) return byCode;
  const byPrice = plans.find((p) => p.priceCents === priceYuan * 100);
  return byPrice || null;
}

export default function BusinessWalletPage() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams?.get("tab") as Tab | null) || "wallet";
  const [tab, setTab] = useState<Tab>(
    initialTab === "recharge" || initialTab === "archive" ? initialTab : "wallet",
  );
  const [pending, setPending] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<CheckoutResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const walletQuery = trpc.billing.getPlansAndWallet.useQuery(undefined, {
    staleTime: 15_000,
  });
  const checkoutMut = trpc.billing.checkout.useMutation();
  const sandboxMut = trpc.billing.confirmSandbox.useMutation();

  const creditPacks = (walletQuery.data?.categorized.creditPacks || []) as Plan[];
  const snapshot = (walletQuery.data?.snapshot || null) as Snapshot | null;
  const walletPayload = (walletQuery.data?.wallet || null) as WalletApiPayload | null;
  const mode = (walletQuery.data?.mode || "sandbox") as "live" | "sandbox";
  const loading = walletQuery.isLoading;
  const error = actionError || walletQuery.error?.message || null;

  const wallet = useMemo(
    () => buildWalletView(snapshot, walletPayload),
    [snapshot, walletPayload],
  );
  const recentSpend = useMemo(
    () => buildRecentSpend(snapshot, walletPayload?.recentLedger),
    [snapshot, walletPayload],
  );
  const archive = useMemo(
    () => buildValueArchive(snapshot, walletPayload?.valueArchive),
    [snapshot, walletPayload],
  );

  const reload = useCallback(async () => {
    await utils.billing.getPlansAndWallet.invalidate();
  }, [utils]);

  useEffect(() => {
    const next = searchParams?.get("tab") as Tab | null;
    if (next === "recharge" || next === "archive" || next === "wallet") {
      setTab(next);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!checkout?.order?.id || checkout.activated || checkout.order.status === "paid") {
      return;
    }
    // 微信码 / 支付宝收银台都要轮询到账（勿因 payUrl 跳过）
    let attempts = 0;
    const MAX_ATTEMPTS = 48;
    const timer = setInterval(() => {
      attempts += 1;
      if (attempts > MAX_ATTEMPTS) {
        clearInterval(timer);
        setMessage("仍未确认到支付结果，请稍后在钱包页刷新，或联系支持");
        return;
      }
      void utils.billing.getOrder
        .fetch({ orderId: checkout.order!.id })
        .then((data) => {
          if (data?.order?.status === "paid") {
            setMessage("支付成功，经营点已到账");
            setCheckout(null);
            void reload();
          }
        })
        .catch(() => {
          // ignore polling errors
        });
    }, 2500);

    return () => clearInterval(timer);
  }, [checkout, reload, utils]);

  async function startCheckout(planId: string, channel: "wechat" | "alipay") {
    setPending(`${planId}:${channel}`);
    setMessage(null);
    setActionError(null);
    setCheckout(null);
    try {
      const inWeChat =
        channel === "wechat" && shouldGuideOpenInBrowserForWechatPay();
      const data = await checkoutMut.mutateAsync({
        planId,
        channel,
        preferWechatH5: inWeChat,
      });
      if (data.activated) {
        setMessage("经营点已到账");
        await reload();
        return;
      }
      setCheckout(data as CheckoutResult);

      // 微信 H5：优先跳转；支付宝：跳收银台；否则留在页内扫 Native 码
      if (data.pay?.payUrl && data.mode === "live") {
        if (channel === "wechat") {
          setMessage("正在打开微信收银台…若未跳转请点下方按钮，或复制链接到浏览器扫码。");
          window.location.href = data.pay.payUrl;
          return;
        }
        const opened = window.open(
          data.pay.payUrl,
          "_blank",
          "noopener,noreferrer",
        );
        if (!opened) {
          setMessage("浏览器拦截了弹窗，请在下方点击「打开支付宝收银台」");
        }
      } else if (inWeChat && data.pay?.codeUrl) {
        setMessage(
          "微信 H5 未开通或下单失败，已回退扫码。请：① ··· → 浏览器打开 ② 复制充值页链接 ③ 微信扫一扫",
        );
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "支付失败");
    } finally {
      setPending(null);
    }
  }

  async function confirmSandbox() {
    if (!checkout?.order?.orderNo) return;
    setPending("sandbox");
    setActionError(null);
    try {
      await sandboxMut.mutateAsync({ orderNo: checkout.order.orderNo });
      setMessage("支付成功，经营点已到账");
      setCheckout(null);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "模拟支付失败");
    } finally {
      setPending(null);
    }
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "wallet", label: "余额" },
    { id: "recharge", label: "充值" },
    { id: "archive", label: "消费记录" },
  ];

  return (
    <PageContent width="narrow" inset="shell" className="space-y-6 pb-4">
      <MKPageHeader
        eyebrow="经营点"
        title="充值与余额"
        description="开会会扣点。不够就充，用不完一直留着。"
        badge={
          <div className="inline-flex min-h-7 items-center rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-3 text-[13px] text-[#6f747b]">
            {mode === "sandbox" ? "演示" : "正式"}
          </div>
        }
      />

      <InAppBrowserBanner variant="blocking" />

      <nav className="flex gap-1 border-b border-[rgba(24,24,23,0.08)]" aria-label="经营点分区">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-current={tab === item.id ? "page" : undefined}
            className={`min-h-11 px-4 text-[14px] font-medium touch-manipulation ${
              tab === item.id
                ? "border-b-2 border-[#181817] text-[#181817]"
                : "text-[#6f747b]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {loading ? (
        <section className="border-y border-[rgba(24,24,23,0.08)] py-5 text-[14px] text-[#6f747b]">
          加载中…
        </section>
      ) : null}
      {error ? (
        <section className="border border-[rgba(180,124,92,0.25)] bg-[rgba(180,124,92,0.08)] p-4 text-[14px] text-[#B47C5C]">
          {error}
        </section>
      ) : null}
      {message ? (
        <section className="border border-[rgba(102,115,94,0.25)] bg-[rgba(102,115,94,0.08)] p-4 text-[14px] text-[#66735E]">
          {message}
        </section>
      ) : null}

      {tab === "wallet" && !loading ? (
        <div className="space-y-8">
          <section className="space-y-3">
            <p className="text-[12px] tracking-[0.1em] text-[#6f747b]">经营点余额</p>
            <p className="font-display text-[48px] font-semibold leading-none tracking-[-0.05em] text-[#202124]">
              {formatPoints(wallet.balance)}
            </p>
            <div className="space-y-1 pt-2 text-[15px] leading-7 text-[#202124]">
              <p>预计还能完成：</p>
              <p>
                <span className="font-semibold">{wallet.estimateDeep}</span> 次深度战略分析
              </p>
              <p>
                <span className="font-semibold">{wallet.estimateConsult}</span> 次经营咨询
              </p>
            </div>
            <button
              type="button"
              onClick={() => setTab("recharge")}
              className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-[16px] bg-[#181817] px-5 text-[15px] font-semibold text-white touch-manipulation active:scale-[0.98]"
            >
              充值经营点
              <ArrowRight className="h-4 w-4" />
            </button>
          </section>

          <section className="space-y-4 border-t border-[rgba(24,24,23,0.08)] pt-8">
            <p className="text-[12px] tracking-[0.1em] text-[#6f747b]">最近消耗</p>
            {recentSpend.length === 0 ? (
              <p className="text-[14px] leading-6 text-[#6f747b]">
                还没有消耗记录。完成一次分析后，这里会显示你买到的专业判断。
              </p>
            ) : (
              <ul className="space-y-4">
                {recentSpend.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-baseline justify-between gap-4 border-b border-[rgba(24,24,23,0.06)] pb-4"
                  >
                    <div>
                      <p className="text-[12px] text-[#6f747b]">{item.when}</p>
                      <p className="mt-1 text-[16px] font-medium text-[#202124]">{item.title}</p>
                    </div>
                    <p className="text-[15px] font-medium text-[#B47C5C]">
                      -{formatPoints(item.points)}点
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3 border-t border-[rgba(24,24,23,0.08)] pt-8">
            <p className="text-[12px] tracking-[0.1em] text-[#66735E]">价值记录</p>
            <p className="text-[14px] text-[#6f747b]">不是流水。你获得的是判断与方案。</p>
            {archive.length === 0 ? (
              <p className="text-[15px] leading-7 text-[#202124]">你获得：—</p>
            ) : (
              <ul className="space-y-2">
                {archive[0]?.gained.map((g) => (
                  <li key={g} className="text-[15px] leading-7 text-[#202124]">
                    ✓ {g}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      {tab === "recharge" && !loading ? (
        <div className="space-y-8">
          <header>
            <h2 className="font-display text-[24px] font-semibold tracking-[-0.03em] text-[#202124]">
              购买经营点
            </h2>
            <p className="mt-2 text-[14px] leading-6 text-[#6f747b]">
              按经营阶段选包，不是 Basic / Pro / Enterprise。
            </p>
          </header>

          <div className="space-y-4">
            {RECHARGE_PACKS.map((pack) => {
              const plan = resolvePlanForPack(creditPacks, pack.planCode, pack.priceYuan);
              return (
                <article
                  key={pack.id}
                  className="border border-[rgba(24,24,23,0.08)] bg-white p-5"
                >
                  <p className="text-[13px] text-[#66735E]">{pack.name}</p>
                  <p className="mt-1 font-display text-[32px] font-semibold tracking-[-0.03em] text-[#202124]">
                    ¥{pack.priceYuan}
                  </p>
                  <p className="mt-2 text-[18px] font-medium text-[#202124]">
                    {formatPoints(pack.points)} 经营点
                  </p>
                  <p className="mt-2 text-[14px] text-[#6f747b]">适合：{pack.suitedFor}</p>
                  {plan ? (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        disabled={pending !== null}
                        onClick={() => void startCheckout(plan.id, "wechat")}
                        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] bg-[#181817] px-4 text-[14px] font-semibold text-white touch-manipulation disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Sparkles className="h-4 w-4" />
                        {pending === `${plan.id}:wechat` ? "创建中…" : "微信支付"}
                      </button>
                      <button
                        type="button"
                        disabled={pending !== null}
                        onClick={() => void startCheckout(plan.id, "alipay")}
                        className="inline-flex min-h-11 items-center justify-center gap-2 border border-[rgba(24,24,23,0.08)] bg-[#F5F3EE] px-4 text-[14px] font-medium text-[#202124] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <CreditCard className="h-4 w-4" />
                        {pending === `${plan.id}:alipay` ? "创建中…" : "支付宝"}
                      </button>
                    </div>
                  ) : (
                    <p className="mt-4 text-[13px] text-[#B47C5C]">
                      该经营点包尚未开通支付通道，请稍后重试或联系顾问。
                    </p>
                  )}
                </article>
              );
            })}
          </div>

          <section className="border-t border-[rgba(24,24,23,0.08)] pt-6">
            <p className="text-[14px] font-medium text-[#202124]">经营点可用于：</p>
            <ul className="mt-3 space-y-2">
              {WALLET_USAGE_LINES.map((line) => (
                <li key={line} className="flex items-center gap-2 text-[15px] text-[#202124]">
                  <Check className="h-4 w-4 text-[#66735E]" />
                  {line}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[14px] text-[#66735E]">永久有效</p>
          </section>
        </div>
      ) : null}

      {tab === "archive" && !loading ? (
        <div className="space-y-6">
          <header>
            <h2 className="font-display text-[24px] font-semibold tracking-[-0.03em] text-[#202124]">
              经营档案
            </h2>
            <p className="mt-2 text-[14px] leading-6 text-[#6f747b]">
              关心结果，不关心 Token History。
            </p>
          </header>
          {archive.length === 0 ? (
            <p className="text-[15px] leading-7 text-[#6f747b]">
              完成分析后，这里会沉淀你获得的方案与判断，并与 Founder 记忆联动。
            </p>
          ) : (
            <ul className="space-y-5">
              {archive.map((item) => (
                <li
                  key={item.id}
                  className="border border-[rgba(24,24,23,0.08)] bg-white p-5"
                >
                  <p className="text-[12px] text-[#6f747b]">{item.dateLabel}</p>
                  <p className="mt-1 text-[18px] font-semibold text-[#202124]">{item.title}</p>
                  <p className="mt-3 text-[14px] text-[#6f747b]">
                    投入：
                    <span className="ml-1 font-medium text-[#202124]">
                      {formatPoints(item.invested)} 经营点
                    </span>
                  </p>
                  <div className="mt-3">
                    <p className="text-[13px] text-[#6f747b]">获得：</p>
                    <ul className="mt-1 space-y-1">
                      {item.gained.map((g) => (
                        <li key={g} className="text-[15px] leading-6 text-[#202124]">
                          {g}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="mt-3 text-[13px] text-[#66735E]">状态：{item.status}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}

      {checkout?.order ? (
        <section className="border border-[rgba(24,24,23,0.08)] bg-white p-5">
          <p className="text-[13px] text-[#66735E]">待支付 · 经营点充值</p>
          <p className="mt-1 text-[18px] text-[#202124]">
            {checkout.order.orderNo} · ¥{(checkout.order.amountCents / 100).toFixed(2)}
          </p>
          {checkout.mode === "sandbox" || checkout.pay?.sandbox ? (
            <button
              type="button"
              disabled={pending !== null}
              onClick={() => void confirmSandbox()}
              className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] bg-[#181817] px-5 text-[14px] font-semibold text-white touch-manipulation disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pending === "sandbox" ? "确认中…" : "模拟支付成功"}
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : null}
          {checkout.pay?.codeUrl ? (
            <WechatNativePayPanel
              codeUrl={checkout.pay.codeUrl}
              orderNo={checkout.order.orderNo}
              amountCents={checkout.order.amountCents}
              polling
            />
          ) : null}
          {checkout.pay?.payUrl ? (
            <a
              href={checkout.pay.payUrl}
              target={checkout.pay.channel === "wechat" ? "_self" : "_blank"}
              rel="noreferrer"
              className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] bg-[#181817] px-5 text-[14px] font-semibold text-white no-underline touch-manipulation"
            >
              {checkout.pay.channel === "wechat"
                ? "打开微信收银台"
                : "打开支付宝收银台"}
              <ArrowRight className="h-4 w-4" />
            </a>
          ) : null}
          {!checkout.pay?.sandbox &&
          !checkout.pay?.codeUrl &&
          !checkout.pay?.payUrl &&
          checkout.mode === "live" ? (
            <p className="mt-4 text-[13px] text-[#a56b4d]">
              未拿到支付凭证（codeUrl / payUrl 为空）。请检查微信/支付宝渠道配置后重试。
            </p>
          ) : null}
        </section>
      ) : null}

      <div className="flex justify-end pt-2">
        <Link
          href="/profile"
          className="inline-flex min-h-11 items-center gap-2 text-[13px] text-[#6f747b] no-underline"
        >
          返回成长
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </PageContent>
  );
}
