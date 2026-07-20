/**
 * 规则匹配与商规检验 — 启发式文本匹配
 */
import type { LawCheckResult, TheoryRule, TheorySource } from "./types";
import { getRules } from "./loader";

/** 从文本中提取可用于匹配的 token（中文连续字 + 英文词） */
function tokenize(text: string): string[] {
  const normalized = text.toLowerCase();
  const tokens = new Set<string>();

  const zh = normalized.match(/[\u4e00-\u9fff]{2,}/g) ?? [];
  for (const t of zh) tokens.add(t);

  const en = normalized.match(/[a-z0-9]{3,}/g) ?? [];
  for (const t of en) tokens.add(t);

  return [...tokens];
}

/** 规则相关文本拼成检索语料 */
function ruleCorpus(rule: TheoryRule): string {
  return [
    rule.name,
    rule.principle,
    rule.decision_question,
    ...rule.decision_rules,
    ...rule.applicable_context,
    ...rule.key_variables,
  ].join(" ");
}

/** 计算规则与输入文本的匹配得分 */
function scoreRule(rule: TheoryRule, text: string, tokens: string[]): number {
  const corpus = ruleCorpus(rule).toLowerCase();
  let score = 0;

  for (const token of tokens) {
    if (corpus.includes(token)) score += token.length >= 4 ? 3 : 2;
  }

  if (text.includes(rule.name)) score += 10;

  for (const dr of rule.decision_rules) {
    const snippet = dr.slice(0, 6).toLowerCase();
    if (snippet.length >= 4 && text.includes(snippet)) score += 4;
  }

  return score;
}

/**
 * 根据输入文本粗匹配相关理论规则
 * @param source 学派来源
 * @param text 待匹配文本（如候选定位、项目描述）
 * @param max 最多返回条数，默认 8
 */
export function matchRulesToText(
  source: TheorySource,
  text: string,
  max = 8,
): TheoryRule[] {
  if (!text.trim()) return getRules(source).slice(0, max);

  const normalized = text.toLowerCase();
  const tokens = tokenize(normalized);
  const rules = getRules(source);

  const ranked = rules
    .map((rule) => ({ rule, score: scoreRule(rule, normalized, tokens) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) {
    return rules.slice(0, max);
  }

  return ranked.slice(0, max).map((x) => x.rule);
}

/** 反模式关键词 — 文本出现则倾向判 fail */
const ANTI_HINTS = [
  "延伸",
  "更好",
  "最好",
  "全面",
  "多元化",
  "大而全",
  "同质化",
  "正面",
  "攻击领导",
  "复杂",
  "大话",
  "赋能",
  "引领",
];

/** 正向关键词 — 文本出现则倾向判 pass */
const PASS_HINTS = [
  "第一",
  "聚焦",
  "细分",
  "场景",
  "冲突",
  "对立",
  "简单",
  "重复",
  "空位",
  "差异化",
  "品类",
  "牺牲",
  "侧翼",
  "游击",
  "洞察",
  "口语",
];

/**
 * 将匹配到的规则转化为商规检验结果
 * @param rules 待检验规则（通常来自 matchRulesToText）
 * @param text 待检验文本
 */
export function rulesToLawChecks(
  rules: TheoryRule[],
  text: string,
): LawCheckResult[] {
  const normalized = text.toLowerCase();

  return rules.map((rule) => {
    let delta = 0;
    const notes: string[] = [];

    for (const dr of rule.decision_rules) {
      const key = dr.slice(0, 8).toLowerCase();
      if (key.length >= 4 && normalized.includes(key.slice(0, 4))) {
        delta += 8;
        notes.push(`命中决策规则：${dr.slice(0, 40)}…`);
      }
    }

    for (const ap of rule.anti_patterns) {
      for (const hint of ANTI_HINTS) {
        if (normalized.includes(hint) && ap.includes(hint)) {
          delta -= 12;
          notes.push(`可能触犯反模式：${ap.slice(0, 36)}…`);
        }
      }
    }

    for (const hint of PASS_HINTS) {
      if (normalized.includes(hint)) {
        const hitRule = rule.decision_rules.some((dr) => dr.includes(hint))
          || rule.principle.includes(hint);
        if (hitRule) {
          delta += 5;
          notes.push(`正向信号「${hint}」与 ${rule.name} 一致`);
        }
      }
    }

    for (const hint of ANTI_HINTS) {
      if (normalized.includes(hint)) {
        const hitAnti = rule.anti_patterns.some((ap) => ap.includes(hint));
        if (hitAnti) {
          delta -= 8;
          notes.push(`负向信号「${hint}」与 ${rule.name} 反模式相关`);
        }
      }
    }

    const pass = delta >= 0;
    const note =
      notes.length > 0
        ? notes.slice(0, 3).join("；")
        : pass
          ? `未检出明显违背：${rule.output_implication}`
          : `需关注：${rule.decision_question}`;

    return {
      law: rule.name,
      pass,
      delta,
      note,
    };
  });
}
