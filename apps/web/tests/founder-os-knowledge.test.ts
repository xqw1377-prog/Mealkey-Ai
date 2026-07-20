import { describe, expect, it } from "vitest";
import {
  applyExpertLearning,
  buildCouncilRuntimePrompt,
  draftLearningFromCalibration,
  getKnowledgeBase,
  getLearningAdjustments,
  listKnowledgeBases,
  recallKnowledgeForIssue,
  suggestCasePacket,
} from "../../../packages/agents/src/founder-os";

describe("七常委知识资产体系 V1", () => {
  it("七席齐全且含六大库", () => {
    expect(listKnowledgeBases()).toHaveLength(7);
    const cso = getKnowledgeBase("CSO");
    expect(cso.methodology.some((m) => m.name.includes("McKinsey"))).toBe(true);
    expect(cso.frameworks[0]?.formula).toContain("机会吸引力");
    expect(cso.cases.some((c) => c.title.includes("瑞幸"))).toBe(true);
    expect(cso.failurePatterns.some((f) => f.pattern === "追风口")).toBe(true);
    expect(cso.questions.some((q) => q.question.includes("凭什么赢"))).toBe(true);
  });

  it("CMO 真洞察案例 vs 假需求失败模式", () => {
    const cmo = getKnowledgeBase("CMO");
    expect(cmo.cases[0]?.lesson).toContain("社交仪式");
    expect(cmo.failurePatterns.some((f) => f.pattern.includes("假需求"))).toBe(true);
  });

  it("BMO 核心问题是规模后利润是否增加", () => {
    const bmo = getKnowledgeBase("BMO");
    expect(bmo.mission).toContain("赚钱");
    expect(
      bmo.questions.some((q) => q.question.includes("规模扩大后利润")),
    ).toBe(true);
    expect(bmo.frameworks[0]?.formula).toContain("毛利");
  });

  it("COO 问老板离开30天", () => {
    const coo = getKnowledgeBase("COO");
    expect(coo.questions.some((q) => q.question.includes("30天"))).toBe(true);
  });

  it("Prompt 注入 Knowledge Assets", () => {
    const prompt = buildCouncilRuntimePrompt({
      roleId: "BMO",
      casePacket: suggestCasePacket({
        caseId: "D-kb",
        question: "要不要开第二家店",
      }),
      round: 1,
    });
    expect(prompt).toContain("Knowledge Assets");
    expect(prompt).toContain("失败模式");
    expect(prompt).toContain("餐饮利润链");
  });

  it("议题召回 + Expert Learning Loop", () => {
    const recalled = recallKnowledgeForIssue("BMO", "扩张会不会放大亏损");
    expect(recalled.failures.length).toBeGreaterThan(0);

    const draft = draftLearningFromCalibration({
      caseId: "D-kb",
      member: "BMO",
      reason: "低估人工上涨风险",
      actualResult: "人工成本超模型 12%",
    });
    expect(draft.suggestedWeightHint).toContain("人工");

    applyExpertLearning(draft);
    const adj = getLearningAdjustments("BMO");
    expect(adj.length).toBeGreaterThan(0);
    expect(adj[adj.length - 1]?.weight_hint).toContain("人工");

    const prompt2 = buildCouncilRuntimePrompt({
      roleId: "BMO",
      casePacket: suggestCasePacket({
        caseId: "D-kb2",
        question: "继续扩张吗",
      }),
      round: 1,
    });
    expect(prompt2).toContain("学习校准");
  });
});
