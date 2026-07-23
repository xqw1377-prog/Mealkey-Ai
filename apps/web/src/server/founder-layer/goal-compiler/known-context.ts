/**
 * 从 profile / 既往 Goal / Intelligence 回读已知槽位 — 二次少问
 */
import type { GoalSlotValue, MobileAgentStateV1 } from "../contracts/goal-compiler";
import { listIntelligenceLessons, readDecisionStyle } from "../intelligence/evolve";
import { readMemoryPermissions } from "../intelligence/permissions";

export type KnownCompileContext = {
  ownerName?: string;
  brandName?: string;
  city?: string;
  category?: string;
  stage?: string;
  rememberedSlots: Record<string, GoalSlotValue>;
  focus: string[];
  /** 决策风格摘要（来自 Intelligence，非聊天） */
  styleHint?: string;
  lessonHint?: string;
};

export function buildKnownCompileContext(
  profile: Record<string, unknown>,
  state: MobileAgentStateV1,
  ownerName?: string,
): KnownCompileContext {
  const bi =
    profile.businessIdentity && typeof profile.businessIdentity === "object"
      ? (profile.businessIdentity as Record<string, unknown>)
      : {};
  const rememberedSlots: Record<string, GoalSlotValue> = {};

  const city = asStr(bi.city) || asStr(profile.city);
  const category = asStr(bi.category) || asStr(profile.category);
  const brandName =
    asStr(bi.brandName) || asStr(bi.objectName) || asStr(profile.brandName);
  const stage = asStr(bi.stage) || asStr(bi.focus);

  if (city) rememberedSlots.city = city;
  if (category) rememberedSlots.category = category;

  // 既往 Goal 已确认槽位
  const prev = state.activeGoal?.slots;
  if (prev) {
    for (const [k, v] of Object.entries(prev)) {
      if (v !== undefined && v !== "unknown") rememberedSlots[k] = v;
    }
  }

  const focus = [...(state.memoryHints.focus ?? [])];
  let styleHint: string | undefined;
  let lessonHint: string | undefined;

  const perm = readMemoryPermissions(profile);
  if (perm.saveExperience || perm.useForPersonalGrowth) {
    const style = readDecisionStyle(profile);
    if (style.riskPreference === "conservative") styleHint = "你偏稳健";
    else if (style.riskPreference === "aggressive") styleHint = "你偏进取";
    else if (style.aiStance === "override") styleHint = "你常坚持己见";
    else if (style.aiStance === "negotiate") styleHint = "你习惯改方案";

    const lesson = listIntelligenceLessons(profile)[0];
    if (lesson?.summary) {
      lessonHint = lesson.summary.slice(0, 48);
      if (/利润|人效|成本/.test(lesson.summary)) focus.push("利润");
      if (/开店|定位|选址/.test(lesson.summary)) focus.push("开店");
    }
  }

  return {
    ownerName,
    brandName: brandName || undefined,
    city: city || undefined,
    category: category || undefined,
    stage: stage || undefined,
    rememberedSlots,
    focus: [...new Set(focus)].slice(0, 8),
    styleHint,
    lessonHint,
  };
}

function asStr(v: unknown): string | undefined {
  if (typeof v === "string" && v.trim()) return v.trim();
  return undefined;
}

export function memoryPreface(known: KnownCompileContext): string {
  const bits: string[] = [];
  if (known.ownerName) bits.push(`${known.ownerName}`);
  if (known.brandName) bits.push(`品牌「${known.brandName}」`);
  if (known.city) bits.push(`${known.city}`);
  if (known.category) bits.push(known.category);
  if (known.focus.length) bits.push(`你关注过：${known.focus.join("、")}`);
  if (known.styleHint) bits.push(known.styleHint);
  if (known.lessonHint) bits.push(`上次经验：${known.lessonHint}`);
  if (bits.length === 0) return "";
  return `我还记得${bits.join(" · ")}。`;
}
