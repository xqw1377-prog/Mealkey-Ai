"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { SeatPrimaryFact } from "../../../../../packages/agents/src/consulting-os";

type FactDraft = {
  factId?: string;
  claim: string;
  sourceRef: string;
};

type Props = {
  facts?: SeatPrimaryFact[] | null;
  disabled?: boolean;
  pending?: boolean;
  onSave: (facts: FactDraft[]) => Promise<void> | void;
};

export function SeatPrimaryFactsEditor({
  facts,
  disabled,
  pending,
  onSave,
}: Props) {
  const [rows, setRows] = useState<FactDraft[]>(() =>
    (facts || []).map((f) => ({
      factId: f.factId,
      claim: f.claim,
      sourceRef: f.sourceRef,
    })),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRows(
      (facts || []).map((f) => ({
        factId: f.factId,
        claim: f.claim,
        sourceRef: f.sourceRef,
      })),
    );
  }, [facts]);

  const canEdit = !disabled;

  return (
    <div className="space-y-3 border border-[rgba(20,20,19,0.08)] bg-[rgba(248,246,240,0.65)] p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] tracking-[0.12em] text-[#5f6b4e]">
            店里事实
          </p>
          <p className="mt-1 text-[13px] leading-5 text-[#6f747b]">
            签字前至少 2 条可核对的事实；可手填。
          </p>
        </div>
        {canEdit ? (
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-1 px-2 text-[13px] font-semibold text-[#181817] touch-manipulation"
            onClick={() =>
              setRows((prev) => [...prev, { claim: "", sourceRef: "" }])
            }
          >
            <Plus className="h-3.5 w-3.5" /> 添加
          </button>
        ) : null}
      </div>

      <ul className="space-y-3">
        {(rows.length ? rows : [{ claim: "", sourceRef: "" }]).map((row, i) => (
          <li key={row.factId || `new-${i}`} className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-[#6f747b]">
                #{String(i + 1).padStart(2, "0")}
              </p>
              {canEdit && rows.length > 1 ? (
                <button
                  type="button"
                  className="inline-flex min-h-11 items-center gap-1 px-2 text-[12px] text-[#a56b4d] touch-manipulation"
                  onClick={() =>
                    setRows((prev) => prev.filter((_, idx) => idx !== i))
                  }
                >
                  <Trash2 className="h-3.5 w-3.5" /> 删除
                </button>
              ) : null}
            </div>
            <input
              value={row.claim}
              disabled={!canEdit || pending}
              placeholder="事实主张（如：写字楼商圈客流集中）"
              className="min-h-11 w-full border border-[rgba(20,20,19,0.1)] bg-white px-3 text-[14px] text-[#141413] outline-none focus:border-[#141413] disabled:opacity-60"
              onChange={(e) => {
                const value = e.target.value;
                setRows((prev) => {
                  const next = [...prev];
                  next[i] = { ...next[i], claim: value };
                  return next;
                });
              }}
            />
            <input
              value={row.sourceRef}
              disabled={!canEdit || pending}
              placeholder="来源（标题 | 摘要 | URL，或店访编号）"
              className="min-h-11 w-full border border-[rgba(20,20,19,0.1)] bg-white px-3 text-[14px] text-[#141413] outline-none focus:border-[#141413] disabled:opacity-60"
              onChange={(e) => {
                const value = e.target.value;
                setRows((prev) => {
                  const next = [...prev];
                  next[i] = { ...next[i], sourceRef: value };
                  return next;
                });
              }}
            />
          </li>
        ))}
      </ul>

      {error ? (
        <p className="text-[12px] text-[#a56b4d]">{error}</p>
      ) : null}

      {canEdit ? (
        <button
          type="button"
          disabled={pending}
          className="inline-flex min-h-12 w-full items-center justify-center bg-[#181817] px-4 text-[14px] font-semibold text-white touch-manipulation active:scale-[0.98] disabled:opacity-50 sm:w-auto sm:min-h-11 sm:text-[13px]"
          onClick={() => {
            void (async () => {
              setError(null);
              try {
                await onSave(rows.filter((r) => r.claim.trim() || r.sourceRef.trim()));
              } catch (e) {
                setError(e instanceof Error ? e.message : "保存失败");
              }
            })();
          }}
        >
          {pending ? "保存中…" : "保存事实"}
        </button>
      ) : null}
    </div>
  );
}
