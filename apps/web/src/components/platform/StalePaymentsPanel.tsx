"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";
import { ConfirmDialog } from "@/components/operating/ConfirmDialog";

type StaleOrder = {
  orderNo: string;
  channel: string;
  amountCents: number;
  createdAt: string;
};

type ReconcileResult = {
  counted: number;
  paid: number;
  closed: number;
  skipped: number;
  dryRun: boolean;
};

type LastReconcile = {
  at: string;
  source: "cron" | "admin";
  dryRun: boolean;
  counted: number;
  paid: number;
  closed: number;
  skipped: number;
};

export function StalePaymentsPanel() {
  const [orders, setOrders] = useState<StaleOrder[]>([]);
  const [lastReconcile, setLastReconcile] = useState<LastReconcile | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(
        "/api/platform/admin/billing?stalePending=1",
        { cache: "no-store" },
      );
      const body = (await res.json()) as {
        ok?: boolean;
        error?: string;
        stalePending?: { count: number; orders: StaleOrder[] };
        lastReconcile?: LastReconcile | null;
      };
      if (!res.ok || !body.ok) {
        throw new Error(body.error || "加载失败");
      }
      setOrders(body.stalePending?.orders || []);
      setLastReconcile(body.lastReconcile ?? null);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function reconcile(dryRun: boolean) {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/platform/admin/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reconcile_stale_pending",
          dryRun,
        }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        error?: string;
        reconcile?: ReconcileResult;
        lastReconcile?: LastReconcile;
      };
      if (!res.ok || !body.ok || !body.reconcile) {
        throw new Error(body.error || "对账失败");
      }
      const r = body.reconcile;
      if (body.lastReconcile) setLastReconcile(body.lastReconcile);
      setMessage(
        r.dryRun
          ? `预检：${r.counted} 笔 · 将补发货 ${r.paid} · 将关闭 ${r.closed} · 跳过 ${r.skipped}`
          : `对账完成：补发货 ${r.paid} · 关闭 ${r.closed} · 跳过 ${r.skipped}（共 ${r.counted}）`,
      );
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "对账失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-[16px] border border-[rgba(24,24,23,0.08)] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[12px] tracking-[0.08em] text-[#66735E]">
            PAYMENT RECONCILE
          </p>
          <p className="mt-1 text-[15px] font-semibold text-[#202124]">
            超时订单渠道对账
          </p>
          <p className="mt-1 text-[12px] text-[#8a8f96]">
            查微信/支付宝：已付补发货，未付才关闭；查单失败跳过。默认 &gt;2 小时。
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading || busy}
          className="inline-flex min-h-10 items-center gap-1.5 border border-[rgba(24,24,23,0.1)] px-3 text-[12px] font-semibold disabled:opacity-50"
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          刷新
        </button>
      </div>

      {lastReconcile ? (
        <div className="mt-3 rounded-[12px] border border-[rgba(102,115,94,0.25)] bg-[rgba(102,115,94,0.06)] px-3 py-2.5 text-[12px] leading-5 text-[#3d4a36]">
          <p className="font-semibold">
            最近一次对账 · {lastReconcile.source === "cron" ? "定时任务" : "管理台"}
            {lastReconcile.dryRun ? "（预检）" : ""}
          </p>
          <p className="mt-1">
            {new Date(lastReconcile.at).toLocaleString("zh-CN")} · 扫描{" "}
            {lastReconcile.counted} · 补发货 {lastReconcile.paid} · 关闭{" "}
            {lastReconcile.closed} · 跳过 {lastReconcile.skipped}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-[12px] text-[#9a968e]">
          本进程还没有对账记录。可点下方预检/执行，或等 cron
          `/api/cron/reconcile-payments` 跑过一次。
        </p>
      )}

      <p className="mt-3 text-[13px] text-[#6f747b]">
        当前悬挂：{orders.length} 笔
      </p>
      {orders.slice(0, 5).map((o) => (
        <p key={o.orderNo} className="mt-1 truncate text-[12px] text-[#8a8f96]">
          {o.orderNo} · {o.channel} · ¥{(o.amountCents / 100).toFixed(2)}
        </p>
      ))}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void reconcile(true)}
          className="inline-flex min-h-10 items-center border border-[rgba(24,24,23,0.12)] px-3 text-[12px] font-semibold disabled:opacity-50"
        >
          预检
        </button>
        <button
          type="button"
          disabled={busy || orders.length === 0}
          onClick={() => setConfirmOpen(true)}
          className="inline-flex min-h-10 items-center bg-[#181817] px-3 text-[12px] font-semibold text-white disabled:opacity-50"
        >
          执行对账
        </button>
      </div>
      {message ? (
        <p className="mt-3 text-[12px] text-[#5f6b4e]">{message}</p>
      ) : null}
      <ConfirmDialog
        open={confirmOpen}
        title="执行渠道对账？"
        description={`将对 ${orders.length} 笔超时待支付订单查渠道：已付→补发货；未付→关闭；查单失败→跳过。`}
        confirmLabel="确认对账"
        danger
        busy={busy}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          void reconcile(false);
        }}
      />
    </div>
  );
}
