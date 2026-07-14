/**
 * M-PNT Structured Payload Protocol V1
 *
 * 规范化 MKDecision.evidence[] 中 source==="structured" 的载荷格式。
 * 每个 step/matrix/output 有明确的 TypeScript 类型定义。
 */
import type { Evidence } from "@mealkey/agent-sdk";

// ─── 载荷标签枚举 ─────────────────────────────────────────────

export type StructuredPayloadTag =
  | 'step:category_analysis'
  | 'step:customer_portrait'
  | 'step:price_positioning'
  | 'step:competitor_analysis'
  | 'step:differentiation'
  | 'step:brand_tonality'
  | 'step:final'
  | 'matrix:theory_view'
  | 'matrix:cross_fire'
  | 'matrix:synthesis'
  | 'output:positioning_page';

// ─── 每步的结构化载荷类型 ─────────────────────────────────────

export interface CategoryAnalysisPayload {
  stepId: 'category_analysis';
  tag: 'step:category_analysis';
  marketOpportunity: { level: 'strong' | 'adequate' | 'weak' | 'failed'; summary: string };
  competitionDensity: 'blue_ocean' | 'moderate' | 'crowded' | 'red_ocean';
  categoryLifecycle: '导入期' | '成长期' | '成熟期' | '衰退期';
  resourceFit: { level: 'strong' | 'adequate' | 'weak'; gap: string[] };
  keyFindings: Array<{ dimension: string; conclusion: string; confidence: number }>;
}

export interface CustomerPortraitPayload {
  stepId: 'customer_portrait';
  tag: 'step:customer_portrait';
  targetCustomer: {
    fit: 'clear' | 'broad' | 'vague';
    coreAudience: string;
    scene: string;
    priceAcceptance: string;
  };
  sceneOpportunity: {
    primaryScene: string;
    frequency: 'high' | 'medium' | 'low';
    memorability: 'high' | 'medium' | 'low';
  };
}

export interface PricePositioningPayload {
  stepId: 'price_positioning';
  tag: 'step:price_positioning';
  priceBand: [number, number];
  targetPrice: number;
  costStructure: { food: number; labor: number; rent: number };
  competitivePricing: string;
  profitModel: string;
}

export interface CompetitorAnalysisPayload {
  stepId: 'competitor_analysis';
  tag: 'step:competitor_analysis';
  directCompetitors: Array<{ name: string; mentalAnchor: string; strength: string; weakness: string }>;
  whiteSpots: string[];
  competitiveBarrier: string;
  recommendedEntryPoint: string;
}

export interface DifferentiationPayload {
  stepId: 'differentiation';
  tag: 'step:differentiation';
  candidates: Array<{
    id: string;
    name: string;
    oneLiner: string;
    type: string;
    focus: string;
  }>;
  primaryDirection?: {
    id: string;
    name: string;
    oneLiner: string;
  };
  decision_recommend?: string;
  overall_score?: number;
  mind_position_level?: string;
  max_risk_severity?: string;
}

export interface FinalPayload {
  stepId: 'final';
  tag: 'step:final';
  summary: string;
  decision_recommend: string;
  overall_score: number;
  mind_position_level: string;
  max_risk_severity: string;
  brandPositioning: Record<string, string>;
  theory_vote_summary: Record<string, unknown>;
  candidates: unknown[];
  mSolution: Record<string, string>;
  risks: unknown[];
  validation: Record<string, unknown>;
  nextSteps: Array<{ step: string; priority: string; timeline: string }>;
}

// ─── 统一载荷类型 ─────────────────────────────────────────────

export type StructuredPayload =
  | CategoryAnalysisPayload
  | CustomerPortraitPayload
  | PricePositioningPayload
  | CompetitorAnalysisPayload
  | DifferentiationPayload
  | FinalPayload
  | Record<string, unknown>;  // 回落

// ─── 工具函数 ─────────────────────────────────────────────────

/**
 * 读取 MKDecision 中的结构化载荷
 */
export function readStructuredPayload<T = StructuredPayload>(
  evidence: Evidence[],
  tag?: StructuredPayloadTag,
): T | undefined {
  const hit = evidence.find(e =>
    e.source === "structured" && (!tag || (typeof e.content === 'string' && e.content.includes(tag))),
  );
  if (!hit) return undefined;
  try {
    return JSON.parse(hit.content) as T;
  } catch {
    return undefined;
  }
}

/**
 * 创建结构化载荷 Evidence
 */
export function createStructuredEvidence(
  tag: StructuredPayloadTag,
  payload: Record<string, unknown>,
  relevance = 0.9,
): Evidence {
  return {
    source: "structured",
    content: JSON.stringify({ tag, ...payload }),
    relevance,
  };
}

/**
 * 从载荷中提取 tag
 */
export function extractTag(payload: Record<string, unknown>): StructuredPayloadTag | null {
  const tag = payload.tag as string;
  if (tag && tag.startsWith('step:') || tag?.startsWith('matrix:') || tag?.startsWith('output:')) {
    return tag as StructuredPayloadTag;
  }
  return null;
}
