/**
 * M-MKT 六步确认 → 进入合同冻结 / 签字就绪
 */
import { describe, expect, it } from "vitest";
import {
  createAgentConsultingProject,
  type DecisionArtifact,
  type WarRoomConsensus,
} from "../../../packages/agents/src/consulting-os";
import {
  assertMmktConfirmReady,
  buildMmktExecutionRoadmap,
  evaluateMmktSignOffReadiness,
  finalizeSixStepEntryDeliverable,
  signMmktStrategyReport,
  buildMmktSignOffPackageMarkdown,
} from "../../../packages/agents/src/m-mkt/consulting";

function decision(): DecisionArtifact {
  return {
    governingQuestion: "在成都·烤鱼下，是否进入以及用哪种进入方式？",
    recommendation: "先以白领下班场景试点，不扩第二点",
    tradeoffAccepted: "接受场景收窄；暂不做全城铺开",
    whyThis: ["连锁挤压下切口必须可证明复购"],
    killCriteria: [
      "试点 8 周复购无提升 → 换切口或止损",
      "人效连续 4 周不达门槛 → 停止放量",
    ],
    mondayMoves: [
      "写一页《进入作战卡》",
      "选定唯一试点店贴出主推",
      "本周五复盘复购证明点，未达标按否决停手",
    ],
    evidenceUsed: [
      "区域客流向写字楼商圈集中",
      "连锁挤压下切口必须可证明复购",
    ],
    whatWeWontDo: ["不做无杀出线的扩张"],
    builtAt: new Date().toISOString(),
  };
}

function warAgreed(): WarRoomConsensus {
  return {
    roomId: "wr_mkt",
    status: "agreed",
    turns: [],
    consensusOneLiner: "先以白领下班场景试点，不扩第二点",
    userPreference: "ops",
    agreedAt: new Date().toISOString(),
  };
}

function projectReady() {
  let p = createAgentConsultingProject("m-mkt", "proj_mkt");
  p = {
    ...p,
    intakeAnswers: {
      city: "成都",
      category: "烤鱼",
      intent: "开第二家",
      constraint: "预算有限",
    },
    intakeStatus: "complete",
    assets: {
      research: {
        packId: "rp_mkt",
        status: "confirmed",
        headline: "区域客流向写字楼商圈集中",
        sections: [
          { title: "本轮唯一问题", body: "如何进入？" },
          { title: "所以呢（决策含义）", body: "切口不清会被两头挤压" },
          { title: "市场扫描", body: "下班小聚高频" },
        ],
        risks: ["没有杀出线的进入 = 烧钱试错"],
        generatedAt: new Date().toISOString(),
        confirmedAt: new Date().toISOString(),
        collectionMode: "hybrid",
        sources: [
          "成都烤鱼市场格局 | 写字楼商圈客流集中 | https://example.com/a",
          "探鱼口碑 | 聚会场景高频 | https://example.com/b",
        ],
      },
      advisors: {
        setId: "as_mkt",
        status: "ready",
        generatedAt: new Date().toISOString(),
        strategies: [
          {
            advisorId: "ops",
            oneLiner: "先以白领下班场景试点，不扩第二点",
            battlefield: "写字楼商圈",
            differentiation: "场景优先",
            proof: "复购与原话",
            doNotDo: "不做全城铺开",
            risk: "增长慢",
            rationale: "先证明再放量",
            entryScheme: {
              seatId: "ops",
              title: "经营进入案",
              entryMode: "单店场景试点",
              sceneCut: "白领下班小聚",
              menuPilot: ["鲜椒双人餐"],
              killLine: "8 周复购无提升止损",
              weekProof: "20 条原话",
              sacrifice: "暂缓第二点",
              scorecard: [{ label: "可执行", score: 88, note: "强" }],
              scripts: {
                storefront: "今晚就吃这一档",
                staffBrief: "只推双人餐",
                forbidden: ["推全菜单"],
              },
              marketingMoves: ["商圈地推"],
              crossFireAmmo: "扩店会稀释证明",
            },
          },
          {
            advisorId: "invest",
            oneLiner: "快速多点验证后融资",
            battlefield: "城市份额",
            differentiation: "速度",
            proof: "开店数",
            doNotDo: "不做慢试点",
            risk: "烧钱",
            rationale: "占位",
          },
        ],
        conflictSummary: "试点与快扩互斥",
      },
      warRoom: warAgreed(),
      decisionArtifact: decision(),
    },
  };
  return p;
}

describe("m-mkt six-step finalize", () => {
  it("blocks confirm when research not confirmed", () => {
    const p = createAgentConsultingProject("m-mkt", "empty");
    expect(() => assertMmktConfirmReady(p)).toThrow(/证据未齐/);
  });

  it("freezes entry contract and reaches sign-off ready", () => {
    const p = projectReady();
    const d = decision();
    const war = warAgreed();
    const roadmap = buildMmktExecutionRoadmap({
      oneLiner: d.recommendation,
      answers: p.intakeAnswers,
      advisors: p.assets.advisors,
      warRoom: war,
    });
    const { project, contract } = finalizeSixStepEntryDeliverable(p, {
      decision: d,
      warRoom: war,
      roadmap,
      strategyReportMarkdown: [
        "# 进入决策",
        "",
        "## 建议",
        "先以白领下班场景试点，不扩第二点。切口必须可复述、可度量复购，否则不进入第二点。",
        "",
        "## 取舍",
        "接受场景收窄与短期增速放缓；暂不做全城铺开，也不并行第二战场。",
        "",
        "## 否决条件",
        "- 试点 8 周复购无提升 → 换切口或止损",
        "- 人效连续 4 周不达门槛 → 停止放量",
        "",
        "## 本周动作",
        "- 写一页《进入作战卡》并选定唯一试点店",
        "- 贴出主推并收集 20 条顾客原话",
        "- 本周五复盘复购证明点，未达标按否决停手",
        "",
        "## 背景",
        "区域客流向写字楼商圈集中；连锁挤压下切口必须可证明复购。本报告作为签字交付正文，须含建议、取舍、否决与本周动作。",
        "进入动作以单店场景试点为唯一路径：主推菜、店员话术、杀出线与周证明四件套同时落地，否则视为未完成进入决策。",
        "若 8 周内不能用复购与原话证明切口成立，则停止放量并重新开会，不得用「再试一家」稀释证据。",
        "交付标准：建议、取舍、否决条件与本周动作四项齐全，且可追溯到调研来源与会议室共识。",
        "",
      ].join("\n"),
    });

    expect(contract.status).toBe("frozen");
    expect(project.assets.signOffStatus).toBe("in_review");
    expect(evaluateMmktSignOffReadiness(project).ok).toBe(true);

    const signed = signMmktStrategyReport(project, { signedBy: "创始人乙" });
    expect(signed.assets.signOffStatus).toBe("signed");
    expect(buildMmktSignOffPackageMarkdown(signed)).toContain("Entry Contract");
  });
});
