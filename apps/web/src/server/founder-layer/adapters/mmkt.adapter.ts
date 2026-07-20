import { previewMMktSnapshot } from "@/server/services/m-mkt.service";
import type {
  AdapterBuildInput,
  AdapterNormalizeContext,
  AdapterRawResponse,
  AdapterRequest,
  FounderDecision,
  FounderMission,
} from "../contracts";
import { BaseFounderAgentAdapter } from "./base.adapter";

function inferMarketQuestion(mission: FounderMission) {
  if (mission.missionType === "expansion_review") {
    return "当前市场空间是否支持扩张";
  }
  if (mission.missionType === "market_entry") {
    return "当前市场是否值得进入";
  }
  return mission.question;
}

export class MMktFounderAdapter extends BaseFounderAgentAdapter {
  agent = "M-MKT" as const;

  supports(mission: FounderMission) {
    return mission.requiredAgents.includes("M-MKT");
  }

  buildRequest(input: AdapterBuildInput): AdapterRequest {
    return {
      agent: this.agent,
      endpoint: "preview://m-mkt",
      payload: {
        question: input.mission.question || input.mission.objective,
        companyId: input.companyContext.companyId,
        name: input.companyContext.basicInfo.name,
        industry: input.companyContext.basicInfo.industry,
        city: input.companyContext.basicInfo.city,
        stage: input.companyContext.basicInfo.stage,
        scale: input.companyContext.business?.scale,
        goals: input.companyContext.goals,
        assetContextBlock: input.assetContextBlock,
        ...this.memoryPriorPayload(input),
      },
      timeoutMs: 15000,
    };
  }

  async invoke(request: AdapterRequest): Promise<AdapterRawResponse> {
    const startedAt = Date.now();
    const raw = await previewMMktSnapshot({
      message: [
        String(request.payload.question ?? "").trim() || "当前市场是否值得进入",
        typeof request.payload.memoryPriorBlock === "string" && request.payload.memoryPriorBlock
          ? `\n\n【企业记忆先验】\n${request.payload.memoryPriorBlock}`
          : "",
      ].join(""),
      companyContext: {
        companyId: String(request.payload.companyId ?? "founder-company"),
        basicInfo: {
          name: String(request.payload.name ?? "当前项目"),
          industry: String(request.payload.industry ?? "餐饮"),
          city: String(request.payload.city ?? "目标城市"),
          stage: String(request.payload.stage ?? "经营校准期"),
        },
        business: {
          scale: typeof request.payload.scale === "string" ? request.payload.scale : undefined,
        },
        goals: Array.isArray(request.payload.goals)
          ? request.payload.goals.map((item) => String(item))
          : [],
      },
      assetContextBlock:
        typeof request.payload.assetContextBlock === "string"
          ? request.payload.assetContextBlock
          : undefined,
    });

    return {
      agent: this.agent,
      status: "success",
      raw,
      latencyMs: Date.now() - startedAt,
    };
  }

  normalize(
    response: AdapterRawResponse,
    context: AdapterNormalizeContext,
  ): FounderDecision {
    const raw = response.raw as Awaited<ReturnType<typeof previewMMktSnapshot>>;
    const structured = raw.structured as
      | { provider?: string; pageOutput?: typeof raw.pageOutput }
      | undefined;
    const providerFromStructured =
      structured?.provider === "external" || structured?.provider === "heuristic"
        ? structured.provider
        : undefined;
    const provider =
      providerFromStructured ||
      (/【真实引擎】/.test(raw.oneLiner) ? "external" : "heuristic");
    const gaps = raw.pageOutput.gaps.slice(0, 3).map((item) => ({
      label: item.title || "市场缺口",
      content: item.summary,
      confidence: item.confidence,
    }));
    const healthEvidence = {
      label: "机会判断",
      content: `进入判断：${raw.pageOutput.health.judgement}；机会评分相关置信 ${Math.round(raw.confidence * 100)}%`,
      confidence: raw.confidence,
    };
    const actionEvidence = (raw.pageOutput.finalDecision.actions ?? [])
      .slice(0, 1)
      .map((item) => ({
        label: "验证动作",
        content: item,
        confidence: raw.confidence,
      }));

    const judgementBase = raw.oneLiner.replace(/^【真实引擎】|^【启发式】/, "");
    const judgement =
      provider === "external" ? `【真实引擎】${judgementBase}` : `【启发式】${judgementBase}`;

    return {
      decisionId: this.buildDecisionId(),
      sourceAgent: this.agent,
      question: inferMarketQuestion(context.mission),
      judgement,
      confidence: raw.confidence,
      evidence: [...gaps, healthEvidence, ...actionEvidence].slice(0, 4),
      risks: raw.pageOutput.finalDecision.risks.slice(0, 3),
      nextSteps: raw.pageOutput.finalDecision.actions.slice(0, 3),
      stance:
        raw.pageOutput.health.judgement === "enter"
          ? "support"
          : raw.pageOutput.health.judgement === "kill"
            ? "oppose"
            : "conditional",
      validation: raw.pageOutput.finalDecision.actions[0],
      metadata: {
        missionId: context.mission.missionId,
        producedAt: this.buildNowIso(),
        latencyMs: response.latencyMs,
        provider,
      },
    };
  }
}

export const mMktFounderAdapter = new MMktFounderAdapter();
