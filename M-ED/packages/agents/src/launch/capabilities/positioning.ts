/**
 * Launch Agent - 定位策略能力
 *
 * 基于项目信息生成开店定位策略
 */

import type { CapabilityDefinition, MKContext, MKDecision } from "@mealkey/agent-sdk";

export const positioningCapability: CapabilityDefinition = {
  id: "positioning",
  name: "定位策略",
  description: "基于市场分析，制定开店定位策略，包括客群、价格带、差异化",
  domain: "strategy",
  inputSchema: {
    type: "object",
    properties: {
      targetCustomers: { type: "string", description: "目标客群" },
      priceRange: { type: "string", description: "价格带" },
    },
  },
  outputSchema: {
    type: "object",
    properties: {
      targetCustomers: { type: "string" },
      priceRange: { type: "string" },
      differentiation: { type: "string" },
    },
  },
  
  async execute(input: unknown, context: MKContext): Promise<MKDecision> {
    const inputObj = (input ?? {}) as Record<string, unknown>;
    const city = context.project.city ?? "未知";
    const category = context.project.category ?? "待定";
    const budget = context.project.budget ?? null;
    const owner = context.owner;
    
    // 基于品类推荐价格带
    const priceGuide: Record<string, { low: string; mid: string; high: string; recommendation: string }> = {
      "湘菜": { low: "40-60", mid: "60-100", high: "100-200", recommendation: "中端" },
      "川菜": { low: "35-55", mid: "55-90", high: "90-180", recommendation: "中端" },
      "火锅": { low: "60-80", mid: "80-120", high: "120-200", recommendation: "中端" },
      "茶饮": { low: "10-18", mid: "18-28", high: "28-45", recommendation: "中端" },
      "快餐": { low: "15-25", mid: "25-40", high: "40-60", recommendation: "性价比" },
      "面馆": { low: "12-20", mid: "20-35", high: "35-60", recommendation: "性价比" },
      "烧烤": { low: "50-70", mid: "70-100", high: "100-150", recommendation: "中端" },
      "日料": { low: "80-120", mid: "120-250", high: "250-500", recommendation: "中高端" },
      "咖啡": { low: "15-25", mid: "25-40", high: "40-65", recommendation: "中端" },
    };
    const guide = priceGuide[category] ?? { low: "待定", mid: "待定", high: "待定", recommendation: "中端" };
    
    // 基于预算调整建议
    let priceLevel = guide.recommendation;
    if (budget !== null) {
      if (budget > 1000000) priceLevel = "中高端";
      else if (budget < 200000) priceLevel = "性价比";
    }
    
    // 客群定位
    const customerSegments: Record<string, string[]> = {
      "湘菜": ["家庭聚餐", "朋友聚会", "上班族午餐"],
      "川菜": ["年轻人", "朋友聚会", "家庭"],
      "火锅": ["年轻人", "朋友聚会", "家庭聚餐"],
      "茶饮": ["Z世代", "白领女性", "学生"],
      "快餐": ["上班族", "学生", "单身"],
      "面馆": ["社区居民", "上班族", "家庭"],
      "烧烤": ["年轻人", "朋友聚会", "夜宵人群"],
      "日料": ["白领", "中产", "情侣"],
      "咖啡": ["白领", "自由职业", "学生"],
    };
    const customers = customerSegments[category] ?? ["目标客群待调研"];
    
    return {
      id: `positioning_${Date.now()}`,
      problem: `${context.project.name ?? "项目"} 定位策略`,
      observation: `品类: ${category} | 城市: ${city} | 预算: ${budget ? (budget / 10000).toFixed(0) + "万" : "待定"} | 经营者经验: ${owner.experience || "未知"}`,
      diagnosis: priceLevel === "高端" || priceLevel === "中高端" 
        ? "高端定位需要品牌力支撑，风险较高" 
        : priceLevel === "性价比" 
          ? "性价比路线需要极致成本控制" 
          : "中端定位适合多数创业者，风险可控",
      judgement: `建议${priceLevel}定位，客单价${guide.mid}元区间，主打${customers[0] ?? "核心客群"}场景`,
      strategy: `定位策略: ${priceLevel}价格带(${guide.mid}元) → 目标客群(${customers.slice(0, 2).join("、")}) → 选址匹配(靠近目标客群)`,
      action: `明确品牌调性，围绕"${customers[0]}"设计产品和服务体验`,
      confidence: category !== "待定" ? 0.65 : 0.35,
      evidence: [{
        source: "observation",
        content: JSON.stringify({ category, city, budget, recommendedPrice: guide.mid, targetCustomers: customers.slice(0, 2) }),
        relevance: 0.7,
      }],
    };
  },
};
