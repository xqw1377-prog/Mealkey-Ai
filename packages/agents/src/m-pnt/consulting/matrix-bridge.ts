/**
 * 咨询出策主路径：三席思维引擎（造策+论证+交火）
 * 对外席位：心智官 / 空位官 / 冲突官（去真名）
 */
import type { TheoryLLMAdapter } from "../matrix/types";
import type { BrandStrategyProject } from "./types";
import type {
  AdvisorStrategySet,
  MarketResearchPack,
} from "./journey-types";
import { buildAdvisorStrategiesFromResearch } from "./advisor-strategy-engine";
import {
  attachMasterSchemesToSet,
  inventAndAttachMasterSchemes,
  masterSchemeContextFromInputs,
} from "./master-scheme-engine";
import {
  buildThinkingFactPack,
  runThreeSeatThinkingEngines,
} from "../matrix/thinking";
import type { MatrixInputPackage, PositionCandidate } from "../matrix/types";

/** @deprecated 保留给调试；主路径已改走思维引擎自造方向 */
export function buildConsultingMatrixPackage(
  project: BrandStrategyProject,
  research: MarketResearchPack,
  city?: string,
): MatrixInputPackage {
  const f = buildThinkingFactPack(project, research, city);
  const candidates: PositionCandidate[] = [
    {
      id: "A",
      name: `心智第一·${f.whitespace.slice(0, 10)}`,
      oneLiner: `只做「${f.whitespace.slice(0, 10)}」第一，不做大而全`,
      type: "心智占位",
      focus: "第一/聚焦/牺牲",
    },
    {
      id: "B",
      name: `竞争空位·对${f.rivals[0] || "同质馆"}`,
      oneLiner: `不是更好的${f.rivals[0] || "同质馆"}，而是不同选项`,
      type: "进攻·区隔",
      focus: "空位/对立/竞争",
    },
    {
      id: "C",
      name: `场合冲突·${f.who}`,
      oneLiner: `打破赌运气，当场兑现「${f.need}」`,
      type: "情绪场景",
      focus: "冲突/场景/传播",
    },
  ];
  return {
    project: {
      name: project.projectId,
      category: f.category,
      city: f.city,
      stage: "positioning",
    },
    owner: {
      experience: f.edge,
      strengths: f.strengths,
      weaknesses: f.weaknesses,
    },
    previousSummary: f.researchHeadline,
    candidates,
    constraints: f.constraints,
  };
}

function attachSchemesSync(
  project: BrandStrategyProject,
  research: MarketResearchPack,
  city: string | undefined,
  set: AdvisorStrategySet,
): AdvisorStrategySet {
  const f = buildThinkingFactPack(project, research, city);
  const ctx = masterSchemeContextFromInputs({
    brandName: research.scope?.brandName || f.brandLabel,
    category: f.category,
    city: f.city,
    who: f.who,
    need: f.need,
    edge: f.edge,
    rivals: f.rivals,
    whitespace: f.whitespace,
    categoryTrend: f.categoryTrend,
    consumerShift: f.consumerShift,
    competitiveLandscape: f.competitiveLandscape,
    headline: f.researchHeadline,
  });
  return {
    ...set,
    schemeContext: ctx,
    masterSchemeMode: "heuristic",
    strategies: attachMasterSchemesToSet(set.strategies, ctx),
  };
}

async function attachSchemesAsync(
  project: BrandStrategyProject,
  research: MarketResearchPack,
  city: string | undefined,
  set: AdvisorStrategySet,
  llm?: TheoryLLMAdapter,
): Promise<AdvisorStrategySet> {
  const f = buildThinkingFactPack(project, research, city);
  const ctx = masterSchemeContextFromInputs({
    brandName: research.scope?.brandName || f.brandLabel,
    category: f.category,
    city: f.city,
    who: f.who,
    need: f.need,
    edge: f.edge,
    rivals: f.rivals,
    whitespace: f.whitespace,
    categoryTrend: f.categoryTrend,
    consumerShift: f.consumerShift,
    competitiveLandscape: f.competitiveLandscape,
    headline: f.researchHeadline,
  });
  const invented = await inventAndAttachMasterSchemes(
    set.strategies,
    ctx,
    llm,
  );
  return {
    ...set,
    strategies: invented.strategies,
    schemeContext: invented.schemeContext,
    masterSchemeMode: invented.usedLlm ? "llm_hybrid" : "heuristic",
  };
}

/** 主路径：三席思维引擎；仅灾难时回退模板 */
export async function buildAdvisorStrategiesWithMatrix(
  project: BrandStrategyProject,
  research: MarketResearchPack,
  city?: string,
  options?: { llm?: TheoryLLMAdapter },
): Promise<AdvisorStrategySet> {
  try {
    const { set } = await runThreeSeatThinkingEngines(
      project,
      research,
      city,
      options,
    );
    return await attachSchemesAsync(
      project,
      research,
      city,
      set,
      options?.llm,
    );
  } catch {
    try {
      const { set } = await runThreeSeatThinkingEngines(project, research, city);
      return await attachSchemesAsync(project, research, city, set, options?.llm);
    } catch {
      const fallback = buildAdvisorStrategiesFromResearch(project, research);
      return {
        ...attachSchemesSync(project, research, city, fallback),
        theoryMode: "template_fallback",
      };
    }
  }
}
