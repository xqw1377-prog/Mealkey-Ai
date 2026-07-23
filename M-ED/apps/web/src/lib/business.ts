export type BizDimensionScore = {
  score: number;
  summary: string;
};

export type BizFactNode = {
  nodeId: string;
  category: string;
  statement: string;
  confidence: number;
  source: string;
  needsVerification: boolean;
  verificationStatus: string;
  followUpQuestions: string[];
  createdAt?: string;
};

export type BizRuleJudgment = {
  ruleId: string;
  domain: string;
  inputFactIds: string[];
  conclusion: string;
  confidence: number;
  severity: string;
};

export type BizStrategicSuggestion = {
  suggestionId: string;
  priority: string;
  dimension: string;
  action: string;
  expectedImpact?: string;
  verificationAction?: string;
  estimatedVerificationPeriod?: string;
};

export type BizVerificationTask = {
  taskId: string;
  sourceSuggestionId: string;
  dimension: string;
  verificationAction: string;
  estimatedPeriod?: string;
  status: string;
  createdAt?: string;
  deadline?: string | null;
  reminderSchedule: string[];
};

export type BizPageOutput = {
  sessionId: string;
  status: string;
  currentLayer: string;
  reply: string;
  progress: number;
  pendingQuestions: string[];
  factNodes: BizFactNode[];
  dimensionScores?: Record<string, BizDimensionScore>;
  ruleJudgments: BizRuleJudgment[];
  suggestions: BizStrategicSuggestion[];
  verificationTasks: BizVerificationTask[];
};

export type BusinessSnapshot = {
  sessionId?: string;
  oneLiner: string;
  problem: string;
  observation: string;
  diagnosis: string;
  strategy: string;
  action: string;
  confidence: number;
  pageOutput: BizPageOutput;
  updatedAt?: string;
  source?: "m-biz" | "profile";
};

export function buildBusinessSnapshotFromChat(args: {
  message: string;
  response: {
    sessionId: string;
    status: string;
    currentLayer: string;
    reply: string;
    progress: number;
    pendingQuestions?: string[];
    factNodes?: BizFactNode[];
    dimensionScores?: Record<string, BizDimensionScore>;
    ruleJudgments?: BizRuleJudgment[];
    suggestions?: BizStrategicSuggestion[];
    verificationTasks?: BizVerificationTask[];
  };
  source?: "m-biz" | "profile";
  updatedAt?: string;
}): BusinessSnapshot {
  const dimensionScores = args.response.dimensionScores;
  const firstJudgment = args.response.ruleJudgments?.[0];
  const firstSuggestion = args.response.suggestions?.[0];
  const firstTask = args.response.verificationTasks?.[0];
  const averageScore =
    dimensionScores && Object.keys(dimensionScores).length > 0
      ? Object.values(dimensionScores).reduce((sum, item) => sum + item.score, 0) /
        Object.keys(dimensionScores).length /
        5
      : Math.max(0.2, Math.min(1, args.response.progress || 0));

  return {
    sessionId: args.response.sessionId,
    oneLiner: args.response.reply,
    problem: args.message,
    observation:
      firstJudgment?.conclusion ||
      args.response.pendingQuestions?.[0] ||
      args.response.reply,
    diagnosis:
      firstSuggestion?.expectedImpact ||
      firstJudgment?.conclusion ||
      args.response.reply,
    strategy: firstSuggestion?.action || args.response.reply,
    action:
      firstTask?.verificationAction ||
      firstSuggestion?.verificationAction ||
      args.response.pendingQuestions?.[0] ||
      "继续补充商业模式关键事实",
    confidence: Number(averageScore.toFixed(2)),
    pageOutput: {
      sessionId: args.response.sessionId,
      status: args.response.status,
      currentLayer: args.response.currentLayer,
      reply: args.response.reply,
      progress: args.response.progress,
      pendingQuestions: args.response.pendingQuestions ?? [],
      factNodes: args.response.factNodes ?? [],
      dimensionScores,
      ruleJudgments: args.response.ruleJudgments ?? [],
      suggestions: args.response.suggestions ?? [],
      verificationTasks: args.response.verificationTasks ?? [],
    },
    updatedAt: args.updatedAt,
    source: args.source ?? "m-biz",
  };
}

export function snapshotFromProjectBusinessProfile(
  profile: Record<string, unknown> | null | undefined,
): BusinessSnapshot | null {
  const raw =
    profile?.mBiz && typeof profile.mBiz === "object"
      ? (profile.mBiz as Record<string, unknown>)
      : null;
  if (!raw) return null;

  const pageOutput =
    raw.pageOutput && typeof raw.pageOutput === "object"
      ? (raw.pageOutput as Record<string, unknown>)
      : null;
  if (!pageOutput) return null;

  return {
    sessionId: asString(raw.sessionId) || asString(pageOutput.sessionId),
    oneLiner: asString(raw.oneLiner) || asString(pageOutput.reply) || "商业模式判断已生成",
    problem: asString(raw.problem) || "",
    observation: asString(raw.observation) || "",
    diagnosis: asString(raw.diagnosis) || "",
    strategy: asString(raw.strategy) || "",
    action: asString(raw.action) || "",
    confidence: asNumber(raw.confidence) || 0,
    pageOutput: {
      sessionId: asString(pageOutput.sessionId) || "",
      status: asString(pageOutput.status) || "idle",
      currentLayer: asString(pageOutput.currentLayer) || "L1",
      reply: asString(pageOutput.reply) || "",
      progress: asNumber(pageOutput.progress) || 0,
      pendingQuestions: asStringArray(pageOutput.pendingQuestions),
      factNodes: asObjectArray(pageOutput.factNodes) as BizFactNode[],
      dimensionScores: asRecordOfScores(pageOutput.dimensionScores),
      ruleJudgments: asObjectArray(pageOutput.ruleJudgments) as BizRuleJudgment[],
      suggestions: asObjectArray(pageOutput.suggestions) as BizStrategicSuggestion[],
      verificationTasks: asObjectArray(pageOutput.verificationTasks) as BizVerificationTask[],
    },
    updatedAt: asString(raw.updatedAt),
    source: "profile",
  };
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asObjectArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    : [];
}

function asRecordOfScores(
  value: unknown,
): Record<string, BizDimensionScore> | undefined {
  if (!value || typeof value !== "object") return undefined;

  const result: Record<string, BizDimensionScore> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    if (!item || typeof item !== "object") continue;
    const score = asNumber((item as Record<string, unknown>).score);
    const summary = asString((item as Record<string, unknown>).summary);
    if (score == null || !summary) continue;
    result[key] = { score, summary };
  }

  return Object.keys(result).length > 0 ? result : undefined;
}
