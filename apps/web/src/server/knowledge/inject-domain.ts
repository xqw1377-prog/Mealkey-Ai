/**
 * 把领域种子注入 MKContext.knowledge，并生成可拼进 prompt 的摘要。
 * 市场域额外叠加 knowledge-engine 的 matchRules / findSimilarCases。
 */

import type { MKContext } from "@mealkey/agent-sdk";
import { matchRules, findSimilarCases } from "@mealkey/knowledge-engine";
import {
  getSeedsForDomain,
  type DomainKnowledgeSeed,
} from "./domain-seeds";

function matchSeed(seed: DomainKnowledgeSeed, message: string, category?: string | null): boolean {
  const hay = `${message} ${category || ""}`.toLowerCase();
  if (!hay.trim()) return true;
  return seed.tags.some((tag) => hay.includes(tag.toLowerCase())) || seed.content.includes(category || "");
}

function buildRuleFacts(ctx: MKContext): Record<string, unknown> {
  const experienceYears = parseInt(String(ctx.owner?.experience || "0"), 10) || 0;
  const budget = ctx.project?.budget;
  return {
    city: ctx.project?.city || undefined,
    category: ctx.project?.category || undefined,
    stage: ctx.project?.stage || undefined,
    experience_years: experienceYears,
    investment: typeof budget === "number" ? budget * 10000 : undefined,
  };
}

export function injectDomainKnowledge(
  ctx: MKContext,
  domain: DomainKnowledgeSeed["domain"],
  message = "",
): MKContext {
  const seeds = getSeedsForDomain(domain);
  const matched = seeds.filter((seed) => matchSeed(seed, message, ctx.project?.category));
  const picked = (matched.length > 0 ? matched : seeds).slice(0, 12);

  const extraRules = picked
    .filter((k) => k.type === "RULE" || k.type === "EXPERIENCE" || k.type === "FACT")
    .map((k) => ({ id: k.id, title: k.title, content: k.content }));

  const extraCases = picked
    .filter((k) => k.type === "CASE")
    .map((k) => ({ id: k.id, title: k.title, outcome: k.content }));

  const extraModels = picked
    .filter((k) => k.type === "MODEL")
    .map((k) => ({ id: k.id, name: k.title, formula: k.content }));

  const dynamicRules =
    domain === "market"
      ? matchRules(buildRuleFacts(ctx))
          .slice(0, 8)
          .map((rule) => ({
            id: rule.id,
            title: rule.scenario || rule.id,
            content: rule.recommendation || rule.judgement || rule.description || "",
          }))
      : [];

  const dynamicCases =
    domain === "market"
      ? findSimilarCases({
          category: ctx.project?.category || undefined,
          city: ctx.project?.city || undefined,
          stage: ctx.project?.stage || undefined,
        })
          .slice(0, 4)
          .map((item) => ({
            id: item.id,
            title: item.title,
            outcome:
              item.lessons?.join("；") ||
              `${item.outcome?.status ?? "neutral"}${item.outcome?.duration ? ` · ${item.outcome.duration}` : ""}`,
          }))
      : [];

  return {
    ...ctx,
    knowledge: {
      rules: [...dynamicRules, ...extraRules, ...(ctx.knowledge?.rules || [])].slice(0, 40),
      cases: [...dynamicCases, ...extraCases, ...(ctx.knowledge?.cases || [])].slice(0, 12),
      models: [...(ctx.knowledge?.models || []), ...extraModels].slice(0, 20),
    },
  };
}

/** 把知识压成短摘要，拼进 heuristic / LLM 输入 */
export function formatKnowledgeBrief(ctx: MKContext, max = 6): string | null {
  const rules = ctx.knowledge?.rules?.slice(0, max) || [];
  const cases = ctx.knowledge?.cases?.slice(0, 2) || [];
  if (rules.length === 0 && cases.length === 0) return null;

  const lines: string[] = ["【领域参考知识】"];
  for (const [index, rule] of rules.entries()) {
    lines.push(`${index + 1}. ${rule.title}：${String(rule.content).slice(0, 140)}`);
  }
  for (const item of cases) {
    lines.push(`案例 · ${item.title}：${String(item.outcome || "").slice(0, 120)}`);
  }
  return lines.join("\n");
}

export function withKnowledgeMessage(
  message: string,
  ctx: MKContext,
  assetContextBlock?: string | null,
): string {
  const parts = [message];
  if (assetContextBlock) parts.push(`补充资料：\n${assetContextBlock}`);
  const brief = formatKnowledgeBrief(ctx);
  if (brief) parts.push(brief);
  return parts.join("\n\n");
}
