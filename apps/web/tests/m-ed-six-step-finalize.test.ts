/**
 * M-ED 六步确认 → 治理合同冻结 / 签字就绪
 */
import { describe, expect, it } from "vitest";
import {
  createAgentConsultingProject,
  type DecisionArtifact,
  type WarRoomConsensus,
} from "../../../packages/agents/src/consulting-os";
import {
  assertMedConfirmReady,
  buildMedExecutionRoadmap,
  evaluateMedSignOffReadiness,
  finalizeSixStepGovernanceDeliverable,
  signMedStrategyReport,
  buildMedSignOffPackageMarkdown,
} from "../../../packages/agents/src/m-ed/consulting";

function decision(): DecisionArtifact {
  return {
    governingQuestion: "控制权、融资与激励三者，哪一条必须先锁死？",
    recommendation: "先锁控制权底线与否决事项，再谈融资",
    tradeoffAccepted: "接受融资节奏放缓；暂不做先分股后补协议",
    whyThis: ["先融资后补协议争议成本指数上升"],
    killCriteria: [
      "关键协议 30 天仍未落签 → 冻结融资",
      "控制权条款被稀释突破底线 → 否决本轮交易",
    ],
    mondayMoves: [
      "列出必须落签的 3 份文件",
      "写清控制权底线发给律师",
      "本周五复盘落签进度，逾期按否决冻结融资",
    ],
    evidenceUsed: [
      "口头承诺未成文风险已暴露",
      "先融资后补协议争议成本指数上升",
    ],
    whatWeWontDo: ["不做无否决条款的股权安排"],
    builtAt: new Date().toISOString(),
  };
}

function warAgreed(): WarRoomConsensus {
  return {
    roomId: "wr_ed",
    status: "agreed",
    turns: [],
    consensusOneLiner: "先锁控制权底线与否决事项，再谈融资",
    userPreference: "founder",
    agreedAt: new Date().toISOString(),
  };
}

function projectReady() {
  let p = createAgentConsultingProject("m-ed", "proj_ed");
  p = {
    ...p,
    intakeAnswers: {
      stage: "准备融资",
      topic: "股权与控制权",
      control: "创始人可拍板",
      team: "核心三人",
    },
    intakeStatus: "complete",
    assets: {
      research: {
        packId: "rp_ed",
        status: "confirmed",
        headline: "口头承诺未成文风险已暴露",
        sections: [
          { title: "本轮唯一问题", body: "先锁什么？" },
          { title: "所以呢（决策含义）", body: "先融资后补协议危险" },
          { title: "治理扫描", body: "否决事项未列" },
        ],
        risks: ["没有否决条款的股权安排 = 定时炸弹"],
        generatedAt: new Date().toISOString(),
        confirmedAt: new Date().toISOString(),
        collectionMode: "hybrid",
        sources: [
          "治理扫描 | 口头承诺未成文 | counsel://note",
          "否决事项清单 | 控制权底线未列 | counsel://list",
        ],
      },
      advisors: {
        setId: "as_ed",
        status: "ready",
        generatedAt: new Date().toISOString(),
        strategies: [
          {
            advisorId: "founder",
            oneLiner: "先锁控制权底线与否决事项，再谈融资",
            battlefield: "控制权",
            differentiation: "先锁再融",
            proof: "章程与股东协议",
            doNotDo: "不做先分股后补协议",
            risk: "融资变慢",
            rationale: "底线优先",
            governScheme: {
              seatId: "founder",
              title: "创始人案",
              lockFirst: "控制权底线",
              mustSign: ["章程", "股东协议", "vesting"],
              killLine: "30 天未落签停融资",
              weekProof: "律师清单发出",
              sacrifice: "暂缓估值谈判",
              scorecard: [{ label: "可控", score: 90, note: "强" }],
              scripts: {
                founderBrief: "先锁再融",
                counselBrief: "三份文件必须成文",
                forbidden: ["口头期权"],
              },
              nextMoves: ["发律师清单"],
              crossFireAmmo: "先融资后补会翻车",
            },
          },
          {
            advisorId: "capital",
            oneLiner: "先定估值与融资窗口",
            battlefield: "融资",
            differentiation: "速度",
            proof: "term sheet",
            doNotDo: "不做慢治理",
            risk: "控制权稀释",
            rationale: "窗口",
          },
        ],
        conflictSummary: "控制权与融资速度互斥",
      },
      warRoom: warAgreed(),
      decisionArtifact: decision(),
    },
  };
  return p;
}

describe("m-ed six-step finalize", () => {
  it("blocks confirm when research not confirmed", () => {
    const p = createAgentConsultingProject("m-ed", "empty");
    expect(() => assertMedConfirmReady(p)).toThrow(/证据未齐/);
  });

  it("freezes governance contract and reaches sign-off ready", () => {
    const p = projectReady();
    const d = decision();
    const war = warAgreed();
    const roadmap = buildMedExecutionRoadmap({
      oneLiner: d.recommendation,
      answers: p.intakeAnswers,
      advisors: p.assets.advisors,
      warRoom: war,
    });
    const { project, contract } = finalizeSixStepGovernanceDeliverable(p, {
      decision: d,
      warRoom: war,
      roadmap,
      strategyReportMarkdown: [
        "# 治理决策",
        "",
        "## 建议",
        "先锁控制权底线与否决事项，再谈融资；口头承诺不得替代成文协议。",
        "",
        "## 取舍",
        "接受融资节奏放缓；暂不做先分股后补协议，也不并行第二轮谈判。",
        "",
        "## 否决条件",
        "- 关键协议 30 天未落签 → 冻结融资",
        "- 否决事项清单未入章程 → 停止对外路演",
        "",
        "## 本周动作",
        "- 列出三份必须落签文件并发给律师",
        "- 召开一次控制权底线对齐会并纪要存档",
        "- 本周五复盘落签进度，逾期按否决冻结融资",
        "",
        "## 背景",
        "口头承诺未成文风险已暴露；先融资后补协议争议成本指数上升。本报告作为签字交付正文，须含建议、取舍、否决与本周动作。",
        "治理决策以控制权底线、否决事项清单与关键落签文件为硬门槛；未齐前不得对外路演或签署条款清单。",
        "若关键协议三十日内未落签，融资谈判一律冻结，并重新召开治理会议确认底线是否被突破。",
        "交付标准：建议、取舍、否决条件与本周动作四项齐全，且可追溯到调研来源与会议室共识。",
        "",
      ].join("\n"),
    });

    expect(contract.status).toBe("frozen");
    expect(project.assets.signOffStatus).toBe("in_review");
    expect(evaluateMedSignOffReadiness(project).ok).toBe(true);

    const signed = signMedStrategyReport(project, { signedBy: "创始人丙" });
    expect(signed.assets.signOffStatus).toBe("signed");
    expect(buildMedSignOffPackageMarkdown(signed)).toContain(
      "Governance Contract",
    );
  });
});
