/**
 * 垂直 Agent → MKInsight Adapter 样板（L3 Tool Agent 接入闸门）
 *
 * 冻结规则：
 *   New Agent → MKInsight Adapter → Council Review
 * 禁止私有 Report 形状直进委员会。
 *
 * 用法：选址 / 菜单 / 营销 / 招聘等垂直能力实现 `VerticalInsightSource`，
 * 再调用 `toVerticalMkInsights` 产出合法 Insight。
 */

import {
  assertCouncilIngressViaMkInsight,
  sanitizeInsights,
  type MKEvidence,
  type MKEvidenceType,
  type MKInsight,
} from "./mk-insight";

export type VerticalAgentKind =
  | "site"
  | "menu"
  | "campaign"
  | "hiring"
  | "ops"
  | "other";

export interface VerticalInsightFinding {
  domain: string;
  finding: string;
  reasoning: string;
  impact: string;
  confidence: number;
  evidence: Array<{
    claim: string;
    type?: MKEvidenceType;
    source?: string;
    strength?: MKEvidence["strength"];
  }>;
  feedsRoles?: string[];
}

export interface VerticalInsightSource {
  agentId: string;
  kind: VerticalAgentKind;
  caseId: string;
  findings: VerticalInsightFinding[];
}

/** 垂直能力 → MKInsight[]（唯一合法出口） */
export function toVerticalMkInsights(source: VerticalInsightSource): MKInsight[] {
  const raw: MKInsight[] = source.findings.map((f, idx) => {
    const evidence: MKEvidence[] = (f.evidence || []).map((e, j) => ({
      id: `${source.agentId}-E-${idx + 1}-${j + 1}`,
      type: e.type || "OTHER",
      claim: e.claim,
      source: e.source || source.agentId,
      strength: e.strength || "medium",
    }));
    if (!evidence.length) {
      evidence.push({
        id: `${source.agentId}-E-${idx + 1}-0`,
        type: "OTHER",
        claim: f.finding.slice(0, 160),
        source: source.agentId,
        strength: "weak",
      });
    }
    return {
      id: `${source.agentId}-${f.domain || "general"}-${idx + 1}`,
      sourceAgent: source.agentId,
      domain: f.domain || source.kind,
      finding: f.finding,
      reasoning: f.reasoning,
      evidence,
      confidence: f.confidence,
      impact: f.impact,
      feedsRoles: f.feedsRoles,
    };
  });

  const { insights } = sanitizeInsights(raw);
  return insights;
}

/**
 * 垂直 Agent 接入委员会前的硬闸门。
 * 无合法 Insight 时抛错（不允许「聊天结论」直进）。
 */
export function assertVerticalCouncilIngress(
  source: VerticalInsightSource,
): MKInsight[] {
  const insights = toVerticalMkInsights(source);
  assertCouncilIngressViaMkInsight({
    insights,
    allowEmpty: false,
    label: `垂直 Agent ${source.agentId}`,
  });
  return insights;
}

/** 样例：选址 Agent 输出如何变成 Insight（供测试 / 文档） */
export function exampleSiteSelectionInsights(caseId: string): MKInsight[] {
  return toVerticalMkInsights({
    agentId: "L3-SITE",
    kind: "site",
    caseId,
    findings: [
      {
        domain: "foot_traffic",
        finding: "目标铺位午晚高峰客流可支撑试点，但租金占比偏高",
        reasoning: "连续 5 个工作日人工点位采样 + 周边竞品密度对照",
        impact: "可试点，但须压租金或提高客单假设",
        confidence: 0.66,
        evidence: [
          {
            type: "DATA",
            claim: "午高峰 12–13 点过店 180+/15min",
            source: "field_count",
            strength: "medium",
          },
          {
            type: "BENCHMARK",
            claim: "同类店租金/营收警戒线 15%",
            source: "internal_benchmark",
            strength: "medium",
          },
        ],
        feedsRoles: ["COO", "CFO", "CMO"],
      },
    ],
  });
}
