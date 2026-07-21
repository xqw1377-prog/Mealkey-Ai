import { describe, expect, it } from "vitest";
import {
  buildHeuristicOpinions,
  evaluateAgendaReadiness,
  resolveRound3Heuristic,
  upsertAgendaBrief,
} from "../../../packages/agents/src/founder-os";
import {
  buildDecisionBriefFromFocus,
  buildDecisionBriefFromWorldChange,
} from "@/lib/decision-brief-from-scan";
import { worldChangesToEvidenceItems } from "@/server/founder-layer/council/council-world-evidence";

describe("启发式意见 · 世界变化证据引用", () => {
  it("无席位引擎匹配时仍引用 WC/BR 证据，并生成质询", () => {
    const packet = {
      caseId: "DR-x",
      items: [
        {
          evidenceId: "WC-DR-x-wc1",
          sourceAgent: "WORLD",
          claim: "周边竞品加套餐，晚餐客流承压",
          strength: "strong" as const,
          category: "competition",
        },
        {
          evidenceId: "BR-DR-x-1",
          sourceAgent: "BRAIN",
          claim: "定位：轻松湖南聚餐",
          strength: "medium" as const,
          category: "brain_fact",
        },
      ],
      gaps: ["Brain未知：第二店长是否可独立？"],
    };
    const opinions = buildHeuristicOpinions({
      roster: ["CSO", "CFO", "CMO"],
      topic: "要不要跟进晚餐套餐？",
      evidencePacket: packet,
    });
    expect(opinions.every((o) => (o.evidence_used || []).length > 0)).toBe(
      true,
    );
    expect(
      opinions.some((o) =>
        (o.evidence_used || []).some((id) => id.startsWith("WC-")),
      ),
    ).toBe(true);
    expect(opinions.some((o) => /依据：/.test(o.judgment || ""))).toBe(true);
    const cfo = opinions.find((o) => o.member === "CFO");
    expect((cfo?.challenge_to_others || []).length).toBeGreaterThan(0);
  });
});

describe("议程就绪 · 证据软提醒", () => {
  it("就绪摘要包含证据条数与缺口", () => {
    const brief = upsertAgendaBrief(undefined, {
      topic: "要不要跟进套餐",
      whyNow: "竞品已动",
      decisionQuestion: "现在跟进还是观察？",
      constraints: "现金与人力有限",
      successLooksLike: "7天内有验证结果",
    });
    const ready = evaluateAgendaReadiness({
      brief,
      substanceReportCount: 1,
      evidenceItemCount: 4,
      evidenceGaps: ["m-biz 强度不足"],
    });
    expect(ready.ok).toBe(true);
    expect(ready.summary).toMatch(/证据 4/);
    expect(ready.summary).toMatch(/m-biz/);
  });

  it("缺口较多时未勾选 allowGaps 则不可开会", () => {
    const brief = upsertAgendaBrief(undefined, {
      topic: "要不要跟进套餐",
      whyNow: "竞品已动",
      decisionQuestion: "现在跟进还是观察？",
      constraints: "现金与人力有限",
      successLooksLike: "7天内有验证结果",
    });
    const blocked = evaluateAgendaReadiness({
      brief,
      substanceReportCount: 1,
      evidenceItemCount: 3,
      evidenceGaps: ["缺口A", "缺口B"],
    });
    expect(blocked.ok).toBe(false);
    expect(blocked.requiresAllowGaps).toBe(true);

    const allowed = evaluateAgendaReadiness({
      brief,
      substanceReportCount: 1,
      evidenceItemCount: 3,
      evidenceGaps: ["缺口A", "缺口B"],
      allowGaps: true,
    });
    expect(allowed.ok).toBe(true);
    expect(allowed.summary).toMatch(/带着缺口/);
  });
});

describe("今日决策 Brief 加厚", () => {
  it("世界变化 brief 写入已知/未知约束", () => {
    const brief = buildDecisionBriefFromWorldChange({
      title: "市场策略待签字",
      detail: "已确认尚未签字",
      decisionTopic: "是否完成市场决策签字？",
      known: ["定位已钉"],
      missing: ["单店利润"],
      restaurantName: "南门店",
    });
    expect(brief.decisionQuestion).toContain("签字");
    expect(brief.constraints).toMatch(/单店利润/);
    expect(brief.successLooksLike).toMatch(/定位已钉/);
    expect(brief.whyNow).toMatch(/南门店/);
  });

  it("Focus brief 可开会字段齐全", () => {
    const brief = buildDecisionBriefFromFocus({
      title: "是否先补齐商业关键证据再开会？",
      whyToday: "证据仍薄",
      known: ["客群清晰"],
      missing: ["单位经济"],
    });
    expect(brief.topic.length).toBeGreaterThan(8);
    expect(brief.whyNow).toContain("证据");
    expect(brief.constraints.length).toBeGreaterThan(10);
  });
});

describe("审计 follow-up · sourceAgent / Round3", () => {
  it("世界变化证据带 sourceAgent=WORLD", () => {
    const items = worldChangesToEvidenceItems(
      [
        {
          id: "wc1",
          kind: "competition",
          title: "竞品加套餐",
          detail: "对面新店",
        },
      ],
      "DR-f",
    );
    expect(items[0]!.sourceAgent).toBe("WORLD");
  });

  it("Round3：有缺口且无强证引用时 support 改判 conditional", () => {
    const packet = {
      caseId: "c",
      items: [
        {
          evidenceId: "WC-1",
          sourceAgent: "WORLD",
          claim: "弱线索",
          strength: "weak" as const,
        },
      ],
      gaps: ["缺单店利润硬证"],
    };
    const round3 = resolveRound3Heuristic({
      round1Opinions: [
        {
          member: "CSO",
          position: "support",
          confidence: 80,
          summary: "推进",
          judgment: "推进",
          reasoning: [],
          risks: [],
          conditions: [],
          veto: false,
          evidence_used: ["WC-1"],
        },
      ],
      round2Responses: [],
      examinationPacket: [],
      calibrationHints: {} as never,
      scenarioSummaries: {} as never,
      evidencePacket: packet,
    });
    expect(round3[0]!.position).toBe("conditional");
    expect(round3[0]!.change_of_view).toBe(true);
    expect(round3[0]!.change_reason).toMatch(/缺口|证据/);
  });
});
