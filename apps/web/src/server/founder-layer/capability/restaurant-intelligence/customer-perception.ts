/**
 * 顾客认知投影 — RestaurantEvidence → RipCustomerPerception
 */

import type {
  RestaurantEvidenceV1,
  RipAspectScoreV1,
  RipCustomerPerceptionV1,
} from "@/server/founder-layer/contracts/restaurant-intelligence-profile";

const ASPECT_LABELS: Record<string, string> = {
  味道: "味道",
  环境: "环境",
  服务: "服务",
  性价比: "性价比",
  价格: "性价比",
};

export function inferAspectFromContent(content: string): string | undefined {
  if (/味道|好吃|菜品|口味|鲜/.test(content)) return "味道";
  if (/环境|装修|氛围|空间|卫生/.test(content)) return "环境";
  if (/服务|等位|态度|上菜|服务员/.test(content)) return "服务";
  if (/价格|性价比|贵|便宜|划算/.test(content)) return "性价比";
  return undefined;
}

function resolveAspect(e: RestaurantEvidenceV1): string | undefined {
  if (e.aspect && ASPECT_LABELS[e.aspect]) return ASPECT_LABELS[e.aspect];
  if (e.aspect) return e.aspect;
  return inferAspectFromContent(e.content);
}

function keywordFromEvidence(e: RestaurantEvidenceV1): string | undefined {
  if (e.keyword?.trim()) return e.keyword.trim();
  if (e.signal?.trim()) return e.signal.trim();
  const aspect = resolveAspect(e);
  if (aspect && e.sentiment === "positive") return aspect;
  return undefined;
}

/**
 * 将外部证据投影为顾客认知块。
 * 无可靠外部证据 → evidenceInsufficient=true，不编造分数。
 */
export function projectCustomerPerception(
  evidences: RestaurantEvidenceV1[],
): RipCustomerPerceptionV1 {
  const market = evidences.filter((e) => e.source !== "经营身份");
  if (market.length === 0) {
    return {
      aspectScores: [],
      positiveKeywords: [],
      watchouts: [],
      evidenceInsufficient: true,
    };
  }

  const byAspect = new Map<
    string,
    { pos: number; neg: number; neu: number; ids: string[] }
  >();

  for (const e of market) {
    const aspect = resolveAspect(e);
    if (!aspect) continue;
    const bucket = byAspect.get(aspect) || {
      pos: 0,
      neg: 0,
      neu: 0,
      ids: [],
    };
    if (e.sentiment === "positive") bucket.pos += 1;
    else if (e.sentiment === "negative") bucket.neg += 1;
    else bucket.neu += 1;
    bucket.ids.push(e.id);
    byAspect.set(aspect, bucket);
  }

  const aspectScores: RipAspectScoreV1[] = [...byAspect.entries()]
    .map(([aspect, b]) => {
      const total = b.pos + b.neg + b.neu;
      const score =
        total > 0
          ? Math.round(((b.pos - b.neg) / total) * 50 + 50)
          : undefined;
      return {
        aspect,
        label: ASPECT_LABELS[aspect] || aspect,
        score,
        evidenceIds: b.ids.slice(0, 6),
      };
    })
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 6);

  const positiveKeywords = [
    ...new Set(
      market
        .filter((e) => e.sentiment === "positive")
        .map((e) => keywordFromEvidence(e))
        .filter((k): k is string => Boolean(k)),
    ),
  ].slice(0, 8);

  const watchouts = [
    ...new Set(
      market
        .filter((e) => e.sentiment === "negative")
        .map((e) => {
          if (e.signal?.trim()) return e.signal.trim();
          if (e.keyword?.trim()) return e.keyword.trim();
          const aspect = resolveAspect(e);
          return aspect ? `${aspect}承压` : e.content.slice(0, 24);
        }),
    ),
  ].slice(0, 6);

  const hasSignal =
    aspectScores.length > 0 ||
    positiveKeywords.length > 0 ||
    watchouts.length > 0;

  return {
    aspectScores,
    positiveKeywords,
    watchouts,
    evidenceInsufficient: !hasSignal,
  };
}

/** 从负向证据提炼弱提醒（最多补足至 3） */
export function alertsFromMarketEvidence(
  evidences: RestaurantEvidenceV1[],
  limit = 2,
): Array<{ line: string; evidenceIds: string[] }> {
  return evidences
    .filter((e) => e.source !== "经营身份" && e.sentiment === "negative")
    .slice(0, limit)
    .map((e) => ({
      line: e.content.slice(0, 80),
      evidenceIds: [e.id],
    }));
}

export function summarizeCustomerPerceptionLine(
  customer: RipCustomerPerceptionV1,
): string {
  if (customer.evidenceInsufficient) {
    return "尚未形成可靠的顾客认知（缺锚点或外部采集未就绪）";
  }
  const tops = customer.positiveKeywords.slice(0, 2);
  const watches = customer.watchouts.slice(0, 2);
  const parts: string[] = [];
  if (tops.length) parts.push(`正向多见「${tops.join("、")}」`);
  if (watches.length) parts.push(`需关注「${watches.join("、")}」`);
  return parts.join("；") || "已有初步顾客信号，待继续核实";
}
