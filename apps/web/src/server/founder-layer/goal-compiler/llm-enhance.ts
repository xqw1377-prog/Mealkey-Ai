/**
 * Persona 润色：有 Key 时把编译草稿改成「餐饮经营 AI」口吻；失败回退原文。
 * 真源：MEALKEY_AGENT_PERSONA_V1 — 增强不替代；不自称副总；不编造数据。
 */
import {
  resolveLlmModel,
  resolveLlmProvider,
  tryCreateSharedLlmAdapter,
} from "@/server/services/llm-polish";
import type { CompileOutputV1 } from "../contracts/goal-compiler";

const PERSONA_SYSTEM = `你是 MealKey——餐饮经营 AI。
原则：增强老板，不替代老板；不自称副总/员工；不承诺经营结果责任制；不编造未提供的数字。
任务：把下面 JSON 草稿的 bossSummary（以及若有 artifacts[0].body）改写成更专业、克制、可行动的中文。
只返回 JSON：{"bossSummary":"...","artifactBody":"...可选..."}。
若草稿已足够好可微调。禁止输出 Agent 名称列表。`;

export async function enhanceCompileWithPersona(
  output: CompileOutputV1,
): Promise<{ output: CompileOutputV1; polished: boolean; provider: string }> {
  if (process.env.HEURISTIC_ONLY === "true") {
    return { output, polished: false, provider: "heuristic" };
  }
  const provider = resolveLlmProvider();
  const model = resolveLlmModel(provider);
  const llm = tryCreateSharedLlmAdapter();
  if (!llm || provider === "none") {
    return { output, polished: false, provider: "heuristic" };
  }

  try {
    const firstAsset = output.artifacts[0];
    const response = await llm.chat({
      model,
      temperature: 0.35,
      maxTokens: 1400,
      messages: [
        { role: "system", content: PERSONA_SYSTEM },
        {
          role: "user",
          content: JSON.stringify({
            goalTitle: output.goal.title,
            bossSummary: output.bossSummary,
            questions: output.questions,
            artifactBody: firstAsset?.body?.slice(0, 3500),
            nextAction: output.nextAction,
          }),
        },
      ],
    });
    const content = (response?.content || "").trim();
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      return { output, polished: false, provider };
    }
    const parsed = JSON.parse(match[0]) as {
      bossSummary?: string;
      artifactBody?: string;
    };
    const next: CompileOutputV1 = {
      ...output,
      bossSummary:
        typeof parsed.bossSummary === "string" && parsed.bossSummary.trim()
          ? parsed.bossSummary.trim()
          : output.bossSummary,
      artifacts: output.artifacts.map((a, i) => {
        if (i !== 0 || typeof parsed.artifactBody !== "string" || !parsed.artifactBody.trim()) {
          return a;
        }
        return { ...a, body: parsed.artifactBody.trim() };
      }),
      trace: {
        ...output.trace,
        providersUsed: [...output.trace.providersUsed, `persona.${provider}`],
        degraded: false,
      },
    };
    return { output: next, polished: true, provider };
  } catch {
    return { output, polished: false, provider: "heuristic" };
  }
}
