import { describe, expect, it } from "vitest";
import {
  createAgentConsultingProject,
  hasAgentConsultingSubstance,
  toMBizExpertReport,
  toMEdExpertReport,
  toMMktExpertReport,
} from "../../../packages/agents/src/consulting-os";
import { openDecisionRoom } from "../../../packages/agents/src/founder-os";

describe("三引擎 ExpertReport 适配器", () => {
  it("空壳项目无实质", () => {
    const p = createAgentConsultingProject("m-mkt", "p1");
    expect(hasAgentConsultingSubstance(p)).toBe(false);
  });

  it("M-MKT 产出四段市场进入意见", () => {
    const p = createAgentConsultingProject("m-mkt", "p1");
    p.intakeStatus = "complete";
    p.intakeAnswers = { city: "长沙", category: "湘菜", intent: "开二店" };
    p.assets.research = {
      packId: "r1",
      status: "confirmed",
      headline: "年轻人口味缺口可进入",
      sections: [
        { title: "可进入缺口", body: "轻松地道的日常湘菜不足" },
        { title: "竞争格局", body: "酒楼过重、快餐无灵魂" },
      ],
      risks: ["同质化跟进"],
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
            scripts: { storefront: "轻松地道", staffBrief: "快", forbidden: ["最正宗"] },
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

    expect(hasAgentConsultingSubstance(p)).toBe(true);
    const report = toMMktExpertReport(p, { caseId: "c1" });
    expect(report.engineId).toBe("M-MKT");
    expect(report.sections.map((s) => s.id)).toEqual([
      "scan",
      "choice",
      "proof",
      "execution",
    ]);
    expect(report.headline).toContain("校园");
    expect(report.stanceHint).toBe("favorable");
  });

  it("M-BIZ / M-ED engineId 正确", () => {
    const biz = createAgentConsultingProject("m-biz", "p1");
    biz.assets.research = {
      packId: "r",
      status: "ready",
      headline: "单店模型待验证",
      sections: [{ title: "单位经济", body: "毛利偏薄" }],
      risks: ["现金流"],
      generatedAt: "",
    };
    expect(toMBizExpertReport(biz).engineId).toBe("M-BIZ");

    const ed = createAgentConsultingProject("m-ed", "p1");
    ed.intakeAnswers = { control: "创始人控股", topic: "期权" };
    expect(toMEdExpertReport(ed).engineId).toBe("M-ED");
  });

  it("多引擎报告可一并喂入决策室", () => {
    const mkt = toMMktExpertReport({
      ...createAgentConsultingProject("m-mkt", "p1"),
      assets: {
        research: {
          packId: "r",
          status: "confirmed",
          headline: "市场可进",
          sections: [],
          risks: [],
          generatedAt: "",
        },
        warRoom: {
          roomId: "w",
          status: "agreed",
          turns: [],
          consensusOneLiner: "先试点再铺",
        },
      },
      intakeAnswers: { city: "长沙" },
      intakeStatus: "complete",
    });
    const biz = toMBizExpertReport({
      ...createAgentConsultingProject("m-biz", "p1"),
      assets: {
        decisionArtifact: {
          governingQuestion: "模式？",
          recommendation: "先验证单店",
          tradeoffAccepted: "缓扩张",
          whyThis: ["模型不稳"],
          killCriteria: ["连续三月亏损"],
          mondayMoves: ["算清单店"],
          evidenceUsed: [],
          whatWeWontDo: ["加盟"],
          builtAt: "",
        },
      },
      intakeAnswers: { stage: "验证" },
      intakeStatus: "complete",
    });

    const session = openDecisionRoom({
      topic: "要不要开第二家店？",
      mode: "major",
      whyNow: "单店回本接近完成，窗口期将过",
      decisionQuestion: "现在开第二家还是先把单店利润做稳？",
      constraints: "现金最多再撑六个月",
      successLooksLike: "90 天内有清晰回本曲线或明确不扩",
      allowStubReports: true,
      expertReports: [mkt, biz],
    });
    expect(session.expertReports.some((r) => r.engineId === "M-MKT")).toBe(true);
    expect(session.expertReports.some((r) => r.engineId === "M-BIZ")).toBe(true);
    expect(session.cdoNote).toMatch(/已挂载 \d+ 份 ExpertReport/);
  });
});
