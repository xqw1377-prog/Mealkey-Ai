/**
 * 步 6：定位执行路径 — 对齐决策卡/证明计划的 90 天节点 + 店员交付包
 */
import type {
  AdvisorId,
  AdvisorStrategyCard,
  AdvisorStrategySet,
  ExecutionMilestone,
  ExecutionRoadmap,
  FounderDecisionCard,
  FounderDecisionOption,
  StaffDeliveryPack,
  WarRoomConsensus,
} from "./journey-types";
import { ADVISOR_META } from "./journey-types";
import { ensureProofPlan } from "./strategy-meeting-engine";

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export function resolvePrimaryStrategy(
  advisors: AdvisorStrategySet | null | undefined,
  war: WarRoomConsensus | null | undefined,
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

export function resolveDecisionOption(
  war: WarRoomConsensus | null | undefined,
  primary?: AdvisorStrategyCard,
): FounderDecisionOption | undefined {
  const card = war?.decisionCard;
  if (!card?.options?.length) return undefined;
  const id = (primary?.advisorId ||
    (war?.userPreference !== "blend" ? war?.userPreference : undefined)) as
    | AdvisorId
    | undefined;
  if (id) {
    return card.options.find((o) => o.advisorId === id) || card.options[0];
  }
  return card.options[0];
}

/** 店员可念交付包 — 一句话 + 迎客脚本 + 不做清单 */
export function buildStaffDeliveryPack(input: {
  oneLiner: string;
  proofPlan?: { menu: string; script: string; scene: string };
  doNotDo?: string;
  sacrifice?: string;
  forWhom?: string;
  seatName?: string;
  /** 拍板席大师话术（优先） */
  masterScripts?: {
    greeting: string;
    counter: string;
    storefront: string;
    forbidden: string[];
  };
}): StaffDeliveryPack {
  const line = input.oneLiner || "已确认的品牌定位";
  const proof = input.proofPlan || {
    menu: "主推服务定位",
    script: `只讲「${line}」`,
    scene: "进店可见定位词",
  };
  const who = input.forWhom || "目标客人";
  const ms = input.masterScripts;
  const greetScript = ms
    ? [
        `迎客（开口第一句）：${ms.greeting}`,
        `点餐台：${ms.counter}`,
        `门头对齐：${ms.storefront}`,
        `定位句（客人追问时）：我们是——${line}`,
        `证明句：菜单上您会看到——${proof.menu}`,
        `场景句：${proof.scene}`,
      ].join("\n")
    : [
        `迎客（开口第一句）：欢迎光临。请问今天是什么场合？我们专门帮${who}把「关键一顿」做稳。`,
        `定位句（客人追问时）：我们不是大而全，我们是——${line}`,
        `证明句：菜单上您会看到——${proof.menu}`,
        `场景句：${proof.scene}`,
      ].join("\n");

  const doNotSay = [
    input.doNotDo || "不讲第二卖点、不承诺什么都好",
    ...(ms?.forbidden || []),
    "禁止：更好吃/更便宜/更全（没有差异）",
    "禁止：同时推高端+性价比+网红三条线",
  ]
    .filter(Boolean)
    .join("；");

  const wallCard = [
    `【墙上作战卡】`,
    `一句话：${line}`,
    ms?.greeting
      ? `迎客第一句：${ms.greeting}`
      : `迎客只问场合，不先问「吃点啥」。`,
    ms?.counter ? `点餐台：${ms.counter}` : "",
    ms?.storefront ? `门头对齐：${ms.storefront}` : "",
    `本周证明：${proof.menu}`,
    `不做：${(input.doNotDo || "不另起第二主卖点").slice(0, 80)}`,
    input.sacrifice ? `牺牲：${input.sacrifice.slice(0, 80)}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    oneLiner: line,
    greetScript,
    doNotSay,
    wallCard,
    menuProof: proof.menu,
    sceneProof: proof.scene,
    seatLabel: input.seatName,
    markdown: [
      `# 店员交付包 · 一页纸`,
      ``,
      `## 一句话（必须背会）`,
      ``,
      `> **${line}**`,
      ``,
      `## 迎客脚本`,
      ``,
      greetScript
        .split("\n")
        .map((l) => `- ${l}`)
        .join("\n"),
      ``,
      `## 不做清单（说错即违规）`,
      ``,
      `- ${doNotSay}`,
      ``,
      `## 墙上作战卡`,
      ``,
      "```",
      wallCard,
      "```",
      ``,
    ].join("\n"),
  };
}

export function buildExecutionRoadmap(input: {
  positioningOneLiner: string;
  battlefield?: string;
  forWhom?: string;
  proofPlan?: { menu: string; script: string; scene: string };
  doNotDo?: string;
  sacrifice?: string;
  decisionOption?: Pick<
    FounderDecisionOption,
    "thisWeekProof" | "ifChoose" | "sacrifice" | "seatName"
  >;
  decisionCard?: FounderDecisionCard | null;
  primaryStrategy?: AdvisorStrategyCard | null;
}): ExecutionRoadmap {
  const primary = input.primaryStrategy;
  const proof = input.proofPlan ||
    (primary ? ensureProofPlan(primary) : undefined) || {
      menu: `主推 3 个菜证明「${input.battlefield || "主战场"}」`,
      script: `只讲「${input.positioningOneLiner}」`,
      scene: `进店可见「${input.battlefield || "定位词"}」`,
    };

  const line =
    input.positioningOneLiner ||
    primary?.oneLiner ||
    "已确认的品牌定位";
  const space = input.battlefield || primary?.battlefield || "主战场";
  const who = input.forWhom || primary?.forWhom || "目标客人";
  const doNotDo = input.doNotDo || primary?.doNotDo || "不另起第二套主卖点";
  const sacrifice =
    input.sacrifice ||
    input.decisionOption?.sacrifice ||
    primary?.sacrifice ||
    "放弃多卖点同时喊";
  const weekProof =
    input.decisionOption?.thisWeekProof ||
    `菜单：${proof.menu}；话术：${proof.script}`;
  const ifChoose =
    input.decisionOption?.ifChoose ||
    `资源押「${space}」；本周只验这一套证明。`;

  const seatName =
    input.decisionOption?.seatName ||
    (primary ? ADVISOR_META[primary.advisorId].name : undefined);

  const ms = primary?.masterScheme?.scripts;
  const staffDelivery = buildStaffDeliveryPack({
    oneLiner: line,
    proofPlan: proof,
    doNotDo,
    sacrifice,
    forWhom: who,
    seatName,
    masterScripts: ms
      ? {
          greeting: ms.greeting,
          counter: ms.counter,
          storefront: ms.storefront,
          forbidden: ms.forbidden,
        }
      : undefined,
  });

  const milestones: ExecutionMilestone[] = [
    {
      milestoneId: createId("ms"),
      weekStart: 1,
      weekEnd: 2,
      title: "对内对齐话术（决策卡落地）",
      actions: [
        `全员背会一句话：${line}`,
        `迎客脚本上墙：${proof.script}`,
        `明确不做：${doNotDo.slice(0, 60)}`,
        "店长抽检：每人用大白话复述「给谁、解决什么、不像谁」",
        "淘汰与定位冲突的旧海报/朋友圈话术",
      ],
      ownerHint: "老板 + 店长",
      doneWhen: "随机抽 3 名店员能独立说清定位，且不说第二卖点",
    },
    {
      milestoneId: createId("ms"),
      weekStart: 3,
      weekEnd: 5,
      title: "菜单与产品证明（前 30 天核心）",
      actions: [
        weekProof,
        proof.menu,
        ifChoose,
        `牺牲落地：${sacrifice.slice(0, 72)}`,
        "弱化或下架与定位无关的引流款",
      ],
      ownerHint: "厨房负责人 + 运营",
      doneWhen: "主推品可统计；菜单上看不到与主轴冲突的堆砌卖点",
    },
    {
      milestoneId: createId("ms"),
      weekStart: 6,
      weekEnd: 8,
      title: "场景获客试验",
      actions: [
        proof.scene,
        `针对「${who}」做 1 场场合套餐或活动`,
        "收集 20 条客人原话，验证是否听到定位词",
        "根据原话微调传播主句，不改主航道",
      ],
      ownerHint: "营销/店长",
      doneWhen: "至少 30% 反馈能复述差异点或定位词",
    },
    {
      milestoneId: createId("ms"),
      weekStart: 9,
      weekEnd: 12,
      title: "固化作战卡与扩张准备",
      actions: [
        "把门店话术、主推、禁忌写进一页《品牌作战卡》（见店员交付包）",
        "复盘：哪类场合成交最高，下季只加同类场",
        "若要开第二店：复制作战卡，不复制「什么都卖」",
      ],
      ownerHint: "老板",
      doneWhen: "作战卡定稿 + 90 天复盘会开完",
    },
  ];

  return {
    roadmapId: createId("road"),
    status: "ready",
    horizonDays: 90,
    positioningOneLiner: line,
    milestones,
    staffDelivery,
    generatedAt: new Date().toISOString(),
  };
}

export function acceptExecutionRoadmap(
  roadmap: ExecutionRoadmap,
): ExecutionRoadmap {
  return {
    ...roadmap,
    status: "accepted",
    acceptedAt: new Date().toISOString(),
  };
}
