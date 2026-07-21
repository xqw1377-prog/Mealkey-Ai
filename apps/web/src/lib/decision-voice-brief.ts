/**
 * 语音对话采集的决策 Brief（客户端暂存，不进 Prisma 新表）
 */

export type DecisionVoiceBrief = {
  topic: string;
  whyNow: string;
  decisionQuestion: string;
  constraints: string;
  successLooksLike: string;
  spokenTurns?: string[];
  /** 雷达证据摘要（进决策室 Brief） */
  evidenceSummary?: string[];
  /** 复盘三问（D+7） */
  reviewQuestions?: string[];
};

const STORAGE_KEY = "mk_decision_voice_brief_v1";

export function saveDecisionVoiceBrief(
  projectId: string,
  brief: DecisionVoiceBrief,
) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ projectId, brief, at: Date.now() }),
    );
  } catch {
    /* ignore quota */
  }
}

export function readDecisionVoiceBrief(
  projectId: string,
): DecisionVoiceBrief | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      projectId?: string;
      brief?: DecisionVoiceBrief;
      at?: number;
    };
    if (parsed.projectId !== projectId || !parsed.brief) return null;
    // 2 小时内有效
    if (parsed.at && Date.now() - parsed.at > 2 * 60 * 60 * 1000) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.brief;
  } catch {
    return null;
  }
}

export function clearDecisionVoiceBrief() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
