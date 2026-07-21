import type { ToolAgentEngine, ToolAgentRequest } from "@mealkey/tool-agent-kit";
import {
  M_OPS_DIAG_AGENT_ID,
  M_OPS_DIAG_PRODUCT_NAME,
  type DiagnosisEvidenceItem,
  type DiagnosisFinding,
  type DiagnosisGap,
  type DiagnosisInsight,
  type DiagnosisSignal,
  type RestaurantDiagnosisRequest,
  type RestaurantDiagnosisResult,
} from "./contracts";
import { mOpsDiagManifest } from "./manifest";

const WAIT_RE =
  /等待|排队|慢|上菜|服务|态度|服务员|效率|催/;
const PRODUCT_RE = /味道|难吃|咸|淡|油|品质|食材|份量/;
const ENV_RE = /环境|卫生|吵|脏|装修/;

function clip(s: string, n: number) {
  const t = s.trim();
  return t.length <= n ? t : `${t.slice(0, n - 1)}…`;
}

function analyzeConsumerFeedback(
  evidence: DiagnosisEvidenceItem[],
  focus: RestaurantDiagnosisRequest["focus"],
): {
  findings: DiagnosisFinding[];
  signals: DiagnosisSignal[];
  insights: DiagnosisInsight[];
  customerLens: NonNullable<RestaurantDiagnosisResult["customerLens"]>;
  gaps: DiagnosisGap[];
} {
  const gaps: DiagnosisGap[] = [];
  if (!evidence.length) {
    gaps.push({
      field: "evidence",
      reason: "缺少消费者反馈证据（点评/内容），无法做反馈诊断",
      severity: "high",
    });
    return {
      findings: [],
      signals: [],
      insights: [],
      customerLens: { theyThink: [] },
      gaps,
    };
  }

  const negative = evidence.filter((e) => e.sentiment === "negative");
  const positive = evidence.filter((e) => e.sentiment === "positive");
  const pool = negative.length ? negative : evidence;

  const themes = {
    wait: pool.filter((e) => WAIT_RE.test(e.claim) || e.theme === "wait"),
    product: pool.filter((e) => PRODUCT_RE.test(e.claim) || e.theme === "product"),
    env: pool.filter((e) => ENV_RE.test(e.claim) || e.theme === "environment"),
  };

  const dominant =
    themes.wait.length >= themes.product.length &&
    themes.wait.length >= themes.env.length
      ? "wait"
      : themes.product.length >= themes.env.length
        ? "product"
        : "env";

  const dominantCount = themes[dominant].length;
  const negRate = evidence.length
    ? Math.round((negative.length / evidence.length) * 100)
    : 0;

  const findings: DiagnosisFinding[] = [];
  const signals: DiagnosisSignal[] = [];
  const insights: DiagnosisInsight[] = [];

  if (dominantCount > 0 && (focus === "overall" || focus === "service" || !focus)) {
    const themeLabel =
      dominant === "wait"
        ? "等待/服务节奏"
        : dominant === "product"
          ? "产品/味道"
          : "环境/卫生";

    const observation =
      negative.length > 0
        ? `近窗消费者负面反馈中，约 ${Math.round((dominantCount / Math.max(negative.length, 1)) * 100)}% 集中在「${themeLabel}」`
        : `反馈样本中「${themeLabel}」被多次提及（样本 ${evidence.length}）`;

    const pattern =
      dominant === "wait"
        ? `等待/服务相关表述出现 ${dominantCount} 次；负面占比 ${negRate}%`
        : dominant === "product"
          ? `产品相关表述出现 ${dominantCount} 次；负面占比 ${negRate}%`
          : `环境相关表述出现 ${dominantCount} 次；负面占比 ${negRate}%`;

    const meaning =
      dominant === "wait"
        ? "服务交付节奏可能正在成为体验瓶颈，影响复购与口碑扩散"
        : dominant === "product"
          ? "产品稳定性或口味预期可能与顾客记忆不一致"
          : "到店环境体验可能在削弱「愿意再来」的意愿";

    findings.push({
      id: `finding-${dominant}-1`,
      observation,
      pattern,
      meaning,
      confidence: Math.min(0.85, 0.45 + dominantCount * 0.08),
      focus: dominant === "product" ? "product" : "service",
      evidenceIds: themes[dominant].map((e, i) => e.id || `ev-${i}`),
    });

    signals.push({
      id: `sig-${dominant}-1`,
      type: "CUSTOMER",
      severity:
        negRate >= 40 || dominantCount >= 3
          ? "HIGH"
          : dominantCount >= 2
            ? "MEDIUM"
            : "LOW",
      title:
        dominant === "wait"
          ? "服务体验风险"
          : dominant === "product"
            ? "产品体验波动"
            : "到店环境风险",
      observation,
      pattern,
      meaning,
      impact:
        dominant === "wait"
          ? "可能影响复购与差评扩散"
          : "可能削弱口碑与到店转化",
      watchHint: "建议带着证据对齐今日驾驶舱，需要拍板时再进决策室",
      confidence: findings[0]!.confidence,
      evidence: themes[dominant].slice(0, 5).map((e) => ({
        source: e.source,
        fact: clip(e.claim, 80),
      })),
      decisionTopic:
        dominant === "wait"
          ? "如何改善服务等待体验"
          : dominant === "product"
            ? "如何稳住顾客对产品的预期"
            : "如何改善到店环境体验",
    });

    insights.push({
      domain: dominant === "product" ? "product" : "service",
      question: signals[0]!.decisionTopic || "如何改善经营体验",
      finding: observation,
      reasoning: pattern,
      impact: meaning,
      confidence: findings[0]!.confidence,
      evidence: themes[dominant].slice(0, 5).map((e) => ({
        claim: clip(e.claim, 100),
        source: e.source,
      })),
      unknowns:
        evidence.length < 8
          ? ["样本量偏少，结论需更多一手评论验证"]
          : undefined,
    });
  }

  const theyThink: string[] = [];
  for (const e of positive.slice(0, 2)) {
    theyThink.push(clip(e.claim, 40));
  }
  for (const e of themes[dominant].slice(0, 2)) {
    theyThink.push(clip(e.claim, 40));
  }
  if (!theyThink.length) {
    theyThink.push(...evidence.slice(0, 3).map((e) => clip(e.claim, 40)));
  }

  return {
    findings,
    signals,
    insights,
    customerLens: {
      theyThink: theyThink.slice(0, 3),
      biggestOpportunity:
        positive.length > 0
          ? clip(positive[0]!.claim, 48)
          : undefined,
      biggestRisk: signals[0]?.title,
    },
    gaps,
  };
}

/** 诊断引擎 — 纯函数；零 Prisma / 零 UI */
export async function runRestaurantDiagnosis(
  request: RestaurantDiagnosisRequest,
): Promise<RestaurantDiagnosisResult> {
  const horizon = request.horizon || "7d";
  const focus = request.focus || "overall";
  const evidence = request.evidence || [];

  const analyzed = analyzeConsumerFeedback(evidence, focus);

  return {
    agentId: M_OPS_DIAG_AGENT_ID,
    ok: analyzed.gaps.every((g) => g.severity !== "high") || analyzed.findings.length > 0,
    productName: M_OPS_DIAG_PRODUCT_NAME,
    horizon,
    focus,
    findings: analyzed.findings,
    signals: analyzed.signals,
    insights: analyzed.insights,
    gaps: analyzed.gaps,
    customerLens: analyzed.customerLens,
  };
}

/** 注册进 ToolAgentRegistry 用的 Engine 外壳 */
export const mOpsDiagEngine: ToolAgentEngine<
  RestaurantDiagnosisRequest,
  DiagnosisFinding
> = {
  manifest: mOpsDiagManifest,
  async run(request: ToolAgentRequest<RestaurantDiagnosisRequest>) {
    const result = await runRestaurantDiagnosis(request.input);
    return {
      agentId: M_OPS_DIAG_AGENT_ID,
      ok: result.ok,
      findings: result.findings,
      signalHints: result.signals.map((s) => ({
        typeHint: s.type,
        observation: s.observation,
        meaning: s.meaning,
        impact: s.impact,
        confidence: s.confidence,
        evidenceClaims: s.evidence.map((e) => e.fact),
      })),
      insightDraft: result.insights.length
        ? {
            caseId: request.meta?.caseId || `ops-diag-${Date.now()}`,
            findings: result.insights.map((i) => ({
              domain: i.domain,
              finding: i.finding,
              reasoning: i.reasoning,
              impact: i.impact,
              confidence: i.confidence,
              evidenceClaims: i.evidence.map((e) => e.claim),
            })),
          }
        : undefined,
      gaps: result.gaps,
      errorMessage: result.errorMessage,
    };
  },
};
