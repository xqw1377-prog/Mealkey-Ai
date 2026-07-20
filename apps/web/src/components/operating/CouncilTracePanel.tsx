"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";

type InsightSummary = {
  id?: string;
  sourceAgent?: string;
  domain?: string;
  finding?: string;
  confidence?: number;
};

type CouncilTrace = {
  caseId?: string;
  sessionId?: string;
  insightCount?: number;
  recommendedAction?: string;
  founderChoice?: string;
  decisionTrace?: {
    insights?: InsightSummary[];
    councilOpinions?: Array<{
      member?: string;
      position?: string;
      judgment?: string;
    }>;
    resolution?: {
      recommendedAction?: string;
      majorityView?: string[];
    };
    outcome?: { status?: string };
  } | null;
};

type Props = {
  projectId?: string;
  councilSource?: string | null;
  councilTrace?: CouncilTrace | null;
  decisionContract?: {
    source?: string;
    insights?: InsightSummary[];
    level?: string;
    roster?: string[];
  } | null;
  compact?: boolean;
};

const POSITION_ZH: Record<string, string> = {
  support: "支持",
  oppose: "反对",
  conditional: "条件",
};

const WHO_OPTIONS = [
  { id: "council" as const, label: "委员会对了" },
  { id: "founder" as const, label: "创始人对了" },
  { id: "mixed" as const, label: "各对一半" },
];

/**
 * 行动档案 · 七常委 Trace / Insight 摘要
 */
export function CouncilTracePanel({
  projectId,
  councilSource,
  councilTrace,
  decisionContract,
  compact,
}: Props) {
  const fromCouncil =
    councilSource === "decision_council" ||
    decisionContract?.source === "decision_council" ||
    Boolean(councilTrace);

  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const writeBack = trpc.decisionCouncil.writeBackResult.useMutation({
    onSuccess: () => setDone(true),
  });

  if (!fromCouncil) return null;

  const insights =
    decisionContract?.insights ||
    councilTrace?.decisionTrace?.insights ||
    [];
  const opinions = councilTrace?.decisionTrace?.councilOpinions || [];
  const insightCount = councilTrace?.insightCount ?? insights.length;
  const action =
    councilTrace?.recommendedAction ||
    councilTrace?.decisionTrace?.resolution?.recommendedAction;
  const caseId = councilTrace?.caseId;
  const canWriteBack =
    Boolean(projectId) && Boolean(caseId) && !compact && !done;

  return (
    <section
      className={
        compact
          ? "mt-3 border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] p-3"
          : "mt-3 border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] p-4"
      }
    >
      <p className="text-[11px] font-medium tracking-[0.12em] text-[#66735E]">
        决策过程
      </p>
      <p className="mt-1.5 text-[13px] leading-6 text-[#3c4043]">
        洞察 × {insightCount}
        {opinions.length ? ` → 席位意见 × ${opinions.length}` : ""}
        {action ? ` → ${action}` : ""}
        {councilTrace?.founderChoice
          ? ` → 裁决：${councilTrace.founderChoice}`
          : ""}
        {councilTrace?.decisionTrace?.outcome?.status
          ? ` → ${councilTrace.decisionTrace.outcome.status}`
          : ""}
      </p>
      {decisionContract?.level || decisionContract?.roster?.length ? (
        <p className="mt-1 text-[12px] text-[#6f747b]">
          {decisionContract.level ? `级别 ${decisionContract.level}` : ""}
          {decisionContract.roster?.length
            ? ` · ${decisionContract.roster.join(" / ")}`
            : ""}
        </p>
      ) : null}

      {insights.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {insights.slice(0, compact ? 3 : 6).map((item, idx) => (
            <li
              key={item.id || `${item.sourceAgent}-${idx}`}
              className="border border-[rgba(24,24,23,0.06)] bg-white px-3 py-2 text-[12px] leading-5 text-[#3c4043]"
            >
              <span className="font-semibold text-[#202124]">
                {item.sourceAgent || "Agent"}
              </span>
              {item.domain ? (
                <span className="text-[#6f747b]"> · {item.domain}</span>
              ) : null}
              {typeof item.confidence === "number" ? (
                <span className="text-[#6f747b]">
                  {" "}
                  · {(item.confidence * 100).toFixed(0)}%
                </span>
              ) : null}
              <br />
              {item.finding || "—"}
            </li>
          ))}
        </ul>
      ) : null}

      {!compact && opinions.length > 0 ? (
        <ul className="mt-3 space-y-1.5 border-t border-[rgba(24,24,23,0.06)] pt-3">
          {opinions.slice(0, 7).map((op, idx) => (
            <li
              key={`${op.member}-${idx}`}
              className="text-[12px] leading-5 text-[#5f655d]"
            >
              <span className="font-medium text-[#202124]">
                {op.member}
              </span>
              {" · "}
              {POSITION_ZH[op.position || ""] || op.position || "—"}
              {op.judgment ? ` — ${op.judgment}` : ""}
            </li>
          ))}
        </ul>
      ) : null}

      {canWriteBack ? (
        <div className="mt-3 space-y-2 border-t border-[rgba(24,24,23,0.06)] pt-3">
          <p className="text-[11px] tracking-[0.1em] text-[#6f747b]">
            复盘纠偏 · 谁对了（写入常委记忆）
          </p>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="发生了什么 / 教训（可选）"
            className="w-full border border-[rgba(24,24,23,0.1)] bg-white px-3 py-2 text-[13px] outline-none focus:border-[#181817]"
          />
          <div className="flex flex-wrap gap-1.5">
            {WHO_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                disabled={writeBack.isPending}
                onClick={() =>
                  writeBack.mutate({
                    projectId: projectId!,
                    caseId: caseId!,
                    whatHappened: note.trim() || "验证后复盘纠偏",
                    result: "mixed",
                    whoWasRight: opt.id,
                    lesson: note.trim() || undefined,
                  })
                }
                className="inline-flex min-h-11 items-center justify-center border border-[rgba(24,24,23,0.1)] bg-white px-4 text-[13px] font-medium text-[#202124] touch-manipulation disabled:opacity-60"
              >
                {opt.label}
              </button>
            ))}
          </div>
          {writeBack.error ? (
            <p className="text-[12px] text-[#8a3b2a]">
              {writeBack.error.message}
            </p>
          ) : null}
        </div>
      ) : null}
      {done ? (
        <p className="mt-3 text-[12px] text-[#66735E]">已写入常委记忆复盘。</p>
      ) : null}
    </section>
  );
}
