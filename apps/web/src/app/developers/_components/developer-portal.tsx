import Link from "next/link";

import { MKBrand } from "@/components/brand/MKBrand";
import { PRODUCT_BRAND } from "@/lib/product-brand";

export const DEVELOPER_NAV = [
  { href: "/developers", label: "首页", exact: true },
  { href: "/developers/start", label: "Start" },
  { href: "/developers/docs", label: "Docs" },
  { href: "/developers/sdk", label: "Kit" },
  { href: "/developers/console", label: "Console" },
  { href: "/developers/examples/m-ops", label: "M-OPS" },
  { href: "/developers/apply", label: "Apply" },
] as const;

export const DOCS_NAV = [
  { href: "/developers/docs", label: "概览", exact: true },
  { href: "/developers/docs/quick-start", label: "Quick Start" },
  { href: "/developers/docs/constitution", label: "宪法索引" },
  { href: "/developers/docs/protocol", label: "Agent Protocol" },
  { href: "/developers/docs/context-api", label: "Context API" },
  { href: "/developers/docs/ingress-api", label: "Ingress API" },
  { href: "/developers/docs/manifest", label: "Manifest" },
  { href: "/developers/docs/security", label: "Security" },
] as const;

export function DeveloperShell({
  children,
  activePath,
}: {
  children: React.ReactNode;
  activePath: string;
}) {
  return (
    <div className="relative min-h-[100dvh] text-[#171717]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(165deg,#f3f5f0_0%,#e8ede4_45%,#dfe6d9_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_50%_at_0%_0%,rgba(255,255,255,0.75)_0%,transparent_55%),radial-gradient(70%_45%_at_100%_10%,rgba(102,115,94,0.16)_0%,transparent_50%)]"
      />

      <header className="relative border-b border-[rgba(24,24,23,0.08)] bg-[rgba(243,245,240,0.82)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 md:px-8">
          <Link href="/developers" className="min-w-0 no-underline">
            <MKBrand compact subtitle="Developers" />
          </Link>
          <nav className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
            {DEVELOPER_NAV.map((item) => {
              const exact = "exact" in item && item.exact;
              const active = exact
                ? activePath === item.href
                : activePath === item.href || activePath.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-[10px] px-2.5 py-1.5 text-[13px] font-medium transition ${
                    active
                      ? "bg-[#181817] text-white"
                      : "text-[#3a3d41] hover:bg-[rgba(24,24,23,0.06)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/"
              className="ml-1 hidden rounded-[10px] px-2.5 py-1.5 text-[13px] text-[#6f747b] underline-offset-2 hover:underline sm:inline"
            >
              {PRODUCT_BRAND.nameZh} 主站
            </Link>
          </nav>
        </div>
      </header>

      <div className="relative">{children}</div>
    </div>
  );
}

export function DocsLayout({
  activePath,
  children,
}: {
  activePath: string;
  children: React.ReactNode;
}) {
  return (
    <DeveloperShell activePath={activePath}>
      <div className="mx-auto grid max-w-6xl gap-8 px-5 py-8 md:grid-cols-[200px_minmax(0,1fr)] md:px-8 md:py-10">
        <aside className="md:sticky md:top-6 md:self-start">
          <p className="text-[11px] font-medium tracking-[0.1em] text-[#66735E]">DOCS</p>
          <nav className="mt-3 flex flex-row flex-wrap gap-1.5 md:flex-col md:gap-1">
            {DOCS_NAV.map((item) => {
              const exact = "exact" in item && item.exact;
              const active = exact
                ? activePath === item.href
                : activePath === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-[10px] px-2.5 py-1.5 text-[13px] transition ${
                    active
                      ? "bg-white font-semibold text-[#181817] shadow-[0_1px_0_rgba(24,24,23,0.04)]"
                      : "text-[#5f6368] hover:bg-white/60 hover:text-[#181817]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <article className="min-w-0">{children}</article>
      </div>
    </DeveloperShell>
  );
}

export function DocHeader({
  eyebrow,
  title,
  description,
  authority,
}: {
  eyebrow: string;
  title: string;
  description: string;
  authority: string;
}) {
  return (
    <header className="mb-8 max-w-3xl">
      <p className="text-[11px] font-medium tracking-[0.1em] text-[#66735E]">{eyebrow}</p>
      <h1 className="mt-2 font-display text-[28px] font-semibold tracking-[-0.04em] text-[#171717] md:text-[34px]">
        {title}
      </h1>
      <p className="mt-3 text-[15px] leading-7 text-[#3a3d41]">{description}</p>
      <p className="mt-4 rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-white/70 px-3 py-2.5 text-[12px] leading-5 text-[#5f6368]">
        权威源（本文仅投影，不改字段语义）：
        <span className="ml-1 font-medium text-[#202124]">{authority}</span>
      </p>
    </header>
  );
}

export function DocSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8 max-w-3xl">
      <h2 className="font-display text-[18px] font-semibold tracking-[-0.02em] text-[#171717]">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-[14px] leading-7 text-[#3a3d41]">{children}</div>
    </section>
  );
}

export function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-[#181817] px-4 py-3.5 text-[12px] leading-6 text-[#e8ebe4]">
      <code>{children}</code>
    </pre>
  );
}

export function DocLinkList({
  items,
}: {
  items: Array<{ href: string; label: string; note?: string }>;
}) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.href}>
          <Link
            href={item.href}
            className="font-medium text-[#465240] underline-offset-2 hover:underline"
          >
            {item.label}
          </Link>
          {item.note ? (
            <span className="ml-2 text-[13px] text-[#6f747b]">{item.note}</span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

/** Docs 三区：你能做什么 / 契约 / 案例 */
export function DocZones({
  canDo,
  contract,
  example,
}: {
  canDo: React.ReactNode;
  contract: React.ReactNode;
  example: React.ReactNode;
}) {
  return (
    <div className="max-w-3xl space-y-10">
      <section>
        <p className="text-[11px] font-medium tracking-[0.1em] text-[#66735E]">
          你能做什么
        </p>
        <div className="mt-2 text-[15px] leading-7 text-[#3a3d41]">{canDo}</div>
      </section>
      <section>
        <p className="text-[11px] font-medium tracking-[0.1em] text-[#66735E]">
          契约 / API
        </p>
        <div className="mt-3 space-y-3 text-[14px] leading-7 text-[#3a3d41]">
          {contract}
        </div>
      </section>
      <section>
        <p className="text-[11px] font-medium tracking-[0.1em] text-[#66735E]">
          实际案例 · M-OPS
        </p>
        <div className="mt-3 space-y-3 text-[14px] leading-7 text-[#3a3d41]">
          {example}
        </div>
      </section>
    </div>
  );
}
