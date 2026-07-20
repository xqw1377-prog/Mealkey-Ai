"use client";

import { useState } from "react";
import { DecisionOpinionsTimeline } from "@/components/operating/DecisionOpinionsTimeline";
import { trpc } from "@/lib/trpc";
import { panelChrome, type AtelierProps } from "./atelier";

const EXPERTS = [
  { value: "M-PNT", label: "定位" },
  { value: "M-MKT", label: "市场" },
  { value: "M-BIZ", label: "商业" },
  { value: "M-ED", label: "股权" },
] as const;
const POSITIONS = [
  { value: "support", label: "支持" },
  { value: "oppose", label: "反对" },
  { value: "neutral", label: "中立" },
] as const;
const EVIDENCE_TYPES = [
  { value: "market", label: "市场" },
  { value: "financial", label: "财务" },
  { value: "user", label: "用户" },
  { value: "experience", label: "经验" },
  { value: "case", label: "案例" },
] as const;

type Props = AtelierProps & {
  projectId: string;
  decisionId: string;
  opinions?: Array<{
    expert: string;
    position: string;
    reason: string;
    confidence?: number;
  }>;
  compact?: boolean;
};

export function DecisionRuntimePanel({
  projectId,
  decisionId,
  opinions = [],
  compact,
  atelier,
}: Props) {
  const ui = panelChrome(atelier);
  const utils = trpc.useUtils();
  const [mode, setMode] = useState<"opinion" | "evidence">("opinion");
  const [expert, setExpert] =
    useState<(typeof EXPERTS)[number]["value"]>("M-PNT");
  const [position, setPosition] =
    useState<(typeof POSITIONS)[number]["value"]>("support");
  const [reason, setReason] = useState("");
  const [evType, setEvType] =
    useState<(typeof EVIDENCE_TYPES)[number]["value"]>("market");
  const [evSource, setEvSource] = useState("");
  const [evContent, setEvContent] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const appendOpinion = trpc.decisionRuntime.appendOpinion.useMutation({
    onSuccess: () => {
      setReason("");
      setMsg("意见已追加，不会改写原判断正文");
      void utils.decisionArchive.list.invalidate({ projectId });
    },
    onError: (e) => setMsg(e.message),
  });
  const appendEvidence = trpc.decisionRuntime.appendEvidence.useMutation({
    onSuccess: () => {
      setEvSource("");
      setEvContent("");
      setMsg("证据已追加");
      void utils.decisionArchive.list.invalidate({ projectId });
    },
    onError: (e) => setMsg(e.message),
  });

  return (
    <section
      className={
        atelier
          ? "border border-[rgba(20,20,19,0.1)] bg-[var(--mpnt-paper)]"
          : "mt-1 border-y border-[rgba(24,24,23,0.08)] py-5"
      }
    >
      <div
        className={
          atelier
            ? "border-b border-[rgba(20,20,19,0.08)] bg-[var(--mpnt-field)] px-4 py-3 md:px-5"
            : ""
        }
      >
        <p className={ui.eyebrow}>决策补充</p>
        <p className={`mt-1 ${atelier ? "text-[13px] text-[#6f747b]" : ui.blurb}`}>
          只追加意见与证据，不改历史判断正文
        </p>
      </div>

      <div className={atelier ? "px-4 py-4 md:px-5 md:py-5" : ""}>
        {opinions.length > 0 ? (
          <DecisionOpinionsTimeline opinions={opinions} title="已有意见" />
        ) : null}

        <div className="mt-4 flex gap-4 border-b border-[rgba(20,20,19,0.08)]">
          {(
            [
              { id: "opinion", label: "追加意见" },
              { id: "evidence", label: "追加证据" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setMode(item.id);
                setMsg(null);
              }}
              className={`relative pb-2.5 text-[13px] ${
                mode === item.id
                  ? "font-semibold text-[#141413]"
                  : "font-medium text-[#6f747b]"
              }`}
            >
              {item.label}
              {mode === item.id ? (
                <span className="absolute inset-x-0 -bottom-px h-[2px] bg-[#141413]" />
              ) : null}
            </button>
          ))}
        </div>

        {mode === "opinion" ? (
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!reason.trim()) return;
              setMsg(null);
              appendOpinion.mutate({
                projectId,
                decisionId,
                expert,
                position,
                reason: reason.trim(),
              });
            }}
          >
            <div>
              <p className="text-[11px] font-medium tracking-[0.12em] text-[#5f6b4e]">
                席位
              </p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {EXPERTS.map((ex) => (
                  <button
                    key={ex.value}
                    type="button"
                    onClick={() => setExpert(ex.value)}
                    className={`min-h-9 px-3 text-[12px] ${
                      expert === ex.value
                        ? "bg-[#141413] font-medium text-white"
                        : "border border-[rgba(20,20,19,0.12)] text-[#5f6368]"
                    }`}
                  >
                    {ex.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[11px] font-medium tracking-[0.12em] text-[#5f6b4e]">
                立场
              </p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {POSITIONS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPosition(p.value)}
                    className={`min-h-9 px-3 text-[12px] ${
                      position === p.value
                        ? "bg-[#5f6b4e] font-medium text-white"
                        : "border border-[rgba(20,20,19,0.12)] text-[#5f6368]"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="text-[11px] font-medium tracking-[0.12em] text-[#5f6b4e]">
                理由
              </span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={compact ? 2 : 3}
                maxLength={400}
                placeholder="用一句可核对的判断理由"
                className={ui.input}
              />
            </label>
            <button
              type="submit"
              disabled={!reason.trim() || appendOpinion.isPending}
              className={ui.primaryBtn}
            >
              {appendOpinion.isPending ? "提交中…" : "提交意见"}
            </button>
          </form>
        ) : (
          <form
            className="mt-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!evSource.trim() || !evContent.trim()) return;
              setMsg(null);
              appendEvidence.mutate({
                projectId,
                decisionId,
                type: evType,
                source: evSource.trim(),
                content: evContent.trim(),
              });
            }}
          >
            <div>
              <p className="text-[11px] font-medium tracking-[0.12em] text-[#5f6b4e]">
                证据类型
              </p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {EVIDENCE_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setEvType(t.value)}
                    className={`min-h-9 px-3 text-[12px] ${
                      evType === t.value
                        ? "bg-[#141413] font-medium text-white"
                        : "border border-[rgba(20,20,19,0.12)] text-[#5f6368]"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="text-[11px] font-medium tracking-[0.12em] text-[#5f6b4e]">
                来源
              </span>
              <input
                value={evSource}
                onChange={(e) => setEvSource(e.target.value)}
                maxLength={120}
                placeholder="例如：店访纪要 / 财务报表"
                className={ui.input}
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium tracking-[0.12em] text-[#5f6b4e]">
                内容
              </span>
              <textarea
                value={evContent}
                onChange={(e) => setEvContent(e.target.value)}
                rows={compact ? 2 : 3}
                maxLength={400}
                placeholder="可核对的事实，而非观点"
                className={ui.input}
              />
            </label>
            <button
              type="submit"
              disabled={
                !evSource.trim() ||
                !evContent.trim() ||
                appendEvidence.isPending
              }
              className={ui.primaryBtn}
            >
              {appendEvidence.isPending ? "提交中…" : "提交证据"}
            </button>
          </form>
        )}

        {msg ? <p className={`mt-3 ${ui.feedback}`}>{msg}</p> : null}
      </div>
    </section>
  );
}
