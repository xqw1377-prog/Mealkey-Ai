/**
 * 对话内容 / 编译产出 → 经营知识分类（确定性启发式）
 * 对齐资料中心 DEFAULT_ASSET_CATEGORIES slug，禁平行 taxonomy。
 */
import type {
  BusinessAssetV1,
  IntentFamily,
} from "../contracts/goal-compiler";

export const KNOWLEDGE_CONTENT_CATEGORIES = [
  {
    slug: "store-operations",
    label: "门店经营",
    description: "运营、人效、客流、SOP与日常经营问题",
  },
  {
    slug: "finance-materials",
    label: "财务与利润",
    description: "收入、成本、利润、预算与测算",
  },
  {
    slug: "brand-product",
    label: "品牌与产品",
    description: "定位、菜单、产品与品牌表达",
  },
  {
    slug: "market-research",
    label: "市场与选址",
    description: "调研、竞品、选址与开店评估",
  },
  {
    slug: "supply-chain",
    label: "供应链",
    description: "采购、食材、供应商与交付",
  },
  {
    slug: "decision-review",
    label: "决策与复盘",
    description: "待拍板事项、方案复盘与历史判断",
  },
  {
    slug: "experience-history",
    label: "经验沉淀",
    description: "方法论、课程与可复用经验",
  },
  {
    slug: "other-operating",
    label: "其他经营",
    description: "尚未归入专项的经营对话",
  },
] as const;

export type KnowledgeContentCategorySlug =
  (typeof KNOWLEDGE_CONTENT_CATEGORIES)[number]["slug"];

export type KnowledgeClassificationV1 = {
  categorySlug: KnowledgeContentCategorySlug;
  categoryLabel: string;
  confidence: number;
  reasons: string[];
};

const LABEL_BY_SLUG: Record<KnowledgeContentCategorySlug, string> =
  Object.fromEntries(
    KNOWLEDGE_CONTENT_CATEGORIES.map((c) => [c.slug, c.label]),
  ) as Record<KnowledgeContentCategorySlug, string>;

const INTENT_DEFAULT: Record<IntentFamily, KnowledgeContentCategorySlug> = {
  improve_profit: "finance-materials",
  diagnose_performance: "store-operations",
  launch_store: "market-research",
  expand_store: "market-research",
  positioning: "brand-product",
  menu_optimize: "brand-product",
  other_operating: "other-operating",
};

const ASSET_TYPE_DEFAULT: Record<
  BusinessAssetV1["type"],
  KnowledgeContentCategorySlug
> = {
  financial_model: "finance-materials",
  report: "decision-review",
  plan: "decision-review",
  positioning: "brand-product",
  menu_model: "brand-product",
  site_model: "market-research",
  other: "other-operating",
};

type KeywordRule = {
  slug: KnowledgeContentCategorySlug;
  patterns: RegExp[];
  weight: number;
};

const KEYWORD_RULES: KeywordRule[] = [
  {
    slug: "finance-materials",
    weight: 3,
    patterns: [
      /利润|毛利|净利|营收|营业额|成本|损耗|现金流|预算|投资回报|ROI|人效|坪效|房租|租金/,
    ],
  },
  {
    slug: "brand-product",
    weight: 3,
    patterns: [
      /定位|品牌|菜单|菜品|出品|客单|视觉|包装|品类调性|招牌菜/,
    ],
  },
  {
    slug: "market-research",
    weight: 3,
    patterns: [
      /选址|商圈|开店|扩店|第二家|竞品|调研|客群|区位|铺面|开业/,
    ],
  },
  {
    slug: "store-operations",
    weight: 2.5,
    patterns: [
      /门店|排班|人效|客流|翻台|出品慢|服务|SOP|运营|加班|越来越累/,
    ],
  },
  {
    slug: "supply-chain",
    weight: 3,
    patterns: [/供应链|采购|供应商|食材|进货|库存|冷链|物流/],
  },
  {
    slug: "decision-review",
    weight: 2.5,
    patterns: [/决策|拍板|复盘|方案|诊断报告|待确认|决策室/],
  },
  {
    slug: "experience-history",
    weight: 2,
    patterns: [/经验|方法论|课程|证书|复盘笔记|沉淀/],
  },
];

function scoreText(text: string): Map<KnowledgeContentCategorySlug, number> {
  const scores = new Map<KnowledgeContentCategorySlug, number>();
  const hay = text.trim();
  if (!hay) return scores;
  for (const rule of KEYWORD_RULES) {
    for (const re of rule.patterns) {
      if (re.test(hay)) {
        scores.set(rule.slug, (scores.get(rule.slug) ?? 0) + rule.weight);
      }
    }
  }
  return scores;
}

function pickTop(
  scores: Map<KnowledgeContentCategorySlug, number>,
  fallback: KnowledgeContentCategorySlug,
  reasons: string[],
): KnowledgeClassificationV1 {
  let best = fallback;
  let bestScore = -1;
  for (const [slug, score] of scores) {
    if (score > bestScore) {
      best = slug;
      bestScore = score;
    }
  }
  const confidence =
    bestScore <= 0 ? 0.45 : Math.min(0.95, 0.55 + bestScore * 0.08);
  if (bestScore > 0) {
    reasons.push(`内容关键词命中「${LABEL_BY_SLUG[best]}」`);
  }
  return {
    categorySlug: best,
    categoryLabel: LABEL_BY_SLUG[best],
    confidence,
    reasons,
  };
}

export function classifyKnowledgeContent(input: {
  text?: string;
  title?: string;
  intentFamily?: IntentFamily | null;
  assetType?: BusinessAssetV1["type"] | null;
}): KnowledgeClassificationV1 {
  const reasons: string[] = [];
  const blob = [input.title, input.text].filter(Boolean).join("\n");
  const scores = scoreText(blob);

  let fallback: KnowledgeContentCategorySlug = "other-operating";
  if (input.assetType) {
    fallback = ASSET_TYPE_DEFAULT[input.assetType] ?? fallback;
    reasons.push(`资产类型 ${input.assetType}`);
    scores.set(fallback, (scores.get(fallback) ?? 0) + 1.5);
  }
  if (input.intentFamily) {
    const intentSlug = INTENT_DEFAULT[input.intentFamily] ?? "other-operating";
    reasons.push(`意图 ${input.intentFamily}`);
    scores.set(intentSlug, (scores.get(intentSlug) ?? 0) + 2);
    if (!input.assetType) fallback = intentSlug;
  }

  return pickTop(scores, fallback, reasons);
}

/** 给编译产出资产打分类（不改 body） */
export function classifyBusinessAsset(
  asset: BusinessAssetV1,
  intentFamily?: IntentFamily | null,
): BusinessAssetV1 {
  const cls = classifyKnowledgeContent({
    title: asset.title,
    text: asset.body.slice(0, 2000),
    assetType: asset.type,
    intentFamily,
  });
  return {
    ...asset,
    categorySlug: cls.categorySlug,
    categoryLabel: cls.categoryLabel,
  };
}

export function knowledgeCategoryLabel(
  slug: string | null | undefined,
): string {
  if (!slug) return LABEL_BY_SLUG["other-operating"];
  return (
    LABEL_BY_SLUG[slug as KnowledgeContentCategorySlug] ||
    LABEL_BY_SLUG["other-operating"]
  );
}
