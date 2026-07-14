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
      endpoint: "heuristic://m-mkt",
      payload: {
        question: input.mission.question || input.mission.objective,
        city: input.companyContext.basicInfo.city,
        industry: input.companyContext.basicInfo.industry,
        goals: input.companyContext.goals,
      },
      timeoutMs: 3000,
    };
  }

  async invoke(request: AdapterRequest): Promise<AdapterRawResponse> {
    const startedAt = Date.now();
    const raw = previewMMktSnapshot({
      message: String(request.payload.question ?? "").trim() || "当前市场是否值得进入",
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
    const raw = response.raw as ReturnType<typeof previewMMktSnapshot>;

    return {
      decisionId: this.buildDecisionId(),
      sourceAgent: this.agent,
      question: inferMarketQuestion(context.mission),
      judgement: raw.oneLiner,
      confidence: raw.confidence,
      evidence: raw.pageOutput.gaps.slice(0, 2).map((item) => ({
        label: item.title,
        content: item.summary,
        confidence: item.confidence,
      })),
      risks: raw.pageOutput.finalDecision.risks.slice(0, 3),
      nextSteps: raw.pageOutput.finalDecision.actions.slice(0, 3),
      stance:
        raw.pageOutput.health.judgement === "enter"
          ? "support"
          : raw.pageOutput.health.judgement === "kill"
            ? "oppose"
            : "conditional",
      metadata: {
        missionId: context.mission.missionId,
        producedAt: this.buildNowIso(),
        latencyMs: response.latencyMs,
      },
    };
  }
}

export const mMktFounderAdapter = new MMktFounderAdapter();
