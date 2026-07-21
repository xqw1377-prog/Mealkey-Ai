/**
 * 决策室服务端运行时：MKInsight 接入 + ExpertReport 兼容投影 + LLM 常委意见
 * V4：四大能力经 Intelligence Provider → MKInsight → Council
 */

import {
  buildHeuristicOpinions,
  sanitizeOpinionEvidence,
  buildCouncilRuntimePrompt,
  runScenarioAnalysis,
  renderScenarioBlock,
  buildCalibrationHint,
  mergeEvidencePacket,
  insightsToExpertReport,
  type CouncilMeetingSession,
  type CouncilOpinion,
  type CouncilPosition,
  type CouncilRoleId,
  type EvidencePacket,
  type ExpertEngineId,
  type ExpertReport,
  type MKInsight,
} from "../../../../../../packages/agents/src/founder-os";
import { toMPntMkInsights } from "../../../../../../packages/agents/src/m-pnt/consulting";
import { toMMktMkInsights } from "../../../../../../packages/agents/src/m-mkt/consulting";
import { toMBizMkInsights } from "../../../../../../packages/agents/src/m-biz/consulting";
import { toMEdMkInsights } from "../../../../../../packages/agents/src/m-ed/consulting";
import { hasAgentConsultingSubstance } from "../../../../../../packages/agents/src/consulting-os";
import { harvestSeatPrimaryFacts } from "../../../../../../packages/agents/src/consulting-os/seat-evidence";
import { getOrCreateBrandConsultingProject } from "@/server/services/m-pnt-consulting.service";
import { getOrCreateAgentConsulting } from "@/server/services/agent-consulting.service";
import {
  resolveLlmModel,
  resolveLlmProvider,
  tryCreateSharedLlmAdapter,
} from "@/server/services/llm-polish";
import { isCouncilStubAllowedByEnv } from "@/server/services/engine-meeting-gate";
import { prisma } from "@/lib/prisma";
import { validateProfile } from "@/lib/profile-schema";
import { loadRestaurantBrainContext } from "@/server/restaurant-brain/service";
import {
  calibrateOpinionConfidenceByEvidenceWeight,
  collectDomainStrengthsFromProfile,
  collectWorldChangesFromProfile,
  enrichCouncilEvidencePacket,
} from "@/server/founder-layer/council/council-world-evidence";
import type { DomainStrengthSnapshot } from "../../../../../../packages/agents/src/consulting-os";

export { isCouncilStubAllowedByEnv };

export type OpinionSource = "llm" | "heuristic" | "mixed";

const ROLES: CouncilRoleId[] = [
  "CSO",
  "CMO",
  "CBO",
  "BMO",
  "CFO",
  "COO",
  "CRO",
];

function isPosition(v: unknown): v is CouncilPosition {
  return v === "support" || v === "oppose" || v === "conditional";
}

function parseSingleOpinionJson(content: string): CouncilOpinion | null {
  try {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as Record<string, unknown>;
    const member = String(parsed.member || "") as CouncilRoleId;
    if (!ROLES.includes(member)) return null;
    if (!isPosition(parsed.position)) return null;
    const judgment = String(parsed.judgment || parsed.summary || "").trim();
    if (!judgment) return null;

    return {
      member,
      position: parsed.position as CouncilPosition,
      confidence: Math.min(95, Math.max(40, Number(parsed.confidence) || 65)),
      summary: judgment.slice(0, 120),
      judgment: judgment.slice(0, 200),
      top_risk: String(parsed.top_risk || "").slice(0, 120) || undefined,
      proposal: String(parsed.proposal || "").slice(0, 200) || undefined,
      needs_validation:
        String(parsed.needs_validation || "").slice(0, 120) || undefined,
      reasoning: Array.isArray(parsed.reasoning)
        ? parsed.reasoning.map(String).slice(0, 5)
        : [],
      evidence_used: Array.isArray(parsed.evidence_used)
        ? parsed.evidence_used.map(String).slice(0, 5)
        : [],
      risks: Array.isArray(parsed.risks)
        ? parsed.risks.map(String).slice(0, 4)
        : [],
      conditions: Array.isArray(parsed.conditions)
        ? parsed.conditions.map(String).slice(0, 4)
        : [],
      veto: Boolean(parsed.veto),
      veto_reason: parsed.veto
        ? String(parsed.veto_reason || parsed.top_risk || "红线触发").slice(0, 160)
        : undefined,
      challenge_to_others: Array.isArray(parsed.challenge_to_others)
        ? parsed.challenge_to_others.map(String).slice(0, 3)
        : undefined,
      minority_report:
        parsed.position === "oppose" || Boolean(parsed.minority_report),
      prediction: parsed.prediction as CouncilOpinion["prediction"] | undefined,
    };
  } catch {
    return null;
  }
}

function mergeOpinions(
  roster: CouncilRoleId[],
  llmOpinions: Map<CouncilRoleId, CouncilOpinion>,
  fallback: CouncilOpinion[],
  evidencePacket?: EvidencePacket,
): { opinions: CouncilOpinion[]; source: OpinionSource } {
  const fb = new Map(fallback.map((o) => [o.member, o]));
  let llmHits = 0;
  const opinions = roster.map((role) => {
    const hit = llmOpinions.get(role);
    if (hit) {
      llmHits += 1;
    }
    const raw = hit || fb.get(role)!;
    const cleaned = sanitizeOpinionEvidence(raw, evidencePacket);
    // LLM 路径 confidence 常为 40–95；启发式为 0–1。统一到 0–1 再按证据权重校准。
    const conf01 =
      cleaned.confidence > 1
        ? cleaned.confidence / 100
        : Math.max(0, Math.min(1, cleaned.confidence));
    const calibrated = calibrateOpinionConfidenceByEvidenceWeight({
      confidence: conf01,
      evidenceUsedIds: cleaned.evidence_used,
      packet: evidencePacket,
    });
    return {
      ...cleaned,
      confidence:
        cleaned.confidence > 1
          ? Math.round(calibrated * 100)
          : calibrated,
    };
  });
  return {
    opinions,
    source:
      llmHits === roster.length ? "llm" : llmHits > 0 ? "mixed" : "heuristic",
  };
}

function projectInsightsToReports(
  insights: MKInsight[],
  caseId: string,
): ExpertReport[] {
  const engines = [
    ...new Set(insights.map((i) => String(i.sourceAgent))),
  ] as ExpertEngineId[];
  return engines
    .filter((e): e is ExpertEngineId =>
      ["M-PNT", "M-MKT", "M-BIZ", "M-ED"].includes(e),
    )
    .map((engineId) => insightsToExpertReport(insights, engineId, caseId));
}

/**
 * 从项目咨询资产拉 MKInsight（真源）+ ExpertReport（兼容投影）
 */
export async function loadProjectExpertReports(input: {
  userId: string;
  projectId: string;
  caseId: string;
}): Promise<{
  reports: ExpertReport[];
  insights: MKInsight[];
  evidencePacket?: EvidencePacket;
  brandStrength?: number;
  sourceNote: string;
  loadedEngines: string[];
}> {
  const insights: MKInsight[] = [];
  const notes: string[] = [];
  let ledgerPacket: EvidencePacket | undefined;
  let brandStrength: number | undefined;
  const liveDomainStrengths: DomainStrengthSnapshot[] = [];

  // M-PNT — Positioning Intelligence Provider
  try {
    const { consulting } = await getOrCreateBrandConsultingProject(
      input.userId,
      input.projectId,
    );
    const hasContract = Boolean(consulting.assets.positioningContract);
    const hasBrief = Boolean(consulting.assets.brandBrief);
    if (hasContract || hasBrief) {
      const { insights: pntInsights, brandStrength: strength } =
        toMPntMkInsights(consulting, { caseId: input.caseId });
      insights.push(...pntInsights);
      brandStrength = strength;
      notes.push(`M-PNT Insight×${pntInsights.length}`);

      const ledger = consulting.assets.evidenceLedger;
      if (ledger?.facts?.length) {
        const verified = ledger.facts.filter(
          (f) =>
            f.verificationStatus !== "unverified" &&
            !(f.tags || []).includes("seed_from_brief") &&
            !(f.tags || []).includes("needs_verification"),
        );
        if (verified.length) {
          ledgerPacket = {
            caseId: input.caseId,
            generatedAt: new Date().toISOString(),
            items: verified.slice(0, 12).map((f, i) => ({
              evidenceId: f.factId || `E-PNT-${i + 1}`,
              sourceAgent: "M-PNT",
              claim: f.claim,
              strength:
                f.strength === "strong"
                  ? "strong"
                  : f.strength === "weak"
                    ? "weak"
                    : "medium",
            })),
            gaps: [],
          };
        }
      }
    }
  } catch {
    notes.push("M-PNT 读取失败");
  }

  // M-MKT / M-BIZ / M-ED — Market / Business / Organization Intelligence
  const agentConfigs: Array<{
    id: "m-mkt" | "m-biz" | "m-ed";
    engineId: ExpertEngineId;
    toInsights: (
      project: Parameters<typeof toMMktMkInsights>[0],
      opts?: { caseId?: string },
    ) => MKInsight[];
  }> = [
    { id: "m-mkt", engineId: "M-MKT", toInsights: toMMktMkInsights },
    { id: "m-biz", engineId: "M-BIZ", toInsights: toMBizMkInsights },
    { id: "m-ed", engineId: "M-ED", toInsights: toMEdMkInsights },
  ];

  for (const cfg of agentConfigs) {
    try {
      const { consulting } = await getOrCreateAgentConsulting(
        input.userId,
        input.projectId,
        cfg.id,
      );
      if (!hasAgentConsultingSubstance(consulting)) continue;
      const batch = cfg.toInsights(consulting, { caseId: input.caseId });
      insights.push(...batch);
      notes.push(`${cfg.engineId} Insight×${batch.length}`);

      const strength = consulting.assets.domainStrength as
        | DomainStrengthSnapshot
        | undefined;
      if (strength && typeof strength.overall === "number") {
        liveDomainStrengths.push(strength);
      }

      // 对齐 M-PNT evidenceLedger：席位一手事实进入常委 EvidencePacket
      const primaryFacts =
        consulting.assets.primaryFacts && consulting.assets.primaryFacts.length > 0
          ? consulting.assets.primaryFacts
          : harvestSeatPrimaryFacts(consulting.assets.research);
      const seatItems = primaryFacts
        .filter((f) => (f.claim || "").trim().length >= 8 && (f.sourceRef || "").trim())
        .slice(0, 8)
        .map((f, i) => ({
          evidenceId: f.factId || `E-${cfg.engineId}-${i + 1}`,
          sourceAgent: cfg.engineId,
          claim: f.claim.trim().slice(0, 160),
          strength: "medium" as const,
          refs: [f.sourceRef.trim().slice(0, 240)],
        }));
      if (seatItems.length) {
        ledgerPacket = ledgerPacket
          ? {
              ...ledgerPacket,
              items: [...ledgerPacket.items, ...seatItems].slice(0, 28),
            }
          : {
              caseId: input.caseId,
              generatedAt: new Date().toISOString(),
              items: seatItems,
              gaps: [],
            };
        notes.push(`${cfg.engineId} 一手事实×${seatItems.length}`);
      }
    } catch {
      notes.push(`${cfg.id} 读取失败`);
    }
  }

  const reports = projectInsightsToReports(insights, input.caseId);
  let evidencePacket = insights.length
    ? mergeEvidencePacket({
        caseId: input.caseId,
        base: ledgerPacket,
        insights,
      })
    : ledgerPacket;

  // E0/E1 → 七常委：世界变化 + Brain + 领域强度缺口注入证据包
  try {
    const project = await prisma.project.findFirst({
      where: { id: input.projectId, owner: { userId: input.userId } },
      select: { profile: true },
    });
    const profile = project
      ? (validateProfile(project.profile) as Record<string, unknown>)
      : null;
    const worldChanges = collectWorldChangesFromProfile(profile);
    const profileStrengths = collectDomainStrengthsFromProfile(profile);
    const strengthByAgent = new Map<string, DomainStrengthSnapshot>();
    for (const s of [...profileStrengths, ...liveDomainStrengths]) {
      strengthByAgent.set(s.agentId, s);
    }
    const domainStrengths = [...strengthByAgent.values()];

    let brainFacts: Array<{
      id?: string;
      claim?: string;
      confidence?: number;
      category?: string;
    }> = [];
    let knownUnknowns: Array<{ question?: string }> = [];
    try {
      const brain = await loadRestaurantBrainContext(prisma, {
        projectId: input.projectId,
        ownerId: input.userId,
      });
      if (brain.brand.positioning) {
        brainFacts.push({
          id: "brand-positioning",
          claim: `定位：${brain.brand.positioning}`,
          confidence: brain.capability.confidence,
          category: "brand",
        });
      }
      if (brain.brand.targetCustomer) {
        brainFacts.push({
          id: "brand-customer",
          claim: `目标客群：${brain.brand.targetCustomer}`,
          confidence: brain.capability.confidence,
          category: "brand",
        });
      }
      if (brain.brand.risk) {
        brainFacts.push({
          id: "brand-risk",
          claim: `品牌风险：${brain.brand.risk}`,
          confidence: brain.capability.confidence,
          category: "risk",
        });
      }
      for (const d of brain.history.recentDecisions.slice(0, 3)) {
        if (!d.question) continue;
        brainFacts.push({
          id: `recent-${brainFacts.length}`,
          claim: `近期决策：${d.question}${d.chosen ? ` → ${d.chosen}` : ""}`,
          confidence: 0.6,
          category: "history",
        });
      }
      knownUnknowns = (brain.unknowns || [])
        .filter((q) => String(q).trim().length >= 4)
        .slice(0, 6)
        .map((q) => ({ question: String(q) }));
    } catch {
      // Brain 失败不阻断开会
    }

    const beforeCount = evidencePacket?.items?.length || 0;
    evidencePacket = enrichCouncilEvidencePacket({
      caseId: input.caseId,
      base: evidencePacket,
      worldChanges,
      brain: { facts: brainFacts, knownUnknowns },
      domainStrengths,
    });
    if (worldChanges.length) {
      notes.push(`今日世界变化×${worldChanges.length}`);
    }
    if (brainFacts.length) {
      notes.push(`Brain事实×${brainFacts.length}`);
    }
    if (knownUnknowns.length) {
      notes.push(`Brain未知×${knownUnknowns.length}`);
    }
    const notReady = domainStrengths.filter((s) => !s.readyForCouncil);
    if (notReady.length) {
      notes.push(
        `领域强度提醒：${notReady.map((s) => `${s.agentId}${s.overall}`).join("、")}`,
      );
    }
    const afterCount = evidencePacket.items.length;
    if (afterCount > beforeCount) {
      notes.push(`证据包 ${beforeCount}→${afterCount}`);
    }
  } catch {
    notes.push("世界变化/Brain 注入跳过");
  }

  const loadedEngines = [
    ...new Set(insights.map((i) => String(i.sourceAgent))),
  ];
  const sourceNote = loadedEngines.length
    ? `MKInsight 已挂载 ${loadedEngines.join("、")}（${notes.join(" · ")}）`
    : notes.length
      ? `尚无咨询资产，已挂载经营上下文（${notes.join(" · ")}）`
      : "尚无可用咨询资产，使用占位报告";

  return {
    reports,
    insights,
    evidencePacket,
    brandStrength,
    sourceNote,
    loadedEngines,
  };
}

/** @deprecated 别名 — 与 loadProjectExpertReports 相同 */
export const loadProjectCouncilIntelligence = loadProjectExpertReports;

/**
 * LLM 生成常委意见 — 每位常委独立 persona prompt
 */
export async function generateCouncilOpinions(input: {
  session: CouncilMeetingSession;
}): Promise<{ opinions: CouncilOpinion[]; source: OpinionSource }> {
  const fallback = buildHeuristicOpinions({
    roster: input.session.roster,
    topic: input.session.agenda.topic,
    evidencePacket: input.session.evidencePacket,
    expertReports: input.session.expertReports,
  });

  if (process.env.HEURISTIC_ONLY === "true") {
    return { opinions: fallback, source: "heuristic" };
  }

  const provider = resolveLlmProvider();
  const llm = tryCreateSharedLlmAdapter();
  if (!llm || provider === "none") {
    return { opinions: fallback, source: "heuristic" };
  }

  const model = resolveLlmModel(provider);
  const llmOpinions = new Map<CouncilRoleId, CouncilOpinion>();

  for (const roleId of input.session.roster) {
    try {
      const scenarioResults = runScenarioAnalysis(
        roleId,
        input.session.agenda.topic,
      );
      const scenarioBlock = renderScenarioBlock(roleId, scenarioResults);
      const calibrationHint = buildCalibrationHint(roleId);

      const basePrompt = buildCouncilRuntimePrompt({
        roleId,
        casePacket: input.session.casePacket,
        expertReports: input.session.expertReports,
        evidencePacket: input.session.evidencePacket,
        insights: input.session.insights,
        round: 1,
      });

      const fullPrompt =
        basePrompt +
        "\n\n" +
        scenarioBlock +
        "\n\n## 校准提示\n" +
        calibrationHint +
        "\n\n## 输出要求\n只返回合法 JSON，不要 Markdown 围栏。必须包含完整的判断。";

      const response = await llm.chat({
        model,
        temperature: 0.4,
        maxTokens: 1500,
        messages: [
          {
            role: "system",
            content: `你是餐启（Mealkey）决策室的 ${roleId}。按照你的身份、世界观、判断模型做独立判断。`,
          },
          { role: "user", content: fullPrompt },
        ],
      });

      const parsed = parseSingleOpinionJson(response.content || "");
      if (parsed && parsed.member === roleId) {
        llmOpinions.set(roleId, parsed);
      }
    } catch {
      // 单个常委失败不影响其他人
    }
  }

  return mergeOpinions(
    input.session.roster,
    llmOpinions,
    fallback,
    input.session.evidencePacket,
  );
}
