/**
 * 四 Agent 共享：信息采集内核（对齐 M-PNT）
 * Round A 固定 must → Round B 自适应追问 → 工具/调研补全 → 清单门禁
 */

export type IntakeSource = "fixed" | "adaptive" | "research_tool";

export type IntakeFieldDef = {
  key: string;
  label: string;
  prompt: string;
  placeholder: string;
  requirement: "must" | "should";
  minLength: number;
  /** 写入旧 intakeAnswers，供 buildResearch 兼容 */
  mapsToAnswer?: string;
};

export type ModuleBasicsProfile = {
  artifactId: string;
  status: "draft" | "complete";
  values: Record<string, string>;
  missingMust: string[];
  missingShould: string[];
  updatedAt: string;
  completedAt?: string;
};

export type AdaptiveFollowupQuestion = {
  id: string;
  prompt: string;
  whyNeeded: string;
  priority: "must" | "should";
  triggeredBy: string[];
  mapsToAnswer?: string;
};

export type AdaptiveFollowupSession = {
  sessionId: string;
  status: "in_progress" | "ready_to_compile" | "compiled";
  questions: AdaptiveFollowupQuestion[];
  answers: Record<string, string>;
  createdAt: string;
  updatedAt: string;
};

export type IntakeChecklistItem = {
  id: string;
  label: string;
  source: IntakeSource;
  why: string;
  required: boolean;
  ok: boolean;
  detail: string;
};

export type ModuleIntakeChecklist = {
  items: IntakeChecklistItem[];
  canCompleteIntake: boolean;
  canRunResearch: boolean;
  canConfirmResearch: boolean;
  missingRequired: string[];
  summary: string;
};

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function nowIso() {
  return new Date().toISOString();
}

export function isMeaningful(v: unknown, min = 2): boolean {
  const s = typeof v === "string" ? v.trim() : "";
  if (s.length < min) return false;
  const placeholders = [
    "暂无",
    "不知道",
    "无",
    "没有",
    "待定",
    "tbd",
    "-",
    "—",
    "n/a",
  ];
  return !placeholders.includes(s.toLowerCase());
}

export function analyzeBasicsGaps(
  fields: IntakeFieldDef[],
  values: Record<string, string>,
): { missingMust: string[]; missingShould: string[] } {
  const missingMust: string[] = [];
  const missingShould: string[] = [];
  for (const field of fields) {
    const raw = (values[field.key] || "").trim();
    const filled =
      field.key.toLowerCase().includes("slogan") && raw === "暂无"
        ? true
        : isMeaningful(raw, field.minLength);
    if (!filled) {
      if (field.requirement === "must") missingMust.push(field.key);
      else missingShould.push(field.key);
    }
  }
  return { missingMust, missingShould };
}

export function createEmptyBasics(fields: IntakeFieldDef[]): ModuleBasicsProfile {
  return {
    artifactId: createId("basics"),
    status: "draft",
    values: {},
    missingMust: fields.filter((f) => f.requirement === "must").map((f) => f.key),
    missingShould: fields
      .filter((f) => f.requirement === "should")
      .map((f) => f.key),
    updatedAt: nowIso(),
  };
}

export function upsertBasics(
  fields: IntakeFieldDef[],
  existing: ModuleBasicsProfile | undefined,
  patch: Record<string, string>,
): ModuleBasicsProfile {
  const base = existing || createEmptyBasics(fields);
  const values = { ...base.values };
  for (const [k, v] of Object.entries(patch)) {
    if (typeof v === "string") values[k] = v.trim();
  }
  const gaps = analyzeBasicsGaps(fields, values);
  const complete = gaps.missingMust.length === 0;
  return {
    ...base,
    values,
    missingMust: gaps.missingMust,
    missingShould: gaps.missingShould,
    status: complete ? "complete" : "draft",
    updatedAt: nowIso(),
    completedAt: complete ? base.completedAt || nowIso() : undefined,
  };
}

export function answerAdaptiveFollowup(
  session: AdaptiveFollowupSession,
  questionId: string,
  answer: string,
): AdaptiveFollowupSession {
  if (!isMeaningful(answer, 2)) return session;
  const answers = { ...session.answers, [questionId]: answer.trim() };
  const mustIds = session.questions
    .filter((q) => q.priority === "must")
    .map((q) => q.id);
  const mustDone = mustIds.every((id) => isMeaningful(answers[id], 2));
  return {
    ...session,
    answers,
    status: mustDone ? "ready_to_compile" : "in_progress",
    updatedAt: nowIso(),
  };
}

export function createFollowupSession(
  questions: AdaptiveFollowupQuestion[],
): AdaptiveFollowupSession {
  const capped = [
    ...questions.filter((q) => q.priority === "must"),
    ...questions.filter((q) => q.priority === "should"),
  ].slice(0, 8);
  return {
    sessionId: createId("afu"),
    status: "in_progress",
    questions: capped,
    answers: {},
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
}

export function compileAnswersFromIntake(input: {
  fields: IntakeFieldDef[];
  basics: ModuleBasicsProfile;
  followups?: AdaptiveFollowupSession | null;
}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const field of input.fields) {
    const v = input.basics.values[field.key];
    if (!v?.trim()) continue;
    const key = field.mapsToAnswer || field.key;
    out[key] = v.trim();
  }
  if (input.followups) {
    for (const q of input.followups.questions) {
      const a = input.followups.answers[q.id];
      if (!a?.trim()) continue;
      out[q.mapsToAnswer || q.id] = a.trim();
    }
  }
  // 摘要字段便于报告
  out._basics_summary = Object.entries(input.basics.values)
    .filter(([, v]) => v?.trim())
    .map(([k, v]) => `${k}:${v}`)
    .join("；");
  return out;
}

export function evaluateModuleIntakeChecklist(input: {
  fields: IntakeFieldDef[];
  basics?: ModuleBasicsProfile | null;
  followups?: AdaptiveFollowupSession | null;
  research?: {
    status?: string;
    collectionMode?: string;
    sources?: unknown[];
    sections?: unknown[];
  } | null;
}): ModuleIntakeChecklist {
  const items: IntakeChecklistItem[] = [];
  const basics = input.basics;
  const followups = input.followups;
  const research = input.research;

  for (const field of input.fields.filter((f) => f.requirement === "must")) {
    const val = (basics?.values?.[field.key] || "").trim();
    const ok =
      basics?.status === "complete"
        ? !basics.missingMust.includes(field.key)
        : isMeaningful(val, field.minLength);
    items.push({
      id: `fixed.${field.key}`,
      label: `基础档案 · ${field.label}`,
      source: "fixed",
      why: "没有真实经营事实，后续策略没有差异与价值。",
      required: true,
      ok,
      detail: ok ? "已采集" : `未采集：${field.prompt}`,
    });
  }

  const mustFu = followups?.questions.filter((q) => q.priority === "must") || [];
  if (!followups || mustFu.length === 0) {
    items.push({
      id: "adaptive.session",
      label: "动态追问会话",
      source: "adaptive",
      why: "基础档案齐后须按缺口生成专属追问。",
      required: true,
      ok: false,
      detail: "尚未生成自适应追问",
    });
  } else {
    for (const q of mustFu) {
      const answered = isMeaningful(followups.answers[q.id], 2);
      items.push({
        id: `adaptive.${q.id}`,
        label: `动态追问 · ${q.prompt.slice(0, 28)}${q.prompt.length > 28 ? "…" : ""}`,
        source: "adaptive",
        why: q.whyNeeded,
        required: true,
        ok: answered,
        detail: answered ? "已答" : "待答",
      });
    }
  }

  const sourceCount = Array.isArray(research?.sources)
    ? research!.sources!.length
    : 0;
  const sectionCount = Array.isArray(research?.sections)
    ? research!.sections!.length
    : 0;
  const mode = research?.collectionMode || "";
  // engine = 厚档案驱动的模块引擎；hybrid/live = 含外部检索；纯 heuristic 四题编造不算
  const toolOk =
    Boolean(research) &&
    (research?.status === "ready" || research?.status === "confirmed") &&
    (mode === "hybrid" ||
      mode === "engine" ||
      mode === "live_crawl" ||
      sourceCount >= 2 ||
      (mode !== "heuristic" && sectionCount >= 3));

  items.push({
    id: "research.tool",
    label: "工具/调研补全",
    source: "research_tool",
    why: "调研须有可追溯外部信号或厚档案引擎采集，不能只靠四道选择题编故事。",
    required: true,
    ok: toolOk,
    detail: !research
      ? "尚未运行调研"
      : toolOk
        ? `模式 ${mode || "n/a"} · 来源 ${sourceCount} · 章节 ${sectionCount}`
        : `调研偏启发式（模式 ${mode || "heuristic"}，来源 ${sourceCount}），请基于厚档案重跑`,
  });

  const missingRequired = items
    .filter((i) => i.required && !i.ok)
    .map((i) => i.label);
  const fixedOk = items
    .filter((i) => i.source === "fixed" && i.required)
    .every((i) => i.ok);
  const adaptiveOk = items
    .filter((i) => i.source === "adaptive" && i.required)
    .every((i) => i.ok);
  const researchOk = items
    .filter((i) => i.source === "research_tool" && i.required)
    .every((i) => i.ok);

  const canCompleteIntake = fixedOk && adaptiveOk;
  const canRunResearch = canCompleteIntake;
  const canConfirmResearch = canRunResearch && researchOk;

  return {
    items,
    canCompleteIntake,
    canRunResearch,
    canConfirmResearch,
    missingRequired,
    summary: canConfirmResearch
      ? "信息收集清单已齐，可确认调研并进入顾问会。"
      : `信息未齐，仍缺 ${missingRequired.length} 项：${missingRequired
          .slice(0, 3)
          .join("；")}${missingRequired.length > 3 ? "…" : ""}`,
  };
}
