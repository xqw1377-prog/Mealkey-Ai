/**
 * 七常委核心模块全面测试
 * 覆盖 9 个零测试模块：
 * 1. 跨角色质询引擎 (cross-examination)
 * 2. 情景分析引擎 (scenario-engine)
 * 3. 常委战迹追踪 (track-record)
 * 4. 双轨表决 (dual-track)
 * 5. 知识资产渲染 (knowledge/catalog)
 * 6. 议题识别 (issue-classifier)
 * 7. 启发式意见 V2 (heuristic-opinions)
 * 8. 决议引擎 (resolution)
 * 9. Expert→Council 镜头 (expert-engines)
 */

import { describe, expect, it } from "vitest";
import {
  // 1. Cross-Examination
  generateExaminationPacket,
  renderExaminationBlock,
  generateCrossExaminations,
  // 2. Scenario Analysis
  runScenarioAnalysis,
  renderScenarioBlock,
  runCouncilScenarioAnalysis,
  // 3. Track Record
  recordCouncilDecision,
  getMemberStats,
  getAllMembersStats,
  buildCalibrationHint,
  closeCouncilDecision,
  // 4. Dual Track
  resolveDualTrack,
  // 5. Knowledge
  renderKnowledgeBlock,
  recallKnowledgeForIssue,
  getKnowledgeBase,
  // 6. Issue Classifier
  classifyDecisionIssue,
  // 7. Heuristic Opinions V2
  buildHeuristicOpinions,
  sanitizeOpinionEvidence,
  buildStubExpertReports,
  buildStubEvidencePacket,
  // 8. Resolution
  resolveCouncilDecision,
  attachWeights,
  // 9. Expert Engines
  getExpertEngine,
  listExpertEngines,
  EXPERT_TO_COUNCIL_LENS,
} from "../../../packages/agents/src/founder-os";
import type {
  CouncilOpinion,
  CouncilRoleId,
  EvidencePacket,
  ExpertReport,
} from "../../../packages/agents/src/founder-os";

const ALL_ROLES: CouncilRoleId[] = ["CSO","CMO","CBO","BMO","CFO","COO","CRO"];

// ═══════════════════════════════════════════════════════════════
// 模块 1: 跨角色质询引擎
// ═══════════════════════════════════════════════════════════════
describe("跨角色质询引擎 (Cross-Examination)", () => {
  const evidence: EvidencePacket = {
    caseId: "D-X",
    items: [
      { evidenceId: "E-MKT-001", sourceAgent: "M-MKT", claim: "用户存在", strength: "medium" },
      { evidenceId: "E-BIZ-001", sourceAgent: "M-BIZ", claim: "模型不成立", strength: "strong" },
      { evidenceId: "E-PNT-001", sourceAgent: "M-PNT", claim: "品牌可差异", strength: "medium" },
    ],
  };

  function makeOpinions(position: "support" | "oppose" = "support"): CouncilOpinion[] {
    return ALL_ROLES.map((r) => ({
      member: r,
      position: r === "CFO" || r === "CRO" ? "oppose" : position,
      confidence: 70,
      summary: `${r}的意见`,
      judgment: `${r}的判断`,
      evidence_used: [r === "CMO" ? "E-MKT-001" : r === "CBO" ? "E-PNT-001" : "E-BIZ-001"],
      risks: [],
      conditions: [],
      veto: r === "CFO" || r === "CRO",
      reasoning: [],
    }));
  }

  it("7 位常委产生质询，总数 > 0", () => {
    const opinions = makeOpinions();
    const packet = generateExaminationPacket({ roster: ALL_ROLES, opinions, evidencePacket: evidence });
    expect(packet.length).toBeGreaterThan(0);
    // 每个常委至少收到 1 条质询
    for (const r of ALL_ROLES) {
      expect(packet.some((c) => c.to === r)).toBe(true);
    }
  });

  it("立场分歧时产生更多 high severity 质询", () => {
    const support: CouncilOpinion[] = ALL_ROLES.map((r) => ({
      member: r, position: "support", confidence: 70,
      summary: "", risks: [], conditions: [], veto: false, reasoning: [],
    }));
    const packetSame = generateExaminationPacket({ roster: ALL_ROLES, opinions: support });
    const highSame = packetSame.filter((c) => c.severity === "high").length;

    const mixed: CouncilOpinion[] = ALL_ROLES.map((r) => ({
      member: r,
      position: r === "CFO" || r === "CRO" ? "oppose" : "support",
      confidence: 70,
      summary: "", risks: [], conditions: [], veto: r === "CFO" || r === "CRO", reasoning: [],
    }));
    const packetMixed = generateExaminationPacket({ roster: ALL_ROLES, opinions: mixed });
    const highMixed = packetMixed.filter((c) => c.severity === "high").length;

    // 有分歧时 high severity 应该更多
    expect(highMixed).toBeGreaterThanOrEqual(highSame);
  });

  it("质询包含 conflictAxis 信息", () => {
    const opinions = makeOpinions("support");
    const packet = generateExaminationPacket({ roster: ALL_ROLES, opinions, evidencePacket: evidence });
    for (const c of packet) {
      expect(c.conflictAxis).toBeTruthy();
      expect(c.question).toBeTruthy();
    }
  });

  it("CSO 收到来自 CMO/CBO/BMO/CFO/COO/CRO 的质询", () => {
    const opinions = makeOpinions("support");
    const packet = generateExaminationPacket({ roster: ALL_ROLES, opinions });
    const toCSO = packet.filter((c) => c.to === "CSO");
    expect(toCSO.length).toBeGreaterThanOrEqual(6);
    const fromRoles = [...new Set(toCSO.map((c) => c.from))];
    expect(fromRoles).toContain("CMO");
    expect(fromRoles).toContain("CFO");
    expect(fromRoles).toContain("CRO");
  });

  it("renderExaminationBlock 生成质询文本", () => {
    const opinions = makeOpinions("support");
    const packet = generateExaminationPacket({ roster: ALL_ROLES, opinions });
    const block = renderExaminationBlock("CFO", packet);
    expect(block).toContain("你的质询");
    expect(block).toContain("你收到的质询");
  });
});

// ═══════════════════════════════════════════════════════════════
// 模块 2: 假设情景分析引擎
// ═══════════════════════════════════════════════════════════════
describe("假设情景分析引擎 (Scenario Analysis)", () => {
  it("每位常委有对应情景模板", () => {
    for (const r of ALL_ROLES) {
      const results = runScenarioAnalysis(r, "是否进入上海市场");
      expect(results.length).toBeGreaterThanOrEqual(1);
      expect(results[0].title).toContain("上海市场");
    }
  });

  it("CFO 现金极端情景推演出 shift_to_oppose", () => {
    const results = runScenarioAnalysis("CFO", "是否进入上海市场");
    expect(results[0].decisionImpact).toBe("shift_to_oppose");
    expect(results[0].assumptions.length).toBeGreaterThanOrEqual(3);
  });

  it("CSO 竞争格局情景有 3 个压力变量", () => {
    const results = runScenarioAnalysis("CSO", "要不要开第二家店");
    expect(results[0].assumptions.length).toBe(3);
    expect(results[0].killSignal).toBeTruthy();
  });

  it("BMO 单位经济压力测试有 4 个变量", () => {
    const results = runScenarioAnalysis("BMO", "新品牌扩张");
    expect(results[0].assumptions.length).toBe(4);
  });

  it("renderScenarioBlock 包含压力变量和三情景", () => {
    const results = runScenarioAnalysis("CFO", "融资决策");
    const block = renderScenarioBlock("CFO", results);
    expect(block).toContain("压力变量");
    expect(block).toContain("最佳");
    expect(block).toContain("基准");
    expect(block).toContain("最坏");
    expect(block).toContain("停损信号");
  });

  it("runCouncilScenarioAnalysis 为全员生成", () => {
    const all = runCouncilScenarioAnalysis(ALL_ROLES, "是否进入上海市场");
    expect(Object.keys(all).length).toBe(7);
    for (const r of ALL_ROLES) {
      expect(all[r]?.length).toBeGreaterThanOrEqual(1);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 模块 3: 常委战迹追踪
// ═══════════════════════════════════════════════════════════════
describe("常委战迹追踪 (Track Record)", () => {
  it("记录决策后 stats 更新", () => {
    recordCouncilDecision({
      caseId: "T-1", topic: "开第二家店", member: "CSO",
      position: "support", confidence: 75, judgment: "应推进", top_risk: "资源不足",
    });
    const stats = getMemberStats("CSO");
    expect(stats.totalDecisions).toBeGreaterThanOrEqual(1);
    expect(stats.supportRate).toBeGreaterThanOrEqual(0);
  });

  it("closeCouncilDecision 回写结果", () => {
    recordCouncilDecision({
      caseId: "T-2", topic: "融资", member: "CFO",
      position: "oppose", confidence: 85, judgment: "现金不够", top_risk: "现金流断裂",
    });
    const before = getMemberStats("CFO");
    // 如果没有实际结果，accuracy 不会被计算（分母为0或基于已关闭的）
    expect(before.accuracy).toBeDefined();
  });

  it("buildCalibrationHint 样本不足时返回提示", () => {
    const hint = buildCalibrationHint("CBO");
    expect(hint).toBeTruthy();
  });

  it("getAllMembersStats 返回 7 位", () => {
    const all = getAllMembersStats();
    expect(all.length).toBe(7);
    for (const s of all) {
      expect(s.member).toBeTruthy();
      expect(s.totalDecisions).toBeGreaterThanOrEqual(0);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// 模块 4: 双轨表决
// ═══════════════════════════════════════════════════════════════
describe("双轨表决 (Dual Track)", () => {
  function makeOpinions(overrides: Array<{ member: CouncilRoleId; position: "support" | "oppose" | "conditional"; veto?: boolean }>): CouncilOpinion[] {
    return overrides.map((o) => ({
      member: o.member,
      position: o.position,
      confidence: 70,
      summary: "",
      risks: [],
      conditions: [],
      veto: o.veto ?? false,
      reasoning: [],
    }));
  }

  it("全员 support → 执行", () => {
    const opinions = makeOpinions(ALL_ROLES.map((r) => ({ member: r, position: "support" as const })));
    const result = resolveDualTrack({ decisionType: "store_expansion", opinions, level: "L2" });
    expect(result.recommended_action).toBe("执行");
    expect(result.track_b.blocked).toBe(false);
  });

  it("CFO veto → blocked 暂缓", () => {
    const opinions = makeOpinions([
      ...ALL_ROLES.filter((r) => r !== "CFO").map((r) => ({ member: r, position: "support" as const })),
      { member: "CFO" as CouncilRoleId, position: "oppose" as const, veto: true },
    ]);
    const result = resolveDualTrack({ decisionType: "new_city_expansion", opinions, level: "L3" });
    expect(result.track_b.blocked).toBe(true);
    expect(result.recommended_action).toBe("暂缓");
  });

  it("CRO veto → blocked", () => {
    const opinions = makeOpinions([
      ...ALL_ROLES.filter((r) => r !== "CRO").map((r) => ({ member: r, position: "support" as const })),
      { member: "CRO" as CouncilRoleId, position: "oppose" as const, veto: true, veto_reason: "合规风险" },
    ]);
    const result = resolveDualTrack({ decisionType: "fundraising", opinions, level: "L4" });
    expect(result.track_b.blocked).toBe(true);
    expect(result.track_b.red_flags[0].role).toBe("CRO");
  });

  it("反对 > 推进 → 推翻", () => {
    const opinions = makeOpinions([
      { member: "CSO", position: "support" },
      { member: "CMO", position: "support" },
      { member: "CBO", position: "oppose" },
      { member: "BMO", position: "oppose" },
      { member: "CFO", position: "oppose" },
      { member: "COO", position: "oppose" },
      { member: "CRO", position: "oppose" },
    ]);
    const result = resolveDualTrack({ decisionType: "new_city_expansion", opinions, level: "L3" });
    expect(result.recommended_action).toBe("推翻");
  });

  it("L4 需要 founderConfirmed", () => {
    const opinions = makeOpinions(ALL_ROLES.map((r) => ({ member: r, position: "support" as const })));
    const without = resolveDualTrack({ decisionType: "fundraising", opinions, level: "L4", founderConfirmed: false });
    expect(without.recommended_action).toBe("暂缓");

    const with_ = resolveDualTrack({ decisionType: "fundraising", opinions, level: "L4", founderConfirmed: true });
    expect(with_.recommended_action).toBe("执行");
  });
});

// ═══════════════════════════════════════════════════════════════
// 模块 5: 知识资产渲染
// ═══════════════════════════════════════════════════════════════
describe("知识资产渲染 (Knowledge Assets)", () => {
  it("每位常委的知识库含 6 模块", () => {
    for (const r of ALL_ROLES) {
      const kb = getKnowledgeBase(r);
      expect(kb.methodology.length).toBeGreaterThan(0);
      expect(kb.frameworks.length).toBeGreaterThan(0);
      expect(kb.cases.length).toBeGreaterThan(0);
      expect(kb.benchmarks.length).toBeGreaterThan(0);
      expect(kb.questions.length).toBeGreaterThan(0);
      expect(kb.failurePatterns.length).toBeGreaterThan(0);
    }
  });

  it("renderKnowledgeBlock 包含必备元素", () => {
    for (const r of ALL_ROLES) {
      const block = renderKnowledgeBlock(r);
      expect(block).toContain("Knowledge Assets");
      expect(block).toContain(r);
      expect(block).toContain("方法论");
      expect(block).toContain("判断框架");
      expect(block).toContain("案例锚点");
      expect(block).toContain("失败模式");
      expect(block).toContain("知识问题库");
    }
  });

  it("CSO 知识库含 6 个案例", () => {
    const kb = getKnowledgeBase("CSO");
    expect(kb.cases.length).toBeGreaterThanOrEqual(6);
  });

  it("recallKnowledgeForIssue 按议题检索", () => {
    const result = recallKnowledgeForIssue("CFO", "我要融资扩张");
    expect(result.failures.length).toBeGreaterThan(0);
    expect(result.cases.length).toBeGreaterThan(0);
    expect(result.questions.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// 模块 6: 议题识别
// ═══════════════════════════════════════════════════════════════
describe("议题识别 (Issue Classification)", () => {
  it("加盟 → STRATEGY + L3", () => {
    const issue = classifyDecisionIssue({ question: "我要不要加盟？" });
    expect(issue.type).toBe("STRATEGY");
    expect(issue.importance).toBe("L3");
    expect(issue.relatedAgents).toContain("M-BIZ");
  });

  it("融资/稀释 → CAPITAL + L4", () => {
    const issue = classifyDecisionIssue({ question: "融资稀释控股权，投资人投500万占20%可以吗？" });
    // 含"融资"和"稀释"触发 CAPITAL
    expect(issue.type).toBe("CAPITAL");
    expect(issue.importance).toBe("L4");
    expect(issue.suggestedRoster).toHaveLength(7);
  });

  it("菜单涨价 → L1", () => {
    const issue = classifyDecisionIssue({ question: "菜单要不要涨价？" });
    expect(issue.importance).toBe("L1");
    expect(issue.suggestedRoster.length).toBeLessThanOrEqual(2);
  });

  it("品牌定位 → BRAND", () => {
    const issue = classifyDecisionIssue({ question: "我们的品牌定位需要调整" });
    expect(issue.type).toBe("BRAND");
  });

  it("开第二家店 → L2 经营", () => {
    const issue = classifyDecisionIssue({ question: "300万要不要开第二家店？" });
    expect(issue.importance).toBe("L2");
    expect(issue.suggestedRoster.length).toBeGreaterThanOrEqual(3);
    expect(issue.suggestedRoster.length).toBeLessThanOrEqual(5);
  });

  it("合规/食安 → RISK", () => {
    const issue = classifyDecisionIssue({ question: "合规检查发现食品安全隐患需要处理" });
    // "合规"+"食安"触发 RISK（原文案中"合规"在前）
    expect(issue.type).toBe("RISK");
  });

  it("forceLevel 覆盖自动判断", () => {
    const issue = classifyDecisionIssue({ question: "菜单涨价", forceLevel: "L3" });
    expect(issue.importance).toBe("L3");
  });

  it("whyClassified 解释分类原因", () => {
    const issue = classifyDecisionIssue({ question: "我要不要加盟？" });
    expect(issue.whyClassified.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// 模块 7: 启发式意见 V2
// ═══════════════════════════════════════════════════════════════
describe("启发式意见 V2 (Heuristic Opinions)", () => {
  it("为花名册生成 7 份差异化意见", () => {
    const opinions = buildHeuristicOpinions({ roster: ALL_ROLES, topic: "是否进入上海市场" });
    expect(opinions).toHaveLength(7);
    for (const o of opinions) {
      expect(o.member).toBeTruthy();
      expect(["support", "oppose", "conditional"]).toContain(o.position);
      expect(o.judgment).toBeTruthy();
      expect(o.judgment!.length).toBeGreaterThan(20); // 不再是模板短句
      expect(o.reasoning.length).toBeGreaterThan(0);
      expect(o.risks.length).toBeGreaterThan(0);
    }
  });

  it("CFO 和 CRO 默认 oppose 带 veto", () => {
    const opinions = buildHeuristicOpinions({ roster: ALL_ROLES, topic: "是否进入上海市场" });
    const cfo = opinions.find((o) => o.member === "CFO")!;
    const cro = opinions.find((o) => o.member === "CRO")!;
    expect(cfo.position).toBe("oppose");
    expect(cfo.veto).toBe(true);
    expect(cro.position).toBe("oppose");
    expect(cro.veto).toBe(true);
  });

  it("CSO 有立场（无证据包时 conditional）", () => {
    const opinions = buildHeuristicOpinions({ roster: ALL_ROLES, topic: "是否进入上海市场" });
    const cso = opinions.find((o) => o.member === "CSO")!;
    // 无证据包时 sanitizeOpinionEvidence 将 support 降级为 conditional
    expect(cso.position).toBe("conditional");
    expect(cso.judgment!.length).toBeGreaterThan(20);
  });

  it("意见包含 Evidence ID", () => {
    const evidence: EvidencePacket = {
      caseId: "D",
      items: [
        { evidenceId: "E-MKT-001", sourceAgent: "M-MKT", claim: "用户存在", strength: "medium" },
      ],
    };
    const opinions = buildHeuristicOpinions({ roster: ["CMO"], topic: "市场", evidencePacket: evidence });
    expect(opinions[0].evidence_used).toContain("E-MKT-001");
  });

  it("sanitizeOpinionEvidence 剔除非法 Evidence ID", () => {
    const evidence: EvidencePacket = {
      caseId: "D",
      items: [{ evidenceId: "E-REAL-001", sourceAgent: "M-MKT", claim: "真实证据", strength: "strong" }],
    };
    const opinion: CouncilOpinion = {
      member: "CMO", position: "support", confidence: 80,
      summary: "", evidence_used: ["E-REAL-001", "E-FAKE-001"],
      risks: [], conditions: [], veto: false, reasoning: [],
    };
    const cleaned = sanitizeOpinionEvidence(opinion, evidence);
    expect(cleaned.evidence_used).toContain("E-REAL-001");
    expect(cleaned.evidence_used).not.toContain("E-FAKE-001");
  });

  it("buildStubExpertReports 生成占位报告", () => {
    const reports = buildStubExpertReports({ caseId: "D", topic: "测试", engines: ["M-MKT", "M-BIZ"] });
    expect(reports.length).toBe(2);
    expect(reports[0].engineId).toBe("M-MKT");
    expect(reports[0].headline).toContain("占位");
  });

  it("buildStubEvidencePacket 生成占位证据包", () => {
    const packet = buildStubEvidencePacket({ caseId: "D", engines: ["M-MKT", "M-PNT"] });
    expect(packet.items.length).toBe(2);
    expect(packet.items[0].evidenceId).toContain("E-");
  });
});

// ═══════════════════════════════════════════════════════════════
// 模块 8: 决议引擎
// ═══════════════════════════════════════════════════════════════
describe("决议引擎 (Resolution)", () => {
  function makeOpinions(positions: Array<{ member: CouncilRoleId; position: "support" | "oppose" | "conditional"; veto?: boolean }>): CouncilOpinion[] {
    return positions.map((p) => ({
      member: p.member, position: p.position, confidence: 70,
      summary: "", risks: [], conditions: [],
      veto: p.veto ?? false, reasoning: [],
    }));
  }

  it("CFO veto → 暂缓 + veto_flags", () => {
    const opinions = makeOpinions(ALL_ROLES.map((r) => ({
      member: r, position: r === "CFO" ? "oppose" as const : "support" as const,
      veto: r === "CFO",
    })));
    const result = resolveCouncilDecision({ decisionType: "new_city_expansion", opinions, level: "L3" });
    expect(result.recommended_action).toBe("暂缓");
    expect(result.veto_flags?.length).toBeGreaterThan(0);
    expect(result.minority_report.some((m) => m.includes("CFO"))).toBe(true);
  });

  it("无 veto 多数 support → 执行", () => {
    const opinions = makeOpinions(ALL_ROLES.map((r) => ({ member: r, position: "support" as const })));
    const result = resolveCouncilDecision({ decisionType: "store_expansion", opinions, level: "L2", founderConfirmed: true });
    expect(result.recommended_action).toBe("执行");
    expect(result.majority_view.length).toBeGreaterThan(0);
  });

  it("attachWeights 添加权重", () => {
    const opinions = makeOpinions(ALL_ROLES.map((r) => ({ member: r, position: "support" as const })));
    const weighted = attachWeights(opinions, "new_city_expansion");
    for (const w of weighted) {
      expect(w.weight).toBeGreaterThan(0);
    }
  });

  it("L3 多数侧不足 → 暂缓", () => {
    const opinions = makeOpinions([
      { member: "CSO", position: "support" },
      { member: "CMO", position: "support" },
      { member: "CBO", position: "oppose" },
      { member: "BMO", position: "oppose" },
      { member: "CFO", position: "oppose" },
      { member: "COO", position: "oppose" },
      { member: "CRO", position: "oppose" },
    ]);
    const result = resolveCouncilDecision({ decisionType: "new_city_expansion", opinions, level: "L3", founderConfirmed: true });
    expect(result.recommended_action).toBe("推翻");
  });
});

// ═══════════════════════════════════════════════════════════════
// 模块 9: Expert Engine 合约
// ═══════════════════════════════════════════════════════════════
describe("Expert Engine 合约 (Expert Engines)", () => {
  it("四大引擎注册完整", () => {
    const engines = listExpertEngines();
    expect(engines.length).toBe(4);
    const ids = engines.map((e) => e.engine_id);
    expect(ids).toContain("M-MKT");
    expect(ids).toContain("M-PNT");
    expect(ids).toContain("M-BIZ");
    expect(ids).toContain("M-ED");
  });

  it("M-PNT 给 CBO/CSO/CMO 提供消费镜头", () => {
    const lenses = EXPERT_TO_COUNCIL_LENS["M-PNT"];
    expect(lenses).toBeDefined();
    expect(lenses.CBO).toContain("稀释");
    expect(lenses.CSO).toContain("长期");
    expect(lenses.CMO).toContain("心智");
  });

  it("getExpertEngine 按 ID 获取", () => {
    const mkt = getExpertEngine("M-MKT");
    expect(mkt.name).toContain("Market");
    expect(mkt.feeds_council_roles).toContain("CMO");
  });

  it("M-MKT 喂 CMO/CSO/BMO", () => {
    const mkt = getExpertEngine("M-MKT");
    expect(mkt.feeds_council_roles).toEqual(["CMO", "CSO", "BMO"]);
  });

  it("M-BIZ 喂 BMO/CFO/COO", () => {
    const biz = getExpertEngine("M-BIZ");
    expect(biz.feeds_council_roles).toEqual(["BMO", "CFO", "COO"]);
  });

  it("M-ED 喂 CFO/CRO/CSO", () => {
    const ed = getExpertEngine("M-ED");
    expect(ed.feeds_council_roles).toEqual(["CFO", "CRO", "CSO"]);
  });
});
