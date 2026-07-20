/**
 * 三席方向发明 — LLM 深度 invent + 模板兜底
 *
 * 有 TheoryLLMAdapter 时：每席发明 2 条可打方向 + 1 条对照否决；
 * 解析失败 / 超时 / 无 key → 回退启发式模板，保证结构不崩。
 */
import type { TheoryLLMAdapter } from "../types";
import type {
  InventedDirection,
  SeatCode,
  ThinkingFactPack,
} from "./protocol";
import { clipWord } from "./protocol";

const MASTER_NAMES =
  /里斯|特劳特|叶茂中|Al\s*Ries|Jack\s*Trout|Ries|Trout|Ye\s*Maozhong/i;

function extractJsonObject(content: string): Record<string, unknown> | null {
  const raw = (content || "").trim();
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    if (p && typeof p === "object" && !Array.isArray(p)) {
      return p as Record<string, unknown>;
    }
  } catch {
    /* fall through */
  }
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

function seatBrief(seat: SeatCode): {
  role: string;
  inventGoal: string;
  vetoHint: string;
  idPrefix: string;
} {
  switch (seat) {
    case "MK-MIND":
      return {
        role: "心智官 MK-MIND（心智占位学派）",
        inventGoal:
          "发明能成为客人脑中「第一联想」的方向；宁占一个可强化的第一，不占多个模糊的第二。禁止讲更好吃/更全/更实惠。",
        vetoHint: "第 3 条必须是「更好陷阱」对照否决案",
        idPrefix: "M",
      };
    case "MK-RIVAL":
      return {
        role: "空位官 MK-RIVAL（竞争空位学派）",
        inventGoal:
          "发明相对对手的可抢空位/区隔方向；必须对立而非更好。点名对手默认心智，给出不同选项。",
        vetoHint: "第 3 条必须是「正面更好」对照否决案",
        idPrefix: "R",
      };
    case "MK-CLASH":
      return {
        role: "冲突官 MK-CLASH（冲突营销学派）",
        inventGoal:
          "发明可记忆、可当场兑现的冲突方向（场合/社会层）；冲突服务成交，禁止假大空重新定义行业。",
        vetoHint: "第 3 条必须是「假大空·重新定义」对照否决案",
        idPrefix: "C",
      };
  }
}

function sanitizeText(s: string, max = 48): string {
  const t = (s || "")
    .replace(MASTER_NAMES, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return "";
  return t.length <= max ? t : t.slice(0, max);
}

function normalizeDirection(
  raw: Record<string, unknown>,
  id: string,
  fallbackType: string,
): InventedDirection | null {
  const name = sanitizeText(String(raw.name || raw.title || ""), 28);
  const oneLiner = sanitizeText(
    String(raw.oneLiner || raw.one_liner || raw.line || ""),
    36,
  );
  if (!name || !oneLiner || oneLiner.length < 6) return null;
  if (MASTER_NAMES.test(name) || MASTER_NAMES.test(oneLiner)) return null;
  return {
    id,
    name,
    oneLiner,
    type: sanitizeText(String(raw.type || fallbackType), 16) || fallbackType,
    focus: sanitizeText(String(raw.focus || ""), 20) || "invent",
    inventReason:
      sanitizeText(
        String(raw.inventReason || raw.reason || raw.invent_reason || ""),
        120,
      ) || "LLM 自造方向，经商规检验后再定首选。",
  };
}

function parseLlmDirections(
  content: string,
  seat: SeatCode,
): InventedDirection[] | null {
  const obj = extractJsonObject(content);
  if (!obj) return null;
  const list = (obj.directions || obj.items || obj.candidates) as unknown;
  if (!Array.isArray(list) || list.length < 2) return null;

  const meta = seatBrief(seat);
  const out: InventedDirection[] = [];
  for (let i = 0; i < Math.min(3, list.length); i++) {
    const row = list[i];
    if (!row || typeof row !== "object") continue;
    const d = normalizeDirection(
      row as Record<string, unknown>,
      `${meta.idPrefix}${i + 1}`,
      i === 2 ? "对照否决" : "LLM invent",
    );
    if (d) out.push(d);
  }
  return out.length >= 2 ? out : null;
}

function buildUserPrompt(seat: SeatCode, f: ThinkingFactPack): string {
  const meta = seatBrief(seat);
  const word = clipWord(f.whitespace, 10);
  return [
    `你是${meta.role}。根据事实包，发明 3 条定位方向。`,
    meta.inventGoal,
    meta.vetoHint,
    "",
    "事实包（不可改写事实）：",
    JSON.stringify(
      {
        brandLabel: f.brandLabel,
        category: f.category,
        city: f.city,
        who: f.who,
        need: f.need,
        edge: f.edge,
        rivals: f.rivals,
        whitespace: f.whitespace,
        wordHint: word,
        researchHeadline: f.researchHeadline,
        categoryTrend: f.categoryTrend,
        consumerShift: f.consumerShift,
        competitiveLandscape: f.competitiveLandscape,
        competitorBriefs: (f.competitorBriefs || []).slice(0, 4),
        evidenceSnippets: (f.evidenceSnippets || []).slice(0, 5),
        risks: f.risks.slice(0, 3),
      },
      null,
      0,
    ),
    "",
    "严格输出 JSON（不要 Markdown 围栏）：",
    `{"directions":[{"name":"短名","oneLiner":"可上墙一句话","type":"类型","focus":"焦点词","inventReason":"为何这样造（必须引用事实包中的竞对/证据/空位，禁止空喊信念）"},{"name":"...","oneLiner":"...","type":"...","focus":"...","inventReason":"..."},{"name":"对照否决名","oneLiner":"...","type":"对照否决","focus":"...","inventReason":"为何否决"}]}`,
    "",
    "约束：",
    "- 禁止出现任何真实大师姓名",
    "- oneLiner ≤ 36 字；name ≤ 28 字",
    "- 前 2 条必须锋利、可执行、互不相同；第 3 条必须是该席的对照否决案",
    `- inventReason 必须点名空位词「${word}」或竞对 ${f.rivals.slice(0, 2).join("、")}，并说明可验证的菜单/话术动作`,
    `- 尽量利用空位词「${word}」与竞对 ${f.rivals.join("、")}`,
  ].join("\n");
}

/**
 * 用 LLM 发明方向；失败则返回 fallback（模板）。
 */
export async function inventSeatDirections(params: {
  seat: SeatCode;
  fact: ThinkingFactPack;
  fallback: InventedDirection[];
  llm?: TheoryLLMAdapter;
}): Promise<{ directions: InventedDirection[]; usedLlm: boolean }> {
  const { seat, fact, fallback, llm } = params;
  if (!llm) {
    return { directions: fallback, usedLlm: false };
  }

  try {
    const meta = seatBrief(seat);
    const { content } = await llm.chat({
      messages: [
        {
          role: "system",
          content:
            "你是定位战略方向发明器。只输出合法 JSON。禁止名人真名。方向必须可指导菜单/话术/场景。",
        },
        { role: "user", content: buildUserPrompt(seat, fact) },
      ],
      temperature: 0.75,
      maxTokens: 900,
    });

    const parsed = parseLlmDirections(content, seat);
    if (!parsed) {
      return { directions: fallback, usedLlm: false };
    }

    // 不足 3 条时用模板补齐（尤其对照否决）
    const merged = [...parsed];
    while (merged.length < 3 && fallback[merged.length]) {
      const fb = fallback[merged.length]!;
      merged.push({
        ...fb,
        id: `${meta.idPrefix}${merged.length + 1}`,
      });
    }

    // 确保第 3 条若缺否决特征，用模板否决替换
    const last = merged[2];
    const vetoFb = fallback[2];
    if (
      vetoFb &&
      last &&
      !/更好|全面|假大空|重新定义|颠覆|升级/.test(
        `${last.oneLiner}${last.name}${last.type}`,
      )
    ) {
      merged[2] = { ...vetoFb, id: `${meta.idPrefix}3` };
    }

    // 标记 invent 来源
    for (const d of merged.slice(0, 2)) {
      if (!d.inventReason.includes("LLM")) {
        d.inventReason = `【LLM invent】${d.inventReason}`;
      }
    }

    return { directions: merged.slice(0, 3), usedLlm: true };
  } catch {
    return { directions: fallback, usedLlm: false };
  }
}
