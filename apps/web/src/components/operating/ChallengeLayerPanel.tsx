"use client";

import { useState } from "react";
import type { ChallengeReportV1 } from "@/server/founder-layer/contracts/challenge-report";
import { toUserFacingGapLabel } from "@/lib/i18n/user-facing";

function severityTone(severity: "low" | "medium" | "high") {
  if (severity === "high") return "text-[#B47C5C]";
  if (severity === "medium") return "text-[#A68B3C]";
  return "text-[#66735E]";
}

export function ChallengeLayerPanel({
  report,
}: {
  report: ChallengeReportV1;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="space-y-3 border-y border-[rgba(24,24,23,0.08)] py-5">
      <p className="text-[11px] font-medium tracking-[0.12em] text-[#66735E]">
        挑战选择
      </p>
      <p className="font-display text-[16px] font-semibold leading-snug text-[#202124]">
        {report.headline}
      </p>

      {report.items.length > 0 ? (
        <ul className="space-y-3">
          {report.items.map((item) => (
            <li
              key={item.domain}
              className="space-y-1 border-l-2 border-[rgba(24,24,23,0.12)] py-2 pl-4"
            >
              <p className="text-[13px] font-medium text-[#202124]">
                <span className={severityTone(item.severity)}>{item.label}</span>
                {item.severity === "high" ? (
                  <span className="ml-2 text-[11px] font-normal text-[#B47C5C]">
                    强
                  </span>
                ) : null}
              </p>
              <p className="text-[13px] leading-5 text-[#3a3d41]">
                {item.summary}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[13px] text-[#66735E]">暂无强挑战项。</p>
      )}

      {report.conditions.length > 0 ? (
        <div className="space-y-1">
          <p className="text-[11px] tracking-[0.1em] text-[#66735E]">
            带条件支持
          </p>
          {report.conditions.map((c) => (
            <p key={c} className="text-[13px] leading-5 text-[#3a3d41]">
              · {c}
            </p>
          ))}
        </div>
      ) : null}

      {report.missingEvidence.length > 0 ? (
        <div className="space-y-1 rounded-[12px] bg-[rgba(180,124,92,0.06)] px-3 py-3">
          <p className="text-[13px] font-medium text-[#B47C5C]">
            挑战指出仍缺证据
          </p>
          {report.missingEvidence.map((m) => (
            <p key={m} className="text-[13px] text-[#3a3d41]">
              · {toUserFacingGapLabel(m)}
            </p>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="text-[13px] font-medium text-[#66735E] underline-offset-4 touch-manipulation hover:underline"
      >
        {expanded ? "收起来源" : "查看来源（常委意见）"}
      </button>

      {expanded ? (
        <div className="space-y-2 border-t border-[rgba(24,24,23,0.06)] pt-3">
          <p className="text-[12px] text-[#6f747b]">
            来源仅作压力测试依据，不是群聊发言墙。
          </p>
          {report.items.flatMap((item) =>
            item.sourceClaims.map((claim, i) => (
              <p
                key={`${item.domain}_${i}`}
                className="text-[12px] leading-5 text-[#6f747b]"
              >
                <span className="text-[#6f747b]">
                  {(
                    item.sourceRoleIds[i] ||
                    item.sourceRoleIds[0] ||
                    ""
                  ).toUpperCase()}
                </span>
                {" · "}
                {claim}
              </p>
            )),
          )}
        </div>
      ) : null}
    </section>
  );
}
