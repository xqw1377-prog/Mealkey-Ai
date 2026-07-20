/**
 * 三席各用各的大师方案骨架（互不合并）
 * - 心智官：品牌名评估 · 品类挖掘 · 心智一词 · 公关优先 · 一词话术
 * - 空位官：竞争地图 · 战法 · 对立轴 · 配称营销 · 对照话术
 * - 冲突官：洞察 · 冲突 · 语言钉 · 视觉锤 · 战役 · 场景话术
 */
import type { TheoryLLMAdapter } from "../matrix/types";
import type {
  AdvisorStrategyCard,
  AdvisorStrategySet,
} from "./journey-types";

/** 各席共用的话术层（内容风格按学派不同） */
export type MasterScriptPack = {
  /** 门头/橱窗一句 */
  storefront: string;
  /** 迎客开口 */
  greeting: string;
  /** 点餐台主推 */
  counter: string;
  /** 外卖/点评标题 */
  takeaway: string;
  /** 短视频前 3 秒钩子 */
  shortVideo: string;
  /** 绝对禁说 */
  forbidden: string[];
};

export type RiesMasterScheme = {
  school: "ries";
  title: string;
  brandNameAssessment: {
    currentName: string;
    score: number;
    verdict: "keep" | "sharpen" | "rename";
    rationale: string;
    renameSuggestion?: string;
  };
  categoryMining: {
    currentCategory: string;
    ladderNote: string;
    opportunity: string;
    openNewCategory?: string;
  };
  mentalWord: string;
  sacrificeList: string[];
  prThenAds: string;
  scripts: MasterScriptPack;
  marketingMoves: string[];
};

export type TroutMasterScheme = {
  school: "trout";
  title: string;
  competitiveFrame: string;
  warType: "defense" | "offense" | "flanking";
  warTypeLabel: string;
  dualityAxis: string;
  ourPole: string;
  rivalPole: string;
  firstAssociation: string;
  sacrificeList: string[];
  scripts: MasterScriptPack;
  marketingMoves: string[];
};

export type YeMasterScheme = {
  school: "ye";
  title: string;
  consumerTruth: string;
  conflictLine: string;
  coreValueLine: string;
  verbalNail: string;
  visualHammer: string;
  brandNameNote: string;
  sacrificeList: string[];
  scripts: MasterScriptPack;
  marketingMoves: string[];
};

export type AdvisorMasterScheme =
  | RiesMasterScheme
  | TroutMasterScheme
  | YeMasterScheme;

export type MasterSchemeContext = {
  brandName: string;
  category: string;
  city: string;
  who: string;
  need: string;
  edge: string;
  rivals: string[];
  whitespace: string;
  categoryTrend: string;
  consumerShift: string;
  competitiveLandscape: string;
  headline: string;
};

function clip(s: string, n: number) {
  const t = (s || "").replace(/。$/, "").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

function wordFrom(space: string) {
  const s = (space || "可预期").replace(/。$/, "");
  return s.length > 10 ? s.slice(0, 10) : s;
}

function scoreBrandName(name: string, category: string, mental: string): number {
  let score = 55;
  const n = (name || "").trim();
  if (!n || n === "本店" || /馆$/.test(n) && n.length <= 3) score -= 12;
  if (n.length >= 2 && n.length <= 6) score += 12;
  if (n.length > 8) score -= 10;
  if (category && n.includes(category.slice(0, 2))) score += 8;
  if (mental && (n.includes(mental.slice(0, 2)) || mental.includes(n.slice(0, 2))))
    score += 10;
  if (/老|家|馆|厨|坊/.test(n) && !mental) score -= 4;
  return Math.max(28, Math.min(92, score));
}

export function buildRiesMasterScheme(
  ctx: MasterSchemeContext,
  card: AdvisorStrategyCard,
): RiesMasterScheme {
  const mental = wordFrom(card.battlefield || ctx.whitespace);
  const name = ctx.brandName || "本店";
  const score = scoreBrandName(name, ctx.category, mental);
  const verdict: RiesMasterScheme["brandNameAssessment"]["verdict"] =
    score >= 72 ? "keep" : score >= 55 ? "sharpen" : "rename";
  const rival = ctx.rivals[0] || "同质馆";

  return {
    school: "ries",
    title: "心智官方案 · 品牌名 / 品类 / 一词 / 公关",
    brandNameAssessment: {
      currentName: name,
      score,
      verdict,
      rationale:
        verdict === "keep"
          ? `「${name}」已能暗示品类或占位方向，可当最短战略继续用。`
          : verdict === "sharpen"
            ? `「${name}」可用，但未强绑「${mental}」；传播里必须补一词，否则名字空转。`
            : `「${name}」偏地名/通用馆名，离开本地难占心智；命名即战略，建议评估改名。`,
      renameSuggestion:
        verdict === "rename"
          ? `${mental}${ctx.category.replace(/菜$/, "") || "馆"}`.slice(0, 8)
          : undefined,
    },
    categoryMining: {
      currentCategory: ctx.category,
      ladderNote: `在「${ctx.category}」心智阶梯上，优先抢「${mental}」属性第一，而不是更好吃的第 N 名。`,
      opportunity: clip(ctx.categoryTrend || ctx.headline, 80),
      openNewCategory:
        /新品类|分化|细分/.test(ctx.categoryTrend || "")
          ? `${ctx.category}·${mental}`
          : undefined,
    },
    mentalWord: mental,
    sacrificeList: [
      "放弃多场景、多客群、多卖点同时喊",
      `不做「${rival}式」大而全`,
      "组织考核不得用「全品类覆盖」当 KPI",
    ],
    prThenAds: `先公关/口碑把「${name}=${mental}」种进本地心智，再付费广告维护；禁止一上来就满屏促销。`,
    scripts: {
      storefront: `${mental}`,
      greeting: `您好，我们是「${mental}」——不是什么都做的${ctx.category}。`,
      counter: `今天主推都围着「${mental}」，您要的是这一词，不是大而全。`,
      takeaway: `${ctx.city}${mental}·${name}`,
      shortVideo: `别再记一堆菜名——记住一个词：${mental}`,
      forbidden: [
        "性价比+高端+网红一起喊",
        "我们什么都好吃",
        "对标全品类第一但菜单不砍",
      ],
    },
    marketingMoves: [
      `W1：门头/桌签/朋友圈只出现一词「${mental}」`,
      `W2：公关种草——本地达人复述「想吃${mental}就来${name}」`,
      `W3-4：广告只加固一词，禁止第二卖点`,
      `验证：陌生客人能否在 3 秒说出「${mental}」`,
    ],
  };
}

export function buildTroutMasterScheme(
  ctx: MasterSchemeContext,
  card: AdvisorStrategyCard,
): TroutMasterScheme {
  const rival = ctx.rivals[0] || "周边同质馆";
  const rivalB = ctx.rivals[1] || "连锁快餐";
  const space = wordFrom(card.battlefield || ctx.whitespace);
  const warType: TroutMasterScheme["warType"] = /第一|领导|防守/.test(
    card.oneLiner + card.battlefield,
  )
    ? "defense"
    : /侧翼|场景|细分/.test(ctx.whitespace + card.pointOfDifference)
      ? "flanking"
      : "offense";
  const warTypeLabel =
    warType === "defense"
      ? "防御战 · 守住已占心智"
      : warType === "flanking"
        ? "侧翼战 · 无争地带切入"
        : "进攻战 · 打领导者固有弱点";

  return {
    school: "trout",
    title: "空位官方案 · 竞争地图 / 战法 / 配称 / 对照话术",
    competitiveFrame: clip(
      ctx.competitiveLandscape ||
        `${rival}占主流心智；${rivalB}占便利；空位在「${space}」`,
      100,
    ),
    warType,
    warTypeLabel,
    dualityAxis: `像${rival} vs 不像${rival}（${space}）`,
    ourPole: space,
    rivalPole: `${rival}的同质打法`,
    firstAssociation: `需求触发时第一想起：相对${rival}的「${space}」选项`,
    sacrificeList: [
      `放弃与${rival}正面拼价格/拼宽菜单`,
      "口号区隔但菜单同质 = 自杀",
      "配称资源必须围着空位，禁止第二主航道",
    ],
    scripts: {
      storefront: `不像${rival}，我们是${space}`,
      greeting: `您要是找「和${rival}差不多」的，我们可能不合适；我们是「${space}」。`,
      counter: `和${rival}比，我们不拼更好，拼不同——这道专门打「${space}」。`,
      takeaway: `不像${rival}的${ctx.category}·${space}`,
      shortVideo: `${rival}不会告诉你的另一选项：${space}`,
      forbidden: [
        `抄${rival}卖点`,
        "只写海报差异、菜单零改动",
        "又便宜又全又高级",
      ],
    },
    marketingMoves: [
      `配称1：菜单≥2 道菜专门证明「不像${rival}」`,
      `配称2：点餐页/桌贴写清对立轴「${space} vs ${rival}」`,
      `配称3：本地生活关键词置顶「不像${rival}」「${space}」`,
      `W4 验证：客人能否一句话说出和${rival}的不同`,
    ],
  };
}

export function buildYeMasterScheme(
  ctx: MasterSchemeContext,
  card: AdvisorStrategyCard,
): YeMasterScheme {
  const need = ctx.need;
  const who = ctx.who;
  const name = ctx.brandName || "本店";
  const nail = wordFrom(card.battlefield || need);
  const rival = ctx.rivals[0] || "赌运气的馆子";

  return {
    school: "ye",
    title: "冲突官方案 · 洞察 / 冲突 / 语言钉 / 视觉锤 / 战役",
    consumerTruth: clip(
      ctx.consumerShift ||
        `${who}真正怕的不是不好吃，而是关键一顿「赌运气」——场合砸了没法交代。`,
      90,
    ),
    conflictLine: `旧选择：跟${rival}一样赌运气 · 新选择：当场兑现「${need}」`,
    coreValueLine: `${nail}——让${who}在关键一顿里感到「${need}」被兑现`,
    verbalNail: nail,
    visualHammer: `门头/桌景固定符号：一眼能感到「${nail}」的场面（道具/光线/桌签），拒绝摆拍菜单图。`,
    brandNameNote: `品牌名「${name}」必须能被语言钉「${nail}」带动；若名字无冲突感，传播里用钉补锤，必要时评估更名（借力文化/对立）。`,
    sacrificeList: [
      "放弃功能参数堆砌与黑话传播",
      "不做无产品锚点的广告腔",
      "战役只打一个冲突，不开多条情绪线",
    ],
    scripts: {
      storefront: `${nail}·关键一顿不被打脸`,
      greeting: `今天什么场合？我们先帮您把「${need}」钉死，再点菜。`,
      counter: `这套场合餐就是为「${need}」设计的——不是菜名更花，是场面被兑现。`,
      takeaway: `${who}的${nail}·${name}`,
      shortVideo: `别再赌运气聚餐——${nail}`,
      forbidden: [
        "只讲中央厨房/供应链",
        "空洞品牌故事",
        "无场合锚点的情绪广告",
      ],
    },
    marketingMoves: [
      `洞察确认：用 5 个真实客人原话验证「${need}」`,
      `W1：统一语言钉「${nail}」+ 视觉锤上墙`,
      `W2：短视频/本地推——冲突对比（赌运气 vs 兑现）`,
      `W3-4：低开高走小试；能转述钉再加投放`,
      `验证：朋友转述时能否自然说出「${nail}」`,
    ],
  };
}

export function buildMasterSchemeForCard(
  card: AdvisorStrategyCard,
  ctx: MasterSchemeContext,
): AdvisorMasterScheme {
  if (card.advisorId === "ries") return buildRiesMasterScheme(ctx, card);
  if (card.advisorId === "trout") return buildTroutMasterScheme(ctx, card);
  return buildYeMasterScheme(ctx, card);
}

export function attachMasterScheme(
  card: AdvisorStrategyCard,
  ctx: MasterSchemeContext,
): AdvisorStrategyCard {
  return {
    ...card,
    masterScheme: buildMasterSchemeForCard(card, ctx),
  };
}

export function attachMasterSchemesToSet(
  strategies: AdvisorStrategyCard[],
  ctx: MasterSchemeContext,
): AdvisorStrategyCard[] {
  return strategies.map((s) => attachMasterScheme(s, ctx));
}

export function masterSchemeContextFromInputs(input: {
  brandName?: string;
  category?: string;
  city?: string;
  who?: string;
  need?: string;
  edge?: string;
  rivals?: string[];
  whitespace?: string;
  categoryTrend?: string;
  consumerShift?: string;
  competitiveLandscape?: string;
  headline?: string;
}): MasterSchemeContext {
  return {
    brandName: input.brandName || "本店",
    category: input.category || "餐饮",
    city: input.city || "目标城市",
    who: input.who || "目标客人",
    need: (input.need || "关键任务").replace(/。$/, ""),
    edge: (input.edge || "一线能兑现").replace(/。$/, ""),
    rivals: input.rivals?.length ? input.rivals.slice(0, 3) : ["周边同质馆"],
    whitespace: (input.whitespace || "未被占领的空位").replace(/。$/, ""),
    categoryTrend: input.categoryTrend || "",
    consumerShift: input.consumerShift || "",
    competitiveLandscape: input.competitiveLandscape || "",
    headline: input.headline || "",
  };
}

/** 单席方案 Markdown（策略报告 / 案卷） */
export function formatMasterSchemeMarkdown(
  scheme: AdvisorMasterScheme,
  seatName: string,
): string {
  const scriptsBlock = (s: MasterScriptPack) =>
    [
      `- **门头**：${s.storefront}`,
      `- **迎客**：${s.greeting}`,
      `- **点餐台**：${s.counter}`,
      `- **外卖标题**：${s.takeaway}`,
      `- **短视频钩子**：${s.shortVideo}`,
      `- **禁说**：${s.forbidden.join("；")}`,
    ].join("\n");

  if (scheme.school === "ries") {
    const b = scheme.brandNameAssessment;
    return [
      `### ${seatName} · ${scheme.title}`,
      ``,
      `#### 品牌名评估`,
      `- 现名：${b.currentName}（${b.score}分 · ${b.verdict === "keep" ? "保留" : b.verdict === "sharpen" ? "补强" : "建议改名"}）`,
      `- 理由：${b.rationale}`,
      b.renameSuggestion ? `- 改名方向：${b.renameSuggestion}` : "",
      ``,
      `#### 品类挖掘`,
      `- 当前品类：${scheme.categoryMining.currentCategory}`,
      `- 阶梯：${scheme.categoryMining.ladderNote}`,
      `- 机会：${scheme.categoryMining.opportunity}`,
      scheme.categoryMining.openNewCategory
        ? `- 可开子品类：${scheme.categoryMining.openNewCategory}`
        : "",
      ``,
      `#### 心智一词`,
      `> **${scheme.mentalWord}**`,
      ``,
      `#### 牺牲`,
      ...scheme.sacrificeList.map((x) => `- ${x}`),
      ``,
      `#### 公关 → 广告`,
      scheme.prThenAds,
      ``,
      `#### 传播话术（一词）`,
      scriptsBlock(scheme.scripts),
      ``,
      `#### 营销动作`,
      ...scheme.marketingMoves.map((x) => `- ${x}`),
      ``,
    ]
      .filter((l) => l !== "")
      .join("\n");
  }

  if (scheme.school === "trout") {
    return [
      `### ${seatName} · ${scheme.title}`,
      ``,
      `#### 竞争地图`,
      scheme.competitiveFrame,
      ``,
      `#### 战法`,
      `**${scheme.warTypeLabel}**`,
      ``,
      `#### 对立轴`,
      `- 轴：${scheme.dualityAxis}`,
      `- 我方：${scheme.ourPole}`,
      `- 对方：${scheme.rivalPole}`,
      `- 第一联想：${scheme.firstAssociation}`,
      ``,
      `#### 牺牲`,
      ...scheme.sacrificeList.map((x) => `- ${x}`),
      ``,
      `#### 传播话术（对照）`,
      scriptsBlock(scheme.scripts),
      ``,
      `#### 营销配称`,
      ...scheme.marketingMoves.map((x) => `- ${x}`),
      ``,
    ]
      .filter((l) => l !== "")
      .join("\n");
  }

  return [
    `### ${seatName} · ${scheme.title}`,
    ``,
    `#### 消费者真相`,
    scheme.consumerTruth,
    ``,
    `#### 冲突结构`,
    scheme.conflictLine,
    ``,
    `#### 核心价值 / 语言钉`,
    `- 核心句：${scheme.coreValueLine}`,
    `- **语言钉**：${scheme.verbalNail}`,
    `- **视觉锤**：${scheme.visualHammer}`,
    `- 品牌名：${scheme.brandNameNote}`,
    ``,
    `#### 牺牲`,
    ...scheme.sacrificeList.map((x) => `- ${x}`),
    ``,
    `#### 传播话术（场景钉）`,
    scriptsBlock(scheme.scripts),
    ``,
    `#### 营销战役`,
    ...scheme.marketingMoves.map((x) => `- ${x}`),
    ``,
  ]
    .filter((l) => l !== "")
    .join("\n");
}

// ——— LLM invent（有 Key 则厚写，失败回退启发式）———

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
    /* */
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

function cleanStr(s: unknown, max: number): string {
  if (typeof s !== "string") return "";
  const t = s.replace(MASTER_NAMES, "").replace(/\s+/g, " ").trim();
  if (!t) return "";
  return t.length <= max ? t : t.slice(0, max);
}

function cleanList(raw: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => cleanStr(x, maxLen))
    .filter((x) => x.length >= 4)
    .slice(0, maxItems);
}

function mergeScripts(
  base: MasterScriptPack,
  raw: Record<string, unknown> | undefined,
): MasterScriptPack {
  if (!raw || typeof raw !== "object") return base;
  const forbidden = cleanList(raw.forbidden, 5, 40);
  return {
    storefront: cleanStr(raw.storefront, 36) || base.storefront,
    greeting: cleanStr(raw.greeting, 80) || base.greeting,
    counter: cleanStr(raw.counter, 80) || base.counter,
    takeaway: cleanStr(raw.takeaway, 40) || base.takeaway,
    shortVideo: cleanStr(raw.shortVideo, 48) || base.shortVideo,
    forbidden: forbidden.length ? forbidden : base.forbidden,
  };
}

function mergeRies(
  base: RiesMasterScheme,
  obj: Record<string, unknown>,
): RiesMasterScheme {
  const bna = (obj.brandNameAssessment || obj.brand_name) as
    | Record<string, unknown>
    | undefined;
  const cat = (obj.categoryMining || obj.category) as
    | Record<string, unknown>
    | undefined;
  const verdictRaw = cleanStr(bna?.verdict, 12);
  const verdict: RiesMasterScheme["brandNameAssessment"]["verdict"] =
    verdictRaw === "rename" || verdictRaw === "sharpen" || verdictRaw === "keep"
      ? verdictRaw
      : base.brandNameAssessment.verdict;
  const scoreNum = Number(bna?.score);
  return {
    ...base,
    title: cleanStr(obj.title, 40) || base.title,
    brandNameAssessment: {
      currentName:
        cleanStr(bna?.currentName, 20) || base.brandNameAssessment.currentName,
      score:
        Number.isFinite(scoreNum) && scoreNum > 0
          ? Math.max(20, Math.min(95, Math.round(scoreNum)))
          : base.brandNameAssessment.score,
      verdict,
      rationale:
        cleanStr(bna?.rationale, 160) || base.brandNameAssessment.rationale,
      renameSuggestion:
        cleanStr(bna?.renameSuggestion, 16) ||
        base.brandNameAssessment.renameSuggestion,
    },
    categoryMining: {
      currentCategory:
        cleanStr(cat?.currentCategory, 24) ||
        base.categoryMining.currentCategory,
      ladderNote: cleanStr(cat?.ladderNote, 120) || base.categoryMining.ladderNote,
      opportunity:
        cleanStr(cat?.opportunity, 120) || base.categoryMining.opportunity,
      openNewCategory:
        cleanStr(cat?.openNewCategory, 24) ||
        base.categoryMining.openNewCategory,
    },
    mentalWord: cleanStr(obj.mentalWord, 16) || base.mentalWord,
    sacrificeList:
      cleanList(obj.sacrificeList, 5, 80).length >= 2
        ? cleanList(obj.sacrificeList, 5, 80)
        : base.sacrificeList,
    prThenAds: cleanStr(obj.prThenAds, 160) || base.prThenAds,
    scripts: mergeScripts(
      base.scripts,
      obj.scripts as Record<string, unknown> | undefined,
    ),
    marketingMoves:
      cleanList(obj.marketingMoves, 6, 100).length >= 2
        ? cleanList(obj.marketingMoves, 6, 100)
        : base.marketingMoves,
  };
}

function mergeTrout(
  base: TroutMasterScheme,
  obj: Record<string, unknown>,
): TroutMasterScheme {
  const wt = cleanStr(obj.warType, 12);
  const warType: TroutMasterScheme["warType"] =
    wt === "defense" || wt === "offense" || wt === "flanking"
      ? wt
      : base.warType;
  const labelMap = {
    defense: "防御战 · 守住已占心智",
    flanking: "侧翼战 · 无争地带切入",
    offense: "进攻战 · 打领导者固有弱点",
  } as const;
  return {
    ...base,
    title: cleanStr(obj.title, 40) || base.title,
    competitiveFrame:
      cleanStr(obj.competitiveFrame, 160) || base.competitiveFrame,
    warType,
    warTypeLabel: cleanStr(obj.warTypeLabel, 40) || labelMap[warType],
    dualityAxis: cleanStr(obj.dualityAxis, 80) || base.dualityAxis,
    ourPole: cleanStr(obj.ourPole, 40) || base.ourPole,
    rivalPole: cleanStr(obj.rivalPole, 40) || base.rivalPole,
    firstAssociation:
      cleanStr(obj.firstAssociation, 100) || base.firstAssociation,
    sacrificeList:
      cleanList(obj.sacrificeList, 5, 80).length >= 2
        ? cleanList(obj.sacrificeList, 5, 80)
        : base.sacrificeList,
    scripts: mergeScripts(
      base.scripts,
      obj.scripts as Record<string, unknown> | undefined,
    ),
    marketingMoves:
      cleanList(obj.marketingMoves, 6, 100).length >= 2
        ? cleanList(obj.marketingMoves, 6, 100)
        : base.marketingMoves,
  };
}

function mergeYe(
  base: YeMasterScheme,
  obj: Record<string, unknown>,
): YeMasterScheme {
  return {
    ...base,
    title: cleanStr(obj.title, 40) || base.title,
    consumerTruth: cleanStr(obj.consumerTruth, 160) || base.consumerTruth,
    conflictLine: cleanStr(obj.conflictLine, 120) || base.conflictLine,
    coreValueLine: cleanStr(obj.coreValueLine, 100) || base.coreValueLine,
    verbalNail: cleanStr(obj.verbalNail, 16) || base.verbalNail,
    visualHammer: cleanStr(obj.visualHammer, 140) || base.visualHammer,
    brandNameNote: cleanStr(obj.brandNameNote, 140) || base.brandNameNote,
    sacrificeList:
      cleanList(obj.sacrificeList, 5, 80).length >= 2
        ? cleanList(obj.sacrificeList, 5, 80)
        : base.sacrificeList,
    scripts: mergeScripts(
      base.scripts,
      obj.scripts as Record<string, unknown> | undefined,
    ),
    marketingMoves:
      cleanList(obj.marketingMoves, 6, 100).length >= 2
        ? cleanList(obj.marketingMoves, 6, 100)
        : base.marketingMoves,
  };
}

function seatInventPrompt(
  card: AdvisorStrategyCard,
  ctx: MasterSchemeContext,
  base: AdvisorMasterScheme,
): { system: string; user: string } {
  const common = [
    `品牌：${ctx.brandName}｜品类：${ctx.category}｜城市：${ctx.city}`,
    `客人：${ctx.who}｜需求：${ctx.need}｜优势：${ctx.edge}`,
    `竞对：${ctx.rivals.join("、")}｜空位：${ctx.whitespace}`,
    `调研头句：${clip(ctx.headline, 80)}`,
    `本品主轴：${card.oneLiner}`,
    `战场：${card.battlefield}｜差异：${card.pointOfDifference}`,
    `牺牲：${card.sacrifice}`,
  ].join("\n");

  if (base.school === "ries") {
    return {
      system:
        "你是心智官（MK-MIND）。只输出 JSON。禁止名人真名。方案必须含品牌名评估、品类阶梯、心智一词、公关优先、一词话术、营销动作。",
      user: [
        common,
        "输出 JSON 字段：title, brandNameAssessment{currentName,score,verdict(keep|sharpen|rename),rationale,renameSuggestion}, categoryMining{currentCategory,ladderNote,opportunity,openNewCategory}, mentalWord, sacrificeList[], prThenAds, scripts{storefront,greeting,counter,takeaway,shortVideo,forbidden[]}, marketingMoves[]",
        "启发式底稿（可改写加锋利，勿空）：",
        JSON.stringify(base),
      ].join("\n"),
    };
  }
  if (base.school === "trout") {
    return {
      system:
        "你是空位官（MK-RIVAL）。只输出 JSON。禁止名人真名。方案必须含竞争地图、战法、对立轴、对照话术、营销配称。",
      user: [
        common,
        "输出 JSON 字段：title, competitiveFrame, warType(defense|offense|flanking), warTypeLabel, dualityAxis, ourPole, rivalPole, firstAssociation, sacrificeList[], scripts{...}, marketingMoves[]",
        "启发式底稿：",
        JSON.stringify(base),
      ].join("\n"),
    };
  }
  return {
    system:
      "你是冲突官（MK-CLASH）。只输出 JSON。禁止名人真名。方案必须含洞察、冲突、语言钉、视觉锤、场景话术、战役节奏。",
    user: [
      common,
      "输出 JSON 字段：title, consumerTruth, conflictLine, coreValueLine, verbalNail, visualHammer, brandNameNote, sacrificeList[], scripts{...}, marketingMoves[]",
      "启发式底稿：",
      JSON.stringify(base),
    ].join("\n"),
  };
}

export async function inventMasterSchemeForCard(
  card: AdvisorStrategyCard,
  ctx: MasterSchemeContext,
  llm?: TheoryLLMAdapter,
): Promise<{ scheme: AdvisorMasterScheme; usedLlm: boolean }> {
  const base = buildMasterSchemeForCard(card, ctx);
  if (!llm) return { scheme: base, usedLlm: false };
  try {
    const prompt = seatInventPrompt(card, ctx, base);
    const { content } = await llm.chat({
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.user },
      ],
      temperature: 0.55,
      maxTokens: 1600,
    });
    const obj = extractJsonObject(content);
    if (!obj) return { scheme: base, usedLlm: false };
    if (base.school === "ries") {
      return { scheme: mergeRies(base, obj), usedLlm: true };
    }
    if (base.school === "trout") {
      return { scheme: mergeTrout(base, obj), usedLlm: true };
    }
    return { scheme: mergeYe(base, obj), usedLlm: true };
  } catch {
    return { scheme: base, usedLlm: false };
  }
}

/** 并行 invent 三席方案；写入 schemeContext */
export async function inventAndAttachMasterSchemes(
  strategies: AdvisorStrategyCard[],
  ctx: MasterSchemeContext,
  llm?: TheoryLLMAdapter,
): Promise<{
  strategies: AdvisorStrategyCard[];
  usedLlm: boolean;
  schemeContext: MasterSchemeContext;
}> {
  const results = await Promise.all(
    strategies.map((s) => inventMasterSchemeForCard(s, ctx, llm)),
  );
  const usedLlm = results.some((r) => r.usedLlm);
  return {
    strategies: strategies.map((s, i) => ({
      ...s,
      masterScheme: results[i]!.scheme,
    })),
    usedLlm,
    schemeContext: ctx,
  };
}

/** 辩论改策后：用已存 context 同步重算（无 LLM 也可） */
export function refreshMasterSchemesOnSet(
  set: AdvisorStrategySet,
  llm?: TheoryLLMAdapter,
): Promise<AdvisorStrategySet> | AdvisorStrategySet {
  const ctx = set.schemeContext
    ? masterSchemeContextFromInputs(set.schemeContext)
    : recoverSchemeContext(set.strategies);
  if (!llm) {
    return {
      ...set,
      schemeContext: ctx,
      strategies: attachMasterSchemesToSet(set.strategies, ctx),
      masterSchemeMode: "heuristic",
    };
  }
  return inventAndAttachMasterSchemes(set.strategies, ctx, llm).then(
    ({ strategies, usedLlm, schemeContext }) => ({
      ...set,
      strategies,
      schemeContext,
      masterSchemeMode: usedLlm ? "llm_hybrid" : "heuristic",
    }),
  );
}

export function recoverSchemeContext(
  strategies: AdvisorStrategyCard[],
): MasterSchemeContext {
  const ries = strategies.find((s) => s.advisorId === "ries");
  const trout = strategies.find((s) => s.advisorId === "trout");
  const ye = strategies.find((s) => s.advisorId === "ye");
  let brandName = "本店";
  if (ries?.masterScheme?.school === "ries") {
    brandName = ries.masterScheme.brandNameAssessment.currentName;
  }
  const rivalFromTrout =
    trout?.masterScheme?.school === "trout"
      ? trout.masterScheme.rivalPole.replace(/的同质打法$/, "")
      : undefined;
  return masterSchemeContextFromInputs({
    brandName,
    who: ries?.forWhom || ye?.forWhom || trout?.forWhom,
    need: ries?.jobToBeDone || ye?.jobToBeDone,
    whitespace: ries?.battlefield || trout?.battlefield,
    rivals: rivalFromTrout ? [rivalFromTrout] : undefined,
    headline: ries?.oneLiner,
  });
}

export function withSchemeContextOnSet(
  set: AdvisorStrategySet,
  ctx: MasterSchemeContext,
  mode?: "llm_hybrid" | "heuristic",
): AdvisorStrategySet {
  return {
    ...set,
    schemeContext: ctx,
    masterSchemeMode: mode || set.masterSchemeMode || "heuristic",
    strategies: attachMasterSchemesToSet(set.strategies, ctx),
  };
}
