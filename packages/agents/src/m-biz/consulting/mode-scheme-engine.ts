/**
 * M-BIZ 四官模式方案包 — 各用各的
 * 战略 / 产品 / 财务 / 运营
 */
import type {
  AdvisorStrategyCard,
  AdvisorStrategySet,
  ResearchPack,
} from "../../consulting-os/types";
import { createId, nowIso } from "../../consulting-os/types";
import { buildConflictSummary } from "../../consulting-os/meeting";
import type { ModeScheme } from "./types";
import { resolveBizScope } from "./business-scan-engine";

function clip(s: string, n: number) {
  const t = (s || "").replace(/。$/, "").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

function priorityAxis(priority: string): "profit" | "growth" | "brand" {
  if (priority.includes("增长") || priority.includes("规模")) return "growth";
  if (priority.includes("品牌") || priority.includes("定位")) return "brand";
  return "profit";
}

function axisLabel(axis: "profit" | "growth" | "brand"): string {
  if (axis === "growth") return "增长";
  if (axis === "brand") return "品牌";
  return "利润";
}

/** 唯一可周报的北极星指标（优先 intake.northStar） */
export function resolveNorthStarMetric(
  answers: Record<string, string>,
  axis: "profit" | "growth" | "brand",
): string {
  const explicit = (answers.northStar || answers.fq_north_star || "").trim();
  if (explicit) return clip(explicit, 64);
  if (axis === "growth") {
    const signal = (answers.repeatSignal || "").trim();
    return signal
      ? clip(signal, 64)
      : "老客复购人数周环比改善";
  }
  if (axis === "brand") {
    return "客人能复述主推心智原话条数（周计）";
  }
  const unit = (answers.unitEconomics || "").trim();
  return unit ? clip(unit, 64) : "主推贡献毛利率周环比改善";
}

/** 具名并行砍清单（不是「不做三线并行」空话） */
export function killListForAxis(
  axis: "profit" | "growth" | "brand",
  answers: Record<string, string>,
): string[] {
  const blocker = (answers.copyBlocker || "").trim();
  if (axis === "profit") {
    return [
      "停拉新补贴与多场景促销会",
      "暂缓第二店/扩城讨论",
      "不做品牌大战役并行",
    ];
  }
  if (axis === "growth") {
    return [
      "停纯利润收缩菜单会议",
      "不做品牌形象大战役并行",
      blocker ? `本季不碰：${clip(blocker, 24)}` : "暂缓无关扩店动作",
    ];
  }
  return [
    "停价格战促销并行",
    "暂缓规模扩张会议",
    "不做「先铺店再定心智」",
  ];
}

export function buildModeSchemeForSeat(
  seatId: ModeScheme["seatId"],
  answers: Record<string, string>,
  research: ResearchPack,
  base?: Partial<AdvisorStrategyCard>,
): ModeScheme {
  const scope = resolveBizScope(answers);
  const axis = priorityAxis(scope.priority);
  const weak =
    research.sections.find((s) => s.title === "最弱三项")?.body ||
    research.headline;
  const metric = resolveNorthStarMetric(answers, axis);
  const killList = killListForAxis(axis, answers);
  const course = `未来 90 天只押${axisLabel(axis)}`;

  if (seatId === "strategy") {
    return {
      seatId,
      title: "战略官 · 主航道方案",
      northStar: metric,
      proofPlan: [
        `全员只盯 1 个北极星：${clip(metric, 36)}`,
        ...killList.slice(0, 2),
        `主矛盾「${clip(scope.pain, 24)}」必须被北极星对上`,
      ],
      killLine: `${clip(metric, 28)}连续 4 周无改善 → 回委员会改航道`,
      weekProof: `书面冻结唯一北极星：「${clip(metric, 36)}」`,
      sacrifice: `${course}；${killList.join("；")}`,
      scorecard: [
        { label: "优先级唯一", score: 78, note: clip(metric, 28) },
        { label: "对上主矛盾", score: 70, note: clip(scope.pain, 28) },
        { label: "注意力可守", score: scope.resource.includes("时间") ? 55 : 72, note: clip(scope.resource, 24) },
      ],
      scripts: {
        allHands: `${course}。本季只盯：${metric}`,
        weeklyReview: `周五只复盘「${clip(metric, 28)}」，不复盘「感觉忙不忙」`,
        forbidden: ["三线都要", "先铺开再取舍", "会议里并行新战役", ...killList.map((k) => `违反砍清单：${k}`)],
      },
      operatingMoves: [
        `北极星一页纸：${clip(metric, 32)}`,
        ...killList,
        "指定指标唯一负责人",
      ],
      crossFireAmmo:
        "若产品官把菜单做宽、财务官只报总营收、运营官继续靠老板盯班——战略北极星会当场作废。",
    };
  }

  if (seatId === "product") {
    return {
      seatId,
      title: "产品官 · 供给证明方案",
      northStar: `用 3 个主推品服务北极星「${clip(metric, 28)}」`,
      proofPlan: [
        "主推品占销售可统计",
        "弱化或下架与主轴冲突的引流款",
        "菜单上看得到模式，而不是堆砌",
      ],
      killLine: "主推品无法证明模式（占比/复购）→ 砍菜单宽度重做",
      weekProof: "主推三品定稿并开始单独记账",
      sacrifice: "不要用引流款稀释利润模型",
      scorecard: [
        { label: "主推清晰度", score: 74, note: "能否一眼看到三品" },
        { label: "模式可证", score: 66, note: clip(weak, 32) },
        { label: "与航道对齐", score: 70, note: clip(metric, 24) },
      ],
      scripts: {
        allHands: `客人用订单投票。本周只推三品，对齐「${clip(metric, 20)}」。`,
        weeklyReview: "看主推占比与复购，不看 SKU 总数",
        forbidden: ["菜单越全越好", "用亏损引流撑场面", "每周换一批主推"],
      },
      operatingMoves: [
        "主推三品上墙",
        "停售冲突款清单",
        "点餐话术只推主推",
      ],
      crossFireAmmo:
        "战略官的北极星若落不到可点的菜，就是口号；财务要的毛利必须由主推结构支撑。",
    };
  }

  if (seatId === "finance") {
    return {
      seatId,
      title: "财务官 · 单位经济方案",
      northStar: `先算清「${clip(metric, 28)}」与人效，再谈扩张`,
      proofPlan: [
        `周报只盯：${clip(metric, 32)}`,
        "不用总营收掩盖单店质量",
        "现金紧则缩短验证窗口",
      ],
      killLine: "账算不清或连续 4 周单位经济恶化 → 停止扩张动作",
      weekProof: `拉出「${clip(metric, 24)}」·人效·主推品表，周五复盘`,
      sacrifice: "不要用总营收掩盖单店质量",
      scorecard: [
        {
          label: "账本透明度",
          score: scope.resource.includes("现金") ? 58 : 68,
          note: clip(scope.resource, 24),
        },
        { label: "单位经济", score: 62, note: base?.proof || "需周报验证" },
        { label: "扩张纪律", score: 76, note: "未算清不扩" },
      ],
      scripts: {
        allHands: "没有单位经济数字，不讨论开第二家。",
        weeklyReview: `只开「${clip(metric, 24)}」复盘——缺数不开会`,
        forbidden: ["用感觉扩张", "只报流水", "无限延期算账"],
      },
      operatingMoves: [
        "单位经济周报模板",
        "现金跑道估算",
        "扩张闸门条款书面化",
      ],
      crossFireAmmo:
        "战略与产品可以吵故事，但通不过单位经济的模式不是模式；运营复制必须先过财务闸门。",
    };
  }

  // ops
  return {
    seatId,
    title: "运营官 · 可复制方案",
    northStar: `把服务「${clip(metric, 24)}」的关键流程写成可交接作战卡`,
    proofPlan: [
      "新人 7 天能上手主流程",
      "老板从盯班改为看指标",
      "关键岗位 SOP 一页化",
    ],
    killLine: "复制到第二点即走样 → 停止扩张，先补作战卡",
    weekProof: "关键岗位 SOP 一页化，抽查新人可独立完成主流程",
    sacrifice: "不要依赖老板盯班才能运转",
    scorecard: [
      {
        label: "可交接性",
        score: scope.pain.includes("复制") ? 50 : 72,
        note: clip(scope.pain, 28),
      },
      { label: "SOP 完整度", score: 60, note: "一页作战卡是否存在" },
      { label: "老板脱班", score: scope.resource.includes("时间") ? 48 : 65, note: "是否仍靠盯班" },
    ],
    scripts: {
      allHands: "人走事还能转。本周只补主流程作战卡。",
      weeklyReview: "抽查新人，不抽查老板是否在店",
      forbidden: ["靠老板盯班", "口头传帮带无文档", "未标准化就开第二家"],
    },
    operatingMoves: [
      "主流程作战卡",
      "新人带教清单",
      "店长交接演练",
    ],
    crossFireAmmo:
      "财务闸门通过也不等于能复制；没有作战卡，战略北极星会在第二家店失真。",
  };
}

/** 把 ModeScheme 挂到卡片上（复用 entryScheme 槽位供 UI 渲染） */
function schemeToPlaybook(scheme: ModeScheme) {
  return {
    seatId: scheme.seatId,
    title: scheme.title,
    entryMode: scheme.northStar,
    sceneCut: scheme.northStar,
    menuPilot: scheme.proofPlan,
    killLine: scheme.killLine,
    weekProof: scheme.weekProof,
    sacrifice: scheme.sacrifice,
    scorecard: scheme.scorecard,
    scripts: {
      storefront: scheme.scripts.allHands,
      staffBrief: scheme.scripts.weeklyReview,
      forbidden: scheme.scripts.forbidden,
    },
    marketingMoves: scheme.operatingMoves,
    crossFireAmmo: scheme.crossFireAmmo,
  };
}

export function attachModeSchemes(
  set: AdvisorStrategySet,
  answers: Record<string, string>,
  research: ResearchPack,
): AdvisorStrategySet {
  const strategies = set.strategies.map((card) => {
    const seat =
      card.advisorId === "product" ||
      card.advisorId === "finance" ||
      card.advisorId === "ops"
        ? (card.advisorId as ModeScheme["seatId"])
        : "strategy";
    const scheme = buildModeSchemeForSeat(seat, answers, research, card);
    const axis = priorityAxis(resolveBizScope(answers).priority);
    const courseOneLiner = `未来 90 天只押${axisLabel(axis)}：${clip(scheme.northStar, 36)}`;
    return {
      ...card,
      oneLiner:
        seat === "strategy"
          ? courseOneLiner
          : card.oneLiner || scheme.northStar,
      entryScheme: schemeToPlaybook(scheme),
      modeScheme: scheme,
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
        ({
          strategy: "战略官",
          product: "产品官",
          finance: "财务官",
          ops: "运营官",
        } as Record<string, string>)[id] || id,
    )} 交火：${crossFireSummary}`,
    gameSummary: crossFireSummary
      ? `交火 · ${crossFireSummary}`
      : "交火 · 四官互斥：主航道 / 产品证明 / 单位经济 / 可复制不能同时当主轴。",
  };
}

export function buildMbizAdvisorsWithSchemes(
  answers: Record<string, string>,
  research: ResearchPack,
): AdvisorStrategySet {
  const seats: ModeScheme["seatId"][] = [
    "strategy",
    "product",
    "finance",
    "ops",
  ];
  const strategies: AdvisorStrategyCard[] = seats.map((seatId) => {
    const scheme = buildModeSchemeForSeat(seatId, answers, research);
    return {
      advisorId: seatId,
      oneLiner: scheme.northStar,
      battlefield:
        seatId === "strategy"
          ? "战略优先级"
          : seatId === "product"
            ? "产品结构"
            : seatId === "finance"
              ? "单位经济"
              : "可复制运营",
      differentiation: scheme.title,
      proof: scheme.weekProof,
      doNotDo: scheme.sacrifice,
      risk: scheme.killLine,
      rationale:
        seatId === "strategy"
          ? "战略官：商业模式首先是取舍。"
          : seatId === "product"
            ? "产品官：客人用订单投票，不听故事。"
            : seatId === "finance"
              ? "财务官：通不过单位经济的模式不是模式。"
              : "运营官：复制靠流程，不靠情怀。",
      entryScheme: schemeToPlaybook(scheme),
      modeScheme: scheme,
      crossFireNote: scheme.crossFireAmmo,
    };
  });

  return attachModeSchemes(
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
