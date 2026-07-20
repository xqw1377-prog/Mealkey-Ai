/**
 * M-BIZ 六步确认 → 模式合同冻结 / 签字就绪
 */
import { describe, expect, it } from "vitest";
import {
  createAgentConsultingProject,
  type DecisionArtifact,
  type WarRoomConsensus,
} from "../../../packages/agents/src/consulting-os";
import {
  assertMbizConfirmReady,
  buildMbizExecutionRoadmap,
  evaluateMbizSignOffReadiness,
  finalizeSixStepModeDeliverable,
  signMbizStrategyReport,
  buildMbizSignOffPackageMarkdown,
} from "../../../packages/agents/src/m-biz/consulting";

function decision(): DecisionArtifact {
  return {
    governingQuestion: "未来 90 天主航道押利润还是增长？",
    recommendation: "90 天只押主推毛利，砍活动线",
    tradeoffAccepted: "接受毛利优先；暂不把拉新活动当同期主航道",
    whyThis: ["单位经济未稳时扩量会烧现金", "会议拍板形成主策"],
    killCriteria: [
      "北极星连续 4 周无改善 → 回委员会改航道",
      "主推品无法证明模式 → 砍菜单宽度",
    ],
    mondayMoves: [
      "全员对齐唯一北极星：利润",
      "砍掉与主航道冲突的会议",
      "本周五复盘北极星证明点，未达标按否决停手",
    ],
    evidenceUsed: [
      "单位经济扫描显示活动线吞噬毛利",
      "三线并行会继续消耗现金与注意力",
    ],
    whatWeWontDo: ["不做三线并行"],
    builtAt: new Date().toISOString(),
  };
}

function warAgreed(): WarRoomConsensus {
  return {
    roomId: "wr_biz",
    status: "agreed",
    turns: [],
    consensusOneLiner: "90 天只押主推毛利，砍活动线",
    userPreference: "finance",
    agreedAt: new Date().toISOString(),
  };
}

function projectReady() {
  let p = createAgentConsultingProject("m-biz", "proj_biz");
  p = {
    ...p,
    intakeAnswers: {
      stage: "单店盈利",
      pain: "活动多但利润薄",
      priority: "利润",
      resource: "店长+主厨",
    },
    intakeStatus: "complete",
    assets: {
      research: {
        packId: "rp1",
        status: "confirmed",
        headline: "单位经济扫描显示活动线吞噬毛利",
        sections: [
          { title: "本轮唯一问题", body: "主航道押谁？" },
          { title: "所以呢（决策含义）", body: "不冻主航道会继续烧现金" },
          { title: "模式扫描", body: "活动线 ROI 弱于主推" },
        ],
        risks: ["三线并行"],
        generatedAt: new Date().toISOString(),
        confirmedAt: new Date().toISOString(),
        collectionMode: "hybrid",
        sources: [
          "单位经济扫描 | 活动线吞噬毛利 | local://scan",
          "主推占比周报 | 活动线 ROI 弱 | local://ops",
        ],
      },
      advisors: {
        setId: "as1",
        status: "ready",
        generatedAt: new Date().toISOString(),
        strategies: [
          {
            advisorId: "finance",
            oneLiner: "90 天只押主推毛利，砍活动线",
            battlefield: "单位经济",
            differentiation: "先毛利后规模",
            proof: "主推占比与毛利周报",
            doNotDo: "不做活动轰炸",
            risk: "增长变慢",
            rationale: "现金优先",
            modeScheme: {
              seatId: "finance",
              title: "财务官方案",
              northStar: "主推毛利率周环比改善",
              proofPlan: ["毛利表", "主推占比"],
              killLine: "4 周无改善改航道",
              weekProof: "周五三张表",
              sacrifice: "暂缓拉新活动",
              scorecard: [
                { label: "利润", score: 90, note: "主轴" },
              ],
              scripts: {
                allHands: "本周只谈毛利",
                weeklyReview: "周五只复盘主轴",
                forbidden: ["再开一条活动线"],
              },
              operatingMoves: ["砍活动预算"],
              crossFireAmmo: "活动线 ROI 不达标",
            },
          },
          {
            advisorId: "strategy",
            oneLiner: "先占心智再谈利润",
            battlefield: "品牌",
            differentiation: "增长优先",
            proof: "曝光",
            doNotDo: "不做收缩",
            risk: "烧钱",
            rationale: "份额",
          },
        ],
        conflictSummary: "利润与增长互斥",
      },
      warRoom: warAgreed(),
      decisionArtifact: decision(),
    },
  };
  return p;
}

describe("m-biz six-step finalize", () => {
  it("blocks confirm when research not confirmed", () => {
    const p = createAgentConsultingProject("m-biz", "empty");
    expect(() => assertMbizConfirmReady(p)).toThrow(/证据未齐/);
  });

  it("freezes mode contract and reaches sign-off ready", () => {
    const p = projectReady();
    const d = decision();
    const war = warAgreed();
    const roadmap = buildMbizExecutionRoadmap({
      oneLiner: d.recommendation,
      answers: p.intakeAnswers,
      advisors: p.assets.advisors,
      warRoom: war,
    });
    const { project, contract } = finalizeSixStepModeDeliverable(p, {
      decision: d,
      warRoom: war,
      roadmap,
      strategyReportMarkdown: [
        "# 模式确认",
        "",
        "## 建议",
        "90 天只押主推毛利，砍活动线；单位经济未证明前不做第三增长线。",
        "",
        "## 取舍",
        "接受毛利优先与短期客流波动；暂不把拉新活动当同期主航道。",
        "",
        "## 否决条件",
        "- 北极星连续 4 周无改善 → 改航道",
        "- 活动线 ROI 连续两周为负 → 永久砍线",
        "",
        "## 本周动作",
        "- 全员对齐北极星并砍冲突会议",
        "- 公布主推毛利看板与停投清单",
        "- 本周五复盘北极星证明点，未达标按否决停手",
        "",
        "## 背景",
        "单位经济扫描显示活动线吞噬毛利；三线并行会继续消耗现金与注意力。本报告作为签字交付正文，须含建议、取舍、否决与本周动作。",
        "模式确认后 90 天内只允许一条主航道占用经营会议与预算；其余项目降级为约束或停投，避免口号式「都要」。",
        "若北极星指标连续四周无改善，必须重开模式会议，不得以活动拉新掩盖单位经济恶化。",
        "交付标准：建议、取舍、否决条件与本周动作四项齐全，且可追溯到调研来源与会议室共识。",
        "",
      ].join("\n"),
    });

    expect(contract.status).toBe("frozen");
    expect(project.assets.signOffStatus).toBe("in_review");
    expect(project.assets.strategyConfirmedAt).toBeTruthy();

    expect(evaluateMbizSignOffReadiness(project).ok).toBe(true);

    const signed = signMbizStrategyReport(project, { signedBy: "创始人甲" });
    expect(signed.assets.signOffStatus).toBe("signed");
    const md = buildMbizSignOffPackageMarkdown(signed);
    expect(md).toContain("签字交付包");
    expect(md).toContain("Mode Contract");
    expect(md).toContain("创始人甲");
  });
});
