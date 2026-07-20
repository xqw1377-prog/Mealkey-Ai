/**
 * M-PNT 矩阵知识加载器
 *
 * 合并三学派规则与案例，供矩阵 Agent evaluate() 注入上下文。
 */
import type { CaseAsset, TheoryRule, TheorySource } from "./types";
import { riesRules } from "./ries-rules";
import { troutRules } from "./trout-rules";
import { yeRules } from "./ye-rules";
import { caseAssets } from "./cases";

/** 全部理论规则（三学派合并） */
export const allRules: TheoryRule[] = [
  ...riesRules,
  ...troutRules,
  ...yeRules,
];

/** 全部案例资产 */
export const allCases: CaseAsset[] = caseAssets;

/** 知识库统计 */
export const KNOWLEDGE_STATS = {
  riesRules: riesRules.length,
  troutRules: troutRules.length,
  yeRules: yeRules.length,
  totalRules: allRules.length,
  totalCases: allCases.length,
  casesByTier: {
    gold: allCases.filter((c) => c.quality_tier === "gold_case").length,
    silver: allCases.filter((c) => c.quality_tier === "silver_case").length,
    bronze: allCases.filter((c) => c.quality_tier === "bronze_case").length,
  },
} as const;

const SEAT_LABELS: Record<TheorySource, string> = {
  ries: "心智官",
  trout: "空位官",
  ye_maozhong: "冲突官",
};

function seatLabel(source: TheorySource): string {
  return SEAT_LABELS[source];
}

/**
 * 获取某理论体系的完整知识上下文（理论规则 + 参考案例）
 * 用于注入 Agent 的 systemPrompt
 */
export function getTheoryKnowledge(source: TheorySource): string {
  const rules = getRules(source);
  const cases = getCases(source).slice(0, 4);

  const parts: string[] = [];

  parts.push(`【${seatLabel(source)} 核心判断规则（${rules.length}条）】\n`);
  for (const rule of rules) {
    parts.push(`■ ${rule.name}`);
    parts.push(`  原理：${rule.principle}`);
    parts.push(`  判断问题：${rule.decision_question}`);
    parts.push(`  决策规则：`);
    for (const r of rule.decision_rules) parts.push(`    · ${r}`);
    parts.push(`  反模式（禁止）：`);
    for (const a of rule.anti_patterns) parts.push(`    · ${a}`);
    parts.push("");
  }

  if (cases.length > 0) {
    parts.push(`【${seatLabel(source)} 视角参考案例】\n`);
    for (const c of cases) {
      parts.push(`■ ${c.brand_name}（${c.category}·${c.city_context}）`);
      parts.push(`  初始问题：${c.initial_problem}`);
      parts.push(`  最终定位：${c.final_position}`);
      parts.push(`  选择理由：${c.why_choose}`);
      parts.push(`  差异设计：${c.differentiation_design}`);
      parts.push(`  结果：${c.result_summary}`);
      parts.push(`  心智启示：${c.mental_takeaway}`);
      parts.push("");
    }
  }

  return parts.join("\n");
}

/** 获取某学派全部规则 */
export function getRules(source: TheorySource): TheoryRule[] {
  return allRules.filter((r) => r.theory_source === source);
}

/** 获取某学派标签关联的全部案例 */
export function getCases(source: TheorySource): CaseAsset[] {
  return allCases.filter((c) => c.theory_tags.includes(source));
}

/** 按 theory_tags 交集检索案例（任一 tag 命中即返回） */
export function getCaseByTags(
  tags: TheorySource[],
  limit = 8,
): CaseAsset[] {
  if (tags.length === 0) return allCases.slice(0, limit);
  return allCases
    .filter((c) => c.theory_tags.some((t) => tags.includes(t)))
    .slice(0, limit);
}
