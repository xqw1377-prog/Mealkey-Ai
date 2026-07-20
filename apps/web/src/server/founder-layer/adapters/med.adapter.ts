import { previewMEdSnapshot } from "@/server/services/m-ed.service";
import type {
  AdapterBuildInput,
  AdapterNormalizeContext,
  AdapterRawResponse,
  AdapterRequest,
  FounderDecision,
  FounderMission,
} from "../contracts";
import { BaseFounderAgentAdapter } from "./base.adapter";

function inferOrgQuestion(mission: FounderMission) {
  if (mission.missionType === "organization_review") {
    return "当前组织与股权结构是否支撑下一阶段";
  }
  if (mission.missionType === "expansion_review") {
    return "当前组织能力是否支撑扩张";
  }
  return mission.question;
}

export class MEdFounderAdapter extends BaseFounderAgentAdapter {
  agent = "M-ED" as const;

  supports(mission: FounderMission) {
    return mission.requiredAgents.includes("M-ED");
  }

  buildRequest(input: AdapterBuildInput): AdapterRequest {
    return {
      agent: this.agent,
      endpoint: "preview://m-ed",
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
      timeoutMs: 20000,
    };
  }

  async invoke(request: AdapterRequest): Promise<AdapterRawResponse> {
    const startedAt = Date.now();
    const raw = await previewMEdSnapshot({
      message: [
        String(request.payload.question ?? "").trim() ||
          "当前组织与股权结构是否支撑下一阶段",
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
    const raw = response.raw as Awaited<ReturnType<typeof previewMEdSnapshot>>;
    const structured = raw.structured as
      | { provider?: string }
      | undefined;
    const providerFromStructured =
      structured?.provider === "external" || structured?.provider === "heuristic"
        ? structured.provider
        : undefined;
    const provider =
      providerFromStructured ||
      (/【真实引擎】/.test(raw.oneLiner) ? "external" : "heuristic");
    const founders = raw.pageOutput.profile.founders;
    const judgementBase = raw.oneLiner.replace(/^【真实引擎】|^【启发式】/, "");
    const judgement =
      provider === "external" ? `【真实引擎】${judgementBase}` : `【启发式】${judgementBase}`;

    return {
      decisionId: this.buildDecisionId(),
      sourceAgent: this.agent,
      question: inferOrgQuestion(context.mission),
      judgement,
      confidence: raw.confidence,
      evidence: [
        {
          label: "股权健康度",
          content: `健康度 ${raw.pageOutput.health.score} / 100，控制权 ${raw.pageOutput.health.control} / 100`,
          confidence: raw.confidence,
        },
        {
          label: "当前结构",
          content:
            founders.length > 0
              ? `${founders.length} 位核心成员已进入治理视图`
              : "当前治理结构仍待补充",
          confidence: raw.confidence,
        },
        {
          label: "组织风险",
          content:
            raw.pageOutput.finalDecision.risks[0] ||
            "融资稀释与控制权边界仍需持续监控",
          confidence: raw.confidence,
        },
      ],
      risks: raw.pageOutput.finalDecision.risks.slice(0, 3),
      nextSteps: raw.pageOutput.finalDecision.actions.slice(0, 3),
      stance: raw.pageOutput.health.control >= 75 ? "conditional" : "oppose",
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

export const mEdFounderAdapter = new MEdFounderAdapter();
