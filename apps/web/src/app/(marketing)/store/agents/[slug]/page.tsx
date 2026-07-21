"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { MKBrand } from "@/components/brand/MKBrand";
import type { StoreListingCard } from "@/lib/store/store-service";

function formatPrice(listing: StoreListingCard) {
  if (listing.pricingModel === "free" || listing.priceCents <= 0) return "免费";
  return `¥${(listing.priceCents / 100).toFixed(0)}/月`;
}

export default function StoreAgentDetailPage() {
  const params = useParams();
  const slug = String(params.slug ?? "");
  const router = useRouter();
  const [listing, setListing] = useState<StoreListingCard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/store/listings/${encodeURIComponent(slug)}`, { cache: "no-store" });
    const body = (await res.json()) as {
      ok?: boolean;
      listing?: StoreListingCard;
      error?: string;
    };
    if (!res.ok || !body.ok || !body.listing) {
      setError(body.error || "未找到该 Agent 或尚未公开");
      return;
    }
    setListing(body.listing);
  }, [slug]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleInstall() {
    if (!listing) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/store/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: listing.id, slug: listing.slug }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (res.status === 401) {
        router.push(`/login?callbackUrl=${encodeURIComponent(`/store/agents/${slug}`)}`);
        return;
      }
      if (!res.ok || !body.ok) {
        setError(body.error || "安装失败");
        return;
      }
      setMessage(body.message || "安装成功");
      await load();
    } catch {
      setError("网络错误");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-[100dvh] text-[#171717]">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[#e7ebe3]" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_70%_at_18%_-8%,rgba(255,255,255,0.9)_0%,transparent_52%),linear-gradient(168deg,#f4f5f0_0%,#e6ebe1_50%,#d5ddcf_100%)]"
      />

      <div className="relative mx-auto max-w-2xl px-5 pb-16 pt-8 md:px-8">
        <header className="flex items-center justify-between gap-4">
          <Link href="/store" className="inline-flex items-center gap-2">
            <MKBrand size="default" />
          </Link>
          <Link href="/store" className="text-[13px] text-[#5f6368] hover:text-[#171717]">
            ← 返回 Store
          </Link>
        </header>

        {error && !listing ? <p className="mt-12 text-[14px] text-[#8b3a2f]">{error}</p> : null}

        {listing ? (
          <article className="mt-12">
            <p className="text-[12px] font-semibold tracking-[0.14em] text-[#66735E]">
              {listing.isOfficial ? "OFFICIAL · M-OPS" : listing.isPartner ? "PARTNER AGENT" : "AGENT"}
            </p>
            <h1 className="mt-3 font-display text-[32px] font-semibold tracking-[-0.04em] md:text-[36px]">
              {listing.name}
            </h1>
            <p className="mt-2 text-[14px] text-[#6f747b]">
              {listing.author ? `提供商 · ${listing.author}` : null}
              {listing.agentId ? ` · ${listing.agentId}` : null}
            </p>
            {listing.referenceHref ? (
              <p className="mt-3 text-[13px]">
                <Link
                  href={listing.referenceHref}
                  className="font-medium text-[#465240] underline-offset-2 hover:underline"
                >
                  查看官方参考实现文档 →
                </Link>
              </p>
            ) : null}
            <p className="mt-6 text-[15px] leading-7 text-[#3a3d41]">
              {listing.description || "餐饮经营场景 Agent。安装后授权进 MealKey OS，未安装调用将被 Gateway 拒绝。"}
            </p>

            <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-t border-[rgba(24,24,23,0.08)] pt-6">
              <div>
                <p className="text-[22px] font-semibold tracking-[-0.03em]">{formatPrice(listing)}</p>
                <p className="mt-1 text-[12px] text-[#8a8f98]">
                  {listing.installCount} 安装 · 评分 {listing.rating.toFixed(1)}
                </p>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleInstall()}
                className="inline-flex min-h-11 items-center justify-center rounded-[12px] bg-[#181817] px-6 text-[14px] font-semibold text-white disabled:opacity-50"
              >
                {busy
                  ? "处理中…"
                  : listing.isFree
                    ? "安装到经营台"
                    : `用经营点安装（约 ${Math.max(1, Math.round(listing.priceCents / 100))} 点）`}
              </button>
            </div>

            {message ? <p className="mt-4 text-[13px] text-[#465240]">{message}</p> : null}
            {error && listing ? <p className="mt-4 text-[13px] text-[#8b3a2f]">{error}</p> : null}

            <p className="mt-8 text-[12px] leading-5 text-[#8a8f98]">
              安装 ≠ 下载软件包。免费直接授权；付费按价扣除经营点后写入 Entitlement。未安装调用将被 Gateway 拒绝。
              <Link href="/my-agents" className="ml-1 underline-offset-2 hover:underline">
                我的 Agent
              </Link>
            </p>
          </article>
        ) : null}
      </div>
    </main>
  );
}
