/**
 * 开店可行性三问模型
 * 
 * 简化版判断框架，快速评估开店可行性。
 */

import type { JudgmentFramework } from "../types";

export const FEASIBILITY_FRAMEWORK: JudgmentFramework = {
  id: "feasibility-3questions",
  name: "开店可行性三问",
  description: "快速评估开店可行性的三个核心问题",
  category: "startup",

  variables: [
    {
      id: "demand",
      name: "需求验证",
      description: "这个位置的人需要你的产品吗？",
      weight: 40,
      indicators: [
        {
          id: "demand_exists",
          name: "需求存在",
          question: "这个位置的人有吃你这类产品的需求吗？",
          scoring: {
            low: { range: [0, 40], description: "没有明显需求", signal: "高风险" },
            mid: { range: [40, 70], description: "有需求但不强烈", signal: "需验证" },
            high: { range: [70, 100], description: "需求明确强烈", signal: "健康" },
          },
        },
        {
          id: "demand_match",
          name: "需求匹配",
          question: "你的产品能匹配这个需求吗？",
          scoring: {
            low: { range: [0, 40], description: "匹配度低", signal: "高风险" },
            mid: { range: [40, 70], description: "基本匹配", signal: "需优化" },
            high: { range: [70, 100], description: "高度匹配", signal: "健康" },
          },
        },
      ],
    },
    {
      id: "capability",
      name: "能力验证",
      description: "你有能力做好这件事吗？",
      weight: 30,
      indicators: [
        {
          id: "product_capability",
          name: "产品能力",
          question: "你能做出有竞争力的产品吗？",
          scoring: {
            low: { range: [0, 40], description: "能力不足", signal: "高风险" },
            mid: { range: [40, 70], description: "基本具备", signal: "需提升" },
            high: { range: [70, 100], description: "能力突出", signal: "健康" },
          },
        },
        {
          id: "operation_capability",
          name: "运营能力",
          question: "你有能力持续运营这家店吗？",
          scoring: {
            low: { range: [0, 40], description: "运营能力弱", signal: "高风险" },
            mid: { range: [40, 70], description: "基本能运营", signal: "需加强" },
            high: { range: [70, 100], description: "运营能力强", signal: "健康" },
          },
        },
      ],
    },
    {
      id: "economics",
      name: "经济验证",
      description: "能赚钱吗？",
      weight: 30,
      indicators: [
        {
          id: "profit_potential",
          name: "盈利潜力",
          question: "这个项目有盈利的可能吗？",
          scoring: {
            low: { range: [0, 40], description: "盈利困难", signal: "高风险" },
            mid: { range: [40, 70], description: "有盈利可能", signal: "需验证" },
            high: { range: [70, 100], description: "盈利潜力大", signal: "健康" },
          },
        },
        {
          id: "risk_reward",
          name: "风险收益比",
          question: "风险和收益的比例合理吗？",
          scoring: {
            low: { range: [0, 40], description: "风险过高", signal: "高风险" },
            mid: { range: [40, 70], description: "风险可控", signal: "需评估" },
            high: { range: [70, 100], description: "风险收益比合理", signal: "健康" },
          },
        },
      ],
    },
  ],

  relationships: [
    {
      from: "demand",
      to: "economics",
      type: "enables",
      description: "需求是盈利的基础",
    },
    {
      from: "capability",
      to: "demand",
      type: "enables",
      description: "能力决定能否满足需求",
    },
  ],

  decisionTree: [
    {
      id: "root",
      question: "需求是否验证？",
      conditions: [
        { if: "demand.score < 40", then: "reject", else: "check_capability" },
      ],
    },
    {
      id: "check_capability",
      question: "能力是否具备？",
      conditions: [
        { if: "capability.score < 40", then: "improve_first", else: "check_economics" },
      ],
    },
    {
      id: "check_economics",
      question: "经济是否可行？",
      conditions: [
        { if: "economics.score < 40", then: "reconsider", else: "proceed" },
      ],
    },
    {
      id: "reject",
      question: "",
      conditions: [],
    },
    {
      id: "improve_first",
      question: "",
      conditions: [],
    },
    {
      id: "reconsider",
      question: "",
      conditions: [],
    },
    {
      id: "proceed",
      question: "",
      conditions: [],
    },
  ],
};
