import { describe, expect, it } from "vitest";
import {
  buildExpansionLearning,
  buildOperatingHabitFromLearning,
  habitReminderFromBrainPatterns,
  readHabitFromProfile,
} from "@/server/founder-layer/capability/decision-intelligence/learning";
import {
  FORBIDDEN_HABIT_UI_LABELS,
  PROFILE_HABIT_KEY,
} from "@/server/founder-layer/contracts/decision-habit";

describe("Learning → 经营决策习惯", () => {
  it("按 successBand 生成可复用 pattern", () => {
    const learning = buildExpansionLearning({
      decisionId: "dec_1",
      projectId: "proj_1",
      prediction: "条件推进更稳",
      actualResult: "利润承压，店长未独立",
      successBand: "fail",
      pre: { confidenceScore: 70 } as never,
      post: { confidenceScore: 45 } as never,
    });
    expect(learning.pattern).toMatch(/现金|店长|扩张/);
    expect(learning.difference).toContain("70");
  });

  it("投影文案用「经营特点」而非决策人格", () => {
    const learning = buildExpansionLearning({
      decisionId: "dec_2",
      projectId: "proj_1",
      prediction: "建议条件推进",
      actualResult: "90 天后店长可独立",
      successBand: "success",
    });
    const habit = buildOperatingHabitFromLearning({
      projectId: "proj_1",
      learning,
      successBand: "success",
    });
    expect(habit.schemaVersion).toBe(1);
    expect(habit.reminder).toContain("经营特点");
    expect(habit.traits).toContain("增长导向");
    expect(habit.sampleCount).toBe(1);
    for (const banned of FORBIDDEN_HABIT_UI_LABELS) {
      expect(habit.reminder).not.toContain(banned);
    }
  });

  it("累积 traits 与 sampleCount", () => {
    const learning = buildExpansionLearning({
      decisionId: "dec_3",
      projectId: "proj_1",
      prediction: "p",
      actualResult: "部分达标",
      successBand: "partial",
    });
    const habit = buildOperatingHabitFromLearning({
      projectId: "proj_1",
      learning,
      successBand: "partial",
      previous: {
        schemaVersion: 1,
        projectId: "proj_1",
        traits: ["增长导向"],
        reminder: "旧提醒",
        sampleCount: 2,
        updatedAt: "2020-01-01T00:00:00.000Z",
        sourceDecisionIds: ["dec_0"],
      },
      founderOverride: true,
    });
    expect(habit.sampleCount).toBe(3);
    expect(habit.traits).toContain("愿意坚持己见");
    expect(habit.sourceDecisionIds).toContain("dec_3");
  });

  it("从 profile / Brain patterns 读取习惯", () => {
    const fromProfile = readHabitFromProfile({
      [PROFILE_HABIT_KEY]: {
        schemaVersion: 1,
        projectId: "p",
        traits: ["边做边调"],
        reminder: "系统逐渐发现你的经营特点：边做边调。",
        sampleCount: 1,
        updatedAt: new Date().toISOString(),
        sourceDecisionIds: [],
      },
    });
    expect(fromProfile?.traits).toContain("边做边调");

    const fromBrain = habitReminderFromBrainPatterns(
      [
        {
          pattern: "门槛满足再扩张",
          insight: "现金缓冲是关键",
          confidence: 0.8,
        },
      ],
      "proj_1",
    );
    expect(fromBrain?.reminder).toContain("经营特点");
    expect(fromBrain?.lastLesson).toContain("现金");
  });
});
