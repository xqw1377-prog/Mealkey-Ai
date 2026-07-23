/**
 * Goal 编译后的专业能力补强 — 优先真单席，其次宿主 LLM，失败诚实降级。
 * Agent = 能力模块，不暴露席位名给老板。
 */
import type { CompileOutputV1, IntentFamily } from "../contracts/goal-compiler";
import type { KnownCompileContext } from "./known-context";
import { invokeSeatForCompile } from "./seat-invoke";

export type CapabilityInvokeResult = {
  output: CompileOutputV1;
  invoked: string[];
  degraded: boolean;
};

function domainFor(family: IntentFamily): {
  label: string;
  providerTag: string;
} {
  if (
    family === "launch_store" ||
    family === "expand_store" ||
    family === "positioning"
  ) {
    return { label: "品牌定位与门店模型", providerTag: "capability.positioning" };
  }
  if (family === "menu_optimize") {
    return { label: "菜单与产品结构", providerTag: "capability.menu" };
  }
  return { label: "利润与经营诊断", providerTag: "capability.profit" };
}

function applySupplement(
  output: CompileOutputV1,
  bullets: string[],
  nextStep: string | undefined,
  providerTags: string[],
): CompileOutputV1 {
  const supplement = [
    "",
    "## 专业能力补充",
    ...bullets.map((b, i) => `${i + 1}. ${b.trim()}`),
    nextStep?.trim() ? `\n**建议下一步：** ${nextStep.trim()}` : "",
    "",
    "_以上由专业能力模块生成，供你判断，不是终局决策。_",
  ]
    .filter(Boolean)
    .join("\n");

  const nextArtifacts = output.artifacts.map((a, i) =>
    i === 0 ? { ...a, body: `${a.body.trim()}\n${supplement}` } : a,
  );

  let bossSummary = output.bossSummary;
  if (bullets[0]) {
    bossSummary = `${bossSummary}\n\n专业补充：${bullets[0]}`;
  }

  return {
    ...output,
    artifacts: nextArtifacts,
    bossSummary,
    trace: {
      ...output.trace,
      providersUsed: [...output.trace.providersUsed, ...providerTags],
      degraded: false,
    },
  };
}

async function invokeLlmFallback(input: {
  output: CompileOutputV1;
  known?: KnownCompileContext;
  fileText?: string;
}): Promise<CapabilityInvokeResult> {
  const { resolveLlmModel, resolveLlmProvider, tryCreateSharedLlmAdapter } =
    await import("@/server/services/llm-polish");

  const provider = resolveLlmProvider();
  const model = resolveLlmModel(provider);
  const llm = tryCreateSharedLlmAdapter();
  if (!llm || provider === "none") {
    return { output: input.output, invoked: [], degraded: true };
  }

  const domain = domainFor(input.output.goal.goalType);
  const asset = input.output.artifacts[0]!;
  const contextBits = {
    goal: input.output.goal.title,
    slots: input.output.goal.slots,
    brand: input.known?.brandName,
    city: input.known?.city,
    category: input.known?.category,
    fileExcerpt: input.fileText?.slice(0, 2500),
    draftBody: asset.body.slice(0, 2800),
  };

  try {
    const response = await llm.chat({
      model,
      temperature: 0.35,
      maxTokens: 900,
      messages: [
        {
          role: "system",
          content: `你是 MealKey 内部的「${domain.label}」专业能力模块。
根据草稿报告补充 3–5 条可执行洞察，中文，短句。
禁止自称副总；禁止编造未给出的精确数字；不确定就写「待验证」。
只返回 JSON：{"bullets":["...","..."],"nextStep":"..."}`,
        },
        { role: "user", content: JSON.stringify(contextBits) },
      ],
    });
    const content = (response?.content || "").trim();
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) {
      return { output: input.output, invoked: [], degraded: true };
    }
    const parsed = JSON.parse(match[0]) as {
      bullets?: string[];
      nextStep?: string;
    };
    const bullets = Array.isArray(parsed.bullets)
      ? parsed.bullets.filter((b) => typeof b === "string" && b.trim()).slice(0, 5)
      : [];
    if (bullets.length === 0) {
      return { output: input.output, invoked: [], degraded: true };
    }

    return {
      output: applySupplement(
        input.output,
        bullets,
        parsed.nextStep,
        [domain.providerTag, provider],
      ),
      invoked: [domain.providerTag],
      degraded: false,
    };
  } catch {
    return { output: input.output, invoked: [], degraded: true };
  }
}

/**
 * 在已有 Artifact 上追加「专业能力补充」段落（不改 Goal 状态机）
 */
export async function invokeCapabilitiesForCompile(input: {
  output: CompileOutputV1;
  known?: KnownCompileContext;
  fileText?: string;
  projectId?: string;
}): Promise<CapabilityInvokeResult> {
  const { output } = input;
  if (!output.artifacts.length) {
    return { output, invoked: [], degraded: true };
  }
  if (process.env.HEURISTIC_ONLY === "true") {
    return { output, invoked: [], degraded: true };
  }

  // 1) 真单席（可超时/失败）
  if (input.projectId) {
    try {
      const seat = await invokeSeatForCompile({
        projectId: input.projectId,
        output,
        known: input.known,
        fileText: input.fileText,
      });
      if (seat && seat.bullets.length > 0) {
        return {
          output: applySupplement(
            output,
            seat.bullets,
            seat.nextStep,
            [seat.providerTag],
          ),
          invoked: [seat.providerTag],
          degraded: false,
        };
      }
    } catch {
      /* fall through */
    }
  }

  // 2) 宿主 LLM 加深
  return invokeLlmFallback(input);
}
