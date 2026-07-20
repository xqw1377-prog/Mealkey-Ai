"use client";

import {
  buildDecisionReadiness,
  type DecisionReadinessV1,
} from "@/server/founder-layer/contracts/business-identity";
import { toUserFacingGapLabel } from "@/lib/i18n/user-facing";

function Stars({ n }: { n: number }) {
  const filled = Math.max(0, Math.min(5, n));
  return (
    <span className="tracking-wide text-[#202124]" aria-label={`${filled} 星`}>
      {"★".repeat(filled)}
      {"☆".repeat(5 - filled)}
    </span>
  );
}

export function DecisionReadinessPanel({
  readiness,
  compact,
  onSupplement,
  onContinueAnyway,
}: {
  readiness: DecisionReadinessV1;
  compact?: boolean;
  onSupplement?: () => void;
  onContinueAnyway?: () => void;
}) {
  if (compact) {
    return (
      <div className="space-y-1">
        <p className="text-[12px] text-[#6f747b]">
          这次能不能定 · <Stars n={readiness.stars} />
          <span className="ml-2 text-[#3a3d41]">{readiness.stateLabel}</span>
        </p>
        {readiness.missing[0] ? (
          <p className="text-[12px] text-[#B47C5C]">
            先补：{toUserFacingGapLabel(readiness.missing[0])}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <section className="space-y-3 rounded-[12px] border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-4 py-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[11px] font-medium tracking-[0.12em] text-[#66735E]">
          本次决策准备度
        </p>
        <p className="text-[15px] font-semibold text-[#202124]">
          <Stars n={readiness.stars} />
        </p>
      </div>
      <p className="text-[15px] font-medium text-[#202124]">
        状态：{readiness.stateLabel}
      </p>

      {readiness.known.length > 0 ? (
        <div className="space-y-1">
          <p className="text-[12px] text-[#66735E]">已掌握</p>
          {readiness.known.map((k) => (
            <p key={k} className="text-[13px] leading-5 text-[#202124]">
              ✓ {k}
            </p>
          ))}
        </div>
      ) : null}

      {readiness.missing.length > 0 ? (
        <div className="space-y-1">
          <p className="text-[12px] text-[#B47C5C]">缺少</p>
          {readiness.missing.map((m) => (
            <p key={m} className="text-[13px] leading-5 text-[#3a3d41]">
              ⚠ {toUserFacingGapLabel(m)}
            </p>
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-[#66735E]">关键缺口已收敛。</p>
      )}

      <p className="text-[13px] text-[#6f747b]">{readiness.suggestionLine}</p>

      {!readiness.canClaimExternalIntel ? (
        <p className="text-[12px] leading-5 text-[#B47C5C]">
          品牌或地理未齐——不会编造你所在区域的外部结论。
        </p>
      ) : null}

      {(onSupplement || onContinueAnyway) && readiness.missing.length > 0 ? (
        <div className="flex flex-wrap gap-3 pt-1">
          {onSupplement ? (
            <button
              type="button"
              onClick={onSupplement}
              className="text-[14px] font-semibold text-[#181817] underline-offset-4 hover:underline"
            >
              先补关键项
            </button>
          ) : null}
          {onContinueAnyway ? (
            <button
              type="button"
              onClick={onContinueAnyway}
              className="text-[13px] text-[#6f747b] underline-offset-4 hover:underline"
            >
              仍继续 · 结论将更保守
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

export function readinessFromScanFocus(input: {
  stars: 1 | 2 | 3 | 4 | 5;
  known: string[];
  missing: string[];
  externalIntelReady: boolean;
}): DecisionReadinessV1 {
  const score = input.stars * 18 + (input.externalIntelReady ? 10 : 0);
  return buildDecisionReadiness({
    score: Math.min(100, score),
    known: input.known,
    missing: input.missing,
    canClaimExternalIntel: input.externalIntelReady,
  });
}
