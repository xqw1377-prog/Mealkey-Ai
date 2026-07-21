"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { MKBrand } from "@/components/brand/MKBrand";

type StoreListing = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  priceCents: number;
  pricingModel: string;
  installCount: number;
  rating: number;
  agentId: string | null;
  author: string | null;
  category: string | null;
  isPartner: boolean;
  isOfficial?: boolean;
};

function formatPrice(listing: StoreListing) {
  if (listing.pricingModel === "free" || listing.priceCents <= 0) return "免费";
  return `¥${(listing.priceCents / 100).toFixed(0)}/月`;
}

export default function StorePage() {
  const [listings, setListings] = useState<StoreListing[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/store/listings", { cache: "no-store" });
        const body = (await res.json()) as { ok?: boolean; listings?: StoreListing[]; error?: string };
        if (!res.ok || !body.ok) {
          if (!cancelled) setError(body.error || "加载失败");
          return;
        }
        if (!cancelled) setListings(body.listings ?? []);
      } catch {
        if (!cancelled) setError("网络错误");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="relative min-h-[100dvh] text-[#171717]">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[#e7ebe3]" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_70%_at_18%_-8%,rgba(255,255,255,0.92)_0%,transparent_52%),linear-gradient(168deg,#f4f5f0_0%,#e6ebe1_42%,#d5ddcf_100%)]"
      />

      <div className="relative mx-auto max-w-5xl px-5 pb-16 pt-8 md:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-2">
            <MKBrand size="default" />
          </Link>
          <nav className="flex items-center gap-4 text-[13px] text-[#5f6368]">
            <Link href="/developers" className="hover:text-[#171717]">
              开发者
            </Link>
            <Link href="/dashboard" className="hover:text-[#171717]">
              经营台
            </Link>
          </nav>
        </header>

        <section className="mt-12 max-w-xl">
          <p className="text-[12px] font-semibold tracking-[0.14em] text-[#66735E]">AGENT STORE</p>
          <h1 className="mt-3 font-display text-[34px] font-semibold tracking-[-0.04em] text-[#171717] md:text-[40px]">
            MealKey Store
          </h1>
          <p className="mt-3 text-[15px] leading-7 text-[#3a3d41]">
            发现并安装餐饮经营 Agent。安装即授权进 OS，不是下载安装包。
          </p>
        </section>

        {loading ? <p className="mt-10 text-[14px] text-[#6f747b]">加载中…</p> : null}
        {error ? <p className="mt-10 text-[14px] text-[#8b3a2f]">{error}</p> : null}

        {!loading && !error && listings.length === 0 ? (
          <p className="mt-10 text-[14px] text-[#6f747b]">暂无公开上架 Agent。运营审核通过后会出现在这里。</p>
        ) : null}

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <Link
              key={listing.id}
              href={`/store/agents/${listing.slug}`}
              className="block rounded-[16px] border border-[rgba(24,24,23,0.08)] bg-white/70 px-5 py-5 transition hover:border-[rgba(24,24,23,0.16)] hover:bg-white"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-display text-[18px] font-semibold tracking-[-0.03em] text-[#171717]">
                  {listing.name}
                </p>
                {listing.isPartner ? (
                  <span className="shrink-0 rounded-full bg-[rgba(102,115,94,0.1)] px-2 py-0.5 text-[11px] text-[#465240]">
                    伙伴
                  </span>
                ) : null}
                {listing.isOfficial ? (
                  <span className="shrink-0 rounded-full bg-[rgba(24,24,23,0.08)] px-2 py-0.5 text-[11px] text-[#3a3d41]">
                    官方
                  </span>
                ) : null}
              </div>
              <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-[#6f747b]">
                {listing.description || listing.category || "餐饮经营能力"}
              </p>
              <div className="mt-4 flex items-center justify-between text-[13px]">
                <span className="font-semibold text-[#171717]">{formatPrice(listing)}</span>
                <span className="text-[#8a8f98]">{listing.installCount} 安装</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
