import { describe, expect, it } from "vitest";
import {
  cognitionAgent,
  runCapabilityCycle,
  runCapabilityCycleFromMissionRequest,
} from "@/server/founder-layer/capability";
import { buildFounderMission } from "@/server/founder-layer/mission";
import { runFounderLoop } from "@/server/founder-layer";
import { buildOsKernelContext, capabilityRequestFromMissionRequest } from "@/server/founder-layer/capability/kernel";

process.env.HEURISTIC_ONLY = process.env.HEURISTIC_ONLY ?? "true";

const TIMEOUT = 45000;

const baseRequest = {
  requestId: "req-cog-1",
  projectId: "proj-cog-1",
  userId: "user-cog-1",
  message: "马上开放加盟，90天开到20家可以吗？",
  companyContext: {
    companyId: "proj-cog-1",
    basicInfo: {
      name: "能力湘菜",
      industry: "湘菜",
      city: "长沙",
      stage: "扩张前",
    },
    brand: {
      name: "能力湘菜",
      positioning: "长沙宴请湘菜",
      users: "商务宴请",
    },
    business: { scale: "3 家直营" },
    goals: ["稳健扩张"],
  },
  createdAt: new Date().toISOString(),
};

describe("Founder OS V2 Capability Runtime", () => {
  it(
    "Cognition Agent 产出 InsightPack（Market/Brand/Business/World/Self）",
    async () => {
      const mission = buildFounderMission(baseRequest);
      const req = capabilityRequestFromMissionRequest(
        baseRequest,
        mission,
        "cognition_only",
      );
      const kernel = buildOsKernelContext(req);
      const result = await cognitionAgent.run(req, kernel);

      expect(result.agentId).toBe("cognition");
      expect(result.insightPack?.insights.length).toBeGreaterThanOrEqual(5);
      expect(result.insightPack?.byPlugin.market).toBeTruthy();
      expect(result.insightPack?.byPlugin.brand).toBeTruthy();
      expect(result.insightPack?.byPlugin.business).toBeTruthy();
      expect(result.insightPack?.byPlugin.world).toBeTruthy();
      expect(result.insightPack?.byPlugin.self).toBeTruthy();
      // 无市场事实时不得冒充 world_sense
      expect(["insufficient", "world_sense"]).toContain(
        result.insightPack?.byPlugin.world?.provider,
      );
      expect(result.insightPack?.byPlugin.self?.provider).toBe("self_sense");
      expect(result.insightPack?.byPlugin.world?.statement).not.toContain("【启发式】");
      expect(result.nextSuggestedAgent).toBe("decision");
      expect(result.seatDecisions?.length).toBeGreaterThanOrEqual(3);
    },
    TIMEOUT,
  );

  it(
    "strategy_meeting：Cognition → Decision → Execution → Growth",
    async () => {
      const cycle = await runCapabilityCycleFromMissionRequest({
        request: baseRequest,
        mode: "strategy_meeting",
      });

      expect(cycle.insightPack?.summary).toBeTruthy();
      expect(cycle.decision?.agentId).toBe("decision");
      expect(cycle.decisionPack?.agentId).toBe("decision");
      expect(cycle.decisionPack?.strategyDecision).toBeTruthy();
      expect(cycle.decisionPack?.risks.length).toBeGreaterThan(0);
      expect(cycle.decisionPack?.simulations.length).toBeGreaterThanOrEqual(2);
      expect(cycle.decisions.some((d) => d.sourceAgent === "M-ED")).toBe(true);
      expect(cycle.meeting?.debateSession).toBeTruthy();
      expect(cycle.finalDecision?.chosen).toBeTruthy();
      expect(["带条件推进", "暂缓推进", "继续推进"]).toContain(
        cycle.finalDecision!.chosen,
      );
      expect(cycle.decision?.nextSuggestedAgent).toBe("execution");

      expect(cycle.execution?.agentId).toBe("execution");
      expect(cycle.actionPlan?.goals.length).toBeGreaterThanOrEqual(2);
      expect(cycle.actionPlan?.actions.length).toBeGreaterThanOrEqual(1);
      expect(cycle.actionPlan?.alignmentNotes.length).toBeGreaterThan(0);
      expect(cycle.actionPlan?.communicationDrafts.length).toBeGreaterThan(0);
      expect(cycle.validationTask?.taskId).toBeTruthy();
      expect(cycle.actionPlan?.validationTaskId).toBe(cycle.validationTask?.taskId);
      expect(cycle.execution?.nextSuggestedAgent).toBe("growth");

      expect(cycle.growth?.agentId).toBe("growth");
      expect(cycle.growthDelta?.scores.length).toBe(4);
      expect(cycle.growthDelta?.reflections.length).toBeGreaterThan(0);
      expect(cycle.growthDelta?.learningNext.length).toBeGreaterThan(0);
      expect(cycle.growthDelta?.scores.every((s) => s.score >= 32 && s.score <= 92)).toBe(
        true,
      );
    },
    TIMEOUT,
  );

  it(
    "runFounderLoop 返回 insightPack + decisionPack + actionPlan + growthDelta",
    async () => {
      const result = await runFounderLoop({ request: baseRequest });
      expect(result.capabilityMode).toBe("strategy_meeting");
      expect(result.insightPack?.agentId).toBe("cognition");
      expect(result.decisionPack?.agentId).toBe("decision");
      expect(result.actionPlan?.agentId).toBe("execution");
      expect(result.growthDelta?.agentId).toBe("growth");
      expect(result.growthDelta?.scores.length).toBe(4);
      expect(result.validationTask?.taskId).toBeTruthy();
      expect(result.decisions.length).toBe(4);
      expect(result.meeting.rounds).toHaveLength(3);
    },
    TIMEOUT,
  );

  it("cognition_only 不强制开会", async () => {
    const mission = buildFounderMission(baseRequest);
    const req = capabilityRequestFromMissionRequest(
      baseRequest,
      mission,
      "cognition_only",
    );
    const cycle = await runCapabilityCycle(req);
    expect(cycle.meeting).toBeUndefined();
    expect(cycle.finalDecision).toBeUndefined();
    expect(cycle.decisionPack).toBeUndefined();
    expect(cycle.insightPack?.insights.length).toBeGreaterThanOrEqual(5);
  }, TIMEOUT);

  it(
    "decision_pressure：复用 prior Insight 只跑 Decision",
    async () => {
      const mission = buildFounderMission(baseRequest);
      const cogReq = capabilityRequestFromMissionRequest(
        baseRequest,
        mission,
        "cognition_only",
      );
      const cogCycle = await runCapabilityCycle(cogReq);

      const decReq = capabilityRequestFromMissionRequest(
        baseRequest,
        mission,
        "decision_pressure",
      );
      decReq.priorInsightPack = cogCycle.insightPack;
      decReq.priorSeatDecisions = cogCycle.decisions;
      decReq.priorEvidencePack = cogCycle.evidencePack;

      const decCycle = await runCapabilityCycle(decReq);
      expect(decCycle.cognition).toBeUndefined();
      expect(decCycle.decisionPack?.chosen).toBeTruthy();
      expect(decCycle.meeting?.debateSession?.challenges.length).toBeGreaterThan(0);
    },
    TIMEOUT,
  );

  it("growth_review：仅跑 Growth，产出能力分与学习路径", async () => {
    const mission = buildFounderMission(baseRequest);
    const full = await runCapabilityCycleFromMissionRequest({
      request: baseRequest,
      mode: "strategy_meeting",
    });

    const growthReq = capabilityRequestFromMissionRequest(
      baseRequest,
      mission,
      "growth_review",
    );
    growthReq.priorInsightPack = full.insightPack;
    growthReq.priorDecisionPack = full.decisionPack;
    growthReq.priorActionPlan = full.actionPlan;
    growthReq.priorCapabilityScores = full.growthDelta?.scores;

    const cycle = await runCapabilityCycle(growthReq);
    expect(cycle.cognition).toBeUndefined();
    expect(cycle.decision).toBeUndefined();
    expect(cycle.execution).toBeUndefined();
    expect(cycle.growthDelta?.scores.length).toBe(4);
    expect(cycle.growthDelta?.learningNext.length).toBeGreaterThan(0);
  }, TIMEOUT);

  it("验证回写后能力分可相对先验产生趋势", async () => {
    const { assessFounderCapabilities } = await import(
      "@/server/founder-layer/capability"
    );
    const prior = assessFounderCapabilities({
      memory: {
        facts: [],
        decisions: [],
        preferences: [],
        patterns: [],
        priorBlock: "",
      },
      decisionsWithOutcome: 0,
    });
    const after = assessFounderCapabilities({
      memory: {
        facts: [],
        decisions: [{ summary: "带条件推进扩张" }],
        preferences: [{ label: "风格", value: "稳健" }],
        patterns: [
          {
            patternId: "p1",
            kind: "success",
            summary: "小样本验证通过后再开店",
          },
        ],
        priorBlock: "",
      },
      priorScores: prior,
      decisionsWithOutcome: 2,
      activeValidationCount: 0,
    });
    expect(after).toHaveLength(4);
    expect(after.some((s) => s.trend === "up" || s.score >= prior.find((p) => p.id === s.id)!.score)).toBe(
      true,
    );
  });
});
