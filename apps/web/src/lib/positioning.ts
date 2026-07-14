/**
 * Shared positioning snapshot types — used by service, API, and UI cards.
 */

export type PositioningBrandCard = {
  brandName?: string;
  category?: string;
  targetCustomers?: string;
  priceRange?: string;
  differentiation?: string;
  brandTonality?: string;
  mentalPosition?: string;
};

export type PositioningRisk = {
  risk?: string;
  level?: string;
  code?: string;
  mitigation?: string;
};

export type PositioningNextStep = {
  step?: string;
  priority?: string;
  timeline?: string;
};

export type PositioningTheoryVoteItem = {
  preferred?: string;
  theory_recommend?: string;
};

export type PositioningCandidate = {
  id?: string;
  title?: string;
  name?: string;
  direction?: string;
  positioning?: string;
  fit?: string;
  scenario?: string;
  why?: string;
  reason?: string;
  risk?: string;
  tag?: string;
};

export type PositioningMSolution = {
  situation?: string;
  insight?: string;
  position?: string;
  strategy?: string;
  action?: string;
  validation?: string;
  decision?: string;
};

export type PositioningSnapshot = {
  decisionId?: string;
  oneLiner: string;
  problem: string;
  observation: string;
  diagnosis: string;
  strategy: string;
  action: string;
  confidence: number;
  decision_recommend?: string;
  brandPositioning?: PositioningBrandCard;
  risks?: PositioningRisk[];
  nextSteps?: PositioningNextStep[];
  validation?: {
    day30?: string[];
    day90?: string[];
    killCriteria?: string[];
  };
  theoryVoteSummary?: Record<string, PositioningTheoryVoteItem>;
  mSolution?: PositioningMSolution;
  overallScore?: number;
  mindPositionLevel?: string;
  maxRiskSeverity?: string;
  candidates?: PositioningCandidate[];
  crossFireGameSummary?: string;
  updatedAt?: string;
  source?: "m-pnt" | "profile" | "decision";
};

export function buildPositioningSnapshot(input: {
  decisionId?: string;
  problem?: string;
  observation?: string;
  diagnosis?: string;
  judgement?: string;
  strategy?: string;
  action?: string;
  confidence?: number;
  structured?: Record<string, unknown> | null;
  source?: PositioningSnapshot["source"];
  updatedAt?: string;
}): PositioningSnapshot {
  const s = input.structured || {};
  const pageOutput =
    (typeof s.pageOutput === "object" && s.pageOutput
      ? s.pageOutput
      : typeof s.page_output === "object" && s.page_output
        ? s.page_output
        : s) as Record<string, unknown>;
  const bp = ((s.brandPositioning || pageOutput.brandPositioning || {
    brandName: pageOutput.brand_name || pageOutput.brandName,
    category: pageOutput.category,
    targetCustomers: pageOutput.target_customers,
    priceRange: pageOutput.price_range,
    differentiation: pageOutput.differentiation,
    brandTonality: pageOutput.brand_tonality,
    mentalPosition: pageOutput.mental_position,
  }) || {}) as PositioningBrandCard;
  const nextStepsSource = (s.nextSteps || pageOutput.next_steps || []) as unknown;
  const risksSource = (s.risks || pageOutput.risks || []) as unknown;
  const validationSource = (s.validation || pageOutput.validation || undefined) as PositioningSnapshot["validation"];
  const theoryVoteSource = (s.theory_vote_summary ||
    s.theoryVoteSummary ||
    pageOutput.theory_vote_summary ||
    undefined) as PositioningSnapshot["theoryVoteSummary"];
  const mSolutionSource = (s.mSolution ||
    s.m_solution ||
    pageOutput.mSolution ||
    pageOutput.m_solution ||
    undefined) as PositioningSnapshot["mSolution"];
  const candidatesSource = (pageOutput.candidates || s.candidates || []) as unknown;
  return {
    decisionId: input.decisionId,
    oneLiner:
      input.judgement ||
      (pageOutput.summary ? String(pageOutput.summary) : "") ||
      bp.mentalPosition ||
      "定位结论待形成",
    problem: input.problem || "品牌定位策略",
    observation: input.observation || "",
    diagnosis: input.diagnosis || "",
    strategy: input.strategy || "",
    action: input.action || "",
    confidence: clamp01(input.confidence ?? numberOrUndefined(pageOutput.overall_score) ?? 0.7),
    decision_recommend: s.decision_recommend || pageOutput.decision_recommend
      ? String(s.decision_recommend || pageOutput.decision_recommend)
      : undefined,
    brandPositioning: {
      brandName: bp.brandName
        ? String(bp.brandName)
        : pageOutput.brand_name
          ? String(pageOutput.brand_name)
          : pageOutput.brandName
            ? String(pageOutput.brandName)
            : undefined,
      category: bp.category ? String(bp.category) : pageOutput.category ? String(pageOutput.category) : undefined,
      targetCustomers: bp.targetCustomers
        ? String(bp.targetCustomers)
        : pageOutput.target_customers
          ? String(pageOutput.target_customers)
        : undefined,
      priceRange: bp.priceRange ? String(bp.priceRange) : pageOutput.price_range ? String(pageOutput.price_range) : undefined,
      differentiation: bp.differentiation
        ? String(bp.differentiation)
        : pageOutput.differentiation
          ? String(pageOutput.differentiation)
        : undefined,
      brandTonality: bp.brandTonality ? String(bp.brandTonality) : pageOutput.brand_tonality ? String(pageOutput.brand_tonality) : undefined,
      mentalPosition: bp.mentalPosition
        ? String(bp.mentalPosition)
        : pageOutput.mental_position
          ? String(pageOutput.mental_position)
        : input.judgement,
    },
    risks: normalizeRiskList(risksSource),
    nextSteps: normalizeNextSteps(nextStepsSource),
    validation: normalizeValidation(validationSource),
    theoryVoteSummary: theoryVoteSource,
    mSolution: mSolutionSource,
    overallScore: numberOrUndefined(pageOutput.overall_score),
    mindPositionLevel: pageOutput.mind_position_level ? String(pageOutput.mind_position_level) : undefined,
    maxRiskSeverity: pageOutput.max_risk_severity ? String(pageOutput.max_risk_severity) : undefined,
    candidates: normalizeCandidates(candidatesSource),
    crossFireGameSummary: pageOutput.cross_fire_game_summary
      ? String(pageOutput.cross_fire_game_summary)
      : undefined,
    updatedAt: input.updatedAt || new Date().toISOString(),
    source: input.source || "m-pnt",
  };
}

export function snapshotFromProjectProfile(
  profile: Record<string, unknown> | null | undefined,
  projectTarget?: string | null,
): PositioningSnapshot | null {
  if (!profile && !projectTarget) return null;
  const mPnt = (profile?.mPnt || null) as Record<string, unknown> | null;
  if (mPnt && (mPnt.oneLiner || mPnt.judgement)) {
    return buildPositioningSnapshot({
      judgement: String(mPnt.oneLiner || mPnt.judgement || ""),
      problem: String(mPnt.problem || "品牌定位策略"),
      observation: String(mPnt.observation || ""),
      diagnosis: String(mPnt.diagnosis || ""),
      strategy: String(mPnt.strategy || ""),
      action: String(mPnt.action || ""),
      confidence: Number(mPnt.confidence ?? 0.7),
      structured: {
        pageOutput: mPnt.pageOutput || mPnt.page_output,
        decision_recommend: mPnt.decision_recommend,
        brandPositioning: mPnt.brandPositioning || {
          brandName: profile?.brandName,
          category: profile?.category,
          targetCustomers: profile?.targetCustomers,
          priceRange: profile?.priceRange,
          differentiation: profile?.differentiation,
          brandTonality: profile?.brandTonality,
          mentalPosition: profile?.mentalPosition || mPnt.oneLiner,
        },
        risks: mPnt.risks,
        nextSteps: mPnt.nextSteps,
        validation: mPnt.validation,
      },
      source: "profile",
      updatedAt: mPnt.updatedAt ? String(mPnt.updatedAt) : undefined,
    });
  }

  const oneLiner =
    (typeof profile?.positioning === "string" && profile.positioning) ||
    (typeof profile?.mentalPosition === "string" && profile.mentalPosition) ||
    projectTarget ||
    null;
  if (!oneLiner) return null;

  return buildPositioningSnapshot({
    judgement: oneLiner,
    strategy:
      (typeof profile?.differentiation === "string" && profile.differentiation) ||
      "",
    action: "",
    confidence: 0.6,
    structured: {
      brandPositioning: {
        brandName:
          typeof profile?.brandName === "string" ? profile.brandName : undefined,
        category:
          typeof profile?.category === "string" ? profile.category : undefined,
        targetCustomers:
          typeof profile?.targetCustomers === "string"
            ? profile.targetCustomers
            : undefined,
        priceRange:
          typeof profile?.priceRange === "string" ? profile.priceRange : undefined,
        differentiation:
          typeof profile?.differentiation === "string"
            ? profile.differentiation
            : undefined,
        brandTonality:
          typeof profile?.brandTonality === "string"
            ? profile.brandTonality
            : undefined,
        mentalPosition: oneLiner,
      },
    },
    source: "profile",
  });
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0.5;
  const v = n > 1 ? n / 100 : n;
  return Math.max(0, Math.min(1, v));
}

function numberOrUndefined(value: unknown): number | undefined {
  if (typeof value === "number" && !Number.isNaN(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

function normalizeRiskList(value: unknown): PositioningRisk[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<PositioningRisk[]>((acc, item) => {
    if (!item || typeof item !== "object") return acc;
    const obj = item as Record<string, unknown>;
    acc.push({
      risk: obj.risk ? String(obj.risk) : obj.title ? String(obj.title) : undefined,
      level: obj.level ? String(obj.level) : obj.severity ? String(obj.severity) : undefined,
      code: obj.code ? String(obj.code) : undefined,
      mitigation: obj.mitigation ? String(obj.mitigation) : undefined,
    });
    return acc;
  }, []);
}

function normalizeNextSteps(value: unknown): PositioningNextStep[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<PositioningNextStep[]>((acc, item) => {
    if (typeof item === "string") {
      acc.push({ step: item });
      return acc;
    }
    if (!item || typeof item !== "object") return acc;
    const obj = item as Record<string, unknown>;
    acc.push({
      step: obj.step ? String(obj.step) : obj.title ? String(obj.title) : undefined,
      priority: obj.priority ? String(obj.priority) : undefined,
      timeline: obj.timeline ? String(obj.timeline) : undefined,
    });
    return acc;
  }, []);
}

function normalizeValidation(
  value: PositioningSnapshot["validation"] | Record<string, unknown> | undefined,
): PositioningSnapshot["validation"] {
  if (!value || typeof value !== "object") return undefined;
  return {
    day30: Array.isArray(value.day30) ? value.day30.map((item) => String(item)) : [],
    day90: Array.isArray(value.day90) ? value.day90.map((item) => String(item)) : [],
    killCriteria: Array.isArray(value.killCriteria)
      ? value.killCriteria.map((item) => String(item))
      : Array.isArray((value as Record<string, unknown>).kill_criteria)
        ? ((value as Record<string, unknown>).kill_criteria as unknown[]).map((item) => String(item))
        : [],
  };
}

function normalizeCandidates(value: unknown): PositioningCandidate[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<PositioningCandidate[]>((acc, item) => {
    if (!item || typeof item !== "object") return acc;
    acc.push(item as PositioningCandidate);
    return acc;
  }, []);
}

// ─── Diff ────────────────────────────────────────────────────────────────────

export type PositioningFieldChange = {
  field: string;
  label: string;
  before: string;
  after: string;
  changed: boolean;
};

export type PositioningDiff = {
  hasChanges: boolean;
  changedCount: number;
  fields: PositioningFieldChange[];
  confidenceDelta: number;
  summary: string;
};

const DIFF_FIELDS: Array<{
  field: string;
  label: string;
  pick: (s: PositioningSnapshot) => string;
}> = [
  { field: "oneLiner", label: "一句话定位", pick: (s) => s.oneLiner || "" },
  {
    field: "mentalPosition",
    label: "心智位置",
    pick: (s) => s.brandPositioning?.mentalPosition || s.oneLiner || "",
  },
  {
    field: "brandName",
    label: "品牌名",
    pick: (s) => s.brandPositioning?.brandName || "",
  },
  {
    field: "category",
    label: "品类",
    pick: (s) => s.brandPositioning?.category || "",
  },
  {
    field: "targetCustomers",
    label: "目标客群",
    pick: (s) => s.brandPositioning?.targetCustomers || "",
  },
  {
    field: "priceRange",
    label: "价格带",
    pick: (s) => s.brandPositioning?.priceRange || "",
  },
  {
    field: "differentiation",
    label: "差异化",
    pick: (s) =>
      s.brandPositioning?.differentiation || s.strategy || "",
  },
  {
    field: "brandTonality",
    label: "品牌调性",
    pick: (s) => s.brandPositioning?.brandTonality || "",
  },
  { field: "strategy", label: "策略", pick: (s) => s.strategy || "" },
  { field: "action", label: "行动", pick: (s) => s.action || "" },
  {
    field: "decision_recommend",
    label: "推荐等级",
    pick: (s) => s.decision_recommend || "",
  },
];

/** Compare two positioning snapshots field-by-field. */
export function diffPositioningSnapshots(
  before: PositioningSnapshot | null | undefined,
  after: PositioningSnapshot | null | undefined,
): PositioningDiff | null {
  if (!after) return null;
  if (!before) {
    return {
      hasChanges: true,
      changedCount: 1,
      fields: [],
      confidenceDelta: after.confidence,
      summary: "首次形成定位结论",
    };
  }

  const fields: PositioningFieldChange[] = DIFF_FIELDS.map((def) => {
    const b = normalizeText(def.pick(before));
    const a = normalizeText(def.pick(after));
    return {
      field: def.field,
      label: def.label,
      before: b || "—",
      after: a || "—",
      changed: b !== a && (Boolean(b) || Boolean(a)),
    };
  });

  const changed = fields.filter((f) => f.changed);
  const confidenceDelta = Number(
    (after.confidence - before.confidence).toFixed(3),
  );

  let summary: string;
  if (changed.length === 0) {
    summary =
      confidenceDelta === 0
        ? "定位结论无实质变化"
        : `定位结论未改，信心${confidenceDelta > 0 ? "上升" : "下降"} ${Math.abs(Math.round(confidenceDelta * 100))} 分`;
  } else if (changed.some((f) => f.field === "oneLiner" || f.field === "mentalPosition")) {
    summary = `核心定位已调整：${changed
      .filter((f) => f.field === "oneLiner" || f.field === "mentalPosition")
      .map((f) => f.label)
      .join("、")}${changed.length > 2 ? ` 等 ${changed.length} 项` : ""}`;
  } else {
    summary = `更新了 ${changed.map((f) => f.label).slice(0, 3).join("、")}${changed.length > 3 ? ` 等 ${changed.length} 项` : ""}`;
  }

  return {
    hasChanges: changed.length > 0 || confidenceDelta !== 0,
    changedCount: changed.length,
    fields,
    confidenceDelta,
    summary,
  };
}

/** Rebuild snapshot from stored profile.mPnt / mPntPrevious blob */
export function snapshotFromMPntBlob(
  blob: Record<string, unknown> | null | undefined,
  source: PositioningSnapshot["source"] = "profile",
): PositioningSnapshot | null {
  if (!blob) return null;
  if (!blob.oneLiner && !blob.judgement) return null;
  return buildPositioningSnapshot({
    decisionId: blob.decisionId ? String(blob.decisionId) : undefined,
    judgement: String(blob.oneLiner || blob.judgement || ""),
    problem: String(blob.problem || "品牌定位策略"),
    observation: String(blob.observation || ""),
    diagnosis: String(blob.diagnosis || ""),
    strategy: String(blob.strategy || ""),
    action: String(blob.action || ""),
    confidence: Number(blob.confidence ?? 0.7),
    structured: {
      decision_recommend: blob.decision_recommend,
      brandPositioning: blob.brandPositioning,
      risks: blob.risks,
      nextSteps: blob.nextSteps,
      validation: blob.validation,
      theory_vote_summary: blob.theory_vote_summary,
      mSolution: blob.mSolution,
      pageOutput: blob.pageOutput || blob.page_output,
    },
    source,
    updatedAt: blob.updatedAt ? String(blob.updatedAt) : undefined,
  });
}

function normalizeText(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}
