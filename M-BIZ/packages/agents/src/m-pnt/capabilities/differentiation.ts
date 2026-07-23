import type { CapabilityDefinition, MKContext } from "@mealkey/agent-sdk";
import { decision, evidence, projectLabel } from "./_shared";
import { runTheoryMatrix } from "../matrix";
import { getMPntLlmOptions } from "../llm/with-llm";

/**
 * 差异化策略 Capability
 *
 * 真正调用三理论 Agent 矩阵（并行）：
 *   Ries Agent | Trout Agent | Ye Agent
 *        └─► Cross-Fire Agent ─► Synthesis Agent
 */
export const differentiationCapability: CapabilityDefinition = {
  id: "differentiation",
  name: "差异化策略（三理论矩阵）",
  description:
    "生成候选定位方向，并由 Ries/Trout/Ye 三个理论 Agent 并行评估，经 Cross-Fire 与 Synthesis 取舍",
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

    const opts = getMPntLlmOptions();
    const matrix = await runTheoryMatrix(context, {
      previousSummary,
      llm: opts.theoryLlm,
    });
    const { inputPackage, views, crossFire, synthesis } = matrix;

    const primary = inputPackage.candidates.find(
      (c) => c.id === synthesis.preferred_candidate_id,
    ) || inputPackage.candidates[0];

    const observation = [
      `已生成 ${inputPackage.candidates.length} 个候选方向，并并行运行三理论 Agent。`,
      `里斯定位偏好：${views.ries.preferred_direction}（${views.ries.theory_recommend}）`,
      `特劳特定位偏好：${views.trout.preferred_direction}（${views.trout.theory_recommend}）`,
      `冲突营销偏好：${views.ye_maozhong.preferred_direction}（${views.ye_maozhong.theory_recommend}）`,
      `矩阵耗时 ${matrix.elapsedMs}ms`,
    ].join(" ");

    const diagnosis = [
      crossFire.game_summary,
      crossFire.conflicts.slice(0, 2).join("；") || "竞争面完成",
      crossFire.challenges.length
        ? `博弈攻击 ${crossFire.challenges.length} 次`
        : "无跨理论攻击（三方首选一致）",
      crossFire.hard_consensus.length
        ? `硬共识 ${crossFire.hard_consensus.length} 条`
        : "无硬共识",
      crossFire.eliminate.length
        ? `淘汰：${crossFire.eliminate.slice(0, 3).join("；")}`
        : "无双票淘汰项",
    ].join("。");

    const judgement = `经竞争→博弈→共识后，Synthesis 判定 ${synthesis.decision_recommend}：${synthesis.final_recommended_position}`;

    return decision({
      idPrefix: "differentiation",
      problem: `${projectLabel(context)} 差异化策略（三理论 Agent 矩阵）`,
      observation,
      diagnosis,
      judgement,
      strategy: [
        synthesis.why_choose_this,
        `不选理由：${synthesis.why_not_others}`,
        "三体系：里斯定位 · 特劳特定位 · 叶茂中冲突营销；竞争→博弈→共识后取舍，禁止平均整合。",
      ].join(" "),
      action:
        "用主方向一句话做转述测试；30 天内验证场景记忆是否收敛到同一锚点。",
      confidence: synthesis.confidence,
      evidence: [
        evidence("matrix_candidates", JSON.stringify(inputPackage.candidates), 0.9),
        evidence("theory_agent_ries", JSON.stringify(views.ries), 0.9),
        evidence("theory_agent_trout", JSON.stringify(views.trout), 0.9),
        evidence("theory_agent_ye", JSON.stringify(views.ye_maozhong), 0.9),
        evidence("cross_fire_agent", JSON.stringify(crossFire), 0.88),
        evidence("synthesis_agent", JSON.stringify(synthesis), 0.92),
      ],
      payload: {
        candidates: inputPackage.candidates,
        theoryViews: {
          ries: views.ries,
          trout: views.trout,
          ye_maozhong: views.ye_maozhong,
        },
        /** 兼容旧字段名 */
        theory_vote_summary: synthesis.theory_vote_summary,
        crossFire,
        synthesis,
        primaryDirection: primary,
        decision_recommend: synthesis.decision_recommend,
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
