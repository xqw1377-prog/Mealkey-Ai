/**
 * 移动端语音 → 槽位/选项路由（纯函数，可单测）
 * 用户说完后：先匹配选项，再填空槽，再整段作为补充 utterance。
 */

export type VoiceChoiceOption = { label: string; value: string };

export type VoicePendingQuestion = {
  slot: string;
  prompt: string;
};

function norm(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, "").replace(/[，。！？、,.!?]/g, "");
}

/** 从「前缀\\n本段转写」里取出最新一句 */
export function latestVoiceUtterance(fullText: string): string {
  const parts = fullText
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts[parts.length - 1] || fullText.trim();
}

export function matchChoiceFromVoice(
  utterance: string,
  options: VoiceChoiceOption[],
): string | null {
  const t = norm(utterance);
  if (!t || !options.length) return null;

  for (const opt of options) {
    const label = norm(opt.label);
    const value = norm(opt.value);
    if (!label && !value) continue;
    if (label && (t.includes(label) || label.includes(t))) return opt.value;
    if (value && (t.includes(value) || value.includes(t))) return opt.value;
  }

  // 轻量同义（开店场景常见）
  if (/单店|赚钱|盈利优先|先赚钱/.test(utterance) && options.some((o) => /单店|盈利/.test(o.label))) {
    const hit = options.find((o) => /单店|盈利/.test(o.label));
    if (hit) return hit.value;
  }
  if (/连锁|打样|扩张|多店/.test(utterance) && options.some((o) => /连锁|打样|扩张/.test(o.label))) {
    const hit = options.find((o) => /连锁|打样|扩张/.test(o.label));
    if (hit) return hit.value;
  }

  return null;
}

export type VoiceSlotRoute =
  | { kind: "choice"; slot: string; value: string }
  | { kind: "fill_slot"; slot: string; value: string; allTextFilled: boolean }
  | { kind: "freeform"; utterance: string };

/**
 * 有待补槽位时，把一句语音路由到选项 / 文本槽 / 自由补充。
 * preferSlot：色卡当前题优先（底部统一作答，不按题挂麦克风）。
 */
export function routeVoiceToSlots(input: {
  utterance: string;
  questions: VoicePendingQuestion[];
  choiceBySlot: Map<string, VoiceChoiceOption[]>;
  slotDrafts: Record<string, string>;
  preferSlot?: string | null;
}): VoiceSlotRoute {
  const utterance = latestVoiceUtterance(input.utterance);
  if (!utterance) {
    return { kind: "freeform", utterance: "" };
  }

  const ordered = [...input.questions];
  if (input.preferSlot) {
    const pref = ordered.findIndex((q) => q.slot === input.preferSlot);
    if (pref > 0) {
      const [hit] = ordered.splice(pref, 1);
      if (hit) ordered.unshift(hit);
    }
  }

  // 1) 选择题命中（优先当前色卡题）
  for (const q of ordered) {
    const opts = input.choiceBySlot.get(q.slot);
    if (!opts?.length) continue;
    const value = matchChoiceFromVoice(utterance, opts);
    if (value) {
      return { kind: "choice", slot: q.slot, value };
    }
  }

  // 2) 填文本槽：优先当前色卡空槽，否则下一个空槽
  const textQuestions = input.questions.filter(
    (q) => !input.choiceBySlot.get(q.slot)?.length,
  );
  const preferEmpty =
    input.preferSlot &&
    textQuestions.find(
      (q) =>
        q.slot === input.preferSlot && !input.slotDrafts[q.slot]?.trim(),
    );
  const nextEmpty =
    preferEmpty ||
    textQuestions.find((q) => !input.slotDrafts[q.slot]?.trim());
  if (nextEmpty) {
    const nextDrafts = {
      ...input.slotDrafts,
      [nextEmpty.slot]: utterance,
    };
    const allTextFilled = textQuestions.every((q) =>
      (q.slot === nextEmpty.slot ? utterance : nextDrafts[q.slot] || "").trim(),
    );
    return {
      kind: "fill_slot",
      slot: nextEmpty.slot,
      value: utterance,
      allTextFilled,
    };
  }

  // 3) 文本槽已满或没有文本槽 → 整段作为补充
  return { kind: "freeform", utterance };
}
