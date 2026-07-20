/**
 * Decision Agent — 做正确选择
 * 插件：Strategy / Capital(M-ED) / Risk / Simulation / Evidence
 */

import type {
  CapabilityAgent,
  CapabilityMode,
  CapabilityPluginId,
  CapabilityRequest,
  CapabilityRunResult,
  DecisionPack,
  OsKernelContext,
  RiskBriefItem,
  SimulationBriefItem,
} from "../../contracts/capability";
import type {
  AdapterBuildInput,
  EvidencePack,
  FounderDecision,
  FounderFinalDecision,
  FounderMeeting,
} from "../../contracts";
import { mEdFounderAdapter } from "../../adapters";
import { attachEvidenceToDecisions, createEvidenceRegistry } from "../../evidence";
import { applyMemoryPriorsToDecisions, buildFounderMemoryWrites } from "../../memory";
import { buildFounderMeeting } from "../../meeting";
import { buildFounderFinalDecision } from "../../decision";

const DECISION_MODES: CapabilityMode[] = [
  "strategy_meeting",
  "decision_pressure",
];

const DEFAULT_DECISION_PLUGINS: CapabilityPluginId[] = [
  "capital",
  "strategy",
  "risk",
  "simulation",
  "evidence",
];

function buildId(prefix: string) {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? `${prefix}_${crypto.randomUUID().slice(0, 8)}`
    : `${prefix}_${Date.now().toString(36)}`;
}

function clip(text: string, max = 120) {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function seatsFromKernel(
  request: CapabilityRequest,
  kernel: OsKernelContext,
): FounderDecision[] {
  if (kernel.seatDecisions?.length) return [...kernel.seatDecisions];
  if (request.priorSeatDecisions?.length) return [...request.priorSeatDecisions];
  const fromInsights = (kernel.insightPack ?? request.priorInsightPack)?.insights
    .map((i) => i.seatDecision)
    .filter((d): d is FounderDecision => Boolean(d));
  return fromInsights?.length ? fromInsights : [];
}

async function runCapitalPlugin(
  request: CapabilityRequest,
  enabled: Set<CapabilityPluginId>,
): Promise<FounderDecision | null> {
  if (!enabled.has("capital")) return null;
  if (!mEdFounderAdapter.supports(request.mission)) return null;

  const buildInput: AdapterBuildInput = {
    mission: request.mission,
    companyContext: request.companyContext,
    memory: request.memory ?? undefined,
    assetContextBlock: request.assetContextBlock,
  };
  const adapterRequest = mEdFounderAdapter.buildRequest(buildInput);
  const timeoutMs = adapterRequest.timeoutMs ?? 15000;

  try {
    const raw = await Promise.race([
      mEdFounderAdapter.invoke(adapterRequest),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Capital 插件超时")), timeoutMs);
      }),
    ]);
    return mEdFounderAdapter.normalize(raw, {
      question: request.mission.question,
      mission: request.mission,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "capital_failed";
    return {
      decisionId: buildId("dec-ed"),
      sourceAgent: "M-ED",
      question: request.mission.question,
      judgement: `【启发式】资本插件降级：${message}`,
      confidence: 0.4,
      evidence: [],
      risks: ["资本引擎不可用"],
      nextSteps: ["稍后重试组织/资本顾问"],
      stance: "conditional",
      metadata: {
        missionId: request.mission.missionId,
        producedAt: new Date().toISOString(),
        provider: "heuristic",
      },
    };
  }
}

function mergeEvidencePacks(
  base: EvidencePack | undefined,
  extra: EvidencePack,
): EvidencePack {
  if (!base) return extra;
  return {
    nodes: [...base.nodes, ...extra.nodes],
    relations: [...base.relations, ...extra.relations],
  };
}

function buildRiskBrief(
  decisions: FounderDecision[],
  meeting: FounderMeeting,
  enabled: Set<CapabilityPluginId>,
): RiskBriefItem[] {
  if (!enabled.has("risk")) return [];
  const items: RiskBriefItem[] = [];

  for (const d of decisions) {
    for (const risk of d.risks.slice(0, 2)) {
      items.push({
        riskId: buildId("risk"),
        title: clip(risk, 40),
        impact: `${d.sourceAgent === "M-ED" ? "资本/控制权" : "经营"}承压：${clip(risk, 60)}`,
        mitigation: d.nextSteps[0],
        source: d.sourceAgent === "M-ED" ? "capital" : "seat",
      });
    }
  }

  for (const c of (meeting.debateSession?.conflicts ?? meeting.conflicts).slice(0, 2)) {
    const summary = "summary" in c ? String(c.summary) : String((c as { issue?: string }).issue || "");
    items.push({
      riskId: buildId("risk"),
      title: clip(summary, 40) || "委员会冲突",
      impact: clip(summary, 80),
      mitigation: "先完成关键验证再放大动作",
      source: "debate",
    });
  }

  for (const s of (meeting.debateSession?.scenarioTests ?? []).slice(0, 2)) {
    items.push({
      riskId: buildId("risk"),
      title: clip(s.scenario, 40),
      impact: clip(s.impact, 80),
      mitigation: clip(s.mitigation, 60),
      source: "scenario",
    });
  }

  // 去重标题
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.title.slice(0, 20);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 6);
}

function buildSimulations(
  meeting: FounderMeeting,
  enabled: Set<CapabilityPluginId>,
): SimulationBriefItem[] {
  if (!enabled.has("simulation")) return [];
  return (meeting.debateSession?.scenarioTests ?? []).slice(0, 4).map((s) => ({
    scenarioId: s.scenarioId,
    scenario: s.scenario,
    trigger: s.trigger,
    impact: s.impact,
    mitigation: s.mitigation,
  }));
}

export class DecisionAgent implements CapabilityAgent {
  id = "decision" as const;

  supports(mode: CapabilityMode) {
    return DECISION_MODES.includes(mode);
  }

  async run(
    request: CapabilityRequest,
    kernel: OsKernelContext,
  ): Promise<CapabilityRunResult> {
    const enabled = new Set(request.plugins ?? DEFAULT_DECISION_PLUGINS);
    let decisions = seatsFromKernel(request, kernel);
    let evidencePack: EvidencePack =
      kernel.evidencePack ||
      request.priorEvidencePack || { nodes: [], relations: [] };

    if (!decisions.length) {
      return {
        agentId: "decision",
        memoryWrites: [],
        evidencePack,
        nextSuggestedAgent: "cognition",
      };
    }

    // Capital 插件
    const capitalRaw = await runCapitalPlugin(request, enabled);
    if (capitalRaw) {
      const registry = createEvidenceRegistry(request.projectId);
      const [bound] = attachEvidenceToDecisions({
        registry,
        projectId: request.projectId,
        missionId: request.mission.missionId,
        decisions: [capitalRaw],
        assetContextBlock: request.assetContextBlock,
      });
      const [withMemory] = applyMemoryPriorsToDecisions({
        decisions: [bound || capitalRaw],
        memory: request.memory ?? kernel.memory,
      });
      decisions = [
        ...decisions.filter((d) => d.sourceAgent !== "M-ED"),
        withMemory!,
      ];
      evidencePack = mergeEvidencePacks(evidencePack, registry.toPack());
    }

    // Strategy + Evidence：会议 / 辩论 / 终局合同
    const meeting = buildFounderMeeting({
      mission: request.mission,
      decisions,
    });
    const finalDecision: FounderFinalDecision = buildFounderFinalDecision({
      mission: request.mission,
      meeting,
      decisions,
      projectId: request.projectId,
    });

    const risks = buildRiskBrief(decisions, meeting, enabled);
    const simulations = buildSimulations(meeting, enabled);
    const capitalBrief = decisions.find((d) => d.sourceAgent === "M-ED")?.judgement;
    const strategyDecision =
      meeting.debateSession?.proposal?.decision ||
      meeting.recommendation ||
      finalDecision.chosen;

    const decisionPack: DecisionPack = {
      packId: buildId("dp"),
      missionId: request.mission.missionId,
      agentId: "decision",
      strategyDecision,
      chosen: finalDecision.chosen,
      capitalBrief: capitalBrief ? clip(capitalBrief, 160) : undefined,
      risks,
      simulations,
      evidenceStatus: finalDecision.evidenceStatus || "insufficient",
      debateSession: meeting.debateSession,
      decisionContract: finalDecision.contract,
      summary: `决策摘要：${finalDecision.chosen} · ${clip(strategyDecision, 72)}`,
      createdAt: new Date().toISOString(),
    };

    const memoryWrites = buildFounderMemoryWrites({
      projectId: request.projectId,
      mission: request.mission,
      decisions,
      meeting,
      finalDecision,
      evidencePack,
      companyContext: request.companyContext,
    });

    return {
      agentId: "decision",
      decisionPack,
      decisionContract: finalDecision.contract,
      debateSession: meeting.debateSession,
      evidencePack,
      seatDecisions: decisions,
      meeting,
      finalDecision,
      memoryWrites,
      nextSuggestedAgent: "execution",
    };
  }
}

export const decisionAgent = new DecisionAgent();
