/**
 * 步 4：四方会议室 — 议程制 + 真辩论一轮（质询→反驳→修正策略表）
 * 对外席位：心智官 / 空位官 / 冲突官（去真名）
 */
import type {
  AdvisorId,
  AdvisorStrategyCard,
  AdvisorStrategySet,
  CrossFireBrief,
  FounderDecisionCard,
  FounderDecisionOption,
  WarRoomAgendaPhase,
  WarRoomConsensus,
  WarRoomTurn,
} from "./journey-types";
import { ADVISOR_META } from "./journey-types";
import type { TheoryLLMAdapter } from "../matrix/types";
import {
  attachMasterSchemesToSet,
  inventAndAttachMasterSchemes,
  masterSchemeContextFromInputs,
  recoverSchemeContext,
} from "./master-scheme-engine";

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function now() {
  return new Date().toISOString();
}

const AGENDA_LABEL: Record<WarRoomAgendaPhase, string> = {
  call_to_order: "议程 1 · 宣布开议",
  pitch: "议程 2 · 各述本案",
  crossfire: "议程 3 · 交叉质询",
  rebuttal: "议程 3b · 当场反驳",
  revise: "议程 3c · 修正策略表",
  chair_synthesis: "议程 4 · 主席综合",
  founder_vote: "议程 5 · 老板拍板",
  resolution: "议程 6 · 形成决议",
};

const SPEAKER_FROM_THEORY: Record<string, AdvisorId> = {
  ries: "ries",
  trout: "trout",
  ye_maozhong: "ye",
  ye: "ye",
  huayehu: "huayehu",
  kotler: "kotler",
  growth: "growth",
  culture: "culture",
  // 折叠标签仍可解析
  "MK-MIND": "ries",
  "MK-RIVAL": "trout",
  "MK-CLASH": "ye",
  "MK-SYMBOL": "huayehu",
  "MK-STP": "kotler",
  "MK-GROWTH": "growth",
  "MK-CULTURE": "culture",
};

type DebateChallenge = {
  fromId: AdvisorId;
  toId: AdvisorId;
  targetDirection: string;
  attack: string;
  defenseHint: string;
  severity: string;
};

function turn(
  speaker: WarRoomTurn["speaker"],
  kind: WarRoomTurn["kind"],
  text: string,
  agendaPhase: WarRoomAgendaPhase,
): WarRoomTurn {
  return {
    speaker,
    kind,
    text,
    at: now(),
    agendaPhase,
    agendaLabel: AGENDA_LABEL[agendaPhase],
  };
}

export function ensureProofPlan(s: AdvisorStrategyCard) {
  if (s.proofPlan?.menu && s.proofPlan?.script) return s.proofPlan;
  const anchor = s.battlefield || s.oneLiner || "主定位";
  return {
    menu: s.proofPlan?.menu || `主推服务「${anchor}」`,
    script: s.proofPlan?.script || `只讲「${s.oneLiner || anchor}」`,
    scene: s.proofPlan?.scene || `进店可见「${anchor}」`,
  };
}

function pitchScript(s: AdvisorStrategyCard): string {
  const meta = ADVISOR_META[s.advisorId];
  const score = s.theoryDossier?.totalScore;
  const scoreBit =
    typeof score === "number" ? `理论分 ${score}` : meta.model;
  const proof = ensureProofPlan(s);
  return [
    `${meta.name}（${meta.code} · 60 秒 · ${scoreBit}）：`,
    `主轴——${s.oneLiner}`,
    `陈述——${s.positioningStatement}`,
    `牺牲——${s.sacrifice}`,
    `证明——菜单：${proof.menu}；话术：${proof.script}`,
  ].join("\n");
}

function fallbackDebateChallenges(
  by: Partial<Record<AdvisorId, AdvisorStrategyCard>>,
): DebateChallenge[] {
  const ries = by.ries;
  const trout = by.trout;
  const ye = by.ye;
  if (!ries || !trout || !ye) return [];
  const base: DebateChallenge[] = [
    {
      fromId: "trout",
      toId: "ries",
      targetDirection: ries.oneLiner,
      attack: `你押心智词「${ries.battlefield}」。若菜单仍是大而全，客人记不住词。请当场回答：砍掉哪三道菜？依据：${(trout.proof || "").slice(0, 40)}`,
      defenseHint: "用砍菜证明聚焦不是口号；改 RTB 或菜单证明",
      severity: "R3",
    },
    {
      fromId: "ries",
      toId: "trout",
      targetDirection: trout.oneLiner,
      attack: `砍菜可以，但「${trout.battlefield}」若收不成一个词，区隔会散成对照广告。依据：${(ries.proof || "").slice(0, 40)}`,
      defenseHint: "把区隔压缩成可复述的第一词",
      severity: "R2",
    },
    {
      fromId: "ye",
      toId: "ries",
      targetDirection: ries.oneLiner,
      attack: `词对了，但${ye.forWhom}进店要的是场面——「${ye.jobToBeDone}」。没有场合套餐和迎客句，词是空的。`,
      defenseHint: "心智词必须绑定可验场合动作；改 scene/menu",
      severity: "R3",
    },
  ];
  if (by.huayehu) {
    base.push({
      fromId: "huayehu",
      toId: "ries",
      targetDirection: ries.oneLiner,
      attack: `心智词「${ries.battlefield}」若没有可感知超级符号，进店仍认不出品牌。符号官要求：门头/桌签必须钉死一个符号。`,
      defenseHint: "补可感知符号触点",
      severity: "R2",
    });
  }
  if (by.kotler && by.growth) {
    base.push({
      fromId: "kotler",
      toId: "growth",
      targetDirection: by.growth.oneLiner,
      attack: `增长飞轮若未先钉死细分「${by.kotler.forWhom}」，获客会散。细分官要求先选目标市场再谈飞轮。`,
      defenseHint: "飞轮动作绑定单一细分",
      severity: "R2",
    });
  }
  return base;
}

function challengesFromCrossFire(
  fire: CrossFireBrief,
  by: Partial<Record<AdvisorId, AdvisorStrategyCard>>,
): DebateChallenge[] {
  const out: DebateChallenge[] = [];
  for (const c of fire.challenges || []) {
    const fromId = SPEAKER_FROM_THEORY[c.from] || (c.from as AdvisorId);
    const toId = SPEAKER_FROM_THEORY[c.to] || (c.to as AdvisorId);
    if (!fromId || !toId || fromId === toId) continue;
    if (!by[toId] || !by[fromId]) continue;
    out.push({
      fromId,
      toId,
      targetDirection: c.targetDirection || by[toId]!.oneLiner,
      attack: c.attack,
      defenseHint: c.defenseHint || "",
      severity: c.severity || "R2",
    });
  }
  return out.length ? out : fallbackDebateChallenges(by);
}

/** 每位被质询顾问只打一轮；七席最多 5 席被质询改策 */
function pickDebateRound(all: DebateChallenge[]): DebateChallenge[] {
  const seen = new Set<AdvisorId>();
  const round: DebateChallenge[] = [];
  for (const c of all) {
    if (seen.has(c.toId)) continue;
    seen.add(c.toId);
    round.push(c);
    if (round.length >= 5) break;
  }
  return round;
}

function reviseCardAfterChallenge(
  card: AdvisorStrategyCard,
  challenge: DebateChallenge,
): {
  card: AdvisorStrategyCard;
  rebuttalText: string;
  reviseText: string;
  changedFields: string[];
} {
  const meta = ADVISOR_META[card.advisorId];
  const attack = challenge.attack;
  const next: AdvisorStrategyCard = {
    ...card,
    proofPlan: { ...ensureProofPlan(card) },
  };
  const changedFields: string[] = [];

  if (/砍|菜单|大而全|聚焦|三道/.test(attack)) {
    next.sacrifice = `${card.sacrifice.replace(/；辩论后.+$/, "")}；辩论后追加：本周先砍宽菜单，主推不超过 3 道`;
    next.proofPlan = {
      ...next.proofPlan!,
      menu: `辩论修正：主推≤3 道，全部服务「${card.battlefield || card.oneLiner}」`,
    };
    changedFields.push("sacrifice", "proofPlan.menu");
  }

  if (/场合|场面|进店|套餐|迎客/.test(attack)) {
    next.proofPlan = {
      ...next.proofPlan!,
      scene: `辩论修正：场合套餐+迎客句当场兑现「${card.jobToBeDone}」`,
      script:
        next.proofPlan?.script ||
        `迎客只问场合，兑现「${card.jobToBeDone}」`,
    };
    if (!changedFields.includes("proofPlan.scene")) {
      changedFields.push("proofPlan.scene");
    }
    if (!/场合证明/.test(next.sacrifice)) {
      next.sacrifice = `${next.sacrifice}；辩论后追加：必须上场合证明`;
      if (!changedFields.includes("sacrifice")) changedFields.push("sacrifice");
    }
  }

  if (/不像|对照|区隔|空位|同质/.test(attack)) {
    next.doNotDo = `${card.doNotDo.replace(/；辩论后.+$/, "")}；辩论后：话术必须带对照「不像谁」`;
    changedFields.push("doNotDo");
  }

  if (/词|心智|复述|记不住/.test(attack)) {
    if (!/辩论收紧/.test(card.oneLiner)) {
      next.oneLiner = `${card.oneLiner.replace(/（辩论收紧.+$/, "").replace(/。$/, "")}（辩论收紧：只留一词）`;
      changedFields.push("oneLiner");
    }
  }

  if (changedFields.length === 0) {
    next.sacrifice = `${card.sacrifice.replace(/；辩论后.+$/, "")}；辩论后补强：本周必须有一个可验动作`;
    changedFields.push("sacrifice");
  }

  if (next.theoryDossier) {
    next.theoryDossier = {
      ...next.theoryDossier,
      coreLogic: [
        next.theoryDossier.coreLogic,
        `【会议辩论修正】回应${ADVISOR_META[challenge.fromId].name}：${challenge.defenseHint || "执行层收紧"}`,
      ]
        .filter(Boolean)
        .join("\n"),
    };
    changedFields.push("theoryDossier");
  }

  const rebuttalText = [
    `${meta.name}当场反驳：`,
    challenge.defenseHint
      ? `承认质询有效点——${challenge.defenseHint}。`
      : "承认质询有一半成立：方向可守，执行必须钉死。",
    `答辩：主轴方向「${card.oneLiner}」不撤，但策略表当场改执行层，不做正确的废话。`,
  ].join("\n");

  const reviseText = [
    `${meta.name}修正策略表（写回案卷）：`,
    ...changedFields.map((f) => `- 已改 ${f}`),
    `修正后主轴——${next.oneLiner}`,
    `修正后牺牲——${next.sacrifice}`,
    `修正后证明——菜单：${next.proofPlan?.menu}；场景：${next.proofPlan?.scene}`,
  ].join("\n");

  return { card: next, rebuttalText, reviseText, changedFields };
}

function buildDebateTurns(
  challenges: DebateChallenge[],
  allStrategies: AdvisorStrategyCard[],
): { turns: WarRoomTurn[]; strategies: AdvisorStrategyCard[] } {
  const revised: Partial<Record<AdvisorId, AdvisorStrategyCard>> = {};
  for (const s of allStrategies) {
    revised[s.advisorId] = { ...s, proofPlan: ensureProofPlan(s) };
  }
  const turns: WarRoomTurn[] = [];
  const round = pickDebateRound(challenges);

  for (const c of round) {
    const target = revised[c.toId];
    if (!target) continue;
    const fromName = ADVISOR_META[c.fromId]?.name || c.fromId;
    const toName = ADVISOR_META[c.toId]?.name || c.toId;
    const severity = c.severity ? `【${c.severity}】` : "";

    turns.push(
      turn(
        c.fromId,
        "challenge",
        [
          `${fromName}开火 → ${toName}${severity}：`,
          `目标方向「${c.targetDirection}」。`,
          c.attack,
        ].join("\n"),
        "crossfire",
      ),
    );

    const result = reviseCardAfterChallenge(target, c);
    revised[c.toId] = result.card;

    turns.push(
      turn(c.toId, "rebuttal", result.rebuttalText, "rebuttal"),
    );
    turns.push(
      turn(c.toId, "revise", result.reviseText, "revise"),
    );
  }

  return {
    turns,
    strategies: allStrategies.map((s) => revised[s.advisorId] || s),
  };
}

export type OpenWarRoomResult = {
  room: WarRoomConsensus;
  set: AdvisorStrategySet;
};

/** 老板拍板前一页纸：七案对照，禁止散文 */
export function buildFounderDecisionCard(
  set: AdvisorStrategySet,
): FounderDecisionCard {
  const order: AdvisorId[] = [
    "ries",
    "trout",
    "ye",
    "huayehu",
    "kotler",
    "growth",
    "culture",
  ];
  const options: FounderDecisionOption[] = order
    .map((id) => set.strategies.find((x) => x.advisorId === id))
    .filter(Boolean)
    .map((s) => {
      const card = s!;
      const meta = ADVISOR_META[card.advisorId];
      const proof = ensureProofPlan(card);
      return {
        advisorId: card.advisorId,
        seatName: meta.name,
        seatCode: meta.code,
        oneLiner: card.oneLiner,
        sacrifice: card.sacrifice,
        thisWeekProof: `菜单：${proof.menu}；话术：${proof.script}`,
        ifChoose: `资源押「${card.battlefield || card.oneLiner}」；本周只验这一套证明。`,
        ifNot: `若另起第二卖点，${meta.name}案失效，会议白开。`,
      };
    });

  const title = "一页纸决策卡 · 品牌战略委员会";
  const subtitle = "拍板前只看这一页。七案互斥，选主轴或写清折中主辅。";
  const question = "本阶段唯一主航道，押哪一条？";
  const blendHint =
    "折中规则：必须写清谁主轴、谁只做约束；禁止多案平均用力。";
  const rule =
    "没有拍板不能结束会商。拍板后菜单/话术/传播不得另起第二套主卖点。";

  const mdLines = [
    `# ${title}`,
    ``,
    `> ${subtitle}`,
    ``,
    `**决策问题**：${question}`,
    ``,
    `| 席位 | 主轴（修正后） | 必须牺牲 | 本周证明 | 选它意味着 |`,
    `| --- | --- | --- | --- | --- |`,
    ...options.map(
      (o) =>
        `| ${o.seatName}（${o.seatCode}） | ${o.oneLiner.replace(/\|/g, "/")} | ${o.sacrifice.replace(/\|/g, "/").slice(0, 60)} | ${o.thisWeekProof.replace(/\|/g, "/").slice(0, 48)} | ${o.ifChoose.replace(/\|/g, "/").slice(0, 40)} |`,
    ),
    ``,
    `**折中**：${blendHint}`,
    ``,
    `**硬规则**：${rule}`,
    ``,
  ];

  return {
    title,
    subtitle,
    question,
    options,
    blendHint,
    rule,
    markdown: mdLines.join("\n"),
  };
}

/**
 * 开会：亮策 → 质询→反驳→改策（至少一轮）→ 主席综合 → 决策卡 → 等老板拍板
 */
export function openWarRoomDebate(set: AdvisorStrategySet): OpenWarRoomResult {
  const by = Object.fromEntries(
    set.strategies.map((s) => [s.advisorId, s]),
  ) as Partial<Record<AdvisorId, AdvisorStrategyCard>>;

  const challengePool = set.crossFire
    ? challengesFromCrossFire(set.crossFire, by)
    : fallbackDebateChallenges(by);

  const debate = buildDebateTurns(challengePool, set.strategies);

  const ctx = set.schemeContext
    ? masterSchemeContextFromInputs(set.schemeContext)
    : recoverSchemeContext(debate.strategies);
  const refreshedStrategies = attachMasterSchemesToSet(
    debate.strategies,
    ctx,
  );

  const debatedSet: AdvisorStrategySet = {
    ...set,
    status: "debated",
    strategies: refreshedStrategies,
    schemeContext: ctx,
    masterSchemeMode: set.masterSchemeMode || "heuristic",
    synthesisNote: [
      set.synthesisNote,
      "会议室已完成至少一轮质询→反驳→策略表修正；各席大师方案已按改策重算。",
    ]
      .filter(Boolean)
      .join(" "),
  };

  const decisionCard = buildFounderDecisionCard(debatedSet);
  const pitchOrder: AdvisorId[] = [
    "ries",
    "trout",
    "ye",
    "huayehu",
    "kotler",
    "growth",
    "culture",
  ];
  const pitchTurns = pitchOrder
    .map((id) => debatedSet.strategies.find((s) => s.advisorId === id))
    .filter(Boolean)
    .map((s) => turn(s!.advisorId, "pitch", pitchScript(s!), "pitch"));

  const turns: WarRoomTurn[] = [
    turn(
      "host",
      "host",
      "品牌战略委员会现在开议。今天只决一件事：主定位押哪条。出席：心智官、空位官、冲突官、符号官、细分官、增长官、文化官。规则：各人 60 秒亮策；交叉质询后必须当场反驳并修正策略表；禁止讲正确的废话；没有老板拍板，不能结束会商。",
      "call_to_order",
    ),
    ...pitchTurns,
    ...debate.turns,
    turn(
      "host",
      "synthesis",
      [
        "主席综合：七案仍互斥，不能并行当主轴。",
        "本轮已完成「质询 → 反驳 → 修正策略表」；拍板请看修正后的主轴与牺牲，不要看开场旧稿。",
        set.crossFire?.gameSummary
          ? `交火纪要：${set.crossFire.gameSummary}`
          : "",
        set.conflictSummary,
        "请先读《一页纸决策卡》，再选主轴。",
      ]
        .filter(Boolean)
        .join("\n"),
      "chair_synthesis",
    ),
    turn(
      "host",
      "host",
      [
        "【呈交】一页纸决策卡已发到拍板席。",
        decisionCard.question,
        ...decisionCard.options.map(
          (o) =>
            `${o.seatName}：${o.oneLiner}｜牺牲：${o.sacrifice.slice(0, 36)}`,
        ),
        decisionCard.rule,
      ].join("\n"),
      "founder_vote",
    ),
  ];

  const room: WarRoomConsensus = {
    roomId: createId("war"),
    status: "awaiting_user",
    currentAgenda: "founder_vote",
    agendaTitle: AGENDA_LABEL.founder_vote,
    debateRoundCompleted: true,
    decisionCard,
    turns,
  };

  return { room, set: debatedSet };
}

function extractJson(content: string): Record<string, unknown> | null {
  const raw = (content || "").trim();
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    if (p && typeof p === "object" && !Array.isArray(p)) {
      return p as Record<string, unknown>;
    }
  } catch {
    /* */
  }
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

function sanitizeField(s: unknown, max: number): string | undefined {
  if (typeof s !== "string") return undefined;
  const t = s.replace(/里斯|特劳特|叶茂中|Al\s*Ries|Jack\s*Trout/gi, "").trim();
  if (t.length < 4) return undefined;
  return t.length <= max ? t : t.slice(0, max);
}

/**
 * LLM 真辩论第二刀：反驳锋利化 + 策略表字段写回 + 重建决策卡
 */
export async function openWarRoomDebateAsync(
  set: AdvisorStrategySet,
  options?: { llm?: TheoryLLMAdapter },
): Promise<OpenWarRoomResult> {
  const base = openWarRoomDebate(set);
  const llm = options?.llm;
  if (!llm) return base;

  try {
    const pairs = base.room.turns
      .map((t, i) => ({ t, i }))
      .filter((x) => x.t.kind === "rebuttal")
      .map(({ t, i }) => {
        const challenge = base.room.turns
          .slice(0, i)
          .reverse()
          .find((x) => x.kind === "challenge");
        const reviseIdx = base.room.turns.findIndex(
          (x, j) =>
            j > i && x.kind === "revise" && x.speaker === t.speaker,
        );
        const card = base.set.strategies.find((s) => s.advisorId === t.speaker);
        return {
          rebuttalIndex: i,
          reviseIndex: reviseIdx,
          advisorId: t.speaker as AdvisorId,
          challenge: challenge?.text || "",
          rebuttalDraft: t.text,
          card: card
            ? {
                oneLiner: card.oneLiner,
                sacrifice: card.sacrifice,
                doNotDo: card.doNotDo,
                proofPlan: ensureProofPlan(card),
              }
            : null,
        };
      });

    if (!pairs.length) return base;

    const { content } = await llm.chat({
      messages: [
        {
          role: "system",
          content:
            "你是品牌战略委员会书记员。只输出 JSON。禁止名人真名。主轴方向可收紧不可换成另一套品类故事；改策必须可验（菜单/话术/场景）。",
        },
        {
          role: "user",
          content: [
            "对每条质询，输出：锋利反驳 + 策略表字段修订。",
            "输出格式：",
            `{"revisions":[{"advisorId":"ries|trout|ye","rebuttalText":"2-4句反驳","oneLiner":"可选收紧","sacrifice":"可选","doNotDo":"可选","proofPlan":{"menu":"...","script":"...","scene":"..."},"reviseAnnouncement":"改策口头宣布"}]}`,
            "现场草稿：",
            JSON.stringify(pairs),
          ].join("\n"),
        },
      ],
      temperature: 0.55,
      maxTokens: 1800,
    });

    const parsed = extractJson(content);
    const revisions = (parsed?.revisions as Array<Record<string, unknown>>) || [];
    if (!Array.isArray(revisions) || !revisions.length) {
      // 降级：仅尝试旧版反驳润色
      return polishRebuttalsOnly(base, llm);
    }

    const turns = [...base.room.turns];
    const strategies = base.set.strategies.map((s) => ({
      ...s,
      proofPlan: ensureProofPlan(s),
    }));

    for (const rev of revisions) {
      const advisorId = String(rev.advisorId || "") as AdvisorId;
      if (!["ries", "trout", "ye"].includes(advisorId)) continue;
      const pair = pairs.find((p) => p.advisorId === advisorId);
      if (!pair) continue;

      const rebuttalText = sanitizeField(rev.rebuttalText, 220);
      if (rebuttalText && turns[pair.rebuttalIndex]?.kind === "rebuttal") {
        turns[pair.rebuttalIndex] = {
          ...turns[pair.rebuttalIndex]!,
          text: rebuttalText,
        };
      }

      const idx = strategies.findIndex((s) => s.advisorId === advisorId);
      if (idx < 0) continue;
      const cur = strategies[idx]!;
      const nextProof = { ...ensureProofPlan(cur) };
      const pp = rev.proofPlan as Record<string, unknown> | undefined;
      if (pp && typeof pp === "object") {
        const menu = sanitizeField(pp.menu, 80);
        const script = sanitizeField(pp.script, 80);
        const scene = sanitizeField(pp.scene, 80);
        if (menu) nextProof.menu = menu;
        if (script) nextProof.script = script;
        if (scene) nextProof.scene = scene;
      }

      const oneLiner = sanitizeField(rev.oneLiner, 48) || cur.oneLiner;
      const sacrifice = sanitizeField(rev.sacrifice, 120) || cur.sacrifice;
      const doNotDo = sanitizeField(rev.doNotDo, 120) || cur.doNotDo;

      strategies[idx] = {
        ...cur,
        oneLiner,
        sacrifice,
        doNotDo,
        proofPlan: nextProof,
        theoryDossier: cur.theoryDossier
          ? {
              ...cur.theoryDossier,
              coreLogic: [
                cur.theoryDossier.coreLogic,
                "【LLM 辩论改策】字段已按质询写回案卷",
              ].join("\n"),
            }
          : cur.theoryDossier,
      };

      const announce =
        sanitizeField(rev.reviseAnnouncement, 280) ||
        [
          `${ADVISOR_META[advisorId].name}修正策略表（LLM 写回）：`,
          `修正后主轴——${oneLiner}`,
          `修正后牺牲——${sacrifice}`,
          `修正后证明——菜单：${nextProof.menu}；话术：${nextProof.script}`,
        ].join("\n");

      if (pair.reviseIndex >= 0 && turns[pair.reviseIndex]?.kind === "revise") {
        turns[pair.reviseIndex] = {
          ...turns[pair.reviseIndex]!,
          text: announce,
        };
      }
    }

    const ctx = base.set.schemeContext
      ? masterSchemeContextFromInputs(base.set.schemeContext)
      : recoverSchemeContext(strategies);
    const invented = await inventAndAttachMasterSchemes(
      strategies,
      ctx,
      llm,
    );

    const debatedSet: AdvisorStrategySet = {
      ...base.set,
      status: "debated",
      strategies: invented.strategies,
      schemeContext: invented.schemeContext,
      masterSchemeMode: invented.usedLlm ? "llm_hybrid" : "heuristic",
      synthesisNote: [
        base.set.synthesisNote,
        "LLM 辩论已写回策略表字段；各席大师方案（含话术）已按改策重算并重建决策卡。",
      ]
        .filter(Boolean)
        .join(" "),
    };

    const decisionCard = buildFounderDecisionCard(debatedSet);

    // 刷新决策卡呈交 turn（最后一条 host founder_vote）
    const cardTurnIdx = turns
      .map((t, i) => ({ t, i }))
      .reverse()
      .find((x) => x.t.agendaPhase === "founder_vote" && x.t.speaker === "host")
      ?.i;
    if (typeof cardTurnIdx === "number") {
      turns[cardTurnIdx] = turn(
        "host",
        "host",
        [
          "【呈交】一页纸决策卡已按辩论修正刷新。",
          decisionCard.question,
          ...decisionCard.options.map(
            (o) =>
              `${o.seatName}：${o.oneLiner}｜牺牲：${o.sacrifice.slice(0, 36)}`,
          ),
          decisionCard.rule,
        ].join("\n"),
        "founder_vote",
      );
    }

    return {
      set: debatedSet,
      room: {
        ...base.room,
        turns,
        decisionCard,
        debateRoundCompleted: true,
      },
    };
  } catch {
    return base;
  }
}

async function polishRebuttalsOnly(
  base: OpenWarRoomResult,
  llm: TheoryLLMAdapter,
): Promise<OpenWarRoomResult> {
  const rebuttalIdx = base.room.turns
    .map((t, i) => ({ t, i }))
    .filter((x) => x.t.kind === "rebuttal");
  if (!rebuttalIdx.length) return base;

  const payload = rebuttalIdx.map(({ t, i }) => {
    const challenge = base.room.turns
      .slice(0, i)
      .reverse()
      .find((x) => x.kind === "challenge");
    return {
      index: i,
      speaker: t.speaker,
      challenge: challenge?.text || "",
      draft: t.text,
    };
  });

  try {
    const { content } = await llm.chat({
      messages: [
        {
          role: "system",
          content:
            "你是品牌战略委员会书记员。只输出 JSON。禁止名人真名。把反驳改得锋利、短、可执行。",
        },
        {
          role: "user",
          content: [
            "为下列反驳各写一版更锋利的现场发言（2～4 句）。",
            '输出：{"items":[{"index":0,"text":"..."}]}',
            "草稿：",
            JSON.stringify(payload),
          ].join("\n"),
        },
      ],
      temperature: 0.55,
      maxTokens: 1200,
    });
    const parsed = extractJson(content);
    const items =
      (parsed?.items as Array<{ index: number; text: string }>) || [];
    const turns = [...base.room.turns];
    for (const item of items) {
      if (
        typeof item.index === "number" &&
        turns[item.index]?.kind === "rebuttal" &&
        item.text &&
        item.text.length > 12 &&
        !/里斯|特劳特|叶茂中/.test(item.text)
      ) {
        turns[item.index] = { ...turns[item.index]!, text: item.text.trim() };
      }
    }
    return { set: base.set, room: { ...base.room, turns } };
  } catch {
    return base;
  }
}

/** 兼容旧调用：只取 room；需要写回策略请用 openWarRoomDebate */
export function openWarRoom(set: AdvisorStrategySet): WarRoomConsensus {
  return openWarRoomDebate(set).room;
}

export function applyUserVoteToWarRoom(
  room: WarRoomConsensus,
  set: AdvisorStrategySet,
  preference: AdvisorId | "blend",
  blendNote?: string,
): WarRoomConsensus {
  const trout = set.strategies.find((s) => s.advisorId === "trout")!;
  const ye = set.strategies.find((s) => s.advisorId === "ye")!;
  const ries = set.strategies.find((s) => s.advisorId === "ries")!;
  const picked =
    preference === "blend"
      ? null
      : set.strategies.find((s) => s.advisorId === preference) || ries;

  /** 折中：心智词主轴 + 空位对照 + 冲突场合证明，合成真正共识而非拷贝 strategies[0] */
  const primary: AdvisorStrategyCard =
    preference === "blend"
      ? {
          ...ries,
          oneLiner:
            ries.oneLiner ||
            `客人脑中只记「${ries.battlefield}」，且不像同质打法`,
          forWhom: ries.forWhom || ye.forWhom,
          jobToBeDone: ye.jobToBeDone || ries.jobToBeDone,
          frameOfReference:
            trout.frameOfReference || ries.frameOfReference,
          pointOfDifference:
            trout.pointOfDifference || ries.pointOfDifference,
          proof: [ries.proof, trout.proof, ye.proof]
            .filter((p) => (p || "").trim().length >= 8)
            .sort((a, b) => {
              const score = (x: string) =>
                /证据|调研|对手|场合|可追溯/.test(x) ? 2 : /信念|待/.test(x) ? 0 : 1;
              return score(b) - score(a);
            })[0] || ries.proof,
          sacrifice: [ries.sacrifice, trout.sacrifice, ye.sacrifice]
            .filter(Boolean)
            .slice(0, 2)
            .join("；"),
          doNotDo: [ries.doNotDo, trout.doNotDo, ye.doNotDo]
            .filter(Boolean)
            .slice(0, 2)
            .join("；"),
          proofPlan: {
            menu: ensureProofPlan(ries).menu,
            script: ensureProofPlan(trout).script,
            scene: ensureProofPlan(ye).scene,
          },
          positioningStatement: [
            `给${ries.forWhom || ye.forWhom}，`,
            `解决「${ye.jobToBeDone || ries.jobToBeDone}」；`,
            `我们是${ries.frameOfReference}里「${ries.battlefield}」的第一选择；`,
            `因为${trout.proof || ries.proof}；`,
            `不像${trout.doNotDo || trout.battlefield}。`,
          ].join(""),
        }
      : picked!;

  const note =
    preference === "blend"
      ? blendNote?.trim() ||
        `主轴取心智官心智词「${ries.battlefield}」；空位官写清不像谁；冲突官负责场合证明。三席约束一并冻结，禁止只抄一席口号。`
      : `老板裁定：以${ADVISOR_META[preference].name}案为主轴；落选席约束仍并入终稿。`;

  const unlikeLine =
    preference === "trout"
      ? trout.doNotDo || trout.pointOfDifference
      : /不像|不跟|对照/.test(trout.pointOfDifference || "")
        ? trout.pointOfDifference!
        : trout.doNotDo ||
          `不像${trout.battlefield}那套同质打法`;

  const consensusStatement = {
    forAudience: primary.forWhom,
    whoNeed: primary.jobToBeDone,
    ourBrandIs: primary.frameOfReference,
    thatValue: primary.oneLiner,
    because: primary.proof,
    unlike: unlikeLine,
  };

  const minorityConstraints = [
    preference !== "ries" && preference !== "blend"
      ? `心智约束：对外仍须能复述成一个词「${ries.battlefield}」`
      : `心智词权：「${ries.battlefield}」为唯一主词`,
    `竞争约束：话术必须写清不像谁（对照：${trout.battlefield}）`,
    `场合约束：本周证明不得缺——${ensureProofPlan(ye).scene}`,
    preference !== "ye" && preference !== "blend"
      ? `冲突官保留：场合套餐须对应「${ye.jobToBeDone}」`
      : null,
    set.strategies.find((s) => s.advisorId === "huayehu")
      ? `符号约束：门头/桌签须钉死可感知符号（符号官）`
      : null,
    set.strategies.find((s) => s.advisorId === "kotler")
      ? `细分约束：主航道不得偏离目标细分「${set.strategies.find((s) => s.advisorId === "kotler")!.forWhom}」`
      : null,
    set.strategies.find((s) => s.advisorId === "growth")
      ? `增长约束：本周证明须能进入飞轮验证，禁止只喊增长口号`
      : null,
    set.strategies.find((s) => s.advisorId === "culture")
      ? `文化约束：传播须锚定社会矛盾，禁止空喊价值观`
      : null,
  ].filter(Boolean) as string[];

  const voteLabel =
    preference === "blend" ? "折中（有主辅）" : ADVISOR_META[preference].name;

  return {
    ...room,
    status: "agreed",
    currentAgenda: "resolution",
    agendaTitle: AGENDA_LABEL.resolution,
    userPreference: preference,
    blendNote: note,
    consensusOneLiner: primary.oneLiner,
    consensusStatement,
    ownedWord: ries.battlefield,
    minorityConstraints,
    turns: [
      ...room.turns,
      turn(
        "user",
        "vote",
        `老板拍板：${voteLabel}。\n${note}`,
        "founder_vote",
      ),
      turn(
        "host",
        "decision",
        [
          "决议生效：",
          `1. 主轴冻结——${primary.oneLiner}`,
          `2. 定位陈述——For ${consensusStatement.forAudience} / That ${consensusStatement.thatValue}`,
          `3. 词权——「${ries.battlefield}」`,
          `4. Because（RTB）——${consensusStatement.because}`,
          `5. Unlike——${consensusStatement.unlike}`,
          `6. 本周证明——菜单：${ensureProofPlan(primary).menu}；话术：${ensureProofPlan(primary).script}；场合：${ensureProofPlan(primary).scene}`,
          `7. 落选席约束——${minorityConstraints.join(" / ")}`,
          room.debateRoundCompleted
            ? "8. 注：主轴已含会议辩论修正，非开场旧稿。"
            : "",
          "下一步：生成《定位策略报告》供签字确认。结束会商条件：报告确认后。",
        ]
          .filter(Boolean)
          .join("\n"),
        "resolution",
      ),
      turn(
        "ries",
        "synthesis",
        preference === "ries" || preference === "blend"
          ? `心智官备案：心智词收成「${ries.battlefield}」。传播禁加第二卖点。`
          : `心智官保留：即便主轴非我，对外仍须能被复述成一个词，否则无效。`,
        "resolution",
      ),
      turn(
        "trout",
        "synthesis",
        `空位官备案：话术必须写清「不像谁」。对照对象：${trout.battlefield}。`,
        "resolution",
      ),
      turn(
        "ye",
        "synthesis",
        `冲突官备案：场合证明不得缺——${ensureProofPlan(ye).scene}`,
        "resolution",
      ),
    ],
    agreedAt: now(),
  };
}

export { AGENDA_LABEL };
