/**
 * M-ED 协议清单包 — 可交律师
 */
import type {
  AdvisorStrategyCard,
  AdvisorStrategySet,
  ExecutionRoadmap,
  WarRoomConsensus,
} from "../../consulting-os/types";
import { createId, nowIso } from "../../consulting-os/types";
import { buildGenericRoadmap } from "../../consulting-os/meeting";
import type { GovernanceDeliveryPack, GovernanceScheme } from "./types";

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
  capital: "资本顾问",
  founder: "创始人视角",
  risk: "风险顾问",
  govern: "治理顾问",
};

export function buildGovernanceDeliveryPack(input: {
  oneLiner: string;
  scheme?: GovernanceScheme;
  doNotDo?: string;
  seatLabel?: string;
  control?: string;
}): GovernanceDeliveryPack {
  const line = input.oneLiner || "已确认的股权治理主轴";
  const s = input.scheme;
  const controlFloor = input.control || s?.lockFirst || "控制权底线待补";
  const mustSign =
    s?.mustSign?.join(" · ") ||
    "章程 · 股东/合伙协议 · vesting 条款";
  const vestingNote =
    s?.seatId === "govern"
      ? "激励池 + 4 年归属 + 贡献挂钩"
      : "vesting / 退出 / 回购条款按主轴补齐";
  const killLine =
    s?.killLine || "关键协议 30 天未落签 → 冻结融资/扩伙";
  const counselBrief =
    s?.scripts.counselBrief ||
    `请律师按主轴「${line}」起草必须落签文件。`;
  const doNotDo = [
    input.doNotDo || s?.sacrifice || "不做口头股权承诺",
    ...(s?.scripts.forbidden || []),
  ]
    .filter(Boolean)
    .join("；");

  const wallCard = [
    `【协议清单包】`,
    `一句话：${line}`,
    `控制权底线：${controlFloor}`,
    `必须落签：${mustSign}`,
    `激励/归属：${vestingNote}`,
    `杀出：${killLine}`,
    `不做：${doNotDo.slice(0, 80)}`,
  ].join("\n");

  const markdown = [
    `# 协议清单包`,
    ``,
    `> ${input.seatLabel || "拍板席"} · 可交律师`,
    ``,
    `## 一句话`,
    line,
    ``,
    `## 控制权底线`,
    controlFloor,
    ``,
    `## 必须落签`,
    mustSign,
    ``,
    `## 激励 / vesting`,
    vestingNote,
    ``,
    `## 杀出线`,
    killLine,
    ``,
    `## 给律师的话`,
    counselBrief,
    ``,
    `## 不做`,
    doNotDo,
    ``,
    wallCard,
    ``,
  ].join("\n");

  return {
    oneLiner: line,
    controlFloor,
    mustSign,
    vestingNote,
    killLine,
    counselBrief,
    doNotDo,
    wallCard,
    markdown,
    seatLabel: input.seatLabel,
  };
}

export function buildMedExecutionRoadmap(input: {
  oneLiner: string;
  answers: Record<string, string>;
  advisors?: AdvisorStrategySet;
  warRoom?: WarRoomConsensus;
}): ExecutionRoadmap {
  const primary = resolvePrimary(input.advisors, input.warRoom);
  const scheme = primary?.governScheme?.seatId
    ? (primary.governScheme as GovernanceScheme)
    : undefined;
  const seatLabel =
    SEAT_LABEL[primary?.advisorId || ""] || primary?.advisorId || "拍板席";

  const pack = buildGovernanceDeliveryPack({
    oneLiner: input.oneLiner,
    scheme,
    doNotDo: primary?.doNotDo,
    seatLabel,
    control: input.answers.control,
  });

  const base = buildGenericRoadmap(input.oneLiner, [
    {
      weekStart: 1,
      weekEnd: 2,
      title: "冻结控制权底线",
      actions: [
        `书面确认：${pack.controlFloor.slice(0, 48)}`,
        "盘点现有口头承诺",
        `列出必须成文：${pack.mustSign}`,
      ],
      ownerHint: "创始人",
      doneWhen: "底线一页纸签字",
    },
    {
      weekStart: 3,
      weekEnd: 5,
      title: "协议与 vesting",
      actions: [
        "股东/合伙协议草稿",
        pack.vestingNote,
        "律师或顾问过目关键条款",
      ],
      ownerHint: "创始人 + 顾问",
      doneWhen: "草稿各方无重大异议",
    },
    {
      weekStart: 6,
      weekEnd: 8,
      title: "融资或激励落地",
      actions: [
        "若融资：条款清单对齐控制权",
        "若激励：核心骨干沟通并确认",
        "更新 cap table",
      ],
      ownerHint: "创始人",
      doneWhen: "cap table 与主协议一致",
    },
    {
      weekStart: 9,
      weekEnd: 12,
      title: "治理例会机制",
      actions: [
        "约定董事会/合伙人例会节奏",
        "重大事项清单进章程",
        `对照杀出线：${pack.killLine.slice(0, 40)}`,
      ],
      ownerHint: "治理负责人",
      doneWhen: "第一次正式治理会开完",
    },
  ]);

  const governancePack = {
    oneLiner: pack.oneLiner,
    doNotDo: pack.doNotDo,
    wallCard: pack.wallCard,
    markdown: pack.markdown,
    seatLabel: pack.seatLabel,
    cityScene: pack.controlFloor,
    menuPilot: pack.mustSign,
    successMetrics: pack.vestingNote,
    killLine: pack.killLine,
    staffBrief: pack.counselBrief,
  };

  return {
    ...base,
    governancePack,
    roadmapId: createId("road"),
    generatedAt: nowIso(),
  };
}
