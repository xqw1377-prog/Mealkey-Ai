/**
 * 决策室 · 议程 Brief（对齐 M-PNT 信息采集原则）
 * 议题不能只有标题：必须有 whyNow / 约束 / 决策问题 / 挂载资产就绪度。
 */

export type AgendaBriefValues = {
  topic: string;
  whyNow: string;
  decisionQuestion: string;
  constraints: string;
  successLooksLike: string;
  /** 挂载的咨询资产说明 */
  attachedEvidenceNote?: string;
};

export type AgendaBrief = {
  briefId: string;
  status: "draft" | "complete";
  values: AgendaBriefValues;
  missingMust: Array<keyof AgendaBriefValues>;
  updatedAt: string;
  completedAt?: string;
};

export type AgendaReadiness = {
  ok: boolean;
  briefComplete: boolean;
  hasSubstanceReport: boolean;
  usingStubOnly: boolean;
  /** 因证据缺口需显式确认 */
  requiresAllowGaps?: boolean;
  missing: string[];
  summary: string;
};

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function meaningful(v?: string, min = 4): boolean {
  const s = (v || "").trim();
  if (s.length < min) return false;
  return !["暂无", "无", "没有", "待定"].includes(s);
}

const MUST_KEYS: Array<keyof AgendaBriefValues> = [
  "topic",
  "whyNow",
  "decisionQuestion",
  "constraints",
  "successLooksLike",
];

export function createEmptyAgendaBrief(topic = ""): AgendaBrief {
  return {
    briefId: createId("agenda"),
    status: "draft",
    values: {
      topic,
      whyNow: "",
      decisionQuestion: "",
      constraints: "",
      successLooksLike: "",
    },
    missingMust: [...MUST_KEYS],
    updatedAt: new Date().toISOString(),
  };
}

export function upsertAgendaBrief(
  existing: AgendaBrief | undefined,
  patch: Partial<AgendaBriefValues>,
): AgendaBrief {
  const base = existing || createEmptyAgendaBrief(patch.topic || "");
  const values = { ...base.values, ...patch };
  for (const k of Object.keys(values) as Array<keyof AgendaBriefValues>) {
    if (typeof values[k] === "string") {
      values[k] = (values[k] as string).trim();
    }
  }
  const missingMust = MUST_KEYS.filter((k) => !meaningful(values[k], 4));
  const complete = missingMust.length === 0;
  return {
    ...base,
    values,
    missingMust,
    status: complete ? "complete" : "draft",
    updatedAt: new Date().toISOString(),
    completedAt: complete ? base.completedAt || new Date().toISOString() : undefined,
  };
}

/** 缺口是否多到需要显式「带着缺口开会」 */
export function evidenceGapsRequireAck(input: {
  evidenceItemCount?: number;
  evidenceGaps?: string[];
}): boolean {
  const gaps = input.evidenceGaps?.length || 0;
  const items = input.evidenceItemCount || 0;
  return gaps >= 2 || (gaps >= 1 && items < 2);
}

export function evaluateAgendaReadiness(input: {
  brief?: AgendaBrief | null;
  /** 是否挂载了实质 ExpertReport（非 stub） */
  substanceReportCount?: number;
  /** 是否允许在仅有 stub 时开会（显式确认） */
  allowStub?: boolean;
  /** 证据包条目数 */
  evidenceItemCount?: number;
  /** 证据/强度缺口 */
  evidenceGaps?: string[];
  /** 显式确认带着缺口开会 */
  allowGaps?: boolean;
}): AgendaReadiness {
  const briefComplete = input.brief?.status === "complete";
  const substance = (input.substanceReportCount || 0) > 0;
  const missing: string[] = [];
  if (!briefComplete) {
    missing.push(
      ...(input.brief?.missingMust || MUST_KEYS).map((k) => `议程·${k}`),
    );
  }
  if (!substance && !input.allowStub) {
    missing.push("至少 1 份实质专家报告（或显式确认使用草案）");
  }
  const requiresAllowGaps = evidenceGapsRequireAck({
    evidenceItemCount: input.evidenceItemCount,
    evidenceGaps: input.evidenceGaps,
  });
  // 草案路径已承认资产薄；正式路径缺口多须勾选 allowGaps
  if (requiresAllowGaps && !input.allowGaps && !input.allowStub) {
    missing.push(
      "证据/强度缺口较多：勾选「带着缺口开会」或先补一手事实",
    );
  }
  const ok =
    briefComplete &&
    (substance || Boolean(input.allowStub)) &&
    !(requiresAllowGaps && !input.allowGaps && !input.allowStub);
  const gapNote =
    (input.evidenceGaps?.length || 0) > 0
      ? ` 证据/强度提醒：${input.evidenceGaps!.slice(0, 2).join("；")}`
      : "";
  const emptyEvidenceNote =
    ok && (input.evidenceItemCount || 0) === 0
      ? " 证据包为空，常委意见将以降级置信度运行。"
      : ok && (input.evidenceItemCount || 0) > 0
        ? ` 已挂载证据 ${input.evidenceItemCount} 条。`
        : "";
  const gapsAckNote =
    ok && requiresAllowGaps && (input.allowGaps || input.allowStub)
      ? " 已确认带着缺口开会。"
      : "";
  return {
    ok,
    briefComplete: Boolean(briefComplete),
    hasSubstanceReport: substance,
    usingStubOnly: !substance && Boolean(input.allowStub),
    requiresAllowGaps,
    missing,
    summary: ok
      ? (substance
          ? "议程与专家资产就绪，可开会。"
          : "议程已齐；你已确认在草案资产下开会。") +
        emptyEvidenceNote +
        gapNote +
        gapsAckNote
      : `决策室信息未齐：${missing.slice(0, 3).join("；")}`,
  };
}

export function assertAgendaReady(readiness: AgendaReadiness): void {
  if (!readiness.ok) {
    throw new Error(`决策室信息采集未完成：${readiness.summary}`);
  }
}
