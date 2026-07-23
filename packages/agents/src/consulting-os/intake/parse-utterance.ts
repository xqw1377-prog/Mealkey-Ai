/**
 * 组合口述 → 结构化字段（启发式）
 * 不调用 LLM；Host 可在低置信度时再二次抽取。
 */

import {
  getDialogueTurn,
  getIntakeDialogueTurns,
  type ConsultingDialogueAgent,
  type DialogueTurnDef,
} from "./dialogue-turns";
import {
  isFieldValueUseful,
  isVagueAnswer,
  usefulFieldDetail,
} from "./weak-answer";

export type ParsedField = {
  key: string;
  value: string;
  confidence: "high" | "medium" | "low";
  detail: string;
};

export type ParseUtteranceResult = {
  turnId: string;
  values: Record<string, string>;
  fields: ParsedField[];
  /** 仍缺、需微追问的 key */
  unresolved: string[];
  /** 整段可用摘要（给 UI「我听到了」） */
  heardSummary: string;
  overallConfidence: "high" | "medium" | "low";
};

const LABEL: Record<string, string> = {
  brandName: "店名",
  companyName: "公司",
  category: "品类",
  city: "城市",
  region: "区域",
  intent: "判断目标",
  constraint: "约束",
  targetCustomer: "客群",
  ticketBand: "客单",
  rivals: "对手",
  budget: "预算",
  timeline: "时限",
  stage: "阶段",
  storeCount: "门店",
  storeScale: "门店",
  avgTicket: "客单",
  unitEconomics: "单位经济",
  pain: "疼点",
  priority: "优先",
  resource: "资源",
  repeatSignal: "复购",
  copyBlocker: "复制风险",
  topic: "议题",
  team: "团队",
  founderCount: "创始人",
  capTableNow: "持股",
  control: "控制权",
  raisePlan: "融资",
  vesting: "成熟/回购",
  redLine: "红线",
  currentPositioning: "定位",
  competitors: "对手",
  advantages: "优势",
  slogan: "广告语",
  annualRevenue: "营收",
  businessGoal: "目标",
  mainPain: "痛点",
};

function splitParts(text: string): string[] {
  return text
    .split(/[,，、；;\n]|以及|还有|另外|然后/)
    .map((s) =>
      s
        .replace(/^(做|是|在|叫|关于|大概|目前|我们|我想|就是)/, "")
        .trim(),
    )
    .filter((s) => s.length >= 1);
}

function takeCity(text: string): string | null {
  // 必须带地理后缀，避免把「味本源」一类店名误识别为城市
  const m = text.match(
    /([\u4e00-\u9fa5]{2,8}(?:市|区|县|州|高新区|新区|商圈|大学城|CBD|高新))/,
  );
  if (!m) return null;
  const hit = m[1]!;
  if (/好吃|服务|性价比|利润|增长|品牌|烤鱼|火锅|面馆/.test(hit)) return null;
  return hit;
}

function takeTicket(text: string): string | null {
  const m = text.match(
    /(?:人均|客单|客单价)?\s*(\d{2,4})\s*[-~～到至]?\s*(\d{0,4})\s*元?/,
  );
  if (!m) return null;
  if (m[2]) return `人均 ${m[1]}-${m[2]}`;
  return `人均 ${m[1]}`;
}

function takeStore(text: string): string | null {
  if (/直营|加盟|连锁/.test(text) || /\d+\s*家/.test(text)) {
    const m = text.match(/.{0,12}(?:直营|加盟).{0,12}\d*\s*家?|.{0,8}\d+\s*家.*/);
    return (m?.[0] || text).trim().slice(0, 40);
  }
  return null;
}

function takeRivals(text: string): string | null {
  const parts = text
    .split(/[,，、；;\/与和]/)
    .map((s) => s.replace(/^(对手|对标|比如|例如)/, "").trim())
    .filter(
      (s) =>
        s.length >= 2 &&
        s.length <= 16 &&
        !/\d/.test(s) &&
        !/人均|客单|白领|小聚|家庭|午餐|晚餐|场景|预算|天|个月/.test(s),
    );
  if (parts.length >= 2) return parts.slice(0, 4).join("、");
  if (parts.length === 1 && /店|鱼|火锅|面|餐|厨|记|坊|馆|城外/.test(parts[0]!)) {
    return parts[0]!;
  }
  return null;
}

function takeSlogan(text: string): string | null {
  if (/暂无|没有|无广告语|没口号/.test(text)) return "暂无";
  if (/广告语|口号|slogan/i.test(text)) {
    return text.replace(/.*(?:广告语|口号|slogan)\s*[是为:：]?\s*/i, "").trim() ||
      "暂无";
  }
  return null;
}

type Extractor = (text: string, parts: string[]) => string | null;

const EXTRACTORS: Record<string, Extractor> = {
  city: (t) => takeCity(t),
  region: (t) => takeCity(t),
  ticketBand: (t) => takeTicket(t),
  avgTicket: (t) => takeTicket(t),
  storeCount: (t) => takeStore(t),
  storeScale: (t) => takeStore(t),
  rivals: (t) => takeRivals(t),
  competitors: (t) => takeRivals(t),
  slogan: (t) => takeSlogan(t),
  annualRevenue: (t) => {
    if (/万|流水|营收|月均/.test(t) && /\d/.test(t)) return t.slice(0, 48);
    return null;
  },
  unitEconomics: (t) => {
    if (/万|毛利|流水|%|％/.test(t) && /\d/.test(t)) return t.slice(0, 60);
    return null;
  },
  budget: (t) => {
    if (/万|预算|租金|装修|投/.test(t)) return t.slice(0, 48);
    return null;
  },
  timeline: (t) => {
    const m = t.match(/\d+\s*(天|个月|周|年)/);
    return m ? m[0]! : /尽快|年底|季度/.test(t) ? t.slice(0, 24) : null;
  },
  stage: (t) => {
    if (/单店|验证|复制|融资|扩|筹备|筹备中/.test(t)) return t.slice(0, 32);
    return null;
  },
  capTableNow: (t) => {
    if (/%|％|持股|股权/.test(t)) return t.slice(0, 60);
    return null;
  },
  founderCount: (t) => {
    const m = t.match(/\d+\s*人?/);
    if (m && /创始|合伙|人/.test(t)) return t.slice(0, 40);
    return m ? `${m[0]}` : null;
  },
};

function assignByOrder(
  keys: string[],
  parts: string[],
  claimed: Set<string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  let pi = 0;
  for (const key of keys) {
    if (claimed.has(key)) continue;
    while (pi < parts.length && !parts[pi]!.trim()) pi++;
    if (pi >= parts.length) break;
    out[key] = parts[pi]!.trim().slice(0, 120);
    claimed.add(key);
    pi++;
  }
  return out;
}

function confidenceFor(
  key: string,
  value: string,
  viaExtractor: boolean,
): ParsedField["confidence"] {
  if (!value) return "low";
  if (isVagueAnswer(value)) return "low";
  if (viaExtractor && value.length >= 2) return "high";
  if (value.length >= 6) return "medium";
  return "low";
}

/** 解析一局对话题的口述 */
export function parseDialogueUtterance(input: {
  agent: ConsultingDialogueAgent;
  turnId: string;
  utterance: string;
  /** 已有 basics，用于合并而非覆盖强字段 */
  prior?: Record<string, string>;
}): ParseUtteranceResult {
  const turn = getDialogueTurn(input.agent, input.turnId);
  if (!turn) {
    return {
      turnId: input.turnId,
      values: {},
      fields: [],
      unresolved: [],
      heardSummary: input.utterance.trim().slice(0, 80),
      overallConfidence: "low",
    };
  }
  return parseTurnUtterance(turn, input.utterance, input.prior);
}

export function parseTurnUtterance(
  turn: DialogueTurnDef,
  utterance: string,
  prior?: Record<string, string>,
): ParseUtteranceResult {
  const text = utterance.trim();
  const parts = splitParts(text);
  const values: Record<string, string> = {};
  const viaExt = new Set<string>();

  // 1) 专用抽取器（城市/客单/对手等强特征）
  for (const key of turn.keys) {
    const ex = EXTRACTORS[key];
    if (!ex) continue;
    const hit = ex(text, parts);
    if (hit && hit.trim()) {
      values[key] = hit.trim().slice(0, 120);
      viaExt.add(key);
    }
  }

  // 2) 多段口述：按语序填剩余字段（店名/客群通常在靠前段）
  const claimed = new Set(Object.keys(values));
  const unusedParts = parts.filter((p) => {
    const compact = p.replace(/\s+/g, "");
    // 已被客单/城市等抽取器消化的片段不再二次分配
    if (values.ticketBand && /人均|客单|\d{2,4}/.test(p)) return false;
    if (values.city && values.city.includes(compact.slice(0, 4))) return false;
    if (values.rivals || values.competitors) {
      const rivalBlob = `${values.rivals || ""}${values.competitors || ""}`;
      if (rivalBlob.includes(compact) || compact.length <= 16 && rivalBlob.includes(p)) {
        return false;
      }
    }
    return !Object.values(values).some(
      (v) => v === p || (v.length >= 2 && (v.includes(p) || p.includes(v))),
    );
  });
  if (parts.length >= turn.keys.length || parts.length >= 2) {
    Object.assign(values, assignByOrder(turn.keys, unusedParts, claimed));
  } else if (parts.length === 1 && turn.keys.length > 1) {
    // 单段：只稳写第一个 key，其余留给微追问（禁止整句复制）
    const only = text.slice(0, 160);
    const first = turn.keys[0]!;
    if (!values[first]) values[first] = only;
    for (const key of turn.keys.slice(1)) {
      if (!viaExt.has(key)) delete values[key];
    }
  }

  // 4) slogan 特例
  if (turn.keys.includes("slogan") && !values.slogan) {
    if (/暂无|没有广告|没口号/.test(text)) values.slogan = "暂无";
  }

  // 5) 合并 prior：已有有用值不被空覆盖
  if (prior) {
    for (const key of turn.keys) {
      const prev = (prior[key] || "").trim();
      if (!values[key] && prev) values[key] = prev;
    }
  }

  const fields: ParsedField[] = turn.keys.map((key) => {
    const value = (values[key] || "").trim();
    const useful = isFieldValueUseful(key, value, values, turn.keys);
    const conf = useful
      ? confidenceFor(key, value, viaExt.has(key))
      : "low";
    if (!useful && values[key]) {
      // 泛词不当作已填
      if (isVagueAnswer(value) && key !== "slogan") {
        delete values[key];
      }
    }
    const finalVal = (values[key] || "").trim();
    return {
      key,
      value: finalVal,
      confidence: finalVal
        ? confidenceFor(key, finalVal, viaExt.has(key))
        : "low",
      detail: usefulFieldDetail(key, finalVal),
    };
  });

  const unresolved = fields
    .filter((f) => {
      if (turn.required === false && !f.value) return false;
      return !isFieldValueUseful(f.key, f.value, values, turn.keys);
    })
    .map((f) => f.key);

  // slogan 可选：暂无可算齐
  const unresolvedFiltered = unresolved.filter((k) => {
    if (k === "slogan" && values.slogan === "暂无") return false;
    if (k === "copyBlocker" && turn.required === false) return false;
    return true;
  });

  const heardBits = fields
    .filter((f) => f.value && f.confidence !== "low")
    .map((f) => `${LABEL[f.key] || f.key}：${f.value}`);

  const high = fields.filter((f) => f.confidence === "high").length;
  const overallConfidence =
    unresolvedFiltered.length === 0 && high >= Math.ceil(turn.keys.length / 2)
      ? "high"
      : unresolvedFiltered.length <= 1
        ? "medium"
        : "low";

  return {
    turnId: turn.id,
    values,
    fields,
    unresolved: unresolvedFiltered,
    heardSummary: heardBits.slice(0, 4).join(" · ") || text.slice(0, 60),
    overallConfidence,
  };
}

/** 未拆出字段 → 微追问槽 */
export function microSlotsFromUnresolved(
  turn: DialogueTurnDef,
  unresolved: string[],
): Array<{ id: string; label: string; prompt: string; keys: string[] }> {
  return unresolved.map((key) => ({
    id: `micro_${turn.id}_${key}`,
    label: LABEL[key] || key,
    prompt:
      turn.microPrompts?.[key] ||
      `再具体一点：${LABEL[key] || key}？`,
    keys: [key],
  }));
}

/** 多题口述全部展开后，检查 must 是否真正可用 */
/**
 * 入库前清洗：若检测到整句复制污染，尝试按题再拆；拆不开则清空脏副本。
 */
export function sanitizeDialogueBasicsValues(
  agent: ConsultingDialogueAgent,
  values: Record<string, string>,
): Record<string, string> {
  const next: Record<string, string> = { ...values };
  for (const turn of getIntakeDialogueTurns(agent)) {
    const texts = turn.keys.map((k) => (next[k] || "").trim());
    const long = texts.filter((t) => t.length >= 12);
    const dump =
      long.length >= 2 && long.every((t) => t === long[0] || long[0]!.includes(t));
    if (!dump) continue;
    const utterance = long[0]!;
    const parsed = parseDialogueUtterance({
      agent,
      turnId: turn.id,
      utterance,
      prior: {},
    });
    for (const key of turn.keys) {
      if (parsed.values[key]) {
        next[key] = parsed.values[key]!;
      } else if ((next[key] || "").trim() === utterance) {
        delete next[key];
      }
    }
  }
  return next;
}

export function evaluateDialogueBasicsReady(
  agent: ConsultingDialogueAgent,
  basics: Record<string, string>,
): { ready: boolean; weakKeys: string[]; notes: string[] } {
  const turns = getIntakeDialogueTurns(agent);
  const weakKeys: string[] = [];
  const notes: string[] = [];
  for (const turn of turns) {
    if (turn.required === false) continue;
    for (const key of turn.keys) {
      const v = basics[key] || "";
      if (!isFieldValueUseful(key, v, basics, turn.keys)) {
        weakKeys.push(key);
        notes.push(`${LABEL[key] || key}：${usefulFieldDetail(key, v)}`);
      }
    }
  }
  return { ready: weakKeys.length === 0, weakKeys, notes };
}
