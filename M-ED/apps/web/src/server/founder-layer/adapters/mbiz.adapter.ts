import {
  mbizChat,
  mbizDegradedResponse,
  normalizeBizIndustry,
  normalizeBizStage,
  type MBizChatRequest,
} from "@/server/services/m-biz-client";
import type {
  AdapterBuildInput,
  AdapterNormalizeContext,
  AdapterRawResponse,
  AdapterRequest,
  DecisionEvidence,
  FounderDecision,
  FounderMission,
} from "../contracts";
import { BaseFounderAgentAdapter } from "./base.adapter";

type MBizChatResponse = Awaited<ReturnType<typeof mbizChat>>;

function inferBusinessQuestion(mission: FounderMission) {
  if (mission.missionType === "expansion_review") {
    return "当前商业模式是否支持扩张";
  }
  if (mission.missionType === "business_diagnosis") {
    return "当前商业模式最关键的问题是什么";
  }
  return mission.question;
}

function inferStance(judgement: string, risks: string[]): "support" | "oppose" | "conditional" {
  const text = `${judgement} ${risks.join(" ")}`;
  if (/不建议|暂缓|高风险|不足|承压|问题|薄弱|不能/i.test(text)) return "oppose";
  if (/建议|支持|具备|成立|可行|增长/i.test(text) && !/但|仍需|前提|条件/i.test(text)) {
    return "support";
  }
  return "conditional";
}

function buildEvidence(response: MBizChatResponse): DecisionEvidence[] {
  const factEvidence = (response.fact_nodes ?? [])
    .slice(0, 2)
    .map((item) => ({
      label: String(item.category ?? "business_fact"),
      content: String(item.statement ?? ""),
      confidence: typeof item.confidence === "number" ? item.confidence : undefined,
    }))
    .filter((item) => item.content);

  if (factEvidence.length > 0) return factEvidence;

  return (response.rule_judgments ?? [])
    .slice(0, 2)
    .map((item) => ({
      label: String(item.domain ?? "business_rule"),
      content: String(item.conclusion ?? ""),
      confidence: typeof item.confidence === "number" ? item.confidence : undefined,
    }))
    .filter((item) => item.content);
}

function buildRisks(response: MBizChatResponse) {
  const suggestionRisk = (response.suggestions ?? [])
    .map((item) => String(item.expectedImpact ?? "").trim())
    .filter(Boolean);
  const ruleRisk = (response.rule_judgments ?? [])
    .filter((item) => String(item.severity ?? "").toLowerCase() !== "info")
    .map((item) => String(item.conclusion ?? "").trim())
    .filter(Boolean);

  return [...new Set([...suggestionRisk, ...ruleRisk])].slice(0, 3);
}

function buildNextSteps(response: MBizChatResponse) {
  const steps = [
    ...(response.verification_tasks ?? []).map((item) => String(item.verification_action ?? "").trim()),
    ...(response.suggestions ?? []).map((item) => String(item.verification_action ?? "").trim()),
    ...(response.suggestions ?? []).map((item) => String(item.action ?? "").trim()),
    ...(response.pending_questions ?? []).map((item) => String(item).trim()),
  ].filter(Boolean);

  return [...new Set(steps)].slice(0, 3);
}

export class MBizFounderAdapter extends BaseFounderAgentAdapter {
  agent = "M-BIZ" as const;

  supports(mission: FounderMission) {
    return mission.requiredAgents.includes("M-BIZ");
  }

  buildRequest(input: AdapterBuildInput): AdapterRequest {
    const baseMessage = input.mission.question || input.mission.objective;
    const bizHints = [
      "先验证单店回本与人效，再谈扩张店数。",
      "现金流约束增长节奏，回款慢于投入时应降速。",
      "未标准化的出品与供应链不宜跨城复制。",
    ].join("；");
    const withAssets = input.assetContextBlock
      ? `${baseMessage}\n\n补充资料：\n${input.assetContextBlock}`
      : baseMessage;
    const message = `${withAssets}\n\n【商业参考】${bizHints}`;

    const request: MBizChatRequest = {
      message,
      enterprise_name: input.companyContext.basicInfo.name,
      industry: normalizeBizIndustry(input.companyContext.basicInfo.industry),
      stage: normalizeBizStage(input.companyContext.basicInfo.stage),
    };

    return {
      agent: this.agent,
      endpoint: "/chat",
      payload: request,
      timeoutMs: 3000,
    };
  }

  async invoke(request: AdapterRequest): Promise<AdapterRawResponse> {
    const startedAt = Date.now();
    let raw: Awaited<ReturnType<typeof mbizChat>>;
    try {
      raw = await mbizChat(request.payload as MBizChatRequest, {
        timeoutMs: request.timeoutMs ?? 3000,
      });
    } catch (error) {
      console.warn("[Founder-MBIZ] 服务不可用，降级为启发式回复:", (error as Error)?.message);
      const degraded = mbizDegradedResponse(
        String((request.payload as Record<string, unknown>)?.message ?? ""),
      );
      return {
        agent: this.agent,
        status: "partial",
        raw: degraded,
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
    const raw = response.raw as MBizChatResponse;
    const evidence = buildEvidence(raw);
    const risks = buildRisks(raw);
    const nextSteps = buildNextSteps(raw);
    const judgement = String(raw.reply ?? "").trim() || "当前商业模式判断尚未形成。";

    return {
      decisionId: this.buildDecisionId(),
      sourceAgent: this.agent,
      question: inferBusinessQuestion(context.mission),
      judgement,
      confidence: Math.max(0, Math.min(1, Number((raw.progress ?? 0) || 0.6))),
      evidence,
      risks,
      nextSteps,
      stance: inferStance(judgement, risks),
      metadata: {
        missionId: context.mission.missionId,
        producedAt: this.buildNowIso(),
        latencyMs: response.latencyMs,
      },
    };
  }
}

export const mBizFounderAdapter = new MBizFounderAdapter();
