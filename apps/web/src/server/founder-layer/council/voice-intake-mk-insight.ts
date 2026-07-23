/**
 * 决策室语音开案 → MKInsight Adapter
 *
 * 一手口述 Brief 经垂直 Adapter 产出合法 Insight，再进 Council。
 * 禁止绕过闸门用空 insights 开会；也不是 stub 占位报告。
 *
 * 缺口文案规则：已口述的事实要抓进证据；缺口只写「仍缺的客观数据」，
 * 并产出 gapActions 供 UI 挂「去补充」入口。
 */

import {
  mergeEvidencePacket,
  toVerticalMkInsights,
  type EvidenceGapAction,
  type EvidencePacket,
  type MKInsight,
} from "@mealkey/agents/founder-os";

export type VoiceIntakeBrief = {
  caseId: string;
  topic: string;
  whyNow: string;
  decisionQuestion: string;
  constraints: string;
  successLooksLike: string;
  /** 对话轮次原文，用于抓取 */
  spokenTurns?: string[];
  /** 雷达等外部证据摘要 */
  evidenceSummary?: string[];
};

type SpokenBucket =
  | "site"
  | "district"
  | "finance"
  | "timing"
  | "model"
  | "goal";

type HarvestedClaim = {
  bucket: SpokenBucket;
  claim: string;
  strength: "weak" | "medium" | "strong";
};

function clip(s: string, n: number): string {
  const t = (s || "").trim();
  if (!t) return "";
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
}

function nearDup(a: string, b: string): boolean {
  const x = a.replace(/\s+/g, "").slice(0, 40);
  const y = b.replace(/\s+/g, "").slice(0, 40);
  if (!x || !y) return false;
  return x === y || x.includes(y) || y.includes(x);
}

function corpusOf(input: VoiceIntakeBrief): string {
  return [
    input.topic,
    input.whyNow,
    input.decisionQuestion,
    input.constraints,
    input.successLooksLike,
    ...(input.spokenTurns || []),
    ...(input.evidenceSummary || []),
  ]
    .filter(Boolean)
    .join("；");
}

/** 从口述语料抓取可挂证据的事实（启发式，非 LLM） */
export function harvestSpokenClaims(input: VoiceIntakeBrief): HarvestedClaim[] {
  const fields: Array<{ text: string; prefer?: SpokenBucket }> = [
    { text: input.topic, prefer: "site" },
    { text: input.whyNow, prefer: "timing" },
    { text: input.constraints, prefer: "finance" },
    { text: input.successLooksLike, prefer: "goal" },
    ...(input.spokenTurns || []).map((t) => ({ text: t })),
    ...(input.evidenceSummary || []).map((t) => ({
      text: t,
      prefer: "district" as SpokenBucket,
    })),
  ];

  const out: HarvestedClaim[] = [];
  const push = (bucket: SpokenBucket, claim: string, strength: HarvestedClaim["strength"]) => {
    const c = clip(claim, 160);
    if (!c || c.length < 4) return;
    // 同桶去重；跨桶可保留同一段口述（如既是选址又含商圈热度）
    if (out.some((x) => x.bucket === bucket && nearDup(x.claim, c))) return;
    out.push({ bucket, claim: c, strength });
  };

  for (const f of fields) {
    const t = (f.text || "").trim();
    if (!t) continue;

    const hasSite =
      /天街|商场|商圈|铺位|门店|店址|开店|选址|龙湖|万达|吾悦|银泰|大悦城/.test(
        t,
      );
    const hasDistrict =
      /客流|人流|热度|旺不旺|好不好|餐饮.*?(不好|差|冷|弱)|生意|聚客|到访/.test(
        t,
      );
    const hasFinance =
      /现金|现金流|回本|租金|投资|亏|钱|财务|预算|成本|模型/.test(t);
    const hasTiming = /开业|月底|月底前|尽快|来不及|deadline|铺位要|签约/.test(
      t,
    );
    const hasModel = /商业模式|模式不确定|模型不确定|生意模式/.test(t);
    const hasGoal = /做成|成功|要不要|是否开|拍板|判断/.test(t);

    if (hasSite) push("site", t, "medium");
    if (hasDistrict) push("district", t, "weak"); // 口述印象 ≠ 客观客流
    if (hasFinance) push("finance", t, "medium");
    if (hasTiming) push("timing", t, "medium");
    if (hasModel) push("model", t, "weak");
    if (hasGoal && f.prefer === "goal") push("goal", t, "weak");

    // 字段级兜底：未命中关键词也保留结构化字段
    if (f.prefer && !out.some((x) => nearDup(x.claim, t))) {
      const strength =
        f.prefer === "district" || f.prefer === "model" ? "weak" : "medium";
      push(f.prefer, t, strength);
    }
  }

  return out.slice(0, 10);
}

function buildGapActions(harvested: HarvestedClaim[]): EvidenceGapAction[] {
  const has = (b: SpokenBucket) => harvested.some((h) => h.bucket === b);
  const spoken = (b: SpokenBucket) =>
    harvested.find((h) => h.bucket === b)?.claim;

  const actions: EvidenceGapAction[] = [];

  if (has("site") || has("district")) {
    const heard =
      spoken("district") ||
      spoken("site") ||
      "已听到选址/商场相关口述";
    actions.push({
      id: "district_objective",
      label: "商圈客观数据",
      detail: `已抓取口述（含商圈/热度判断），仍缺客观客流、竞品密度或铺位条件——口述印象不能当商圈数据。已听：${clip(heard, 48)}`,
      prompt: "补充商场/铺位客观数据：午晚高峰客流、竞品、租金占比…",
    });
  } else {
    actions.push({
      id: "site_or_district",
      label: "选址与商圈",
      detail: "尚未抓到明确选址或商圈口述，请补充门店位置与商圈判断",
      prompt: "打算在哪开？商场/街铺？你观察到的热度如何？",
    });
  }

  if (has("finance") || has("model")) {
    const heard = spoken("finance") || spoken("model") || "已听到资金/模式顾虑";
    actions.push({
      id: "finance_objective",
      label: "财务客观数字",
      detail: `已抓取现金/模式底线口述，仍缺租金、装修、回本周期等客观数字。已听：${clip(heard, 48)}`,
      prompt: "补充财务数字：租金、押金、装修、预期回本月数…",
    });
  } else {
    actions.push({
      id: "finance_baseline",
      label: "财务底线",
      detail: "尚未抓到财务底线口述，请补充能亏多少、最晚何时回本",
      prompt: "钱和回本：最多能投多少？几个月不回本就停？",
    });
  }

  return actions.slice(0, 4);
}

/** 语音 Brief → 合法 MKInsight[] + 证据包（缺咨询资产时的开案真源） */
export function voiceIntakeToCouncilAssets(input: VoiceIntakeBrief): {
  insights: MKInsight[];
  evidencePacket: EvidencePacket;
  sourceNote: string;
  gapActions: EvidenceGapAction[];
} {
  const topic = clip(input.topic, 280) || "未命名决策事项";
  const whyNow = clip(input.whyNow, 280) || "时机未写明";
  const decisionQuestion =
    clip(input.decisionQuestion, 280) ||
    clip(input.topic, 280) ||
    "待决问题未写明";
  const constraints = clip(input.constraints, 280) || "底线未写明";
  const successLooksLike =
    clip(input.successLooksLike, 200) || "成功标准未写明";

  const harvested = harvestSpokenClaims(input);
  const gapActions = buildGapActions(harvested);
  const corpus = corpusOf(input);

  const siteClaim =
    harvested.find((h) => h.bucket === "site")?.claim || topic;
  const districtClaim = harvested.find((h) => h.bucket === "district")?.claim;
  const financeClaim =
    harvested.find((h) => h.bucket === "finance")?.claim || constraints;
  const timingClaim =
    harvested.find((h) => h.bucket === "timing")?.claim || whyNow;

  const intakeEvidence = [
    {
      type: "PRIMARY_FACT" as const,
      claim: siteClaim,
      source: "founder_voice_intake",
      strength: "medium" as const,
    },
    {
      type: "PRIMARY_FACT" as const,
      claim: timingClaim,
      source: "founder_voice_intake",
      strength: "medium" as const,
    },
    ...(districtClaim
      ? [
          {
            type: "PRIMARY_FACT" as const,
            claim: `商圈口述印象：${districtClaim}`,
            source: "founder_voice_intake",
            strength: "weak" as const,
          },
        ]
      : []),
  ].filter((e, i, arr) => arr.findIndex((x) => nearDup(x.claim, e.claim)) === i);

  const riskEvidence = [
    {
      type: "PRIMARY_FACT" as const,
      claim: financeClaim,
      source: "founder_voice_intake",
      strength: "medium" as const,
    },
    {
      type: "PRIMARY_FACT" as const,
      claim: `成功样貌：${successLooksLike}`,
      source: "founder_voice_intake",
      strength: "weak" as const,
    },
  ].filter((e, i, arr) => arr.findIndex((x) => nearDup(x.claim, e.claim)) === i);

  const insights = toVerticalMkInsights({
    agentId: "mobile-agent",
    kind: "other",
    caseId: input.caseId,
    findings: [
      {
        domain: "decision_intake",
        finding: decisionQuestion,
        reasoning: `老板语音采集开案。已抓取口述语料（${harvested.length} 条要点）。语料摘要：${clip(corpus, 220)}`,
        impact: `拍板将决定资源承诺与成败标准：${successLooksLike}`,
        confidence: 0.58,
        feedsRoles: ["CSO", "CFO", "CRO", "COO", "CBO"],
        evidence: intakeEvidence,
      },
      {
        domain: "risk",
        finding: `决策底线：${constraints}`,
        reasoning:
          "来自老板口述不可突破约束；常委须在条件票或否决中回应。缺口见 gapActions。",
        impact: "突破底线应召回补证或否决，不得默认通过",
        confidence: 0.62,
        feedsRoles: ["CFO", "CRO", "COO"],
        evidence: riskEvidence,
      },
    ],
  });

  // gaps 只放 1 条摘要，避免议程硬拦（≥2 条缺口须勾 allowGaps）；
  // 可行动细节放 gapActions，供判断页「去补充」入口。
  const gaps = [
    gapActions.length
      ? `口述已挂载；仍缺客观数据待补（${gapActions.map((a) => a.label).join("、")}），常委应以条件票回应`
      : "口述开案，建议补客观数据后再正式拍板",
  ];
  const evidencePacket = mergeEvidencePacket({
    caseId: input.caseId,
    insights,
    gaps,
  });
  evidencePacket.gapActions = gapActions;

  const heardLabels = Array.from(new Set(harvested.map((h) => h.bucket)))
    .map((b) =>
      ({
        site: "选址",
        district: "商圈印象",
        finance: "现金底线",
        timing: "时机",
        model: "模式顾虑",
        goal: "成败标准",
      })[b],
    )
    .filter(Boolean);

  return {
    insights,
    evidencePacket,
    sourceNote: `语音开案 MKInsight×${insights.length} · 已抓口述：${heardLabels.join("、") || "事项"}`,
    gapActions,
  };
}
