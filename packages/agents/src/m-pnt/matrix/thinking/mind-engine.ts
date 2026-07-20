/**
 * 心智官 MK-MIND 思维引擎
 * 学派标签：心智占位（不使用任何真人姓名）
 *
 * 思维链：心智阶梯诊断 → 造可占第一的方向 → 商规逐条检验 → 强制牺牲 → 策略表
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
  wordOwnershipClaim,
} from "./fact-evidence";
import type { TheoryLLMAdapter } from "../types";

function inventDirections(f: ThinkingFactPack): InventedDirection[] {
  const word = clipWord(f.whitespace, 10);
  const rival = f.rivals[0] || "同质馆";
  return [
    {
      id: "M1",
      name: `心智第一·${word}`,
      oneLiner: `只做「${word}」第一，不做大而全`,
      type: "心智占位",
      focus: "第一/聚焦/牺牲",
      inventReason: `空位「${word}」可被收成单一心智词；资源应押在成为第一联想，而非更好吃。`,
    },
    {
      id: "M2",
      name: `子品类第一·${f.category}${word}`,
      oneLiner: `开创「${f.category}里的${word}」子品类第一`,
      type: "品类分化",
      focus: "新品类/领先",
      inventReason: `正面品类阶梯可能拥挤；分化出子品类，比在旧阶梯爬升更容易成第一。`,
    },
    {
      id: "M3",
      name: `更好陷阱·全面升级`,
      oneLiner: `比${rival}更好吃、更全、更实惠`,
      type: "产品升级（对照否决）",
      focus: "更好/全面",
      inventReason: `用作否决对照：心智不认「更好」，只认「第一」。`,
    },
  ];
}

function scoreMind(d: InventedDirection, f: ThinkingFactPack): {
  total: number;
  checks: LawCheck[];
} {
  const text = `${d.oneLiner}${d.name}${d.focus}`;
  const checks: LawCheck[] = [];
  let score = 48;
  const add = (law: string, delta: number, note: string, pass: boolean) => {
    score += delta;
    checks.push({ law, pass, delta, note });
  };

  // 领先：第一 vs 更好
  if (/第一|只做|首选/.test(text) && !/更好|更全|更实惠/.test(text)) {
    add("领先法则", 16, "瞄准第一，而非更好", true);
  } else if (/更好|更优|升级/.test(text)) {
    add("领先法则", -18, "更好是陷阱，不能替代第一", false);
  } else {
    add("领先法则", -6, "第一性不足", false);
  }

  // 品类
  if (/子品类|开创|分化/.test(text)) {
    add("品类法则", 12, "有新品类/分化路径", true);
  } else if (/第一/.test(text)) {
    add("品类法则", 8, "在既有空位上争第一", true);
  } else {
    add("品类法则", -4, "品类定义不清", false);
  }

  // 聚焦
  if (/只|单一|一个词|不做大而全/.test(text) && d.oneLiner.length < 28) {
    add("聚焦法则", 14, "一句话极度聚焦", true);
  } else if (/大而全|全面|又.*又/.test(text)) {
    add("聚焦法则", -16, "大而全，心智记不住", false);
  } else {
    add("聚焦法则", 4, "聚焦一般", true);
  }

  // 专有
  if (/不|只|拒绝|不做/.test(text)) {
    add("专有法则", 10, "用「不/只」圈出专有空间", true);
  } else {
    add("专有法则", 0, "专有词是否已被占据待验", true);
  }

  // 对立
  if (/不做|不是|而非|对立/.test(text)) {
    add("对立法则", 10, "有明确对立面", true);
  } else {
    add("对立法则", -4, "对立不够锋利", false);
  }

  // 牺牲
  if (/只做|不做|放弃|牺牲/.test(text) || /不做大而全/.test(text)) {
    add("牺牲法则", 12, "明确放弃多卖点", true);
  } else {
    add("牺牲法则", -8, "未声明牺牲=什么都要", false);
  }

  // 心智可记
  if (d.oneLiner.length <= 22) {
    add("心智法则", 10, "短句易进心智", true);
  } else if (d.oneLiner.length <= 36) {
    add("心智法则", 4, "可记性一般", true);
  } else {
    add("心智法则", -6, "太长，心智拒绝", false);
  }

  // 阶梯
  if (/第一|子品类/.test(text)) {
    add("阶梯法则", 8, "瞄准阶梯顶端或新阶梯", true);
  } else {
    add("阶梯法则", -4, "阶梯位置模糊", false);
  }

  // 延伸风险
  if (/全面|多元|又.*又|延伸/.test(text)) {
    add("延伸法则", -10, "有延伸稀释风险", false);
  } else {
    add("延伸法则", 6, "单一概念，避免延伸", true);
  }

  // 资源匹配
  if (f.strengths.some((s) => /稳|出品|一线|品牌|运营/.test(s))) {
    add("资源匹配", 6, "供给可支撑心智承诺", true);
  } else {
    add("资源匹配", -4, "供给支撑偏弱", false);
  }

  // 空位是否虚
  if (!f.whitespace || f.whitespace.length < 4) {
    add("空位真实性", -8, "调研空位过虚，难成第一词", false);
  } else {
    add("空位真实性", 5, `空位「${clipWord(f.whitespace, 8)}」可收词`, true);
  }

  return { total: clampScore(score), checks };
}

export async function runMindEngine(
  f: ThinkingFactPack,
  options?: { llm?: TheoryLLMAdapter },
): Promise<SeatVerdict> {
  const meta = SEAT_PUBLIC.ries;
  const { directions, usedLlm } = await inventSeatDirections({
    seat: "MK-MIND",
    fact: f,
    fallback: inventDirections(f),
    llm: options?.llm,
  });
  const scored = directions.map((d) => {
    const s = scoreMind(d, f);
    return { d, ...s };
  });
  scored.sort((a, b) => b.total - a.total);

  // 强制：含「更好」的对照方向不得成为首选
  const preferredRow =
    scored.find((r) => !/更好|更全|更实惠/.test(r.d.oneLiner)) || scored[0]!;
  const preferred = preferredRow.d;
  const alternatives = scored
    .filter((r) => r.d.id !== preferred.id)
    .map((r) => r.d);
  const rejected = scored
    .filter((r) => r.total < 58 || /更好|更全/.test(r.d.oneLiner))
    .filter((r) => r.d.id !== preferred.id)
    .map((r) => ({
      name: r.d.name,
      reason: r.checks.find((c) => !c.pass)?.note || "未通过心智商规检验",
    }));

  const word = ownedMentalWord(f);
  const rival = f.rivals[0] || "同质馆";
  const brand = `${f.category}馆`;
  const proof = evidenceBackedProof(f, "mind");
  const unlike = unlikeCompetitorLine(f);

  const trace: ReasoningStep[] = [
    {
      step: "1. 心智阶梯诊断",
      judgment: `${f.city}${f.category}品类里，客人当前更可能记住「宽菜单/价格」而非「${word}」。`,
      evidence: f.competitiveLandscape || f.researchHeadline,
    },
    {
      step: "2. 造可占第一的方向",
      judgment: usedLlm
        ? `【LLM invent】${preferred.inventReason}`
        : preferred.inventReason,
    },
    {
      step: "3. 商规逐条检验",
      judgment: preferredRow.checks
        .map((c) => `${c.pass ? "✓" : "✗"}${c.law}`)
        .join(" · "),
    },
    {
      step: "4. 强制牺牲",
      judgment: `放弃多场景多卖点；对外只强化「${word}」一个词。`,
    },
    {
      step: "5. 落成策略表",
      judgment: `主轴收成：${preferred.oneLiner}`,
    },
  ];

  const risks: SeatVerdict["risks"] = [];
  if (preferredRow.total < 70) {
    risks.push({
      risk: "【心智官】第一性或聚焦仍偏弱，占位可能空心",
      severity: "R2",
    });
  }
  if (/更好/.test(preferred.oneLiner)) {
    risks.push({
      risk: "【心智官】仍在讲更好——心智不认，必须改写",
      severity: "R4",
    });
  }
  risks.push({
    risk: "【心智官】词太窄→短期来客不足；词太虚→占不住",
    severity: "R1",
  });

  const enriched = enrichVerdictWithKnowledge({
    source: "ries",
    directionText: `${preferred.oneLiner} ${preferred.name} ${preferred.focus} ${f.whitespace}`,
    baseChecks: preferredRow.checks,
    baseScore: preferredRow.total,
    trace,
  });

  return {
    advisorId: "ries",
    code: meta.code,
    publicName: meta.name,
    preferred,
    alternatives,
    rejected,
    totalScore: enriched.score,
    recommend: toRecommend(enriched.score),
    lawChecks: enriched.checks,
    reasoningTrace: enriched.trace,
    coreLogic: `${meta.theoryLabel}：宁占一个可强化的第一，不占多个模糊的第二。商规得分 ${enriched.score}。${enriched.caseHint || ""}`,
    whyThis: `【${meta.name}】「${preferred.oneLiner}」通过心智商规+蒸馏知识检验：${preferred.inventReason}`,
    keyMentalPosition: preferred.oneLiner,
    risks,
    strategy: {
      oneLiner: preferred.oneLiner.startsWith("客人")
        ? preferred.oneLiner
        : `客人脑中只记一个词：「${word}」`,
      positioningStatement: stmt({
        who: f.who,
        job: f.need,
        brand,
        frame: `${f.category} · 心智品类`,
        pod: `${word}第一`,
        because: proof,
        unlike,
      }),
      frameOfReference: `${f.category} · 心智品类`,
      forWhom: f.who,
      jobToBeDone: f.need,
      battlefield: word,
      pointOfDifference: `成为「${word}」的第一联想，而不是更好吃的${f.category}`,
      proof,
      sacrifice: "放弃多场景、多客群、多卖点同时喊",
      doNotDo: `不做「${rival}式」大而全；${wordOwnershipClaim(f)}`,
      risk: risks[0]?.risk || "占位执行空心",
      rationale: "定位是心智里的第一个名字，不是产品说明书。",
      proofPlan: {
        menu: `主推不超过 3 道，全部服务「${word}」联想`,
        script: `店员只准讲一个词：${word}`,
        scene: `进店第一眼（门头/桌签）只出现「${word}」`,
      },
    },
    confidence: Math.min(0.92, 0.55 + enriched.score / 200),
    attackAmmo: [
      {
        targetSeat: "trout",
        attack: `空位若收不成一个心智词，对照广告会散——区隔必须能被客人用一个词复述，否则不是占位。`,
        defenseHint: "把区隔压缩成可复述的第一词",
        severity: "R2",
      },
      {
        targetSeat: "ye",
        attack: `冲突能带来记忆，但没有第一位置的冲突只是喧嚣；必须先有可强化的心智词。`,
        defenseHint: "冲突服务心智词，而不是替代心智词",
        severity: "R2",
      },
      {
        targetSeat: "huayehu",
        attack: `符号能帮心智词进入眼睛，但心智词才是能进脑子的——符号官先回答：这个符号代表什么心智第一？`,
        defenseHint: "符号必须浓缩成一个心智词",
        severity: "R2",
      },
      {
        targetSeat: "kotler",
        attack: `STP 细分再精准，如果不能在目标客群心智中成为第一，细分只是个分析报告。`,
        defenseHint: "细分结论必须导向心智第一的行动",
        severity: "R1",
      },
      {
        targetSeat: "growth",
        attack: `增长飞轮转得再快，没有心智锚点的飞轮是空转——客人为什么回来？因为你在脑子里有位置。`,
        defenseHint: "飞轮必须有「第一词」作为锚点",
        severity: "R1",
      },
      {
        targetSeat: "culture",
        attack: `文化叙事让品牌有灵魂，但若不能在品类中成为第一联想，文化变成自嗨。先占住第一，再谈深度。`,
        defenseHint: "文化故事要服务心智第一的目标",
        severity: "R1",
      },
    ],
  };
}
