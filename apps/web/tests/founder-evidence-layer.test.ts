import { describe, expect, it } from "vitest";
import {
  attachEvidenceToDecisions,
  createEvidenceRegistry,
  MIN_EVIDENCE_PER_JUDGEMENT,
} from "@/server/founder-layer/evidence";
import { runFounderLoop } from "@/server/founder-layer";
import type { FounderDecision } from "@/server/founder-layer/contracts";

process.env.HEURISTIC_ONLY = process.env.HEURISTIC_ONLY ?? "true";

describe("Evidence Layer MVP", () => {
  it("Registry + Binding：每席至少 3 条证据并生成 Insight", () => {
    const registry = createEvidenceRegistry("proj-ev-1");
    const seed: FounderDecision = {
      decisionId: "d1",
      sourceAgent: "M-MKT",
      question: "是否进入长沙高端湘菜",
      judgement: "长沙高端湘菜存在价格带机会",
      confidence: 0.8,
      evidence: [
        { label: "供给", content: "500元以上湘菜品牌数量不足", confidence: 0.8 },
        { label: "需求", content: "长沙商务消费增长", confidence: 0.75 },
      ],
      risks: ["复购未验证"],
      nextSteps: ["测试3个月高端宴请套餐"],
    };

    const [bound] = attachEvidenceToDecisions({
      registry,
      projectId: "proj-ev-1",
      missionId: "mission-1",
      decisions: [seed],
    });

    expect(bound!.evidence.length).toBeGreaterThanOrEqual(MIN_EVIDENCE_PER_JUDGEMENT);
    expect(bound!.evidence.every((item) => Boolean(item.evidenceId))).toBe(true);
    expect(bound!.metadata?.insightId).toBeTruthy();
    expect(bound!.reasoning).toBeTruthy();
    expect(bound!.validation).toContain("测试");

    const pack = registry.toPack();
    expect(pack.nodes.some((n) => n.type === "INSIGHT")).toBe(true);
    expect(pack.relations.length).toBeGreaterThan(0);
  });

  it("Founder Loop 产出 evidencePack，且投影意见带证据", async () => {
    const result = await runFounderLoop({
      request: {
        requestId: "req-ev-1",
        projectId: "proj-ev-loop",
        userId: "user-ev-1",
        message: "我们要不要扩张到 100 家店？",
        companyContext: {
          companyId: "proj-ev-loop",
          basicInfo: {
            name: "测试品牌",
            industry: "湘菜快餐",
            city: "长沙",
            stage: "成长期",
          },
          business: { scale: "8 家店" },
          goals: ["一年开到 100 家"],
        },
        createdAt: new Date().toISOString(),
      },
    });

    expect(result.evidencePack.nodes.length).toBeGreaterThan(0);
    expect(result.decisions.every((d) => d.evidence.length >= MIN_EVIDENCE_PER_JUDGEMENT)).toBe(
      true,
    );
    expect(result.finalDecision.evidenceIds?.length).toBeGreaterThan(0);
    expect(result.memoryWrites.some((w) => w.payload?.kind === "evidence_pack")).toBe(true);
  }, 30000);
});
