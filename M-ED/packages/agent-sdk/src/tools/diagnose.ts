/**
 * 经营诊断工具
 * 
 * 分析餐饮经营指标数据，返回诊断结果和改进建议。
 */

import type { CapabilityTool } from "../types/capability";

export const diagnoseTool: CapabilityTool = {
  id: "diagnose-operation",
  name: "经营诊断",
  description: "分析餐饮经营指标数据，返回诊断结果和改进建议",
  parameters: {
    type: "object",
    properties: {
      metrics: {
        type: "object",
        description: "经营指标数据",
        properties: {
          revenue: { type: "number", description: "月营收（元）" },
          cost: {
            type: "object",
            description: "成本结构",
            properties: {
              food: { type: "number", description: "食材成本（元）" },
              labor: { type: "number", description: "人力成本（元）" },
              rent: { type: "number", description: "租金（元）" },
            },
          },
          customerCount: { type: "number", description: "月客流量" },
          avgTicket: { type: "number", description: "客单价（元）" },
        },
      },
      focus: {
        type: "string",
        enum: ["cost", "revenue", "labor", "menu", "overall"],
        description: "分析焦点",
      },
    },
    required: ["metrics"],
  },
};
