/**
 * 店访回填后：假说 vs 现场对比 → 空位修正建议
 */
import type { MarketResearchPack } from "../journey-types";

export type HypothesisFieldVerdict =
  | "confirmed"
  | "partial"
  | "overturned"
  | "unknown";

export type HypothesisFieldCompare = {
  rivalName: string;
  hypothesisMental: string;
  observedMental: string;
  observedEvidence: string;
  verdict: HypothesisFieldVerdict;
  deltaNote: string;
};

export type WhitespaceRevisionSuggestion = {
  severity: "keep" | "sharpen" | "pivot" | "abandon_overlap";
  currentWhitespace: string;
  suggestedWhitespace: string;
  rationale: string;
  actions: string[];
};

export type StoreVisitInsightPack = {
  generatedAt: string;
  compares: HypothesisFieldCompare[];
  whitespaceSuggestion: WhitespaceRevisionSuggestion;
  markdown: string;
};

function normalizeToken(s: string): string {
  return (s || "")
    .replace(/[「」『』【】\[\]（）()·・\s]/g, "")
    .toLowerCase();
}

function shareScore(a: string, b: string): number {
  const x = normalizeToken(a);
  const y = normalizeToken(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.72;
  // 粗字符重叠
  const setX = new Set(x.split(""));
  const setY = new Set(y.split(""));
  let hit = 0;
  for (const ch of setX) if (setY.has(ch)) hit += 1;
  const denom = Math.max(setX.size, setY.size);
  return denom ? hit / denom : 0;
}

export function compareHypothesisVsField(input: {
  rivalName: string;
  hypothesisMental: string;
  observedMental: string;
  observedEvidence: string;
}): HypothesisFieldCompare {
  const hyp = (input.hypothesisMental || "").trim() || "（无假说）";
  const obs = (input.observedMental || "").trim();
  const evidence = (input.observedEvidence || "").trim();
  const score = shareScore(hyp, obs);

  let verdict: HypothesisFieldVerdict = "unknown";
  let deltaNote = "";
  if (!obs) {
    verdict = "unknown";
    deltaNote = "现场心智词缺失，无法对比。";
  } else if (score >= 0.72) {
    verdict = "confirmed";
    deltaNote = `假说「${hyp}」与现场「${obs}」基本一致，可按原威胁评估继续。`;
  } else if (score >= 0.35) {
    verdict = "partial";
    deltaNote = `假说「${hyp}」被现场部分改写为「${obs}」：保留方向，但威胁与空位措辞需收紧。`;
  } else {
    verdict = "overturned";
    deltaNote = `假说「${hyp}」被现场推翻：真实心智是「${obs}」。原空位若与「${obs}」过近，必须对立或换词。`;
  }

  if (evidence && verdict !== "unknown") {
    deltaNote += ` 证据：${evidence.slice(0, 60)}`;
  }

  return {
    rivalName: input.rivalName,
    hypothesisMental: hyp,
    observedMental: obs,
    observedEvidence: evidence,
    verdict,
    deltaNote,
  };
}

export function suggestWhitespaceRevision(input: {
  currentWhitespace: string;
  compares: HypothesisFieldCompare[];
  who?: string;
  need?: string;
}): WhitespaceRevisionSuggestion {
  const ws = (input.currentWhitespace || "目标空位").replace(/。$/, "");
  const who = input.who || "目标客人";
  const need = input.need || "关键任务";
  const overturned = input.compares.filter((c) => c.verdict === "overturned");
  const partial = input.compares.filter((c) => c.verdict === "partial");
  const confirmed = input.compares.filter((c) => c.verdict === "confirmed");

  // 现场心智是否与空位撞车
  const overlap = input.compares.filter((c) => {
    if (!c.observedMental) return false;
    return shareScore(ws, c.observedMental) >= 0.45;
  });

  if (overlap.length > 0) {
    const rival = overlap[0]!;
    const suggested = `${who}的「${need}」对立位·不像${rival.rivalName}`;
    return {
      severity: "abandon_overlap",
      currentWhitespace: ws,
      suggestedWhitespace: suggested,
      rationale: `现场显示${rival.rivalName}已占「${rival.observedMental}」，与本稿空位「${ws}」过近；继续硬刚会被吸走。`,
      actions: [
        `空位改写成对立句：不像${rival.rivalName}，而是…`,
        "菜单/话术必须带对照，禁止只喊同一心智词",
        "重跑三席出策，用新空位再打分",
      ],
    };
  }

  if (overturned.length > 0) {
    const rival = overturned[0]!;
    const suggested = `${ws}（校准：避开${rival.rivalName}的「${rival.observedMental}」）`;
    return {
      severity: "pivot",
      currentWhitespace: ws,
      suggestedWhitespace: suggested,
      rationale: `至少一家竞对假说被推翻（${rival.rivalName}）。原空位可能建在错误心智地图上。`,
      actions: [
        `把威胁对象改成现场词「${rival.observedMental}」`,
        "空位措辞显式写清「不是谁」",
        "确认调研后重跑顾问",
      ],
    };
  }

  if (partial.length > 0) {
    const rival = partial[0]!;
    const suggested = `${ws}·更锋利版（相对${rival.rivalName}）`;
    return {
      severity: "sharpen",
      currentWhitespace: ws,
      suggestedWhitespace: suggested,
      rationale: `现场部分改写了假说；空位可保留方向，但必须比「${rival.observedMental}」更可复述、更可验。`,
      actions: [
        "把空位压缩成 ≤10 字可复述词",
        "本周证明必须能与竞对现场词拉开",
        "重跑三席，检查牺牲是否够狠",
      ],
    };
  }

  if (confirmed.length > 0) {
    return {
      severity: "keep",
      currentWhitespace: ws,
      suggestedWhitespace: ws,
      rationale: "已回填店访与假说基本一致；空位可维持，重点转执行证明。",
      actions: [
        "空位暂不改词",
        "用店访证据升级威胁句后重跑顾问",
        "把证明压到菜单/话术/场景",
      ],
    };
  }

  return {
    severity: "keep",
    currentWhitespace: ws,
    suggestedWhitespace: ws,
    rationale: "尚无足够店访对比；空位仍为假设。",
    actions: ["继续回填至少 1 家竞对店访", "再生成修正建议"],
  };
}

export function buildStoreVisitInsightPack(input: {
  pack: MarketResearchPack;
  who?: string;
  need?: string;
}): StoreVisitInsightPack {
  const pack = input.pack;
  const tasks = pack.storeVisitPlan?.tasks || [];
  const filled = tasks.filter((t) => t.status === "filled");

  const compares = filled.map((t) =>
    compareHypothesisVsField({
      rivalName: t.rivalName,
      hypothesisMental: t.mentalHypothesis,
      observedMental: t.observedMentalWord || "",
      observedEvidence: t.observedEvidence || "",
    }),
  );

  const whitespaceSuggestion = suggestWhitespaceRevision({
    currentWhitespace: pack.whitespace,
    compares,
    who: input.who || "目标客人",
    need: input.need || "关键任务",
  });

  const generatedAt = new Date().toISOString();
  const verdictLabel: Record<HypothesisFieldVerdict, string> = {
    confirmed: "一致",
    partial: "部分改写",
    overturned: "推翻",
    unknown: "未知",
  };

  const markdown = [
    `## 假说 vs 现场 · 空位修正建议`,
    ``,
    `> 基于已回填店访自动对比。建议供确认，不自动改主空位。`,
    ``,
    `### 对比表`,
    ``,
    `| 竞对 | 假说心智 | 现场心智 | 结论 |`,
    `| --- | --- | --- | --- |`,
    ...compares.map(
      (c) =>
        `| ${c.rivalName} | ${c.hypothesisMental.replace(/\|/g, "/")} | ${c.observedMental.replace(/\|/g, "/")} | ${verdictLabel[c.verdict]} |`,
    ),
    ``,
    ...compares.map((c) => `- **${c.rivalName}**：${c.deltaNote}`),
    ``,
    `### 空位修正建议（${whitespaceSuggestion.severity}）`,
    ``,
    `- **当前空位**：${whitespaceSuggestion.currentWhitespace}`,
    `- **建议空位**：${whitespaceSuggestion.suggestedWhitespace}`,
    `- **理由**：${whitespaceSuggestion.rationale}`,
    `- **下一步**：`,
    ...whitespaceSuggestion.actions.map((a) => `  - ${a}`),
    ``,
  ].join("\n");

  return {
    generatedAt,
    compares,
    whitespaceSuggestion,
    markdown,
  };
}

/** 一键采纳建议空位（写回 pack.whitespace） */
export function applyWhitespaceSuggestion(
  pack: MarketResearchPack,
  suggestion?: WhitespaceRevisionSuggestion,
): MarketResearchPack {
  const s = suggestion || pack.storeVisitInsight?.whitespaceSuggestion;
  if (!s || s.severity === "keep") return pack;
  const note = `空位已按店访建议从「${s.currentWhitespace}」改为「${s.suggestedWhitespace}」`;
  return {
    ...pack,
    whitespace: s.suggestedWhitespace,
    evidenceNotes: [note, ...(pack.evidenceNotes || [])].slice(0, 14),
    headline: pack.headline.replace(/（空位已校准）$/, "") + "（空位已校准）",
  };
}
