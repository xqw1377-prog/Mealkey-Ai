/**
 * 报告生成工具
 * 
 * 根据分析数据生成结构化经营报告。
 */

import type { CapabilityTool } from "../types/capability";

export const reportTool: CapabilityTool = {
  id: "generate-report",
  name: "报告生成",
  description: "根据经营分析数据生成结构化报告",
  parameters: {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: ["diagnosis", "monthly", "location", "menu", "custom"],
        description: "报告类型",
      },
      title: { type: "string", description: "报告标题" },
      data: {
        type: "object",
        description: "报告数据",
      },
    },
    required: ["type", "data"],
  },
};
