import { afterEach, describe, expect, it, vi } from "vitest";
import {
  assertHostLlmAvailable,
  compileHostWithLlm,
} from "@/server/founder-layer/goal-compiler/llm-compile";
import { compileGoalTurn } from "@/server/founder-layer/goal-compiler";
import { emptyMobileAgentState } from "@/server/founder-layer/contracts/goal-compiler";

function scaffoldFromUtterance(utterance: string) {
  return compileGoalTurn(
    {
      restaurantRef: "proj_guard",
      trigger: "utterance",
      utterance,
    },
    { state: emptyMobileAgentState() },
  );
}

describe("mobile-agent host compile 护栏", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    delete process.env.HEURISTIC_ONLY;
    delete process.env.ALLOW_COMPILER_STUB;
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  it("HEURISTIC_ONLY=true → assertHostLlmAvailable 拒绝", () => {
    vi.stubEnv("HEURISTIC_ONLY", "true");
    process.env.DEEPSEEK_API_KEY = "sk-test";
    const gate = assertHostLlmAvailable();
    expect(gate.ok).toBe(false);
    if (!gate.ok) expect(gate.reason).toMatch(/HEURISTIC_ONLY/);
  });

  it("未配密钥且无 stub → compileHostWithLlm 抛错", async () => {
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.ALLOW_COMPILER_STUB;
    delete process.env.HEURISTIC_ONLY;

    const scaffold = scaffoldFromUtterance("最近生意不好");
    await expect(
      compileHostWithLlm({ scaffold, utterance: "最近生意不好" }),
    ).rejects.toThrow(/大模型|DEEPSEEK|OPENAI|宿主/);
  });

  it("ALLOW_COMPILER_STUB=1 → 可降级 stub，并标记 degraded", async () => {
    process.env.ALLOW_COMPILER_STUB = "1";
    delete process.env.DEEPSEEK_API_KEY;
    delete process.env.OPENAI_API_KEY;

    const scaffold = scaffoldFromUtterance("最近生意不好");
    const { output, meta } = await compileHostWithLlm({
      scaffold,
      utterance: "最近生意不好",
    });
    expect(meta.stub).toBe(true);
    expect(meta.usedLlm).toBe(false);
    expect(output.bossSummary).toMatch(/开发桩|无模型/);
    expect(output.trace.degraded).toBe(true);
  });
});
