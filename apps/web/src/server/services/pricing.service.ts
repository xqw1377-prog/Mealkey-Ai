/**
 * 定价服务 — 能力定价与消耗预估
 */
import type { PrismaClient } from "@/generated/prisma";

export type CapabilityCode =
  | "general_consulting"
  | "brand_strategy"
  | "market_analysis"
  | "business_model"
  | "equity_design"
  | "founder_council";

const CAPABILITY_LABELS: Record<CapabilityCode, string> = {
  general_consulting: "通用经营咨询",
  brand_strategy: "品牌战略咨询",
  market_analysis: "市场分析",
  business_model: "商业模式分析",
  equity_design: "股权设计",
  founder_council: "创始人会议",
};

const AGENT_TO_CAPABILITY: Record<string, CapabilityCode> = {
  chief: "founder_council",
  "m-pnt": "brand_strategy",
  "m-mkt": "market_analysis",
  "m-biz": "business_model",
  "m-ed": "equity_design",
};

export function mapAgentCodeToCapability(agentCode?: string | null): CapabilityCode {
  if (agentCode && agentCode in AGENT_TO_CAPABILITY) {
    return AGENT_TO_CAPABILITY[agentCode];
  }
  return "general_consulting";
}

export function getCapabilityLabel(capability: CapabilityCode): string {
  return CAPABILITY_LABELS[capability] || capability;
}

export async function estimateCapabilityConsumption(
  prisma: PrismaClient,
  input: {
    capability: CapabilityCode;
    depth?: string;
    complexity?: string | number;
    agents?: string[];
    model?: string;
    dataMode?: string;
  },
) {
  const baseCost = 100;
  const depthMultiplier = input.depth === "deep" ? 3 : input.depth === "standard" ? 2 : 1;
  const complexityMultiplier = typeof input.complexity === "number" ? Math.max(1, Math.ceil(input.complexity)) : 1;
  const agentMultiplier = Math.max(1, (input.agents?.length ?? 1));
  const estimated = baseCost * depthMultiplier * complexityMultiplier * agentMultiplier;

  return {
    estimated,
    baseCost,
    depthMultiplier,
    complexityMultiplier,
    agentMultiplier,
    factors: { depth: input.depth ?? "basic", complexity: input.complexity ?? 1, agentCount: input.agents?.length ?? 1 },
  };
}

export async function ensureCapabilityPricingSeeds(prisma: PrismaClient) {
  // 定价种子初始化逻辑移入 migration，此处空实现保持兼容
  return;
}
