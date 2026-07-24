/**
 * Decision Pattern — 决策质量模式（不改历史决策正文）
 */

import type {
  DecisionPattern,
  DecisionPatternOutcome,
  GrowthPathItem,
} from "../../contracts/growth-runtime";
import type { CapabilityScore } from "../../contracts/capability";

function buildId(prefix: string) {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? `${prefix}_${crypto.randomUUID().slice(0, 8)}`
    : `${prefix}_${Date.now().toString(36)}`;
}

function clip(text: string, max: number) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export function buildDecisionPattern(input: {
  decisionId?: string;
  hypothesis?: string;
  judgement?: string;
  summary: string;
  impact: "confirmed" | "partial" | "invalidated";
  learning?: string;
}): DecisionPattern {
  const outcome: DecisionPatternOutcome =
    input.impact === "confirmed"
      ? "confirmed"
      : input.impact === "partial"
        ? "partial"
        : "invalidated";

  const thenJudgement = clip(
    input.judgement || input.hypothesis || "当时判断未记录",
    100,
  );
  const lesson =
    input.learning ||
    (outcome === "confirmed"
      ? "成功条件可沉淀为可复用模式，放大前再核对边界。"
      : outcome === "partial"
        ? "方向部分成立：收窄假设，勿把偶然当规律。"
        : "判断被结果打脸：下次先补证据再放大动作。");

  return {
    patternId: buildId("dp"),
    decisionId: input.decisionId,
    hypothesis: clip(input.hypothesis || thenJudgement, 120),
    thenJudgement,
    actualSummary: clip(input.summary, 140),
    outcome,
    lesson: clip(lesson, 140),
    createdAt: new Date().toISOString(),
  };
}

/** 根据短板与阶段生成成长路径（非课程售卖） */
export function buildGrowthPath(input: {
  scores: CapabilityScore[];
  stage?: string | null;
  lastOutcome?: DecisionPatternOutcome;
}): GrowthPathItem[] {
  const weakest = [...input.scores].sort((a, b) => a.score - b.score)[0];
  const stageRaw = (input.stage || "").toLowerCase();
  const early =
    /idea|seed|early|探索|启动|初创/.test(stageRaw) || !stageRaw;
  const scale = /growth|scale|扩张|加盟|连锁/.test(stageRaw);
  const stageHint: GrowthPathItem["stageHint"] = scale
    ? "scale"
    : early
      ? "early"
      : "general";

  const path: GrowthPathItem[] = [];

  if (stageHint === "early") {
    path.push({
      title: "先练定位与产品主张可验证性",
      stageHint,
      why: "早期最大浪费是做错心智，再拼命获客。",
    });
    path.push({
      title: "守住现金流与单店模型底线",
      stageHint,
      why: "没有单店模型，扩张只会放大错误。",
    });
  } else if (stageHint === "scale") {
    path.push({
      title: "补组织复制与治理边界",
      stageHint,
      why: "规模阶段短板常在人与机制，不在再开一场营销。",
    });
    path.push({
      title: "资本与股权节奏与验证挂钩",
      stageHint,
      why: "未验证的叙事不配融资加速。",
    });
  } else {
    path.push({
      title: "每周完成一次「判断→验证→回写」",
      stageHint,
      why: "成长飞轮靠节奏，不靠一次灵感。",
    });
  }

  if (weakest) {
    path.unshift({
      title: `本阶段优先补「${weakest.label}」`,
      stageHint,
      why: clip(weakest.note || `当前分 ${weakest.score}，限制下一轮决策质量。`, 100),
    });
  }

  if (input.lastOutcome === "invalidated") {
    path.unshift({
      title: "带着证伪结果去拍板，重写可证伪假设",
      stageHint,
      why: "失败若不进记忆，会重复交学费。",
    });
  }

  // 去重 title
  const uniq: GrowthPathItem[] = [];
  for (const item of path) {
    if (uniq.some((u) => u.title === item.title)) continue;
    uniq.push(item);
    if (uniq.length >= 4) break;
  }
  return uniq;
}

export function prependDecisionPatternHistory(
  profile: Record<string, unknown>,
  pattern: DecisionPattern,
  limit = 12,
): DecisionPattern[] {
  const existing = Array.isArray(profile.decisionPatterns)
    ? (profile.decisionPatterns as DecisionPattern[])
    : [];
  return [pattern, ...existing].slice(0, limit);
}
