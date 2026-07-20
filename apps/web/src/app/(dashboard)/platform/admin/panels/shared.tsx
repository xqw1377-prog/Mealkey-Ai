"use client";

import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

import type { PlatformAdminAlert } from "@/server/services/platform-admin.service";

export function alertToneClasses(severity: PlatformAdminAlert["severity"]) {
  if (severity === "critical") {
    return "border-[rgba(180,124,92,0.22)] bg-[rgba(180,124,92,0.08)] text-[#8A5A40]";
  }
  if (severity === "warning") {
    return "border-[rgba(186,160,92,0.18)] bg-[rgba(186,160,92,0.08)] text-[#7A6941]";
  }
  return "border-[rgba(102,115,94,0.16)] bg-[rgba(102,115,94,0.08)] text-[#465240]";
}

export function capabilityAnchorId(capability: string) {
  const normalized = capability
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `business-capability-${normalized || "unknown"}`;
}

export function consumptionAnchorId(consumptionId: string) {
  return `business-consumption-${consumptionId}`;
}

export function AlertList({
  alerts,
  onAlertClick,
  interactiveAlertIds,
  formatNumber,
}: {
  alerts: PlatformAdminAlert[];
  onAlertClick?: (alert: PlatformAdminAlert) => void;
  interactiveAlertIds?: string[];
  formatNumber: (value: number | null | undefined) => string;
}) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-[18px] border border-dashed border-[rgba(24,24,23,0.12)] bg-white px-4 py-6 text-[14px] leading-6 text-[#6f747b]">
        当前没有需要平台管理员优先处理的显著异常。
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => {
        const isInteractive = interactiveAlertIds?.includes(alert.id) && onAlertClick;
        const content = (
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[14px] font-semibold">{alert.title}</p>
                {typeof alert.count === "number" ? (
                  <span className="rounded-full bg-white/60 px-2.5 py-1 text-[12px]">
                    {formatNumber(alert.count)}
                  </span>
                ) : null}
                {isInteractive ? (
                  <span className="rounded-full bg-white/60 px-2.5 py-1 text-[12px]">
                    点击定位
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-[13px] leading-5 opacity-90">{alert.description}</p>
            </div>
          </div>
        );

        if (isInteractive) {
          return (
            <button
              key={alert.id}
              type="button"
              onClick={() => onAlertClick(alert)}
              className={`w-full rounded-[18px] border px-4 py-4 text-left transition hover:opacity-95 ${alertToneClasses(alert.severity)}`}
            >
              {content}
            </button>
          );
        }

        return (
          <div
            key={alert.id}
            className={`rounded-[18px] border px-4 py-4 ${alertToneClasses(alert.severity)}`}
          >
            {content}
          </div>
        );
      })}
    </div>
  );
}

export function ConsoleSubsection({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="rounded-[16px] border border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] px-4 py-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#66735E]">{eyebrow}</p>
        <p className="mt-1 text-[15px] font-semibold text-[#202124]">{title}</p>
        <p className="mt-1 text-[13px] leading-5 text-[#6f747b]">{description}</p>
      </div>
      {children}
    </div>
  );
}
