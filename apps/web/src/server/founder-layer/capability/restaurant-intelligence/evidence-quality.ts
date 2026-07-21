/**
 * 公开检索 / 证据片段可用性门禁
 * 禁止百科字源、字典释义等非经营事实进入雷达与经营分析。
 */

const NON_BUSINESS_PATTERNS: RegExp[] = [
  /形声|会意|指事|象形|转注|假借/,
  /甲骨|金文|篆文|隶书|说文|字源|部首|笔画|异体字|通假/,
  /从[\u4e00-\u9fff]{1,4}声|声旁|形旁/,
  /拼音|注音|读音为|汉字|词典|字典|词源/,
  /维基百科|百度百科|互动百科|辞海|辞源/,
  /战国文字|小篆|楷书|草书|行书/,
  /本义指|引申为|古同|通「/,
];

const BUSINESS_HINT =
  /评价|点评|口味|服务|排队|等位|出餐|价格|客单|翻台|复购|差评|好评|推荐|商圈|竞品|新开|外卖|环境|性价比|营业|客流|上座|门店|餐厅|饭店|菜|锅|店/;

/**
 * 片段是否可作为经营证据（口碑/竞争/经营事实）。
 * 过短、百科字源、与餐饮经营无关 → false。
 */
export function isUsableBusinessEvidenceSnippet(text: string): boolean {
  const t = (text || "").replace(/\s+/g, " ").trim();
  if (t.length < 12 || t.length > 400) return false;
  if (NON_BUSINESS_PATTERNS.some((re) => re.test(t))) return false;
  // 明显字典句式且无经营锚点
  if (/^[\u4e00-\u9fff]{1,3}[，,].{0,40}(字|词)/.test(t) && !BUSINESS_HINT.test(t)) {
    return false;
  }
  return true;
}

/** 过滤证据声明列表；全灭则返回空数组（调用方走诚实空态） */
export function filterUsableEvidenceClaims(
  claims: Array<{ claim: string; source?: string; kind?: string }>,
): typeof claims {
  return claims.filter((c) => isUsableBusinessEvidenceSnippet(c.claim));
}
