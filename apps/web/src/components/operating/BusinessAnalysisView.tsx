"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  clearBusinessAnalysisPacket,
  readBusinessAnalysisPacket,
  type BusinessAnalysisPacketV1,
} from "@/lib/business-analysis-packet";
import { decisionReadyPath } from "@/lib/decision-entry";
import { saveDecisionVoiceBrief } from "@/lib/decision-voice-brief";

function starsLabel(n: number) {
  return "★".repeat(Math.max(0, Math.min(5, n))) + "☆".repeat(Math.max(0, 5 - n));
}

function severityLabel(s: BusinessAnalysisPacketV1["severity"]) {
  if (s === "decide") return "需要决策";
  if (s === "positive") return "正向变化";
  return "值得关注";
}

function kindLabel(kind: BusinessAnalysisPacketV1["evidence"][number]["kind"]) {
  if (kind === "internal_fact") return "内部";
  if (kind === "external_intel") return "外部";
  return "推理";
}

export function BusinessAnalysisView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [packet] = useState(() => readBusinessAnalysisPacket(projectId));

  const layers = useMemo(() => {
    if (!packet) return [];
    return [
      { id: "1", label: "观察", body: packet.observation },
      { id: "2", label: "模式", body: packet.pattern },
      { id: "3", label: "意义", body: packet.meaning },
      { id: "4", label: "影响", body: packet.impact },
      { id: "5", label: "建议", body: packet.recommendation },
    ].filter((l) => l.body.trim().length > 0);
  }, [packet]);

  if (!packet) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
        <p className="font-display text-[22px] font-semibold text-[#202124]">
          变化解读
        </p>
        <p className="text-[14px] leading-6 text-[#6f747b]">
          还没有可展示的分析。请先从「今日」进入一条变化。
        </p>
        <Link
          href="/dashboard"
          prefetch={false}
          className="inline-flex min-h-11 items-center gap-2 text-[14px] font-medium text-[#181817] no-underline underline-offset-4 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          返回今日
        </Link>
      </div>
    );
  }

  function promoteToCouncil() {
    const evidenceSummary = packet!.evidence
      .map((e) => e.claim)
      .filter(Boolean)
      .slice(0, 6);
    const missing = packet!.unknown.filter(Boolean).slice(0, 3).join("、");
    saveDecisionVoiceBrief(projectId, {
      topic: packet!.decisionTopic || packet!.decisionQuestion,
      whyNow: [
        packet!.headlineJudgment,
        packet!.impact ? `影响：${packet!.impact}` : "",
        evidenceSummary.length ? `证据 ${evidenceSummary.length} 条` : "",
      ]
        .filter(Boolean)
        .join(" · "),
      decisionQuestion: packet!.decisionQuestion,
      constraints: [
        "不突破现金底线、合规底线与团队稳定",
        missing ? `先承认未知：${missing}` : "",
      ]
        .filter(Boolean)
        .join("；"),
      successLooksLike: packet!.recommendation
        ? `先做到：${packet!.recommendation}`
        : "有明确选择（做 / 不做 / 条件做）、能执行、能复盘成败",
      evidenceSummary: evidenceSummary.length ? evidenceSummary : undefined,
    });
    clearBusinessAnalysisPacket();
    router.push(
      decisionReadyPath(projectId, packet!.decisionTopic || packet!.decisionQuestion, {
        whyNow: packet!.headlineJudgment,
      }),
    );
  }

  const canPromote = packet.severity === "decide";

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8 pb-24">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link
            href="/dashboard"
            prefetch={false}
            className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-medium text-[#66735E] no-underline touch-manipulation"
          >
            <ArrowLeft className="h-4 w-4" />
            返回今日
          </Link>
          <p className="text-[11px] tracking-[0.14em] text-[#66735E]">
            餐启 · 变化解读
          </p>
        </div>
        <p className="text-[13px] leading-5 text-[#6f747b]">
          {packet.brandLine} · {packet.signalTypeLabel} ·{" "}
          <span className="tracking-[0.08em]">{starsLabel(packet.importanceStars)}</span>{" "}
          · {severityLabel(packet.severity)}
        </p>
        <p className="text-[12px] text-[#8a8f96]">截至今日观察</p>
      </header>

      <section className="space-y-3">
        <p className="text-[11px] tracking-[0.1em] text-[#66735E]">
          这条变化在问什么（拍板请进决策室）
        </p>
        <h1 className="font-display text-[26px] font-semibold leading-snug text-[#202124]">
          {packet.decisionQuestion}
        </h1>
        <div className="space-y-1.5 pt-2">
          <p className="text-[11px] tracking-[0.1em] text-[#66735E]">我的判断</p>
          <p className="font-display text-[18px] font-semibold leading-snug text-[#202124]">
            {packet.headlineJudgment}
          </p>
        </div>
      </section>

      <section className="space-y-4 border-t border-[rgba(24,24,23,0.08)] pt-6">
        <p className="text-[11px] tracking-[0.1em] text-[#66735E]">发生了什么</p>
        <ol className="space-y-4">
          {layers.map((layer) => (
            <li key={layer.id} className="space-y-1">
              <p className="text-[12px] font-medium text-[#465240]">
                {layer.id} {layer.label}
              </p>
              <p className="text-[14px] leading-6 text-[#3a3d41]">{layer.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-3 border-t border-[rgba(24,24,23,0.08)] pt-6">
        <p className="text-[11px] tracking-[0.1em] text-[#66735E]">
          证据（可核验）
        </p>
        {packet.evidence.length === 0 ? (
          <p className="text-[14px] leading-6 text-[#8A4F31]">
            暂无可核验线索。不编造口碑或数字；可先补品牌/城市或上传周经营数据后再刷新雷达。
          </p>
        ) : (
          <ul className="space-y-2.5">
            {packet.evidence.map((e, i) => (
              <li
                key={`${e.claim.slice(0, 24)}-${i}`}
                className="text-[14px] leading-6 text-[#3a3d41]"
              >
                <span className="mr-2 text-[11px] tracking-[0.08em] text-[#66735E]">
                  [{kindLabel(e.kind)}]
                </span>
                {e.claim}
                {e.source ? (
                  <span className="text-[#8a8f96]"> · {e.source}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2 border-t border-[rgba(24,24,23,0.08)] pt-6">
        <p className="text-[11px] tracking-[0.1em] text-[#66735E]">已知 / 未知</p>
        {packet.known.length > 0 ? (
          <p className="text-[14px] leading-6 text-[#3a3d41]">
            已知：{packet.known.join("；")}
          </p>
        ) : null}
        {packet.unknown.length > 0 ? (
          <p className="text-[14px] leading-6 text-[#3a3d41]">
            未知：{packet.unknown.join("；")}
          </p>
        ) : null}
        <p className="text-[13px] text-[#6f747b]">{packet.confidenceNote}</p>
      </section>

      {packet.todayOneThing ? (
        <section className="space-y-1.5 rounded-[12px] bg-[rgba(102,115,94,0.08)] px-4 py-3">
          <p className="text-[11px] tracking-[0.08em] text-[#66735E]">
            今天只做一件事
          </p>
          <p className="text-[15px] font-medium text-[#202124]">
            {packet.todayOneThing.action}
          </p>
          <p className="text-[13px] text-[#6f747b]">{packet.todayOneThing.why}</p>
        </section>
      ) : null}

      <footer className="flex flex-col gap-3 sm:flex-row">
        {canPromote ? (
          <button
            type="button"
            onClick={() => promoteToCouncil()}
            className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-[14px] bg-[#181817] px-4 text-[15px] font-semibold text-white touch-manipulation"
          >
            进入决策室
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : null}
        <Link
          href="/dashboard"
          prefetch={false}
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded-[14px] border border-[rgba(24,24,23,0.12)] bg-white px-4 text-[15px] font-medium text-[#202124] no-underline touch-manipulation"
        >
          {canPromote ? "先不决定，回今日" : "返回今日"}
        </Link>
      </footer>
    </div>
  );
}
