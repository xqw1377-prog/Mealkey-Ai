import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MKBrand } from "@/components/brand/MKBrand";
import { PRODUCT_BRAND } from "@/lib/product-brand";

export default function HomePage() {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden text-[#171717]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[#e7ebe3]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_70%_at_18%_-8%,rgba(255,255,255,0.92)_0%,transparent_52%),radial-gradient(85%_60%_at_92%_8%,rgba(102,115,94,0.22)_0%,transparent_55%),linear-gradient(168deg,#f4f5f0_0%,#e6ebe1_42%,#d5ddcf_100%)]"
      />
      <div
        aria-hidden="true"
        className="mk-home-glow pointer-events-none absolute -left-[20%] top-[28%] h-[55vh] w-[70vw] rounded-full bg-[radial-gradient(circle,rgba(102,115,94,0.14)_0%,transparent_70%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-[linear-gradient(180deg,transparent_0%,rgba(23,23,23,0.04)_40%,rgba(23,23,23,0.08)_100%)]"
      />
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute -right-6 top-[22%] h-[46vh] w-[46vh] opacity-[0.11] md:right-[6%] md:top-[18%] md:opacity-[0.14]"
        viewBox="0 0 240 240"
        fill="none"
      >
        <circle cx="120" cy="120" r="96" stroke="#171717" strokeWidth="1.2" />
        <circle cx="120" cy="120" r="62" stroke="#66735E" strokeWidth="1.4" />
        <path
          d="M72 148 L108 98 L138 128 L176 72"
          stroke="#171717"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="176" cy="72" r="5" fill="#66735E" />
      </svg>

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-xl flex-col justify-between px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] md:max-w-2xl md:px-10 md:pb-10 md:pt-10">
        <div className="flex flex-1 flex-col justify-center py-6 md:py-10">
          <header className="mpnt-rise">
            <MKBrand size="landing" />
          </header>

          <section className="mpnt-rise mpnt-rise-delay-1 mt-10 max-w-md space-y-4 md:mt-12 md:space-y-5">
            <p className="font-display text-[20px] font-semibold leading-[1.45] tracking-[-0.03em] text-[#202124] md:text-[22px]">
              {PRODUCT_BRAND.heroLines[0]}
              <br />
              {PRODUCT_BRAND.heroLines[1]}
            </p>
            <p className="max-w-sm text-[15px] leading-7 text-[#3a3d41]">
              {PRODUCT_BRAND.heroSupport}
            </p>
          </section>

          <div className="mpnt-rise mpnt-rise-delay-2 mt-9 flex w-full max-w-md flex-col gap-3 sm:mt-10 sm:flex-row sm:items-stretch">
            <Link
              href="/store"
              className="btn-primary min-h-12 w-full flex-1 touch-manipulation justify-center text-[15px]"
            >
              <span>浏览 Store</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/developers"
              className="btn-secondary min-h-12 w-full flex-1 touch-manipulation justify-center text-[15px]"
            >
              <span>开发者</span>
            </Link>
          </div>
          <p className="mpnt-rise mpnt-rise-delay-2 mt-3 text-[12px] text-[#6f747b]">
            已有账号？
            <Link href="/login" className="ml-1 underline-offset-2 hover:underline">
              登录经营台
            </Link>
            <span className="mx-2 text-[rgba(24,24,23,0.2)]">·</span>
            <Link href="/developers/console" className="underline-offset-2 hover:underline">
              Console
            </Link>
          </p>
        </div>

        <footer className="mpnt-rise mpnt-rise-delay-3 shrink-0 pt-4 text-[12px] leading-5 tracking-[0.04em] text-[#6f747b]">
          {PRODUCT_BRAND.nameZh} · {PRODUCT_BRAND.nameEn}
          <span className="mx-2 text-[rgba(24,24,23,0.2)]">·</span>
          <Link href="/store" className="underline-offset-2 hover:underline">
            Store
          </Link>
          <span className="mx-2 text-[rgba(24,24,23,0.2)]">·</span>
          <Link href="/developers" className="underline-offset-2 hover:underline">
            Developers
          </Link>
        </footer>
      </div>
    </main>
  );
}
