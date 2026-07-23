/**
 * Launch Agent - 市场分析能力
 *
 * 基于城市和品类，生成市场机会评估
 */

import type { CapabilityDefinition, MKContext, MKDecision } from "@mealkey/agent-sdk";

export const marketCapability: CapabilityDefinition = {
  id: "market_analysis",
  name: "市场分析",
  description: "分析目标城市的餐饮市场机会，包括竞争格局和消费者需求",
  domain: "market",
  inputSchema: {
    type: "object",
    properties: {
      city: { type: "string", description: "城市" },
      district: { type: "string", description: "区域" },
      category: { type: "string", description: "餐饮品类" },
    },
    required: ["city"],
  },
  outputSchema: {
    type: "object",
    properties: {
      marketSize: { type: "string" },
      competitionLevel: { type: "string" },
      opportunityScore: { type: "number" },
    },
  },
  
  async execute(input: unknown, context: MKContext): Promise<MKDecision> {
    const inputObj = (input ?? {}) as Record<string, unknown>;
    const city = (inputObj.city as string) ?? context.project.city ?? "未知";
    const category = (inputObj.category as string) ?? context.project.category ?? "未知";
    const district = (inputObj.district as string) ?? context.project.district ?? "全市";
    
    // 城市等级分析
    const tier1Cities = ["北京", "上海", "广州", "深圳"];
    const tier2Cities = ["杭州", "成都", "武汉", "南京", "重庆", "西安", "苏州", "长沙", "天津", "郑州"];
    const cityTier = tier1Cities.includes(city) ? "一线" : tier2Cities.includes(city) ? "新一线/二线" : "三线及以下";
    
    // 品类市场容量估算
    const categoryCapacity: Record<string, { demand: string; competition: string; growth: string }> = {
      "湘菜": { demand: "高", competition: "中", growth: "稳定" },
      "川菜": { demand: "高", competition: "高", growth: "稳定" },
      "火锅": { demand: "高", competition: "极高", growth: "中" },
      "茶饮": { demand: "极高", competition: "极高", growth: "放缓" },
      "快餐": { demand: "高", competition: "高", growth: "中" },
      "面馆": { demand: "中高", competition: "中", growth: "稳定" },
      "烧烤": { demand: "高", competition: "中高", growth: "中" },
      "日料": { demand: "中", competition: "中", growth: "中" },
      "咖啡": { demand: "高(一线)/中(其他)", competition: "高", growth: "快速增长" },
      "烘焙": { demand: "中", competition: "中高", growth: "中" },
    };
    const capInfo = categoryCapacity[category] ?? { demand: "待调研", competition: "待调研", growth: "待调研" };
    
    // 机会评分
    let score = 60;
    if (tier1Cities.includes(city)) score += 10; // 一线城市市场大
    else if (tier2Cities.includes(city)) score += 5;
    if (capInfo.demand === "极高" || capInfo.demand === "高") score += 10;
    if (capInfo.competition === "极高") score -= 15;
    else if (capInfo.competition === "高") score -= 5;
    
    const finalScore = Math.max(10, Math.min(95, score));
    
    return {
      id: `market_${Date.now()}`,
      problem: `${city} ${category} 市场机会分析`,
      observation: `城市等级: ${cityTier} | 品类: ${category} | 区域: ${district} | 市场需求: ${capInfo.demand} | 竞争程度: ${capInfo.competition} | 增长趋势: ${capInfo.growth}`,
      diagnosis: finalScore >= 70 ? "市场机会较好" : finalScore >= 50 ? "市场机会一般，需要差异化" : "市场竞争激烈或需求不足",
      judgement: finalScore >= 70 ? "建议进入，找准细分定位" : finalScore >= 50 ? "谨慎进入，必须差异化" : "不建议直接进入，考虑其他品类或城市",
      strategy: finalScore >= 70 
        ? "快速验证市场需求，抢占窗口期" 
        : finalScore >= 50 
          ? "深度调研竞品，寻找差异化空间" 
          : "重新评估品类选择或目标城市",
      action: finalScore >= 70 
        ? "开展目标客群调研" 
        : "分析竞品数据，找出市场空白",
      confidence: Math.round(finalScore) / 100,
      evidence: [{
        source: "observation",
        content: JSON.stringify({ city, category, district, cityTier, demand: capInfo.demand, competition: capInfo.competition }),
        relevance: 0.8,
      }],
    };
  },
};
