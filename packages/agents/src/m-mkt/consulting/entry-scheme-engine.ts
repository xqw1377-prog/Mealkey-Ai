/**
 * M-MKT 三席进入方案包 — 各用各的（对标 master-scheme-engine）
 * - 战略：值不值得进 / 场景切口
 * - 经营：店里打不打得动 / 菜单与班次
 * - 投资：多久验证 / 杀出线
 */
import type {
  AdvisorStrategyCard,
  AdvisorStrategySet,
  ResearchPack,
} from "../../consulting-os/types";
import { createId, nowIso } from "../../consulting-os/types";
import { buildConflictSummary } from "../../consulting-os/meeting";
import type { EntryScheme } from "./types";
import { resolveScanScope } from "./market-scan-engine";

function clip(s: string, n: number) {
  const t = (s || "").replace(/。$/, "").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

function intentAxis(intent: string): "enter" | "cut" | "fight" {
  if (intent.includes("切")) return "cut";
  if (intent.includes("打") || intent.includes("竞争")) return "fight";
  return "enter";
}

/** 真实场景切口：优先 intake，禁止落到「场合主推 A/B/C」类空话 */
export function resolveSceneCut(
  answers: Record<string, string>,
  gap: string,
): string {
  const scene = (answers.scene || answers.fq_scene || "").trim();
  const who = (answers.targetCustomer || "").trim();
  if (scene && who) return clip(`${who} · ${scene}`, 72);
  if (scene) return clip(scene, 72);
  if (who) return clip(`${who}主场场合`, 72);
  const g = (gap || "").trim();
  if (g && !/高频场景切口|优先打一个|场合主推/.test(g)) return clip(g, 72);
  return "单一可验证场景切口";
}

function buildMenuPilot(input: {
  category: string;
  sceneCut: string;
  ticketBand?: string;
  rivals?: string;
  seatId: EntryScheme["seatId"];
}): string[] {
  const cat = input.category || "品类";
  const scene = clip(input.sceneCut, 18);
  const ticket = (input.ticketBand || "").trim();
  const rival = (input.rivals || "")
    .split(/[,，、／/]/)
    .map((x) => x.trim())
    .find(Boolean);

  if (input.seatId === "ops") {
    return [
      `${cat}·${scene}主推三品（可培训可排班）`,
      ticket ? `${ticket}档可复购套餐` : `证明复购的${cat}套餐`,
      "去掉依赖明星主厨、与切口无关的宽菜单",
    ];
  }
  if (input.seatId === "invest") {
    return [
      "试点只开 1 点，不扩第二点",
      `${scene}切口看板：复购 / 客单 / 好评原话`,
      rival ? `对标避开：${clip(rival, 22)}` : "未达标不扩第二点",
    ];
  }
  return [
    `${cat}·${scene}场合主推`,
    ticket ? `${ticket}可复购套餐` : `证明复购的${cat}套餐`,
    rival ? `对标避开：${clip(rival, 22)}` : `可传播的${cat}招牌一口价`,
  ];
}

export function buildEntrySchemeForSeat(
  seatId: EntryScheme["seatId"],
  answers: Record<string, string>,
  research: ResearchPack,
  base?: Partial<AdvisorStrategyCard>,
): EntryScheme {
  const scope = resolveScanScope(answers, {
    city: research.scope?.city,
  });
  const axis = intentAxis(scope.intent);
  const gap =
    research.sections.find((s) => s.title.includes("缺口") || s.title.includes("切口"))
      ?.body || research.headline;
  const constraint = scope.constraint;
  const sceneCut = resolveSceneCut(answers, gap);
  const menuPilot = buildMenuPilot({
    category: scope.category,
    sceneCut,
    ticketBand: scope.ticketBand || answers.ticketBand,
    rivals: scope.rivals || answers.rivals,
    seatId,
  });
  const killFromAnswers = (scope.killLine || answers.killLine || "").trim();

  if (seatId === "strategy") {
    const entryMode =
      axis === "fight"
        ? `先占「${clip(sceneCut, 20)}」差异化空位再进${scope.city}，不跟头部打价格`
        : axis === "cut"
          ? `以「${clip(sceneCut, 20)}」单一场景切入${scope.city}，不做全品类硬刚`
          : `有清晰场景空位才进${scope.city}；空位不清则不进（切口：${clip(sceneCut, 18)}）`;
    return {
      seatId,
      title: "市场战略进入方案",
      entryMode,
      sceneCut,
      menuPilot,
      killLine:
        killFromAnswers ||
        `试点 8 周「${clip(sceneCut, 16)}」主推复购无提升 → 换切口或止损`,
      weekProof: `本周写出《进入作战卡》：${scope.city}/${clip(sceneCut, 16)}/主推三品/成功指标`,
      sacrifice: "放弃同时喊多场景、多客群、多价格带",
      scorecard: [
        { label: "空位清晰度", score: axis === "enter" ? 72 : 78, note: "场景是否可一句话说清" },
        { label: "竞争可绕开", score: axis === "fight" ? 70 : 65, note: "是否避开头部主战场" },
        { label: "可传播性", score: 74, note: "客人能不能复述给谁、什么场合" },
      ],
      scripts: {
        storefront: `门头/橱窗只打一个场合：${clip(sceneCut, 24)}`,
        staffBrief: `进店只问「${clip(sceneCut, 20)}」场合，不先堆菜单。我们是为这个切口来的。`,
        forbidden: ["更好吃更便宜更全", "全品类都强", "先铺开再想定位", "用字母占位当主推名"],
      },
      marketingMoves: [
        "一页进入作战卡对内对齐",
        `点评标题只写「${clip(sceneCut, 16)}」+主推，不写「家常菜大全」`,
        "本周只投一个场景内容测试",
      ],
      crossFireAmmo: `若经营席把菜单做宽，战略空位会糊掉；若投资席拖验证窗口，现金会先死。`,
    };
  }

  if (seatId === "ops") {
    return {
      seatId,
      title: "餐饮经营兑现方案",
      entryMode: `按门店可兑现能力设计「${clip(sceneCut, 18)}」试点（约束：${clip(constraint, 20)}）`,
      sceneCut: base?.battlefield && !/门店运营可交付|验证节奏/.test(base.battlefield)
        ? clip(base.battlefield, 72)
        : sceneCut,
      menuPilot,
      killLine:
        killFromAnswers ||
        "人效/毛利连续 4 周不达门槛 → 停止放量，收窄菜单",
      weekProof: `试点店张贴「${clip(sceneCut, 16)}」主推三品与班次表；店员能讲清给谁、解决什么`,
      sacrifice: "不做依赖明星主厨、不做过宽菜单",
      scorecard: [
        { label: "可培训性", score: 76, note: "新人能否一周上手主推" },
        { label: "人效可扛", score: constraint.includes("人手") ? 62 : 70, note: clip(constraint, 28) },
        { label: "复购可统计", score: 68, note: "主推品能否单独记账" },
      ],
      scripts: {
        storefront: `柜面只露出「${clip(sceneCut, 16)}」试点主推，不摆满「今日推荐」墙`,
        staffBrief: `开口：今天是「${clip(sceneCut, 18)}」吗？然后推对应主推三品，不推销全菜单。`,
        forbidden: ["什么都能做", "先上齐再看卖什么", "靠老板盯班"],
      },
      marketingMoves: [
        "主推三品 SOP 一页化",
        "抽检店员话术",
        "收集 20 条客人原话",
      ],
      crossFireAmmo: `战略切口再漂亮，店里兑现不了就作废；投资席的放量指标必须以人效为前置。`,
    };
  }

  // invest
  return {
    seatId,
    title: "投资增长验证方案",
    entryMode: `90 天验证「${clip(sceneCut, 18)}」：复购与客单达标才放量，未达标即杀出`,
    sceneCut,
    menuPilot,
    killLine:
      killFromAnswers ||
      "验证窗口拖过 90 天仍无单位经济证据 → 停止该切口",
    weekProof: `定义杀出线数字（复购/客单/好评原话）写进「${clip(sceneCut, 16)}」作战卡`,
    sacrifice: "未验证就多点铺开；为了估值故事硬撑扩张",
    scorecard: [
      { label: "单位经济可证", score: 64, note: "毛利与人效是否先算清" },
      { label: "验证窗口", score: constraint.includes("时间") ? 58 : 72, note: clip(constraint, 28) },
      { label: "杀出纪律", score: 80, note: "未达标是否真停手" },
    ],
    scripts: {
      storefront: "不对外喊「即将开第二家」直到杀出线通过",
      staffBrief: `对内只讲「${clip(sceneCut, 16)}」验证指标，不讲融资故事。`,
      forbidden: ["先铺开再算账", "用总营收掩盖单店质量", "无限延期验证"],
    },
    marketingMoves: [
      "试点指标周报",
      "第 8 周中期复核会",
      "第 12 周放量/止损决议",
    ],
    crossFireAmmo: `战略与经营可以吵切口，但没有杀出线的进入不是投资，是赌博。`,
  };
}

export function attachEntrySchemes(
  set: AdvisorStrategySet,
  answers: Record<string, string>,
  research: ResearchPack,
): AdvisorStrategySet {
  const strategies = set.strategies.map((card) => {
    const seat =
      card.advisorId === "ops" || card.advisorId === "invest"
        ? card.advisorId
        : "strategy";
    const scheme = buildEntrySchemeForSeat(seat, answers, research, card);
    return {
      ...card,
      oneLiner: card.oneLiner || scheme.entryMode,
      entryScheme: scheme,
      crossFireNote: scheme.crossFireAmmo,
    } satisfies AdvisorStrategyCard;
  });

  const crossFireSummary = strategies
    .map((s) => s.crossFireNote)
    .filter(Boolean)
    .slice(0, 3)
    .join(" ");

  return {
    ...set,
    strategies,
    conflictSummary: `${buildConflictSummary(
      strategies,
      (id) =>
        ({ strategy: "市场战略", ops: "餐饮经营", invest: "投资增长" } as Record<
          string,
          string
        >)[id] || id,
    )} 交火：${crossFireSummary}`,
    gameSummary:
      crossFireSummary
        ? `交火 · ${crossFireSummary}`
        : "交火 · 三席互斥：空位 / 兑现 / 杀出线不能同时当主航道。",
  };
}

/** 从调研直接生成带方案包的顾问集（blueprint / 灾难回退） */
export function buildMmktAdvisorsWithSchemes(
  answers: Record<string, string>,
  research: ResearchPack,
): AdvisorStrategySet {
  const seats: EntryScheme["seatId"][] = ["strategy", "ops", "invest"];
  const strategies: AdvisorStrategyCard[] = seats.map((seatId) => {
    const scheme = buildEntrySchemeForSeat(seatId, answers, research);
    return {
      advisorId: seatId,
      oneLiner: scheme.entryMode,
      battlefield: scheme.sceneCut,
      differentiation: scheme.title,
      proof: scheme.weekProof,
      doNotDo: scheme.sacrifice,
      risk: scheme.killLine,
      rationale:
        seatId === "strategy"
          ? "市场战略专家：值不值得进，取决于能否占住清晰空位。"
          : seatId === "ops"
            ? "餐饮经营专家：机会要落到店里每天能做的事。"
            : "投资增长专家：进入是投资决策，必须有杀出线。",
      entryScheme: scheme,
      crossFireNote: scheme.crossFireAmmo,
    };
  });

  return attachEntrySchemes(
    {
      setId: createId("adv"),
      status: "ready",
      strategies,
      conflictSummary: "",
      generatedAt: nowIso(),
    },
    answers,
    research,
  );
}
