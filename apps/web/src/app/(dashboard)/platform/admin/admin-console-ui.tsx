"use client";

import type { ReactNode } from "react";

import type { PlatformAdminMetric } from "@/server/services/platform-admin.service";

type SeededFilterToggleProps = {
  showSeededData: boolean;
  hiddenCount: number;
  onChange: (next: boolean) => void;
};

export function DemoChip() {
  return (
    <span className="rounded-full bg-[rgba(102,115,94,0.08)] px-2.5 py-1 text-[12px] text-[#465240]">
      演示样本
    </span>
  );
}

export function SeededFilterToggle({
  showSeededData,
  hiddenCount,
  onChange,
}: SeededFilterToggleProps) {
  return (
    <label className="inline-flex items-center gap-3 rounded-[16px] border border-[rgba(24,24,23,0.08)] bg-[#FCFBF8] px-4 py-3 text-[13px] text-[#5f6368]">
      <input
        type="checkbox"
        checked={showSeededData}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4"
      />
      <span>{showSeededData ? "显示演示样本" : "仅看真实对象"}</span>
      {!showSeededData && hiddenCount > 0 ? (
        <span className="rounded-full bg-[rgba(24,24,23,0.06)] px-2 py-0.5 text-[12px] text-[#5f6368]">
          已隐藏 {hiddenCount}
        </span>
      ) : null}
    </label>
  );
}

export function FieldLabel({ children }: { children: ReactNode }) {
  return <p className="text-[12px] font-medium leading-5 tracking-[0.01em] text-[#6f747b]">{children}</p>;
}

export function SectionIntro({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[20px] border border-[rgba(24,24,23,0.08)] bg-white px-5 py-4 shadow-[0_12px_28px_rgba(24,24,23,0.04)] md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-[13px] leading-5 tracking-[0.01em] text-[#66735E]">{eyebrow}</p>
        <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-[#202124]">{title}</h2>
        <p className="mt-2 max-w-[96ch] text-[14px] leading-6 text-[#6f747b]">{description}</p>
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}

export function CompactMetricStrip({
  metrics,
  formatMetricValue,
}: {
  metrics: PlatformAdminMetric[];
  formatMetricValue: (metric: PlatformAdminMetric) => string;
}) {
  return (
    <div className="grid gap-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <div
          key={metric.id}
          className="rounded-[14px] border border-[rgba(24,24,23,0.06)] bg-white/80 px-3 py-3"
        >
          <p className="text-[12px] leading-5 text-[#6f747b]">{metric.label}</p>
          <p className="mt-1 text-[18px] font-semibold leading-6 tracking-[-0.02em] text-[#202124]">
            {formatMetricValue(metric)}
          </p>
        </div>
      ))}
    </div>
  );
}

export function MetricGrid({
  metrics,
  formatMetricValue,
}: {
  metrics: PlatformAdminMetric[];
  formatMetricValue: (metric: PlatformAdminMetric) => string;
}) {
  return (
    <div className="grid gap-3 xl:grid-cols-4">
      {metrics.map((metric) => (
        <div
          key={metric.id}
          className="rounded-[18px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_12px_28px_rgba(24,24,23,0.04)]"
        >
          <p className="text-[13px] leading-5 tracking-[0.01em] text-[#6f747b]">{metric.label}</p>
          <p className="mt-3 text-[28px] font-semibold leading-none tracking-[-0.03em] text-[#202124]">
            {formatMetricValue(metric)}
          </p>
          <p className="mt-3 text-[13px] leading-5 text-[#6f747b]">{metric.helper}</p>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[18px] border border-dashed border-[rgba(24,24,23,0.12)] bg-white px-4 py-8 text-center">
      <p className="text-[15px] font-semibold text-[#202124]">{title}</p>
      <p className="mt-2 text-[13px] leading-6 text-[#6f747b]">{description}</p>
    </div>
  );
}

export function DetailField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-[14px] border border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] px-3 py-3">
      <p className="text-[12px] font-medium text-[#6f747b]">{label}</p>
      <div className="mt-1 text-[14px] leading-6 text-[#202124]">{value}</div>
    </div>
  );
}

export function PanelShell({ children }: { children: ReactNode }) {
  return <div className="space-y-5">{children}</div>;
}

export function ObjectsTable({
  id,
  eyebrow,
  title,
  description,
  aside,
  children,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  description: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-[20px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_12px_28px_rgba(24,24,23,0.04)]"
    >
      <div className="mb-4 flex flex-col gap-3 border-b border-[rgba(24,24,23,0.06)] pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#66735E]">{eyebrow}</p>
          ) : null}
          <p className="mt-1 text-[16px] font-semibold text-[#202124]">{title}</p>
          <p className="mt-1 text-[13px] leading-5 text-[#6f747b]">{description}</p>
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function WorkbenchDetailPanel({
  eyebrow,
  title,
  badge,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  badge?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="rounded-[18px] border border-[rgba(24,24,23,0.08)] bg-white p-4 shadow-[0_12px_28px_rgba(24,24,23,0.04)]">
      <div className="flex items-start justify-between gap-3 border-b border-[rgba(24,24,23,0.06)] pb-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#66735E]">{eyebrow}</p>
          <h3 className="mt-1 text-[18px] font-semibold text-[#202124]">{title}</h3>
        </div>
        {badge ? <div className="shrink-0">{badge}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
      {footer ? <div className="mt-4">{footer}</div> : null}
    </div>
  );
}

export function FilterScopeNotice({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[16px] border border-[rgba(186,160,92,0.18)] bg-[rgba(186,160,92,0.08)] px-4 py-3 text-[13px] leading-6 text-[#7A6941]">
      <p className="font-medium text-[#5B4B22]">{title}</p>
      <p className="mt-1">{description}</p>
    </div>
  );
}

export type { PlatformAdminMetric };
