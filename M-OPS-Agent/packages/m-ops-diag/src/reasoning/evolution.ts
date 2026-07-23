/**
 * 持续学习与进化内核：
 * Learning 回填 → 极性分类 → 主题权重 / 假设先验 → 反哺下一轮推理。
 */

import type { DiagnosisLearning } from "../knowledge";
import {
  DEFAULT_PATTERN_LIBRARY,
  getPatternLibrary,
  setPatternLibrary,
  type PatternRule,
} from "./patterns";

export type LearningPolarity = "confirmed" | "rejected" | "mixed" | "unknown";

export type EvolutionStage =
  | "seed" // 几乎无回填
  | "forming" // 开始有验证
  | "adaptive" // 可稳定偏置
  | "mature"; // 有可复用 DNA

export type ThemeWeight = {
  theme: string;
  weight: number;
  confirmed: number;
  rejected: number;
};

export type HypothesisPrior = {
  key: string;
  statement: string;
  priorDelta: number;
  samples: number;
  lastPolarity: LearningPolarity;
};

export type RestaurantEvolutionState = {
  restaurantId?: string;
  asOf: string;
  stage: EvolutionStage;
  maturityScore: number;
  verifiedCount: number;
  confirmedCount: number;
  rejectedCount: number;
  themeWeights: ThemeWeight[];
  hypothesisPriors: HypothesisPrior[];
  topLessons: string[];
  summary: string;
};

export type SerializablePatternRule = {
  id: string;
  theme: string;
  label: string;
  regexSource: string;
  regexFlags?: string;
  dimensions: PatternRule["dimensions"];
  weight?: number;
  source?: "default" | "evolved";
  hits?: number;
};

const THEME_KEYWORDS: Array<{ theme: string; re: RegExp }> = [
  { theme: "wait", re: /等待|等位|排队|上菜|服务|高峰|效率/ },
  { theme: "product", re: /味道|品质|菜品|食材|出品|招牌|毛利|菜单/ },
  { theme: "price", re: /价格|贵|便宜|性价比|客单|人均|定价/ },
  { theme: "environment", re: /环境|卫生|吵|脏|装修|氛围/ },
  { theme: "competition", re: /竞品|竞争|附近|新店|降价|优惠|排名/ },
  { theme: "growth", re: /流量|获客|复购|打卡|投放|增长|客流/ },
];

export function classifyLearningOutcome(
  learning: Pick<DiagnosisLearning, "actualOutcome" | "lesson">,
): LearningPolarity {
  const text = `${learning.actualOutcome || ""} ${learning.lesson || ""}`.toLowerCase();
  if (!text.trim()) return "unknown";
  // 先判否定（避免「不成立」命中「成立」）
  const negative =
    /(不成立|否定|误判|无效|无关|失败|恶化|未验证|false|rejected|invalid)/.test(text);
  if (negative) return "rejected";
  const positive =
    /(验证成立|已成立|属实|正确|有效|改善|好转|成功|confirmed|validated|\btrue\b|成立)/.test(
      text,
    );
  if (positive) return "confirmed";
  return "mixed";
}

export function inferThemesFromText(text: string): string[] {
  const hits = THEME_KEYWORDS.filter((item) => item.re.test(text)).map((item) => item.theme);
  return hits.length ? [...new Set(hits)] : [];
}

function normalizeKey(statement: string) {
  return statement.replace(/\s+/g, "").slice(0, 24);
}

function relatedHypothesis(a: string, b: string) {
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.includes(b) || b.includes(a)) return true;
  if (a.length > 8 && b.length > 8) {
    if (a.slice(0, 12) === b.slice(0, 12)) return true;
    if (a.includes(b.slice(0, 8)) || b.includes(a.slice(0, 8))) return true;
  }
  return false;
}

export function stageFromMaturity(score: number): EvolutionStage {
  if (score >= 72) return "mature";
  if (score >= 45) return "adaptive";
  if (score >= 18) return "forming";
  return "seed";
}

export function stageLabel(stage: EvolutionStage): string {
  const map: Record<EvolutionStage, string> = {
    seed: "种子期",
    forming: "成型期",
    adaptive: "自适应期",
    mature: "成熟期",
  };
  return map[stage];
}

/**
 * 从历史 Learning 构建门店进化状态（Restaurant DNA 轻量版）。
 */
export function buildEvolutionState(
  learnings: DiagnosisLearning[] | undefined,
  restaurantId?: string,
): RestaurantEvolutionState {
  const list = learnings || [];
  const themeMap = new Map<string, ThemeWeight>();
  const priorMap = new Map<string, HypothesisPrior>();
  let confirmedCount = 0;
  let rejectedCount = 0;
  let verifiedCount = 0;
  const lessons: string[] = [];

  for (const learning of list) {
    const polarity =
      learning.polarity || classifyLearningOutcome(learning);
    const themes =
      learning.themes?.length
        ? learning.themes
        : inferThemesFromText(learning.hypothesis).length
          ? inferThemesFromText(learning.hypothesis)
          : inferThemesFromText(
              `${learning.action || ""} ${learning.actualOutcome || ""}`,
            );
    const hasFeedback = Boolean(learning.actualOutcome || learning.lesson);
    if (hasFeedback) verifiedCount += 1;
    if (polarity === "confirmed") confirmedCount += 1;
    if (polarity === "rejected") rejectedCount += 1;
    if (learning.lesson?.trim()) lessons.push(learning.lesson.trim());

    for (const theme of themes.length ? themes : ["general"]) {
      const cur = themeMap.get(theme) || {
        theme,
        weight: 1,
        confirmed: 0,
        rejected: 0,
      };
      if (polarity === "confirmed") {
        cur.confirmed += 1;
        cur.weight = Math.min(1.8, cur.weight + 0.08);
      } else if (polarity === "rejected") {
        cur.rejected += 1;
        cur.weight = Math.max(0.45, cur.weight - 0.1);
      }
      themeMap.set(theme, cur);
    }

    if (!hasFeedback) continue;
    const key = normalizeKey(learning.hypothesis);
    const cur = priorMap.get(key) || {
      key,
      statement: learning.hypothesis,
      priorDelta: 0,
      samples: 0,
      lastPolarity: polarity,
    };
    cur.samples += 1;
    cur.lastPolarity = polarity;
    if (polarity === "confirmed") cur.priorDelta = Math.min(0.28, cur.priorDelta + 0.12);
    else if (polarity === "rejected") cur.priorDelta = Math.max(-0.32, cur.priorDelta - 0.18);
    else if (polarity === "mixed") cur.priorDelta += 0.02;
    priorMap.set(key, cur);
  }

  const maturityScore = Math.round(
    Math.min(
      100,
      verifiedCount * 12 +
        confirmedCount * 8 +
        Math.min(20, lessons.length * 4) +
        (rejectedCount > 0 ? 6 : 0),
    ),
  );
  const stage = stageFromMaturity(maturityScore);
  const themeWeights = [...themeMap.values()].sort((a, b) => b.weight - a.weight);
  const hypothesisPriors = [...priorMap.values()].sort(
    (a, b) => Math.abs(b.priorDelta) - Math.abs(a.priorDelta),
  );
  const topLessons = [...new Set(lessons)].slice(0, 5);

  const hot = themeWeights[0];
  const summary =
    stage === "seed"
      ? "尚无足够回填，系统仍以通用模式诊断"
      : `进化阶段「${stageLabel(stage)}」（成熟度 ${maturityScore}）：已验证 ${verifiedCount} 条，确认 ${confirmedCount} / 否定 ${rejectedCount}${
          hot ? `；当前加权主题「${hot.theme}」×${hot.weight.toFixed(2)}` : ""
        }`;

  return {
    restaurantId,
    asOf: new Date().toISOString(),
    stage,
    maturityScore,
    verifiedCount,
    confirmedCount,
    rejectedCount,
    themeWeights,
    hypothesisPriors,
    topLessons,
    summary,
  };
}

/** 对单条假设施加进化偏置（先验 + 主题权重）。 */
export function evolutionBiasForHypothesis(
  statement: string,
  evolution: RestaurantEvolutionState | undefined,
): number {
  if (!evolution) return 0;
  let bias = 0;

  for (const prior of evolution.hypothesisPriors) {
    if (relatedHypothesis(statement, prior.statement)) {
      bias += prior.priorDelta;
      break;
    }
  }

  const themes = inferThemesFromText(statement);
  for (const theme of themes) {
    const tw = evolution.themeWeights.find((item) => item.theme === theme);
    if (!tw) continue;
    // weight>1 加强关注；weight<1 降权
    bias += (tw.weight - 1) * 0.1;
  }

  return Math.max(-0.35, Math.min(0.35, bias));
}

/**
 * 用 Learning 进化模式库权重（不改 regex，只调 weight/hits）。
 */
export function evolvePatternLibraryFromLearnings(
  learnings: DiagnosisLearning[] | undefined,
  base: PatternRule[] = getPatternLibrary(),
): PatternRule[] {
  const evolution = buildEvolutionState(learnings);
  const weightByTheme = new Map(
    evolution.themeWeights.map((item) => [item.theme, item.weight] as const),
  );

  return base.map((rule) => {
    const themeWeight = weightByTheme.get(rule.theme);
    const confirmed = evolution.themeWeights.find((t) => t.theme === rule.theme)?.confirmed || 0;
    const rejected = evolution.themeWeights.find((t) => t.theme === rule.theme)?.rejected || 0;
    const nextWeight = themeWeight ?? rule.weight ?? 1;
    return {
      ...rule,
      weight: Number(nextWeight.toFixed(3)),
      hits: (rule.hits || 0) + confirmed + rejected,
      source: themeWeight && themeWeight !== 1 ? "evolved" : rule.source || "default",
      regex: new RegExp(rule.regex.source, rule.regex.flags),
    };
  });
}

export function applyEvolvedPatternLibrary(learnings: DiagnosisLearning[] | undefined) {
  setPatternLibrary(evolvePatternLibraryFromLearnings(learnings, DEFAULT_PATTERN_LIBRARY));
}

export function serializePatternLibrary(rules: PatternRule[] = getPatternLibrary()): SerializablePatternRule[] {
  return rules.map((rule) => ({
    id: rule.id,
    theme: rule.theme,
    label: rule.label,
    regexSource: rule.regex.source,
    regexFlags: rule.regex.flags,
    dimensions: rule.dimensions,
    weight: rule.weight,
    source: rule.source,
    hits: rule.hits,
  }));
}

export function hydratePatternLibrary(serialized: SerializablePatternRule[]): PatternRule[] {
  return serialized.map((rule) => ({
    id: rule.id,
    theme: rule.theme,
    label: rule.label,
    regex: new RegExp(rule.regexSource, rule.regexFlags || ""),
    dimensions: rule.dimensions,
    weight: rule.weight,
    source: rule.source,
    hits: rule.hits,
  }));
}

/** 丰富 Learning 记录：写 polarity / themes / verifiedAt */
export function enrichLearning(learning: DiagnosisLearning): DiagnosisLearning {
  const polarity = classifyLearningOutcome(learning);
  const themes =
    learning.themes?.length
      ? learning.themes
      : inferThemesFromText(
          `${learning.hypothesis} ${learning.action || ""} ${learning.lesson || ""} ${learning.actualOutcome || ""}`,
        );
  const hasFeedback = Boolean(learning.actualOutcome || learning.lesson);
  return {
    ...learning,
    polarity: hasFeedback ? polarity : learning.polarity,
    themes: themes.length ? themes : learning.themes,
    verifiedAt: hasFeedback ? learning.verifiedAt || new Date().toISOString() : learning.verifiedAt,
  };
}
