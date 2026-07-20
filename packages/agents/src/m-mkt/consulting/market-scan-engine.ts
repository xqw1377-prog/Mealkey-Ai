/**
 * M-MKT 厚调研 — 市场扫描（品类·消费·竞争·缺口 + 完整 Markdown）
 * 对标 M-PNT market-research-engine / report-composer 的过程厚度
 */
import {
  createId,
  nowIso,
  type ResearchPack,
} from "../../consulting-os/types";
import type { CompetitorBrief, MarketScanScope } from "./types";

function clip(s: string, n: number) {
  const t = (s || "").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

export function resolveScanScope(
  answers: Record<string, string>,
  ctx?: { city?: string; name?: string },
): MarketScanScope {
  return {
    city: answers.city || ctx?.city || "目标城市",
    category: answers.category || "目标品类",
    intent: answers.intent || "判断这个市场值不值得进入",
    constraint: answers.constraint || "资源有限，必须小步试点",
    scene: (answers.scene || answers.fq_scene || "").trim() || undefined,
    targetCustomer: (answers.targetCustomer || "").trim() || undefined,
    rivals: (answers.rivals || "").trim() || undefined,
    ticketBand: (answers.ticketBand || "").trim() || undefined,
    killLine: (answers.killLine || answers.fq_proof || "").trim() || undefined,
  };
}

export function buildCompetitorBriefs(scope: MarketScanScope): CompetitorBrief[] {
  const cat = scope.category;
  return [
    {
      name: `${scope.city}头部连锁`,
      play: `占流量与价格带，用标准化菜单覆盖「${cat}」大盘`,
      threat: "若你走全品类硬刚，会被其供应链与营销预算压住",
    },
    {
      name: "本地同质馆",
      play: "卷折扣、堆 SKU，客人记不住差异",
      threat: "若切口不清，会被价格战拖进红海",
    },
    {
      name: "场景特化玩家（若有）",
      play: "只打一个高频场合，主推清晰",
      threat: "若对方已占你想要的场景空位，需换切口或换战场",
    },
  ];
}

/** 把薄 ResearchPack 加厚为机构级市场扫描 */
export function thickenMarketScan(
  pack: ResearchPack,
  answers: Record<string, string>,
  ctx?: { city?: string; name?: string; collectionMode?: ResearchPack["collectionMode"] },
): ResearchPack {
  const scope = resolveScanScope(answers, ctx);
  const briefs = pack.competitorBriefs?.length
    ? pack.competitorBriefs
    : buildCompetitorBriefs(scope);
  const projectName = ctx?.name || "本项目";

  const coreSections = pack.sections.filter(
    (s) => s.title !== "本轮唯一问题" && s.title !== "所以呢（决策含义）",
  );

  // 保证四段扫描骨架存在（缺口优先吃老板口述场景）
  const ensured = ensureScanSections(coreSections, scope, briefs, pack.headline);

  const fullMarkdown = composeMarketScanMarkdown({
    scope,
    headline: pack.headline,
    sections: ensured,
    briefs,
    risks: pack.risks,
    projectName,
  });

  return {
    ...pack,
    scope,
    competitorBriefs: briefs,
    sources: pack.sources?.length
      ? pack.sources
      : [
          "采集信号（城市/品类/意图/约束）",
          pack.collectionMode === "engine"
            ? "一枪市场引擎投影"
            : "启发式市场扫描骨架",
        ],
    collectionMode: ctx?.collectionMode || pack.collectionMode || "heuristic",
    fullMarkdown,
    sections: ensured,
    risks: Array.from(
      new Set([
        ...pack.risks,
        "没有杀出线的进入 = 烧钱试错",
        "切口过宽会被连锁与低价馆两头挤压",
      ]),
    ).slice(0, 6),
  };
}

function ensureScanSections(
  existing: ResearchPack["sections"],
  scope: MarketScanScope,
  briefs: CompetitorBrief[],
  headline: string,
): ResearchPack["sections"] {
  const byTitle = new Map(existing.map((s) => [s.title, s.body]));
  const defaults: ResearchPack["sections"] = [
    {
      title: "品类结构",
      body:
        byTitle.get("品类结构") ||
        `${scope.city}的${scope.category}供给偏「大而全」，真正被记住的场景心智位仍稀缺。`,
    },
    {
      title: "消费变化",
      body:
        byTitle.get("消费变化") ||
        byTitle.get("需求缺口") ||
        `客人更认「为谁、什么场合」，而不是「什么菜都有」。本次议题：${scope.intent}。`,
    },
    {
      title: "竞争格局",
      body:
        byTitle.get("竞争格局") ||
        briefs.map((b) => `${b.name}：${b.play}`).join("；"),
    },
    {
      title: "可进入缺口",
      body:
        byTitle.get("可进入缺口") ||
        byTitle.get("可进入切口") ||
        byTitle.get("需求缺口") ||
        (scope.scene
          ? `优先打「${scope.scene}」${
              scope.targetCustomer ? `（给${scope.targetCustomer}）` : ""
            }：用可证明的供给建立第一联想。约束：${scope.constraint}。`
          : scope.targetCustomer
            ? `优先打「${scope.targetCustomer}」主场场合：用可证明的供给建立第一联想。约束：${scope.constraint}。`
            : `优先打一个可验证的场景切口，用可证明的供给建立第一联想。约束：${scope.constraint}。`),
    },
    {
      title: "竞对摘要",
      body: briefs
        .map((b) => `${b.name}｜打法：${b.play}｜威胁：${b.threat}`)
        .join("\n"),
    },
    {
      title: "扫描结论",
      body: headline || `${scope.city}·${scope.category}：机会在场景清晰、供给过宽的缝里`,
    },
  ];

  // 保留引擎带来的其它章节
  const known = new Set(defaults.map((d) => d.title));
  const extras = existing.filter((s) => !known.has(s.title));
  return [...defaults, ...extras];
}

function composeMarketScanMarkdown(input: {
  scope: MarketScanScope;
  headline: string;
  sections: ResearchPack["sections"];
  briefs: CompetitorBrief[];
  risks: string[];
  projectName: string;
}): string {
  const { scope, headline, sections, briefs, risks, projectName } = input;
  const lines = [
    `# 市场机会扫描报告`,
    ``,
    `> ${projectName} · ${scope.city} · ${scope.category}`,
    `> 扫描范围：意图「${clip(scope.intent, 40)}」｜约束「${clip(scope.constraint, 36)}」`,
    `> 状态：待确认`,
    ``,
    `## 0. 一句话结论`,
    ``,
    headline,
    ``,
    `## 1. 扫描范围卡`,
    ``,
    `| 项 | 内容 |`,
    `| --- | --- |`,
    `| 城市/区域 | ${scope.city} |`,
    `| 品类/业态 | ${scope.category} |`,
    `| 本轮意图 | ${scope.intent} |`,
    `| 最大约束 | ${scope.constraint} |`,
    ``,
    `## 2. 品类与消费`,
    ``,
    sections.find((s) => s.title === "品类结构")?.body || "",
    ``,
    sections.find((s) => s.title === "消费变化")?.body || "",
    ``,
    `## 3. 竞争格局`,
    ``,
    sections.find((s) => s.title === "竞争格局")?.body || "",
    ``,
    `### 竞对三联`,
    ``,
    ...briefs.flatMap((b) => [
      `- **${b.name}**`,
      `  - 打法：${b.play}`,
      `  - 威胁：${b.threat}`,
      ``,
    ]),
    `## 4. 可进入缺口`,
    ``,
    sections.find((s) => s.title === "可进入缺口")?.body || "",
    ``,
    `## 5. 风险与止损暗示`,
    ``,
    ...risks.map((r) => `- ${r}`),
    ``,
    `## 6. 对顾问会的含义`,
    ``,
    `下一席三位顾问将分别从「值不值得进 / 店里打不打得动 / 多久验证杀出」出互斥进入方案，不得三线并行。`,
    ``,
    `*MealKey M-MKT 市场战略委员会 · 扫描组*`,
    ``,
  ];
  return lines.join("\n");
}

/** 无引擎时的完整启发式扫描 */
export function buildHeuristicMarketScan(
  answers: Record<string, string>,
  ctx?: { city?: string; name?: string },
): ResearchPack {
  const scope = resolveScanScope(answers, ctx);
  const briefs = buildCompetitorBriefs(scope);
  const headline = `${scope.city} · ${scope.category}：机会在「场景清晰、供给过宽」的缝里`;
  const base: ResearchPack = {
    packId: createId("mrp"),
    status: "ready",
    headline,
    sections: [],
    risks: [
      "若进入过宽，会被连锁与低价馆两头挤压",
      scope.constraint,
    ],
    generatedAt: nowIso(),
    collectionMode: "heuristic",
  };
  return thickenMarketScan(base, answers, {
    city: scope.city,
    name: ctx?.name,
    collectionMode: "heuristic",
  });
}
