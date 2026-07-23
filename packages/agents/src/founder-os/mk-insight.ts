/**
 * MKInsight Contract V1 — 四大 Agent → 七常委的唯一专业洞察入口
 *
 * 私有 Report（Position/Market/Business…）不得直进 Council。
 * ExpertReport 仅作为兼容投影；真源是 MKInsight[]。
 */

import type {
  EvidenceItem,
  EvidencePacket,
  ExpertEngineId,
  ExpertReport,
  ExpertReportSection,
  CouncilOpinion,
  DecisionResolution,
} from "./types";
import { EXPERT_TO_COUNCIL_LENS } from "./expert-engines";

export type MKEvidenceType =
  | "DATA"
  | "CASE"
  | "RULE"
  | "HISTORY"
  | "BENCHMARK"
  | "PRIMARY_FACT"
  | "OTHER";

export interface MKEvidence {
  id: string;
  type: MKEvidenceType;
  claim: string;
  source?: string;
  strength?: "weak" | "medium" | "strong";
}

export interface MKInsight {
  id: string;
  sourceAgent: ExpertEngineId | string;
  domain: string;
  finding: string;
  reasoning: string;
  evidence: MKEvidence[];
  confidence: number;
  impact: string;
  /** 供常委镜头消费（可选） */
  feedsRoles?: string[];
}

/** Decision Trace：Agent Insight → 常委 → 投票 → 决策 → 结果 */
export interface DecisionTrace {
  caseId: string;
  createdAt: string;
  insights: MKInsight[];
  councilOpinions: Array<{
    member: string;
    position: string;
    judgment?: string;
    evidenceUsed?: string[];
  }>;
  resolution?: {
    recommendedAction: string;
    majorityView: string[];
    minorityReport: string[];
    vetoFlags?: string[];
  };
  outcome?: {
    status: "pending" | "validated" | "killed" | "unknown";
    note?: string;
  };
}

const DOMAIN_BY_SECTION: Record<string, string> = {
  category: "brand_category",
  mindset: "consumer_mindset",
  positioning: "positioning",
  brand_strategy: "brand_strategy",
  market_scan: "market_trend",
  competition: "competition",
  entry_choice: "market_entry",
  verification: "growth_risk",
  market_size: "market_trend",
  user_trends: "user_insight",
  growth_window: "market_trend",
  risks: "growth_risk",
  business_scan: "business_model",
  unit_economics: "unit_economics",
  business_model: "business_model",
  profit_structure: "profit_model",
  replication: "replication",
  sensitivity: "business_risk",
  equity_scan: "ownership",
  control_structure: "control",
  ownership: "ownership",
  fundraising: "fundraising",
  control: "control",
  incentives: "partnership",
};

const STANCE_CONFIDENCE: Record<
  NonNullable<ExpertReport["stanceHint"]>,
  number
> = {
  favorable: 0.78,
  cautious: 0.62,
  unfavorable: 0.7,
  insufficient_data: 0.42,
};

function clip(text: string, max = 320): string {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (!t) return "（待补）";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function stanceToImpact(
  stance?: ExpertReport["stanceHint"],
): string {
  switch (stance) {
    case "favorable":
      return "支持推进，但仍需验证杀出线";
    case "unfavorable":
      return "倾向反对或大幅收窄方案";
    case "cautious":
      return "有条件支持，先补证据再放大";
    case "insufficient_data":
      return "证据不足，禁止当作终局判断";
    default:
      return "供常委权衡，不作终局";
  }
}

/** 校验单条 Insight；返回错误列表（空=通过） */
export function validateMkInsight(insight: MKInsight): string[] {
  const errors: string[] = [];
  if (!insight.id?.trim()) errors.push("缺少 id");
  if (!insight.sourceAgent?.trim()) errors.push("缺少 sourceAgent");
  if (!insight.domain?.trim()) errors.push("缺少 domain");
  if (!insight.finding?.trim() || insight.finding === "（待补）") {
    errors.push("finding 无效");
  }
  if (!insight.reasoning?.trim()) errors.push("缺少 reasoning");
  if (!Array.isArray(insight.evidence) || insight.evidence.length === 0) {
    errors.push("必须至少一条 evidence");
  }
  if (
    typeof insight.confidence !== "number" ||
    insight.confidence < 0 ||
    insight.confidence > 1
  ) {
    errors.push("confidence 须在 0–1");
  }
  if (!insight.impact?.trim()) errors.push("缺少 impact");
  return errors;
}

/** 批量校验；缺证据的 Insight 会被剔除并记入 gaps */
export function sanitizeInsights(insights: MKInsight[]): {
  insights: MKInsight[];
  rejected: Array<{ id: string; errors: string[] }>;
} {
  const ok: MKInsight[] = [];
  const rejected: Array<{ id: string; errors: string[] }> = [];
  for (const item of insights) {
    const errors = validateMkInsight(item);
    if (errors.length) {
      rejected.push({ id: item.id || "?", errors });
      continue;
    }
    ok.push({
      ...item,
      confidence: Math.min(1, Math.max(0, item.confidence)),
      finding: clip(item.finding, 280),
      reasoning: clip(item.reasoning, 400),
      impact: clip(item.impact, 200),
    });
  }
  return { insights: ok, rejected };
}

/**
 * 接入闸门：新垂直 Agent / 私有 Report 不得绕过。
 * 至少需要一条合法 MKInsight，或显式 allowEmpty（仅 stub 开会）。
 */
export function assertCouncilIngressViaMkInsight(input: {
  insights: MKInsight[];
  allowEmpty?: boolean;
  label?: string;
}): void {
  const { insights, rejected } = sanitizeInsights(input.insights);
  if (insights.length === 0 && !input.allowEmpty) {
    const detail = rejected
      .slice(0, 3)
      .map((r) => `${r.id}:${r.errors.join(",")}`)
      .join("；");
    throw new Error(
      `${input.label || "Council ingress"} 拒绝：缺少合法 MKInsight` +
        (detail ? `（${detail}）` : "。请经 Adapter 产出洞察后再开会。"),
    );
  }
}

/** ExpertReport → MKInsight[]（兼容桥） */
export function expertReportToInsights(
  report: ExpertReport,
  opts?: { minConfidence?: number },
): MKInsight[] {
  const baseConf =
    STANCE_CONFIDENCE[report.stanceHint || "insufficient_data"] ?? 0.5;
  const conf = Math.max(opts?.minConfidence ?? 0, baseConf);
  const impact = stanceToImpact(report.stanceHint);
  const lens = EXPERT_TO_COUNCIL_LENS[report.engineId as ExpertEngineId];
  const feedsRoles = lens ? Object.keys(lens) : undefined;

  const fromSections = (report.sections || []).map((section, idx) =>
    sectionToInsight(report, section, idx, conf, impact, feedsRoles),
  );

  const extras: MKInsight[] = [];
  for (const [i, risk] of (report.risks || []).slice(0, 3).entries()) {
    extras.push({
      id: `${report.engineId}-risk-${i + 1}`,
      sourceAgent: report.engineId,
      domain: "risk",
      finding: clip(risk, 200),
      reasoning: `来自 ${report.engineId} 风险清单`,
      evidence: [
        {
          id: `${report.engineId}-E-risk-${i + 1}`,
          type: "OTHER",
          claim: clip(risk, 160),
          source: report.engineId,
          strength: "medium",
        },
      ],
      confidence: Math.min(conf, 0.68),
      impact: "风险约束：常委须在条件或否决中回应",
      feedsRoles,
    });
  }
  for (const [i, opp] of (report.opportunities || []).slice(0, 2).entries()) {
    extras.push({
      id: `${report.engineId}-opp-${i + 1}`,
      sourceAgent: report.engineId,
      domain: "opportunity",
      finding: clip(opp, 200),
      reasoning: `来自 ${report.engineId} 机会清单`,
      evidence: [
        {
          id: `${report.engineId}-E-opp-${i + 1}`,
          type: "CASE",
          claim: clip(opp, 160),
          source: report.engineId,
          strength: "medium",
        },
      ],
      confidence: conf,
      impact: "机会信号：供 CMO/CSO/BMO 权衡是否占位",
      feedsRoles,
    });
  }

  const { insights } = sanitizeInsights([...fromSections, ...extras]);
  return insights;
}

function sectionToInsight(
  report: ExpertReport,
  section: ExpertReportSection,
  idx: number,
  conf: number,
  impact: string,
  feedsRoles?: string[],
): MKInsight {
  const evidenceIds = section.evidenceIds?.length
    ? section.evidenceIds
    : [`${report.engineId}-E-S${idx + 1}`];
  return {
    id: `${report.engineId}-${section.id || `sec-${idx + 1}`}`,
    sourceAgent: report.engineId,
    domain: DOMAIN_BY_SECTION[section.id] || section.id || "general",
    finding: clip(section.content || section.title, 280),
    reasoning: clip(
      `${section.title} · 引擎立场 ${report.stanceHint || "unknown"} · ${report.headline}`,
      400,
    ),
    evidence: evidenceIds.slice(0, 6).map((eid, j) => ({
      id: eid,
      type: "PRIMARY_FACT" as const,
      claim: clip(section.content || section.title, 160),
      source: report.engineId,
      strength: j === 0 ? ("medium" as const) : ("weak" as const),
    })),
    confidence: conf,
    impact,
    feedsRoles,
  };
}

/** MKInsight[] → ExpertReport（供现有会议引擎消费） */
export function insightsToExpertReport(
  insights: MKInsight[],
  engineId: ExpertEngineId,
  caseId: string,
): ExpertReport {
  const owned = insights.filter((i) => i.sourceAgent === engineId);
  const sections: ExpertReportSection[] = owned
    .filter((i) => i.domain !== "risk" && i.domain !== "opportunity")
    .slice(0, 6)
    .map((i) => ({
      id: i.domain,
      title: i.domain,
      content: i.finding,
      evidenceIds: i.evidence.map((e) => e.id).slice(0, 6),
    }));

  const headline =
    owned.find((i) => i.domain !== "risk")?.finding ||
    `${engineId} 专业洞察`;

  const avgConf =
    owned.reduce((s, i) => s + i.confidence, 0) / Math.max(owned.length, 1);

  let stanceHint: ExpertReport["stanceHint"] = "cautious";
  if (avgConf >= 0.75) stanceHint = "favorable";
  else if (avgConf < 0.5) stanceHint = "insufficient_data";

  return {
    engineId,
    caseId,
    headline: clip(headline, 120),
    stanceHint,
    sections: sections.length
      ? sections
      : [
          {
            id: "general",
            title: "综合",
            content: clip(headline),
          },
        ],
    risks: owned.filter((i) => i.domain === "risk").map((i) => i.finding),
    opportunities: owned
      .filter((i) => i.domain === "opportunity")
      .map((i) => i.finding),
  };
}

export function insightsToEvidenceItems(insights: MKInsight[]): EvidenceItem[] {
  const items: EvidenceItem[] = [];
  const seen = new Set<string>();
  for (const insight of insights) {
    for (const ev of insight.evidence) {
      if (seen.has(ev.id)) continue;
      seen.add(ev.id);
      items.push({
        evidenceId: ev.id,
        sourceAgent: String(insight.sourceAgent),
        claim: ev.claim,
        strength: ev.strength || "medium",
        category: ev.type,
        refs: [insight.id],
      });
    }
  }
  return items.slice(0, 24);
}

export function mergeEvidencePacket(input: {
  caseId: string;
  base?: EvidencePacket;
  insights: MKInsight[];
  gaps?: string[];
  /** 可行动缺口入口（语音开案 / 补证 UI） */
  gapActions?: EvidencePacket["gapActions"];
}): EvidencePacket {
  const fromInsights = insightsToEvidenceItems(input.insights);
  const baseItems = input.base?.items || [];
  const byId = new Map<string, EvidenceItem>();
  for (const item of [...baseItems, ...fromInsights]) {
    byId.set(item.evidenceId, item);
  }
  const actionById = new Map<string, NonNullable<EvidencePacket["gapActions"]>[number]>();
  for (const action of [
    ...(input.base?.gapActions || []),
    ...(input.gapActions || []),
  ]) {
    actionById.set(action.id, action);
  }
  return {
    caseId: input.caseId,
    generatedAt: new Date().toISOString(),
    items: [...byId.values()].slice(0, 24),
    gaps: [
      ...(input.base?.gaps || []),
      ...(input.gaps || []),
    ].slice(0, 8),
    gapActions: [...actionById.values()].slice(0, 8),
  };
}

export function buildDecisionTrace(input: {
  caseId: string;
  insights: MKInsight[];
  opinions?: CouncilOpinion[];
  resolution?: DecisionResolution;
  outcomeStatus?: "pending" | "validated" | "killed" | "unknown";
  outcomeNote?: string;
}): DecisionTrace {
  return {
    caseId: input.caseId,
    createdAt: new Date().toISOString(),
    insights: input.insights,
    councilOpinions: (input.opinions || []).map((o) => ({
      member: o.member,
      position: o.position,
      judgment: o.judgment || o.summary,
      evidenceUsed: o.evidence_used,
    })),
    resolution: input.resolution
      ? {
          recommendedAction: input.resolution.recommended_action,
          majorityView: input.resolution.majority_view,
          minorityReport: input.resolution.minority_report,
          vetoFlags: input.resolution.veto_flags,
        }
      : undefined,
    outcome: {
      status: input.outcomeStatus || "pending",
      note: input.outcomeNote,
    },
  };
}

/** Prompt 块：常委只读 Insight，禁止二次研究 */
export function renderMkInsightsBlock(insights: MKInsight[]): string {
  if (!insights.length) return "## MKInsight\n（无）";
  const lines = insights.slice(0, 16).map((i, n) => {
    const ev = i.evidence
      .slice(0, 2)
      .map((e) => `${e.id}:${e.claim}`)
      .join("；");
    return `${n + 1}. [${i.sourceAgent}/${i.domain}] ${i.finding}\n   理由: ${i.reasoning}\n   证据: ${ev || "—"}\n   置信 ${i.confidence.toFixed(2)} · 影响: ${i.impact}`;
  });
  return [
    "## MKInsight（专业洞察 · 禁止二次研究）",
    "只能基于下列洞察做企业级判断，不得重新做市场/品牌调研。",
    ...lines,
  ].join("\n");
}
