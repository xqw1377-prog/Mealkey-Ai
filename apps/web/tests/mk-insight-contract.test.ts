import { describe, expect, it } from "vitest";
import {
  assertCouncilIngressViaMkInsight,
  assertVerticalCouncilIngress,
  buildCouncilArchiveExtras,
  exampleSiteSelectionInsights,
  expertReportToInsights,
  insightsToExpertReport,
  mergeEvidencePacket,
  openDecisionRoom,
  toVerticalMkInsights,
  validateMkInsight,
  type ExpertReport,
} from "../../../packages/agents/src/founder-os";
import {
  createAgentConsultingProject,
  hasAgentConsultingSubstance,
} from "../../../packages/agents/src/consulting-os";
import { toMMktMkInsights } from "../../../packages/agents/src/m-mkt/consulting";
import { toMBizMkInsights } from "../../../packages/agents/src/m-biz/consulting";
import { toMEdMkInsights } from "../../../packages/agents/src/m-ed/consulting";

function seedMmkt() {
  const p = createAgentConsultingProject("m-mkt", "p1");
  p.intakeStatus = "complete";
  p.assets.research = {
    packId: "r1",
    status: "confirmed",
    headline: "年轻人口味缺口可进入",
    sections: [
      { title: "可进入缺口", body: "轻松地道的日常湘菜不足" },
      { title: "竞争格局", body: "酒楼过重、快餐无灵魂" },
    ],
    risks: ["同质化跟进", "流量成本上升"],
    generatedAt: new Date().toISOString(),
  };
  p.assets.advisors = {
    setId: "a1",
    status: "ready",
    conflictSummary: "速度 vs 密度",
    strategies: [
      {
        advisorId: "s1",
        oneLiner: "先占校园商圈",
        battlefield: "校园午晚市",
        differentiation: "小份社交",
        proof: "两周翻台",
        doNotDo: "不做宴请",
        risk: "客流季节性",
        rationale: "缺口清晰",
        entryScheme: {
          title: "校园轻进入",
          entryMode: "小店试点",
          sceneCut: "午晚市",
          menuPilot: ["招牌小炒"],
          killLine: "8周不回本停",
          weekProof: "连续14天客流",
          sacrifice: "不做宴请菜单",
          scorecard: [{ label: "机会", score: 78, note: "缺口明确" }],
          scripts: {
            storefront: "轻松地道",
            staffBrief: "快",
            forbidden: ["最正宗"],
          },
          marketingMoves: ["地推"],
          crossFireAmmo: "密度优先",
        },
      },
    ],
    generatedAt: new Date().toISOString(),
  };
  p.assets.warRoom = {
    roomId: "w1",
    status: "agreed",
    turns: [],
    consensusOneLiner: "以校园场景轻进入",
  };
  p.assets.decisionArtifact = {
    governingQuestion: "是否进入校园？",
    recommendation: "有条件进入",
    tradeoffAccepted: "放弃宴请",
    whyThis: ["缺口"],
    killCriteria: ["8周不回本"],
    mondayMoves: ["定址"],
    evidenceUsed: ["缺口扫描"],
    whatWeWontDo: ["不做酒楼"],
    builtAt: new Date().toISOString(),
  };
  return p;
}

describe("MKInsight Contract + 4+1 Adapters", () => {
  it("校验拒绝无证据 Insight", () => {
    const errors = validateMkInsight({
      id: "x",
      sourceAgent: "M-MKT",
      domain: "market",
      finding: "有机会",
      reasoning: "感觉",
      evidence: [],
      confidence: 0.8,
      impact: "推进",
    });
    expect(errors.some((e) => e.includes("evidence"))).toBe(true);
  });

  it("接入闸门：空 Insight 拒绝直进委员会", () => {
    expect(() =>
      assertCouncilIngressViaMkInsight({ insights: [], allowEmpty: false }),
    ).toThrow(/MKInsight/);
  });

  it("M-MKT Adapter 产出可校验 Insight，并可投影 ExpertReport", () => {
    const p = seedMmkt();
    expect(hasAgentConsultingSubstance(p)).toBe(true);
    const insights = toMMktMkInsights(p, { caseId: "CASE-1" });
    expect(insights.length).toBeGreaterThan(0);
    for (const i of insights) {
      expect(validateMkInsight(i)).toEqual([]);
      expect(i.sourceAgent).toBe("M-MKT");
    }
    const report = insightsToExpertReport(insights, "M-MKT", "CASE-1");
    expect(report.engineId).toBe("M-MKT");
    expect(report.sections.length).toBeGreaterThan(0);
  });

  it("M-BIZ / M-ED Adapter 可从实质资产产出 Insight", () => {
    const biz = createAgentConsultingProject("m-biz", "p2");
    biz.assets.research = {
      packId: "r2",
      status: "confirmed",
      headline: "单店模型可验证",
      sections: [{ title: "单位经济", body: "客单 48 毛利 62%" }],
      risks: ["人力成本"],
      generatedAt: new Date().toISOString(),
    };
    biz.assets.decisionArtifact = {
      governingQuestion: "模式是否成立",
      recommendation: "有条件成立",
      tradeoffAccepted: "先稳毛利",
      whyThis: ["UE"],
      killCriteria: ["毛利<55%"],
      mondayMoves: ["核算"],
      evidenceUsed: ["UE"],
      whatWeWontDo: ["盲目扩店"],
      builtAt: new Date().toISOString(),
    };
    expect(toMBizMkInsights(biz).length).toBeGreaterThan(0);

    const ed = createAgentConsultingProject("m-ed", "p3");
    ed.assets.research = {
      packId: "r3",
      status: "confirmed",
      headline: "控制权需锁死",
      sections: [{ title: "股权", body: "创始人需保留否决权" }],
      risks: ["稀释"],
      generatedAt: new Date().toISOString(),
    };
    ed.assets.decisionArtifact = {
      governingQuestion: "股权是否支撑",
      recommendation: "先签协议",
      tradeoffAccepted: "缓融资",
      whyThis: ["控制权"],
      killCriteria: ["失去否决"],
      mondayMoves: ["律师稿"],
      evidenceUsed: ["章程"],
      whatWeWontDo: ["裸稀释"],
      builtAt: new Date().toISOString(),
    };
    expect(toMEdMkInsights(ed).length).toBeGreaterThan(0);
  });

  it("ExpertReport ↔ Insight 桥接往返保持引擎", () => {
    const report: ExpertReport = {
      engineId: "M-MKT",
      caseId: "c1",
      headline: "市场可进",
      stanceHint: "cautious",
      sections: [
        {
          id: "market_scan",
          title: "市场扫描",
          content: "品类窗口存在，但需验证客流",
          evidenceIds: ["E1"],
        },
      ],
      risks: ["流量成本"],
    };
    const insights = expertReportToInsights(report);
    expect(insights.length).toBeGreaterThan(0);
    const back = insightsToExpertReport(insights, "M-MKT", "c1");
    expect(back.engineId).toBe("M-MKT");
  });

  it("垂直 Agent 必须经 Adapter 才可进委员会", () => {
    const insights = exampleSiteSelectionInsights("CASE-SITE");
    expect(insights.length).toBeGreaterThan(0);
    expect(insights[0]?.sourceAgent).toBe("L3-SITE");
    expect(() =>
      assertVerticalCouncilIngress({
        agentId: "L3-EMPTY",
        kind: "other",
        caseId: "x",
        findings: [],
      }),
    ).toThrow(/MKInsight/);
    const via = toVerticalMkInsights({
      agentId: "L3-MENU",
      kind: "menu",
      caseId: "m1",
      findings: [
        {
          domain: "sku",
          finding: "招牌品复购支撑试点",
          reasoning: "两周销售抽样",
          impact: "可进菜单试点",
          confidence: 0.7,
          evidence: [{ claim: "复购率 28%", type: "DATA" }],
        },
      ],
    });
    expect(via[0]?.domain).toBe("sku");
  });

  it("Insight 证据可并入 EvidencePacket，并可打开决策室", () => {
    const insights = toMMktMkInsights(seedMmkt(), { caseId: "CASE-DR" });
    const packet = mergeEvidencePacket({
      caseId: "CASE-DR",
      insights,
    });
    expect(packet.items.length).toBeGreaterThan(0);

    const report = insightsToExpertReport(insights, "M-MKT", "CASE-DR");
    const session = openDecisionRoom({
      topic: "要不要开校园店？",
      mode: "special",
      whyNow: "窗口临近必须拍板",
      decisionQuestion: "是否进入校园场景",
      constraints: "资金有限",
      successLooksLike: "8周验证客流",
      allowStubReports: true,
      roster: ["CMO", "CSO", "BMO"],
      expertReports: [report],
      insights,
      evidencePacket: packet,
    });
    expect(session.insights?.length).toBeGreaterThan(0);
    expect(session.expertReports.some((r) => r.engineId === "M-MKT")).toBe(
      true,
    );
    const extras = buildCouncilArchiveExtras(session);
    expect(extras.decisionContract.source).toBe("decision_council");
    expect(extras.expertOpinions.some((o) => o.expert === "M-MKT")).toBe(true);
    expect(extras.parentEvidenceIds.length).toBeGreaterThan(0);
  });
});
