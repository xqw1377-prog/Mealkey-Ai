"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import {
  DeveloperShell,
  DocHeader,
} from "../../_components/developer-portal";

type BillingRow = {
  applicationId: string;
  agentId: string;
  name: string;
  lifecycleStatus: string;
  listing: {
    id: string;
    slug: string;
    priceCents: number;
    pricingModel: string;
    installCount: number;
    status: string;
  } | null;
  revenueShares: Array<{
    beneficiaryType: string;
    beneficiaryId: string;
    sharePercent: number;
  }>;
};

export default function DeveloperBillingPage() {
  const router = useRouter();
  const [rows, setRows] = useState<BillingRow[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/developers/billing", { cache: "no-store" });
    const body = (await res.json()) as {
      ok?: boolean;
      error?: string;
      settlementNote?: string;
      rows?: BillingRow[];
    };
    if (res.status === 401) {
      router.push(`/login?callbackUrl=${encodeURIComponent("/developers/console/billing")}`);
      return;
    }
    if (!res.ok || !body.ok) {
      setError(body.error || "加载失败");
      return;
    }
    setNote(body.settlementNote || "结算未开通");
    setRows(body.rows ?? []);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <DeveloperShell activePath="/developers/console">
      <main className="mx-auto max-w-3xl px-5 py-10 md:px-8">
        <DocHeader
          eyebrow="REVENUE"
          title="分成与结算"
          description="只读查看 RevenueShare 预留。开发者打款账本未开通前显示「结算未开通」。"
          authority="IA §6.3 · Marketplace 70/30"
        />

        <div className="mb-6 rounded-[14px] border border-[rgba(102,115,94,0.25)] bg-[rgba(102,115,94,0.08)] px-4 py-3 text-[13px] text-[#465240]">
          {note || "结算未开通"}
        </div>

        {error ? <p className="text-[13px] text-[#8b3a2f]">{error}</p> : null}

        {rows.length === 0 && !error ? (
          <p className="text-[14px] text-[#6f747b]">尚无已上架 Listing。审核通过后会出现分成规则。</p>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div
                key={row.applicationId}
                className="rounded-[14px] border border-[rgba(24,24,23,0.08)] bg-white/70 px-4 py-4"
              >
                <p className="font-display text-[17px] font-semibold tracking-[-0.02em]">
                  {row.name}
                </p>
                <p className="mt-1 text-[12px] text-[#6f747b]">
                  {row.agentId}
                  {row.listing ? ` · /store/agents/${row.listing.slug}` : ""}
                  {row.listing ? ` · ${row.listing.installCount} 安装` : ""}
                </p>
                <ul className="mt-3 space-y-1 text-[13px] text-[#3a3d41]">
                  {row.revenueShares.map((s) => (
                    <li key={`${s.beneficiaryType}-${s.beneficiaryId}`}>
                      {s.beneficiaryType} · {(s.sharePercent * 100).toFixed(0)}%
                    </li>
                  ))}
                  {row.revenueShares.length === 0 ? <li>暂无分成规则</li> : null}
                </ul>
                {row.listing ? (
                  <Link
                    href={`/store/agents/${row.listing.slug}`}
                    className="mt-3 inline-block text-[13px] font-medium text-[#465240] underline-offset-2 hover:underline"
                  >
                    打开 Store 卡片
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        )}

        <p className="mt-8 text-[13px]">
          <Link href="/developers/console" className="text-[#465240] underline-offset-2 hover:underline">
            ← 返回 Console
          </Link>
        </p>
      </main>
    </DeveloperShell>
  );
}
