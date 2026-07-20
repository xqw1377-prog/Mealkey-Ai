import { PageContent } from "@/components/operating/PageContent";

export function DashboardRouteSkeleton() {
  return (
    <PageContent width="narrow" inset="shell" className="relative pb-8">
      <div className="pointer-events-none absolute inset-x-0 -top-6 h-56 bg-[radial-gradient(ellipse_at_top,_rgba(102,115,94,0.09),_transparent_68%)]" />
      <div className="relative animate-pulse space-y-5">
        <div className="mt-1 h-11 rounded-[16px] bg-[rgba(24,24,23,0.06)]" />

        <section className="mt-5 rounded-[20px] border border-[rgba(24,24,23,0.06)] bg-[rgba(102,115,94,0.04)] px-4 py-4">
          <div className="h-3 w-24 rounded bg-[rgba(102,115,94,0.16)]" />
          <div className="mt-3 h-7 w-2/3 rounded bg-[rgba(24,24,23,0.08)]" />
          <div className="mt-2 h-4 w-5/6 rounded bg-[rgba(24,24,23,0.06)]" />
          <div className="mt-4 flex gap-2">
            <div className="h-11 w-32 rounded-[14px] bg-[rgba(24,24,23,0.08)]" />
            <div className="h-11 w-24 rounded-[14px] bg-[rgba(24,24,23,0.06)]" />
          </div>
        </section>

        <section className="rounded-[24px] border border-[rgba(24,24,23,0.06)] bg-white px-5 py-5 shadow-[0_16px_40px_rgba(24,24,23,0.04)]">
          <div className="h-3 w-20 rounded bg-[rgba(102,115,94,0.16)]" />
          <div className="mt-3 h-9 w-3/4 rounded bg-[rgba(24,24,23,0.08)]" />
          <div className="mt-2 h-4 w-2/3 rounded bg-[rgba(24,24,23,0.06)]" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="h-24 rounded-[18px] bg-[rgba(24,24,23,0.05)]" />
            <div className="h-24 rounded-[18px] bg-[rgba(24,24,23,0.05)]" />
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="h-56 rounded-[22px] border border-[rgba(24,24,23,0.06)] bg-white shadow-[0_12px_32px_rgba(24,24,23,0.04)]" />
          <div className="space-y-4">
            <div className="h-28 rounded-[22px] border border-[rgba(24,24,23,0.06)] bg-white shadow-[0_12px_32px_rgba(24,24,23,0.04)]" />
            <div className="h-24 rounded-[22px] border border-[rgba(24,24,23,0.06)] bg-white shadow-[0_12px_32px_rgba(24,24,23,0.04)]" />
          </div>
        </div>
      </div>
    </PageContent>
  );
}
