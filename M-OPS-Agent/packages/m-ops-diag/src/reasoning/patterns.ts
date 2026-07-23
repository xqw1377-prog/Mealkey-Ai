/**
 * 可配置推理模式库 — 引擎通过 id / theme / regex 匹配证据主题。
 * 可在运行时用 setPatternLibrary 覆盖，便于迭代而不改引擎代码。
 */

export type PatternRule = {
  id: string;
  theme: string;
  label: string;
  regex: RegExp;
  dimensions: Array<
    "customer" | "product" | "service" | "operation" | "competition" | "growth"
  >;
  /** 进化权重：>1 加强匹配关注，<1 降权 */
  weight?: number;
  source?: "default" | "evolved";
  hits?: number;
};

export const DEFAULT_PATTERN_LIBRARY: PatternRule[] = [
  {
    id: "wait_service",
    theme: "wait",
    label: "等待与服务响应",
    regex:
      /等待|等位|排队|慢|上菜|出餐|服务|态度|服务员|效率|催|换桌|外卖超时|制作时间|杯型慢/,
    dimensions: ["customer", "service", "operation"],
  },
  {
    id: "product_quality",
    theme: "product",
    label: "产品与口味",
    regex:
      /味道|好吃|难吃|咸|淡|油|油腻|品质|食材|份量|招牌|必点|特色|下饭|回购|锅底|毛肚|肥牛|杨枝甘露|茶底|甜度|冰度|不新鲜/,
    dimensions: ["customer", "product"],
  },
  {
    id: "environment",
    theme: "environment",
    label: "环境与氛围",
    regex: /环境|卫生|吵|脏|装修|拍照|氛围|空调|座位挤|店面小|异味/,
    dimensions: ["customer"],
  },
  {
    id: "price_value",
    theme: "price",
    label: "价格与性价比",
    regex: /价格|贵|便宜|性价比|不值|值这个价|客单|人均|加价|套餐坑/,
    dimensions: ["customer", "competition"],
  },
  {
    id: "competition",
    theme: "competition",
    label: "竞争与价格",
    regex: /竞品|竞争|附近|新店|活动|降价|优惠|排名|价格贵|隔壁|同类店/,
    dimensions: ["competition"],
  },
  {
    id: "growth",
    theme: "growth",
    label: "增长与场景",
    regex: /家庭|聚餐|推荐|打卡|热门|流量|爆款|收藏|约会|年轻人|团购|外卖单多/,
    dimensions: ["growth"],
  },
];

let activeLibrary: PatternRule[] = DEFAULT_PATTERN_LIBRARY.map((rule) => ({
  ...rule,
  regex: new RegExp(rule.regex.source, rule.regex.flags),
}));

export function getPatternLibrary(): PatternRule[] {
  return activeLibrary;
}

export function setPatternLibrary(rules: PatternRule[]) {
  activeLibrary = rules.map((rule) => ({
    ...rule,
    regex: rule.regex instanceof RegExp ? rule.regex : new RegExp(String(rule.regex)),
  }));
}

export function resetPatternLibrary() {
  setPatternLibrary(DEFAULT_PATTERN_LIBRARY);
}

export function matchPatternClaim(
  claim: string,
  theme?: string,
  patternId?: string,
): PatternRule | undefined {
  const library = getPatternLibrary();
  if (patternId) {
    return library.find((rule) => rule.id === patternId);
  }
  if (theme) {
    const byTheme = library
      .filter((rule) => rule.theme === theme)
      .sort((a, b) => (b.weight || 1) - (a.weight || 1));
    const hit = byTheme.find((rule) => rule.regex.test(claim) || theme === rule.theme);
    if (hit) return hit;
  }
  return [...library]
    .sort((a, b) => (b.weight || 1) - (a.weight || 1))
    .find((rule) => rule.regex.test(claim));
}

export function claimMatchesTheme(
  claim: string,
  theme: string,
  itemTheme?: string,
): boolean {
  if (itemTheme === theme) return true;
  const rule = getPatternLibrary().find((item) => item.theme === theme);
  return rule ? rule.regex.test(claim) : false;
}

/** 兼容旧引擎导入的正则（始终指向当前库） */
export function getWaitRe() {
  return getPatternLibrary().find((r) => r.id === "wait_service")!.regex;
}
export function getProductRe() {
  return getPatternLibrary().find((r) => r.id === "product_quality")!.regex;
}
export function getEnvRe() {
  return getPatternLibrary().find((r) => r.id === "environment")!.regex;
}
export function getCompetitionRe() {
  return getPatternLibrary().find((r) => r.id === "competition")!.regex;
}
export function getGrowthRe() {
  return getPatternLibrary().find((r) => r.id === "growth")!.regex;
}

const NEG_RE =
  /难吃|慢|差|贵|不值|脏|吵|劝退|态度|等了|等位|排队|太久|冷|咸|淡|油腻|失望|一般|凑合|坑|超时|不新鲜|异味|挤/;
const POS_RE =
  /好吃|很好吃|推荐|回购|不错|满意|下饭|干净|值得|喜欢|赞|必点|惊艳|性价比高|会再来|回购/;

/** 规则情感：供粘贴评论打标，无 LLM */
export function inferSentimentFromClaim(
  claim: string,
): "positive" | "negative" | "neutral" {
  const text = String(claim || "");
  const neg = NEG_RE.test(text);
  const pos = POS_RE.test(text);
  if (neg && !pos) return "negative";
  if (pos && !neg) return "positive";
  if (neg && pos) return "negative";
  return "neutral";
}

/**
 * 把多行评论文本打成可进引擎的证据（主题 + 情感均规则推断）。
 */
export function tagEvidenceFromText(
  text: string,
  source: string = "manual",
): Array<{
  id: string;
  source: string;
  claim: string;
  sentiment: "positive" | "negative" | "neutral";
  theme?: string;
}> {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\d\.\-\*\s、]+/, "").trim())
    .filter((l) => l.length >= 4);
  return lines.slice(0, 40).map((claim, i) => {
    const rule = matchPatternClaim(claim);
    return {
      id: `paste_${source}_${i + 1}`,
      source,
      claim,
      sentiment: inferSentimentFromClaim(claim),
      theme: rule?.theme,
    };
  });
}
