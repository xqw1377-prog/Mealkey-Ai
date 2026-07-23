import { describe, expect, it } from "vitest";
import { injectDomainKnowledge, formatKnowledgeBrief } from "@/server/knowledge/inject-domain";
import type { MKContext } from "@mealkey/agent-sdk";
import { ActiveMeetingDraftSchema } from "@/lib/meeting-session";

function emptyCtx(): MKContext {
  return {
    owner: {
      id: "u1",
      name: null,
      email: null,
      experience: "0年",
      strengths: [],
      weaknesses: [],
      overallScore: 60,
      riskTolerance: "medium",
      investmentStyle: "moderate",
    },
    project: {
      id: "p1",
      name: "测试品牌",
      stage: "成长期",
      category: "湘菜",
      target: "扩张",
      city: "长沙",
      district: null,
      budget: null,
      profile: null,
      healthScore: null,
      confidence: null,
    },
    memories: [],
    decisions: [],
    knowledge: { rules: [], cases: [], models: [] },
  } as MKContext;
}

describe("domain knowledge inject", () => {
  it("注入市场知识到 MKContext", () => {
    const ctx = injectDomainKnowledge(emptyCtx(), "market", "要不要进入市场扩张");
    expect(ctx.knowledge.rules.length).toBeGreaterThan(0);
    expect(formatKnowledgeBrief(ctx)).toContain("领域参考知识");
  });

  it("ActiveMeetingDraft schema 可解析最小草稿", () => {
    const parsed = ActiveMeetingDraftSchema.safeParse({
      topic: "要不要扩张",
      topicConfirmed: true,
      lifecycle: "DISCUSS",
      deliberationRound: 1,
      liveStatements: [],
      liveConflict: null,
      liveConsensus: null,
      liveOptions: [],
      selectedOptionId: null,
      focusChoice: null,
      serverSynthesis: null,
      meetingRuntime: null,
      updatedAt: new Date().toISOString(),
      status: "draft",
    });
    expect(parsed.success).toBe(true);
  });
});
