/**
 * 知识检索工具
 * 
 * 从知识库中检索相关知识。
 */

import type { CapabilityTool } from "../types/capability";

export const searchTool: CapabilityTool = {
  id: "knowledge-search",
  name: "知识检索",
  description: "从经营知识库中检索相关知识和经验",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "搜索关键词" },
      categoryId: { type: "string", description: "限定分类 ID" },
      topK: { type: "number", description: "返回数量", default: 5 },
    },
    required: ["query"],
  },
};
