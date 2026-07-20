"use client";

import { useState } from "react";
import { Mic, MicOff } from "lucide-react";
import {
  PRIMARY_FACT_GUIDE,
  guidedFactCoverage,
  humanizeConsultingGap,
  type GuidedFactQuestion,
} from "../../../../../packages/agents/src/m-pnt/consulting";

export function VoiceMicButton({
  active,
  supported,
  disabled,
  onClick,
  onPressStart,
  onPressEnd,
  label = "按住说话",
}: {
  active: boolean;
  supported: boolean;
  disabled?: boolean;
  /** 兼容旧点一下；有按住回调时优先按住 */
  onClick?: () => void;
  onPressStart?: () => void;
  onPressEnd?: () => void;
  label?: string;
}) {
  if (!supported) {
    return (
      <span className="text-[12px] text-[#6f747b]">
        此浏览器暂不支持语音，请打字或换系统浏览器
      </span>
    );
  }

  const holdMode = Boolean(onPressStart && onPressEnd);

  return (
    <button
      type="button"
      disabled={disabled && !active}
      onClick={holdMode ? undefined : onClick}
      onPointerDown={
        holdMode
          ? (e) => {
              if (disabled) return;
              e.preventDefault();
              try {
                e.currentTarget.setPointerCapture(e.pointerId);
              } catch {
                /* ignore */
              }
              onPressStart?.();
            }
          : undefined
      }
      onPointerUp={
        holdMode
          ? (e) => {
              try {
                e.currentTarget.releasePointerCapture(e.pointerId);
              } catch {
                /* ignore */
              }
              onPressEnd?.();
            }
          : undefined
      }
      onPointerCancel={holdMode ? () => onPressEnd?.() : undefined}
      onContextMenu={(e) => e.preventDefault()}
      className={`inline-flex min-h-10 touch-none select-none items-center gap-1.5 border px-3 text-[13px] font-medium disabled:opacity-50 ${
        active
          ? "border-[#07C160] bg-[#07C160] text-white"
          : "border-[rgba(24,24,23,0.12)] bg-white text-[#202124]"
      }`}
      aria-label={active ? "松开结束" : label}
      title={active ? "松开结束" : "按住说话，松手转成字"}
    >
      {active ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
      {active ? "松手结束" : label}
    </button>
  );
}

/** 把缺项翻成老板能看懂的清单 */
export function ConsultingGapList({
  blockers,
  title = "还差这些（点选或语音就能补）",
}: {
  blockers: string[];
  title?: string;
}) {
  if (blockers.length === 0) return null;
  return (
    <div className="space-y-2 border border-[rgba(180,124,92,0.28)] bg-[rgba(180,124,92,0.06)] px-4 py-3">
      <p className="text-[13px] font-medium text-[#5c3a1e]">{title}</p>
      <ul className="space-y-3">
        {blockers.map((b) => {
          const h = humanizeConsultingGap(b);
          return (
            <li key={b} className="text-[13px] leading-6 text-[#5c3a1e]">
              <p className="font-medium">{h.title}</p>
              <p className="text-[#8a6a4a]">{h.how}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function GuidedPrimaryFactWizard({
  facts,
  pending,
  onPick,
  speech,
}: {
  facts: Array<{ relatedStage?: string; claim?: string }>;
  pending?: boolean;
  onPick: (input: {
    claim: string;
    sourceType: GuidedFactQuestion["sourceType"];
    relatedStage: GuidedFactQuestion["relatedStage"];
    strength: GuidedFactQuestion["strength"];
  }) => void;
  speech?: {
    supported: boolean;
    activeFieldId: string | null;
    error: string | null;
    toggle: (fieldId: string, value: string, onChange: (v: string) => void) => void;
    start?: (fieldId: string, value: string, onChange: (v: string) => void) => void;
    stop?: () => void;
  };
}) {
  const coverage = guidedFactCoverage(facts);

  return (
    <div id="guided-facts" className="space-y-4 border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-4 py-4">
      <div>
        <p className="text-[12px] tracking-[0.08em] text-[#66735E]">三问快答 · 不用写长文</p>
        <p className="mt-1 text-[15px] font-medium text-[#202124]">
          不会打字也行：点选项，或像微信一样按住说话，松手就写成字
        </p>
        <p className="mt-1 text-[13px] text-[#6f747b]">
          已完成 {coverage.answeredIds.length}/{PRIMARY_FACT_GUIDE.length}
          {coverage.ok ? " · 一手覆盖已齐" : " · 缺的题标「待补」"}
        </p>
      </div>

      {PRIMARY_FACT_GUIDE.map((q, index) => {
        const done = coverage.answeredIds.includes(q.id);
        return (
          <GuidedFactCard
            key={q.id}
            index={index}
            question={q}
            done={done}
            pending={pending}
            onPick={onPick}
            speech={speech}
          />
        );
      })}
      {speech?.error ? (
        <p className="text-[12px] text-[#B47C5C]">{speech.error}</p>
      ) : null}
    </div>
  );
}

function GuidedFactCard({
  index,
  question,
  done,
  pending,
  onPick,
  speech,
}: {
  index: number;
  question: GuidedFactQuestion;
  done: boolean;
  pending?: boolean;
  onPick: (input: {
    claim: string;
    sourceType: GuidedFactQuestion["sourceType"];
    relatedStage: GuidedFactQuestion["relatedStage"];
    strength: GuidedFactQuestion["strength"];
  }) => void;
  speech?: {
    supported: boolean;
    activeFieldId: string | null;
    toggle: (fieldId: string, value: string, onChange: (v: string) => void) => void;
    start?: (fieldId: string, value: string, onChange: (v: string) => void) => void;
    stop?: () => void;
  };
}) {
  const [draft, setDraft] = useState("");
  const fieldId = `${question.id}_draft`;

  return (
    <div
      className={`space-y-3 border px-3 py-3 ${
        done
          ? "border-[rgba(102,115,94,0.35)] bg-white"
          : "border-[rgba(24,24,23,0.1)] bg-white"
      }`}
    >
      <div>
        <p className="text-[14px] font-medium text-[#202124]">
          {index + 1}. {question.question}
          {done ? (
            <span className="ml-2 text-[12px] font-normal text-[#66735E]">已有</span>
          ) : (
            <span className="ml-2 text-[12px] font-normal text-[#B47C5C]">待补</span>
          )}
        </p>
        <p className="mt-1 text-[12px] text-[#6f747b]">{question.why}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {question.choices.map((c) => (
          <button
            key={c.label}
            type="button"
            disabled={pending || done}
            onClick={() =>
              onPick({
                claim: c.claim,
                sourceType: question.sourceType,
                relatedStage: question.relatedStage,
                strength: question.strength,
              })
            }
            className="min-h-10 border border-[rgba(24,24,23,0.12)] bg-[#FBFAF7] px-3 text-[13px] text-[#202124] disabled:opacity-45"
          >
            {c.label}
          </button>
        ))}
      </div>
      {!done ? (
        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={question.voicePlaceholder}
            className="min-h-10 flex-1 border border-[rgba(24,24,23,0.1)] bg-[#FBFAF7] px-3 text-[13px] outline-none focus:border-[#181817]"
          />
          {speech ? (
            <VoiceMicButton
              active={speech.activeFieldId === fieldId}
              supported={speech.supported}
              disabled={pending}
              label="按住说话"
              onPressStart={
                speech.supported
                  ? () => {
                      if (speech.start) {
                        void speech.start(fieldId, draft, setDraft);
                      } else {
                        void speech.toggle(fieldId, draft, setDraft);
                      }
                    }
                  : undefined
              }
              onPressEnd={
                speech.supported ? () => speech.stop?.() : undefined
              }
            />
          ) : null}
          <button
            type="button"
            disabled={pending || draft.trim().length < 8}
            onClick={() =>
              onPick({
                claim: draft.trim(),
                sourceType: question.sourceType,
                relatedStage: question.relatedStage,
                strength: question.strength,
              })
            }
            className="min-h-10 bg-[#181817] px-3 text-[13px] font-semibold text-white disabled:opacity-40"
          >
            写入这题
          </button>
        </div>
      ) : null}
    </div>
  );
}
