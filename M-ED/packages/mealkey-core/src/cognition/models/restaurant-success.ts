/**
 * 餐饮成功五变量模型
 * 
 * 这是 MealKey 最核心的判断框架。
 * 评估一个餐饮项目能否成功的五个关键变量。
 */

import type { JudgmentFramework } from "../types";

export const RESTAURANT_SUCCESS_FRAMEWORK: JudgmentFramework = {
  id: "restaurant-success-5vars",
  name: "餐饮成功五变量",
  description: "评估餐饮项目成功概率的核心框架：客群、场景、产品、体验、组织",
  category: "startup",

  variables: [
    {
      id: "customer",
      name: "客群",
      description: "目标客群是否清晰、是否有真实需求",
      weight: 25,
      indicators: [
        {
          id: "clarity",
          name: "客群清晰度",
          question: "你能不能用一句话描述你的目标客户？",
          scoring: {
            low: { range: [0, 40], description: "无法描述目标客户", signal: "高风险" },
            mid: { range: [40, 70], description: "能描述但模糊", signal: "需验证" },
            high: { range: [70, 100], description: "清晰具体，有画像", signal: "健康" },
          },
        },
        {
          id: "demand_validation",
          name: "需求验证",
          question: "你验证过这个客群真的需要你的产品吗？",
          scoring: {
            low: { range: [0, 40], description: "没有验证，只是猜测", signal: "高风险" },
            mid: { range: [40, 70], description: "部分验证，有初步反馈", signal: "需加强" },
            high: { range: [70, 100], description: "充分验证，有数据支撑", signal: "健康" },
          },
        },
        {
          id: "demand_frequency",
          name: "需求频率",
          question: "这个客群多久会有一次这个需求？",
          scoring: {
            low: { range: [0, 40], description: "低频，月1次以下", signal: "风险" },
            mid: { range: [40, 70], description: "中频，周1-2次", signal: "可接受" },
            high: { range: [70, 100], description: "高频，几乎每天", signal: "健康" },
          },
        },
      ],
    },
    {
      id: "scenario",
      name: "场景",
      description: "消费场景是否明确、是否高频、是否有复购",
      weight: 20,
      indicators: [
        {
          id: "scenario_clarity",
          name: "场景清晰度",
          question: "你能描述客人在什么场景下来消费吗？",
          scoring: {
            low: { range: [0, 40], description: "不清楚什么场景", signal: "高风险" },
            mid: { range: [40, 70], description: "有场景但不具体", signal: "需细化" },
            high: { range: [70, 100], description: "场景清晰具体", signal: "健康" },
          },
        },
        {
          id: "repurchase_potential",
          name: "复购潜力",
          question: "客人消费后，有多大可能再来？",
          scoring: {
            low: { range: [0, 40], description: "一次性消费为主", signal: "风险" },
            mid: { range: [40, 70], description: "有一定复购", signal: "可接受" },
            high: { range: [70, 100], description: "高复购率", signal: "健康" },
          },
        },
      ],
    },
    {
      id: "product",
      name: "产品",
      description: "产品是否有竞争力、是否有壁垒、是否可复制",
      weight: 25,
      indicators: [
        {
          id: "differentiation",
          name: "差异化",
          question: "你的产品和竞争对手有什么不同？",
          scoring: {
            low: { range: [0, 40], description: "没有明显差异", signal: "高风险" },
            mid: { range: [40, 70], description: "有一定差异", signal: "需加强" },
            high: { range: [70, 100], description: "明显差异化", signal: "健康" },
          },
        },
        {
          id: "quality_consistency",
          name: "品质稳定性",
          question: "你的产品能保持稳定的品质吗？",
          scoring: {
            low: { range: [0, 40], description: "品质不稳定", signal: "高风险" },
            mid: { range: [40, 70], description: "基本稳定", signal: "需优化" },
            high: { range: [70, 100], description: "高度稳定", signal: "健康" },
          },
        },
        {
          id: "cost_structure",
          name: "成本结构",
          question: "你的产品成本结构是否健康？",
          scoring: {
            low: { range: [0, 40], description: "成本率>40%", signal: "高风险" },
            mid: { range: [40, 70], description: "成本率30-40%", signal: "需优化" },
            high: { range: [70, 100], description: "成本率<30%", signal: "健康" },
          },
        },
      ],
    },
    {
      id: "experience",
      name: "体验",
      description: "用户体验是否有记忆点、是否能形成口碑",
      weight: 15,
      indicators: [
        {
          id: "memory_point",
          name: "记忆点",
          question: "客人离开后，会记住什么？",
          scoring: {
            low: { range: [0, 40], description: "没有记忆点", signal: "风险" },
            mid: { range: [40, 70], description: "有一些记忆点", signal: "可接受" },
            high: { range: [70, 100], description: "强烈记忆点", signal: "健康" },
          },
        },
        {
          id: "word_of_mouth",
          name: "口碑传播",
          question: "客人会主动推荐给朋友吗？",
          scoring: {
            low: { range: [0, 40], description: "不会推荐", signal: "风险" },
            mid: { range: [40, 70], description: "偶尔推荐", signal: "可接受" },
            high: { range: [70, 100], description: "主动推荐", signal: "健康" },
          },
        },
      ],
    },
    {
      id: "organization",
      name: "组织",
      description: "团队能力是否支撑项目、是否有执行力",
      weight: 15,
      indicators: [
        {
          id: "team_capability",
          name: "团队能力",
          question: "你的团队能做好这件事吗？",
          scoring: {
            low: { range: [0, 40], description: "能力不足", signal: "高风险" },
            mid: { range: [40, 70], description: "基本胜任", signal: "需提升" },
            high: { range: [70, 100], description: "能力突出", signal: "健康" },
          },
        },
        {
          id: "execution_power",
          name: "执行力",
          question: "你的团队能把计划落地吗？",
          scoring: {
            low: { range: [0, 40], description: "执行力弱", signal: "高风险" },
            mid: { range: [40, 70], description: "基本能执行", signal: "需加强" },
            high: { range: [70, 100], description: "执行力强", signal: "健康" },
          },
        },
      ],
    },
  ],

  relationships: [
    {
      from: "customer",
      to: "product",
      type: "enables",
      description: "客群清晰度直接影响产品设计",
    },
    {
      from: "product",
      to: "experience",
      type: "enables",
      description: "产品力是体验的基础",
    },
    {
      from: "scenario",
      to: "customer",
      type: "enables",
      description: "消费场景决定客群画像",
    },
    {
      from: "organization",
      to: "product",
      type: "enables",
      description: "组织能力决定产品执行力",
    },
  ],

  decisionTree: [
    {
      id: "root",
      question: "客群是否清晰？",
      conditions: [
        { if: "customer.score < 40", then: "high_risk", else: "check_scenario" },
      ],
    },
    {
      id: "check_scenario",
      question: "消费场景是否高频？",
      conditions: [
        { if: "scenario.score < 40", then: "medium_risk", else: "check_product" },
      ],
    },
    {
      id: "check_product",
      question: "产品是否有竞争力？",
      conditions: [
        { if: "product.score < 40", then: "medium_risk", else: "check_organization" },
      ],
    },
    {
      id: "check_organization",
      question: "团队是否有执行力？",
      conditions: [
        { if: "organization.score < 40", then: "medium_risk", else: "feasible" },
      ],
    },
    {
      id: "high_risk",
      question: "",
      conditions: [],
    },
    {
      id: "medium_risk",
      question: "",
      conditions: [],
    },
    {
      id: "feasible",
      question: "",
      conditions: [],
    },
  ],
};
