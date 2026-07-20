/**
 * 冲突官 MK-CLASH 思维引擎
 * 学派标签：冲突营销（不使用任何真人姓名）
 *
 * 思维链：旧选择痛点 → 新旧对立 → 冲突层次 → 记忆点 → 30天成交验证 → 策略表
 */
import {
  SEAT_PUBLIC,
  clampScore,
  clipWord,
  stmt,
  toRecommend,
  type InventedDirection,
  type LawCheck,
  type ReasoningStep,
  type SeatVerdict,
  type ThinkingFactPack,
} from "./protocol";
import { enrichVerdictWithKnowledge } from "./knowledge-bridge";
import { inventSeatDirections } from "./llm-invent";
import {
  evidenceBackedProof,
  ownedMentalWord,
  unlikeCompetitorLine,
} from "./fact-evidence";
import type { TheoryLLMAdapter } from "../types";

function inventDirections(f: ThinkingFactPack): InventedDirection[] {
  const word = clipWord(f.whitespace, 10);
  const need = f.need || "吃得放心";
  return [
    {
      id: "C1",
      name: `场合冲突·${f.who}`,
      oneLiner: `打破「赌运气」聚餐，让${f.who}感到「${need}」当场兑现`,
      type: "情绪场景",
      focus: "冲突/场景/传播",
      inventReason: `旧选择常让人赌运气；新选择必须在进店当场解决「${need}」的场面冲突。`,
    },
    {
      id: "C2",
      name: `社会冲突·面子场合`,
      oneLiner: `不再怕在朋友/家人面前「选错店」，只选能兑现「${word}」的馆`,
      type: "社会冲突",
      focus: "面子/社交/记忆",
      inventReason: `社会层冲突传播力更强：怕丢面子比怕不好吃更能驱动决策。`,
    },
    {
      id: "C3",
      name: `假大空·重新定义行业`,
      oneLiner: `重新定义${f.category}行业，颠覆一切旧选择`,
      type: "假大空（对照否决）",
      focus: "颠覆/重新定义",
      inventReason: `用作否决对照：冲突级别超过资源=假大空。`,
    },
  ];
}

function scoreClash(d: InventedDirection, f: ThinkingFactPack): {
  total: number;
  checks: LawCheck[];
} {
  const text = `${d.oneLiner}${d.name}${d.focus}`;
  const checks: LawCheck[] = [];
  let score = 46;
  const add = (law: string, delta: number, note: string, pass: boolean) => {
    score += delta;
    checks.push({ law, pass, delta, note });
  };

  const hasConflict = /冲突|对立|打破|不|只|反对|颠覆|而非|不做|拒绝|赌运气|选错/.test(
    text,
  );
  const hasPain = /痛|烦|累|贵|难|慢|差|不够|没有|赌运气|怕|担心/.test(
    text + f.need + f.consumerShift,
  );

  if (hasConflict && hasPain) {
    add("冲突点", 20, "对立结构 + 真实痛点", true);
  } else if (hasConflict) {
    add("冲突点", 12, "有对立缺痛点描述", true);
  } else {
    add("冲突点", -12, "没有可感知冲突", false);
  }

  if (/面子|朋友|家人|社交|圈子|选错/.test(text)) {
    add("冲突层次", 16, "社会冲突，传播力强", true);
  } else if (/怕|担心|焦虑|纠结/.test(text)) {
    add("冲突层次", 12, "心理冲突", true);
  } else if (/场景|聚餐|场合|进店/.test(text)) {
    add("冲突层次", 10, "场景冲突", true);
  } else {
    add("冲突层次", -4, "层次不清", false);
  }

  const left = /放心|干净|可预期|品质|方便|健康/.test(text + f.need);
  const right = /场面|兑现|记忆|家|温暖|态度|喜欢/.test(text + f.need);
  if (left && right) {
    add("左右脑", 12, "理性理由 + 情感共鸣", true);
  } else if (left || right) {
    add("左右脑", 6, "单脑维度，可再补一维", true);
  } else {
    add("左右脑", -6, "既无购买理由也无共鸣", false);
  }

  if (d.oneLiner.length < 32 && hasConflict) {
    add("记忆点", 12, "短句冲突，可记", true);
  } else if (d.oneLiner.length < 40) {
    add("记忆点", 5, "偏长仍可记", true);
  } else {
    add("记忆点", -6, "太长记不住", false);
  }

  if (/打破|再也不|赌运气|选错|当场/.test(text)) {
    add("传播力", 10, "有话题钩子", true);
  } else {
    add("传播力", 2, "话题性一般", true);
  }

  if (/场景|场合|聚餐|进店|家庭|谁/.test(text + f.who)) {
    add("成交驱动", 12, "绑到到店/场合动作", true);
  } else {
    add("成交驱动", -4, "缺行动引导", false);
  }

  const fake = /重新定义|颠覆行业|改变世界/.test(text);
  if (fake && f.strengths.length < 1) {
    add("真实可落", -16, "冲突超过资源，假大空", false);
  } else if (fake) {
    add("真实可落", -4, "高调冲突需供给硬撑", false);
  } else {
    add("真实可落", 10, "冲突与资源匹配", true);
  }

  if (f.edge) {
    add("30天可验", 8, `可用「${f.edge.slice(0, 12)}」做进店验证`, true);
  } else {
    add("30天可验", -6, "缺少可验锚点", false);
  }

  return { total: clampScore(score), checks };
}

export async function runClashEngine(
  f: ThinkingFactPack,
  options?: { llm?: TheoryLLMAdapter },
): Promise<SeatVerdict> {
  const meta = SEAT_PUBLIC.ye;
  const { directions, usedLlm } = await inventSeatDirections({
    seat: "MK-CLASH",
    fact: f,
    fallback: inventDirections(f),
    llm: options?.llm,
  });
  const scored = directions.map((d) => {
    const s = scoreClash(d, f);
    return { d, ...s };
  });
  scored.sort((a, b) => b.total - a.total);
  const preferredRow =
    scored.find((r) => !/重新定义|颠覆一切/.test(r.d.oneLiner)) || scored[0]!;
  const preferred = preferredRow.d;
  const alternatives = scored
    .filter((r) => r.d.id !== preferred.id)
    .map((r) => r.d);
  const rejected = scored
    .filter(
      (r) =>
        r.d.id !== preferred.id &&
        (r.total < 55 || /重新定义|颠覆/.test(r.d.oneLiner)),
    )
    .map((r) => ({
      name: r.d.name,
      reason:
        r.checks.find((c) => !c.pass)?.note ||
        "冲突不清、记不住或短期做不动",
    }));

  const word = ownedMentalWord(f);
  const brand = `${f.category}馆`;
  const proof = evidenceBackedProof(f, "clash");
  const unlike = unlikeCompetitorLine(f);

  const trace: ReasoningStep[] = [
    {
      step: "1. 旧选择痛点",
      judgment: `${f.who}在关键场合常遇到：现有选择让人「赌运气」，「${f.need}」无法当场兑现。`,
      evidence: f.consumerShift,
    },
    {
      step: "2. 制造新旧对立",
      judgment: usedLlm
        ? `【LLM invent】${preferred.inventReason}`
        : preferred.inventReason,
    },
    {
      step: "3. 冲突层次与记忆点",
      judgment: preferredRow.checks
        .filter((c) => /冲突|记忆|层次/.test(c.law))
        .map((c) => `${c.law}:${c.note}`)
        .join("；"),
    },
    {
      step: "4. 30天成交验证",
      judgment: "场合套餐 + 迎客句必须本周可上；否则冲突是广告腔。",
    },
    {
      step: "5. 落成策略表",
      judgment: preferred.oneLiner,
    },
  ];

  const risks: SeatVerdict["risks"] = [
    {
      risk: "【冲突官】情绪无产品锚点 → 广告腔，进店就塌",
      severity: "R2",
    },
  ];
  if (preferredRow.total < 62) {
    risks.unshift({
      risk: "【冲突官】冲突点偏弱，可能记不住也传不开",
      severity: "R3",
    });
  }

  const enriched = enrichVerdictWithKnowledge({
    source: "ye_maozhong",
    directionText: `${preferred.oneLiner} ${preferred.name} ${preferred.focus} ${f.need} ${f.who}`,
    baseChecks: preferredRow.checks,
    baseScore: preferredRow.total,
    trace,
  });

  return {
    advisorId: "ye",
    code: meta.code,
    publicName: meta.name,
    preferred,
    alternatives,
    rejected,
    totalScore: enriched.score,
    recommend: toRecommend(enriched.score),
    lawChecks: enriched.checks,
    reasoningTrace: enriched.trace,
    coreLogic: `${meta.theoryLabel}：没有冲突就没有记忆。得分 ${enriched.score}。冲突必须能传播、能进店、能在30天验证。${enriched.caseHint || ""}`,
    whyThis: `【${meta.name}】「${preferred.oneLiner}」冲突维度+蒸馏知识最优：${preferred.inventReason}`,
    keyMentalPosition: preferred.oneLiner,
    risks,
    strategy: {
      oneLiner: `让${f.who}在「关键一顿」里感到「${f.need}」被当场兑现`,
      positioningStatement: stmt({
        who: f.who,
        job: f.need,
        brand,
        frame: "场景情绪型餐饮",
        pod: `场合冲突被解决：${f.need}`,
        because: proof,
        unlike,
      }),
      frameOfReference: "场景 · 情绪冲突",
      forWhom: f.who,
      jobToBeDone: f.need,
      battlefield: `${f.who}的关键场合`,
      pointOfDifference: `卖的是场面被兑现，不是菜名更花`,
      proof,
      sacrifice: "放弃功能参数堆砌与黑话传播",
      doNotDo: "不要只讲中央厨房/供应链；客人听不懂也不想记",
      risk: risks[0]!.risk,
      rationale: "没有冲突就没有记忆；冲突必须能进店验证。",
      proofPlan: {
        menu: `设计 1 个「场合套餐」直接对应「${f.need}」`,
        script: `迎客句只问场合，不问「几位吃点啥」的空话`,
        scene: `桌边物料写清：这顿解决什么场面（锚点：${word}）`,
      },
    },
    confidence: Math.min(0.9, 0.5 + enriched.score / 170),
    attackAmmo: [
      {
        targetSeat: "ries",
        attack: `词对了，但${f.who}进店要的是场面——「${f.need}」。没有场合套餐和迎客句，词是空的。`,
        defenseHint: "心智词必须绑定可验场合动作",
        severity: "R3",
      },
      {
        targetSeat: "trout",
        attack: `区隔若只有对照话术、没有场合兑现，客人进店仍会觉得「说得不一样，吃起来一样」。`,
        defenseHint: "区隔菜 + 场合证明同时上",
        severity: "R2",
      },
    ],
  };
}
