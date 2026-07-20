import { describe, expect, it } from "vitest";
import {
  advanceMeetingStage,
  agendaToCasePacket,
  applyFounderOverride,
  assembleCouncilOutcome,
  buildAgendaBrief,
  classifyIssueLevel,
  closeDecisionMemory,
  createDecisionMemory,
  memoryFromBrief,
  resolveDualTrack,
  selectCouncilRoster,
} from "../../../packages/agents/src/founder-os";
import type { CouncilOpinion } from "../../../packages/agents/src/founder-os";

describe("FDC 运行规则 V1 — CDO / 双轨 / Memory", () => {
  it("CDO：开第二家店 → L2 + 经营常委花名册", () => {
    const agenda = buildAgendaBrief({
      topic: "我要不要开第二家店？",
      whyNow: "首店回本接近完成",
      constraints: ["现金不得低于 6 个月"],
    });
    expect(agenda.decisionType).toBe("store_expansion");
    expect(agenda.level).toBe("L2");
    expect(agenda.conveneCouncil).toBe(true);
    expect(agenda.roster.length).toBeGreaterThanOrEqual(3);
    expect(agenda.roster.length).toBeLessThanOrEqual(5);
    expect(agenda.founderRequired).toBe(false);
    expect(agenda.questionsToAnswer.length).toBeGreaterThan(0);

    const packet = agendaToCasePacket(agenda, "D-store-2");
    expect(packet.caseId).toBe("D-store-2");
    expect(packet.question).toContain("第二家店");
  });

  it("CDO：进入新城市 → L3 七席；融资 → L4", () => {
    expect(classifyIssueLevel("new_city_expansion")).toBe("L3");
    expect(selectCouncilRoster("L3", "new_city_expansion")).toHaveLength(7);
    expect(classifyIssueLevel("fundraising")).toBe("L4");
    expect(selectCouncilRoster("L1", "store_expansion")).toEqual([]);
  });

  it("五阶段可推进", () => {
    expect(advanceMeetingStage("agenda")).toBe("expert_input");
    expect(advanceMeetingStage("cross_examination")).toBe("resolution");
    expect(advanceMeetingStage("resolution")).toBe("done");
  });

  it("双轨：多数支持但 CFO 红线 → 暂缓", () => {
    const opinions: CouncilOpinion[] = [
      mk("CSO", "support", false),
      mk("CMO", "support", false),
      mk("CBO", "support", false),
      mk("BMO", "support", false),
      mk("CFO", "oppose", true, "现金流不足 6 个月", "改为先验证单店利润再扩"),
      mk("COO", "conditional", false),
      mk("CRO", "support", false),
    ];
    const dual = resolveDualTrack({
      decisionType: "store_expansion",
      opinions,
      level: "L2",
    });
    expect(dual.track_a.support).toBe(5);
    expect(dual.track_b.blocked).toBe(true);
    expect(dual.recommended_action).toBe("暂缓");
    expect(dual.track_b.red_flags[0]?.role).toBe("CFO");
  });

  it("Decision Memory 闭环 + Override 字段", () => {
    const agenda = buildAgendaBrief({ topic: "是否进入上海市场" });
    const casePacket = agendaToCasePacket(agenda, "D-SH");
    const opinions: CouncilOpinion[] = [
      mk("CSO", "support", false),
      mk("CMO", "conditional", false),
      mk("CBO", "conditional", false),
      mk("BMO", "oppose", false),
      mk("CFO", "oppose", true, "现金风险", "直营1店验证"),
      mk("COO", "conditional", false),
      mk("CRO", "conditional", false),
    ];
    const outcome = assembleCouncilOutcome({
      casePacket,
      expertReports: [],
      councilOpinions: opinions,
      founderConfirmed: true,
      level: "L3",
    });
    expect(outcome.resolution.recommended_action).toBe("暂缓");
    expect(outcome.resolution.majority_view[0]).toContain("Track A");

    const brief = applyFounderOverride({
      brief: outcome.brief,
      founderAction: "执行",
      whyDisagree: ["愿意用1店换高线城市位置"],
      coreJudgment: "上海是品牌势能关键节点",
      acceptedRisks: ["短期现金压力"],
      validationMethod: "12 周内单店回本曲线达标否则停",
    });
    expect(brief.founderOverride?.note.coreJudgment).toContain("势能");
    expect(brief.founderOverride?.note.validationMethod).toContain("12 周");

    const memory = memoryFromBrief(brief);
    expect(memory.decision).toBe("执行");
    expect(memory.objections.some((o) => o.includes("红线") || o.includes("CFO"))).toBe(
      true,
    );

    const closed = closeDecisionMemory(memory, {
      whatHappened: "首店达标",
      whoWasRight: "founder",
      lesson: "高线城市可先单店验证",
    });
    expect(closed.closedAt).toBeTruthy();
    expect(closed.outcome?.whoWasRight).toBe("founder");

    const fresh = createDecisionMemory({
      caseId: "D-x",
      resolution: outcome.resolution,
    });
    expect(fresh.memoryId).toMatch(/^DM-/);
  });
});

function mk(
  member: CouncilOpinion["member"],
  position: CouncilOpinion["position"],
  veto: boolean,
  veto_reason?: string,
  alt?: string,
): CouncilOpinion {
  return {
    member,
    position,
    confidence: 70,
    summary: `${member} ${position}`,
    reasoning: alt ? [`替代：${alt}`] : [],
    risks: [],
    conditions: alt ? [alt] : [],
    veto,
    veto_reason,
  };
}
