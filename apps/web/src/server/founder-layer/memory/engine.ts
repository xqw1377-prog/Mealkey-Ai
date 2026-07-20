/**
 * Founder OS Memory Engine V1
 * 写：会议/决策/偏好/验证结果 → Memory
 * 读：组装 Snapshot + priorBlock → 注入下一轮判断
 */

import type { PrismaClient } from "@/generated/prisma";
import { saveMemory } from "@/server/services/agent-os.service";
import type {
  CompanyContext,
  EvidencePack,
  FounderDecision,
  FounderFinalDecision,
  FounderMeeting,
  FounderMemoryDomain,
  FounderMemorySnapshot,
  FounderMemoryWrite,
  FounderMission,
  MemoryDecisionSummary,
  MemoryFact,
  MemoryPattern,
  MemoryPreference,
} from "../contracts";
import { stampMemoryLayer, stampMemoryLayers } from "../contracts/memory-runtime";

function buildWriteId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `founder-memory-${Date.now()}`;
}

function clip(text: string, max = 120): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function domainFromMission(mission: FounderMission): FounderMemoryDomain {
  if (mission.missionType === "positioning_review") return "brand";
  if (mission.missionType === "market_entry") return "market";
  if (mission.missionType === "business_diagnosis") return "business";
  if (mission.missionType === "organization_review") return "organization";
  return "mixed";
}

function parseMemoryContent(content: string): {
  summary?: string;
  payload?: Record<string, unknown>;
  domain?: string;
  source?: string;
  createdAt?: string;
} {
  try {
    return JSON.parse(content) as {
      summary?: string;
      payload?: Record<string, unknown>;
      domain?: string;
      source?: string;
      createdAt?: string;
    };
  } catch {
    return { summary: content };
  }
}

/** 预格式化先验块 — Adapter / 会议共用 */
export function formatMemoryPriorBlock(snapshot: FounderMemorySnapshot | undefined | null): string {
  if (!snapshot) return "";
  const lines: string[] = [];
  if (snapshot.preferences.length > 0) {
    lines.push(
      `老板偏好：${snapshot.preferences
        .slice(0, 3)
        .map((p) => `${p.label}=${p.value}`)
        .join("；")}`,
    );
  }
  if (snapshot.decisions.length > 0) {
    lines.push(
      `近期决策：${snapshot.decisions
        .slice(0, 3)
        .map((d) => d.summary)
        .join("；")}`,
    );
  }
  if (snapshot.patterns.length > 0) {
    lines.push(
      `成败模式：${snapshot.patterns
        .slice(0, 3)
        .map((p) => `[${p.kind}] ${p.summary}`)
        .join("；")}`,
    );
  }
  if (snapshot.facts.length > 0) {
    lines.push(
      `企业事实：${snapshot.facts
        .slice(0, 4)
        .map((f) => `${f.label}:${f.value}`)
        .join("；")}`,
    );
  }
  return lines.join("\n");
}

export function emptyMemorySnapshot(): FounderMemorySnapshot {
  return {
    facts: [],
    decisions: [],
    preferences: [],
    patterns: [],
    priorBlock: "",
  };
}

/** 从 Memory 表 + Decision + profile 组装可读快照 */
export async function loadFounderMemorySnapshot(
  prisma: PrismaClient,
  ownerId: string,
  projectId: string,
  profile?: Record<string, unknown> | null,
): Promise<FounderMemorySnapshot> {
  const rowsRaw = await prisma.memory.findMany({
    where: {
      ownerId,
      projectId,
      OR: [
        { key: { startsWith: `founder_` } },
        { type: { in: ["MEETING", "DECISION", "PREFERENCE", "LEARNING", "PROJECT"] } },
      ],
    },
    orderBy: [{ importance: "desc" }, { updatedAt: "desc" }],
    take: 40,
  });
  const rows = Array.isArray(rowsRaw) ? rowsRaw : [];

  const facts: MemoryFact[] = [];
  const decisions: MemoryDecisionSummary[] = [];
  const preferences: MemoryPreference[] = [];
  const patterns: MemoryPattern[] = [];

  for (const row of rows) {
    const parsed = parseMemoryContent(row.content);
    const summary = clip(parsed.summary || row.content, 140);
    const payload = parsed.payload || {};
    const createdAt = parsed.createdAt || row.updatedAt.toISOString();

    if (row.type === "PREFERENCE" || row.key.includes("_preference_")) {
      preferences.push({
        label: String(payload.label || "偏好"),
        value: String(payload.value || summary),
        confidence: typeof payload.confidence === "number" ? payload.confidence : 0.7,
      });
      continue;
    }

    if (row.type === "DECISION" || row.key.includes("_decision_")) {
      if (payload.impact || payload.result || payload.retrospective || row.key.includes("validation_result")) {
        const impact = String(payload.impact || payload.result || "");
        const kind: MemoryPattern["kind"] =
          impact === "confirmed" || impact === "aligned"
            ? "success"
            : impact === "invalidated" || impact === "off"
              ? "failure"
              : "partial";
        patterns.push({
          patternId: row.id,
          kind,
          summary: clip(
            String(
              (payload.retrospective as { newLearning?: string } | undefined)?.newLearning ||
                summary,
            ),
            140,
          ),
          committee: typeof payload.committee === "string" ? payload.committee : undefined,
          evidenceId: typeof payload.resultEvidenceId === "string" ? payload.resultEvidenceId : undefined,
          createdAt,
        });
      }
      decisions.push({
        decisionId: typeof payload.decisionId === "string" ? payload.decisionId : undefined,
        summary,
        createdAt,
      });
      continue;
    }

    if (row.type === "LEARNING" || row.key.includes("lesson_") || row.key.includes("feedback_")) {
      patterns.push({
        patternId: row.id,
        kind: /失败|偏离|证伪|off|invalid/.test(summary) ? "failure" : "partial",
        summary,
        createdAt,
      });
      continue;
    }

    if (row.type === "MEETING" || row.key.includes("_meeting_")) {
      // meetings feed decision summaries lightly
      continue;
    }

    // PROJECT / fact
    if (payload.kind === "evidence_pack") continue;
    facts.push({
      label: String(payload.sourceAgent || payload.label || "事实"),
      value: summary,
      updatedAt: createdAt,
    });
  }

  // profile overlays
  if (profile) {
    if (typeof profile.founderPreference === "string" && profile.founderPreference) {
      preferences.unshift({
        label: "创始人关注",
        value: profile.founderPreference,
        confidence: 0.85,
      });
    }
    const growth = profile.growthPlan as
      | { decisionSummary?: string; day30?: string; day90?: string }
      | undefined;
    if (growth?.decisionSummary) {
      decisions.unshift({
        summary: clip(growth.decisionSummary, 120),
        createdAt: new Date().toISOString(),
      });
    }
    const learnings = profile.committeeLearnings as
      | Record<string, { lastLearning?: string; updatedAt?: string }>
      | undefined;
    if (learnings) {
      for (const [committee, item] of Object.entries(learnings)) {
        if (!item?.lastLearning) continue;
        patterns.unshift({
          patternId: `committee-${committee}`,
          kind: "partial",
          summary: item.lastLearning,
          committee,
          createdAt: item.updatedAt,
        });
      }
    }
    const ledger = Array.isArray(profile.evidenceLedger)
      ? (profile.evidenceLedger as Array<Record<string, unknown>>)
      : [];
    for (const node of ledger.slice(0, 5)) {
      if (node.sourceLevel !== "validated_outcome") continue;
      const impact = String(node.impact || "");
      patterns.unshift({
        patternId: String(node.id || buildWriteId()),
        kind:
          impact === "confirmed" ? "success" : impact === "invalidated" ? "failure" : "partial",
        summary: clip(String(node.content || ""), 120),
        committee: typeof node.committee === "string" ? node.committee : undefined,
        evidenceId: typeof node.id === "string" ? node.id : undefined,
        createdAt: typeof node.createdAt === "string" ? node.createdAt : undefined,
      });
    }
  }

  // recent Decision table
  const recentDecisionsRaw = await prisma.decision.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { id: true, judgement: true, problem: true, createdAt: true, learning: true },
  });
  const recentDecisions = Array.isArray(recentDecisionsRaw)
    ? recentDecisionsRaw
    : [];
  for (const d of recentDecisions) {
    if (!decisions.some((x) => x.decisionId === d.id)) {
      decisions.push({
        decisionId: d.id,
        summary: clip(`${d.problem} → ${d.judgement}`, 120),
        createdAt: d.createdAt.toISOString(),
      });
    }
    if (d.learning) {
      try {
        const learning = JSON.parse(d.learning) as {
          summary?: string;
          impact?: string;
          retrospective?: { newLearning?: string };
        };
        const text = learning.retrospective?.newLearning || learning.summary;
        if (text) {
          patterns.push({
            patternId: `dec-learn-${d.id}`,
            kind:
              learning.impact === "confirmed"
                ? "success"
                : learning.impact === "invalidated"
                  ? "failure"
                  : "partial",
            summary: clip(text, 120),
            createdAt: d.createdAt.toISOString(),
          });
        }
      } catch {
        /* ignore */
      }
    }
  }

  const snapshot: FounderMemorySnapshot = {
    facts: facts.slice(0, 8),
    decisions: decisions.slice(0, 6),
    preferences: preferences.slice(0, 4),
    patterns: patterns.slice(0, 6),
    priorBlock: "",
  };
  snapshot.priorBlock = formatMemoryPriorBlock(snapshot);
  return snapshot;
}

/** 把记忆先验注入席位判断（证据 + 风险 + 立场校准） */
export function applyMemoryPriorsToDecisions(input: {
  decisions: FounderDecision[];
  memory?: FounderMemorySnapshot | null;
}): FounderDecision[] {
  const memory = input.memory;
  if (!memory || (!memory.priorBlock && memory.patterns.length === 0 && memory.preferences.length === 0)) {
    return input.decisions;
  }

  const failureHints = memory.patterns
    .filter((p) => p.kind === "failure")
    .slice(0, 2)
    .map((p) => p.summary);
  const successHints = memory.patterns
    .filter((p) => p.kind === "success")
    .slice(0, 2)
    .map((p) => p.summary);
  const pref = memory.preferences[0];
  const failureBlob = failureHints.join(" ");
  const aggressiveFailure =
    /加盟|扩张|稀释|供应链|复制失败|现金流/.test(failureBlob);

  return input.decisions.map((decision) => {
    const evidence = [...decision.evidence];
    if (memory.priorBlock) {
      evidence.push({
        label: "企业记忆先验",
        content: clip(memory.priorBlock, 200),
        source: "Memory Engine",
        confidence: 0.75,
      });
    }
    if (successHints[0]) {
      evidence.push({
        label: "历史成功模式",
        content: successHints[0],
        source: "Memory Engine",
        confidence: 0.8,
      });
    }

    const risks = [...decision.risks];
    for (const hint of failureHints) {
      if (!risks.some((r) => r.includes(hint.slice(0, 12)))) {
        risks.push(`历史教训：${clip(hint, 60)}`);
      }
    }

    const nextSteps = [...decision.nextSteps];
    if (pref && !nextSteps.some((s) => s.includes(pref.value))) {
      nextSteps.unshift(`对齐老板偏好：${pref.value}`);
    }

    let stance = decision.stance;
    let confidence = decision.confidence;
    const judgementLooksAggressive =
      /开放加盟|快速扩张|马上开|全国招商|大幅稀释|先去.*开/.test(decision.judgement);

    // 历史失败模式命中扩张/加盟/稀释时：不得无条件 support
    if (
      aggressiveFailure &&
      stance === "support" &&
      (judgementLooksAggressive || /M-MKT|M-BIZ|M-ED/.test(decision.sourceAgent))
    ) {
      stance = "conditional";
      confidence = Math.min(confidence, 0.62);
    }

    // 成功模式与谨慎验证对齐时，略抬升条件推进置信
    if (
      successHints.some((h) => /谨慎|验证|直营|稳健/.test(h)) &&
      (stance === "conditional" || stance === "oppose")
    ) {
      confidence = Math.min(0.92, confidence + 0.05);
    }

    return {
      ...decision,
      stance,
      confidence,
      evidence: evidence.slice(0, 8),
      risks: risks.slice(0, 5),
      nextSteps: nextSteps.slice(0, 5),
      reasoning: decision.reasoning
        ? `${decision.reasoning}\n（已参考企业记忆先验）`
        : memory.priorBlock
          ? `已参考企业记忆：${clip(memory.priorBlock, 80)}`
          : decision.reasoning,
      metadata: {
        missionId: decision.metadata?.missionId || "memory-prior",
        producedAt: decision.metadata?.producedAt || new Date().toISOString(),
        ...(decision.metadata || {}),
        memoryPriorApplied: true,
        memoryStanceAdjusted: stance !== decision.stance,
      },
    };
  });
}

export interface FounderMemoryEngineInput {
  projectId: string;
  mission: FounderMission;
  decisions: FounderDecision[];
  meeting: FounderMeeting;
  finalDecision: FounderFinalDecision;
  evidencePack?: EvidencePack;
  companyContext?: CompanyContext;
  focusPreference?: string;
}

/** 把会议与终局决策压成可写入记忆层的最小写集合 */
export function buildFounderMemoryWrites(
  input: FounderMemoryEngineInput,
): FounderMemoryWrite[] {
  const now = new Date().toISOString();
  const domain = domainFromMission(input.mission);
  const writes: FounderMemoryWrite[] = [];

  // company facts from context
  if (input.companyContext) {
    const ctx = input.companyContext;
    const factLines = [
      ctx.basicInfo.name ? `企业：${ctx.basicInfo.name}` : "",
      ctx.basicInfo.industry ? `行业：${ctx.basicInfo.industry}` : "",
      ctx.basicInfo.city ? `城市：${ctx.basicInfo.city}` : "",
      ctx.basicInfo.stage ? `阶段：${ctx.basicInfo.stage}` : "",
      ctx.business?.scale ? `规模：${ctx.business.scale}` : "",
      ctx.brand?.positioning ? `定位：${ctx.brand.positioning}` : "",
    ].filter(Boolean);
    if (factLines.length > 0) {
      writes.push({
        writeId: buildWriteId(),
        projectId: input.projectId,
        missionId: input.mission.missionId,
        type: "fact",
        domain,
        summary: factLines.join(" · "),
        payload: {
          kind: "company_facts",
          basicInfo: ctx.basicInfo,
          business: ctx.business,
          brand: ctx.brand,
        },
        source: "company_context",
        createdAt: now,
      });
    }
  }

  writes.push({
    writeId: buildWriteId(),
    projectId: input.projectId,
    missionId: input.mission.missionId,
    type: "meeting",
    domain,
    summary: input.meeting.recommendation || input.meeting.topic,
    payload: {
      meetingId: input.meeting.meetingId,
      topic: input.meeting.topic,
      conflicts: input.meeting.conflicts.map((item) => item.summary),
      recommendation: input.meeting.recommendation,
    },
    source: "meeting_engine",
    createdAt: now,
  });

  writes.push({
    writeId: buildWriteId(),
    projectId: input.projectId,
    missionId: input.mission.missionId,
    type: "decision",
    domain,
    summary: `${input.finalDecision.chosen}：${input.finalDecision.problem}`,
    payload: {
      finalDecisionId: input.finalDecision.finalDecisionId,
      chosen: input.finalDecision.chosen,
      reason: input.finalDecision.reason,
      validationPlan: input.finalDecision.validationPlan,
      status: input.finalDecision.status,
      evidenceStatus: input.finalDecision.evidenceStatus,
      evidenceIds: input.finalDecision.evidenceIds,
    },
    source: "decision_engine",
    createdAt: now,
  });

  for (const decision of input.decisions.slice(0, 4)) {
    writes.push({
      writeId: buildWriteId(),
      projectId: input.projectId,
      missionId: input.mission.missionId,
      type: "fact",
      domain,
      summary: `${decision.sourceAgent}：${decision.judgement}`.slice(0, 160),
      payload: {
        decisionId: decision.decisionId,
        sourceAgent: decision.sourceAgent,
        stance: decision.stance,
        risks: decision.risks,
        nextSteps: decision.nextSteps,
        evidenceIds: decision.evidence.map((item) => item.evidenceId).filter(Boolean),
        evidenceSufficient: decision.evidenceSufficient,
        reasoning: decision.reasoning,
        validation: decision.validation,
      },
      source: "agent_decision",
      createdAt: now,
    });
  }

  if (input.evidencePack && input.evidencePack.nodes.length > 0) {
    writes.push({
      writeId: buildWriteId(),
      projectId: input.projectId,
      missionId: input.mission.missionId,
      type: "fact",
      domain,
      summary: `Evidence Pack：${input.evidencePack.nodes.length} 条证据`,
      payload: {
        kind: "evidence_pack",
        nodeCount: input.evidencePack.nodes.length,
        relationCount: input.evidencePack.relations.length,
        nodes: input.evidencePack.nodes.slice(0, 24).map((node) => ({
          id: node.id,
          type: node.type,
          content: node.content,
          source: node.source,
          sourceLevel: node.sourceLevel,
          reliability: node.reliability,
          agent: node.agent,
        })),
        relations: input.evidencePack.relations.slice(0, 40),
      },
      source: "agent_decision",
      createdAt: now,
    });
  }

  if (input.focusPreference) {
    writes.push(buildPreferenceMemoryWrite({
      projectId: input.projectId,
      missionId: input.mission.missionId,
      label: "创始人关注",
      value: input.focusPreference,
      confidence: 0.85,
    }));
  }

  return stampMemoryLayers(writes);
}

export function buildPreferenceMemoryWrite(input: {
  projectId: string;
  missionId?: string;
  label: string;
  value: string;
  confidence?: number;
}): FounderMemoryWrite {
  return stampMemoryLayer({
    writeId: buildWriteId(),
    projectId: input.projectId,
    missionId: input.missionId,
    type: "preference",
    domain: "mixed",
    summary: `${input.label}：${input.value}`,
    payload: {
      label: input.label,
      value: input.value,
      confidence: input.confidence ?? 0.8,
    },
    source: "user_feedback",
    createdAt: new Date().toISOString(),
  });
}

export function buildLearningMemoryWrite(input: {
  projectId: string;
  decisionId?: string;
  summary: string;
  impact?: string;
  committee?: string;
  resultEvidenceId?: string;
  retrospective?: Record<string, unknown>;
}): FounderMemoryWrite {
  return stampMemoryLayer({
    writeId: buildWriteId(),
    projectId: input.projectId,
    type: "learning",
    domain: "mixed",
    summary: clip(input.summary, 160),
    payload: {
      decisionId: input.decisionId,
      impact: input.impact,
      committee: input.committee,
      resultEvidenceId: input.resultEvidenceId,
      retrospective: input.retrospective,
    },
    source: "validation_os",
    createdAt: new Date().toISOString(),
  });
}

function mapMemoryType(type: FounderMemoryWrite["type"]): string {
  if (type === "meeting") return "MEETING";
  if (type === "decision") return "DECISION";
  if (type === "preference") return "PREFERENCE";
  if (type === "learning") return "LEARNING";
  return "PROJECT";
}

function mapImportance(type: FounderMemoryWrite["type"]): number {
  if (type === "decision") return 90;
  if (type === "learning") return 92;
  if (type === "meeting") return 85;
  if (type === "preference") return 80;
  return 70;
}

/** 将 Founder Layer memoryWrites 持久化到 Memory 表 */
export async function persistFounderMemoryWrites(
  prisma: PrismaClient,
  ownerId: string,
  writes: FounderMemoryWrite[],
  options?: {
    /** Memory Permission：关闭体验保存时跳过 decision/preference/learning */
    allowExperience?: boolean;
    /** 关闭个人成长时跳过 growth_engine learning */
    allowGrowth?: boolean;
    /** 未 opt-in 时跳过 industry 层 */
    allowIndustry?: boolean;
  },
): Promise<number> {
  const allowExperience = options?.allowExperience !== false;
  const allowGrowth = options?.allowGrowth !== false;
  const allowIndustry = options?.allowIndustry === true;
  let saved = 0;
  for (const raw of writes) {
    const write = stampMemoryLayer(raw);
    // Level 0：普通信息不入库
    if (write.valueLevel === 0) continue;
    if (write.memoryLayer === "INDUSTRY" && !allowIndustry) continue;
    const isGrowthLearning =
      write.type === "learning" && write.source === "growth_engine";
    if (isGrowthLearning && !allowGrowth) continue;
    if (!isGrowthLearning && !allowExperience) continue;
    await saveMemory(prisma, ownerId, {
      key: `founder_${write.type}_${write.projectId}_${write.writeId}`,
      content: JSON.stringify({
        summary: write.summary,
        payload: write.payload,
        memoryLayer: write.memoryLayer,
        valueLevel: write.valueLevel,
        missionId: write.missionId,
        domain: write.domain,
        source: write.source,
        createdAt: write.createdAt,
      }),
      type: mapMemoryType(write.type),
      source: `founder-layer:${write.source}`,
      importance: mapImportance(write.type),
      projectId: write.projectId,
    });
    saved += 1;
  }
  return saved;
}
