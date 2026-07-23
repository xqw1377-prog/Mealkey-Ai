/**
 * 多方案生成引擎（精简版）
 *
 * @deprecated 使用 buildMatrixInputPackage() + externalCandidates 替代。
 * LLM 模式下由 LLM 生成候选方案。
 * 此文件保留旧版逻辑作为回落，并导出 LLM Prompt 构建函数。
 */
import type { MKContext } from "@mealkey/agent-sdk";
import type { SixDimensionResult } from "./six-dimension-engine";
import { buildCandidatePrompt } from "../llm/llm-prompt-builder";
import { asList } from "../capabilities/_shared";

export type CandidateStyle = "稳健型" | "进攻型" | "备选型";
export type EntryPointType = "竞争空位" | "场景切口" | "人群切口" | "价值切口" | "价格带切口";

export interface PositionCandidate_ {
  id: string;
  name: string;
  oneLiner: string;
  style: CandidateStyle;
  entryPoint: EntryPointType;
  targetCustomer: string;
  coreScene: string;
  differentiationBasis: string;
  keyValue: string;
  competitiveEntryPoint: string;
  capabilityRequirement: string;
  expectedAdvantage: string;
}

/**
 * 构建 LLM 用的候选生成 Prompt
 */
export function buildLLMCandidatePrompt(
  context: MKContext,
  diagnosis: SixDimensionResult,
): string {
  const sixDimStr = JSON.stringify({
    overall_feasibility: diagnosis.overall_positioning_feasibility,
    chain_blocked_at: diagnosis.chain_blocked_at,
    market: diagnosis.market_opportunity.summary,
    competition: diagnosis.competition.summary,
  }, null, 2);

  return buildCandidatePrompt(
    context.project.category || "餐饮",
    context.project.city || "目标城市",
    sixDimStr,
    `经验: ${context.owner.experience || "-"}\n优势: ${JSON.stringify(context.owner.strengths)}\n盲区: ${JSON.stringify(context.owner.weaknesses)}\n预算: ${context.project.budget ?? "-"}万`,
  );
}

/**
 * 旧版规则引擎回落
 */
export function generateCandidates(
  context: MKContext,
  diagnosis: SixDimensionResult,
): PositionCandidate_[] {
  const category = context.project.category || "餐饮";
  const city = context.project.city || "目标城市";
  const district = context.project.district || "核心区域";
  const strengths = asList(context.owner.strengths);
  const topStrength = strengths[0] || "独特供给";
  const budget = typeof context.project.budget === "number" ? context.project.budget : 0;

  const isSocialCat = /火锅|烧烤|湘菜|川菜/.test(category);
  const isTeaCat = /茶饮|咖啡/.test(category);
  const isFastCat = /快餐|简餐|外卖/.test(category);
  const isFamilyCat = /家庭|家常菜|中餐/.test(category);

  const scene = district ? `${district}周边聚餐` : `${city}日常聚餐`;
  if (/火锅|烧烤/.test(category)) return generateDefault(category, city, scene, topStrength, budget, "聚餐");
  if (/茶饮|咖啡/.test(category)) return generateDefault(category, city, `${city}下午茶`, topStrength, budget, "社交");
  if (/湘菜|川菜|家常/.test(category)) return generateDefault(category, city, `${city}家庭聚餐`, topStrength, budget, "家庭");
  if (/快餐|简餐/.test(category)) return generateDefault(category, city, `${city}快速午餐`, topStrength, budget, "工作餐");
  return generateDefault(category, city, `${city}日常用餐`, topStrength, budget, "日常");
}

function generateDefault(
  category: string, city: string, scene: string,
  strength: string, _budget: number, _type: string,
): PositionCandidate_[] {
  return [
    {
      id: "A", name: `${city}${category}·场景钉死型`,
      oneLiner: `成为「${scene}场景里，第一个被想起的${category}」`,
      style: "稳健型", entryPoint: "场景切口",
      targetCustomer: "25-45岁本地客群", coreScene: scene,
      differentiationBasis: "单一场景心智占位",
      keyValue: "场景清晰、复购稳定",
      competitiveEntryPoint: `${scene}场景心智空位`,
      capabilityRequirement: "场景体验可被供给稳定交付",
      expectedAdvantage: "在特定场景中形成优先选择",
    },
    {
      id: "B", name: `${category}·竞争对立型`,
      oneLiner: `不做大而全的${category}，只打「${scene}」这个点`,
      style: "进攻型", entryPoint: "竞争空位",
      targetCustomer: "对现有品牌不满意的客群",
      coreScene: scene,
      differentiationBasis: "对现有品类的明确对立/区隔",
      keyValue: "锋利区隔，易于传播",
      competitiveEntryPoint: "不做X只做Y的对立空位",
      capabilityRequirement: "对立承诺必须被产品/体验支撑",
      expectedAdvantage: "快速建立差异化认知",
    },
    {
      id: "C", name: `${category}·优势放大型`,
      oneLiner: `把「${strength}」做成${category}领域不可替代的心智资产`,
      style: "备选型", entryPoint: "价值切口",
      targetCustomer: "对特定价值敏感的客群",
      coreScene: scene,
      differentiationBasis: `将经营者优势「${strength}」转化为品牌资产`,
      keyValue: "资源匹配度高、执行落地风险低",
      competitiveEntryPoint: "基于独特供给的心智位置",
      capabilityRequirement: "优势必须可被消费者感知且难以复制",
      expectedAdvantage: "执行难度最可控",
    },
  ];
}
