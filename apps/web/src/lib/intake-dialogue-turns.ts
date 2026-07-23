/**
 * Web 侧薄封装：对话题组与口述解析真源在 @mealkey/agents/consulting-os
 */

export {
  getIntakeDialogueTurns,
  getDialogueTurn,
  parseDialogueUtterance,
  parseTurnUtterance,
  microSlotsFromUnresolved,
  buildMicroSlotsForWeakBasics,
  evaluateDialogueBasicsReady,
  type DialogueTurnDef as DialogueTurn,
  type ConsultingDialogueAgent,
  type ParseUtteranceResult,
} from "@mealkey/agents/consulting-os";

import {
  buildMicroSlotsForWeakBasics,
  evaluateDialogueBasicsReady,
  getIntakeDialogueTurns,
  type ConsultingDialogueAgent,
  type DialogueTurnDef,
} from "@mealkey/agents/consulting-os";

export function microSlotsForBasics(
  agent: ConsultingDialogueAgent,
  basics: Record<string, string>,
) {
  return buildMicroSlotsForWeakBasics(agent, basics);
}

/** 必填字段是否真正可用（非整句复制、非泛词） */
export function dialogueTurnsReady(
  agent: ConsultingDialogueAgent,
  basics: Record<string, string>,
): boolean {
  return evaluateDialogueBasicsReady(agent, basics).ready;
}

/** 从已落库 basics 回显各对话题 */
export function hydrateDialogueValues(
  turns: DialogueTurnDef[],
  basics: Record<string, string | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const turn of turns) {
    const parts = turn.keys
      .map((k) => (basics[k] || "").trim())
      .filter(Boolean);
    if (!parts.length) {
      out[turn.id] = "";
      continue;
    }
    const unique = [...new Set(parts)];
    if (unique.length === 1) {
      out[turn.id] = unique[0]!;
      continue;
    }
    const short = unique.filter((u) => u.length <= 36);
    out[turn.id] =
      (short.length ? short : unique).slice(0, 3).join("；") || "";
  }
  return out;
}

export function listWeakBasicsNotes(
  agent: ConsultingDialogueAgent,
  basics: Record<string, string>,
): string[] {
  return evaluateDialogueBasicsReady(agent, basics).notes.slice(0, 4);
}

export function getAgentDialogueTurns(agent: ConsultingDialogueAgent) {
  return getIntakeDialogueTurns(agent);
}
