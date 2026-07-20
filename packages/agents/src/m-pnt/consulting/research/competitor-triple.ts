/**
 * 竞品情报三联硬化：心智词 + 证据句 + 空位威胁
 * 禁止只有空泛 summary。
 */
import type { CrawlSourceHit, CompetitorIntel } from "./collector";

/** 从公开命中抽一句可引用证据 */
export function pickEvidenceSentence(
  name: string,
  hits: CrawlSourceHit[],
  fallbackSummary?: string,
): string {
  for (const h of hits) {
    const snip = (h.snippet || "").trim();
    if (snip.length >= 12) {
      const cut = snip.length > 100 ? `${snip.slice(0, 100)}…` : snip;
      return `「${cut}」${h.source ? `（${h.source}）` : ""}`;
    }
  }
  if (fallbackSummary && fallbackSummary.length >= 8) {
    return fallbackSummary.slice(0, 100);
  }
  return `公开检索暂未抓到「${name}」的可引用证据句，需店访复核。`;
}

/** 从文本抽短心智词 */
export function pickMentalWord(
  name: string,
  hints: Array<string | undefined>,
): string {
  for (const h of hints) {
    if (!h) continue;
    const m = h.match(
      /(?:定位|心智|主打|招牌|第一|联想)[为是：:\s]*([^\s，。；;、]{2,12})/,
    );
    if (m?.[1]) return m[1];
    // 短短语本身可作心智位
    const clean = h.replace(/。$/, "").trim();
    if (clean.length >= 2 && clean.length <= 16 && !/暂未|不足|待/.test(clean)) {
      return clean;
    }
  }
  return `${name}默认联想（待钉死）`;
}

/** 相对本稿空位，该竞对构成什么威胁 */
export function pickThreatToWhitespace(
  name: string,
  mental: string,
  whitespaceCandidates: string[],
  signals: string[],
): string {
  const ws = whitespaceCandidates[0] || "目标空位";
  const blob = `${mental} ${signals.join(" ")}`;
  if (/密集|饱和|占|领导|第一|龙头/.test(blob)) {
    return `${name}已占「${mental}」，若本稿空位「${ws}」与其过近，正面硬刚会被吸走；空位必须拉开对立。`;
  }
  if (/数据不足|暂未|待/.test(blob)) {
    return `${name}情报偏薄；若其暗中贴近「${ws}」，可能先发占位——需尽快店访确认。`;
  }
  return `${name}心智「${mental}」可能挤压「${ws}」；差异必须可一句话复述，否则空位会被吞并。`;
}

/** 把竞对对象硬化为三联齐全 */
export function hardenCompetitorTriple(
  c: CompetitorIntel,
  whitespaceCandidates: string[],
): CompetitorIntel {
  const mentalPosition = pickMentalWord(c.name, [
    c.mentalPosition,
    ...c.signals,
    c.summary,
  ]);
  const evidenceSentence =
    c.evidenceSentence ||
    pickEvidenceSentence(c.name, c.sources, c.summary);
  const threatToWhitespace =
    c.threatToWhitespace ||
    pickThreatToWhitespace(
      c.name,
      mentalPosition,
      whitespaceCandidates,
      c.signals,
    );

  return {
    ...c,
    mentalPosition,
    evidenceSentence,
    threatToWhitespace,
    summary: c.summary || `${c.name} · ${mentalPosition}`,
  };
}

export function hardenAllCompetitors(
  competitors: CompetitorIntel[],
  whitespaceCandidates: string[],
): CompetitorIntel[] {
  return competitors.map((c) =>
    hardenCompetitorTriple(c, whitespaceCandidates),
  );
}
