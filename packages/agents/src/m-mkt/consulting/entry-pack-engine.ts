/**
 * M-MKT 进入作战卡 — 对标 M-PNT StaffDeliveryPack
 * 可贴试点店：一句话 · 主推 · 指标 · 杀出线 · 店员简报
 */
import type {
  AdvisorStrategyCard,
  AdvisorStrategySet,
  ExecutionRoadmap,
  WarRoomConsensus,
} from "../../consulting-os/types";
import { createId, nowIso } from "../../consulting-os/types";
import { buildGenericRoadmap } from "../../consulting-os/meeting";
import type { EntryDeliveryPack, EntryScheme } from "./types";

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

function clip(s: string, n: number) {
  const t = (s || "").replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

export function buildEntryDeliveryPack(input: {
  oneLiner: string;
  scheme?: EntryScheme;
  doNotDo?: string;
  seatLabel?: string;
  city?: string;
  answers?: Record<string, string>;
}): EntryDeliveryPack {
  const line = input.oneLiner || "已确认的市场进入主轴";
  const s = input.scheme;
  const answers = input.answers || {};
  const city = input.city || answers.city || "目标城市";
  const sceneHint = (
    answers.scene ||
    answers.fq_scene ||
    answers.targetCustomer ||
    s?.sceneCut ||
    "单一场景切口"
  ).trim();
  const cityScene = `${city} · ${s?.sceneCut || sceneHint}`;
  const menuPilot = s?.menuPilot?.slice(0, 3).join("；") || "主推三品待定";
  const successMetrics = (
    answers.killLine ||
    answers.fq_proof ||
    s?.killLine ||
    ""
  ).trim()
    ? clip(
        answers.killLine || answers.fq_proof || s?.killLine || "",
        72,
      )
    : "复购提升 · 客单达标 · 收集好评原话（各写清数字）";
  const killLine = s?.killLine || "试点未达指标 → 止损换切口，不扩第二点";
  const staffBrief =
    s?.scripts.staffBrief ||
    `开口问「${clip(sceneHint, 18)}」场合，只推主轴「${line}」，不推销全菜单。`;
  const doNotDo = [
    input.doNotDo || s?.sacrifice || "不做多场景并行",
    ...(s?.scripts.forbidden || []),
  ]
    .filter(Boolean)
    .join("；");

  const wallCard = [
    `【进入作战卡】`,
    `一句话：${line}`,
    `战场：${cityScene}`,
    `主推：${menuPilot}`,
    `指标：${successMetrics}`,
    `杀出：${killLine}`,
    `不做：${doNotDo.slice(0, 96)}`,
  ].join("\n");

  const markdown = [
    `# 进入作战卡`,
    ``,
    `> ${input.seatLabel || "拍板席"} · 可贴试点店`,
    ``,
    `## 一句话`,
    line,
    ``,
    `## 城市 / 场景`,
    cityScene,
    ``,
    `## 主推品`,
    menuPilot,
    ``,
    `## 成功指标`,
    successMetrics,
    ``,
    `## 杀出线`,
    killLine,
    ``,
    `## 店员简报`,
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
    cityScene,
    menuPilot,
    successMetrics,
    killLine,
    staffBrief,
    doNotDo,
    wallCard,
    markdown,
    seatLabel: input.seatLabel,
  };
}

export function buildMmktExecutionRoadmap(input: {
  oneLiner: string;
  answers: Record<string, string>;
  advisors?: AdvisorStrategySet;
  warRoom?: WarRoomConsensus;
}): ExecutionRoadmap {
  const primary = resolvePrimary(input.advisors, input.warRoom);
  const scheme = primary?.entryScheme?.seatId
    ? (primary.entryScheme as EntryScheme)
    : undefined;
  const seatLabel =
    primary?.advisorId === "ops"
      ? "餐饮经营"
      : primary?.advisorId === "invest"
        ? "投资增长"
        : "市场战略";

  const pack = buildEntryDeliveryPack({
    oneLiner: input.oneLiner,
    scheme,
    doNotDo: primary?.doNotDo,
    seatLabel,
    city: input.answers.city,
    answers: input.answers,
  });

  const base = buildGenericRoadmap(input.oneLiner, [
    {
      weekStart: 1,
      weekEnd: 2,
      title: "锁定试点场景与作战卡",
      actions: [
        `把会议共识写成《进入作战卡》：${pack.oneLiner}`,
        `战场锁定：${pack.cityScene}`,
        "选定 1 个门店/档口做试点",
        `定义杀出线：${pack.killLine.slice(0, 48)}`,
        pack.staffBrief.slice(0, 60),
      ],
      ownerHint: "老板 + 运营",
      doneWhen: "作战卡上墙，试点店确认，店员抽检能说清主轴",
    },
    {
      weekStart: 3,
      weekEnd: 5,
      title: "试点供给与话术",
      actions: [
        `主推：${pack.menuPilot}`,
        "店员只讲场合与主推，不推销全菜单",
        "收集 20 条客人反馈原话",
        ...(scheme?.marketingMoves || []).slice(0, 1),
      ],
      ownerHint: "店长",
      doneWhen: "主推品可统计，话术抽查通过",
    },
    {
      weekStart: 6,
      weekEnd: 8,
      title: "验证单位经济",
      actions: [
        "复盘毛利与人效",
        "对照杀出线做中期判断",
        "未达标则收窄场景，不扩店",
      ],
      ownerHint: "财务 + 老板",
      doneWhen: "写出放量/止损中期结论",
    },
    {
      weekStart: 9,
      weekEnd: 12,
      title: "放量或止损",
      actions: [
        "通过则复制作战卡到第二点",
        "未通过则停止该切口，回会议重切",
        "若进入品牌定位置线，交接 M-PNT",
      ],
      ownerHint: "老板",
      doneWhen: "放量/止损决策会议开完并签字",
    },
  ]);

  return {
    ...base,
    entryPack: pack,
    roadmapId: createId("road"),
    generatedAt: nowIso(),
  };
}
