/**
 * 共享：会议室开场 + 投票合成（冲突要可感知）
 * 对齐 M-PNT：议程相位 · 决策卡 · 交叉质询
 */
import {
  createId,
  nowIso,
  type AdvisorStrategyCard,
  type AdvisorStrategySet,
  type FounderDecisionCard,
  type WarRoomAgendaPhase,
  type WarRoomConsensus,
  type WarRoomTurn,
} from "./types";

const AGENDA_LABEL: Record<WarRoomAgendaPhase, string> = {
  call_to_order: "宣布开会",
  pitch: "各述本案",
  crossfire: "交叉质询",
  rebuttal: "当场反驳",
  revise: "修正策略表",
  chair_synthesis: "主席综合",
  founder_vote: "老板拍板",
  resolution: "形成决议",
};

function turn(
  speaker: string,
  kind: WarRoomTurn["kind"],
  text: string,
  agendaPhase: WarRoomAgendaPhase,
): WarRoomTurn {
  return {
    speaker,
    kind,
    text,
    at: nowIso(),
    agendaPhase,
    agendaLabel: AGENDA_LABEL[agendaPhase],
  };
}

/** 用各策一句话拼出「会打架」的冲突摘要 */
export function buildConflictSummary(
  strategies: AdvisorStrategyCard[],
  nameOf: (id: string) => string = (id) => id,
): string {
  if (strategies.length === 0) return "顾问尚未出策。";
  const parts = strategies.map(
    (s) => `${nameOf(s.advisorId)}押「${s.oneLiner}」`,
  );
  return `${parts.join("；")}。优先级不同——必须进会议室取舍。`;
}

export type WarRoomSeatMeta = {
  id: string;
  name: string;
  code: string;
};

export type OpenGenericWarRoomOptions = {
  hostIntro: string;
  agendaTitle?: string;
  decision: {
    title: string;
    subtitle: string;
    question: string;
    blendHint?: string;
    rule?: string;
  };
  seats: WarRoomSeatMeta[];
};

function buildDecisionCard(
  advisors: AdvisorStrategySet,
  seats: WarRoomSeatMeta[],
  meta: OpenGenericWarRoomOptions["decision"],
): FounderDecisionCard {
  const seatMap = Object.fromEntries(seats.map((s) => [s.id, s]));
  const options = advisors.strategies.map((s) => {
    const seat = seatMap[s.advisorId];
    const rival = advisors.strategies.find((x) => x.advisorId !== s.advisorId);
    return {
      advisorId: s.advisorId,
      seatName: seat?.name || s.advisorId,
      seatCode: seat?.code || s.advisorId.slice(0, 2).toUpperCase(),
      oneLiner: s.oneLiner,
      sacrifice: s.doNotDo,
      thisWeekProof: s.entryScheme?.weekProof || s.proof,
      ifChoose: `主轴锁定「${s.oneLiner}」，其余席位降为约束。`,
      ifNot: rival
        ? `若选旁席，本策「${s.oneLiner}」降为护栏；风险：${s.risk}`
        : `不选则主轴旁落，风险：${s.risk}`,
    };
  });
  return {
    title: meta.title,
    subtitle: meta.subtitle,
    question: meta.question,
    options,
    blendHint:
      meta.blendHint ||
      "折中可以，但必须写清谁主轴、谁只做护栏——不能把互斥案合成一团。",
    rule:
      meta.rule ||
      "没有拍板不能散会。选主轴即接受对应牺牲与本周证明。",
  };
}

/**
 * 开一场有议程的会议室。
 * 兼容旧调用：第二参可为 hostIntro 字符串。
 */
export function openGenericWarRoom(
  advisors: AdvisorStrategySet,
  optsOrIntro: OpenGenericWarRoomOptions | string,
): WarRoomConsensus {
  const list = advisors.strategies;
  const opts: OpenGenericWarRoomOptions =
    typeof optsOrIntro === "string"
      ? {
          hostIntro: optsOrIntro,
          agendaTitle: "有议程、有质询、有决议——不是留言板",
          decision: {
            title: "决策卡",
            subtitle: "对照各席主策后拍板",
            question: "主轴选哪一条？",
          },
          seats: list.map((s) => ({
            id: s.advisorId,
            name: s.advisorId,
            code: s.advisorId.slice(0, 2).toUpperCase(),
          })),
        }
      : optsOrIntro;

  const turns: WarRoomTurn[] = [
    turn("host", "host", opts.hostIntro, "call_to_order"),
  ];

  for (const s of list) {
    turns.push(
      turn(
        s.advisorId,
        "pitch",
        `${s.oneLiner}。战场：${s.battlefield}。证明：${s.proof}。不做：${s.doNotDo}。`,
        "pitch",
      ),
    );
  }

  if (list.length >= 2) {
    turns.push(
      turn(
        list[1]!.advisorId,
        "challenge",
        `挑战上策「${list[0]!.oneLiner}」：若只押这一条，可能踩雷「${list[1]!.risk}」。我方主张「${list[1]!.oneLiner}」。`,
        "crossfire",
      ),
    );
  }
  if (list.length >= 3) {
    turns.push(
      turn(
        list[2]!.advisorId,
        "challenge",
        `挑战前两策：若落地证明不了「${list[2]!.proof}」，再好听也是空心。我坚持「${list[2]!.oneLiner}」。`,
        "crossfire",
      ),
    );
  }
  if (list.length >= 4) {
    turns.push(
      turn(
        list[3]!.advisorId,
        "challenge",
        `落地挑战：没有「${list[3]!.doNotDo}」的纪律，前面共识会在执行里跑偏。请以「${list[3]!.oneLiner}」设护栏。`,
        "crossfire",
      ),
    );
  }

  // 当场反驳：被挑战席回击
  if (list.length >= 2) {
    turns.push(
      turn(
        list[0]!.advisorId,
        "rebuttal",
        `反驳：${list[1]!.advisorId} 的挑战成立一半。我接受「${list[1]!.proof}」作护栏，但主轴不能让。若放弃「${list[0]!.oneLiner}」，空位会立刻糊掉。`,
        "rebuttal",
      ),
    );
  }
  if (list.length >= 3) {
    turns.push(
      turn(
        list[1]!.advisorId,
        "rebuttal",
        `反驳投资/第三方压力：没有门店兑现，「${list[2]!.oneLiner}」只是纸上指标。我坚持本周先证明「${list[1]!.proof}」。`,
        "rebuttal",
      ),
    );
  }

  // 修正策略表：各席收窄一刀
  for (const s of list.slice(0, 3)) {
    turns.push(
      turn(
        s.advisorId,
        "revise",
        `改策：主轴仍是「${s.oneLiner}」；本周只证明「${s.entryScheme?.weekProof || s.proof}」；明确牺牲「${s.doNotDo}」。`,
        "revise",
      ),
    );
  }

  turns.push(
    turn(
      "host",
      "synthesis",
      `${advisors.conflictSummary}${advisors.gameSummary ? ` ${advisors.gameSummary}` : ""} 质询与改策已完成。请先读决策卡，再表态：认哪一策，或折中并写清主辅。`,
      "chair_synthesis",
    ),
  );

  const decisionCard = buildDecisionCard(advisors, opts.seats, opts.decision);
  turns.push(
    turn(
      "host",
      "host",
      [
        decisionCard.question,
        ...decisionCard.options.map(
          (o) => `· ${o.seatName}：${o.oneLiner}（牺牲：${o.sacrifice}）`,
        ),
        decisionCard.rule,
      ].join("\n"),
      "founder_vote",
    ),
  );

  return {
    roomId: createId("war"),
    status: "awaiting_user",
    currentAgenda: "founder_vote",
    agendaTitle: opts.agendaTitle || "有议程、有质询、有决议——不是留言板",
    turns,
    decisionCard,
  };
}

export function applyGenericVote(
  room: WarRoomConsensus,
  advisors: AdvisorStrategySet,
  preference: string,
  advisorName: (id: string) => string,
  blendNote?: string,
): WarRoomConsensus {
  const list = advisors.strategies;
  const primary =
    preference === "blend"
      ? list[0]!
      : list.find((s) => s.advisorId === preference) || list[0]!;

  const supporting = list.filter((s) => s.advisorId !== primary.advisorId).slice(0, 2);

  const note =
    preference === "blend"
      ? blendNote?.trim() ||
        `主轴取「${primary.oneLiner}」，并吸收：${supporting.map((s) => s.proof).join("；") || "多方证明点"}。`
      : `老板选择以${advisorName(preference)}为主策。`;

  const voteLabel =
    preference === "blend" ? "折中方案" : advisorName(preference);

  const consensusOneLiner =
    preference === "blend" && supporting.length > 0
      ? `以「${primary.oneLiner}」为主轴，同时兑现「${supporting[0]!.proof}」`
      : primary.oneLiner;

  const consensusBullets =
    preference === "blend"
      ? [
          primary.differentiation,
          ...supporting.map((s) => `${advisorName(s.advisorId)}吸收：${s.proof}`),
          `护栏：${primary.doNotDo}`,
        ].slice(0, 4)
      : [
          primary.differentiation,
          `证明点：${primary.proof}`,
          `不做：${primary.doNotDo}`,
        ];

  return {
    ...room,
    status: "agreed",
    currentAgenda: "resolution",
    userPreference: preference,
    blendNote: note,
    consensusOneLiner,
    consensusBullets,
    turns: [
      ...room.turns,
      turn(
        "user",
        "vote",
        `老板表态：倾向「${voteLabel}」。${note}`,
        "resolution",
      ),
      turn(
        "host",
        "decision",
        `会议共识：冻结方向「${consensusOneLiner}」。下一步生成战略报告供确认。`,
        "resolution",
      ),
    ],
    agreedAt: nowIso(),
  };
}

export function buildGenericRoadmap(
  oneLiner: string,
  milestones: Array<{
    weekStart: number;
    weekEnd: number;
    title: string;
    actions: string[];
    ownerHint: string;
    doneWhen: string;
  }>,
): import("./types").ExecutionRoadmap {
  return {
    roadmapId: createId("road"),
    status: "ready",
    horizonDays: 90,
    positioningOneLiner: oneLiner,
    milestones: milestones.map((m) => ({
      ...m,
      milestoneId: createId("ms"),
    })),
    generatedAt: nowIso(),
  };
}
