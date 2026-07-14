import type { CapabilityDefinition, MKContext } from "@mealkey/agent-sdk";
import { decision, evidence, projectLabel, asList } from "./_shared";
import { runTheoryMatrix } from "../matrix";
import { generateCandidates, runSixDimensionDiagnosis, runRedTeamChallenge, runQualityCheck } from "../distillation";

/**
 * 差异化策略 Capability
 *
 * 专业模型全链路：
 *   六维诊断 → 多方案生成 → 三理论矩阵 → Cross-Fire → Synthesis → 红队挑战 → 质量校验
 *
 * 三理论并行：
 *   Ries Agent | Trout Agent | Ye Agent
 *        └─► Cross-Fire Agent ─► Synthesis Agent
 */
export const differentiationCapability: CapabilityDefinition = {
  id: "differentiation",
  name: "差异化策略（三理论矩阵）",
  description:
    "六维诊断→多方案生成→三理论矩阵并行评估→Cross-Fire→Synthesis→红队挑战→质量校验，全链路品牌定位决策",
  domain: "strategy",
  inputSchema: {
    type: "object",
    properties: {
      previousSummary: { type: "string" },
      candidates: { type: "array" },
    },
  },
  outputSchema: {
    type: "object",
    properties: {
      candidates: { type: "array" },
      theoryViews: { type: "object" },
      crossFire: { type: "object" },
      synthesis: { type: "object" },
      primaryDirection: { type: "string" },
      distillation: { type: "object" },
    },
  },

  async execute(input: unknown, context: MKContext) {
    const params = (input || {}) as Record<string, unknown>;
    const previousSummary =
      typeof params.previousSummary === "string"
        ? params.previousSummary
        : typeof params.previousResults === "string"
          ? params.previousResults
          : undefined;

    // ─── Step 1: 六维诊断 ─────────────────────────────────────
    const sixDim = runSixDimensionDiagnosis(context);

    // ─── Step 2: 多方案生成（基于六维结果）─────────────────────
    const distilledCandidates = generateCandidates(context, sixDim);

    // ─── Step 3: 三理论矩阵（使用蒸馏生成的候选集）──────────────
    const matrix = await runTheoryMatrix(context, {
      previousSummary,
      candidates: distilledCandidates.map((c) => ({
        id: c.id,
        name: c.name,
        oneLiner: c.oneLiner,
        type: c.style,
        focus: c.entryPoint,
      })),
    });
    const { inputPackage, views, crossFire, synthesis } = matrix;

    // ─── Step 4: 红队挑战 ─────────────────────────────────────
    const redTeamResults = runRedTeamChallenge(distilledCandidates, {
      category: context.project.category || "",
      budget: typeof context.project.budget === "number" ? context.project.budget : 0,
      strengths: asList(context.owner.strengths),
      weaknesses: asList(context.owner.weaknesses),
      experience: context.owner.experience || "",
    });

    // ─── Step 5: 质量校验 ──────────────────────────────────────
    const qualityResult = runQualityCheck({
      decision_recommend: synthesis.decision_recommend,
      overall_score: synthesis.overall_score,
      why_choose_this: synthesis.why_choose_this,
      why_not_others: synthesis.why_not_others,
      risks: redTeamResults.map((rc) => ({
        risk: rc.isEliminated ? `【淘汰】${rc.challenges[0]?.risk || ""}` : rc.challenges[0]?.risk,
        severity: rc.maxSeverity,
      })),
      validation: { day30: validationNotes(redTeamResults) },
      candidates: distilledCandidates,
      theory_vote_summary: synthesis.theory_vote_summary,
    });

    const primary = inputPackage.candidates.find(
      (c) => c.id === synthesis.preferred_candidate_id,
    ) || inputPackage.candidates[0];

    const observation = [
      `六维诊断：${sixDim.overall_positioning_feasibility}（${sixDim.chain_blocked_at ? `阻断于${sixDim.chain_blocked_at}` : "全线通过"}）`,
      `生成 ${distilledCandidates.length} 个候选方向（${distilledCandidates.map((c) => c.style).join("/")}）`,
      `Ries ${views.ries.theory_recommend} · Trout ${views.trout.theory_recommend} · Ye ${views.ye_maozhong.theory_recommend}`,
      `Synthesis ${synthesis.decision_recommend}（评分${synthesis.overall_score} 心智${synthesis.mind_position_level} 风险${synthesis.max_risk_severity}）`,
    ].join(" | ");

    const diagnosis = [
      sixDim.chain_blocked_at
        ? `六维阻断：${sixDim.chain_blocked_at}不成立，后续仅作参考`
        : `六维评估：${sixDim.overall_positioning_feasibility}`,
      crossFire.conflicts.slice(0, 2).join("；") || "碰撞完成",
      redTeamResults.filter((r) => r.isEliminated).length
        ? `红队淘汰：${redTeamResults.filter((r) => r.isEliminated).map((r) => r.name).join("、")}`
        : "红队：无强制淘汰项",
      qualityResult.is_pass ? "质量校验通过" : `质量预警：${qualityResult.quality_issues.slice(0, 2).join("；")}`,
    ].filter(Boolean).join("。");

    const judgement = [
      `Synthesis ${synthesis.decision_recommend}：${synthesis.final_recommended_position}`,
      `评分 ${synthesis.overall_score}/100 · 心智 ${synthesis.mind_position_level} · 风险 ${synthesis.max_risk_severity}`,
    ].join(" | ");

    return decision({
      idPrefix: "differentiation",
      problem: `${projectLabel(context)} 品牌定位决策（六维→多方案→三理论→红队→校验）`,
      observation,
      diagnosis,
      judgement,
      strategy: [
        synthesis.why_choose_this,
        `不选理由：${synthesis.why_not_others}`,
        `红队挑战：${redTeamResults.filter((r) => r.isEliminated).length}个淘汰，最大风险${redTeamResults.map((r) => r.maxSeverity).sort().reverse()[0] || "R1"}`,
        "三理论：Ries 聚焦第一 · Trout 区隔联想 · Ye 场景落地；禁止平均整合。",
      ].join(" "),
      action:
        "用主方向一句话做转述测试；30 天内验证场景记忆是否收敛到同一锚点。",
      confidence: synthesis.confidence,
      evidence: [
        evidence("six_dimension", JSON.stringify(sixDim), 0.85),
        evidence("distilled_candidates", JSON.stringify(distilledCandidates), 0.8),
        evidence("red_team", JSON.stringify(redTeamResults), 0.82),
        evidence("quality_check", JSON.stringify(qualityResult), 0.88),
        evidence("matrix_candidates", JSON.stringify(inputPackage.candidates), 0.9),
        evidence("theory_agent_ries", JSON.stringify(views.ries), 0.9),
        evidence("theory_agent_trout", JSON.stringify(views.trout), 0.9),
        evidence("theory_agent_ye", JSON.stringify(views.ye_maozhong), 0.9),
        evidence("cross_fire_agent", JSON.stringify(crossFire), 0.88),
        evidence("synthesis_agent", JSON.stringify(synthesis), 0.92),
      ],
      payload: {
        // 蒸馏层输出
        distillation: {
          six_dimension: sixDim,
          candidates: distilledCandidates,
          red_team: redTeamResults,
          quality: qualityResult,
        },
        // 矩阵输出
        candidates: inputPackage.candidates,
        theoryViews: {
          ries: views.ries,
          trout: views.trout,
          ye_maozhong: views.ye_maozhong,
        },
        theory_vote_summary: synthesis.theory_vote_summary,
        crossFire,
        synthesis,
        primaryDirection: primary,
        decision_recommend: synthesis.decision_recommend,
        overall_score: synthesis.overall_score,
        mind_position_level: synthesis.mind_position_level,
        max_risk_severity: synthesis.max_risk_severity,
        matrix: {
          agents: ["ries", "trout", "ye_maozhong", "cross_fire", "synthesis"],
          parallel: ["ries", "trout", "ye_maozhong"],
          rules: ["禁止平均整合", "R4 不得 primary", "最终权在 Synthesis"],
          elapsedMs: matrix.elapsedMs,
        },
        previousSummary,
      },
    });
  },
};

// ─── 辅助函数 ───────────────────────────────────────────────────

function validationNotes(
  redTeam: Array<{
    name: string;
    maxSeverity: string;
    isEliminated: boolean;
    challenges: Array<{ mitigationHint: string }>;
  }>,
): string[] {
  const notes: string[] = ["主场景到店话术与转述测试", "锚点套餐毛利验证"];
  const eliminated = redTeam.filter((r) => r.isEliminated);
  if (eliminated.length > 0) {
    notes.push(`验证淘汰方向的核心假设是否成立：${eliminated.map((r) => r.name).join("、")}`);
  }
  const r3plus = redTeam.filter((r) => r.maxSeverity === "R3" || r.maxSeverity === "R4");
  if (r3plus.length > 0) {
    for (const r of r3plus) {
      const hint = r.challenges[0]?.mitigationHint;
      if (hint) notes.push(`风险缓解：${hint}`);
    }
  }
  return notes.slice(0, 5);
}
