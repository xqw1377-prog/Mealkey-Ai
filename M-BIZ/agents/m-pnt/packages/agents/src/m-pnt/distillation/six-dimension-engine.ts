/**
 * 六维诊断引擎（精简版）
 *
 * MealKey LLM 模式下，六维诊断由 LLM 完成。
 * 此文件保留为薄包装，调用 LLM Prompt Builder。
 * 同时保留旧版规则逻辑作为回落。
 */
import type { MKContext } from "@mealkey/agent-sdk";
import { buildSixDimensionPrompt } from "../llm/llm-prompt-builder";
import { asList } from "../capabilities/_shared";

export type DimensionLevel = "strong" | "adequate" | "weak" | "failed";
export type OverallFeasibility = "high" | "medium" | "low" | "not_recommended";

export interface SixDimensionResult {
  market_opportunity: { level: DimensionLevel; summary: string; detail: string };
  competition: { level: DimensionLevel; density: string; summary: string; white_space_hint: string };
  target_customer: { level: DimensionLevel; fit: string; summary: string; core_audience: string };
  scene_opportunity: { level: DimensionLevel; strength: string; summary: string; primary_scene: string; scene_frequency: string };
  resource_fit: { level: DimensionLevel; capability_gap: string[]; summary: string };
  defensibility: { level: DimensionLevel; defensibility_level: string; summary: string; imitation_barrier: string };
  overall_positioning_feasibility: OverallFeasibility;
  chain_blocked_at?: string;
}

/**
 * 构建 LLM 用的六维诊断 Prompt
 */
export function buildLLMSixDimensionPrompt(context: MKContext): string {
  return buildSixDimensionPrompt(
    context.project.category || "餐饮",
    context.project.city || "目标城市",
    `经验: ${context.owner.experience || "-"}\n优势: ${JSON.stringify(context.owner.strengths)}\n盲区: ${JSON.stringify(context.owner.weaknesses)}`,
    `品类: ${context.project.category || "-"}\n城市: ${context.project.city || "-"}\n区域: ${context.project.district || "-"}\n预算: ${context.project.budget ?? "-"}万`,
  );
}

/**
 * 旧版规则引擎回落
 */
export function runSixDimensionDiagnosis(context: MKContext): SixDimensionResult {
  const category = context.project.category || "";
  const city = context.project.city || "";

  const hasMarket = !!category && !!city;
  const budget = typeof context.project.budget === "number" ? context.project.budget : 0;
  const strengths = asList(context.owner.strengths);
  const weaknesses = asList(context.owner.weaknesses);
  const experience = context.owner.experience || "";

  // 市场机会
  const marketLevel: DimensionLevel = (!hasMarket) ? "failed" : (budget > 0 && budget < 20) ? "weak" : "adequate";

  // 竞争格局
  const isRedOcean = ["火锅", "茶饮", "咖啡", "烧烤"].some((c) => category.includes(c));
  const compLevel: DimensionLevel = isRedOcean ? "adequate" : "adequate";

  // 客群
  const custHasInfo = strengths.length > 0 || weaknesses.length > 0 || experience.length > 0;
  const custLevel: DimensionLevel = !custHasInfo ? "failed" : strengths.length <= 1 && !experience ? "weak" : "adequate";

  // 场景
  const strongScene = ["烧烤", "火锅", "湘菜", "川菜"].some((c) => category.includes(c));
  const sceneLevel: DimensionLevel = strongScene ? "strong" : "adequate";

  // 资源
  const gaps: string[] = [];
  if (budget <= 0 && strengths.length === 0) gaps.push("未提供预算与能力信息");
  if (budget > 0 && budget < 30) gaps.push("预算偏低");
  if (!experience && budget > 0 && budget < 80) gaps.push("经验不足且预算中低");
  const resourceLevel: DimensionLevel = gaps.length >= 3 ? "weak" : gaps.length >= 1 ? "adequate" : "strong";

  // 可防御性
  const hasSupplyChain = strengths.some((s) => /供应链|食材|配方/.test(s));
  const defLevel: DimensionLevel = hasSupplyChain ? "strong" : ["茶饮", "快餐", "简餐"].some((c) => category.includes(c)) ? "weak" : "adequate";

  // 总可行性
  const levels = [marketLevel, compLevel, custLevel, sceneLevel, resourceLevel, defLevel];
  const failedCount = levels.filter((l) => l === "failed").length;
  const weakCount = levels.filter((l) => l === "weak").length;
  let feasibility: OverallFeasibility = "high";
  let blockedAt: string | undefined;

  if (failedCount > 0) {
    feasibility = "not_recommended";
    if (marketLevel === "failed") blockedAt = "市场机会";
    else if (custLevel === "failed") blockedAt = "目标客群";
  } else if (weakCount >= 3) {
    feasibility = "low";
  } else if (weakCount >= 1) {
    feasibility = "medium";
  }

  return {
    market_opportunity: { level: marketLevel, summary: hasMarket ? `${city}${category}有基础市场` : "无法判断", detail: "" },
    competition: { level: compLevel, density: isRedOcean ? "red_ocean" : "moderate", summary: "", white_space_hint: "" },
    target_customer: { level: custLevel, fit: custLevel === "adequate" ? "clear" : "vague", summary: "", core_audience: "" },
    scene_opportunity: { level: sceneLevel, strength: strongScene ? "strong" : "moderate", summary: "", primary_scene: `${city}日常用餐`, scene_frequency: "high" },
    resource_fit: { level: resourceLevel, capability_gap: gaps, summary: gaps.length === 0 ? "资源条件充分" : `缺口：${gaps.slice(0, 2).join("、")}` },
    defensibility: { level: defLevel, defensibility_level: hasSupplyChain ? "strong" : "moderate", summary: "", imitation_barrier: hasSupplyChain ? "high" : "medium" },
    overall_positioning_feasibility: feasibility,
    chain_blocked_at: blockedAt,
  };
}
