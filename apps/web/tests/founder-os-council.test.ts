import { describe, expect, it } from "vitest";
import {
  applyFounderOverride,
  assembleCouncilOutcome,
  buildBlindRoundPrompts,
  buildCouncilRuntimePrompt,
  suggestCasePacket,
  weightsToPercent,
} from "../../../packages/agents/src/founder-os";
import type { CouncilOpinion, ExpertReport } from "../../../packages/agents/src/founder-os";

describe("Founder OS Expert × Council", () => {
  const casePacket = suggestCasePacket({
    caseId: "D-001",
    question: "是否进入上海市场",
    objective: "一年验证首店模型",
    founderView: {
      position: "倾向支持",
      why: ["高线城市品牌溢价"],
      constraints: ["不能现金流失控"],
    },
  });

  const expertReports: ExpertReport[] = [
    {
      engineId: "M-MKT",
      caseId: "D-001",
      headline: "上海有消费升级窗口，竞争密度高",
      stanceHint: "cautious",
      sections: [
        { id: "growth_window", title: "增长窗口", content: "上海消费升级" },
        { id: "risks", title: "风险", content: "竞争密度高" },
      ],
      opportunities: ["上海消费升级"],
      risks: ["竞争密度高"],
    },
    {
      engineId: "M-PNT",
      caseId: "D-001",
      headline: "可进入，须强化湖南文化差异",
      stanceHint: "favorable",
      sections: [
        {
          id: "positioning",
          title: "定位",
          content: "必须强化湖南文化差异",
        },
      ],
      conditions: ["必须强化湖南文化差异"],
    },
    {
      engineId: "M-BIZ",
      caseId: "D-001",
      headline: "当前模型撑不住上海租金",
      stanceHint: "unfavorable",
      sections: [
        {
          id: "unit_economics",
          title: "单店模型",
          content: "目前无法支撑上海租金",
        },
      ],
      risks: ["单店模型不成立"],
    },
    {
      engineId: "M-ED",
      caseId: "D-001",
      headline: "建议直营1店验证，勿融资扩张",
      stanceHint: "cautious",
      sections: [
        {
          id: "fundraising",
          title: "融资方案",
          content: "建议直营1店验证，不要融资扩张",
        },
      ],
      conditions: ["直营1店验证", "不要融资扩张"],
    },
  ];

  it("classify new_city_expansion and required engines", () => {
    expect(casePacket.decisionType).toBe("new_city_expansion");
    expect(casePacket.requiredAgents).toEqual(
      expect.arrayContaining(["M-MKT", "M-PNT", "M-BIZ", "M-ED"]),
    );
  });

  it("council prompt consumes expert reports and forbids re-research", () => {
    const prompt = buildCouncilRuntimePrompt({
      roleId: "BMO",
      casePacket,
      expertReports,
      round: 1,
    });
    expect(prompt).toContain("只消费，不重研");
    expect(prompt).toContain("目前无法支撑上海租金");
    expect(prompt).toContain("禁止二次分析");
    expect(prompt).toContain("是否盈利、可否复制？");
  });

  it("builds seven blind prompts", () => {
    const prompts = buildBlindRoundPrompts({ casePacket, expertReports });
    expect(Object.keys(prompts)).toHaveLength(7);
    expect(prompts.CFO).toContain("Expert Reports");
  });

  it("assembles Decision Brief with veto → 暂缓", () => {
    const opinions: CouncilOpinion[] = [
      {
        member: "CSO",
        position: "support",
        confidence: 70,
        summary: "五年后上海重要",
        reasoning: ["窗口"],
        risks: ["资源"],
        conditions: [],
        veto: false,
      },
      {
        member: "CMO",
        position: "conditional",
        confidence: 60,
        summary: "需求存在但竞争密",
        reasoning: [],
        risks: ["竞争"],
        conditions: ["验证需求"],
        veto: false,
      },
      {
        member: "CBO",
        position: "conditional",
        confidence: 65,
        summary: "可进但要差异",
        reasoning: [],
        risks: ["稀释"],
        conditions: ["强化湖南差异"],
        veto: false,
      },
      {
        member: "BMO",
        position: "oppose",
        confidence: 80,
        summary: "模型不成立",
        reasoning: ["租金"],
        risks: ["亏损放大"],
        conditions: [],
        veto: false,
      },
      {
        member: "CFO",
        position: "oppose",
        confidence: 85,
        summary: "现金风险过高",
        reasoning: ["租金与回本"],
        risks: ["现金流断裂"],
        conditions: [],
        veto: true,
        veto_reason: "现金流断裂风险",
      },
      {
        member: "COO",
        position: "conditional",
        confidence: 55,
        summary: "可试点不可规模复制",
        reasoning: [],
        risks: ["标准化不足"],
        conditions: ["先1店"],
        veto: false,
      },
      {
        member: "CRO",
        position: "conditional",
        confidence: 60,
        summary: "声誉风险可控若慢进",
        reasoning: [],
        risks: ["失败舆情"],
        conditions: ["停损阈值"],
        veto: false,
      },
    ];

    const result = assembleCouncilOutcome({
      casePacket,
      expertReports,
      councilOpinions: opinions,
      founderConfirmed: true,
    });

    expect(result.resolution.recommended_action).toBe("暂缓");
    expect(result.resolution.veto_flags?.some((v) => v.startsWith("CFO"))).toBe(
      true,
    );
    expect(result.brief.expertReports).toHaveLength(4);
    expect(result.brief.learningHook?.outcomeStatus).toBe("pending");

    const overridden = applyFounderOverride({
      brief: result.brief,
      founderAction: "执行",
      whyDisagree: ["愿意用1店验证换取高线城市位置"],
      acceptedRisks: ["短期现金压力"],
    });
    expect(overridden.founderOverride?.overrode).toBe(true);
    expect(overridden.founderOverride?.finalAction).toBe("执行");
    expect(overridden.founderOverride?.note.whyDisagree[0]).toContain("1店");
  });

  it("normalizes weights to percent", () => {
    const pct = weightsToPercent("new_city_expansion");
    const sum = Object.values(pct).reduce((a, b) => a + b, 0);
    expect(sum).toBeGreaterThan(0.99);
    expect(sum).toBeLessThan(1.01);
  });
});
