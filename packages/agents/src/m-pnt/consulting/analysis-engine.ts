/**
 * 咨询级分析引擎 — 框架驱动，非自由散文
 * P1：Category Decision / Insight Evidence / Positioning Map 坐标
 */
import type {
  BrandBrief,
  CategoryDiagnosis,
  CompetitiveMap,
  ConsumerInsight,
  MapPlotPoint,
  PrimaryFact,
} from "./types";
import { formatFactsForNarrative } from "./evidence-ledger-engine";
import {
  buildBattlefieldOptions,
} from "./category-decision-engine";
import { enrichConsumerInsightWithHumanTruth } from "./protocol-artifacts";

export {
  selectCategoryBattlefield,
  buildBattlefieldOptions,
  assertCategoryDecisionReady,
} from "./category-decision-engine";

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function inferLifecycle(categoryText: string): string {
  if (/咖啡|茶饮|炸鸡|麻辣烫|烧烤/.test(categoryText)) {
    return "成熟/红海倾向：流量大，心智位已被头部品牌切分";
  }
  if (/湘菜|川菜|粤菜|火锅|家常|私房/.test(categoryText)) {
    return "品类成熟、品牌化未完成：有机会用场景/人群切出新心智";
  }
  if (/健康|轻食|植物|新中式/.test(categoryText)) {
    return "成长赛道：教育成本高，先占清晰心智再扩品";
  }
  return "需验证：默认按「可切分心智的成熟品类」处理";
}

export function buildCategoryDiagnosis(input: {
  brief: BrandBrief;
  city: string;
  brandName?: string;
  primaryFacts?: PrimaryFact[];
}): CategoryDiagnosis {
  const { brief, city, brandName, primaryFacts = [] } = input;
  const categoryName = brief.categoryDefinition || "目标品类";
  const lifecycle = inferLifecycle(categoryName + brief.businessContext);
  const consumerPerceptionGap = [
    `经营者自认：${brief.categoryDefinition}`,
    `消费者可能仍按旧习惯归类（需用场景与证据纠正）`,
    brief.brandAmbition
      ? `野心方向：${brief.brandAmbition} — 这决定要不要做品类教育`
      : "野心未声明，品类选择风险升高",
  ].join("；");

  const options = buildBattlefieldOptions({
    brief,
    city,
    categoryName,
    primaryFacts,
  });
  const recommended = options.find((o) => o.recommended) || options[0]!;
  const rejectedBattlefields = options
    .filter((o) => !o.recommended)
    .map((o) => `${o.label}（否决：${o.risk}；总分${o.scores?.total ?? "—"}）`);

  const opportunity =
    brief.brandAmbition ||
    `尚未被清晰占领：服务「${brief.targetCustomer}」时，${brief.customerNeed || "核心需求"} 的确定感品牌`;

  const analysisNarrative = [
    `【品类诊断】${brandName || "品牌"} 所在叙事场：${categoryName}。`,
    `生命周期判断：${lifecycle}。`,
    `战略问题：我们到底要在哪个战场，成为谁的第一选择？`,
    `推荐战场：${recommended.label}（评分卡总分 ${recommended.scores?.total ?? "—"}）。`,
    `推荐理由：${recommended.rationale}`,
    `认知落差：${consumerPerceptionGap}。`,
    `机会陈述：${opportunity}。`,
    `否决战场：${rejectedBattlefields.join("；")}。`,
    formatFactsForNarrative(primaryFacts),
    `下一步：创始人必须对比评分卡并自填决策理由后选定战场，才能确认本阶段。`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    artifactId: createId("cat"),
    status: "draft",
    categoryName,
    battlefield: recommended.label,
    opportunity,
    risks: [
      "品类同质化导致传播无效，沦为可替换供给",
      "自认品类与消费者认知不一致，教育成本失控",
      "资源不足以支撑品类教育与验证期",
      "选错战场：与不可战胜的心智第一硬碰",
      recommended.risk,
    ],
    lifecycle,
    consumerPerceptionGap,
    strategicQuestion: "我们到底要在哪个战场，成为谁的第一选择？",
    recommendedBattlefield: recommended.label,
    rejectedBattlefields,
    analysisNarrative,
    decision: {
      options,
      selectedOptionId: undefined,
      decisionReason: undefined,
    },
  };
}

export function buildConsumerInsight(input: {
  brief: BrandBrief;
  city?: string;
  primaryFacts?: PrimaryFact[];
}): ConsumerInsight {
  const { brief, primaryFacts = [] } = input;
  const need = brief.customerNeed || "完成一次可预期、可复述的消费体验";
  const primaryPersona = brief.targetCustomer || "核心目标用户";

  const functionalJob = need;
  const emotionalJob = /家庭|带娃|朋友|宴请/.test(primaryPersona + need)
    ? "在重要关系里显得靠谱、有品味、不添乱"
    : "减少决策焦虑，获得「选对了」的确定感";

  const occasions = [
    /家庭|带娃/.test(primaryPersona) ? "周末家庭聚餐 / 工作日便捷晚餐" : "工作日即时消费",
    /商务|宴请/.test(primaryPersona + need) ? "轻商务接待" : "与朋友小聚",
    "想换口味但不愿冒险的常规选择",
  ];

  const barriers = [
    "对现有习惯选择的路径依赖（默认点熟店）",
    "对新品牌「会不会踩雷」的信任门槛",
    "价格与品质预期错配时的离开成本低",
  ];

  const unmetNeeds = [
    need,
    "既要品质确定感，又要场景匹配（不是泛化好评）",
    "一句能对外复述的选择理由（社交可传播）",
  ];

  const switchTriggers = [
    "一次稳定超出预期的体验（可被复述）",
    "明确场景承诺被兑现（说到做到）",
    "身边人推荐形成社会证明",
  ];

  const insightStatement = `当「${primaryPersona}」处于「${occasions[0]}」时，真正要完成的是「${functionalJob}」，并获得「${emotionalJob}」——现有选项未能稳定提供这一点。`;

  const insightEvidence = [
    {
      evidenceId: createId("ie"),
      claim: need,
      source: "BrandBrief.customerNeed",
      strength: "strong" as const,
      reviewStatus: "pending" as const,
    },
    {
      evidenceId: createId("ie"),
      claim: `主人格：${primaryPersona}`,
      source: "BrandBrief.targetCustomer",
      strength: "strong" as const,
      reviewStatus: "pending" as const,
    },
    {
      evidenceId: createId("ie"),
      claim: `关键场合：${occasions.join(" / ")}`,
      source: "ConsumerInsight.occasions",
      strength: "moderate" as const,
      reviewStatus: "pending" as const,
    },
    {
      evidenceId: createId("ie"),
      claim: `心智障碍：${barriers[0]}`,
      source: "ConsumerInsight.barriers",
      strength: "moderate" as const,
      reviewStatus: "pending" as const,
    },
    ...primaryFacts.map((f) => ({
      evidenceId: f.factId,
      claim: f.claim,
      source: `PrimaryFact.${f.sourceType}`,
      strength: f.strength,
      reviewStatus: "pending" as const,
    })),
  ];

  const insightNarrative = [
    `【用户洞察】主人格：${primaryPersona}。`,
    `洞察陈述：${insightStatement}`,
    `功能任务：${functionalJob}。`,
    `情感任务：${emotionalJob}。`,
    `关键场合：${occasions.join("；")}。`,
    `心智障碍：${barriers.join("；")}。`,
    `未满足需求：${unmetNeeds.join("；")}。`,
    `转化触发：${switchTriggers.join("；")}。`,
    formatFactsForNarrative(primaryFacts),
    `洞察结论：定位必须同时回答「为谁、在什么场合、解决什么未被满足的确定感」。`,
  ]
    .filter(Boolean)
    .join("\n");

  const base: ConsumerInsight = {
    artifactId: createId("cus"),
    status: "draft",
    targetCustomer: primaryPersona,
    jobsToBeDone: [functionalJob, emotionalJob, "降低试错与决策成本"],
    barriers,
    unmetNeeds,
    primaryPersona,
    occasions,
    emotionalJob,
    functionalJob,
    switchTriggers,
    insightNarrative,
    insightStatement,
    insightEvidence,
  };
  // Protocol P3：挂 Human Truth（行为→矛盾→未满足→机会）
  return enrichConsumerInsightWithHumanTruth(base);
}

export function buildCompetitiveMap(input: {
  brief: BrandBrief;
  city: string;
  primaryFacts?: PrimaryFact[];
  /** 调研竞对摘要 — 优先写入心智位 */
  competitorBriefs?: Array<{
    name: string;
    mentalPosition?: string;
    evidenceSentence?: string;
    threatToWhitespace?: string;
    summary: string;
  }>;
  whitespaceFromResearch?: string;
}): CompetitiveMap {
  const { brief, city, primaryFacts = [], competitorBriefs = [] } = input;
  const namedFromBrief = (brief.competitiveSet || []).filter(Boolean);
  const namedFromResearch = competitorBriefs.map((b) => b.name).filter(Boolean);
  const named =
    namedFromResearch.length > 0 ? namedFromResearch : namedFromBrief;

  // L5：竞品心智句优先引用一手竞争事实，坐标仍为分析草图须标注
  const competitorFacts = primaryFacts.filter(
    (f) =>
      f.relatedStage === "COMPETITIVE_MAPPING" ||
      f.sourceType === "competitor_note",
  );

  const baseCompetitors =
    named.length > 0
      ? named.slice(0, 6).map((name, index) => {
          const briefHit = competitorBriefs.find(
            (b) => b.name === name || name.includes(b.name.slice(0, 2)),
          );
          const fact = competitorFacts.find((f) =>
            f.claim.includes(name.slice(0, 2)),
          );
          return {
            name,
            mentalSlot: briefHit?.mentalPosition
              ? briefHit.mentalPosition
              : fact
                ? `证据：${fact.claim.slice(0, 36)}`
                : index === 0
                  ? "品类默认/习惯位（推断，待核实）"
                  : index === 1
                    ? "性价比或便利替代位（推断，待核实）"
                    : "场景/口碑细分位（推断，待核实）",
            weakness: briefHit?.threatToWhitespace
              ? briefHit.threatToWhitespace.slice(0, 48)
              : index === 0
                ? "差异叙事老化，体验一致性波动"
                : "心智模糊，难以形成第一联想",
            priceBand: "同城主流带",
            attackAngle: "不正面抢通用第一，切场景与确定感",
            x: clamp(78 - index * 12),
            y: clamp(index === 0 ? 55 : index === 1 ? 35 : 62 - index * 4),
          };
        })
      : [
          {
            name: "品类惯性选择（无名默认店）",
            mentalSlot: "默认选项",
            weakness: "无鲜明心智锚点",
            priceBand: "主流",
            attackAngle: "用可复述定位替代「随便吃」",
            x: 70,
            y: 48,
          },
          {
            name: "平台流量型替代",
            mentalSlot: "便利/折扣",
            weakness: "品牌资产弱，关系浅",
            priceBand: "偏促",
            attackAngle: "场景承诺与到店体验",
            x: 45,
            y: 28,
          },
          {
            name: "高评分单店",
            mentalSlot: "口味口碑",
            weakness: "难复制、难规模化表达",
            priceBand: "偏高",
            attackAngle: "可复制的品牌系统而非单点神技",
            x: 58,
            y: 72,
          },
        ];

  const whitespace =
    input.whitespaceFromResearch ||
    brief.founderBelief ||
    `在 ${city} 服务「${brief.targetCustomer}」时，围绕「${brief.customerNeed || "核心需求"}」尚未被稳定占领的心智空位`;

  const whitespaceRegion = {
    x: 32,
    y: 68,
    label: "场景确定感空位",
    halfW: 12,
    halfH: 10,
  };

  const noGoZones = [
    "与心智第一品牌拼「谁更正宗/更大」的消耗战",
    "无差异的价格战",
    "口号华丽但供给无法兑现的人设战",
  ];

  const attackHypothesis = `假设：若品牌能在「${brief.targetCustomer}」场合，稳定兑现「${brief.customerNeed || "核心需求"}」，并用一句话对外复述，则可从默认选项中切走可防御份额。`;

  const plotPoints: MapPlotPoint[] = [
    ...baseCompetitors.map((c, i) => ({
      id: createId("pt"),
      label: c.name,
      kind: "competitor" as const,
      x: c.x,
      y: c.y,
      mentalSlot: c.mentalSlot,
      note: c.weakness,
    })),
    {
      id: createId("pt"),
      label: whitespaceRegion.label,
      kind: "whitespace",
      x: whitespaceRegion.x,
      y: whitespaceRegion.y,
      note: whitespace,
    },
    {
      id: createId("pt"),
      label: "我方建议占位",
      kind: "our_brand",
      x: clamp(whitespaceRegion.x + 8),
      y: clamp(whitespaceRegion.y + 4),
      note: attackHypothesis,
    },
    {
      id: createId("pt"),
      label: "禁入：正面硬碰",
      kind: "no_go",
      x: 88,
      y: 88,
      note: noGoZones[0],
    },
  ];

  const mapEvidence = [
    {
      evidenceId: createId("me"),
      claim: whitespace,
      sourceArtifact: "CompetitiveMap.whitespace",
      strength: "strong" as const,
      reviewStatus: "pending" as const,
    },
    {
      evidenceId: createId("me"),
      claim: `坐标轴：心智清晰度 × 场景匹配度；空位区块约 (${whitespaceRegion.x}±${whitespaceRegion.halfW}, ${whitespaceRegion.y}±${whitespaceRegion.halfH})`,
      sourceArtifact: "CompetitiveMap.whitespaceRegion",
      strength: "moderate" as const,
      reviewStatus: "pending" as const,
    },
    {
      evidenceId: createId("me"),
      claim: `竞品集：${baseCompetitors.map((c) => c.name).join("、")}`,
      sourceArtifact: "BrandBrief.competitiveSet",
      strength: "moderate" as const,
      reviewStatus: "pending" as const,
    },
    ...primaryFacts.map((f) => ({
      evidenceId: f.factId,
      claim: f.claim,
      sourceArtifact: `PrimaryFact.${f.sourceType}`,
      strength: f.strength,
      reviewStatus: "pending" as const,
    })),
  ];

  const mapNarrative = [
    `【竞争地图 / Positioning Map】城市：${city}。`,
    `坐标轴：X=${"心智清晰度"}，Y=${"场景匹配度"}（0–100）。`,
    `空位声明：${whitespace}。`,
    `空位坐标：(${whitespaceRegion.x}, ${whitespaceRegion.y}) · ${whitespaceRegion.label}。`,
    `进攻假设：${attackHypothesis}。`,
    `禁入红区：${noGoZones.join("；")}。`,
    formatFactsForNarrative(primaryFacts),
    `竞品读法：名单不是目的，目的是找到可进攻空位与不可打的红区。`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    artifactId: createId("map"),
    status: "draft",
    competitors: baseCompetitors,
    whitespace,
    axes: { x: "心智清晰度", y: "场景匹配度" },
    mapNarrative,
    noGoZones,
    attackHypothesis,
    plotPoints,
    whitespaceRegion,
    mapEvidence,
  };
}
