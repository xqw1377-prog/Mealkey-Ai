import { describe, expect, it } from "vitest";
import {
  filterUsableEvidenceClaims,
  isUsableBusinessEvidenceSnippet,
} from "@/server/founder-layer/capability/restaurant-intelligence/evidence-quality";
import { worldChangeToBusinessSignal } from "@/server/founder-layer/capability/decision-center/business-signal-engine";

describe("evidence-quality", () => {
  it("拒绝百科字源类脏片段", () => {
    const dirty =
      "张，形声字。从弓长声。本义指把弦绷在弓上。说文解字记载战国文字…";
    expect(isUsableBusinessEvidenceSnippet(dirty)).toBe(false);
  });

  it("接受口碑/经营片段", () => {
    expect(
      isUsableBusinessEvidenceSnippet(
        "晚市等位超过40分钟，服务态度差，不推荐再来。",
      ),
    ).toBe(true);
    expect(
      isUsableBusinessEvidenceSnippet(
        "附近新开两家同价位湘菜馆，客单约80-120。",
      ),
    ).toBe(true);
  });

  it("过滤声明列表", () => {
    const kept = filterUsableEvidenceClaims([
      { claim: "张，形声。从弓长声。说文…", kind: "external_intel" },
      {
        claim: "差评提到出餐慢，影响翻台。",
        kind: "external_intel",
      },
    ]);
    expect(kept).toHaveLength(1);
    expect(kept[0]!.claim).toContain("出餐慢");
  });
});

describe("信号入口进经营动态", () => {
  it("UI Signal href 指向今日经营动态且含五层", () => {
    const s = worldChangeToBusinessSignal(
      {
        id: "wc1",
        kind: "review",
        title: "服务体验风险上升",
        detail: "过去7天等待时间差评增多",
        decisionTopic: "是否今天检查晚市出餐？",
      },
      "proj_demo",
    );
    expect(s.href).toContain("/dashboard");
    expect(s.href).not.toContain("/business-analysis");
    expect(s.pattern).toBeTruthy();
    expect(s.meaning || s.judgment).toBeTruthy();
    expect(s.observation).toBeTruthy();
    expect(s.suggestion).toBeTruthy();
  });
});
