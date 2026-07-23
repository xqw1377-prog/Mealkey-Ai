"use client";

import { useState, useCallback } from "react";
import { Check, X, ChevronDown, ChevronRight, Target, RotateCcw, ThumbsUp, ThumbsDown } from "lucide-react";
import { trpc } from "@/lib/trpc";

/**
 * 行动追踪器 — 把 AI 建议转化为用户的实际行动
 *
 * 让用户：
 * 1. 从 AI 判断中提取一条行动
 * 2. 记录"我打算怎么做"
 * 3. 后续回来更新"实际结果怎么样"
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

  const hasExistingAction = !!initialAction;

  const handleSave = useCallback(async () => {
    if (!myAction.trim()) return;
    setSaving(true);
    // 暂时保存到 localStorage
    try {
      const key = `action_${decisionId}`;
      localStorage.setItem(key, JSON.stringify({
        action: myAction,
        result: result || null,
        createdAt: new Date().toISOString(),
      }));
      setSaved(true);
      setFeedbackText("行动已记录 ✓");
      setTimeout(() => setFeedbackText(null), 3000);
      onResultSubmitted?.();
    } finally {
      setSaving(false);
    }
  }, [myAction, result, decisionId, onResultSubmitted]);

  return (
    <div className="border-t border-[rgba(24,24,23,0.06)] pt-3 mt-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-xs font-medium text-[#66735E] hover:text-[#202124] transition"
      >
        {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        <Target className="h-3.5 w-3.5" />
        我的行动
      </button>

      {expanded && (
        <div className="mt-2 space-y-2">
          {saved ? (
            <div className="text-xs text-green-600 flex items-center gap-1">
              <Check className="h-3.5 w-3.5" />
              {feedbackText || "已记录"}
              {result && <span className="text-[#6f747b]"> · 结果: {result}</span>}
              <button
                onClick={() => { setSaved(false); setFeedbackText(null); }}
                className="ml-2 text-[#6f747b] hover:text-[#202124] underline"
              >
                修改
              </button>
            </div>
          ) : (
            <>
              <div>
                <p className="text-xs text-[#6f747b] mb-1">我打算怎么做</p>
                <textarea
                  value={myAction}
                  onChange={(e) => setMyAction(e.target.value)}
                  placeholder={initialAction ? `采纳建议: ${initialAction}` : "写下你打算采取的行动..."}
                  rows={2}
                  className="w-full rounded-lg border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-3 py-1.5 text-xs text-[#202124] placeholder:text-[#6f747b] focus:outline-none focus:ring-1"
                />
              </div>
              <div>
                <p className="text-xs text-[#6f747b] mb-1">实际结果（可选，完成后回来填写）</p>
                <select
                  value={result}
                  onChange={(e) => setResult(e.target.value)}
                  className="w-full rounded-lg border border-[rgba(24,24,23,0.08)] bg-[#FBFAF7] px-3 py-1.5 text-xs text-[#202124] focus:outline-none focus:ring-1"
                >
                  <option value="">-- 还未执行 --</option>
                  <option value="positive">✅ 结果很好，判断正确</option>
                  <option value="neutral">➖ 结果一般，方向对但需调整</option>
                  <option value="negative">❌ 结果不好，判断有误</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !myAction.trim()}
                  className="inline-flex items-center gap-1 rounded-full bg-[#181817] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  <Check className="h-3 w-3" />
                  {saving ? "保存中..." : "记录行动"}
                </button>
                <button
                  onClick={() => setExpanded(false)}
                  className="inline-flex items-center gap-1 rounded-full border border-[rgba(24,24,23,0.08)] px-3 py-1.5 text-xs text-[#6f747b]"
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
 *
 * 当用户记录了行动结果后，这个组件会被激活，
 * 通知 LearningEngine 做出调整。
 */
export function useActionResultFeedback() {
  const submitFeedback = trpc.decisionArchive.submitFeedback.useMutation();

  const recordActionResult = useCallback(async (
    decisionId: string,
    action: string,
    result: "positive" | "neutral" | "negative"
  ) => {
    const helpful = result === "positive";
    const comment = `行动结果: ${result === "positive" ? "判断正确" : result === "neutral" ? "方向对但需调整" : "判断有误"}`;

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
  }, [submitFeedback]);

  return { recordActionResult };
}

/**
 * 同步按钮 — 在决策详情底部显示
 * 让用户可以把 AI 建议转化为自己的行动承诺
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
    localStorage.setItem(key, JSON.stringify({
      action: suggestedAction,
      createdAt: new Date().toISOString(),
      source: "ai_suggestion",
      ephemeral: true,
    }));
    setCommitted(true);
    onCommit?.();
  }, [decisionId, suggestedAction, onCommit]);

  if (committed) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-[#66735E]">
        <Check className="h-3.5 w-3.5" />
        已记在本机（临时）
      </span>
    );
  }

  return (
    <button
      onClick={handleCommit}
      className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(24,24,23,0.08)] bg-[#F5F3EE] px-3 py-1.5 text-xs font-medium text-[#202124] hover:bg-[#EEF1EA] transition"
    >
      <Target className="h-3.5 w-3.5" />
      我要做这个
    </button>
  );
}
