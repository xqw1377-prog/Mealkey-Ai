/**
 * Cognition Agent — 看懂世界
 * 插件：Market(M-MKT) / Brand(M-PNT) / Business(M-BIZ) / World / Self
 */

import type {
  CapabilityAgent,
  CapabilityMode,
  CapabilityPluginId,
  CapabilityRequest,
  CapabilityRunResult,
  CognitionInsight,
  InsightPack,
  OsKernelContext,
} from "../../contracts/capability";
import type {
  AdapterBuildInput,
  FounderAgentAdapter,
  FounderDecision,
} from "../../contracts";
import {
  mBizFounderAdapter,
  mMktFounderAdapter,
  mPntFounderAdapter,
} from "../../adapters";
import { attachEvidenceToDecisions, createEvidenceRegistry, linkSeatContradictions } from "../../evidence";
import { applyMemoryPriorsToDecisions } from "../../memory";
import { LEGACY_AGENT_TO_PLUGIN } from "../../contracts/capability";
import { buildWorldInsight } from "./world";
import { buildSelfInsight } from "./self";

const COGNITION_MODES: CapabilityMode[] = [
  "strategy_meeting",
  "cognition_only",
];

const DEFAULT_COGNITION_PLUGINS: CapabilityPluginId[] = [
  "market",
  "brand",
  "business",
  "world",
  "self",
];

const PLUGIN_ADAPTER: Partial<Record<CapabilityPluginId, FounderAgentAdapter>> = {
  market: mMktFounderAdapter,
  brand: mPntFounderAdapter,
  business: mBizFounderAdapter,
};

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

async function runPluginAdapter(
  adapter: FounderAgentAdapter,
  buildInput: AdapterBuildInput,
  timeoutMs: number,
): Promise<FounderDecision> {
  const request = adapter.buildRequest(buildInput);
  try {
    const raw = await Promise.race([
      adapter.invoke(request),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error(`${adapter.agent} 超时（${timeoutMs}ms）`)),
          timeoutMs,
        );
      }),
    ]);
    return adapter.normalize(raw, {
      question: buildInput.mission.question,
      mission: buildInput.mission,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "plugin_failed";
    return {
      decisionId: buildId("cog-deg"),
      sourceAgent: adapter.agent,
      question: buildInput.mission.question,
      judgement: `【启发式】本插件暂时降级：${message}`,
      confidence: 0.4,
      evidence: [],
      risks: ["插件调用失败"],
      nextSteps: ["稍后重试"],
      stance: "conditional",
      metadata: {
        missionId: buildInput.mission.missionId,
        producedAt: new Date().toISOString(),
        provider: "heuristic",
      },
    };
  }
}

function decisionToInsight(decision: FounderDecision): CognitionInsight {
  const plugin = LEGACY_AGENT_TO_PLUGIN[decision.sourceAgent];
  const titleByPlugin: Record<string, string> = {
    market: "市场判断",
    brand: "品牌心智",
    business: "赚钱逻辑",
  };
  return {
    insightId: buildId("ins"),
    plugin,
    title: titleByPlugin[plugin] || plugin,
    statement: clip(decision.judgement, 160),
    why: decision.reasoning ? clip(decision.reasoning, 120) : undefined,
    risks: decision.risks.slice(0, 3),
    conditions: decision.nextSteps.slice(0, 3),
    confidence: decision.confidence,
    evidenceRefs: decision.evidence
      .map((e) => e.evidenceId)
      .filter((id): id is string => Boolean(id)),
    seatDecision: decision,
    provider: decision.metadata?.provider,
  };
}

function summarizeInsights(insights: CognitionInsight[]): string {
  const core = insights
    .filter((i) => ["market", "brand", "business"].includes(i.plugin))
    .map((i) => `${i.title}：${clip(i.statement, 48)}`)
    .slice(0, 3);
  return core.length
    ? `认知摘要：${core.join("；")}`
    : "认知摘要：本轮洞察不足，建议补充市场/品牌/商业输入。";
}

export class CognitionAgent implements CapabilityAgent {
  id = "cognition" as const;

  supports(mode: CapabilityMode) {
    return COGNITION_MODES.includes(mode);
  }

  async run(
    request: CapabilityRequest,
    kernel: OsKernelContext,
  ): Promise<CapabilityRunResult> {
    const enabled = new Set(request.plugins ?? DEFAULT_COGNITION_PLUGINS);
    const buildInput: AdapterBuildInput = {
      mission: request.mission,
      companyContext: request.companyContext,
      memory: kernel.memory ?? undefined,
      assetContextBlock: request.assetContextBlock,
    };

    const adapters = (["market", "brand", "business"] as CapabilityPluginId[])
      .filter((p) => enabled.has(p))
      .map((p) => PLUGIN_ADAPTER[p])
      .filter((a): a is FounderAgentAdapter => Boolean(a))
      .filter((a) => a.supports(request.mission));

    const rawDecisions = await Promise.all(
      adapters.map((adapter) =>
        runPluginAdapter(adapter, buildInput, adapter.buildRequest(buildInput).timeoutMs ?? 15000),
      ),
    );

    const registry = createEvidenceRegistry(request.projectId);
    const withEvidence = attachEvidenceToDecisions({
      registry,
      projectId: request.projectId,
      missionId: request.mission.missionId,
      decisions: rawDecisions,
      assetContextBlock: request.assetContextBlock,
    });
    const seatDecisions = applyMemoryPriorsToDecisions({
      decisions: withEvidence,
      memory: kernel.memory,
    });
    linkSeatContradictions(registry, seatDecisions);

    const insights: CognitionInsight[] = seatDecisions.map(decisionToInsight);

    if (enabled.has("world")) {
      insights.push(buildWorldInsight(request, kernel.memory));
    }
    if (enabled.has("self")) {
      insights.push(buildSelfInsight(request, kernel));
    }

    const byPlugin: InsightPack["byPlugin"] = {};
    for (const insight of insights) {
      byPlugin[insight.plugin] = insight;
    }

    const insightPack: InsightPack = {
      packId: buildId("ip"),
      missionId: request.mission.missionId,
      agentId: "cognition",
      insights,
      byPlugin,
      summary: summarizeInsights(insights),
      createdAt: new Date().toISOString(),
    };

    return {
      agentId: "cognition",
      insightPack,
      evidencePack: registry.toPack(),
      seatDecisions,
      memoryWrites: [],
      nextSuggestedAgent: "decision",
    };
  }
}

export const cognitionAgent = new CognitionAgent();
