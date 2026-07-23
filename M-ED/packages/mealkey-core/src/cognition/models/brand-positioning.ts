/**
 * 品牌定位四层模型
 * 
 * 帮助用户设计品牌定位的判断框架。
 */

import type { JudgmentFramework } from "../types";

export const BRAND_POSITIONING_FRAMEWORK: JudgmentFramework = {
  id: "brand-positioning-4layers",
  name: "品牌定位四层",
  description: "帮助设计品牌定位的四层框架：品类、差异化、价值主张、品牌表达",
  category: "startup",

  variables: [
    {
      id: "category",
      name: "品类选择",
      description: "选择什么品类，品类是否有空间",
      weight: 25,
      indicators: [
        {
          id: "category_trend",
          name: "品类趋势",
          question: "这个品类是在上升还是下降？",
          scoring: {
            low: { range: [0, 40], description: "品类衰退", signal: "高风险" },
            mid: { range: [40, 70], description: "品类稳定", signal: "可接受" },
            high: { range: [70, 100], description: "品类上升", signal: "健康" },
          },
        },
        {
          id: "category_competition",
          name: "品类竞争",
          question: "这个品类的竞争激烈吗？",
          scoring: {
            low: { range: [0, 40], description: "竞争激烈，红海", signal: "高风险" },
            mid: { range: [40, 70], description: "竞争适中", signal: "需差异化" },
            high: { range: [70, 100], description: "竞争较少，蓝海", signal: "健康" },
          },
        },
      ],
    },
    {
      id: "differentiation",
      name: "差异化定义",
      description: "和竞争对手有什么不同",
      weight: 30,
      indicators: [
        {
          id: "unique_value",
          name: "独特价值",
          question: "你有什么是竞争对手没有的？",
          scoring: {
            low: { range: [0, 40], description: "没有独特价值", signal: "高风险" },
            mid: { range: [40, 70], description: "有一定差异", signal: "需加强" },
            high: { range: [70, 100], description: "独特价值明显", signal: "健康" },
          },
        },
        {
          id: "perceived_difference",
          name: "感知差异",
          question: "客户能感受到你的不同吗？",
          scoring: {
            low: { range: [0, 40], description: "客户感知不到", signal: "高风险" },
            mid: { range: [40, 70], description: "部分客户能感知", signal: "需优化" },
            high: { range: [70, 100], description: "客户明确感知", signal: "健康" },
          },
        },
      ],
    },
    {
      id: "value_proposition",
      name: "价值主张",
      description: "为什么客户选择你",
      weight: 25,
      indicators: [
        {
          id: "reason_to_choose",
          name: "选择理由",
          question: "客户选择你的理由是什么？",
          scoring: {
            low: { range: [0, 40], description: "没有明确理由", signal: "高风险" },
            mid: { range: [40, 70], description: "有理由但不强", signal: "需强化" },
            high: { range: [70, 100], description: "理由明确有力", signal: "健康" },
          },
        },
      ],
    },
    {
      id: "brand_expression",
      name: "品牌表达",
      description: "品牌如何传达给客户",
      weight: 20,
      indicators: [
        {
          id: "brand_clarity",
          name: "品牌清晰度",
          question: "你的品牌能让客户一眼明白吗？",
          scoring: {
            low: { range: [0, 40], description: "品牌模糊", signal: "风险" },
            mid: { range: [40, 70], description: "基本清晰", signal: "可接受" },
            high: { range: [70, 100], description: "品牌清晰", signal: "健康" },
          },
        },
      ],
    },
  ],

  relationships: [
    {
      from: "category",
      to: "differentiation",
      type: "enables",
      description: "品类选择影响差异化空间",
    },
    {
      from: "differentiation",
      to: "value_proposition",
      type: "enables",
      description: "差异化是价值主张的基础",
    },
    {
      from: "value_proposition",
      to: "brand_expression",
      type: "enables",
      description: "价值主张决定品牌表达",
    },
  ],

  decisionTree: [
    {
      id: "root",
      question: "品类是否可行？",
      conditions: [
        { if: "category.score < 40", then: "reconsider_category", else: "check_differentiation" },
      ],
    },
    {
      id: "check_differentiation",
      question: "是否有差异化？",
      conditions: [
        { if: "differentiation.score < 40", then: "need_differentiation", else: "check_value" },
      ],
    },
    {
      id: "check_value",
      question: "价值主张是否清晰？",
      conditions: [
        { if: "value_proposition.score < 40", then: "clarify_value", else: "ready" },
      ],
    },
    {
      id: "reconsider_category",
      question: "",
      conditions: [],
    },
    {
      id: "need_differentiation",
      question: "",
      conditions: [],
    },
    {
      id: "clarify_value",
      question: "",
      conditions: [],
    },
    {
      id: "ready",
      question: "",
      conditions: [],
    },
  ],
};
