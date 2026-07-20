/**
 * Opportunity — profile.openOpportunities 读写
 */

import type {
  Opportunity,
  OpportunityStatus,
} from "../../contracts/opportunity-runtime";

export function listOpenOpportunities(
  profile: Record<string, unknown>,
): Opportunity[] {
  const raw = profile.openOpportunities;
  if (!Array.isArray(raw)) return [];
  return (raw as Opportunity[]).filter(
    (o) =>
      o &&
      o.id &&
      o.status !== "rejected" &&
      o.status !== "approved",
  );
}

export function upsertOpenOpportunity(
  profile: Record<string, unknown>,
  opportunity: Opportunity,
): Record<string, unknown> {
  const existing = Array.isArray(profile.openOpportunities)
    ? ([...profile.openOpportunities] as Opportunity[])
    : [];
  const idx = existing.findIndex(
    (o) => o.id === opportunity.id || o.title === opportunity.title,
  );
  if (idx >= 0) {
    existing[idx] = { ...existing[idx], ...opportunity };
  } else {
    existing.unshift(opportunity);
  }
  return {
    ...profile,
    openOpportunities: existing.slice(0, 20),
  };
}

export function updateOpportunityStatus(
  profile: Record<string, unknown>,
  opportunityId: string,
  status: OpportunityStatus,
): Record<string, unknown> {
  const existing = Array.isArray(profile.openOpportunities)
    ? (profile.openOpportunities as Opportunity[])
    : [];
  return {
    ...profile,
    openOpportunities: existing.map((o) =>
      o.id === opportunityId ? { ...o, status } : o,
    ),
  };
}

export function mergeOpportunitiesIntoProfile(
  profile: Record<string, unknown>,
  opportunities: Opportunity[],
): Record<string, unknown> {
  let next = profile;
  for (const opp of opportunities) {
    next = upsertOpenOpportunity(next, opp);
  }
  return next;
}
