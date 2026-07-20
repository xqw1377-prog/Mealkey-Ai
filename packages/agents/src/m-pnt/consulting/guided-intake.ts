/**
 * 餐饮老板友好的引导录入题库（白话 + 选择题）
 * 目标：少填空、多点选；专业字段由系统映射。
 */
import type { PrimaryFactRelatedStage, PrimaryFactSourceType } from "./types";

export type GuidedFactChoice = {
  label: string;
  /** 写入账本的完整陈述 */
  claim: string;
};

export type GuidedFactQuestion = {
  id: string;
  /** 给老板看的问题 */
  question: string;
  /** 一句话说明为什么问 */
  why: string;
  relatedStage: PrimaryFactRelatedStage;
  sourceType: PrimaryFactSourceType;
  strength: "strong" | "moderate" | "weak";
  choices: GuidedFactChoice[];
  /** 允许口述补充时的占位 */
  voicePlaceholder: string;
};

/** 一手证据三问：覆盖品类 / 洞察 / 竞争 */
export const PRIMARY_FACT_GUIDE: GuidedFactQuestion[] = [
  {
    id: "guide_category_who",
    question: "周末店里最多的是哪类客人？",
    why: "用来判断你该抢哪个「战场」，不是写论文。",
    relatedStage: "CATEGORY_ANALYSIS",
    sourceType: "sales_note",
    strength: "strong",
    voicePlaceholder: "也可以直接说：周末大多是带小孩的家庭…",
    choices: [
      {
        label: "家庭聚餐多",
        claim: "周末家庭堂食明显多于工作日，家庭客是主场",
      },
      {
        label: "年轻人小聚多",
        claim: "周末以年轻人小聚、约会为主，家庭客不是主力",
      },
      {
        label: "商务宴请多",
        claim: "周末仍以商务宴请和请客为主，客单价偏高",
      },
      {
        label: "外卖为主",
        claim: "周末外卖单量远高于堂食，到店场景不强",
      },
    ],
  },
  {
    id: "guide_consumer_fear",
    question: "客人最怕踩什么雷？（或最常抱怨什么）",
    why: "找到「没被满足的需求」，定位才站得住。",
    relatedStage: "CONSUMER_INSIGHT",
    sourceType: "customer_quote",
    strength: "strong",
    voicePlaceholder: "也可以直接说客人原话…",
    choices: [
      {
        label: "怕油腻踩雷",
        claim: "用户说想吃湘菜但又怕太油腻踩雷，不确定感强",
      },
      {
        label: "怕贵不值",
        claim: "用户抱怨贵但吃不出对应价值，性价比不确定",
      },
      {
        label: "怕等太久",
        claim: "用户最怕排队久、上菜慢，时间成本高",
      },
      {
        label: "怕口味不稳",
        claim: "用户说每次味道不一样，不敢放心复购",
      },
    ],
  },
  {
    id: "guide_competitor_slot",
    question: "隔壁/同行主要怎么打？你们差在哪？",
    why: "找出还能占的空位，避免硬碰硬。",
    relatedStage: "COMPETITIVE_MAPPING",
    sourceType: "competitor_note",
    strength: "moderate",
    voicePlaceholder: "也可以说说最近观察的竞品…",
    choices: [
      {
        label: "他们打重口宴请",
        claim: "竞品主打重口宴请心智，家庭干净可预期场景仍空缺",
      },
      {
        label: "他们打低价走量",
        claim: "竞品主打低价走量，品牌信任与品质确定感不足",
      },
      {
        label: "他们打网红打卡",
        claim: "竞品主打网红打卡与话题，复购与日常场景弱",
      },
      {
        label: "他们啥都做",
        claim: "竞品菜单宽、心智糊，没有清晰场景第一联想",
      },
    ],
  },
];

export function guidedFactCoverage(
  facts: Array<{ relatedStage?: string; claim?: string }>,
): {
  answeredIds: string[];
  missing: GuidedFactQuestion[];
  ok: boolean;
} {
  const answeredIds: string[] = [];
  const missing: GuidedFactQuestion[] = [];
  for (const q of PRIMARY_FACT_GUIDE) {
    const hit = facts.some(
      (f) =>
        f.relatedStage === q.relatedStage &&
        (f.claim?.trim().length || 0) >= 8,
    );
    if (hit) answeredIds.push(q.id);
    else missing.push(q);
  }
  return { answeredIds, missing, ok: missing.length === 0 };
}

/** 把门禁缺项翻译成老板听得懂的话 */
export function humanizeConsultingGap(codeOrMessage: string): {
  title: string;
  how: string;
  anchor: "facts" | "hypothesis" | "evidence" | "decision" | "insight" | "map" | "sign" | "other";
} {
  const m = codeOrMessage;
  if (/品类.*一手|CATEGORY_ANALYSIS|primary:category|fact_category|销售|门店/.test(m)) {
    return {
      title: "还缺：周末客人/卖得好的一句话",
      how: "去「三问快答」第 1 题点选，或语音说一句就行。",
      anchor: "facts",
    };
  }
  if (/洞察.*一手|CONSUMER|primary:customer|用户原话|洞察陈述|洞察判断/.test(m)) {
    return {
      title: "还缺：客人最怕什么 / 洞察一句话",
      how: "去「三问快答」第 2 题点选；洞察阶段再确认那句白话。",
      anchor: "facts",
    };
  }
  if (/竞争.*一手|COMPETITIVE|primary:competition|竞品|地图证据|空位/.test(m)) {
    return {
      title: "还缺：同行怎么打 / 空位在哪",
      how: "去「三问快答」第 3 题点选；竞争阶段再点采纳证据。",
      anchor: "facts",
    };
  }
  if (/假设|hypothesis/.test(m)) {
    return {
      title: "还没选定主定位假设",
      how: "在假设区点黑按钮「确认选定此假设」（默认已是最高分）。",
      anchor: "hypothesis",
    };
  }
  if (/待审|证据采纳|evidence/.test(m)) {
    return {
      title: "证据还没审完",
      how: "点「一键采纳全部待审」，不用一条条点。",
      anchor: "evidence",
    };
  }
  if (/战场|决策理由|Category Decision|覆盖推荐/.test(m)) {
    return {
      title: "战场还没拍板",
      how: "品类页两问：① 点选要抢哪类心智；② 点选「为什么」，再确认。",
      anchor: "decision",
    };
  }
  if (/战略选择/.test(m)) {
    return {
      title: "还没点「为什么走这条路」",
      how: "点选一条现成理由即可，不必自己作文。",
      anchor: "other",
    };
  }
  if (/六段|For|Who|That|Because/.test(m)) {
    return {
      title: "定位几句话还没齐",
      how: "系统会先起草；你点选确认或改一句就行，不用背英文字段。",
      anchor: "hypothesis",
    };
  }
  if (/洞察陈述|≥40|40 字/.test(m)) {
    return {
      title: "客人洞察还没点齐",
      how: "四问点选拼成一句话，不用自己凑字数。",
      anchor: "insight",
    };
  }
  return {
    title: m.replace(/^·\s*/, "").slice(0, 48),
    how: "按页面提示补这一步即可，不会写可以语音说。",
    anchor: "other",
  };
}

/** 把系统战场选项翻成老板能懂的一句话 */
export function plainBattlefieldChoice(opt: {
  label: string;
  recommended?: boolean;
  risk?: string;
}): { title: string; blurb: string; tone: "recommend" | "caution" | "reject" } {
  const l = opt.label;
  if (/场景|家庭|场合|心智位/.test(l) || opt.recommended) {
    return {
      title: "抢一个具体场景的「第一联想」",
      blurb: "例如家庭聚餐、轻聚。好打、能指导菜单，系统通常推荐这条。",
      tone: "recommend",
    };
  }
  if (/高品质|第一位|品类通用/.test(l)) {
    return {
      title: "硬打「全品类第一」",
      blurb: "听起来好听，但要跟头部硬碰，钱和心智都贵。一般不建议先走。",
      tone: "reject",
    };
  }
  if (/价格|下沉/.test(l)) {
    return {
      title: "靠更便宜抢人",
      blurb: "容易起量，但品牌难沉淀，客人换一家也便宜。",
      tone: "caution",
    };
  }
  if (/生活|无锚|泛/.test(l)) {
    return {
      title: "讲生活方式但没锚点",
      blurb: "故事好听，菜单和店员不好执行，容易空。",
      tone: "reject",
    };
  }
  return {
    title: l.slice(0, 28),
    blurb: opt.risk || "选之前想清楚：能不能天天做到。",
    tone: opt.recommended ? "recommend" : "caution",
  };
}

/** 决策理由点选模板（≥20 字，可直接提交） */
export const BATTLEFIELD_REASON_PRESETS: Array<{ label: string; text: string }> = [
  {
    label: "客人就是这类",
    text: "店里主要就是这类客人，我们的菜和人手也更配这个方向，所以选它当主战场。",
  },
  {
    label: "别的太难打",
    text: "别的方向要么跟头部硬碰、要么靠低价走量，我们打不起也沉淀不了，所以选这条。",
  },
  {
    label: "能指导菜单",
    text: "这条战场能直接指导菜单和话术，店员也能讲清楚我们是谁，所以拍板走它。",
  },
  {
    label: "和一手事实一致",
    text: "和我们刚说的周末客群、客人怕什么是对得上的，所以按这条打，不另起炉灶。",
  },
];

/** 覆盖系统推荐时的理由模板 */
export const BATTLEFIELD_OVERRIDE_PRESETS: Array<{ label: string; text: string }> = [
  {
    label: "先要现金流",
    text: "短期要现金流和起量，先用价格验证供给与复购，回头再切回场景心智主航道。",
  },
  {
    label: "资源暂时不够",
    text: "推荐方向资源暂时够不上，先走更现实的一条把店稳住，再回头加强主战场。",
  },
  {
    label: "想先试一条窄路",
    text: "我想先用更窄的打法试一个月看数据，确认供给跟得上再按系统推荐切主航道。",
  },
];

/** 开场诊断：目标点选 */
export const DISCOVERY_GOAL_PRESETS: Array<{ label: string; text: string }> = [
  {
    label: "本地心智第一",
    text: "三年内成为本地家庭/场景心智第一联想，让客人一想到就想到我们。",
  },
  {
    label: "先稳住再扩店",
    text: "先把现有店做成稳定盈利与复购，再考虑第二家或扩品。",
  },
  {
    label: "先验证招牌",
    text: "先验证招牌菜与核心场景能不能打穿，再谈品牌扩张。",
  },
];

/** 开场诊断：当下最头疼 */
export const DISCOVERY_PAIN_PRESETS: Array<{ label: string; text: string }> = [
  { label: "客流不稳", text: "店里现在最头疼是客流不稳，忙闲差太大。" },
  { label: "客单难提", text: "店里现在最头疼是客单价提不上去，加菜难。" },
  { label: "复购不够", text: "店里现在最头疼是复购不够，客人来一次不回头。" },
  { label: "对手抢人", text: "店里现在最头疼是对手在抢我们的客人。" },
  { label: "话术说不清", text: "店里现在最头疼是跟客人说不清我们到底是谁、好在哪。" },
];

/** 简报访谈：每题点选（写入答案全文，可再口述补一句） */
export const BRIEF_ANSWER_CHOICES: Record<
  string,
  Array<{ label: string; text: string }>
> = {
  ent_why: [
    {
      label: "让家人放心吃饭",
      text: "让附近家庭能放心吃到干净、可预期的家常菜，不用每次赌运气。",
    },
    {
      label: "解决日常聚餐难",
      text: "解决城里人日常聚餐难：要像样、要快、还不能踩雷。",
    },
    {
      label: "把地方味道做稳",
      text: "把地方味道做成稳定可复购的日常选择，而不只是偶尔尝鲜。",
    },
  ],
  ent_become: [
    {
      label: "本地家庭首选",
      text: "想成为本地家庭聚餐的第一联想，而不是偶尔打卡店。",
    },
    {
      label: "场景品类代表",
      text: "想成为某个用餐场景的品类代表，客人一想到场景就想到我们。",
    },
    {
      label: "口碑连锁苗子",
      text: "想先做成可复制的口碑模型，再谈多店扩张。",
    },
  ],
  ent_3y: [
    {
      label: "心智先跑赢",
      text: "三年目标：先把本地心智做穿，再谈规模扩张。",
    },
    {
      label: "盈利再扩店",
      text: "三年目标：单店稳定盈利，再开第二家验证复制。",
    },
    {
      label: "招牌打穿",
      text: "三年目标：把招牌菜和核心场景打穿，形成可传播口碑。",
    },
  ],
  cat_self: [
    { label: "家常湘菜", text: "我们认为自己属于家常湘菜 / 家庭场景餐饮。" },
    { label: "轻聚餐厅", text: "我们认为自己属于日常轻聚 / 小聚场景餐厅。" },
    { label: "地方风味馆", text: "我们认为自己属于地方风味馆，但比传统馆更干净可预期。" },
  ],
  cat_consumer: [
    { label: "当普通湘菜馆", text: "客人现在多半把我们当成普通湘菜馆或家常菜馆。" },
    { label: "当聚餐备选", text: "客人现在把我们当附近聚餐备选，但还没形成第一联想。" },
    { label: "当外卖选项", text: "客人更多把我们当外卖选项，到店心智还不强。" },
  ],
  cat_change: [
    {
      label: "从油腻到干净可预期",
      text: "想把认知从「油腻踩雷」改成「干净可预期的家常体验」。",
    },
    {
      label: "从偶尔到日常",
      text: "想把认知从「偶尔尝鲜」改成「日常就能来」的首选。",
    },
    {
      label: "从便宜到值",
      text: "想把认知从「便宜凑合」改成「安、快、好、值」。",
    },
  ],
  cus_who: [
    {
      label: "带娃家庭周末",
      text: "核心客户是带娃的城市家庭，主场景是周末堂食聚餐。",
    },
    {
      label: "年轻人小聚",
      text: "核心客户是年轻人小聚 / 约会，主场景是晚间轻聚。",
    },
    {
      label: "附近上班族",
      text: "核心客户是附近上班族，主场景是工作日晚餐和轻便请客。",
    },
  ],
  cus_choose: [
    {
      label: "干净可预期",
      text: "他们选我们是因为干净可预期，不用每次赌口味。",
    },
    {
      label: "离家近又像样",
      text: "他们选我们是因为离家近、像样，适合家庭和日常聚餐。",
    },
    {
      label: "性价比稳",
      text: "他们选我们是因为性价比稳，吃得值、不会踩雷。",
    },
  ],
  cus_leave: [
    {
      label: "口味不稳",
      text: "他们离开多半是因为口味不稳、体验忽好忽坏。",
    },
    {
      label: "等太久",
      text: "他们离开多半是因为等太久、上菜慢，时间成本高。",
    },
    {
      label: "觉得不值",
      text: "他们离开多半是因为觉得贵但不值，或被对手分流。",
    },
  ],
  cmp_who: [
    { label: "社区湘菜馆", text: "最大对手是周边社区湘菜馆 / 家常菜馆。" },
    { label: "连锁快餐", text: "最大对手是连锁快餐和标准化轻餐饮。" },
    { label: "网红打卡店", text: "最大对手是网红打卡店和话题型餐厅。" },
  ],
  cmp_win: [
    {
      label: "更干净可预期",
      text: "我们赢在更干净可预期，家庭场景体验更稳。",
    },
    {
      label: "更懂本地场景",
      text: "我们赢在更懂本地日常场景，菜单和话术更贴人。",
    },
    {
      label: "供应链更稳",
      text: "我们赢在供应链与出品更稳，复购更敢来。",
    },
  ],
  cmp_set: [
    {
      label: "馆+超+连锁",
      text: "竞争集合主要是：社区湘菜馆、超市熟食、连锁快餐。",
    },
    {
      label: "馆+网红+外卖",
      text: "竞争集合主要是：传统馆子、网红店、外卖平台头部商家。",
    },
    {
      label: "轻餐+家常+宴请",
      text: "竞争集合主要是：轻餐饮、家常菜、中端宴请店。",
    },
  ],
  fnd_edge: [
    {
      label: "人在一线懂场",
      text: "创始人/团队优势是长期在一线懂客人场景，能快速改菜单和话术。",
    },
    {
      label: "供应链把控",
      text: "创始人/团队优势是供应链与出品把控，能把味道做稳。",
    },
    {
      label: "本地关系与口碑",
      text: "创始人/团队优势是本地关系与口碑网络，获客成本更低。",
    },
  ],
  fnd_asset: [
    {
      label: "招牌菜体系",
      text: "不可复制资产是招牌菜体系和稳定出品标准。",
    },
    {
      label: "供应链",
      text: "不可复制资产是供应链与选品能力，支撑干净可预期。",
    },
    {
      label: "门店场景感",
      text: "不可复制资产是门店场景感与服务节奏，适合家庭日常。",
    },
  ],
};

/** 战略选择（为什么走这条路）点选 */
export const STRATEGIC_CHOICE_PRESETS: Array<{ label: string; text: string }> = [
  {
    label: "不跟宴请硬碰",
    text: "我们更适合打家庭/日常场景，不跟宴请和高端馆硬碰，先把能打赢的场打穿。",
  },
  {
    label: "先场景后规模",
    text: "先把一个清晰场景做成第一联想，再谈扩店和扩品，避免什么都做。",
  },
  {
    label: "资源只够打一条",
    text: "人手和预算只够打一条主航道，所以集中火力，不分散到多条故事线。",
  },
  {
    label: "跟一手事实一致",
    text: "这跟我们说的客群、怕踩的雷、对手打法是对得上的，所以按这条走。",
  },
];

/** 假设覆盖理由（复用战场覆盖口径） */
export const HYPOTHESIS_OVERRIDE_PRESETS = BATTLEFIELD_OVERRIDE_PRESETS;

/** 洞察四问：点选拼成 ≥40 字陈述 */
export type InsightGuideKey = "who" | "occasion" | "job" | "gap";

export const INSIGHT_GUIDE: Record<
  InsightGuideKey,
  { question: string; choices: Array<{ label: string; text: string }> }
> = {
  who: {
    question: "主要是哪类客人？",
    choices: [
      { label: "带娃家庭", text: "带娃的城市家庭" },
      { label: "年轻人小聚", text: "想轻聚的年轻人" },
      { label: "附近上班族", text: "附近上班族" },
      { label: "请客吃饭的人", text: "需要请客但怕踩雷的人" },
    ],
  },
  occasion: {
    question: "多半在什么场合来？",
    choices: [
      { label: "周末堂食", text: "周末堂食聚餐时" },
      { label: "工作日晚餐", text: "工作日晚餐时" },
      { label: "小聚约会", text: "小聚或约会时" },
      { label: "外卖到家", text: "想在家解决一顿像样的饭时" },
    ],
  },
  job: {
    question: "他们来，想搞定什么？",
    choices: [
      { label: "吃得放心", text: "想吃得放心、不用赌运气" },
      { label: "吃得像样又省事", text: "想吃得像样又省事" },
      { label: "快速吃好", text: "想快速吃好、别耽误事" },
      { label: "请人有面子", text: "想请人有面子又不踩雷" },
    ],
  },
  gap: {
    question: "现有选择缺什么？",
    choices: [
      { label: "怕油腻踩雷", text: "但现有湘菜馆常让人怕油腻踩雷" },
      { label: "口味不稳", text: "但现有选择口味不稳、不敢复购" },
      { label: "又贵又不值", text: "但现有选择常让人觉得贵却不值" },
      { label: "等太久", text: "但现有选择常让人等太久、体验差" },
    ],
  },
};

export const INSIGHT_UNMET_PRESETS: Array<{ label: string; text: string }> = [
  { label: "干净可预期", text: "缺少干净可预期、不用赌运气的家常体验" },
  { label: "稳定复购感", text: "缺少稳定出品带来的敢复购感" },
  { label: "日常就近像样", text: "缺少离家近又像样的日常聚餐选项" },
];

export const INSIGHT_FUNCTIONAL_PRESETS: Array<{ label: string; text: string }> = [
  { label: "吃顿放心家常", text: "吃到干净可预期的家常菜" },
  { label: "快速解决一餐", text: "快速解决一顿像样的饭" },
  { label: "全家吃得开", text: "让全家都能吃得开、少踩雷" },
];

export const INSIGHT_EMOTIONAL_PRESETS: Array<{ label: string; text: string }> = [
  { label: "踏实不焦虑", text: "吃完觉得踏实，不再为踩雷焦虑" },
  { label: "有面子又轻松", text: "请人/带家人时有面子又轻松" },
  { label: "值得再来", text: "觉得值得再来，而不是赌一把" },
];

export function composeInsightStatement(answers: {
  who: string;
  occasion: string;
  job: string;
  gap: string;
}): string {
  return `${answers.who}在${answers.occasion}，${answers.job}，${answers.gap}。`;
}

export function insightGuideComplete(answers: Partial<Record<InsightGuideKey, string>>): boolean {
  return Boolean(answers.who && answers.occasion && answers.job && answers.gap);
}

/** 定位六段中文标签（老板侧，不用英文） */
export const STATEMENT_FIELD_LABELS: Record<
  "forAudience" | "whoNeed" | "ourBrandIs" | "thatValue" | "because" | "unlike",
  string
> = {
  forAudience: "给谁",
  whoNeed: "解决什么",
  ourBrandIs: "我们是谁",
  thatValue: "核心好处",
  because: "凭什么可信",
  unlike: "跟谁不同",
};

