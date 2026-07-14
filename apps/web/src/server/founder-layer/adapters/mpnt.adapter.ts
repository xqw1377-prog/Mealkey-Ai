import { previewMPntSnapshot } from "@/server/services/m-pnt.service";
import type {
  AdapterBuildInput,
  AdapterNormalizeContext,
  AdapterRawResponse,
  AdapterRequest,
  FounderDecision,
  FounderMission,
} from "../contracts";
import { BaseFounderAgentAdapter } from "./base.adapter";

function inferBrandQuestion(mission: FounderMission) {
  if (mission.missionType === "positioning_review") {
    return "当前品牌定位是否足够清晰";
  }
  if (mission.missionType === "expansion_review") {
    return "当前品牌定位是否支持扩张";
  }
  return mission.question;
}

export class MPntFounderAdapter extends BaseFounderAgentAdapter {
  agent = "M-PNT" as const;

  supports(mission: FounderMission) {
    return mission.requiredAgents.includes("M-PNT");
  }

  buildRequest(input: AdapterBuildInput): AdapterRequest {
    return {
      agent: this.agent,
      endpoint: "preview://m-pnt",
      payload: {
        question: input.mission.question || input.mission.objective,
        companyId: input.companyContext.companyId,
        name: input.companyContext.basicInfo.name,
        industry: input.companyContext.basicInfo.industry,
        city: input.companyContext.basicInfo.city,
        stage: input.companyContext.basicInfo.stage,
        brandName: input.companyContext.brand?.name,
        positioning: input.companyContext.brand?.positioning,
        users: input.companyContext.brand?.users,
        goals: input.companyContext.goals,
      },
      timeoutMs: 3000,
    };
  }

  async invoke(request: AdapterRequest): Promise<AdapterRawResponse> {
    const startedAt = Date.now();
    let raw: Awaited<ReturnType<typeof previewMPntSnapshot>>;
    try {
      raw = await previewMPntSnapshot({
        message: String(request.payload.question ?? "").trim() || "当前品牌定位是否清晰",
        companyContext: {
          companyId: String(request.payload.companyId ?? "founder-company"),
          basicInfo: {
            name: String(request.payload.name ?? "当前项目"),
            industry: String(request.payload.industry ?? "餐饮"),
            city: String(request.payload.city ?? "目标城市"),
            stage: String(request.payload.stage ?? "经营校准期"),
          },
          brand: {
            name: typeof request.payload.brandName === "string" ? request.payload.brandName : undefined,
            positioning:
              typeof request.payload.positioning === "string" ? request.payload.positioning : undefined,
            users: typeof request.payload.users === "string" ? request.payload.users : undefined,
          },
          goals: Array.isArray(request.payload.goals)
            ? request.payload.goals.map((item) => String(item))
            : [],
        },
      });
    } catch (error) {
      console.warn("[Founder-MPNT] 定位服务降级:", (error as Error)?.message);
      const fallback = buildPositioningSnapshot({
        decisionId: `founder-mpnt-degraded-${Date.now()}`,
        problem: "品牌定位评估",
        observation: "M-PNT 服务降级，基于已有信息提供初步判断",
        diagnosis: "无法调用完整定位引擎",
        judgement: "继续沿用当前品牌方向，待 M-PNT 服务就绪后重新评估",
        strategy: "先保持现有定位，收集更多市场和竞争数据",
        action: "补充品牌定位资料，重新发起定位评估",
        confidence: 0.55,
        source: "degraded",
      });
      return {
        agent: this.agent,
        status: "degraded",
        raw: fallback,
        latencyMs: Date.now() - startedAt,
      };
    }

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
    const raw = response.raw as Awaited<ReturnType<typeof previewMPntSnapshot>>;

    return {
      decisionId: this.buildDecisionId(),
      sourceAgent: this.agent,
      question: inferBrandQuestion(context.mission),
      judgement: raw.oneLiner,
      confidence: raw.confidence,
      evidence: [
        {
          label: "心智位置",
          content: raw.brandPositioning?.mentalPosition || raw.oneLiner,
          confidence: raw.confidence,
        },
        {
          label: "目标用户",
          content: raw.brandPositioning?.targetCustomers || "目标用户仍需继续压实",
          confidence: raw.confidence,
        },
      ],
      risks: (raw.risks ?? [])
        .map((item) => item.risk || "")
        .filter(Boolean)
        .slice(0, 3),
      nextSteps: (raw.nextSteps ?? [])
        .map((item) => item.step || "")
        .filter(Boolean)
        .slice(0, 3),
      stance:
        raw.decision_recommend === "reject"
          ? "oppose"
          : raw.decision_recommend === "primary"
            ? "support"
            : "conditional",
      metadata: {
        missionId: context.mission.missionId,
        producedAt: this.buildNowIso(),
        latencyMs: response.latencyMs,
      },
    };
  }
}

export const mPntFounderAdapter = new MPntFounderAdapter();
