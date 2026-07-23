import { describe, expect, it } from "vitest";
import {
  buildChoicePrompts,
  resolveBehaviorState,
} from "@/server/founder-layer/goal-compiler/interaction-hints";

describe("Interaction hints", () => {
  it("诊断态 + 变量选项", () => {
    expect(
      resolveBehaviorState({
        mode: "compile",
        goalType: "diagnose_performance",
        utterance: "营业额下降",
        hasQuestions: true,
        hasArtifacts: false,
        goalStatus: "blocked",
      }),
    ).toBe("diagnose");

    const chips = buildChoicePrompts([
      { slot: "which_variable", prompt: "哪个变量" },
    ]);
    expect(chips[0]?.options.length).toBe(4);
    expect(chips[0]?.options.map((o) => o.value).join(",")).toMatch(/客流/);
  });
});
