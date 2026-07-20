"use client";

export type DecisionOpinionItem = {
  decisionId?: string;
  expert: string;
  position: "support" | "oppose" | "neutral" | string;
  reason: string;
  confidence?: number;
  evidenceIds?: string[];
  createdAt?: string;
};

const POSITION_LABEL: Record<string, string> = {
  support: "支持",
  oppose: "反对",
  neutral: "中立",
};

/** OS 档案色：#66735E / #B47C5C（档案页统一，不混 atelier） */
const POSITION_TONE: Record<string, string> = {
  support: "text-[#66735E] bg-[rgba(102,115,94,0.10)]",
  oppose: "text-[#B47C5C] bg-[rgba(180,124,92,0.12)]",
  neutral: "text-[#6f747b] bg-[rgba(24,24,23,0.06)]",
};

type DecisionOpinionsTimelineProps = {
  opinions: DecisionOpinionItem[];
  title?: string;
};

/**
 * Decision Runtime — outcome.opinions 专家意见时间线（OS 视觉）
 */
export function DecisionOpinionsTimeline({
  opinions,
  title = "专家意见时间线",
}: DecisionOpinionsTimelineProps) {
  if (!opinions.length) return null;

  return (
    <section className="mt-3 border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-3.5 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[12px] tracking-[0.06em] text-[#66735E]">
          决策 · {title}
        </p>
        <p className="text-[12px] text-[#6f747b]">{opinions.length} 条</p>
      </div>
      <ol className="mt-3 space-y-0">
        {opinions.map((op, index) => {
          const pos = String(op.position || "neutral");
          const tone = POSITION_TONE[pos] || POSITION_TONE.neutral;
          return (
            <li
              key={`${op.expert}-${index}-${op.reason.slice(0, 12)}`}
              className="grid grid-cols-[20px_1fr] gap-2.5"
            >
              <div className="flex flex-col items-center pt-1">
                <span className="h-2.5 w-2.5 bg-[#66735E]" />
                {index < opinions.length - 1 ? (
                  <span className="mt-1 w-px flex-1 bg-[rgba(24,24,23,0.10)]" />
                ) : null}
              </div>
              <div className={index < opinions.length - 1 ? "pb-3" : ""}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-semibold text-[#202124]">
                    {op.expert}
                  </span>
                  <span
                    className={`inline-flex px-2 py-0.5 text-[11px] font-medium ${tone}`}
                  >
                    {POSITION_LABEL[pos] || pos}
                  </span>
                  {typeof op.confidence === "number" ? (
                    <span className="text-[11px] text-[#6f747b]">
                      置信 {Math.round(op.confidence * 100)}%
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-[13px] leading-6 text-[#5f6368]">
                  {op.reason}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function parseDecisionOpinions(raw: unknown): DecisionOpinionItem[] {
  if (!raw || typeof raw !== "object") return [];
  const outcome = raw as { opinions?: unknown };
  if (!Array.isArray(outcome.opinions)) return [];
  return outcome.opinions
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const row = item as Record<string, unknown>;
      return {
        decisionId:
          typeof row.decisionId === "string" ? row.decisionId : undefined,
        expert: String(row.expert || "专家"),
        position: String(row.position || "neutral"),
        reason: String(row.reason || row.summary || "").trim(),
        confidence:
          typeof row.confidence === "number" ? row.confidence : undefined,
        evidenceIds: Array.isArray(row.evidenceIds)
          ? (row.evidenceIds as string[])
          : undefined,
        createdAt:
          typeof row.createdAt === "string" ? row.createdAt : undefined,
      };
    })
    .filter((o) => o.reason.length > 0)
    .slice(0, 12);
}
