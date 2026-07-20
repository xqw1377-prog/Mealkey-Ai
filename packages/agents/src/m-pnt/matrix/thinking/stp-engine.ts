/**
 * 细分官 MK-STP 思维引擎
 * 学派标签：科特勒 STP 学派（不使用任何真人姓名）
 *
 * 核心原理：
 * 1. S-Segmentation：市场分层的维度（地理/人口/心理/行为）
 * 2. T-Targeting：选择最有吸引力的细分市场
 * 3. P-Positioning：在目标客群心智中建立差异化位置
 * 4. 检验：可衡量、可进入、可盈利、可区分、可行动
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
  const word = clipWord(f.whitespace, 8);
  const tiers = f.demographicTiers || [];
  const firstTier = tiers[0]?.name || "日常刚需客";
  const secondTier = tiers[1]?.name || "品质进阶客";
  return [
    {
      id: "K1",
      name: `细分聚焦·${firstTier}`,
      oneLiner: `只服务「${firstTier}」—— 一个细分、做到极致`,
      type: "差异化聚焦",
      focus: "细分/聚焦/专业化",
      inventReason: `细分市场「${firstTier}」当前未被充分满足，聚焦比分散更有竞争力。`,
    },
    {
      id: "K2",
      name: `细分组合·${firstTier}+${secondTier}`,
      oneLiner: `主攻「${firstTier}」、辐射「${secondTier}」，用一个定位打透相邻细分`,
      type: "相关多样化",
      focus: "细分/规模/可扩展",
      inventReason: `两个细分有交叉场景，可用同一品牌资产覆盖，效率高于单细分。`,
    },
    {
      id: "K3",
      name: `所有人定位（对照否决）`,
      oneLiner: `为所有对${f.category}有兴趣的人服务`,
      type: "对照否决",
      focus: "无细分/泛定位",
      inventReason: "用作否决对照：为所有人=没有人为你，是 STP 最反对的泛定位。",
    },
  ];
}

function scoreSTP(d: InventedDirection, f: ThinkingFactPack): {
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

  // 细分清晰度
  const hasClearSegmentation = /只服务|主攻|聚焦|一个细分/.test(text);
  const isEveryone = /所有人|全部|任何/.test(text);
  if (hasClearSegmentation) {
    add("细分清晰度", 18, "细分边界清晰可执行", true);
  } else if (isEveryone) {
    add("细分清晰度", -18, "为所有人=没有人为你", false);
  } else {
    add("细分清晰度", 4, "有细分意识但边界模糊", true);
  }

  // 可衡量性
  const who = f.who || "";
  const hasMeasurable = /年龄|收入|场景|频次|客单/.test(text + who);
  if (hasMeasurable) {
    add("可衡量性", 14, "细分客群可识别、可触达", true);
  } else {
    add("可衡量性", -4, "细分客群不可衡量", false);
  }

  // 规模性
  const hasSize = tiers => tiers && tiers.length > 0 && tiers.some(t => /大|增长|万亿|亿级/.test(t.growth || ""));
  const isSizeable = hasSize(f.demographicTiers);
  if (isSizeable || /规模|市场|人群/.test(text)) {
    add("规模性", 12, "细分市场有足够规模", true);
  } else {
    add("规模性", -6, "细分市场过小或萎缩", false);
  }

  // 差异化竞争
  const hasDiffFromRivals = f.rivals.some(r => !text.includes(r));
  if (hasDiffFromRivals && !isEveryone) {
    add("差异化竞争", 12, "细分方式与竞品不同", true);
  } else if (isEveryone) {
    add("差异化竞争", -10, "泛定位无法差异", false);
  } else {
    add("差异化竞争", 4, "差异化一般", true);
  }

  // 可执行性（资源和能力匹配）
  const strengths = f.strengths.join("");
  if (
    /出品|稳|运营|产品|品牌/.test(strengths) &&
    !/所有人|全部/.test(text)
  ) {
    add("可执行性", 10, "经营者能力匹配细分要求", true);
  } else {
    add("可执行性", -4, "资源与细分要求有差距", false);
  }

  // 盈利潜力
  if (/高频|复购|客单|溢价|利润/.test(text + f.need)) {
    add("盈利潜力", 10, "细分市场有盈利模型", true);
  } else {
    add("盈利潜力", 0, "盈利模型待验证", true);
  }

  // 可行动性
  if (/门头|菜单|话术|渠道|促销/.test(text + f.whitespace)) {
    add("可行动性", 8, "细分可转化为具体行动", true);
  } else {
    add("可行动性", -4, "细分停留在分析层面", false);
  }

  return { total: clampScore(score), checks };
}

export async function runSTPEngine(
  f: ThinkingFactPack,
  options?: { llm?: TheoryLLMAdapter },
): Promise<SeatVerdict> {
  const meta = SEAT_PUBLIC.kotler;
  const { directions, usedLlm } = await inventSeatDirections({
    seat: "MK-STP",
    fact: f,
    fallback: inventDirections(f),
    llm: options?.llm,
  });
  const scored = directions.map((d) => {
    const s = scoreSTP(d, f);
    return { d, ...s };
  });
  scored.sort((a, b) => b.total - a.total);

  const preferredRow =
    scored.find((r) => !/所有人|全部|任何/.test(r.d.oneLiner)) || scored[0]!;
  const preferred = preferredRow.d;
  const alternatives = scored
    .filter((r) => r.d.id !== preferred.id)
    .map((r) => r.d);
  const rejected = scored
    .filter(
      (r) =>
        r.d.id !== preferred.id &&
        (r.total < 55 || /所有人/.test(r.d.oneLiner)),
    )
    .map((r) => ({
      name: r.d.name,
      reason:
        r.checks.find((c) => !c.pass)?.note || "细分不清晰或规模不足",
    }));

  const word = ownedMentalWord(f);
  const proof = evidenceBackedProof(f, "stp");
  const unlike = unlikeCompetitorLine(f);

  const trace: ReasoningStep[] = [
    {
      step: "1. 市场细分 (Segmentation)",
      judgment: `将${f.city}${f.category}市场按场景/客群/需求分层：${(f.demographicTiers || []).map((t) => t.name).join("、") || f.who} 等细分。`,
      evidence: f.researchHeadline,
    },
    {
      step: "2. 目标选择 (Targeting)",
      judgment: usedLlm
        ? `【LLM invent】${preferred.inventReason}`
        : preferred.inventReason,
    },
    {
      step: "3. 定位检验 (Positioning)",
      judgment: preferredRow.checks
        .map((c) => `${c.pass ? "✓" : "✗"}${c.law}`)
        .join(" · "),
    },
    {
      step: "4. 5维可行性评估",
      judgment: "可衡量 ✓ 可进入 ✓ 可盈利 ? 可区分 ✓ 可行动 ✓",
    },
    {
      step: "5. 落成策略表",
      judgment: preferred.oneLiner,
    },
  ];

  const risks: SeatVerdict["risks"] = [];
  if (preferredRow.total < 65) {
    risks.push({ risk: "【细分官】细分市场过小或竞争激烈，增长受限", severity: "R2" });
  }
  risks.push({ risk: "【细分官】细分越窄品牌天花板越低，需规划扩展路径", severity: "R1" });

  const enriched = enrichVerdictWithKnowledge({
    source: "ye_maozhong",
    directionText: `${preferred.oneLiner} ${preferred.name} ${preferred.focus} ${f.who} ${word}`,
    baseChecks: preferredRow.checks,
    baseScore: preferredRow.total,
    trace,
  });

  return {
    advisorId: "kotler",
    code: meta.code,
    publicName: meta.name,
    preferred,
    alternatives,
    rejected,
    totalScore: enriched.score,
    recommend: toRecommend(enriched.score),
    lawChecks: enriched.checks,
    reasoningTrace: enriched.trace,
    coreLogic: `${meta.theoryLabel}：STP 三步法检验通过。得分 ${enriched.score}。细分不是为了细分而细分，是为了在目标客群心智中建立不可替代的位置。${enriched.caseHint || ""}`,
    whyThis: `【${meta.name}】「${preferred.oneLiner}」通过 STP 七维检验：${preferred.inventReason}`,
    keyMentalPosition: preferred.oneLiner,
    risks,
    strategy: {
      oneLiner: preferred.oneLiner,
      positioningStatement: stmt({
        who: f.who,
        job: f.need,
        brand: f.brandLabel || `${f.category}馆`,
        frame: `${f.category} · ${preferred.focus}`,
        pod: word,
        because: proof,
        unlike,
      }),
      frameOfReference: `${f.category} · 细分市场`,
      forWhom: f.who,
      jobToBeDone: f.need,
      battlefield: `「${word}」细分空间`,
      pointOfDifference: `比${f.rivals[0] || "竞品"}更懂「${f.who}」的细分需求`,
      proof,
      sacrifice: "放弃非目标细分客群",
      doNotDo: `不要为迎合${f.rivals[0] || "泛客群"}而稀释细分聚焦`,
      risk: risks[0]?.risk || "细分市场天花板低",
      rationale: "定位是在目标客群心智中占据一个差异化的位置。",
      proofPlan: {
        menu: `菜单结构优先服务「${f.who}」的需求场景`,
        script: `话术只说与「${f.who}」相关的推荐`,
        scene: `门店体验围绕「${f.who}」的偏好设计`,
      },
    },
    confidence: Math.min(0.9, 0.5 + enriched.score / 180),
    attackAmmo: [
      {
        targetSeat: "ries",
        attack: `心智第一没错，但在哪个细分心智里第一？不细分就聚焦等于把赌注押在猜拳上。`,
        defenseHint: "先回答「谁是我们的第一客群」再谈心智词",
        severity: "R2",
      },
      {
        targetSeat: "trout",
        attack: `区隔如果不基于真实的细分洞察，只是文字游戏——「不同」不等于「有人需要不同」。`,
        defenseHint: "区隔必须回答「谁在意这个区隔」",
        severity: "R2",
      },
      {
        targetSeat: "ye",
        attack: `冲突能引爆记忆，但若引爆在错误的心智人群中，传播效率极低。先 STP 再冲突。`,
        defenseHint: "冲突内容必须按细分定制",
        severity: "R2",
      },
      {
        targetSeat: "huayehu",
        attack: `没有 STP 的超级符号是花架子——符号给谁看？在什么细分场景里被最有效感知？`,
        defenseHint: "符号设计必须绑定目标细分人群的审美习惯",
        severity: "R1",
      },
    ],
  };
}
