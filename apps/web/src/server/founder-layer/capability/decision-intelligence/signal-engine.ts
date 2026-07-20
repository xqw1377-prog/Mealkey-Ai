/**
 * Signal Engine V1 — 从 Brain/Runtime 投影生成 DecisionSignal
 * 不写 Prisma Decision；纯函数。
 */
import type { DecisionHorizonV1 } from "@/server/founder-layer/contracts/business-identity";
import type { DecisionSignalV1 } from "@/server/founder-layer/contracts/decision-signal";
import {
  containsRegionalMetricClaim,
  hasMintelAnchors,
} from "@/server/founder-layer/capability/m-intel";

export type SignalHomeInput = {
  projectId: string;
  restaurantName: string;
  brandName?: string | null;
  city?: string | null;
  focusProblem?: string | null;
  decisionHorizon?: DecisionHorizonV1 | null;
  openRiskAlert?: {
    id: string;
    type: string;
    level: string;
    title: string;
    description: string;
    suggestedTopic: string;
    suggestCouncil?: boolean;
  } | null;
  openOpportunity?: {
    id: string;
    title: string;
    score: number;
    suggestedTopic: string;
  } | null;
  riskBlocksOpportunity?: boolean;
  /** R4：经营画像差分信号（已由上游算出） */
  ripSignals?: DecisionSignalV1[];
};

function clip(text: string, max: number) {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

function isExpansionText(text: string) {
  return /第二家|扩店|开店|扩张|分店/.test(text);
}

function urgencyFromRiskLevel(
  level: string,
): DecisionSignalV1["urgency"] {
  if (level === "critical" || level === "high") return "high";
  if (level === "medium") return "medium";
  return "low";
}

function importanceFromRiskLevel(level: string): number {
  if (level === "critical") return 0.95;
  if (level === "high") return 0.85;
  if (level === "medium") return 0.65;
  return 0.45;
}

/**
 * 组装今日 Signal 列表（最多 5 条）。
 * 描述必须带主体/因果，禁止空话「营业额下降」。
 */
export function collectDecisionSignals(
  input: SignalHomeInput,
): DecisionSignalV1[] {
  const now = new Date().toISOString();
  const place = [input.city, input.restaurantName].filter(Boolean).join(" · ");
  const brand = input.brandName || input.restaurantName;
  const anchorsOk = hasMintelAnchors({
    brandName: input.brandName || input.restaurantName,
    city: input.city,
  });
  const signals: DecisionSignalV1[] = [];

  if (input.openRiskAlert) {
    const r = input.openRiskAlert;
    const topic = r.suggestedTopic || r.title;
    let rawDesc = `${place || brand}：${r.description || r.title}`;
    // 无锚点时剥离区域量化话术，避免信号层装懂外部
    if (!anchorsOk && containsRegionalMetricClaim(rawDesc)) {
      rawDesc = `${brand || "本店"}：内部经营风险需处理（区域市场结论暂不可用，请先补城市锚点）`;
    }
    const desc = clip(
      rawDesc + (r.suggestCouncil ? "。建议进入今日决策判断。" : "。"),
      160,
    );
    const id = `sig_risk_${r.id || "1"}`;
    signals.push({
      id,
      signalId: id,
      projectId: input.projectId,
      source: "RISK_RUNTIME",
      type: "RISK",
      title: clip(r.title, 48),
      description: desc,
      importance: importanceFromRiskLevel(r.level),
      urgency: urgencyFromRiskLevel(r.level),
      relatedScope: {
        brandName: brand,
        storeName: input.restaurantName,
        city: input.city || undefined,
        horizon: input.decisionHorizon || undefined,
      },
      evidenceIds: [],
      suggestedQuestion: clip(
        topic.includes("？") || topic.includes("?")
          ? topic
          : `是否处理：${topic}？`,
        80,
      ),
      observedAt: now,
      status: "open",
    });
  }

  if (input.openOpportunity && !input.riskBlocksOpportunity) {
    const o = input.openOpportunity;
    const topic = o.suggestedTopic || o.title;
    const id = `sig_opp_${o.id || "1"}`;
    signals.push({
      id,
      signalId: id,
      projectId: input.projectId,
      source: "OPPORTUNITY_RUNTIME",
      type: "OPPORTUNITY",
      title: clip(o.title, 48),
      description: clip(
        `${place || brand}出现增长信号：${o.title}（评分 ${Math.round(o.score)}）。需判断是否投入资源。`,
        160,
      ),
      importance: Math.max(0.4, Math.min(0.9, o.score / 100)),
      urgency: o.score >= 75 ? "high" : o.score >= 55 ? "medium" : "low",
      relatedScope: {
        brandName: brand,
        storeName: input.restaurantName,
        city: input.city || undefined,
        horizon: input.decisionHorizon || undefined,
      },
      evidenceIds: [],
      suggestedQuestion: clip(
        topic.includes("？") || topic.includes("?")
          ? topic
          : `是否把握：${topic}？`,
        80,
      ),
      observedAt: now,
      status: "open",
    });
  }

  const focus = input.focusProblem?.trim();
  if (focus) {
    const already = signals.some(
      (s) =>
        s.title.includes(focus.slice(0, 8)) ||
        s.suggestedQuestion.includes(focus.slice(0, 8)),
    );
    if (!already) {
      const expansion = isExpansionText(focus);
      const id = `sig_user_focus`;
      signals.push({
        id,
        signalId: id,
        projectId: input.projectId,
        source: "USER",
        type: expansion ? "CHANGE" : "UNKNOWN",
        title: clip(focus, 48),
        description: clip(
          expansion
            ? `${brand}：你提出「${focus}」。需对照单店盈利、店长独立与现金缓冲再判断是否升格为决策。`
            : `${brand}：开户时你最困扰的是「${focus}」，今日仍可作为关注候选。`,
          160,
        ),
        importance: expansion ? 0.78 : 0.55,
        urgency: expansion ? "medium" : "low",
        relatedScope: {
          brandName: brand,
          storeName: input.restaurantName,
          city: input.city || undefined,
          horizon: input.decisionHorizon || undefined,
        },
        evidenceIds: [],
        suggestedQuestion: expansion
          ? "12 个月内要不要开第二家店？"
          : clip(
              focus.includes("？") || focus.includes("?")
                ? focus
                : `是否优先处理：${focus}？`,
              80,
            ),
        observedAt: now,
        status: "open",
      });
    }
  }

  if (input.ripSignals?.length) {
    for (const rip of input.ripSignals) {
      if (signals.length >= 5) break;
      if (signals.some((s) => s.id === rip.id)) continue;
      signals.push(rip);
    }
  }

  return signals.slice(0, 5);
}

export function isExpansionSignal(s: DecisionSignalV1): boolean {
  return isExpansionText(
    `${s.title} ${s.description} ${s.suggestedQuestion}`,
  );
}
