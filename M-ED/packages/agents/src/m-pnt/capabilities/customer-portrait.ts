import type { CapabilityDefinition, MKContext } from "@mealkey/agent-sdk";
import {
  categoryBenchmark,
  decision,
  evidence,
  projectLabel,
} from "./_shared";

export const customerPortraitCapability: CapabilityDefinition = {
  id: "customer_portrait",
  name: "客群画像",
  description: "定义目标心智客户、消费场景、决策因素与客群规模方向",
  domain: "analysis",
  inputSchema: {
    type: "object",
    properties: {
      category: { type: "string" },
      district: { type: "string" },
      previousCategorySummary: { type: "string" },
    },
  },
  outputSchema: {
    type: "object",
    properties: {
      coreCustomer: { type: "string" },
      scenes: { type: "array" },
      decisionFactors: { type: "array" },
    },
  },

  async execute(input: unknown, context: MKContext) {
    const params = (input || {}) as Record<string, unknown>;
    const category =
      String(params.category || context.project.category || "餐饮").trim();
    const city = context.project.city || "目标城市";
    const district =
      String(params.district || context.project.district || "核心商圈/社区");
    const profile = context.project.profile || {};
    const statedAudience = String(
      (profile as Record<string, unknown>).audience ||
        (profile as Record<string, unknown>).targetCustomers ||
        "",
    );
    const bench = categoryBenchmark(category);

    const isTea = /茶饮|咖啡|饮品/.test(category);
    const isHotpot = /火锅/.test(category);
    const isBbq = /烧烤|烤串/.test(category);

    const coreCustomer = statedAudience
      ? statedAudience
      : isTea
        ? "18-30 岁城市年轻白领/学生，社交打卡 + 日常刚需混合"
        : isHotpot
          ? "22-40 岁聚餐型客群（朋友局/家庭局），追求氛围与分量感"
          : isBbq
            ? "22-38 岁夜经济社交客群，偏重口味刺激与聚会时长"
            : "25-45 岁本地生活客群（家庭改善 + 朋友小聚），重视口味稳定与性价比";

    const scenes = isTea
      ? ["通勤顺路", "下午茶社交", "外卖到店"]
      : isHotpot || isBbq
        ? ["晚间朋友聚餐", "周末家庭局", "庆祝/团建"]
        : ["周末家庭聚餐", "工作日正餐", "本地宴请轻社交"];

    const decisionFactors = isTea
      ? ["口味创新", "性价比", "出杯速度", "门店氛围"]
      : ["口味记忆点", "环境舒适度", "性价比", "出餐稳定性", "是否适合带人"];

    const observation = `${city}${district} 语境下，${bench.label} 的主力消费更可能落在「${coreCustomer}」；高频场景：${scenes.join("、")}。`;
    const diagnosis =
      "客群过宽是定位失败的第一风险。必须从「所有人」收敛到可被一句场景话钉住的心智客户。";
    const judgement = `建议将目标心智客户收敛为：${coreCustomer}；核心场景优先锁定「${scenes[0]}」，其余场景作延伸而非主锚。`;

    return decision({
      idPrefix: "customer_portrait",
      problem: `${projectLabel(context)} 客群画像`,
      observation,
      diagnosis,
      judgement,
      strategy: `以「谁买单 + 谁传播 + 在什么场合反复想起你」定义客群，而不是人口统计堆砌。决策因素优先级：${decisionFactors.join(" > ")}。`,
      action: "完成 10 个目标客群短访谈（为何来/为何不来/第一联想竞品），输出一句话心智客户定义。",
      confidence: statedAudience ? 0.78 : 0.68,
      evidence: [
        evidence("customer_heuristic", observation, 0.8),
        evidence(
          "scene_map",
          `主场景 ${scenes[0]}；延伸 ${scenes.slice(1).join("、")}`,
          0.75,
        ),
      ],
      payload: {
        coreCustomer,
        scenes,
        decisionFactors,
        district,
        priceBandHint: bench.priceBand,
      },
    });
  },
};
