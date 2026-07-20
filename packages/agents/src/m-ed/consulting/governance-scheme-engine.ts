/**
 * M-ED 四方治理方案包 — 各用各的
 */
import type {
  AdvisorStrategyCard,
  AdvisorStrategySet,
  ResearchPack,
} from "../../consulting-os/types";
import { createId, nowIso } from "../../consulting-os/types";
import { buildConflictSummary } from "../../consulting-os/meeting";
import type { GovernanceScheme } from "./types";
import { resolveEquityScope } from "./equity-scan-engine";

function clip(s: string, n: number) {
  const t = (s || "").replace(/。$/, "").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

function topicAxis(topic: string): "finance" | "partner" | "incentive" {
  if (topic.includes("激励") || topic.includes("骨干")) return "incentive";
  if (topic.includes("合伙") || topic.includes("公平")) return "partner";
  return "finance";
}

export function buildGovernanceSchemeForSeat(
  seatId: GovernanceScheme["seatId"],
  answers: Record<string, string>,
  _research: ResearchPack,
): GovernanceScheme {
  const scope = resolveEquityScope(answers);
  const axis = topicAxis(scope.topic);

  if (seatId === "capital") {
    return {
      seatId,
      title: "资本顾问 · 融资缓冲方案",
      lockFirst:
        axis === "finance"
          ? "本轮融资以够用缓冲为限，估值服从控制权与条款"
          : "融资节奏后置：先锁结构，再谈估值故事",
      mustSign: ["条款清单", "稀释测算表", "与控制权底线对照表"],
      killLine: "条款击穿控制权底线 → 否决本轮交易",
      weekProof: "写出条款清单与稀释测算，对照控制权底线打勾/打叉",
      sacrifice: "不要为了估值牺牲所有保护条款",
      scorecard: [
        { label: "缓冲够用", score: 70, note: "钱是工具不是目的" },
        { label: "条款可控", score: 62, note: "保护条款是否保留" },
        { label: "节奏克制", score: axis === "finance" ? 68 : 75, note: clip(scope.topic, 24) },
      ],
      scripts: {
        founderBrief: "本轮只融够跑完验证的钱，不裸奔估值。",
        counselBrief: "请律师按控制权底线审查条款，击穿即否决。",
        forbidden: ["为估值让渡最终拍板", "口头对赌", "无限轮稀释无闸门"],
      },
      nextMoves: ["条款清单", "稀释测算", "与创始人底线对表"],
      crossFireAmmo:
        "若创始人底线未锁、风险协议未补，融资只会把争议写进条款。",
    };
  }

  if (seatId === "founder") {
    return {
      seatId,
      title: "创始人视角 · 控制权底线方案",
      lockFirst: `先锁控制权底线：${scope.control}`,
      mustSign: ["章程否决事项", "董事会席位", "最终拍板条款"],
      killLine: "控制权条款被稀释突破底线 → 否决本轮交易/扩伙",
      weekProof: "控制权底线一页纸签字，列出否决事项清单",
      sacrifice: "不要口头说控股、纸上已失控",
      scorecard: [
        { label: "底线清晰", score: 80, note: clip(scope.control, 28) },
        { label: "纸面一致", score: 55, note: "章程是否已写" },
        { label: "可执行", score: 66, note: "关键事项一票否决是否可操作" },
      ],
      scripts: {
        founderBrief: `底线写死：${clip(scope.control, 36)}。没有这条，不开融资/扩伙会。`,
        counselBrief: "请将否决事项与董事会席位写入章程/股东协议。",
        forbidden: ["口头控股", "先融资后补控制权", "把拍板权交给不确定多数"],
      },
      nextMoves: ["底线一页纸", "否决事项清单", "章程修订要点"],
      crossFireAmmo:
        "资本要估值、治理要激励池，都不能击穿这条底线；否则创始人无法对结果负责。",
    };
  }

  if (seatId === "risk") {
    return {
      seatId,
      title: "风险顾问 · 协议与退出方案",
      lockFirst:
        axis === "partner"
          ? "先补合伙协议与退出机制，再谈漂亮股权故事"
          : "先补协议与退出机制，再扩伙或融资",
      mustSign: ["股东/合伙协议", "贡献与 vesting", "退出与回购条款"],
      killLine: "关键协议 30 天仍未落签 → 冻结融资/扩伙动作",
      weekProof: "盘点口头承诺，列出必须成文的协议清单并启动草稿",
      sacrifice: "不要用感情代替机制",
      scorecard: [
        { label: "协议覆盖", score: 50, note: "口头承诺风险高" },
        { label: "退出可执行", score: axis === "partner" ? 48 : 60, note: clip(scope.topic, 24) },
        { label: "争议预防", score: 72, note: "先排雷再讲故事" },
      ],
      scripts: {
        founderBrief: "没协议的合伙是定时炸弹。本周只补文件，不谈愿景。",
        counselBrief: "请优先起草退出、回购、贡献挂钩条款。",
        forbidden: ["感情合伙", "先分股后补协议", "无限期拖延落签"],
      },
      nextMoves: ["口头承诺盘点", "协议草稿", "律师过目关键条款"],
      crossFireAmmo:
        "激励池和融资条款若建立在无协议结构上，后续争议成本会指数上升。",
    };
  }

  return {
    seatId: "govern",
    title: "治理顾问 · 激励与机制方案",
    lockFirst:
      axis === "incentive"
        ? "先设激励池与 4 年 vesting，再谈融资稀释"
        : "留出激励池，把骨干绑在 4 年 vesting 上",
    mustSign: ["激励池比例", "4 年归属节奏", "贡献挂钩规则"],
    killLine: "激励池与贡献脱钩引发核心人出走风险 → 重开治理会",
    weekProof: "激励池比例与归属节奏草案，与核心骨干预沟通",
    sacrifice: "不要一次性发死，没有贡献挂钩",
    scorecard: [
      { label: "池子预留", score: 64, note: clip(scope.team, 24) },
      { label: "归属节奏", score: 70, note: "4 年 vesting 为默认" },
      { label: "贡献挂钩", score: 58, note: "避免拍脑袋发股" },
    ],
    scripts: {
      founderBrief: "人留得住，事才做得长。激励要跟贡献走。",
      counselBrief: "请起草期权/股权池与归属条款，避免一次性发死。",
      forbidden: ["一次性发死", "无贡献挂钩", "池子过小逼走骨干"],
    },
    nextMoves: ["池子比例草案", "归属节奏", "骨干沟通纪要"],
    crossFireAmmo:
      "控制权底线与协议清单是前置；激励池是留人工具，不能用来掩盖结构漏洞。",
  };
}

function schemeToPlaybook(scheme: GovernanceScheme) {
  return {
    seatId: scheme.seatId,
    title: scheme.title,
    entryMode: scheme.lockFirst,
    sceneCut: scheme.lockFirst,
    menuPilot: scheme.mustSign,
    killLine: scheme.killLine,
    weekProof: scheme.weekProof,
    sacrifice: scheme.sacrifice,
    scorecard: scheme.scorecard,
    scripts: {
      storefront: scheme.scripts.founderBrief,
      staffBrief: scheme.scripts.counselBrief,
      forbidden: scheme.scripts.forbidden,
    },
    marketingMoves: scheme.nextMoves,
    crossFireAmmo: scheme.crossFireAmmo,
  };
}

export function attachGovernanceSchemes(
  set: AdvisorStrategySet,
  answers: Record<string, string>,
  research: ResearchPack,
): AdvisorStrategySet {
  const strategies = set.strategies.map((card) => {
    const seat =
      card.advisorId === "founder" ||
      card.advisorId === "risk" ||
      card.advisorId === "govern"
        ? (card.advisorId as GovernanceScheme["seatId"])
        : "capital";
    const scheme = buildGovernanceSchemeForSeat(seat, answers, research);
    return {
      ...card,
      oneLiner: card.oneLiner || scheme.lockFirst,
      entryScheme: schemeToPlaybook(scheme),
      governScheme: scheme,
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
          capital: "资本顾问",
          founder: "创始人视角",
          risk: "风险顾问",
          govern: "治理顾问",
        } as Record<string, string>)[id] || id,
    )} 交火：${crossFireSummary}`,
    gameSummary: crossFireSummary
      ? `交火 · ${crossFireSummary}`
      : "交火 · 四方互斥：融资缓冲 / 控制权 / 协议退出 / 激励池，先锁一条。",
  };
}

export function buildMedAdvisorsWithSchemes(
  answers: Record<string, string>,
  research: ResearchPack,
): AdvisorStrategySet {
  const seats: GovernanceScheme["seatId"][] = [
    "capital",
    "founder",
    "risk",
    "govern",
  ];
  const strategies: AdvisorStrategyCard[] = seats.map((seatId) => {
    const scheme = buildGovernanceSchemeForSeat(seatId, answers, research);
    return {
      advisorId: seatId,
      oneLiner: scheme.lockFirst,
      battlefield:
        seatId === "capital"
          ? "融资结构"
          : seatId === "founder"
            ? "控制权"
            : seatId === "risk"
              ? "争议预防"
              : "激励治理",
      differentiation: scheme.title,
      proof: scheme.weekProof,
      doNotDo: scheme.sacrifice,
      risk: scheme.killLine,
      rationale:
        seatId === "capital"
          ? "资本顾问：钱是工具，不是目的。"
          : seatId === "founder"
            ? "创始人视角：你还得能带着团队跑。"
            : seatId === "risk"
              ? "风险顾问：股权纠纷专杀餐饮创业公司。"
              : "治理顾问：机制比口号更能留人。",
      entryScheme: schemeToPlaybook(scheme),
      governScheme: scheme,
      crossFireNote: scheme.crossFireAmmo,
    };
  });

  return attachGovernanceSchemes(
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
