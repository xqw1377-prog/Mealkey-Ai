import { describe, expect, it } from "vitest";
import {
  advanceDecisionRoomToBoard,
  advanceDecisionRoomToDebate,
  founderCloseDecisionRoom,
  openDecisionRoom,
  runDecisionRoomToBoard,
  validateSpecialRoster,
} from "../../../packages/agents/src/founder-os";

const BRIEF = {
  whyNow: "窗口期将过，必须本季拍板",
  decisionQuestion: "现在推进还是暂缓？",
  constraints: "现金与人力有上限",
  successLooksLike: "90 天内有可验证结果或明确停损",
  allowStubReports: true as const,
};

describe("决策室产品编排", () => {
  it("重大决策召集七常委并形成决策板", () => {
    const session = runDecisionRoomToBoard({
      topic: "我们要不要进入新城市扩张？",
      mode: "major",
      forceLevel: "L3",
      ...BRIEF,
    });
    expect(session.roster).toHaveLength(7);
    expect(session.stanceMatrix).toBeTruthy();
    expect(session.board?.recommendedAction).toBeTruthy();
    expect(session.board?.founderChoices.length).toBe(3);
    expect(
      session.phase === "awaiting_founder" || session.phase === "closed",
    ).toBe(true);
  });

  it("专项会议可裁剪花名册", () => {
    let session = openDecisionRoom({
      topic: "单店模型要不要先验证再扩张？",
      mode: "special",
      roster: ["CSO", "BMO", "CFO"],
      forceLevel: "L2",
      ...BRIEF,
    });
    expect(session.roster).toEqual(["CSO", "BMO", "CFO"]);
    session = advanceDecisionRoomToDebate(session);
    expect(session.opinions).toHaveLength(3);
    session = advanceDecisionRoomToBoard(session);
    expect(session.board).toBeTruthy();
  });

  it("真实 ExpertReport 覆盖同引擎占位", () => {
    const session = openDecisionRoom({
      topic: "要不要品牌升级？",
      mode: "major",
      ...BRIEF,
      allowStubReports: false,
      expertReports: [
        {
          engineId: "M-PNT",
          caseId: "x",
          headline: "真实定位意见：轻松地道湖南聚餐",
          sections: [
            {
              id: "p",
              title: "定位",
              content:
                "建议钉住「轻松地道湖南聚餐」心智。证据来自品牌简报、店访对比与竞争地图，已足以支撑常委会做升级与否的实质讨论。",
            },
          ],
        },
      ],
    });
    const pnt = session.expertReports.find((r) => r.engineId === "M-PNT");
    expect(pnt?.headline).toContain("真实定位意见");
    expect(session.cdoNote).toMatch(/已挂载\s*1\s*份 ExpertReport/);
  });

  it("L4 专项会缺 CRO 应失败", () => {
    const check = validateSpecialRoster({
      roster: ["CSO", "BMO"],
      level: "L4",
    });
    expect(check.ok).toBe(false);
    expect(check.errors.some((e) => e.includes("CRO"))).toBe(true);
  });

  it("默认禁止 stub：无实质报告不能开案", () => {
    expect(() =>
      openDecisionRoom({
        topic: "要不要涨价？",
        mode: "major",
        whyNow: "窗口期将过，必须本季拍板",
        decisionQuestion: "现在推进还是暂缓？",
        constraints: "现金与人力有上限",
        successLooksLike: "90 天内有可验证结果或明确停损",
      }),
    ).toThrow(/报告|stub|占位|实质|咨询/i);
  });

  it("Founder 接受委员会后关闭", () => {
    let session = runDecisionRoomToBoard({
      topic: "要不要开第二家店？",
      mode: "major",
      ...BRIEF,
    });
    session = founderCloseDecisionRoom(session, { choice: "接受委员会" });
    expect(session.phase).toBe("closed");
    expect(session.brief || session.memory).toBeTruthy();
  });
});
