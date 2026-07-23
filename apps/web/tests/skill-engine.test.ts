import { describe, expect, it } from "vitest";
import { emptyMobileAgentState } from "@/server/founder-layer/contracts/goal-compiler";
import {
  applySkillToState,
  evaluateDrillAnswer,
  DRILL_OWNER_REVENUE_DIAGNOSIS,
  isDrillStartUtterance,
  runSkillTurn,
  shouldHandleSkillTurn,
  skillResultToCompileOutput,
} from "@/server/founder-layer/skill-engine";

describe("Skill Engine V1", () => {
  it("识别陪练开场", () => {
    expect(isDrillStartUtterance("练习一下利润诊断")).toBe(true);
    expect(isDrillStartUtterance("营业额下降怎么办")).toBe(false);
  });

  it("好回答：变量拆解得分更高", () => {
    const good = evaluateDrillAnswer(
      DRILL_OWNER_REVENUE_DIAGNOSIS,
      "先别急着做活动。先对比上周差多少，再看是客流、转化、客单还是复购在变。",
    );
    const bad = evaluateDrillAnswer(
      DRILL_OWNER_REVENUE_DIAGNOSIS,
      "赶紧发优惠券，再做抖音加大投放，地推一波。",
    );
    expect(good.score).toBeGreaterThan(bad.score);
    expect(good.level).toBeGreaterThanOrEqual(2);
    expect(bad.rubricScores.find((r) => r.id === "no_spray")?.hit).toBe(false);
  });

  it("开场→作答→反馈资产", () => {
    expect(
      shouldHandleSkillTurn({
        trigger: "utterance",
        utterance: "练习一下营业额下降追问",
        activeDrill: null,
      }),
    ).toBe(true);

    const start = runSkillTurn({
      utterance: "练习一下营业额下降追问",
      activeDrill: null,
    });
    expect(start.kind).toBe("start");
    expect(start.coachText).toMatch(/客流/);

    const out1 = skillResultToCompileOutput(start, "proj_1", null);
    const state1 = applySkillToState(
      emptyMobileAgentState(),
      start,
      out1,
      "练习一下营业额下降追问",
    );
    expect(state1.activeDrill?.status).toBe("awaiting_answer");

    const evalResult = runSkillTurn({
      utterance:
        "我先问清楚比上周差多少，再拆客流、转化、客单和复购，确认变量后再谈动作。",
      activeDrill: state1.activeDrill,
    });
    expect(evalResult.kind).toBe("evaluate");
    expect(evalResult.evaluation?.score).toBeGreaterThanOrEqual(55);

    const out2 = skillResultToCompileOutput(evalResult, "proj_1", state1.activeGoal);
    const state2 = applySkillToState(state1, evalResult, out2, "回答");
    expect(state2.activeDrill?.status).toBe("completed");
    expect(state2.assets[0]?.body).toMatch(/陪练反馈/);
    expect(out2.trace.providersUsed).toContain("skill-engine.v1");
  });

  it("评完后普通经营话不劫持", () => {
    expect(
      shouldHandleSkillTurn({
        trigger: "utterance",
        utterance: "营业额下降怎么办",
        activeDrill: {
          drillId: "owner.revenue_diagnosis_v1",
          role: "owner",
          title: "x",
          startedAt: new Date().toISOString(),
          status: "completed",
          attemptCount: 1,
        },
      }),
    ).toBe(false);
  });
});
