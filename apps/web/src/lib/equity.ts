/**
 * Shared equity snapshot types — used by service, API, and UI pages.
 */

export type EquityHealth = {
  score: number;
  control: number;
  fundingSafety: number;
  incentiveRoom: number;
  biggestRisk: string;
};

export type EquityFounder = {
  name: string;
  role: string;
  equity: number;
  responsibility?: string;
};

export type EquityCapTableItem = {
  label: string;
  equity: number;
};

export type EquityScenarioCapTable = {
  before: EquityCapTableItem[];
  after: EquityCapTableItem[];
};

export type EquityInvestor = {
  name: string;
  equity: number;
};

export type EquityProfile = {
  founders: EquityFounder[];
  capTable: EquityCapTableItem[];
  optionPool?: number;
  investors?: EquityInvestor[];
};

export type EquityScenario = {
  id: string;
  title: string;
  summary: string;
  founderEquityChange?: string;
  controlScore?: number;
  dilutionImpact?: string;
  capTable?: EquityScenarioCapTable;
  highlights: string[];
  risks: string[];
  recommendation?: "primary" | "secondary" | "reject";
};

export type EquityCommitteeOpinion = {
  role: string;
  opinion: string;
  concern?: string;
};

export type EquityFinalDecision = {
  judgement: string;
  reasoning: string[];
  risks: string[];
  actions: string[];
};

export type EquitySimulationInputs = {
  scenarioMode?: "baseline" | "funding" | "partner" | "option_pool";
  fundingAmountWan?: number;
  optionPoolTarget?: number;
  newPartnerCount?: number;
};

export type EquityPageOutput = {
  topic: string;
  stage: string;
  health: EquityHealth;
  profile: EquityProfile;
  simulationInputs?: EquitySimulationInputs;
  scenarios: EquityScenario[];
  committee?: EquityCommitteeOpinion[];
  finalDecision: EquityFinalDecision;
  reports?: Array<{
    id: string;
    title: string;
    summary: string;
  }>;
};

export type EquitySnapshot = {
  decisionId?: string;
  oneLiner: string;
  stage: string;
  problem: string;
  observation: string;
  diagnosis: string;
  strategy: string;
  action: string;
  confidence: number;
  pageOutput: EquityPageOutput;
  /** 透传引擎元数据（含 provider: external | heuristic） */
  structured?: Record<string, unknown> | null;
  updatedAt?: string;
  source?: "m-ed" | "profile" | "decision";
};

export function buildEquitySnapshot(input: {
  decisionId?: string;
  problem?: string;
  observation?: string;
  diagnosis?: string;
  judgement?: string;
  strategy?: string;
  action?: string;
  confidence?: number;
  structured?: Record<string, unknown> | null;
  source?: EquitySnapshot["source"];
  updatedAt?: string;
}): EquitySnapshot {
  const structured = input.structured || {};
  const pageOutput = normalizePageOutput(
    (structured.pageOutput ||
      structured.page_output ||
      structured) as Record<string, unknown>,
  );

  return {
    decisionId: input.decisionId,
    oneLiner:
      input.judgement || pageOutput.finalDecision.judgement || "股权主判断待形成",
    stage: pageOutput.stage || "筹备期",
    problem: input.problem || "股权结构决策",
    observation: input.observation || "",
    diagnosis: input.diagnosis || "",
    strategy: input.strategy || "",
    action: input.action || "",
    confidence: clamp01(input.confidence ?? 0.72),
    pageOutput,
    structured: input.structured || null,
    updatedAt: input.updatedAt || new Date().toISOString(),
    source: input.source || "m-ed",
  };
}

export function snapshotFromMEDBlob(
  blob: Record<string, unknown> | null | undefined,
  source: EquitySnapshot["source"] = "profile",
): EquitySnapshot | null {
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
    asString(
      ((pageOutput.finalDecision || {}) as Record<string, unknown>).judgement,
    );

  if (!judgement && !pageOutput.health && !pageOutput.profile && !pageOutput.scenarios) {
    return null;
  }

  return buildEquitySnapshot({
    decisionId: asString(blob.decisionId) || undefined,
    judgement: judgement || "股权主判断待形成",
    problem: asString(blob.problem) || "股权结构决策",
    observation: asString(blob.observation) || "",
    diagnosis: asString(blob.diagnosis) || "",
    strategy: asString(blob.strategy) || "",
    action: asString(blob.action) || "",
    confidence: numberOrFallback(blob.confidence, 0.72),
    structured: { pageOutput },
    updatedAt: asString(blob.updatedAt) || undefined,
    source,
  });
}

export function snapshotFromProjectEquityProfile(
  profile: Record<string, unknown> | null | undefined,
): EquitySnapshot | null {
  if (!profile) return null;
  const mEd = (profile.mEd || null) as Record<string, unknown> | null;
  if (mEd) {
    return snapshotFromMEDBlob(mEd, "profile");
  }
  return null;
}

function normalizePageOutput(raw: Record<string, unknown>): EquityPageOutput {
  const finalDecisionRaw = asRecord(raw.finalDecision);
  const profileRaw = asRecord(raw.profile);
  const healthRaw = asRecord(raw.health);
  const simulationInputsRaw = asRecord(raw.simulationInputs);

  return {
    topic: asString(raw.topic) || "股权结构优化",
    stage: asString(raw.stage) || "筹备期",
    health: {
      score: clamp100(numberOrFallback(healthRaw.score, 72)),
      control: clamp100(numberOrFallback(healthRaw.control, 75)),
      fundingSafety: clamp100(numberOrFallback(healthRaw.fundingSafety, 70)),
      incentiveRoom: clamp100(numberOrFallback(healthRaw.incentiveRoom, 68)),
      biggestRisk:
        asString(healthRaw.biggestRisk) || "当前结构仍需明确控制权与激励边界",
    },
    profile: {
      founders: normalizeFounders(profileRaw.founders),
      capTable: normalizeCapTable(profileRaw.capTable),
      optionPool:
        typeof profileRaw.optionPool === "number"
          ? profileRaw.optionPool
          : typeof profileRaw.optionPool === "string"
            ? Number(profileRaw.optionPool)
            : undefined,
      investors: normalizeInvestors(profileRaw.investors),
    },
    simulationInputs: {
      scenarioMode: isScenarioMode(simulationInputsRaw.scenarioMode)
        ? simulationInputsRaw.scenarioMode
        : undefined,
      fundingAmountWan: normalizeOptionalNumber(simulationInputsRaw.fundingAmountWan),
      optionPoolTarget: normalizeOptionalNumber(simulationInputsRaw.optionPoolTarget),
      newPartnerCount: normalizeOptionalNumber(simulationInputsRaw.newPartnerCount),
    },
    scenarios: normalizeScenarios(raw.scenarios),
    committee: normalizeCommittee(raw.committee),
    finalDecision: {
      judgement:
        asString(finalDecisionRaw.judgement) || "建议先保证创始控制权，再保留后续激励空间。",
      reasoning: normalizeStringArray(finalDecisionRaw.reasoning),
      risks: normalizeStringArray(finalDecisionRaw.risks),
      actions: normalizeStringArray(finalDecisionRaw.actions),
    },
    reports: normalizeReports(raw.reports),
  };
}

function normalizeFounders(value: unknown): EquityFounder[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<EquityFounder[]>((acc, item, index) => {
    if (!item || typeof item !== "object") return acc;
    const raw = item as Record<string, unknown>;
    acc.push({
      name: asString(raw.name) || `创始成员 ${index + 1}`,
      role: asString(raw.role) || "创始人",
      equity: clamp100(numberOrFallback(raw.equity, 0)),
      responsibility: asString(raw.responsibility) || undefined,
    });
    return acc;
  }, []);
}

function normalizeCapTable(value: unknown): EquityCapTableItem[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<EquityCapTableItem[]>((acc, item, index) => {
    if (!item || typeof item !== "object") return acc;
    const raw = item as Record<string, unknown>;
    acc.push({
      label: asString(raw.label) || `权益项 ${index + 1}`,
      equity: clamp100(numberOrFallback(raw.equity, 0)),
    });
    return acc;
  }, []);
}

function normalizeInvestors(value: unknown): EquityInvestor[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<EquityInvestor[]>((acc, item, index) => {
    if (!item || typeof item !== "object") return acc;
    const raw = item as Record<string, unknown>;
    acc.push({
      name: asString(raw.name) || `投资方 ${index + 1}`,
      equity: clamp100(numberOrFallback(raw.equity, 0)),
    });
    return acc;
  }, []);
}

function normalizeScenarios(value: unknown): EquityScenario[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<EquityScenario[]>((acc, item, index) => {
    if (!item || typeof item !== "object") return acc;
    const raw = item as Record<string, unknown>;
    acc.push({
      id: asString(raw.id) || `scenario-${index + 1}`,
      title: asString(raw.title) || `方案 ${index + 1}`,
      summary: asString(raw.summary) || "待补方案摘要",
      founderEquityChange: asString(raw.founderEquityChange) || undefined,
      controlScore:
        typeof raw.controlScore === "number"
          ? clamp100(raw.controlScore)
          : typeof raw.controlScore === "string"
            ? clamp100(Number(raw.controlScore))
            : undefined,
      dilutionImpact: asString(raw.dilutionImpact) || undefined,
      capTable: normalizeScenarioCapTable(raw.capTable),
      highlights: normalizeStringArray(raw.highlights),
      risks: normalizeStringArray(raw.risks),
      recommendation: isRecommendation(raw.recommendation)
        ? raw.recommendation
        : undefined,
    });
    return acc;
  }, []);
}

function normalizeCommittee(value: unknown): EquityCommitteeOpinion[] {
  if (!Array.isArray(value)) return [];
  return value.reduce<EquityCommitteeOpinion[]>((acc, item) => {
    if (!item || typeof item !== "object") return acc;
    const raw = item as Record<string, unknown>;
    const role = asString(raw.role);
    const opinion = asString(raw.opinion);
    if (!role || !opinion) return acc;
    acc.push({
      role,
      opinion,
      concern: asString(raw.concern) || undefined,
    });
    return acc;
  }, []);
}

function normalizeScenarioCapTable(value: unknown): EquityScenarioCapTable | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const before = normalizeCapTable(raw.before);
  const after = normalizeCapTable(raw.after);
  if (before.length === 0 && after.length === 0) return undefined;
  return { before, after };
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
        title: asString(raw.title) || `报告 ${index + 1}`,
        summary: asString(raw.summary) || "",
      });
      return acc;
    },
    [],
  );
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clamp100(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function numberOrFallback(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeOptionalNumber(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function isRecommendation(
  value: unknown,
): value is EquityScenario["recommendation"] {
  return value === "primary" || value === "secondary" || value === "reject";
}

function isScenarioMode(
  value: unknown,
): value is EquitySimulationInputs["scenarioMode"] {
  return (
    value === "baseline" ||
    value === "funding" ||
    value === "partner" ||
    value === "option_pool"
  );
}
