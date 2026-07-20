/**
 * Memory Runtime M3 — 禁区/失败 pattern 文案提醒（不改战略）
 */

import type { FounderMemorySnapshot } from "../contracts";

const FORBIDDEN_HINTS =
  /禁区|不要|别再|高租金|失败|证伪|踩坑|不宜|避免|曾失败/;

export function buildForbiddenReminders(
  snapshot: FounderMemorySnapshot | null | undefined,
  topic?: string,
): string[] {
  if (!snapshot) return [];
  const topicText = (topic || "").trim();
  const reminders: string[] = [];

  for (const p of snapshot.patterns.slice(0, 12)) {
    if (p.kind !== "failure" && !FORBIDDEN_HINTS.test(p.summary)) continue;
    const line = `历史提醒：${p.summary}`;
    if (
      !topicText ||
      overlap(topicText, p.summary) ||
      FORBIDDEN_HINTS.test(p.summary)
    ) {
      reminders.push(line.slice(0, 160));
    }
  }

  for (const f of snapshot.facts.slice(0, 8)) {
    const text = `${f.label}:${f.value}`;
    if (FORBIDDEN_HINTS.test(text)) {
      reminders.push(`企业禁区/事实：${text}`.slice(0, 160));
    }
  }

  return dedupe(reminders).slice(0, 5);
}

function overlap(a: string, b: string): boolean {
  const tokens = a
    .replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .slice(0, 8);
  if (tokens.length === 0) return true;
  return tokens.some((t) => b.includes(t));
}

function dedupe(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}
