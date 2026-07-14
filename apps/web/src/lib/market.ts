/**
 * Shared market snapshot types — used by service, API, and UI pages.
 */

export type MarketScores = {
  demand: number;
  competition: number;
  gap: number;
  timing: number;
  economics: number;
  founderFit: number;
  entryProbability: number;
};

export type MarketHealth = {
  biggestRisk: string;
  judgement: "enter" | "cautious" | "kill";
  rationale: string;
};

export type MarketStructure = {
  trendSummary: string;
  populationTag?: string;
  spendingPower?: string;
  sceneSummary?: string;
  priceBandSummary?: string;
};

export type MarketCompetition = {
  headPlayers: string[];
  densitySummary: string;
  homogenization: string;
  biggestPressure: string;
};

export type MarketGap = {
  title: string;
  summary: string;
  confidence?: number;
};

export type MarketOpportunityCard = {
  opportunityId: string;
  city: string;
  district?: string;
  category: string;
  opportunity: string;
  suggestedPositioning?: string;
  suggestedPriceBand?: string;
  suggestedArea?: string;
  risk?: string;
  handoffPayload?: Record<string, unknown>;
};

export type MarketEntryStrategy = {
  id: string;
  title: string;
  summary: string;
  fit: "primary" | "secondary" | "reject";
  pros: string[];
  risks: string[];
};

export type MarketFinalDecision = {
  judgement: string;
  reasoning: string[];
  risks: string[];
  actions: string[];
  alternatives?: string[];
  nextAgent?: "m-pnt" | "m-biz" | "chief";
};

export type MarketMemory = {
  patternSummary?: string;
  relatedCases?: string[];
  confidenceNote?: string;
};

export type MarketPageOutput = {
  topic: string;
  city: string;
  district?: string;
  category: string;
  scores: MarketScores;
  health: MarketHealth;
  marketStructure: MarketStructure;
  competition: MarketCompetition;
  gaps: MarketGap[];
  opportunityCard?: MarketOpportunityCard;
  entryStrategies: MarketEntryStrategy[];
  finalDecision: MarketFinalDecision;
  marketMemory?: MarketMemory;
  reports?: Array<{
    id: string;
    title: string;
    summary: string;
  }>;
};

export type MarketSnapshot = {
  decisionId?: string;
  oneLiner: string;
  problem: string;
  observation: string;
  diagnosis: string;
  strategy: string;
  action: string;
  confidence: number;
  pageOutput: MarketPageOutput;
  updatedAt?: string;
  source?: "m-mkt" | "profile" | "decision";
};

export function buildMarketSnapshot(input: {
  decisionId?: string;
  problem?: string;
  observation?: string;
  diagnosis?: string;
  judgement?: string;
  strategy?: string;
  action?: string;
  confidence?: number;
  structured?: Record<string, unknown> | null;
  source?: MarketSnapshot["source"];
  updatedAt?: string;
}): MarketSnapshot {
  const structured = input.structured || {};
  const pageOutput = normalizePageOutput(
    (structured.pageOutput ||
      structured.page_output ||
      structured) as Record<string, unknown>,
  );

  return {
    decisionId: input.decisionId,
    oneLiner:
      input.judgement ||
      pageOutput.finalDecision.judgement ||
      "市场进入判断待形成",
    problem: input.problem || "这个市场值不值得进入？",
    observation: input.observation || "",
    diagnosis: input.diagnosis || "",
    strategy: input.strategy || "",
    action: input.action || "",
    confidence: clamp01(input.confidence ?? 0.74),
    pageOutput,
    updatedAt: input.updatedAt || new Date().toISOString(),
    source: input.source || "m-mkt",
  };
}

export function snapshotFromMMktBlob(
  blob: Record<string, unknown> | null | undefined,
  source: MarketSnapshot["source"] = "profile",
): MarketSnapshot | null {
  if (!blob) return null;
  const pageOutput =
    (typeof blob.pageOutput === "object" && blob.pageOutput
      ? blob.pageOutput
      : typeof blob.page_output === "object" && blob.page_output
        ? blob.page_output
        : blob) as Record<string, unknown>;

  const judgement =
    asString(blob.oneLiner) ||
    asString(blob.judgement) ||
    asString(asRecord(pageOutput.finalDecision).judgement);

  if (
    !judgement &&
    !pageOutput.scores &&
    !pageOutput.health &&
    !pageOutput.opportunityCard
  ) {
    return null;
  }

  return buildMarketSnapshot({
    decisionId: asString(blob.decisionId) || undefined,
    judgement: judgement || "市场进入判断待形成",
    problem: asString(blob.problem) || "这个市场值不值得进入？",
    observation: asString(blob.observation) || "",
    diagnosis: asString(blob.diagnosis) || "",
    strategy: asString(blob.strategy) || "",
    action: asString(blob.action) || "",
    confidence: numberOrFallback(blob.confidence, 0.74),
    structured: { pageOutput },
    updatedAt: asString(blob.updatedAt) || undefined,
    source,
  });
}

export function snapshotFromProjectMarketProfile(
  profile: Record<string, unknown> | null | undefined,
): MarketSnapshot | null {
  if (!profile) return null;
  const mMkt = (profile.mMkt || null) as Record<string, unknown> | null;
  if (mMkt) {
    return snapshotFromMMktBlob(mMkt, "profile");
  }
  return null;
}

function normalizePageOutput(raw: Record<string, unknown>): MarketPageOutput {
  const scoresRaw = asRecord(raw.scores);
  const healthRaw = asRecord(raw.health);
  const structureRaw = asRecord(raw.marketStructure);
  const competitionRaw = asRecord(raw.competition);
  const finalDecisionRaw = asRecord(raw.finalDecision);
  const memoryRaw = asRecord(raw.marketMemory);
  const opportunityCardRaw = asRecord(raw.opportunityCard);

  return {
    topic: asString(raw.topic) || "市场进入判断",
    city: asString(raw.city) || "城市待定",
    district: asString(raw.district) || undefined,
    category: asString(raw.category) || "品类待定",
    scores: {
      demand: clamp100(numberOrFallback(scoresRaw.demand, 72)),
      competition: clamp100(numberOrFallback(scoresRaw.competition, 68)),
      gap: clamp100(numberOrFallback(scoresRaw.gap, 65)),
      timing: clamp100(numberOrFallback(scoresRaw.timing, 70)),
      economics: clamp100(numberOrFallback(scoresRaw.economics, 66)),
      founderFit: clamp100(numberOrFallback(scoresRaw.founderFit, 64)),
      entryProbability: clamp100(numberOrFallback(scoresRaw.entryProbability, 67)),
    },
    health: {
      biggestRisk:
        asString(healthRaw.biggestRisk) || "当前竞争格局已较拥挤，需先验证切入空位是否真实存在。",
      judgement: normalizeJudgement(healthRaw.judgement),
      rationale:
        asString(healthRaw.rationale) || "先判断市场窗口，再决定是否继续投入定位与商业模型设计。",
    },
    marketStructure: {
      trendSummary:
        asString(structureRaw.trendSummary) || "目标城市仍存在结构性消费升级，但进入方式需要更克制。",
      populationTag: asString(structureRaw.populationTag) || undefined,
      spendingPower: asString(structureRaw.spendingPower) || undefined,
      sceneSummary: asString(structureRaw.sceneSummary) || undefined,
      priceBandSummary: asString(structureRaw.priceBandSummary) || undefined,
    },
    competition: {
      headPlayers: normalizeStringArray(competitionRaw.headPlayers),
      densitySummary:
        asString(competitionRaw.densitySummary) || "区域内已有同类玩家，正面硬碰并不占优。",
      homogenization:
        asString(competitionRaw.homogenization) || "现有供给在场景与价格带上存在一定同质化。",
      biggestPressure:
        asString(competitionRaw.biggestPressure) || "成熟玩家已占住主流心智，新进入者需要更清晰的切口。",
    },
    gaps: normalizeGaps(raw.gaps),
    opportunityCard: normalizeOpportunityCard(opportunityCardRaw),
    entryStrategies: normalizeStrategies(raw.entryStrategies),
    finalDecision: {
      judgement:
        asString(finalDecisionRaw.judgement) || "建议先围绕结构性空位进入，再让定位工作台接手品牌占位。",
      reasoning: normalizeStringArray(finalDecisionRaw.reasoning),
      risks: normalizeStringArray(finalDecisionRaw.risks),
      actions: normalizeStringArray(finalDecisionRaw.actions),
      alternatives: normalizeStringArray(finalDecisionRaw.alternatives),
      nextAgent: normalizeNextAgent(finalDecisionRaw.nextAgent),
    },
    marketMemory: {
      patternSummary: asString(memoryRaw.patternSummary) || undefined,
      relatedCases: normalizeStringArray(memoryRaw.relatedCases),
      confidenceNote: asString(memoryRaw.confidenceNote) || undefined,
    },
    reports: normalizeReports(raw.reports),
  };
}

function normalizeJudgement(value: unknown): MarketHealth["judgement"] {
  return value === "enter" || value === "cautious" || value === "kill"
    ? value
    : "cautious";
}

function normalizeNextAgent(value: unknown): MarketFinalDecision["nextAgent"] {
  return value === "m-pnt" || value === "m-biz" || value === "chief"
    ? value
    : undefined;
}

function normalizeOpportunityCard(
  value: Record<string, unknown>,
): MarketOpportunityCard | undefined {
  if (!value || Object.keys(value).length === 0) return undefined;
  const opportunityId = asString(value.opportunityId);
  const city = asString(value.city);
  const category = asString(value.category);
  const opportunity = asString(value.opportunity);
  if (!opportunityId || !city || !category || !opportunity) return undefined;

  return {
    opportunityId,
    city,
    district: asString(value.district) || undefined,
    category,
    opportunity,
    suggestedPositioning: asString(value.suggestedPositioning) || undefined,
    suggestedPriceBand: asString(value.suggestedPriceBand) || undefined,
    suggestedArea: asString(value.suggestedArea) || undefined,
    risk: asString(value.risk) || undefined,
    handoffPayload:
      typeof value.handoffPayload === "object" && value.handoffPayload
        ? (value.handoffPayload as Record<string, unknown>)
        : undefined,
  };
}

function normalizeGaps(value: unknown): MarketGap[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<MarketGap[]>((acc, item) => {
    if (!item || typeof item !== "object") return acc;
    const raw = item as Record<string, unknown>;
    const title = asString(raw.title);
    const summary = asString(raw.summary);
    if (!title || !summary) return acc;
    acc.push({
      title,
      summary,
      confidence:
        typeof raw.confidence === "number" ? clamp100(raw.confidence) : undefined,
    });
    return acc;
  }, []);
}

function normalizeStrategies(value: unknown): MarketEntryStrategy[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<MarketEntryStrategy[]>((acc, item, index) => {
    if (!item || typeof item !== "object") return acc;
    const raw = item as Record<string, unknown>;
    acc.push({
      id: asString(raw.id) || `strategy-${index + 1}`,
      title: asString(raw.title) || `进入策略 ${index + 1}`,
      summary: asString(raw.summary) || "待补充本条进入策略摘要。",
      fit:
        raw.fit === "primary" || raw.fit === "secondary" || raw.fit === "reject"
          ? raw.fit
          : "secondary",
      pros: normalizeStringArray(raw.pros),
      risks: normalizeStringArray(raw.risks),
    });
    return acc;
  }, []);
}

function normalizeReports(
  value: unknown,
): Array<{ id: string; title: string; summary: string }> {
  if (!Array.isArray(value)) return [];
  return value.reduce<Array<{ id: string; title: string; summary: string }>>(
    (acc, item, index) => {
      if (!item || typeof item !== "object") return acc;
      const raw = item as Record<string, unknown>;
      acc.push({
        id: asString(raw.id) || `report-${index + 1}`,
        title: asString(raw.title) || `市场报告 ${index + 1}`,
        summary: asString(raw.summary) || "待补充报告摘要。",
      });
      return acc;
    },
    [],
  );
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberOrFallback(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && Number.isFinite(Number(value))) return Number(value);
  return fallback;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clamp100(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}
