/**
 * M-MKT / M-BIZ / M-ED / 决策室 — 采集对齐 M-PNT
 */
import { describe, expect, it } from "vitest";
import {
  upsertModuleBasics,
  generateModuleFollowups,
  answerAdaptiveFollowup,
  compileModuleIntakeAnswers,
  evaluateAgentIntakeChecklist,
} from "../../../packages/agents/src/consulting-os";
import {
  upsertAgendaBrief,
  evaluateAgendaReadiness,
  assertAgendaReady,
} from "../../../packages/agents/src/founder-os";

describe("ModuleIntakeAlignment", () => {
  it("m-mkt blocks research without basics+followups", () => {
    const c = evaluateAgentIntakeChecklist({
      agentId: "m-mkt",
      basics: null,
      followups: null,
      research: null,
    });
    expect(c.canRunResearch).toBe(false);
    expect(c.canConfirmResearch).toBe(false);
  });

  it("m-biz completes intake then allows engine research confirm", () => {
    let basics = upsertModuleBasics("m-biz", undefined, {
      brandName: "味本源",
      stage: "单店验证期",
      pain: "能赚钱但不稳，波动大",
      priority: "先把利润做稳",
      resource: "现金紧",
      avgTicket: "人均78",
      unitEconomics: "月流水38万，毛利约55%",
      storeCount: "直营1家",
      repeatSignal: "老客约占四成，主要靠社群",
    });
    expect(basics.status).toBe("complete");
    let followups = generateModuleFollowups("m-biz", basics);
    for (const q of followups.questions.filter((x) => x.priority === "must")) {
      followups = answerAdaptiveFollowup(
        followups,
        q.id,
        `经营事实回答 ${q.id}`,
      );
    }
    expect(followups.status).toBe("ready_to_compile");
    const answers = compileModuleIntakeAnswers("m-biz", basics, followups);
    expect(answers.stage).toBeTruthy();
    expect(answers.northStar || answers.fq_north_star).toBeTruthy();

    const c = evaluateAgentIntakeChecklist({
      agentId: "m-biz",
      basics,
      followups: { ...followups, status: "compiled" },
      research: {
        status: "ready",
        collectionMode: "engine",
        sections: [{}, {}, {}],
        sources: [],
      },
    });
    expect(c.canCompleteIntake).toBe(true);
    expect(c.canConfirmResearch).toBe(true);
  });

  it("m-ed generates control/dilution followups", () => {
    const basics = upsertModuleBasics("m-ed", undefined, {
      companyName: "味本源餐饮",
      stage: "准备融资",
      topic: "融资会不会稀释失控",
      control: "必须保持控股与最终拍板",
      team: "2 位创始人主创",
      founderCount: "2人，口头约定未签",
      capTableNow: "A 60% / B 40%，无期权池",
      raisePlan: "谈天使300万",
      vesting: "暂无",
    });
    const fu = generateModuleFollowups("m-ed", basics);
    const ids = fu.questions.map((q) => q.id);
    expect(ids).toContain("fq_decision_rights");
    expect(ids).toContain("fq_dilution");
    expect(ids).toContain("fq_paper");
  });
});

describe("DecisionAgendaBrief", () => {
  it("blocks open without brief", () => {
    const readiness = evaluateAgendaReadiness({
      brief: upsertAgendaBrief(undefined, { topic: "要不要开第二家" }),
      substanceReportCount: 0,
    });
    expect(readiness.ok).toBe(false);
    expect(() => assertAgendaReady(readiness)).toThrow(/未完成/);
  });

  it("allows open with complete brief + stub ack", () => {
    const brief = upsertAgendaBrief(undefined, {
      topic: "要不要开第二家店",
      whyNow: "租约将到期，必须本季决定",
      decisionQuestion: "现在开第二家还是先把单店利润做稳？",
      constraints: "现金最多再撑 6 个月，不能同时装修两家",
      successLooksLike: "90 天内第二店回本曲线清晰或明确不扩",
    });
    expect(brief.status).toBe("complete");
    const readiness = evaluateAgendaReadiness({
      brief,
      substanceReportCount: 0,
      allowStub: true,
    });
    expect(readiness.ok).toBe(true);
  });
});
