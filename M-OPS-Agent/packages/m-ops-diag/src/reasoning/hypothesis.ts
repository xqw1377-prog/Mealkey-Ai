import type { DiagnosisHypothesis, DiagnosisLearning } from "../knowledge";
import type { EngineAnalysis } from "../engines/types";
import {
  buildEvolutionState,
  classifyLearningOutcome,
  evolutionBiasForHypothesis,
} from "./evolution";

function learningBias(
  statement: string,
  learnings: DiagnosisLearning[] | undefined,
): number {
  if (!learnings?.length) return 0;
  let bias = 0;
  for (const learning of learnings) {
    const related =
      statement.includes(learning.hypothesis) ||
      learning.hypothesis.includes(statement) ||
      (statement.length > 8 &&
        learning.hypothesis.length > 8 &&
        (statement.slice(0, 12) === learning.hypothesis.slice(0, 12) ||
          learning.hypothesis.includes(statement.slice(0, 8))));
    if (!related) continue;
    const polarity =
      learning.polarity || classifyLearningOutcome(learning);
    if (polarity === "confirmed") bias += 0.12;
    else if (polarity === "rejected") bias -= 0.18;
    else if (polarity === "mixed") bias += 0.03;
  }
  return bias;
}

/**
 * 按概率排序假设；历史 Learning 通过「直接偏置 + 进化先验/主题权重」反哺下一轮。
 */
export function rankHypotheses(
  analyses: EngineAnalysis[],
  previousLearnings?: DiagnosisLearning[],
): DiagnosisHypothesis[] {
  const evolution = previousLearnings?.length
    ? buildEvolutionState(previousLearnings)
    : undefined;

  return analyses
    .flatMap((analysis) => analysis.hypotheses)
    .map((hypothesis) => {
      const direct = learningBias(hypothesis.statement, previousLearnings);
      const evolved = evolutionBiasForHypothesis(hypothesis.statement, evolution);
      // 进化偏置略加权，避免与直接匹配重复时过冲
      const bias = direct + evolved * 0.65;
      const probability = Math.max(
        0.05,
        Math.min(0.98, Number((hypothesis.probability + bias).toFixed(3))),
      );
      return { ...hypothesis, probability };
    })
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 4);
}
