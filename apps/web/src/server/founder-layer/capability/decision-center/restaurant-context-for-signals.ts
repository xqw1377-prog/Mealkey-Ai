/**
 * 从 profile / Brain 摘要投影 SignalAnalyzeInput.restaurantContext
 */

export type RadarRestaurantContextV1 = {
  brandName?: string;
  stageLabel?: string;
  peakDaypart?: string;
  dnaHints?: string[];
};

export function extractRestaurantContextForSignals(input: {
  restaurantName?: string | null;
  brandName?: string | null;
  stageLabel?: string | null;
  profile?: Record<string, unknown> | null;
}): RadarRestaurantContextV1 {
  const profile = input.profile || {};
  const bi =
    profile.businessIdentity && typeof profile.businessIdentity === "object"
      ? (profile.businessIdentity as Record<string, unknown>)
      : {};
  const rip =
    profile.restaurantIntelligenceProfile &&
    typeof profile.restaurantIntelligenceProfile === "object"
      ? (profile.restaurantIntelligenceProfile as Record<string, unknown>)
      : {};
  const snapshot =
    rip.snapshot && typeof rip.snapshot === "object"
      ? (rip.snapshot as Record<string, unknown>)
      : rip;

  const dnaHints: string[] = [];
  const push = (v: unknown) => {
    if (typeof v === "string" && v.trim().length >= 2) {
      dnaHints.push(v.trim().slice(0, 40));
    }
  };
  push(bi.category || profile.category);
  push(bi.brandPositioning || bi.positioning);
  push(bi.targetCustomer);
  push(snapshot.positioningLine || snapshot.brandClaim);
  if (Array.isArray(snapshot.keywords)) {
    for (const k of snapshot.keywords.slice(0, 3)) push(k);
  }

  const peakRaw =
    bi.peakDaypart ||
    bi.mainDaypart ||
    snapshot.peakDaypart ||
    profile.peakDaypart;
  const peakDaypart =
    typeof peakRaw === "string" && peakRaw.trim()
      ? peakRaw.trim()
      : /晚|晚餐|dinner/i.test(String(bi.biggestProblem || ""))
        ? "晚市"
        : undefined;

  return {
    brandName:
      (typeof bi.brandName === "string" && bi.brandName) ||
      input.brandName ||
      input.restaurantName ||
      undefined,
    stageLabel: input.stageLabel || undefined,
    peakDaypart,
    dnaHints: [...new Set(dnaHints)].slice(0, 6),
  };
}
