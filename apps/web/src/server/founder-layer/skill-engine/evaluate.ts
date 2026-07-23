import type {
  DrillEvaluationV1,
  ScenarioDrillV1,
  SkillLevel,
} from "./types";

const LEVEL_LABEL: Record<SkillLevel, string> = {
  1: "知道",
  2: "会做",
  3: "优秀",
  4: "教练",
  5: "专家",
};

function levelFromScore(score: number): SkillLevel {
  if (score >= 90) return 4;
  if (score >= 75) return 3;
  if (score >= 55) return 2;
  return 1;
}

export function evaluateDrillAnswer(
  drill: ScenarioDrillV1,
  answer: string,
): DrillEvaluationV1 {
  const text = answer.trim();
  const rubricScores = drill.rubric.map((r) => {
    const hitKw = r.keywords.some((k) => k && text.includes(k));
    const hitPenalty = (r.penaltyKeywords ?? []).some((k) => text.includes(k));
    let hit = hitKw;
    let note = hitKw ? "命中要点" : "未体现";
    if (r.penaltyKeywords?.length && !r.keywords.length) {
      // 纯惩罚项：未命中惩罚词 = 通过
      hit = !hitPenalty;
      note = hitPenalty ? "出现空枪动作，扣分" : "未空枪营销，通过";
    } else if (hitPenalty) {
      hit = false;
      note = "方向偏了：先动作后拆解";
    }
    return { id: r.id, label: r.label, hit, note };
  });

  let score = 0;
  let weightSum = 0;
  for (let i = 0; i < drill.rubric.length; i++) {
    const r = drill.rubric[i]!;
    const s = rubricScores[i]!;
    weightSum += r.weight;
    if (s.hit) score += r.weight;
  }
  const normalized = weightSum > 0 ? Math.round((score / weightSum) * 100) : 0;
  const level = levelFromScore(normalized);

  const strengths = rubricScores.filter((x) => x.hit).map((x) => x.label);
  const improvements = rubricScores
    .filter((x) => !x.hit)
    .map((x) => `${x.label}（${x.note}）`);

  const outcomeReminder = `经营连接：${drill.outcomeChain.join(" → ")}`;

  const feedbackMarkdown = [
    `# 陪练反馈 · ${drill.title}`,
    "",
    `**得分：** ${normalized} · **能力等级：** L${level} ${LEVEL_LABEL[level]}`,
    "",
    "## 行为对照",
    ...drill.behaviorSteps.map((b, i) => `${i + 1}. ${b}`),
    "",
    "## 评分细项",
    ...rubricScores.map((x) => `- ${x.hit ? "✓" : "○"} ${x.label} — ${x.note}`),
    "",
    "## 改进方向",
    ...(improvements.length
      ? improvements.map((x) => `- ${x}`)
      : ["- 本轮要点较完整，可再练一次压缩话术"]),
    "",
    `## ${outcomeReminder}`,
    "",
    "> 陪练培养能力，不是终局决策。真实拍板仍在决策室。",
  ].join("\n");

  return {
    drillId: drill.id,
    score: normalized,
    level,
    levelLabel: LEVEL_LABEL[level],
    rubricScores,
    strengths,
    improvements,
    feedbackMarkdown,
    outcomeReminder,
  };
}
