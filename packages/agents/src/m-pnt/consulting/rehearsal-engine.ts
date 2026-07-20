/**
 * 定位验证 · 可复述测试（老板友好）
 * 默认走「六问点选组句」；自由口述也放宽中文匹配。
 */
import type {
  PositioningContract,
  PositioningStatement,
  PositionRehearsal,
  PositionRehearsalChecklist,
} from "./types";
import { ContractGateError } from "./types";
import { formatPositioningStatement } from "./positioning-contract-engine";

const FIELD_LABELS: Record<keyof PositioningStatement, string> = {
  forAudience: "给谁吃",
  whoNeed: "解决什么",
  ourBrandIs: "我们是谁",
  thatValue: "核心好处",
  because: "凭什么可信",
  unlike: "跟谁不同",
};

const FIELD_QUESTIONS: Record<keyof PositioningStatement, string> = {
  forAudience: "主要服务谁？",
  whoNeed: "他们最需要什么？",
  ourBrandIs: "一句话，我们是什么店/品牌？",
  thatValue: "客人图的核心好处是什么？",
  because: "凭什么让人信？",
  unlike: "我们跟谁不一样？",
};

function chineseBigrams(text: string): string[] {
  const chars = text.replace(/[^\u4e00-\u9fff]/g, "");
  const grams: string[] = [];
  for (let i = 0; i < chars.length - 1; i++) {
    grams.push(chars.slice(i, i + 2));
  }
  return grams;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\u4e00-\u9fff\w\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

/** 口语复述是否覆盖合同字段（含中文双字匹配，避免必须背原句） */
export function fieldMatched(fieldValue: string, retell: string): boolean {
  const value = fieldValue.trim();
  if (!value) return false;
  const retellNorm = retell.toLowerCase();
  if (retellNorm.includes(value.toLowerCase())) return true;

  const tokens = tokenize(value);
  if (tokens.length > 1) {
    const hit = tokens.filter((t) => retellNorm.includes(t)).length;
    if (hit / tokens.length >= 0.35) return true;
  }

  const grams = chineseBigrams(value);
  if (grams.length >= 2) {
    const hit = grams.filter((g) => retellNorm.includes(g)).length;
    if (hit / grams.length >= 0.35) return true;
  }

  // 单段中文：字符重合
  const chars = [...value].filter((c) => /[\u4e00-\u9fff]/.test(c));
  if (chars.length >= 4) {
    const hit = chars.filter((c) => retellNorm.includes(c)).length;
    if (hit / chars.length >= 0.45) return true;
  }
  return false;
}

export type RehearsalGuideItem = {
  field: keyof PositioningStatement;
  question: string;
  /** 点选即写入复述的正确项（来自合同） */
  correct: { label: string; text: string };
  distractors: Array<{ label: string; text: string }>;
};

/** 从合同生成六问点选（老板不用背术语） */
export function buildRehearsalGuide(
  statement: PositioningStatement,
): RehearsalGuideItem[] {
  const distractorBank: Record<keyof PositioningStatement, string[]> = {
    forAudience: ["路过的所有人", "只做高端宴请客"],
    whoNeed: ["只要便宜就行", "只要网红打卡"],
    ourBrandIs: ["什么都做的综合餐厅", "纯外卖品牌"],
    thatValue: ["越便宜越好", "越吵越热闹"],
    because: ["因为我们想做好", "因为别人也这么说"],
    unlike: ["跟谁都一样", "没有区别"],
  };

  const keys = Object.keys(FIELD_QUESTIONS) as Array<keyof PositioningStatement>;
  return keys.map((field) => {
    const value = statement[field]?.trim() || "（合同未填）";
    const short =
      value.length > 22 ? `${value.slice(0, 20)}…` : value;
    return {
      field,
      question: FIELD_QUESTIONS[field],
      correct: {
        label: short,
        text: value,
      },
      distractors: distractorBank[field].map((d) => ({
        label: d,
        text: d,
      })),
    };
  });
}

/** 把六问答案拼成口语复述（保证能过字段覆盖） */
export function composeRetellFromGuideAnswers(
  statement: PositioningStatement,
  answers: Partial<Record<keyof PositioningStatement, string>>,
): string {
  const forAudience = answers.forAudience || statement.forAudience;
  const whoNeed = answers.whoNeed || statement.whoNeed;
  const ourBrandIs = answers.ourBrandIs || statement.ourBrandIs;
  const thatValue = answers.thatValue || statement.thatValue;
  const because = answers.because || statement.because;
  const unlike = answers.unlike || statement.unlike;
  return [
    `我们主要服务${forAudience}，`,
    `帮他们解决${whoNeed}。`,
    `我们是${ourBrandIs}，`,
    `核心好处是${thatValue}，`,
    `因为${because}，`,
    `不同于${unlike}。`,
  ].join("");
}

export function allGuideAnswersSelected(
  answers: Partial<Record<keyof PositioningStatement, string>>,
): boolean {
  const keys = Object.keys(FIELD_QUESTIONS) as Array<keyof PositioningStatement>;
  return keys.every((k) => Boolean(answers[k]?.trim()));
}

export const DEFAULT_REHEARSAL_CHECKLIST: PositionRehearsalChecklist = {
  canSayInOneBreath: true,
  staffCanRepeat: true,
  productProvesBecause: true,
  unlikeIsClear: true,
};

export function evaluatePositionRehearsal(input: {
  statement: PositioningStatement;
  founderRetell: string;
  checklist: PositionRehearsalChecklist;
}): PositionRehearsal {
  const retell = input.founderRetell.trim();
  const keys = Object.keys(FIELD_LABELS) as Array<keyof PositioningStatement>;
  const matchedFields: Array<keyof PositioningStatement> = [];
  const missingFields: Array<keyof PositioningStatement> = [];

  for (const key of keys) {
    if (fieldMatched(input.statement[key], retell)) matchedFields.push(key);
    else missingFields.push(key);
  }

  const checklistValues = Object.values(input.checklist);
  const checklistOk = checklistValues.every(Boolean);
  const fieldScore = Math.round((matchedFields.length / keys.length) * 100);
  const checklistScore = Math.round(
    (checklistValues.filter(Boolean).length / checklistValues.length) * 100,
  );
  const score = Math.round(fieldScore * 0.7 + checklistScore * 0.3);

  let status: PositionRehearsal["status"] = "failed";
  const feedbackParts: string[] = [];

  if (retell.length < 40) {
    feedbackParts.push("再点几题，把六问点齐就会自动拼好话术。");
  }
  if (missingFields.length > 0) {
    feedbackParts.push(
      `还差一点：${missingFields.map((k) => FIELD_LABELS[k]).join("、")}。用上方点选最快，不是考试。`,
    );
  }
  if (!checklistOk) {
    feedbackParts.push("点齐六问后会自动确认落地。");
  }

  const passed =
    retell.length >= 40 &&
    matchedFields.length >= 4 &&
    checklistOk &&
    score >= 55;

  if (passed) {
    status = "passed";
    feedbackParts.unshift(`这套话术可以跟店员对齐了（清晰度 ${score}）。`);
  } else {
    feedbackParts.unshift(`还差一小步（清晰度 ${score}）。继续点选即可。`);
  }

  return {
    status,
    founderRetell: retell,
    checklist: input.checklist,
    matchedFields,
    missingFields,
    score,
    feedback: feedbackParts.join(" "),
    testedAt: new Date().toISOString(),
  };
}

export function applyRehearsalToContract(
  contract: PositioningContract,
  rehearsal: PositionRehearsal,
): PositioningContract {
  if (contract.status !== "proposed" && contract.status !== "validated") {
    throw new ContractGateError("仅 proposed/validated 合同可做可复述测试", [
      `status=${contract.status}`,
    ]);
  }
  return {
    ...contract,
    rehearsal,
  };
}

export function assertRehearsalPassed(contract: PositioningContract): void {
  if (contract.rehearsal?.status !== "passed") {
    throw new ContractGateError("请先完成并通过可复述测试，再确认验证/冻结", [
      "positioningContract.rehearsal.status=passed",
    ]);
  }
}

export function buildRetellPrompt(statement: PositioningStatement): string {
  return [
    "用大白话说清定位（可点选，不必背字段名）：",
    "",
    formatPositioningStatement(statement),
    "",
    "至少说清：给谁、解决什么、我们是什么、核心好处、凭什么、跟谁不同。",
  ].join("\n");
}
