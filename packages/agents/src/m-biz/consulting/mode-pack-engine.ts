/**
 * M-BIZ 模式作战卡 — 对标 StaffDeliveryPack / EntryDeliveryPack
 */
import type {
  AdvisorStrategyCard,
  AdvisorStrategySet,
  ExecutionRoadmap,
  WarRoomConsensus,
} from "../../consulting-os/types";
import { createId, nowIso } from "../../consulting-os/types";
import { buildGenericRoadmap } from "../../consulting-os/meeting";
import type { ModeDeliveryPack, ModeScheme } from "./types";

function resolvePrimary(
  advisors: AdvisorStrategySet | undefined,
  war: WarRoomConsensus | undefined,
): AdvisorStrategyCard | undefined {
  if (!advisors?.strategies?.length) return undefined;
  const pref = war?.userPreference;
  if (pref && pref !== "blend") {
    return (
      advisors.strategies.find((s) => s.advisorId === pref) ||
      advisors.strategies[0]
    );
  }
  return advisors.strategies[0];
}

const SEAT_LABEL: Record<string, string> = {
  strategy: "战略官",
  product: "产品官",
  finance: "财务官",
  ops: "运营官",
};

function extractKillList(scheme?: ModeScheme): string[] {
  if (!scheme) return [];
  const fromMoves = (scheme.operatingMoves || []).filter((m) =>
    /停|砍|暂缓|不做|不碰/.test(m),
  );
  if (fromMoves.length >= 2) return fromMoves.slice(0, 3);
  const fromProof = (scheme.proofPlan || []).filter((m) =>
    /停|砍|暂缓|不做|不碰/.test(m),
  );
  return [...fromMoves, ...fromProof].slice(0, 3);
}

export function buildModeDeliveryPack(input: {
  oneLiner: string;
  scheme?: ModeScheme;
  doNotDo?: string;
  seatLabel?: string;
  answers?: Record<string, string>;
}): ModeDeliveryPack {
  const line = input.oneLiner || "已确认的商业主航道";
  const s = input.scheme;
  const answers = input.answers || {};
  const northStar =
    (answers.northStar || answers.fq_north_star || "").trim() ||
    s?.northStar ||
    line;
  const killList = extractKillList(s);
  const weeklyMetrics = `只盯：${northStar}`;
  const killLine =
    s?.killLine || `${northStar.slice(0, 28)}连续 4 周无改善 → 回委员会改航道`;
  const staffBrief =
    s?.scripts.weeklyReview ||
    `周五只复盘「${northStar}」，不复盘感觉忙不忙。`;
  const killLineText =
    killList.length > 0
      ? killList.join("；")
      : input.doNotDo || s?.sacrifice || "不做三线并行";
  const doNotDo = [
    killLineText,
    ...(s?.scripts.forbidden || []).filter((f) => !f.startsWith("违反砍清单")),
  ]
    .filter(Boolean)
    .join("；");

  const wallCard = [
    `【模式作战卡】`,
    `一句话：${line}`,
    `北极星：${northStar}`,
    `周报：${weeklyMetrics}`,
    `砍清单：${killLineText}`,
    `杀出：${killLine}`,
    `不做：${doNotDo.slice(0, 96)}`,
  ].join("\n");

  const markdown = [
    `# 模式作战卡`,
    ``,
    `> ${input.seatLabel || "拍板席"} · 可贴周会`,
    ``,
    `## 一句话`,
    line,
    ``,
    `## 北极星（唯一）`,
    northStar,
    ``,
    `## 周报指标`,
    weeklyMetrics,
    ``,
    `## 砍清单（并行停手）`,
    killLineText,
    ``,
    `## 杀出线`,
    killLine,
    ``,
    `## 周会纪律`,
    staffBrief,
    ``,
    `## 不做`,
    doNotDo,
    ``,
    wallCard,
    ``,
  ].join("\n");

  return {
    oneLiner: line,
    northStar,
    weeklyMetrics,
    killLine,
    staffBrief,
    doNotDo,
    wallCard,
    markdown,
    seatLabel: input.seatLabel,
  };
}

export function buildMbizExecutionRoadmap(input: {
  oneLiner: string;
  answers: Record<string, string>;
  advisors?: AdvisorStrategySet;
  warRoom?: WarRoomConsensus;
}): ExecutionRoadmap {
  const primary = resolvePrimary(input.advisors, input.warRoom);
  const scheme = primary?.modeScheme?.seatId
    ? (primary.modeScheme as ModeScheme)
    : undefined;
  const seatLabel =
    SEAT_LABEL[primary?.advisorId || ""] || primary?.advisorId || "拍板席";

  const pack = buildModeDeliveryPack({
    oneLiner: input.oneLiner,
    scheme,
    doNotDo: primary?.doNotDo,
    seatLabel,
    answers: input.answers,
  });

  const killBits = extractKillList(scheme);

  const base = buildGenericRoadmap(input.oneLiner, [
    {
      weekStart: 1,
      weekEnd: 2,
      title: "冻结主航道与作战卡",
      actions: [
        `书面确认：${pack.oneLiner}`,
        `冻结指标：${pack.northStar}`,
        ...(killBits.length
          ? [`本周停：${killBits.join("；")}`]
          : ["砍掉与主航道冲突的周会主题"]),
        `作战卡上墙：${pack.northStar.slice(0, 40)}`,
        "指定一个指标负责人",
      ],
      ownerHint: "老板",
      doneWhen: "全员能说出唯一北极星，作战卡上墙",
    },
    {
      weekStart: 3,
      weekEnd: 5,
      title: "产品与成本对齐",
      actions: [
        ...(scheme?.proofPlan || ["主推品结构定稿"]).slice(0, 2),
        `周报只盯：${pack.northStar}`,
        "停掉明显亏钱的动作",
      ],
      ownerHint: "产品 + 财务",
      doneWhen: "连续 2 周数据可复盘",
    },
    {
      weekStart: 6,
      weekEnd: 8,
      title: "流程作战卡",
      actions: [
        "关键岗位 SOP 一页化",
        "新人带教清单",
        "老板从盯班改为看指标",
      ],
      ownerHint: "运营",
      doneWhen: "抽查新人可独立完成主流程",
    },
    {
      weekStart: 9,
      weekEnd: 12,
      title: "验证与下一步",
      actions: [
        `对照杀出线：${pack.killLine.slice(0, 48)}`,
        "通：准备复制或融资材料",
        "不通：回委员会改航道",
      ],
      ownerHint: "老板",
      doneWhen: "验证报告签字",
    },
  ]);

  const modePack = {
    oneLiner: pack.oneLiner,
    doNotDo: pack.doNotDo,
    wallCard: pack.wallCard,
    markdown: pack.markdown,
    seatLabel: pack.seatLabel,
    successMetrics: pack.weeklyMetrics,
    killLine: pack.killLine,
    staffBrief: pack.staffBrief,
    cityScene: pack.northStar,
    menuPilot: scheme?.proofPlan?.slice(0, 3).join("；"),
  };

  return {
    ...base,
    modePack,
    roadmapId: createId("road"),
    generatedAt: nowIso(),
  };
}
