/**
 * 咨询口述拆解真源（Host）
 * 启发式 parse → 低置信度时 LLM JSON 补拆 → 返回可入库字段 + 微追问
 */

import {
  buildMicroSlotsForWeakBasics,
  evaluateDialogueBasicsReady,
  getDialogueTurn,
  getIntakeDialogueTurns,
  microSlotsFromUnresolved,
  parseDialogueUtterance,
  type ConsultingDialogueAgent,
  type ParseUtteranceResult,
} from "@mealkey/agents/consulting-os";
import {
  resolveLlmModel,
  resolveLlmProvider,
  tryCreateSharedLlmAdapter,
} from "@/server/services/llm-polish";

export type IngestDialogueTurnResult = {
  parsed: ParseUtteranceResult;
  values: Record<string, string>;
  microSlots: Array<{
    id: string;
    label: string;
    prompt: string;
    keys: string[];
  }>;
  source: "heuristic" | "llm" | "micro";
};

function mergeValues(
  prior: Record<string, string>,
  patch: Record<string, string>,
): Record<string, string> {
  const next = { ...prior };
  for (const [k, v] of Object.entries(patch)) {
    const t = (v || "").trim();
    if (t) next[k] = t;
  }
  return next;
}

async function llmRefineTurn(input: {
  agent: ConsultingDialogueAgent;
  turnId: string;
  utterance: string;
  keys: string[];
  heuristic: Record<string, string>;
}): Promise<Record<string, string> | null> {
  if (process.env.HEURISTIC_ONLY === "true") return null;
  const provider = resolveLlmProvider();
  const model = resolveLlmModel(provider);
  const llm = tryCreateSharedLlmAdapter();
  if (!llm || provider === "none") return null;

  const turn = getDialogueTurn(input.agent, input.turnId);
  if (!turn) return null;

  try {
    const response = await llm.chat({
      model,
      temperature: 0.1,
      maxTokens: 500,
      messages: [
        {
          role: "system",
          content: `你是餐饮经营信息抽取器。把老板口述拆成给定字段的中文短值。
规则：
1) 只返回 JSON 对象，键必须来自 keys，不要多余键
2) 听不到的键省略，禁止编造
3) 每个值尽量短（≤40字），不要把整段口述复制进每个键
4) 数字类保留数字；对手用顿号分隔店名`,
        },
        {
          role: "user",
          content: JSON.stringify({
            question: turn.prompt,
            keys: input.keys,
            utterance: input.utterance.slice(0, 1200),
            heuristicHint: input.heuristic,
          }),
        },
      ],
    });
    const content = (response?.content || "").trim();
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const key of input.keys) {
      const v = parsed[key];
      if (typeof v === "string" && v.trim()) {
        out[key] = v.trim().slice(0, 200);
      }
    }
    return Object.keys(out).length ? out : null;
  } catch {
    return null;
  }
}

/** 单题口述 → 拆字段（微追问 key 走直写） */
export async function ingestDialogueUtterance(input: {
  agent: ConsultingDialogueAgent;
  turnId: string;
  utterance: string;
  prior?: Record<string, string>;
}): Promise<IngestDialogueTurnResult> {
  const text = input.utterance.trim();
  if (text.length < 2) {
    throw new Error("请先说一句再提交");
  }

  if (input.turnId.startsWith("micro_")) {
    const key = input.turnId.split("_").pop() || "";
    if (!key) throw new Error("微追问字段无效");
    const slice = text.slice(0, 200);
    const values = mergeValues(input.prior || {}, { [key]: slice });
    const parsed: ParseUtteranceResult = {
      turnId: input.turnId,
      values: { [key]: slice },
      fields: [
        {
          key,
          value: slice,
          confidence: "high",
          detail: "可用",
        },
      ],
      unresolved: [],
      heardSummary: slice.slice(0, 48),
      overallConfidence: "high",
    };
    return {
      parsed,
      values,
      microSlots: buildMicroSlotsForWeakBasics(input.agent, values),
      source: "micro",
    };
  }

  let parsed = parseDialogueUtterance({
    agent: input.agent,
    turnId: input.turnId,
    utterance: text,
    prior: input.prior,
  });
  let source: IngestDialogueTurnResult["source"] = "heuristic";

  const turn = getDialogueTurn(input.agent, input.turnId);
  const needLlm =
    Boolean(turn) &&
    (parsed.overallConfidence === "low" ||
      parsed.unresolved.length > 0 ||
      Object.keys(parsed.values).length <
        Math.ceil((turn?.keys.length || 1) / 2));

  if (needLlm && turn) {
    const refined = await llmRefineTurn({
      agent: input.agent,
      turnId: input.turnId,
      utterance: text,
      keys: turn.keys,
      heuristic: parsed.values,
    });
    if (refined) {
      parsed = parseDialogueUtterance({
        agent: input.agent,
        turnId: input.turnId,
        utterance: Object.values(refined).join("，"),
        prior: { ...(input.prior || {}), ...refined },
      });
      parsed = {
        ...parsed,
        values: { ...parsed.values, ...refined },
      };
      // 以 refined 为准重算 unresolved
      parsed.unresolved = turn.keys.filter((k) => {
        const v = (parsed.values[k] || "").trim();
        if (!v) return true;
        if (k === "slogan" && v === "暂无") return false;
        if (k === "copyBlocker" && turn.required === false) return false;
        return false;
      });
      parsed.overallConfidence =
        parsed.unresolved.length === 0 ? "high" : "medium";
      parsed.heardSummary = Object.entries(refined)
        .map(([k, v]) => `${k}:${v}`)
        .slice(0, 4)
        .join(" · ");
      source = "llm";
    }
  }

  const values = mergeValues(input.prior || {}, parsed.values);
  const turnMicros =
    turn && parsed.unresolved.length
      ? microSlotsFromUnresolved(turn, parsed.unresolved)
      : [];
  // 跨题弱字段也要出微追问，否则 UI 显示「已记」但生成追问一直灰
  const gateMicros = buildMicroSlotsForWeakBasics(input.agent, values);
  const byId = new Map<string, (typeof turnMicros)[number]>();
  for (const s of [...turnMicros, ...gateMicros]) byId.set(s.id, s);
  const microSlots = [...byId.values()].slice(0, 4);

  return { parsed, values, microSlots, source };
}

export function assertDialogueBasicsReady(
  agent: ConsultingDialogueAgent,
  basics: Record<string, string>,
): void {
  const gate = evaluateDialogueBasicsReady(agent, basics);
  if (!gate.ready) {
    throw new Error(
      `基础档案未齐：${gate.notes.slice(0, 4).join("；") || gate.weakKeys.join("、")}`,
    );
  }
}

export function listDialogueTurnMeta(agent: ConsultingDialogueAgent) {
  return getIntakeDialogueTurns(agent);
}
