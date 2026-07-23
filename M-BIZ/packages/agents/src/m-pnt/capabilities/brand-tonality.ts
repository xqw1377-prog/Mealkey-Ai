import type { CapabilityDefinition, MKContext } from "@mealkey/agent-sdk";
import {
  categoryBenchmark,
  decision,
  evidence,
  projectLabel,
} from "./_shared";

export const brandTonalityCapability: CapabilityDefinition = {
  id: "brand_tonality",
  name: "品牌调性",
  description: "基于差异化方向定义品牌价值主张、人格、视觉与传播调性",
  domain: "strategy",
  inputSchema: {
    type: "object",
    properties: {
      differentiationSummary: { type: "string" },
      primaryDirection: { type: "string" },
    },
  },
  outputSchema: {
    type: "object",
    properties: {
      valueProposition: { type: "string" },
      personality: { type: "string" },
      visualHints: { type: "object" },
    },
  },

  async execute(input: unknown, context: MKContext) {
    const params = (input || {}) as Record<string, unknown>;
    const category =
      String(context.project.category || "餐饮").trim() || "餐饮";
    const city = context.project.city || "目标城市";
    const bench = categoryBenchmark(category);
    const direction =
      String(params.primaryDirection || params.differentiationSummary || "") ||
      `${city}${bench.label}场景钉死型`;

    const valueProposition = `在 ${city}，为明确场景下的目标客群，提供「可被记住的${bench.label}体验」——不是大而全，而是一个说得清的理由。`;
    const personality = /茶饮|潮流|年轻/.test(category + direction)
      ? "轻快、有主见、社交友好"
      : /高端|精致/.test(direction)
        ? "克制、专业、有分寸感"
        : "实在、有脾气、值得带人来";

    const visualHints = {
      color: /湘|辣|火|烧烤/.test(category)
        ? "暖色主调（红/橙/木色）+ 干净留白"
        : "低饱和主色 + 一个记忆色点睛",
      space: "让主场景在动线与桌型上被看见，而不是装修堆料",
      language: "短句、可转述、禁空洞形容词",
    };

    const observation = `差异化方向「${direction}」需要被翻译成可感知的品牌人格与表达系统，否则定位停在策略层。`;
    const diagnosis =
      "调性若与价格带/场景/供给不一致，会造成心智噪声；调性服务定位，而不是反过来。";
    const judgement = `建议品牌人格：${personality}。价值主张：${valueProposition}`;

    return decision({
      idPrefix: "brand_tonality",
      problem: `${projectLabel(context)} 品牌调性`,
      observation,
      diagnosis,
      judgement,
      strategy: `视觉：${visualHints.color}；空间：${visualHints.space}；话术：${visualHints.language}。传播优先做场景内容与口碑转述，而非空泛品牌片。`,
      action:
        "输出一页品牌调性板：一句话主张、三可做、三不做、主色与禁用词；门店与菜单先对齐。",
      confidence: 0.7,
      evidence: [
        evidence("value_proposition", valueProposition, 0.85),
        evidence("personality", personality, 0.8),
        evidence("visual_hints", JSON.stringify(visualHints), 0.75),
      ],
      payload: {
        valueProposition,
        personality,
        visualHints,
        storyLine: `从经营者真实优势出发，讲述为何只服务「这一类场景/客群」。`,
        channelHints: ["到店体验即传播", "本地生活平台场景内容", "老客转介绍话术"],
      },
    });
  },
};
