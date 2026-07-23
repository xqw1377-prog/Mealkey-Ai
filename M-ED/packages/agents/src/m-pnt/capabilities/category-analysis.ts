import type { CapabilityDefinition, MKContext } from "@mealkey/agent-sdk";
import {
  asList,
  budgetNumber,
  categoryBenchmark,
  decision,
  evidence,
  projectLabel,
} from "./_shared";

export const categoryAnalysisCapability: CapabilityDefinition = {
  id: "category_analysis",
  name: "品类分析",
  description: "评估目标品类在城市市场中的容量、生命周期、饱和度与资源匹配度",
  domain: "analysis",
  inputSchema: {
    type: "object",
    properties: {
      category: { type: "string" },
      city: { type: "string" },
      budget: { type: "number" },
    },
  },
  outputSchema: {
    type: "object",
    properties: {
      lifecycle: { type: "string" },
      matchScore: { type: "number" },
      conclusion: { type: "string" },
    },
  },

  async execute(input: unknown, context: MKContext) {
    const params = (input || {}) as Record<string, unknown>;
    const category =
      String(params.category || context.project.category || "").trim() ||
      "未指定品类";
    const city = String(params.city || context.project.city || "目标城市");
    const budget = (params.budget as number | undefined) ?? budgetNumber(context);
    const bench = categoryBenchmark(category);
    const strengths = asList(context.owner.strengths);
    const experience = context.owner.experience || "未提供";

    let match = 0.62;
    if (strengths.some((s) => category.includes(s) || s.includes(category))) {
      match += 0.12;
    }
    if (experience && /餐饮|厨师|连锁|运营|门店/.test(experience)) match += 0.08;
    if (budget !== undefined) {
      if (budget < 30) match -= 0.08;
      else if (budget >= 80) match += 0.05;
    }
    match = Math.max(0.35, Math.min(0.92, match));

    const observation = `${city} · ${bench.label}：生命周期「${bench.lifecycle}」，参考客单价 ${bench.priceBand[0]}-${bench.priceBand[1]} 元，食材成本率约 ${(bench.foodCost[0] * 100).toFixed(0)}-${(bench.foodCost[1] * 100).toFixed(0)}%，翻台 ${bench.turn[0]}-${bench.turn[1]}。${bench.notes}。`;

    const diagnosis =
      bench.lifecycle.includes("红海") || bench.lifecycle.includes("成熟")
        ? "品类本身有流量基础，但同质化与防御压力大，必须先回答「占什么心智位置」而不是「能不能开」。"
        : "品类仍有增长空间，关键在于客群/场景是否可钉死，以及资源是否扛得住学习成本。";

    const judgement = `对 ${projectLabel(context)} 而言，${bench.label} 在 ${city} 的品类匹配度约 ${Math.round(match * 100)} 分；适合作为候选赛道，但需后续用竞争与差异化步骤验证可防御性。`;

    return decision({
      idPrefix: "category_analysis",
      problem: `${projectLabel(context)} 品类分析`,
      observation,
      diagnosis,
      judgement,
      strategy: `优先验证：① ${city} 同品类头部玩家心智锚点；② 经营者优势能否形成不可轻易复制的供给；③ 预算是否覆盖 6-12 个月验证期。`,
      action: `完成同城 ${bench.label} 样本店踩点（≥5 家），记录客单价、主推、场景口号与空位；补充品类×城市门店密度数据。`,
      confidence: match,
      evidence: [
        evidence("category_benchmark", observation, 0.85),
        evidence(
          "owner_profile",
          `经验: ${experience}; 优势: ${strengths.join("、") || "未填写"}`,
          0.7,
        ),
      ],
      payload: {
        category: bench.label,
        city,
        lifecycle: bench.lifecycle,
        priceBand: bench.priceBand,
        matchScore: match,
        budget,
      },
    });
  },
};
