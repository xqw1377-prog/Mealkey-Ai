import { describe, expect, it } from "vitest";
import {
  compileGoalTurn,
  applyCompileToState,
  readMobileAgentState,
  extractFileSignals,
  buildKnownCompileContext,
  appendSeedMetricsFromCompile,
  routeSeatForIntent,
  classifyKnowledgeContent,
} from "@/server/founder-layer/goal-compiler";
import { emptyMobileAgentState } from "@/server/founder-layer/contracts/goal-compiler";

describe("Goal Compiler Mobile Phase 1", () => {
  it("生意不好 → 目标框定 + 问题域选项（宪法 P1）", () => {
    const out = compileGoalTurn(
      {
        restaurantRef: "proj_1",
        trigger: "utterance",
        utterance: "最近生意不好",
      },
      { state: emptyMobileAgentState() },
    );
    expect(out.goal.goalType).toBe("diagnose_performance");
    expect(out.bossSummary).toMatch(/经营改善|收入|利润|客户|运营/);
    expect(out.bossSummary).not.toMatch(/你可以做营销/);
    expect(
      out.interactionHints?.choicePrompts.some((c) => c.slot === "problem_domain"),
    ).toBe(true);
  });

  it("菜单优化 → 产出菜单资产含判断结构", () => {
    const first = compileGoalTurn(
      {
        restaurantRef: "proj_1",
        trigger: "utterance",
        utterance: "帮我看看菜单怎么优化",
      },
      { state: emptyMobileAgentState() },
    );
    const state1 = applyCompileToState(
      emptyMobileAgentState(),
      first,
      "帮我看看菜单怎么优化",
    );
    const second = compileGoalTurn(
      {
        restaurantRef: "proj_1",
        trigger: "confirm_slot",
        goalId: first.goal.goalId,
        slotPatches: {
          menu_focus: "减少SKU",
          sku_count: "95",
          avg_ticket: "68",
        },
      },
      { state: state1 },
    );
    expect(second.goal.goalType).toBe("menu_optimize");
    expect(second.artifacts[0]?.title).toMatch(/菜单/);
    expect(second.artifacts[0]?.body).toMatch(/我的判断/);
    expect(second.interactionHints?.followUps?.length).toBeGreaterThan(0);
  });

  it("营业额下降 → 强制诊断 + 变量拆解话术（不甩营销清单）", () => {
    const out = compileGoalTurn(
      {
        restaurantRef: "proj_1",
        trigger: "utterance",
        utterance: "我的店最近营业额下降怎么办？",
      },
      { state: emptyMobileAgentState() },
    );

    expect(out.goal.goalType).toBe("diagnose_performance");
    expect(out.goal.status).toBe("blocked");
    expect(out.bossSummary).toMatch(/客流/);
    expect(out.bossSummary).toMatch(/客单/);
    expect(out.bossSummary).not.toMatch(/20条|营销方案清单/);
    expect(out.taskGraph.nodes[0]?.title).toMatch(/变量拆解/);
    expect(out.trace.providersUsed).toContain("restaurant-intelligence.causal");
    expect(out.questions.some((q) => q.slot === "which_variable")).toBe(true);
    expect(out.interactionHints?.behaviorState).toBe("diagnose");
    expect(
      out.interactionHints?.choicePrompts.some((c) => c.slot === "which_variable"),
    ).toBe(true);
  });

  it("营业额下降补槽后 → 报告含因果链", () => {
    const first = compileGoalTurn(
      {
        restaurantRef: "proj_1",
        trigger: "utterance",
        utterance: "营业额下滑了好多",
      },
      { state: emptyMobileAgentState() },
    );
    const state1 = applyCompileToState(
      emptyMobileAgentState(),
      first,
      "营业额下滑了好多",
    );
    const second = compileGoalTurn(
      {
        restaurantRef: "proj_1",
        trigger: "confirm_slot",
        goalId: first.goal.goalId,
        slotPatches: {
          which_variable: "客流变少",
          monthly_revenue: "22万",
          compare_baseline: "比上月少约15%",
        },
      },
      { state: state1 },
    );

    expect(second.artifacts.length).toBe(1);
    expect(second.artifacts[0]?.title).toMatch(/营业额下降|因果/);
    expect(second.artifacts[0]?.body).toMatch(/客流/);
    expect(second.artifacts[0]?.body).toMatch(/经营因果链|变量拆解/);
    expect(second.artifacts[0]?.body).toMatch(/复购/);
    expect(second.bossSummary).toMatch(/经营资产|判断/);
  });

  it("利润表述 → 追问收入/成本/人效，不急着终局", () => {
    const out = compileGoalTurn(
      {
        restaurantRef: "proj_1",
        trigger: "utterance",
        utterance: "最近店里感觉越来越累，但是利润没提升。",
      },
      { state: emptyMobileAgentState() },
    );

    expect(out.goal.goalType).toMatch(/improve_profit|diagnose_performance/);
    expect(out.goal.status).toBe("blocked");
    expect(out.questions.length).toBeGreaterThan(0);
    expect(out.bossSummary).toMatch(/收入|成本|人效/);
    expect(out.artifacts.length).toBe(0);
    expect(out.trace.providersUsed).toContain("goal-compiler.heuristic");
  });

  it("补槽后产出诊断报告资产", () => {
    const first = compileGoalTurn(
      {
        restaurantRef: "proj_1",
        trigger: "utterance",
        utterance: "利润掉了还特别累",
      },
      { state: emptyMobileAgentState() },
    );
    const state1 = applyCompileToState(
      emptyMobileAgentState(),
      first,
      "利润掉了还特别累",
    );

    const second = compileGoalTurn(
      {
        restaurantRef: "proj_1",
        trigger: "confirm_slot",
        goalId: first.goal.goalId,
        slotPatches: {
          monthly_revenue: "28万",
          staff_count: "12",
          main_pain: "人效",
        },
      },
      { state: state1 },
    );

    expect(second.artifacts.length).toBe(1);
    expect(second.artifacts[0]?.title).toMatch(/诊断/);
    expect(second.artifacts[0]?.body).toMatch(/人效|判断|原因/);
    expect(second.pendingDecisions.length).toBeGreaterThan(0);
    expect(second.nextAction.kind).toBe("review_artifact");

    const state2 = applyCompileToState(state1, second, "补充信息");
    expect(state2.assets.length).toBe(1);
    expect(state2.memoryHints.focus).toContain("利润");
    expect(state2.pendingQuestions.length).toBe(0);
    expect(state2.assets[0]?.categorySlug).toMatch(
      /finance-materials|decision-review|store-operations/,
    );
    expect(state2.assets[0]?.categoryLabel).toBeTruthy();
    expect(state2.turns.at(-1)?.categorySlug).toBeTruthy();
  });

  it("上传且有可读正文 → 诊断产出", () => {
    const out = compileGoalTurn(
      {
        restaurantRef: "proj_1",
        trigger: "file",
        fileRefs: [{ id: "a1", kind: "xlsx", label: "2025营业数据.xlsx" }],
      },
      {
        state: emptyMobileAgentState(),
        fileText: "营业额 28万\n员工 12人\n午餐客流下降",
      },
    );
    expect(out.artifacts[0]?.body).toMatch(/营业|经营|午餐/);
    expect(out.goal.progress).toBeGreaterThanOrEqual(25);
  });

  it("开店意图生成动态 workflow 节点", () => {
    const out = compileGoalTurn(
      {
        restaurantRef: "proj_1",
        trigger: "utterance",
        utterance: "我想开一家长沙社区湘菜馆",
        slotPatches: {
          city: "长沙",
          category: "社区湘菜",
          area_sqm: "200",
          investment: "300万",
        },
      },
      { state: emptyMobileAgentState() },
    );
    expect(out.goal.goalType).toBe("launch_store");
    expect(out.taskGraph.nodes.map((n) => n.title)).toContain("品牌定位");
    expect(out.artifacts[0]?.type).toBe("plan");
  });

  it("profile 侧车可回读", () => {
    const profile = {
      mobileAgent: {
        version: "v1",
        activeGoal: null,
        taskGraph: null,
        assets: [],
        turns: [],
        pendingQuestions: [],
        memoryHints: { focus: ["利润"] },
        updatedAt: new Date().toISOString(),
      },
    };
    const state = readMobileAgentState(profile);
    expect(state.memoryHints.focus).toEqual(["利润"]);
  });

  it("营业表文本抽出午餐下降与槽位建议", () => {
    const sig = extractFileSignals(
      "日期,午餐客流,营业额\n1月,120,28万\n午餐客流下降20%\n员工人数 12人\n人效偏低",
      "营业.xlsx",
    );
    expect(sig.bullets.some((b) => /午餐|下降/.test(b))).toBe(true);
    expect(sig.suggestedSlots.staff_count).toBe(12);
    expect(sig.evidenceSnippet.length).toBeGreaterThan(10);
  });

  it("二次进入：已记住城市/品类不再追问开店参数", () => {
    const state = emptyMobileAgentState();
    state.memoryHints.focus = ["开店", "定位"];
    const known = buildKnownCompileContext(
      {
        businessIdentity: { city: "长沙", category: "社区湘菜", brandName: "等里" },
      },
      state,
      "王总",
    );
    expect(known.rememberedSlots.city).toBe("长沙");

    const out = compileGoalTurn(
      {
        restaurantRef: "proj_1",
        trigger: "utterance",
        utterance: "我想开一家店",
        slotPatches: { area_sqm: "200", investment: "300万" },
      },
      { state, known },
    );
    expect(out.goal.slots.city).toBe("长沙");
    expect(out.goal.slots.category).toBe("社区湘菜");
    expect(out.bossSummary).toMatch(/还记得|长沙|等里/);
    // 城市品类已齐，只可能还缺少数槽；不应再问城市
    expect(out.questions.every((q) => q.slot !== "city")).toBe(true);
  });

  it("带 fileText 的编译把信号写进报告", () => {
    const out = compileGoalTurn(
      {
        restaurantRef: "proj_1",
        trigger: "file",
        fileRefs: [{ id: "a1", kind: "xlsx", label: "周报.xlsx" }],
      },
      {
        state: emptyMobileAgentState(),
        fileText: "午餐客流下降18%\n营业额 30万\n招牌菜贡献下降",
      },
    );
    expect(out.artifacts[0]?.body).toMatch(/午餐|下降|招牌/);
  });

  it("observe 雷达信号起目标并追问，不装已诊断完", () => {
    const out = compileGoalTurn(
      {
        restaurantRef: "proj_1",
        trigger: "observe",
        utterance: "午餐客流连续下降，建议先核对人效与菜品贡献",
        signalId: "radar_1",
      },
      { state: emptyMobileAgentState() },
    );
    expect(out.goal.status).toBe("blocked");
    expect(out.questions.length).toBeGreaterThan(0);
    expect(out.bossSummary).toMatch(/经营动态|收入|成本|人效/);
    expect(out.artifacts.length).toBe(0);
  });

  it("空文件不跳过追问，要求说明文件内容", () => {
    const out = compileGoalTurn(
      {
        restaurantRef: "proj_1",
        trigger: "file",
        fileRefs: [{ id: "a1", kind: "xlsx", label: "扫描件.xlsx" }],
      },
      { state: emptyMobileAgentState() },
    );
    expect(out.goal.status).toBe("blocked");
    expect(out.questions.some((q) => q.slot === "file_note")).toBe(true);
    expect(out.artifacts.length).toBe(0);
  });

  it("pendingDecisions 写入侧车状态", () => {
    const first = compileGoalTurn(
      {
        restaurantRef: "proj_1",
        trigger: "utterance",
        utterance: "利润诊断",
        slotPatches: {
          monthly_revenue: "28万",
          staff_count: "10",
          main_pain: "成本",
        },
      },
      { state: emptyMobileAgentState() },
    );
    const state = applyCompileToState(emptyMobileAgentState(), first, "利润诊断");
    expect(state.pendingDecisions.length).toBeGreaterThan(0);
  });

  it("IntentFamily 路由到正确单席", () => {
    expect(routeSeatForIntent("improve_profit")).toBe("m-biz");
    expect(routeSeatForIntent("positioning")).toBe("m-pnt");
    expect(routeSeatForIntent("launch_store")).toBe("m-mkt");
  });

  it("种子指标：二次表达记 will_return，产出记 asset", () => {
    const first = compileGoalTurn(
      {
        restaurantRef: "proj_1",
        trigger: "utterance",
        utterance: "利润掉了还特别累",
        slotPatches: {
          monthly_revenue: "28万",
          staff_count: "12",
          main_pain: "人效",
        },
      },
      { state: emptyMobileAgentState() },
    );
    const s1 = appendSeedMetricsFromCompile({
      prev: emptyMobileAgentState(),
      next: applyCompileToState(emptyMobileAgentState(), first, "利润"),
      output: first,
      trigger: "utterance",
    });
    expect(s1.seedMetrics?.compileCount).toBe(1);
    expect(
      s1.seedMetrics?.events.some((e) => e.name === "mobile.asset_produced"),
    ).toBe(true);

    const second = compileGoalTurn(
      {
        restaurantRef: "proj_1",
        trigger: "utterance",
        utterance: "还想再看看成本",
      },
      { state: s1 },
    );
    const s2 = appendSeedMetricsFromCompile({
      prev: s1,
      next: applyCompileToState(s1, second, "还想再看看成本"),
      output: second,
      trigger: "utterance",
    });
    expect(s2.seedMetrics?.returnCount).toBeGreaterThanOrEqual(1);
    expect(
      s2.seedMetrics?.events.some((e) => e.name === "mobile.will_return"),
    ).toBe(true);
  });

  it("Intelligence 经验注入 preface（二次少问增强）", () => {
    const state = emptyMobileAgentState();
    state.memoryHints.focus = ["利润"];
    const known = buildKnownCompileContext(
      {
        businessIdentity: { city: "长沙", brandName: "等里" },
        memoryPermissions: {
          saveExperience: true,
          useForPersonalGrowth: true,
          contributeToIndustryModel: false,
        },
        decisionStyle: {
          riskPreference: "conservative",
          speedPreference: "unknown",
          detailLevel: "unknown",
          aiStance: "negotiate",
        },
        intelligenceLessons: [
          {
            lessonId: "l1",
            summary: "人效偏低时先别急着扩店",
            source: "decision",
            outcome: "confirmed",
            at: new Date().toISOString(),
          },
        ],
      },
      state,
      "王总",
    );
    expect(known.styleHint).toMatch(/稳健/);
    expect(known.lessonHint).toMatch(/人效|扩店/);
    const out = compileGoalTurn(
      {
        restaurantRef: "proj_1",
        trigger: "utterance",
        utterance: "还是利润问题",
      },
      { state, known },
    );
    expect(out.bossSummary).toMatch(/还记得|稳健|人效|利润/);
  });

  it("按内容自动分类：利润→财务，选址→市场，定位→品牌", () => {
    expect(
      classifyKnowledgeContent({
        text: "利润掉了，成本太高",
        intentFamily: "improve_profit",
      }).categorySlug,
    ).toBe("finance-materials");

    expect(
      classifyKnowledgeContent({
        text: "想在长沙开第二家店，帮我看选址",
        intentFamily: "launch_store",
      }).categorySlug,
    ).toBe("market-research");

    expect(
      classifyKnowledgeContent({
        text: "品牌定位不清晰，菜单也散",
        intentFamily: "positioning",
      }).categorySlug,
    ).toBe("brand-product");
  });
});
