/**
 * 弱答案 / 脏数据检测：避免「好吃」「待定」或整段口述复制进多字段后假齐套。
 */

import { isMeaningful } from "./core";

const VAGUE_RE =
  /^(好吃|还行|一般|不错|性价比|服务好|氛围好|品质好|随便|都可以|不知道|待定|看看|再说)$/;

const VAGUE_CONTAIN_RE =
  /^(就是|感觉|可能|大概)?(好吃|性价比高?|服务好|氛围好|品质好|还行|一般)(吧|啊|呀)?$/;

/** 明显无经营信息的短答 */
export function isVagueAnswer(raw: string, min = 2): boolean {
  const s = raw.trim();
  if (!isMeaningful(s, min)) return true;
  if (VAGUE_RE.test(s)) return true;
  if (VAGUE_CONTAIN_RE.test(s)) return true;
  if (s.length <= 6 && /好吃|性价比|服务|氛围|品质/.test(s)) return true;
  // 「就是好吃性价比高」一类：只有评价词、没有店/城/数字等锚点
  if (
    /好吃|性价比|服务好|氛围好|品质好|还行|一般/.test(s) &&
    s.length < 24 &&
    !/[店城区县馆坊园园鱼火锅面餐厨记]|人均|\d/.test(s)
  ) {
    return true;
  }
  return false;
}

/** 多字段被写成同一段长口述（整句复制污染） */
export function isDumpDuplicate(
  values: Record<string, string>,
  keys: string[],
): boolean {
  const texts = keys
    .map((k) => (values[k] || "").trim())
    .filter((t) => t.length >= 12);
  if (texts.length < 2) return false;
  const first = texts[0]!;
  return texts.every((t) => t === first || nearSame(t, first));
}

function nearSame(a: string, b: string): boolean {
  if (a === b) return true;
  const x = a.replace(/\s+/g, "");
  const y = b.replace(/\s+/g, "");
  if (x.length < 8 || y.length < 8) return false;
  return x.includes(y) || y.includes(x);
}

/** 该字段是否具备「独立可用」信息（非占位、非泛词、非整段污染副本） */
export function isFieldValueUseful(
  key: string,
  value: string,
  allValues?: Record<string, string>,
  siblingKeys?: string[],
): boolean {
  const v = value.trim();
  // slogan / 可选复制障碍允许「暂无」
  if (
    (key === "slogan" || key === "copyBlocker") &&
    (v === "暂无" || v === "没有" || v === "无")
  ) {
    return true;
  }
  if (!isMeaningful(v, keyMin(key))) return false;
  if (isVagueAnswer(v, keyMin(key))) return false;
  if (
    allValues &&
    siblingKeys &&
    siblingKeys.length > 1 &&
    isDumpDuplicate(allValues, siblingKeys) &&
    v.length >= 20
  ) {
    // 整段复制时，仅允许「第一字段」暂留，其余视为无用，迫使拆解
    return siblingKeys[0] === key;
  }
  if (needsNumber(key) && !/\d/.test(v)) return false;
  if (needsNameList(key)) {
    const parts = v.split(/[,，、；;\/]/).map((s) => s.trim()).filter(Boolean);
    if (parts.length < 1) return false;
  }
  return true;
}

function keyMin(key: string): number {
  if (/ticket|revenue|budget|count|scale|founder/i.test(key)) return 1;
  if (/name|city|region|category|stage/i.test(key)) return 2;
  return 4;
}

function needsNumber(key: string): boolean {
  return /ticket|revenue|budget|avgTicket|ticketBand|annualRevenue|storeCount|founderCount/i.test(
    key,
  );
}

function needsNameList(key: string): boolean {
  return /rival|competitor/i.test(key);
}

export function usefulFieldDetail(key: string, value: string): string {
  if (!value.trim()) return "尚未听到";
  if (isVagueAnswer(value)) return "太泛，需要更具体的事实";
  if (needsNumber(key) && !/\d/.test(value)) return "缺数字量级";
  if (needsNameList(key)) {
    const n = value.split(/[,，、；;]/).filter((s) => s.trim().length >= 2).length;
    if (n < 2) return "对手/店名偏少";
  }
  return "可用";
}
