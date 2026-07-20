/**
 * 定位公司市场调研报告框架
 *
 * 章节对齐机构级调研交付（非散文感想）：
 * 1 调研目的与范围
 * 2 品类定义与市场边界
 * 3 区域市场概况
 * 4 消费者洞察
 * 5 竞争格局与心智地图
 * 6 竞品深描
 * 7 机会空位与威胁
 * 8 结论与战略启示
 * 9 附录：证据与来源
 */
import type { ResearchCollection } from "./collector";
import type { ResearchScope } from "./scope";

function srcList(
  hits: Array<{ title: string; url: string; snippet: string; source: string }>,
  max = 5,
): string[] {
  return hits.slice(0, max).map((h, i) => {
    const link = h.url ? `[${h.title || "来源"}](${h.url})` : h.title || "来源";
    return `${i + 1}. ${link} — ${h.snippet.slice(0, 120)}${h.snippet.length > 120 ? "…" : ""}（${h.source}）`;
  });
}

export function composePositioningResearchReport(
  collection: ResearchCollection,
  extras?: {
    categoryTrendHint?: string;
    consumerHint?: string;
    mapHint?: string;
  },
): {
  markdown: string;
  headline: string;
  categoryTrend: string;
  consumerShift: string;
  competitiveLandscape: string;
  whitespace: string;
  risks: string[];
  evidenceNotes: string[];
} {
  const s = collection.scope;
  const whitespace =
    collection.whitespaceCandidates[0] ||
    `${s.who}场景下的「${s.need}」心智空位`;

  const rivalLine = collection.competitors
    .slice(0, 5)
    .map((c) => `${c.name}${c.mentalPosition ? `（${c.mentalPosition}）` : ""}`)
    .join("；");

  const headline = `${s.city} · ${s.category}调研：可打空位在「${whitespace}」`;

  const categoryTrend =
    extras?.categoryTrendHint ||
    (collection.categorySources[0]?.snippet
      ? `${s.category}公开信号：${collection.categorySources[0].snippet.slice(0, 140)}`
      : `${s.city}的${s.category}（${s.businessFormat}）处在「${collection.localMarket?.stage || "待校准"}」语境：${collection.saturationNote}。`);

  const consumerShift =
    extras?.consumerHint ||
    (collection.consumerSources[0]?.snippet
      ? collection.consumerSources[0].snippet.slice(0, 160)
      : `${s.who}核心需求是「${s.need}」。现有选择常让人赌运气，复购信心不足。`);

  const competitiveLandscape =
    extras?.mapHint ||
    (rivalLine
      ? `竞争盘面：${rivalLine}。${collection.priceBandNote}。${collection.localMarket?.note || ""}`
      : `竞争盘面仍分散；「${whitespace}」缺少清晰第一联想。`);

  const risks = [
    collection.localMarket?.saturation === "极高" ||
    collection.localMarket?.saturation === "高"
      ? `${s.city}${s.category}竞争偏饱和，正面抢领导心智代价高`
      : `${s.category}竞争强度仍需店访复核`,
    "若定位过宽，会被连锁与低价馆两头挤压",
    collection.mode === "local_intel"
      ? "本次公开检索命中偏少，结论偏依赖本地情报库，确认前建议补抓或店访"
      : "公开检索存在时效与偏差，关键数字需一手验证",
    s.brandStage === "筹备开业"
      ? "筹备期资源有限，空位必须能在 30–60 天验证"
      : "执行若菜单/话术不支撑，空位会空心",
  ];

  const evidenceNotes = [
    ...collection.rawNotes,
    ...collection.categorySources.slice(0, 2).map((h) => `品类：${h.snippet.slice(0, 60)}`),
    ...collection.competitors.slice(0, 3).map((c) => `竞对 ${c.name}：${c.summary.slice(0, 60)}`),
  ];

  const markdown = [
    `# ${s.city}${s.district ? `·${s.district}` : ""}「${s.category}」市场调研报告`,
    ``,
    `> 品牌：${s.brandName}　｜　业态：${s.businessFormat}　｜　阶段：${s.brandStage}　｜　采集：${collection.mode}　｜　时间：${collection.collectedAt.slice(0, 19).replace("T", " ")}`,
    ``,
    `## 一、调研目的与范围`,
    ``,
    `- **目的**：为定位决策提供可审计的市场依据（品类 / 区域 / 客人 / 竞对 / 空位）。`,
    `- **区域**：${s.city}${s.district ? ` · ${s.district}` : ""}`,
    `- **业态 / 品类**：${s.businessFormat} / ${s.category}`,
    `- **品牌现状**：${s.brandStatusNote}`,
    `- **竞对清单**：${s.rivals.join("、")}`,
    `- **约束**：${s.constraints.join("；")}`,
    ``,
    `## 二、品类定义与市场边界`,
    ``,
    categoryTrend,
    ``,
    collection.localMarket
      ? `- 本地情报：阶段 ${collection.localMarket.stage}，饱和度 ${collection.localMarket.saturation}，${collection.priceBandNote}。`
      : `- 本地情报库未命中该品类×城市，以下以公开检索与简报推演为主。`,
    ``,
    `### 公开检索摘要（品类）`,
    ...(srcList(collection.categorySources).length
      ? srcList(collection.categorySources)
      : ["- （本次未抓到品类公开结果，已用本地库/简报兜底）"]),
    ``,
    `## 三、区域市场概况`,
    ``,
    `${s.city}作为经营战场，需同时看供给密度与心智密度。${collection.saturationNote}。`,
    ``,
    `### 区域公开信号`,
    ...(srcList(collection.regionSources).length
      ? srcList(collection.regionSources)
      : ["- （区域公开命中不足，建议补商圈店访密度）"]),
    ``,
    `## 四、消费者洞察`,
    ``,
    `- **核心人群**：${s.who}`,
    `- **关键任务**：${s.need}`,
    `- **洞察陈述**：${consumerShift}`,
    ``,
    `### 客人公开信号`,
    ...(srcList(collection.consumerSources).length
      ? srcList(collection.consumerSources)
      : ["- （客人侧公开命中不足，以简报客群为准）"]),
    ``,
    `## 五、竞争格局与心智地图`,
    ``,
    competitiveLandscape,
    ``,
    `| 竞对 | 心智词 | 证据句 | 空位威胁 | 数据质量 |`,
    `| --- | --- | --- | --- | --- |`,
    ...collection.competitors.map((c) => {
      const mental = (c.mentalPosition || "待钉死").replace(/\|/g, "/").slice(0, 24);
      const evidence = (c.evidenceSentence || c.summary)
        .replace(/\|/g, "/")
        .slice(0, 48);
      const threat = (c.threatToWhitespace || "待评估")
        .replace(/\|/g, "/")
        .slice(0, 48);
      return `| ${c.name} | ${mental} | ${evidence} | ${threat} | ${c.dataQuality} |`;
    }),
    ``,
    `## 六、竞品深描`,
    ``,
    ...collection.competitors.flatMap((c) => [
      `### ${c.name}`,
      ``,
      `- **心智词**：${c.mentalPosition || "待钉死"}`,
      `- **证据句**：${c.evidenceSentence || c.summary}`,
      `- **空位威胁**：${c.threatToWhitespace || "待评估"}`,
      ``,
      c.summary,
      ``,
      ...(c.signals.length
        ? ["**信号**", ...c.signals.map((x) => `- ${x}`), ``]
        : ["- 暂无结构化信号", ``]),
      ...(c.sources.length ? ["**来源**", ...srcList(c.sources, 3), ``] : []),
    ]),
    `## 七、机会空位与威胁`,
    ``,
    `### 可打空位（候选）`,
    ...collection.whitespaceCandidates.map((w, i) => `${i + 1}. ${w}`),
    ``,
    `**本稿建议主空位**：${whitespace}`,
    ``,
    `### 主要威胁`,
    ...risks.map((r) => `- ${r}`),
    ``,
    `## 八、结论与战略启示`,
    ``,
    `1. **战场一句话**：${headline}`,
    `2. **对定位的启示**：不要在已占稳的领导联想上正面硬刚；把资源押在「${whitespace}」，并用菜单/话术/场景在 30 天内证明。`,
    `3. **品牌阶段匹配**：当前阶段为「${s.brandStage}」，空位选择必须匹配可投入资源（${s.edge || "供给能力待补"}）。`,
    `4. **下一步**：确认本调研后，进入三席顾问出策（心智官 / 空位官 / 冲突官）。`,
    ``,
    `## 九、附录：证据与来源`,
    ``,
    `- 采集查询数：${collection.queries.length}`,
    `- 采集模式：${collection.mode}`,
    `- 原始备注：${collection.rawNotes.join("；")}`,
    ``,
    `### 查询清单`,
    ...collection.queries.map((q) => `- ${q}`),
    ``,
    `### 一手店访证据计划（待补）`,
    ``,
    `> 诚实标注：公开检索 ≠ 店访。以下清单是「还差什么必须去店里看」，不是已完成结论。`,
    ``,
    ...collection.competitors.slice(0, 5).flatMap((c, i) => [
      `${i + 1}. **${c.name}**（心智假说：${c.mentalPosition || "待钉死"}）`,
      `   - [ ] 门头第一眼词`,
      `   - [ ] 主推前 3 道与口号是否一致`,
      `   - [ ] 店员开口第一句在卖什么`,
      `   - [ ] 客单价体感是否与定位打架`,
      `   - [ ] 客人原话能否复述差异点`,
      c.threatToWhitespace
        ? `   - [ ] 核对空位威胁：${c.threatToWhitespace.slice(0, 40)}`
        : `   - [ ] 是否挤占本稿空位「${whitespace}」`,
      ``,
    ]),
    `---`,
    ``,
    `*本报告由 MealKey 定位调研引擎生成。公开检索有时效偏差；涉及门店数/客单/评分等硬指标，请以一手店访或授权数据源复核。*`,
    ``,
  ].join("\n");

  return {
    markdown,
    headline,
    categoryTrend,
    consumerShift,
    competitiveLandscape,
    whitespace,
    risks: risks.slice(0, 5),
    evidenceNotes: evidenceNotes.slice(0, 12),
  };
}

export type { ResearchScope };
