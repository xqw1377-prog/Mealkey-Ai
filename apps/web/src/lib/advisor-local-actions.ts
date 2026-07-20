/**
 * Advisor「我要做这个」本机临时记录 — 有上限，避免 localStorage 无限增长
 */

const PREFIX = "action_from_advisor_";
const MAX_ITEMS = 40;

export function saveAdvisorLocalAction(messageId: string, action: string) {
  if (typeof window === "undefined") return;
  try {
    const key = `${PREFIX}${messageId}`;
    localStorage.setItem(
      key,
      JSON.stringify({
        action,
        createdAt: new Date().toISOString(),
        source: "advisor_commit",
        ephemeral: true,
      }),
    );
    pruneAdvisorLocalActions();
  } catch {
    /* quota / private mode */
  }
}

export function pruneAdvisorLocalActions() {
  if (typeof window === "undefined") return;
  try {
    const entries: Array<{ key: string; createdAt: string }> = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key?.startsWith(PREFIX)) continue;
      try {
        const raw = localStorage.getItem(key);
        const parsed = raw ? (JSON.parse(raw) as { createdAt?: string }) : null;
        entries.push({ key, createdAt: parsed?.createdAt || "" });
      } catch {
        entries.push({ key, createdAt: "" });
      }
    }
    if (entries.length <= MAX_ITEMS) return;
    entries.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const overflow = entries.length - MAX_ITEMS;
    for (let i = 0; i < overflow; i += 1) {
      const k = entries[i]?.key;
      if (k) localStorage.removeItem(k);
    }
  } catch {
    /* ignore */
  }
}
