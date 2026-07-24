"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCcw } from "lucide-react";

type EngineRow = {
  id: string;
  label: string;
  ok: boolean;
  latencyMs: number;
  detail: string;
};

export function EngineHealthPanel() {
  const [engines, setEngines] = useState<EngineRow[]>([]);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [allOk, setAllOk] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/platform/admin/engines/health", {
        cache: "no-store",
      });
      const body = (await res.json()) as {
        ok?: boolean;
        error?: string;
        health?: {
          checkedAt: string;
          engines: EngineRow[];
          allOk?: boolean;
        };
      };
      if (!res.ok || !body.ok || !body.health) {
        throw new Error(body.error || "健康检查失败");
      }
      setEngines(body.health.engines);
      setCheckedAt(body.health.checkedAt);
      setAllOk(
        typeof body.health.allOk === "boolean"
          ? body.health.allOk
          : body.health.engines.every((e) => e.ok),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "健康检查失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="rounded-[16px] border border-[rgba(24,24,23,0.08)] bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[12px] tracking-[0.08em] text-[#66735E]">
            ENGINE HEALTH
          </p>
          <p className="mt-1 text-[15px] font-semibold text-[#202124]">
            专业引擎外呼连通性
          </p>
          <p className="mt-1 text-[12px] text-[#8a8f96]">
            生产环境：外呼不通会阻止扣点开收费拍板；咨询降级不会假标 engine。
            {checkedAt
              ? ` · 检查于 ${new Date(checkedAt).toLocaleTimeString("zh-CN")}`
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
      {!loading && !error && engines.length > 0 ? (
        <p
          className={`mt-3 text-[13px] font-medium ${
            allOk ? "text-[#5f6b4e]" : "text-[#a56b4d]"
          }`}
        >
          {allOk
            ? "收费拍板门禁：外呼齐全，可扣点开议"
            : "收费拍板门禁：有引擎 DOWN — 生产将拒扣点（开发可用 FOUNDER_ALLOW_DEGRADED_MEETING=1）"}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-[13px] text-[#a56b4d]">{error}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {engines.map((e) => (
            <li
              key={e.id}
              className="flex items-center justify-between gap-3 border border-[rgba(24,24,23,0.06)] px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-[#202124]">{e.label}</p>
                <p className="truncate text-[12px] text-[#8a8f96]">{e.detail}</p>
              </div>
              <div className="shrink-0 text-right">
                <p
                  className={`text-[12px] font-semibold ${
                    e.ok ? "text-[#5f6b4e]" : "text-[#a56b4d]"
                  }`}
                >
                  {e.ok ? "OK" : "DOWN"}
                </p>
                <p className="text-[11px] text-[#8a8f96]">{e.latencyMs}ms</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
