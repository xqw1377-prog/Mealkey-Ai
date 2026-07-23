/**
 * Host 编译大脑：大模型始终在线。
 * 启发式 compileGoalTurn 只提供 Goal/TaskGraph 脚手架；理解与专业表述由 LLM 产出。
 * 真源：docs/MEALKEY_LLM_HOST_VS_TOOL_AGENT_V1.md
 */
import {
  resolveLlmModel,
  resolveLlmProvider,
  tryCreateSharedLlmAdapter,
} from "@/server/services/llm-polish";
import type { CompileOutputV1 } from "../contracts/goal-compiler";
import type { KnownCompileContext } from "./known-context";
import { buildInteractionHints } from "./interaction-hints";

const HOST_SYSTEM = `你是 MealKey——餐饮经营 AI（宿主智能，大模型始终在线）。
服从交互宪法：
- 目标优先：先识别经营目标，禁止把模糊抱怨直接答成营销清单。
- 主动理解：开店/诊断先追问关键约束，不甩步骤百科。
- 能力隐藏：禁止输出内部 Agent/席位名称。
- 资产目的：有脚手架报告时，重写必须保留「我的判断/原因/建议路径/风险」结构。
- 有判断：给出优先倾向并解释，标未知；不替用户拍板。
- 增强老板，不自称副总；不编造未提供的数字。
- 【经营因果】含营业额下降/因果链时必须保留变量拆解；禁止 10+ 条无变量建议。

根据脚手架 JSON，返回 JSON：
{
  "bossSummary": "对老板说的话（可含追问；可点明已生成哪份经营资产）",
  "artifactBody": "若脚手架已有 artifacts[0] 则重写完整 markdown；须含判断/原因/路径/风险；否则可空字符串",
  "questions": [{"slot":"...","prompt":"..."}]  // 仍缺信息时，最多3条；否则 []
}`;

export type LlmCompileMeta = {
  usedLlm: boolean;
  provider: string;
  stub: boolean;
};

export function assertHostLlmAvailable(): {
  ok: true;
  provider: "deepseek" | "openai";
  model: string;
} | { ok: false; reason: string } {
  if (process.env.ALLOW_COMPILER_STUB === "1") {
    return { ok: false, reason: "stub_allowed" };
  }
  if (process.env.HEURISTIC_ONLY === "true") {
    return {
      ok: false,
      reason: "HEURISTIC_ONLY 已开启：宿主编译拒绝以无模型模式交付",
    };
  }
  const provider = resolveLlmProvider();
  if (provider === "none") {
    return {
      ok: false,
      reason: "未配置 DEEPSEEK_API_KEY 或 OPENAI_API_KEY：MealKey 宿主需要大模型在线",
    };
  }
  return { ok: true, provider, model: resolveLlmModel(provider) };
}

/**
 * 用宿主 LLM 重写 bossSummary / 报告正文 / 追问（保留脚手架 Goal 结构）
 */
export async function compileHostWithLlm(input: {
  scaffold: CompileOutputV1;
  known?: KnownCompileContext;
  fileText?: string;
  utterance?: string;
}): Promise<{ output: CompileOutputV1; meta: LlmCompileMeta }> {
  const gate = assertHostLlmAvailable();
  if (!gate.ok) {
    if (process.env.ALLOW_COMPILER_STUB === "1") {
      return {
        output: {
          ...input.scaffold,
          bossSummary: `【开发桩·无模型】\n${input.scaffold.bossSummary}`,
          trace: {
            ...input.scaffold.trace,
            providersUsed: [...input.scaffold.trace.providersUsed, "host.stub"],
            degraded: true,
          },
        },
        meta: { usedLlm: false, provider: "stub", stub: true },
      };
    }
    throw new Error(gate.reason);
  }

  const llm = tryCreateSharedLlmAdapter();
  if (!llm) {
    throw new Error("大模型适配器创建失败：宿主编译需要在线模型");
  }

  const { scaffold } = input;
  const response = await llm.chat({
    model: gate.model,
    temperature: 0.4,
    maxTokens: 2200,
    messages: [
      { role: "system", content: HOST_SYSTEM },
      {
        role: "user",
        content: JSON.stringify({
          utterance: input.utterance,
          known: {
            ownerName: input.known?.ownerName,
            brandName: input.known?.brandName,
            city: input.known?.city,
            category: input.known?.category,
            focus: input.known?.focus,
          },
          fileExcerpt: input.fileText?.slice(0, 3500),
          scaffold: {
            goal: scaffold.goal,
            bossSummary: scaffold.bossSummary,
            questions: scaffold.questions,
            nextAction: scaffold.nextAction,
            artifactTitle: scaffold.artifacts[0]?.title,
            artifactBody: scaffold.artifacts[0]?.body?.slice(0, 3500),
            pendingDecisions: scaffold.pendingDecisions,
          },
        }),
      },
    ],
  });

  const content = (response?.content || "").trim();
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("宿主模型返回无法解析，请重试");
  }

  const parsed = JSON.parse(match[0]) as {
    bossSummary?: string;
    artifactBody?: string;
    questions?: Array<{ slot?: string; prompt?: string }>;
  };

  const questions =
    Array.isArray(parsed.questions) && parsed.questions.length
      ? parsed.questions
          .filter((q) => q && typeof q.prompt === "string" && q.prompt.trim())
          .slice(0, 3)
          .map((q, i) => ({
            slot: typeof q.slot === "string" && q.slot.trim() ? q.slot.trim() : `q${i}`,
            prompt: String(q.prompt).trim(),
          }))
      : scaffold.questions;

  const bossSummary =
    typeof parsed.bossSummary === "string" && parsed.bossSummary.trim()
      ? parsed.bossSummary.trim()
      : scaffold.bossSummary;

  const artifacts = scaffold.artifacts.map((a, i) => {
    if (i !== 0) return a;
    if (typeof parsed.artifactBody === "string" && parsed.artifactBody.trim()) {
      return { ...a, body: parsed.artifactBody.trim() };
    }
    return a;
  });

  const blocked = questions.length > 0 && artifacts.length === 0;
  const goal = {
    ...scaffold.goal,
    status: blocked ? ("blocked" as const) : scaffold.goal.status,
  };

  const next: CompileOutputV1 = {
    ...scaffold,
    goal,
    bossSummary,
    artifacts,
    questions,
    nextAction:
      questions.length > 0
        ? { kind: "ask_slot", label: "补充关键信息" }
        : scaffold.nextAction,
    trace: {
      ...scaffold.trace,
      providersUsed: [
        ...scaffold.trace.providersUsed.filter(
          (p) => p !== "goal-compiler.heuristic",
        ),
        "host.llm",
        gate.provider,
      ],
      degraded: false,
    },
  };
  next.interactionHints = buildInteractionHints(
    next,
    input.utterance || goal.intentRaw,
  );

  return {
    output: next,
    meta: { usedLlm: true, provider: gate.provider, stub: false },
  };
}
