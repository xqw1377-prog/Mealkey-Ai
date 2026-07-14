/**
 * Founder Decision Snapshot
 *
 * Unified cross-agent context envelope shared by:
 * - M-MKT marketContext
 * - M-PNT positioningContext
 * - M-BIZ businessContext
 * - M-ED equityContext
 */

export type FounderMarketContext = {
  decisionId?: string;
  opportunityId?: string;
  city?: string;
  district?: string;
  category?: string;
  entryProbability?: number;
  finalJudgement?: string;
  handoffPayload?: Record<string, unknown>;
  updatedAt?: string;
};

export type FounderPositioningContext = {
  decisionId?: string;
  brandName?: string;
  category?: string;
  mentalPosition?: string;
  targetCustomers?: string;
  priceRange?: string;
  differentiation?: string;
  finalJudgement?: string;
  handoffPayload?: Record<string, unknown>;
  updatedAt?: string;
};

export type FounderBusinessContext = {
  decisionId?: string;
  modelHealthScore?: number;
  finalJudgement?: string;
  handoffPayload?: Record<string, unknown>;
  updatedAt?: string;
};

export type FounderEquityContext = {
  decisionId?: string;
  stage?: string;
  healthScore?: number;
  biggestRisk?: string;
  finalJudgement?: string;
  handoffPayload?: Record<string, unknown>;
  updatedAt?: string;
};

export type FounderDecisionSnapshot = {
  projectId?: string;
  marketContext?: FounderMarketContext;
  positioningContext?: FounderPositioningContext;
  businessContext?: FounderBusinessContext;
  equityContext?: FounderEquityContext;
};

export function getFounderDecisionSnapshot(
  profile: Record<string, unknown> | null | undefined,
): FounderDecisionSnapshot {
  const raw =
    profile?.founderDecisionSnapshot &&
    typeof profile.founderDecisionSnapshot === "object"
      ? (profile.founderDecisionSnapshot as Record<string, unknown>)
      : {};

  return {
    projectId: asString(raw.projectId),
    marketContext: asRecord(raw.marketContext) as FounderMarketContext | undefined,
    positioningContext: asRecord(raw.positioningContext) as FounderPositioningContext | undefined,
    businessContext: asRecord(raw.businessContext) as FounderBusinessContext | undefined,
    equityContext: asRecord(raw.equityContext) as FounderEquityContext | undefined,
  };
}

export function withFounderMarketContext(
  profile: Record<string, unknown>,
  context: FounderMarketContext,
  projectId?: string,
): Record<string, unknown> {
  const snapshot = getFounderDecisionSnapshot(profile);
  return {
    ...profile,
    founderDecisionSnapshot: {
      ...snapshot,
      projectId: snapshot.projectId || projectId,
      marketContext: {
        ...context,
        updatedAt: new Date().toISOString(),
      },
    },
  };
}

export function withFounderPositioningContext(
  profile: Record<string, unknown>,
  context: FounderPositioningContext,
  projectId?: string,
): Record<string, unknown> {
  const snapshot = getFounderDecisionSnapshot(profile);
  return {
    ...profile,
    founderDecisionSnapshot: {
      ...snapshot,
      projectId: snapshot.projectId || projectId,
      positioningContext: {
        ...context,
        updatedAt: new Date().toISOString(),
      },
    },
  };
}

export function withFounderBusinessContext(
  profile: Record<string, unknown>,
  context: FounderBusinessContext,
  projectId?: string,
): Record<string, unknown> {
  const snapshot = getFounderDecisionSnapshot(profile);
  return {
    ...profile,
    founderDecisionSnapshot: {
      ...snapshot,
      projectId: snapshot.projectId || projectId,
      businessContext: {
        ...context,
        updatedAt: new Date().toISOString(),
      },
    },
  };
}

export function withFounderEquityContext(
  profile: Record<string, unknown>,
  context: FounderEquityContext,
  projectId?: string,
): Record<string, unknown> {
  const snapshot = getFounderDecisionSnapshot(profile);
  return {
    ...profile,
    founderDecisionSnapshot: {
      ...snapshot,
      projectId: snapshot.projectId || projectId,
      equityContext: {
        ...context,
        updatedAt: new Date().toISOString(),
      },
    },
  };
}

export function getFounderPositioningSummary(
  profile: Record<string, unknown> | null | undefined,
  fallback?: {
    brandName?: string | null;
    category?: string | null;
    mentalPosition?: string | null;
  },
) {
  const snapshot = getFounderDecisionSnapshot(profile);
  const mPnt = asRecord(profile?.mPnt);
  const brandPositioning = asRecord(mPnt?.brandPositioning);

  return {
    decisionId: snapshot.positioningContext?.decisionId || asString(mPnt?.decisionId),
    brandName: pickString(
      snapshot.positioningContext?.brandName,
      asString(brandPositioning?.brandName),
      asString(profile?.brandName),
      fallback?.brandName ?? undefined,
    ),
    category: pickString(
      snapshot.positioningContext?.category,
      asString(brandPositioning?.category),
      asString(profile?.category),
      fallback?.category ?? undefined,
    ),
    mentalPosition: pickString(
      snapshot.positioningContext?.mentalPosition,
      asString(brandPositioning?.mentalPosition),
      asString(mPnt?.oneLiner),
      asString(profile?.positioning),
      fallback?.mentalPosition ?? undefined,
    ),
    oneLiner: pickString(
      snapshot.positioningContext?.finalJudgement,
      asString(mPnt?.oneLiner),
      asString(profile?.positioning),
      fallback?.mentalPosition ?? undefined,
    ),
    targetCustomers: pickString(
      snapshot.positioningContext?.targetCustomers,
      asString(brandPositioning?.targetCustomers),
      asString(profile?.targetCustomers),
    ),
    priceRange: pickString(
      snapshot.positioningContext?.priceRange,
      asString(brandPositioning?.priceRange),
      asString(profile?.priceRange),
    ),
    differentiation: pickString(
      snapshot.positioningContext?.differentiation,
      asString(brandPositioning?.differentiation),
      asString(profile?.differentiation),
    ),
    updatedAt: snapshot.positioningContext?.updatedAt || asString(mPnt?.updatedAt),
  };
}

export function getFounderMarketSummary(
  profile: Record<string, unknown> | null | undefined,
) {
  const snapshot = getFounderDecisionSnapshot(profile);
  const mMkt = asRecord(profile?.mMkt);
  const pageOutput = asRecord(mMkt?.pageOutput) || asRecord(mMkt?.page_output);
  const scores = asRecord(pageOutput?.scores);
  const health = asRecord(pageOutput?.health);

  return {
    decisionId: snapshot.marketContext?.decisionId || asString(mMkt?.decisionId),
    category: pickString(snapshot.marketContext?.category, asString(mMkt?.category)),
    city: pickString(snapshot.marketContext?.city, asString(pageOutput?.city)),
    district: pickString(snapshot.marketContext?.district, asString(pageOutput?.district)),
    entryProbability:
      snapshot.marketContext?.entryProbability || asNumber(scores?.entryProbability),
    biggestRisk: pickString(
      asString(health?.biggestRisk),
      asString(profile?.marketBiggestRisk),
    ),
    finalJudgement: pickString(
      snapshot.marketContext?.finalJudgement,
      asString(mMkt?.oneLiner),
      asString(profile?.marketJudgement),
    ),
    updatedAt: snapshot.marketContext?.updatedAt || asString(mMkt?.updatedAt),
  };
}

export function getFounderEquitySummary(
  profile: Record<string, unknown> | null | undefined,
) {
  const snapshot = getFounderDecisionSnapshot(profile);
  const mEd = asRecord(profile?.mEd);

  return {
    decisionId: snapshot.equityContext?.decisionId || asString(mEd?.decisionId),
    stage: pickString(
      snapshot.equityContext?.stage,
      asString(mEd?.stage),
      asString(profile?.equityStage),
    ),
    healthScore:
      snapshot.equityContext?.healthScore ||
      asNumber(profile?.equityHealthScore) ||
      asNumber(asRecord(mEd?.pageOutput)?.health && asRecord(asRecord(mEd?.pageOutput)?.health)?.score),
    biggestRisk: pickString(
      snapshot.equityContext?.biggestRisk,
      asString(profile?.equityBiggestRisk),
    ),
    finalJudgement: pickString(
      snapshot.equityContext?.finalJudgement,
      asString(mEd?.oneLiner),
    ),
    updatedAt: snapshot.equityContext?.updatedAt || asString(mEd?.updatedAt),
  };
}

export function getFounderBusinessSummary(
  profile: Record<string, unknown> | null | undefined,
) {
  const snapshot = getFounderDecisionSnapshot(profile);
  const mBiz = asRecord(profile?.mBiz);
  const pageOutput = asRecord(mBiz?.pageOutput);
  const dimensionScores = asRecord(pageOutput?.dimensionScores);

  const scoreValues = dimensionScores
    ? Object.values(dimensionScores)
        .map((item) => asNumber(asRecord(item)?.score))
        .filter((value): value is number => value != null)
    : [];

  const derivedHealthScore =
    scoreValues.length > 0
      ? Math.round((scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length / 5) * 100)
      : undefined;

  return {
    decisionId: snapshot.businessContext?.decisionId || asString(mBiz?.sessionId),
    modelHealthScore: snapshot.businessContext?.modelHealthScore || derivedHealthScore,
    finalJudgement: pickString(
      snapshot.businessContext?.finalJudgement,
      asString(mBiz?.oneLiner),
      asString(pageOutput?.reply),
    ),
    updatedAt: snapshot.businessContext?.updatedAt || asString(mBiz?.updatedAt),
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function pickString(...values: Array<string | undefined>): string | undefined {
  return values.find((value) => typeof value === "string" && value.trim());
}
