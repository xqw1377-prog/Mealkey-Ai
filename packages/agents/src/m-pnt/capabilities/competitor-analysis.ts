import type { CapabilityDefinition, MKContext } from "@mealkey/agent-sdk";
import {
  categoryBenchmark,
  decision,
  evidence,
  projectLabel,
  saturationLabel,
} from "./_shared";

export const competitorAnalysisCapability: CapabilityDefinition = {
  id: "competitor_analysis",
  name: "竞品分析",
  description: "梳理直接/间接竞争、壁垒与差异化空位",
  domain: "analysis",
  inputSchema: {
    type: "object",
    properties: {
      category: { type: "string" },
      city: { type: "string" },
      district: { type: "string" },
      storesPer10k: { type: "number" },
    },
  },
  outputSchema: {
    type: "object",
    properties: {
      directCompetitors: { type: "array" },
      saturation: { type: "string" },
      whiteSpace: { type: "string" },
    },
  },

  async execute(input: unknown, context: MKContext) {
    const params = (input || {}) as Record<string, unknown>;
    const category =
      String(params.category || context.project.category || "餐饮").trim();
    const city = String(params.city || context.project.city || "目标城市");
    const district = String(
      params.district || context.project.district || "目标区域",
    );
    const storesPer10k =
      typeof params.storesPer10k === "number"
        ? (params.storesPer10k as number)
        : undefined;
    const bench = categoryBenchmark(category);
    const sat = saturationLabel(storesPer10k);

    const direct = [
      `同品类同价格带本地连锁（${bench.label}主航道）`,
      `同区域高评分单店（口味/口碑型）`,
      `平台流量型外卖玩家（价格与便利替代）`,
    ];
    const indirect = [
      "邻近品类聚餐替代（火锅/烧烤/家常菜互抢场景）",
      "社区团购/预制菜家庭场景替代",
    ];

    const whiteSpace =
      sat === "红海" || sat === "饱和竞争"
        ? "正面硬碰份额难；应找「场景细分 + 心智第一联想」空位，而非再开一家标准店。"
        : "仍有进入窗口，但要用可防御的差异钉住，避免成为可替换的「又一家」。";

    const observation = `${city}/${district} · ${bench.label}：竞争假设「${sat}」。直接对手聚焦同价同场景；间接对手来自场景替代。`;
    const diagnosis =
      "竞争分析的终点不是列竞品名单，而是回答：第一联想归谁、我们能抢哪一个尚未被占稳的联想。";
    const judgement = `差异化机会方向：在 ${district} 对 ${bench.label} 客群，优先争夺「${bench.label.includes("茶") ? "即时满足+人设感" : "可带人的明确场景记忆"}」相关空位。${whiteSpace}`;

    return decision({
      idPrefix: "competitor_analysis",
      problem: `${projectLabel(context)} 竞争分析`,
      observation,
      diagnosis,
      judgement,
      strategy:
        "对标三维：心智（第一联想）、供给（产品/体验是否可抄）、资源（租金/供应链/组织）。只打有把握的切口。",
      action:
        "建立竞品卡：每家一句话定位、主推、客单、场景口号、弱点；标出 1 个可进攻空位与 2 个禁入红区。",
      confidence: storesPer10k === undefined ? 0.64 : 0.76,
      evidence: [
        evidence("competitive_landscape", observation, 0.8),
        evidence("white_space", whiteSpace, 0.78),
      ],
      payload: {
        saturation: sat,
        storesPer10k,
        directCompetitors: direct,
        indirectCompetitors: indirect,
        whiteSpace,
      },
    });
  },
};
