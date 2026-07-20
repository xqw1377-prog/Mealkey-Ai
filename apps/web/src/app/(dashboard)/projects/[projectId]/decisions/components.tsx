"use client";

import { useState, useCallback } from "react";
import { Check, X, ChevronDown, ChevronRight, Target } from "lucide-react";
import { trpc } from "@/lib/trpc";

/**
 * 行动追踪器 — 把 AI 建议转化为用户的实际行动
 *
 * 本机草稿写 localStorage；若填写了结果，会同步到决策反馈（LearningEngine）。
 */
export function ActionTracker({
  decisionId,
  initialAction,
  onResultSubmitted,
}: {
  decisionId: string;
  initialAction?: string;
  onResultSubmitted?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [myAction, setMyAction] = useState("");
  const [result, setResult] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [feedbackText, setFeedbackText] = useState<string | null>(null);
  const [synced, setSynced] = useState(false);

  const { recordActionResult } = useActionResultFeedback();

  const handleSave = useCallback(async () => {
    if (!myAction.trim()) return;
    setSaving(true);
    try {
      const key = `action_${decisionId}`;
      localStorage.setItem(
        key,
        JSON.stringify({
          action: myAction,
          result: result || null,
          createdAt: new Date().toISOString(),
          ephemeral: true,
        }),
      );

      let cloudOk = false;
      if (result === "positive" || result === "neutral" || result === "negative") {
        cloudOk = await recordActionResult(
          decisionId,
          myAction,
          result as "positive" | "neutral" | "negative",
        );
        setSynced(cloudOk);
      } else {
        setSynced(false);
      }

      setSaved(true);
      setFeedbackText(
        cloudOk
          ? "已记在本机，并同步到决策反馈 ✓"
          : result
            ? "已记在本机；反馈同步失败，可稍后重试"
            : "已记在本机（临时草稿）",
      );
      setTimeout(() => setFeedbackText(null), 4000);
      onResultSubmitted?.();
    } finally {
      setSaving(false);
    }
  }, [myAction, result, decisionId, onResultSubmitted, recordActionResult]);

  return (
    <div className="mt-3 border-t border-[rgba(24,24,23,0.06)] pt-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="inline-flex min-h-11 items-center gap-2 text-xs font-medium text-[#66735E] transition hover:text-[#202124]"
      >
        {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        <Target className="h-3.5 w-3.5" />
        本机行动草稿
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          <p className="text-[11px] leading-4 text-[#6f747b]">
            草稿仅保存在本机。填写「实际结果」后会同步到决策反馈，供学习引擎使用。
          </p>
          {saved ? (
            <div className="flex flex-wrap items-center gap-1 text-xs text-[#66735E]">
              <Check className="h-3.5 w-3.5" />
              {feedbackText || (synced ? "已同步" : "已记在本机")}
              {result ? <span className="text-[#6f747b]"> · 结果: {result}</span> : null}
              <button
                type="button"
                onClick={() => {
                  setSaved(false);
                  setFeedbackText(null);
                }}
                className="ml-2 min-h-10 text-[#6f747b] underline hover:text-[#202124]"
              >
                修改
              </button>
            </div>
          ) : (
            <>
              <div>
                <p className="mb-1 text-xs text-[#6f747b]">我打算怎么做</p>
                <textarea
                  value={myAction}
                  onChange={(e) => setMyAction(e.target.value)}
                  placeholder={
                    initialAction ? `采纳建议: ${initialAction}` : "写下你打算采取的行动..."
                  }
                  rows={2}
                  className="w-full rounded-lg border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-3 py-2 text-xs text-[#202124] placeholder:text-[#6f747b] focus:outline-none focus:ring-1"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-[#6f747b]" htmlFor={`action-result-${decisionId}`}>
                  实际结果（可选，完成后回来填写）
                </label>
                <select
                  id={`action-result-${decisionId}`}
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  className="min-h-11 w-full rounded-lg border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-3 py-2 text-xs text-[#202124] focus:outline-none focus:ring-1"
                >
                  <option value="">-- 还未执行 --</option>
                  <option value="positive">结果很好，判断正确</option>
                  <option value="neutral">结果一般，方向对但需调整</option>
                  <option value="negative">结果不好，判断有误</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving || !myAction.trim()}
                  className="inline-flex min-h-11 items-center gap-1 rounded-full bg-[#181817] px-4 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  <Check className="h-3 w-3" />
                  {saving ? "保存中..." : "记录行动"}
                </button>
                <button
                  type="button"
                  onClick={() => setExpanded(false)}
                  className="inline-flex min-h-11 items-center gap-1 rounded-full border border-[rgba(24,24,23,0.08)] px-4 text-xs text-[#6f747b]"
                >
                  <X className="h-3 w-3" />
                  取消
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 行动结果反馈 — 让 LearningEngine 获得真实数据
 */
export function useActionResultFeedback() {
  const submitFeedback = trpc.decisionArchive.submitFeedback.useMutation();

  const recordActionResult = useCallback(
    async (
      decisionId: string,
      action: string,
      result: "positive" | "neutral" | "negative",
    ) => {
      const helpful = result === "positive";
      const comment = `行动: ${action.slice(0, 120)}｜结果: ${
        result === "positive" ? "判断正确" : result === "neutral" ? "方向对但需调整" : "判断有误"
      }`;

      try {
        await submitFeedback.mutateAsync({
          decisionId,
          helpful,
          comment,
        });
        return true;
      } catch {
        return false;
      }
    },
    [submitFeedback],
  );

  return { recordActionResult };
}

/**
 * 同步按钮 — 在决策详情底部显示
 */
export function ActionCommitButton({
  decisionId,
  suggestedAction,
  onCommit,
}: {
  decisionId: string;
  suggestedAction: string;
  onCommit?: () => void;
}) {
  const [committed, setCommitted] = useState(false);

  const handleCommit = useCallback(() => {
    const key = `action_${decisionId}`;
    localStorage.setItem(
      key,
      JSON.stringify({
        action: suggestedAction,
        createdAt: new Date().toISOString(),
        source: "ai_suggestion",
        ephemeral: true,
      }),
    );
    setCommitted(true);
    onCommit?.();
  }, [decisionId, suggestedAction, onCommit]);

  if (committed) {
    return (
      <span className="inline-flex min-h-10 items-center gap-1 text-xs text-[#66735E]">
        <Check className="h-3.5 w-3.5" />
        已记在本机（临时）
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCommit}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-[rgba(24,24,23,0.08)] bg-[#F5F3EE] px-4 text-[13px] font-medium text-[#202124] transition touch-manipulation hover:bg-[#EEF1EA]"
    >
      <Target className="h-3.5 w-3.5" />
      我要做这个
    </button>
  );
}
