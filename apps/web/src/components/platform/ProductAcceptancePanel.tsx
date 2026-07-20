"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";

type CheckStatus = "pass" | "warn" | "fail";

type AcceptanceCheck = {
  id: string;
  category: string;
  label: string;
  status: CheckStatus;
  detail: string;
  bossVerify?: string;
};

type Report = {
  checkedAt: string;
  readyForDemo: boolean;
  readyForProduction: boolean;
  passCount: number;
  warnCount: number;
  failCount: number;
  checks: AcceptanceCheck[];
  summary: string;
};

const STATUS_STYLE: Record<CheckStatus, string> = {
  pass: "text-[#5f6b4e]",
  warn: "text-[#a56b4d]",
  fail: "text-[#a3443a]",
};

const STATUS_LABEL: Record<CheckStatus, string> = {
  pass: "通过",
  warn: "警告",
  fail: "失败",
};

export function ProductAcceptancePanel() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/platform/admin/acceptance/readiness", {
        cache: "no-store",
      });
      const body = (await res.json()) as {
        ok?: boolean;
        error?: string;
        report?: Report;
      };
      if (!res.ok || !body.ok || !body.report) {
        throw new Error(body.error || "验收检查失败");
      }
      setReport(body.report);
    } catch (e) {
      setError(e instanceof Error ? e.message : "验收检查失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="rounded-[16px] border border-[rgba(24,24,23,0.08)] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[12px] tracking-[0.08em] text-[#66735E]">
            PRODUCT ACCEPTANCE
          </p>
          <p className="mt-1 text-[15px] font-semibold text-[#202124]">
            产品联调验收就绪
          </p>
          <p className="mt-1 text-[12px] text-[#8a8f96]">
            按老板能感知的能力检查：引擎、支付、语音、门禁
            {report?.checkedAt
              ? ` · ${new Date(report.checkedAt).toLocaleTimeString("zh-CN")}`
              : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex min-h-10 items-center gap-1.5 border border-[rgba(24,24,23,0.1)] px-3 text-[12px] font-semibold text-[#202124] disabled:opacity-50"
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          {loading ? "检查中" : "重检"}
        </button>
      </div>

      {error ? (
        <p className="mt-3 text-[13px] text-[#a56b4d]">{error}</p>
      ) : null}

      {report ? (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-2 text-[12px]">
            <span
              className={`border px-2 py-1 font-medium ${
                report.readyForProduction
                  ? "border-[rgba(95,107,78,0.35)] bg-[rgba(95,107,78,0.08)] text-[#5f6b4e]"
                  : report.readyForDemo
                    ? "border-[rgba(165,107,77,0.35)] bg-[rgba(165,107,77,0.08)] text-[#a56b4d]"
                    : "border-[rgba(163,68,58,0.35)] bg-[rgba(163,68,58,0.08)] text-[#a3443a]"
              }`}
            >
              {report.readyForProduction
                ? "生产就绪"
                : report.readyForDemo
                  ? "演示就绪"
                  : "未就绪"}
            </span>
            <span className="border border-[rgba(24,24,23,0.08)] px-2 py-1 text-[#6f747b]">
              通过 {report.passCount} · 警告 {report.warnCount} · 失败{" "}
              {report.failCount}
            </span>
          </div>
          <p className="text-[13px] leading-6 text-[#202124]">{report.summary}</p>

          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-[12px] font-medium text-[#66735E] underline-offset-2 hover:underline"
          >
            {expanded ? "收起明细" : "展开明细与老板验收步骤"}
          </button>

          {expanded ? (
            <ul className="space-y-2">
              {report.checks.map((c) => (
                <li
                  key={c.id}
                  className="rounded-[12px] border border-[rgba(24,24,23,0.06)] bg-[#FCFBF8] px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-[13px] font-medium text-[#202124]">
                      {c.label}
                    </p>
                    <span
                      className={`text-[11px] font-semibold ${STATUS_STYLE[c.status]}`}
                    >
                      {STATUS_LABEL[c.status]}
                    </span>
                  </div>
                  <p className="mt-1 text-[12px] leading-5 text-[#6f747b]">
                    {c.detail}
                  </p>
                  {c.bossVerify ? (
                    <p className="mt-1 text-[12px] leading-5 text-[#66735E]">
                      验收：{c.bossVerify}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
