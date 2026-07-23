"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, CreditCard, Sparkles } from "lucide-react";
import { MKPageHeader } from "@/components/operating";

type Plan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceCents: number;
  includedRuns: number;
};

type Snapshot = {
  plan: Plan;
  periodRunsUsed: number;
  periodRunsLimit: number;
  remainingRuns: number;
  balanceCents: number;
  overageRunCents: number;
  hybrid: {
    includedRemaining: number;
    overageEnabled: boolean;
    affordableOverageRuns: number;
  };
  usageByAgent: Array<{
    agentCode: string;
    name: string;
    entitled: boolean;
    runsUsed: number;
  }>;
  activeSubscription: {
    id: string;
    status: string;
    currentPeriodEnd: string | null;
  };
  account: {
    balance: string;
    currency: string;
  };
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
  } | null;
  pay?: {
    channel: string;
    codeUrl: string | null;
    payUrl: string | null;
    sandbox?: boolean;
  } | null;
};

function formatPrice(cents: number) {
  if (cents <= 0) return "免费";
  return `¥${(cents / 100).toFixed(0)}`;
}

export default function BillingPage() {
  const [platformPlans, setPlatformPlans] = useState<Plan[]>([]);
  const [agentAddons, setAgentAddons] = useState<Plan[]>([]);
  const [creditPacks, setCreditPacks] = useState<Plan[]>([]);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [mode, setMode] = useState<"live" | "sandbox">("sandbox");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [checkout, setCheckout] = useState<CheckoutResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/plans", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "加载套餐失败");
      }
      setPlatformPlans(data.categorized?.platform || []);
      setAgentAddons(data.categorized?.agentAddons || []);
      setCreditPacks(data.categorized?.creditPacks || []);
      setSnapshot(data.snapshot || null);
      setMode(data.mode || "sandbox");
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!checkout?.order?.id || checkout.activated || checkout.order.status === "paid") return;
    if (checkout.mode === "live" && checkout.pay?.payUrl) return;

    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/billing/orders/${checkout.order!.id}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (data?.order?.status === "paid") {
          setMessage("支付成功，能力已开通");
          setCheckout(null);
          await load();
        }
      } catch {
        // ignore
      }
    }, 2500);

    return () => clearInterval(timer);
  }, [checkout, load]);

  async function startCheckout(planId: string, channel: "wechat" | "alipay") {
    setPending(`${planId}:${channel}`);
    setMessage(null);
    setCheckout(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, channel }),
      });
      const data = (await res.json()) as CheckoutResult;
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "创建支付失败");
      }

      if (data.activated) {
        setMessage("已开通");
        await load();
        return;
      }

      setCheckout(data);
      if (data.pay?.payUrl && data.mode === "live") {
        window.open(data.pay.payUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "支付失败");
    } finally {
      setPending(null);
    }
  }

  async function confirmSandbox() {
    if (!checkout?.order?.orderNo) return;
    setPending("sandbox");
    try {
      const res = await fetch("/api/billing/sandbox/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNo: checkout.order.orderNo }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "模拟支付失败");
      }
      setMessage("沙箱支付成功");
      setCheckout(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "模拟支付失败");
    } finally {
      setPending(null);
    }
  }

  function PayButtons({ planId, free }: { planId: string; free?: boolean }) {
    if (free) {
      return (
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => void startCheckout(planId, "wechat")}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#F5F3EE] px-4 text-[14px] font-medium text-[#202124] disabled:opacity-50"
        >
          开通体验版
        </button>
      );
    }
    return (
      <div className="mt-4 grid gap-2">
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => void startCheckout(planId, "wechat")}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[#181817] px-4 text-[14px] font-semibold text-white disabled:opacity-50"
        >
          <Sparkles className="h-4 w-4" />
          {pending === `${planId}:wechat` ? "创建中…" : "微信支付"}
        </button>
        <button
          type="button"
          disabled={pending !== null}
          onClick={() => void startCheckout(planId, "alipay")}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-[#F5F3EE] px-4 text-[14px] font-medium text-[#202124] disabled:opacity-50"
        >
          <CreditCard className="h-4 w-4" />
          {pending === `${planId}:alipay` ? "创建中…" : "支付宝"}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 pb-2">
      <MKPageHeader
        eyebrow="账单"
        title="套餐与 Agent 能力"
        description="母体席位 + 可独立开通的 Agent。Hybrid：含内额度用尽后按次扣余额。"
        badge={
          <div className="inline-flex min-h-7 items-center rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white px-3 text-[13px] text-[#6f747b]">
            {mode === "sandbox" ? "沙箱模式" : "正式支付"}
          </div>
        }
      />

      {loading ? (
        <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-5 text-[14px] text-[#6f747b]">
          正在加载…
        </section>
      ) : null}
      {error ? (
        <section className="rounded-[22px] border border-[rgba(180,124,92,0.25)] bg-[rgba(180,124,92,0.08)] p-4 text-[14px] text-[#B47C5C]">
          {error}
        </section>
      ) : null}
      {message ? (
        <section className="rounded-[22px] border border-[rgba(102,115,94,0.25)] bg-[rgba(102,115,94,0.08)] p-4 text-[14px] text-[#66735E]">
          {message}
        </section>
      ) : null}

      {snapshot ? (
        <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-[linear-gradient(180deg,#fbfaf7_0%,#eef1ea_100%)] p-5">
          <p className="text-[13px] text-[#66735E]">当前 Hybrid 状态</p>
          <h2 className="mt-1 text-[24px] tracking-[-0.03em] text-[#202124]">
            {snapshot.plan.name}
          </h2>
          <p className="mt-2 text-[14px] leading-7 text-[#6f747b]">
            本周期 {snapshot.periodRunsUsed} / {snapshot.periodRunsLimit} 次 · 剩余含内{" "}
            {snapshot.remainingRuns} 次 · 余额 ¥{(snapshot.balanceCents / 100).toFixed(2)} ·
            超额 ¥{(snapshot.overageRunCents / 100).toFixed(2)}/次（还可约{" "}
            {snapshot.hybrid.affordableOverageRuns} 次）
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {snapshot.usageByAgent.map((item) => (
              <div
                key={item.agentCode}
                className="rounded-[14px] border border-[rgba(24,24,23,0.06)] bg-white/80 px-3 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[14px] font-medium text-[#202124]">{item.name}</p>
                  {item.entitled ? (
                    <span className="inline-flex items-center gap-1 text-[12px] text-[#66735E]">
                      <Check className="h-3.5 w-3.5" />
                      已开通
                    </span>
                  ) : (
                    <span className="text-[12px] text-[#B47C5C]">未开通</span>
                  )}
                </div>
                <p className="mt-1 text-[12px] text-[#6f747b]">本周期调用 {item.runsUsed} 次</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-[16px] font-semibold text-[#202124]">母体席位</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {platformPlans.map((plan) => (
            <div
              key={plan.id}
              className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-5"
            >
              <p className="text-[13px] text-[#66735E]">{plan.code}</p>
              <h4 className="mt-1 text-[20px] text-[#202124]">{plan.name}</h4>
              <p className="mt-2 text-[28px] font-semibold text-[#202124]">
                {formatPrice(plan.priceCents)}
                {plan.priceCents > 0 ? <span className="text-[14px] font-normal">/月</span> : null}
              </p>
              <p className="mt-2 text-[13px] leading-6 text-[#6f747b]">{plan.description}</p>
              <p className="mt-2 text-[13px] text-[#202124]">
                含 {plan.includedRuns.toLocaleString("zh-CN")} 次会议
              </p>
              <PayButtons planId={plan.id} free={plan.priceCents <= 0} />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-[16px] font-semibold text-[#202124]">独立 Agent 能力包</h3>
        <p className="text-[13px] text-[#6f747b]">
          矩阵节点可单独开通，不依赖互相串联。体验版默认仅含经营会议。
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {agentAddons.map((plan) => (
            <div
              key={plan.id}
              className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-5"
            >
              <h4 className="text-[18px] text-[#202124]">{plan.name}</h4>
              <p className="mt-2 text-[24px] font-semibold text-[#202124]">
                {formatPrice(plan.priceCents)}
                <span className="text-[13px] font-normal">/月</span>
              </p>
              <p className="mt-2 text-[13px] leading-6 text-[#6f747b]">{plan.description}</p>
              <PayButtons planId={plan.id} />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-[16px] font-semibold text-[#202124]">超额额度包</h3>
        <div className="grid gap-4 md:grid-cols-2">
          {creditPacks.map((plan) => (
            <div
              key={plan.id}
              className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-5"
            >
              <h4 className="text-[18px] text-[#202124]">{plan.name}</h4>
              <p className="mt-2 text-[24px] font-semibold text-[#202124]">
                {formatPrice(plan.priceCents)}
              </p>
              <p className="mt-2 text-[13px] leading-6 text-[#6f747b]">{plan.description}</p>
              <PayButtons planId={plan.id} />
            </div>
          ))}
        </div>
      </section>

      {checkout?.order ? (
        <section className="rounded-[22px] border border-[rgba(24,24,23,0.08)] bg-white p-5">
          <p className="text-[13px] text-[#66735E]">待支付订单</p>
          <p className="mt-1 text-[18px] text-[#202124]">
            {checkout.order.orderNo} · ¥{(checkout.order.amountCents / 100).toFixed(2)}
          </p>
          {checkout.mode === "sandbox" || checkout.pay?.sandbox ? (
            <div className="mt-4 space-y-3">
              <p className="text-[14px] leading-7 text-[#6f747b]">
                沙箱模式可一键模拟支付成功。
              </p>
              <button
                type="button"
                disabled={pending !== null}
                onClick={() => void confirmSandbox()}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] bg-[#181817] px-5 text-[14px] font-semibold text-white disabled:opacity-50"
              >
                {pending === "sandbox" ? "确认中…" : "模拟支付成功"}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : null}
          {checkout.pay?.codeUrl ? (
            <p className="mt-4 break-all rounded-[14px] bg-[#F8F7F3] px-3 py-3 text-[13px]">
              {checkout.pay.codeUrl}
            </p>
          ) : null}
          {checkout.pay?.payUrl ? (
            <a
              href={checkout.pay.payUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex min-h-11 items-center justify-center gap-2 rounded-[14px] bg-[#181817] px-5 text-[14px] font-semibold text-white no-underline"
            >
              打开支付宝收银台
              <ArrowRight className="h-4 w-4" />
            </a>
          ) : null}
        </section>
      ) : null}

      <div className="flex justify-end">
        <Link
          href="/profile"
          className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[rgba(24,24,23,0.08)] bg-white px-4 text-[13px] text-[#6f747b] no-underline"
        >
          返回大脑
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
