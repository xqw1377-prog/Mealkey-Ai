/**
 * 增长官 MK-GROWTH 思维引擎
 * 学派标签：增长飞轮学派（不使用任何真人姓名）
 *
 * 核心原理：
 * 1. 增长飞轮：获客→激活→留存→推荐→收入循环
 * 2. 每个环节优化都能加速飞轮
 * 3. Unit Economics 是增长的基础（LTV > CAC）
 * 4. 增长不是烧钱，是找到飞轮的最小加速单元
 * 5. 餐饮增长三引擎：复购率、客单价、翻台率
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
  rivalContrastLine,
} from "./fact-evidence";
import type { TheoryLLMAdapter } from "../types";

function inventDirections(f: ThinkingFactPack): InventedDirection[] {
  const word = clipWord(f.whitespace, 8);
  const levers = f.growthLevers || ["复购", "客单价", "翻台"];
  const lever1 = levers[0] || "复购";
  const lever2 = levers[1] || "客单价";
  return [
    {
      id: "G1",
      name: `飞轮加速·${lever1}优先`,
      oneLiner: `以「${lever1}」为飞轮轴心，驱动${lever2}与翻台同步增长`,
      type: "飞轮增长",
      focus: "复利/飞轮/循环",
      inventReason: `在餐饮增长三引擎（复购率/客单价/翻台率）中，「${lever1}」是最优启动杠杆，带动其他环节正向循环。`,
    },
    {
      id: "G2",
      name: `单店模型复制`,
      oneLiner: `先打造「${f.city}${word}」单店飞轮，验证 UE 后再复制`,
      type: "规模增长",
      focus: "UE/复制/规模化",
      inventReason: `单店经济模型（Unit Economics）跑通前不要扩张。先让一家店飞轮转起来。`,
    },
    {
      id: "G3",
      name: `烧钱冲规模（对照否决）`,
      oneLiner: `先烧钱开 10 家店，用规模换品牌认知`,
      type: "对照否决",
      focus: "烧钱/泡沫/不可持续",
      inventReason: "用作否决对照：餐饮是现金流生意，烧钱冲规模大部分死在 UE 跑通之前。",
    },
  ];
}

function scoreGrowth(d: InventedDirection, f: ThinkingFactPack): {
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

  // 飞轮完整性（获客→激活→留存→推荐→收入）
  const hasFlywheel = /复购|留存|推荐|转介绍|口碑|收入|LTV/.test(text);
  const hasBurn = /烧钱|冲|规模|数量/.test(text) && !/模型|UE|单店/.test(text);

  if (hasFlywheel && !hasBurn) {
    add("飞轮完整性", 18, "有完整增长闭环设计", true);
  } else if (hasBurn) {
    add("飞轮完整性", -16, "烧钱冲规模不是增长", false);
  } else if (hasFlywheel) {
    add("飞轮完整性", 10, "有部分飞轮元素", true);
  } else {
    add("飞轮完整性", -6, "缺少增长闭环设计", false);
  }

  // 杠杆效率（是否找到最小加速单元）
  const levers = f.growthLevers || [];
  const hasLever = levers.length > 0 && levers.some((l) => text.includes(l));
  if (hasLever) {
    add("杠杆效率", 14, "找到了具体的增长杠杆", true);
  } else if (/飞轮|增长|加速/.test(text)) {
    add("杠杆效率", 6, "有增长意识但杠杆不具体", true);
  } else {
    add("杠杆效率", -6, "没有具体的增长杠杆", false);
  }

  // Unit Economics 意识
  const hasUE = /单店|UE|模型|成本|利润|LTV|CAC|回收期/.test(text);
  if (hasUE) {
    add("单位经济", 14, "有 UE 意识，增长可计算", true);
  } else if (/飞轮|增长/.test(text)) {
    add("单位经济", 4, "缺 UE 计算会蒙眼跑步", true);
  } else {
    add("单位经济", -4, "没有经济模型支撑", false);
  }

  // 可验证性（增长假设能否在30天内验证）
  if (/复购|频次|回访|口碑|转介绍/.test(text)) {
    add("可验证性", 12, "增长假设可在 30 天内验证", true);
  } else if (/规模|复制/.test(text)) {
    add("可验证性", 4, "规模验证需 3-6 个月", true);
  } else {
    add("可验证性", -4, "增长路径不可验证", false);
  }

  // 资源匹配度
  const strengths = f.strengths.join("");
  const budget = f.brandBudget || 0;
  const hasResource = /运营|出品|稳|管理/.test(strengths);
  if (hasResource && !hasBurn) {
    add("资源匹配", 10, "增长路径与资源匹配", true);
  } else if (hasBurn && budget < 200) {
    add("资源匹配", -10, "资源不够支撑烧钱规模", false);
  } else {
    add("资源匹配", 4, "增长资源基本匹配", true);
  }

  // 可防御性（增长优势能否持续）
  if (/品牌|文化|习惯|锁定|会员|复购|体系/.test(text)) {
    add("增长防御性", 10, "增长有飞轮式防御", true);
  } else if (/规模|开店/.test(text)) {
    add("增长防御性", 2, "靠规模防御成本高", true);
  } else {
    add("增长防御性", -4, "增长优势易被跟进", false);
  }

  // 飞轮方向（正向/负向）
  if (/复利|正向|循环|加速/.test(text)) {
    add("飞轮方向", 8, "正向飞轮设计", true);
  } else {
    add("飞轮方向", 0, "飞轮方向待检验", true);
  }

  return { total: clampScore(score), checks };
}

export async function runGrowthEngine(
  f: ThinkingFactPack,
  options?: { llm?: TheoryLLMAdapter },
): Promise<SeatVerdict> {
  const meta = SEAT_PUBLIC.growth;
  const { directions, usedLlm } = await inventSeatDirections({
    seat: "MK-GROWTH",
    fact: f,
    fallback: inventDirections(f),
    llm: options?.llm,
  });
  const scored = directions.map((d) => {
    const s = scoreGrowth(d, f);
    return { d, ...s };
  });
  scored.sort((a, b) => b.total - a.total);

  const preferredRow =
    scored.find((r) => !/烧钱|冲规模/.test(r.d.oneLiner)) || scored[0]!;
  const preferred = preferredRow.d;
  const alternatives = scored
    .filter((r) => r.d.id !== preferred.id)
    .map((r) => r.d);
  const rejected = scored
    .filter(
      (r) =>
        r.d.id !== preferred.id &&
        (r.total < 55 || /烧钱/.test(r.d.oneLiner)),
    )
    .map((r) => ({
      name: r.d.name,
      reason:
        r.checks.find((c) => !c.pass)?.note || "增长路径不可持续或不可验证",
    }));

  const word = ownedMentalWord(f);
  const levers = f.growthLevers || ["复购", "客单价", "翻台"];
  const proof = evidenceBackedProof(f, "growth");
  const unlike = unlikeCompetitorLine(f);

  const trace: ReasoningStep[] = [
    {
      step: "1. 飞轮诊断",
      judgment: `${f.category}品类增长三引擎：复购率 ${f.rivals[0] || "竞品"}约占高频，客单价和翻台有优化空间。`,
      evidence: f.researchHeadline,
    },
    {
      step: "2. 确定飞轮轴心",
      judgment: usedLlm
        ? `【LLM invent】${preferred.inventReason}`
        : preferred.inventReason,
    },
    {
      step: "3. 增长假设检验",
      judgment: preferredRow.checks
        .map((c) => `${c.pass ? "✓" : "✗"}${c.law}`)
        .join(" · "),
    },
    {
      step: "4. 最小验证路径",
      judgment: `30 天内验证：${levers[0]}变化能否带动${levers[1] || "收入"}改善。`,
    },
    {
      step: "5. 落成策略表",
      judgment: preferred.oneLiner,
    },
  ];

  const risks: SeatVerdict["risks"] = [];
  if (preferredRow.total < 65) {
    risks.push({
      risk: "【增长官】飞轮设计有理论缺陷或杠杆偏弱",
      severity: "R2",
    });
  }
  risks.push({
    risk: "【增长官】增长飞轮假设需30天最小验证，否则停留于策略",
    severity: "R1",
  });

  const enriched = enrichVerdictWithKnowledge({
    source: null,
    directionText: `${preferred.oneLiner} ${preferred.name} ${preferred.focus} ${levers.join(" ")} ${word}`,
    baseChecks: preferredRow.checks,
    baseScore: preferredRow.total,
    trace,
  });

  return {
    advisorId: "growth",
    code: meta.code,
    publicName: meta.name,
    preferred,
    alternatives,
    rejected,
    totalScore: enriched.score,
    recommend: toRecommend(enriched.score),
    lawChecks: enriched.checks,
    reasoningTrace: enriched.trace,
    coreLogic: `${meta.theoryLabel}：增长是飞轮不是烧钱。得分 ${enriched.score}。找到最小加速单元，让增长形成复利循环。${enriched.caseHint || ""}`,
    whyThis: `【${meta.name}】「${preferred.oneLiner}」通过飞轮七维检验：${preferred.inventReason}`,
    keyMentalPosition: preferred.oneLiner,
    risks,
    strategy: {
      oneLiner: preferred.oneLiner,
      positioningStatement: stmt({
        who: f.who,
        job: `持续选择并推荐${f.brandLabel || "本店"}`,
        brand: f.brandLabel || `${f.category}馆`,
        frame: `${f.category} · 增长飞轮`,
        pod: `飞轮轴心「${levers[0]}」`,
        because: proof,
        unlike,
      }),
      frameOfReference: `${f.category} · 可持续增长`,
      forWhom: f.who,
      jobToBeDone: `从尝鲜到复购到推荐`,
      battlefield: `增长飞轮：${levers.join("→")}`,
      pointOfDifference: `以「${levers[0]}」为飞轮轴心，不是烧钱换规模`,
      proof,
      sacrifice: "放弃短期烧钱扩张、放弃低效拉新渠道",
      doNotDo: `不要在没有 UE 验证前扩张到 ${f.rivals[0] || "竞品"} 的规模`,
      risk: risks[0]?.risk || "飞轮启动慢",
      rationale: "增长飞轮的每圈都在积累品牌资产和用户习惯。",
      proofPlan: {
        menu: `设计 1-2 款「高频复购锚点菜」带动到店频次`,
        script: `引导储值/会员，把一次客转化为留存客`,
        scene: `桌边物料设计转介绍机制：带朋友来->双方获益`,
      },
    },
    confidence: Math.min(0.9, 0.5 + enriched.score / 180),
    attackAmmo: [
      {
        targetSeat: "ries",
        attack: `心智第一很好，但每天没有复购飞轮在转，心智记忆会随时间衰减。`,
        defenseHint: "心智词必须有复购触点支撑",
        severity: "R2",
      },
      {
        targetSeat: "trout",
        attack: `区隔做出来了，但没有飞轮把区隔转化为复购行为，区隔只是海报上的文字。`,
        defenseHint: "区隔必须设计复购闭环",
        severity: "R2",
      },
      {
        targetSeat: "ye",
        attack: `冲突能引爆进店，但冲突之后靠什么让客人反复来？没有留存引擎的增长是漏水的桶。`,
        defenseHint: "冲突事件后接留存飞轮",
        severity: "R2",
      },
      {
        targetSeat: "huayehu",
        attack: `符号降低了识别成本，但没有增长数据支撑，符号的 ROI 无法衡量。`,
        defenseHint: "符号效果必须用增长指标量化",
        severity: "R1",
      },
      {
        targetSeat: "kotler",
        attack: `STP 找到了正确的细分，但没有增长引擎，再好的细分也做不大。`,
        defenseHint: "细分策略必须绑定增长飞轮设计",
        severity: "R1",
      },
    ],
  };
}
