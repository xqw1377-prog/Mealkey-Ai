/**
 * 文化官 MK-CULTURE 思维引擎
 * 学派标签：文化战略学派（Douglas Holt 文化品牌理论）
 *
 * 核心原理：
 * 1. 品牌成为文化符号的核心是解决社会矛盾
 * 2. 文化品牌不是满足需求，是表达意识形态
 * 3. 文化战略四步：社会矛盾→意识形态→文化品牌→神话故事
 * 4. 餐饮天然是文化载体：吃什么=我是谁
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
  const contradiction = f.socialContradiction || "快节奏下的品质缺失";
  const consumerShift = f.consumerShift || "从性价比到心价比";
  return [
    {
      id: "U1",
      name: `文化神话·${word}`,
      oneLiner: `在「${contradiction}」的社会矛盾中，让${f.brandLabel || "本店"}成为「${word}」的文化符号`,
      type: "文化品牌",
      focus: "文化/神话/意识形态",
      inventReason: `社会矛盾「${contradiction}」是当代人的真实焦虑，品牌可以成为解决这一矛盾的仪式场所。`,
    },
    {
      id: "U2",
      name: `文化部落·${f.who}`,
      oneLiner: `让「${f.who}」因为${f.brandLabel || "在这里吃饭"}而感到「属于某个群体」`,
      type: "文化部落",
      focus: "族群/归属/身份",
      inventReason: `${f.who} 在 ${consumerShift} 的背景下寻找身份认同，品牌成为他们的文化归属标记。`,
    },
    {
      id: "U3",
      name: `文化挪用（对照否决）`,
      oneLiner: `把传统文化符号直接贴在产品上`,
      type: "对照否决",
      focus: "文化挪用/表面化",
      inventReason: "用作否决对照：文化不是贴标签，应该回应当下社会的真实矛盾。",
    },
  ];
}

function scoreCulture(d: InventedDirection, f: ThinkingFactPack): {
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

  // 社会矛盾的真实性
  const contradiction = f.socialContradiction || "";
  const shift = f.consumerShift || "";
  const hasRealContradiction = /焦虑|矛盾|冲突|缺失|过载|压力|快|慢/.test(
    text + contradiction + shift,
  );
  const isSurface = /贴标签|直接|传统符号/.test(text);

  if (hasRealContradiction && !isSurface) {
    add("社会矛盾真实性", 20, "回应真实的社会/文化矛盾", true);
  } else if (isSurface) {
    add("社会矛盾真实性", -16, "文化挪用、表面化处理", false);
  } else if (hasRealContradiction) {
    add("社会矛盾真实性", 10, "触及了矛盾但不够深刻", true);
  } else {
    add("社会矛盾真实性", -8, "没有触及真实矛盾", false);
  }

  // 意识形态表达
  if (/身份|归属|我是|我们|立场|态度/.test(text)) {
    add("意识形态表达", 16, "品牌代表了某种生活立场", true);
  } else if (/文化|符号|部落/.test(text)) {
    add("意识形态表达", 10, "有文化意识但立场不鲜明", true);
  } else {
    add("意识形态表达", -6, "缺乏可感知的意识形态", false);
  }

  // 文化仪式感
  if (/仪式|习惯|每次|日常|打卡|朝圣/.test(text + f.need)) {
    add("文化仪式感", 14, "品牌消费成为一种仪式", true);
  } else if (/场景|场合|体验/.test(text)) {
    add("文化仪式感", 8, "有场景意识但仪式感不足", true);
  } else {
    add("文化仪式感", -4, "缺少仪式感设计", false);
  }

  // 文化复利（品牌资产随文化传播增值）
  if (/符号|资产|长期|积累|重复|加深/.test(text)) {
    add("文化复利", 12, "文化资产随时间增值", true);
  } else if (/品牌/.test(text)) {
    add("文化复利", 6, "有品牌意识", true);
  } else {
    add("文化复利", -4, "缺少长期文化资产视角", false);
  }

  // 品位门槛（文化表达能否触达目标客群）
  const who = f.who || "";
  if (
    new RegExp(
      who.slice(0, 6).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    ).test(text)
  ) {
    add("品位门槛", 10, "文化表达与目标客群审美匹配", true);
  } else if (/大众|日常|烟火/.test(text)) {
    add("品位门槛", 8, "文化表达在舒适区", true);
  } else {
    add("品位门槛", -4, "文化表达可能曲高和寡", false);
  }

  // 可执行性（文化能否落地到可消费的体验）
  if (/菜单|产品|门店|音乐|视觉|活动/.test(text)) {
    add("可执行性", 10, "文化可映射到具体消费触点", true);
  } else {
    add("可执行性", -4, "文化停留在口号", false);
  }

  // 文化差异化（是否区别于竞品的文化表达）
  const hasUniqueCulturalCode = f.rivals.every(
    (r) => !text.includes(r),
  );
  if (hasUniqueCulturalCode && !isSurface) {
    add("文化差异化", 10, "文化表达区别于所有竞品", true);
  } else {
    add("文化差异化", -4, "文化表达与竞品同质", false);
  }

  return { total: clampScore(score), checks };
}

export async function runCultureEngine(
  f: ThinkingFactPack,
  options?: { llm?: TheoryLLMAdapter },
): Promise<SeatVerdict> {
  const meta = SEAT_PUBLIC.culture;
  const { directions, usedLlm } = await inventSeatDirections({
    seat: "MK-CULTURE",
    fact: f,
    fallback: inventDirections(f),
    llm: options?.llm,
  });
  const scored = directions.map((d) => {
    const s = scoreCulture(d, f);
    return { d, ...s };
  });
  scored.sort((a, b) => b.total - a.total);

  const preferredRow =
    scored.find((r) => !/挪用|贴标签|传统符号/.test(r.d.oneLiner)) ||
    scored[0]!;
  const preferred = preferredRow.d;
  const alternatives = scored
    .filter((r) => r.d.id !== preferred.id)
    .map((r) => r.d);
  const rejected = scored
    .filter(
      (r) =>
        r.d.id !== preferred.id &&
        (r.total < 55 || /挪用|贴标签/.test(r.d.oneLiner)),
    )
    .map((r) => ({
      name: r.d.name,
      reason:
        r.checks.find((c) => !c.pass)?.note || "文化表达肤浅或矛盾不真实",
    }));

  const contradiction = f.socialContradiction || "快与慢的冲突";
  const word = ownedMentalWord(f);
  const proof = evidenceBackedProof(f, "culture");
  const unlike = unlikeCompetitorLine(f);

  const trace: ReasoningStep[] = [
    {
      step: "1. 社会矛盾诊断",
      judgment: `当前社会矛盾→「${contradiction}」。${f.who}在「${f.consumerShift || "消费升级vs消费降级"}」中寻找身份表达。`,
      evidence: f.consumerShift || f.researchHeadline,
    },
    {
      step: "2. 意识形态定位",
      judgment: usedLlm
        ? `【LLM invent】${preferred.inventReason}`
        : preferred.inventReason,
    },
    {
      step: "3. 文化品牌检验",
      judgment: preferredRow.checks
        .map((c) => `${c.pass ? "✓" : "✗"}${c.law}`)
        .join(" · "),
    },
    {
      step: "4. 文化仪式与消费场景",
      judgment: `品牌消费成为${f.who}的文化仪式：吃${f.brandLabel || "本店"} = 一种身份声明。`,
    },
    {
      step: "5. 落成策略表",
      judgment: preferred.oneLiner,
    },
  ];

  const risks: SeatVerdict["risks"] = [];
  if (preferredRow.total < 65) {
    risks.push({ risk: "【文化官】文化表达不够锋利，可能沦为装饰", severity: "R2" });
  }
  risks.push({ risk: "【文化官】文化随时间变迁，品牌需定期迭代文化叙事", severity: "R1" });

  const enriched = enrichVerdictWithKnowledge({
    source: null,
    directionText: `${preferred.oneLiner} ${preferred.name} ${preferred.focus} ${contradiction} ${word}`,
    baseChecks: preferredRow.checks,
    baseScore: preferredRow.total,
    trace,
  });

  return {
    advisorId: "culture",
    code: meta.code,
    publicName: meta.name,
    preferred,
    alternatives,
    rejected,
    totalScore: enriched.score,
    recommend: toRecommend(enriched.score),
    lawChecks: enriched.checks,
    reasoningTrace: enriched.trace,
    coreLogic: `${meta.theoryLabel}：品牌成为文化符号，源于回应社会矛盾。得分 ${enriched.score}。吃什么=我是谁，品牌是一场可消费的文化仪式。${enriched.caseHint || ""}`,
    whyThis: `【${meta.name}】「${preferred.oneLiner}」文化战略七维最优：${preferred.inventReason}`,
    keyMentalPosition: preferred.oneLiner,
    risks,
    strategy: {
      oneLiner: `回应「${contradiction}」，让${f.brandLabel || "本店"}成为${f.who}的文化仪式`,
      positioningStatement: stmt({
        who: f.who,
        job: `通过吃什么表达「我是谁」`,
        brand: f.brandLabel || `${f.category}馆`,
        frame: `文化仪式 · ${contradiction}`,
        pod: `${word}文化符号`,
        because: proof,
        unlike,
      }),
      frameOfReference: `文化战略 · ${contradiction}`,
      forWhom: f.who,
      jobToBeDone: `身份表达 + 归属感`,
      battlefield: `社会矛盾「${contradiction}」中的文化位置`,
      pointOfDifference: `不是卖${f.category}，是贩卖一种文化立场`,
      proof,
      sacrifice: "放弃无文化立场的纯功能定位",
      doNotDo: `不要和文化趋势相反的方向做传播`,
      risk: risks[0]?.risk || "文化表达需持续投资",
      rationale: "最好的品牌成为消费者「我是谁」的表达。",
      proofPlan: {
        menu: `每一道菜都有文化叙事（本地食材/传统工艺/现代演绎）`,
        script: `店员不是点餐员，是文化讲解员`,
        scene: `门店设计成为文化仪式空间——消费者来打卡身份，不止打卡美食`,
      },
    },
    confidence: Math.min(0.9, 0.5 + enriched.score / 180),
    attackAmmo: [
      {
        targetSeat: "ries",
        attack: `心智第一没有意识形态土壤，变成空洞的排名——第一干什么的？`,
        defenseHint: "第一背后要有文化立场",
        severity: "R2",
      },
      {
        targetSeat: "trout",
        attack: `区隔如果不能表达文化差异，只是产品层面的换皮，竞品一个季度就能跟上。`,
        defenseHint: "文化区隔最不可复制",
        severity: "R2",
      },
      {
        targetSeat: "ye",
        attack: `冲突是文化矛盾的表层表现，没有深入到社会矛盾的冲突只是短期喧嚣。`,
        defenseHint: "把冲突升级为文化运动",
        severity: "R2",
      },
      {
        targetSeat: "huayehu",
        attack: `符号是文化的载体，但符号没有意识形态就是好看的皮囊。文化官给符号注入灵魂。`,
        defenseHint: "符号必须承载文化立场",
        severity: "R1",
      },
      {
        targetSeat: "kotler",
        attack: `STP 把人分成类，文化品牌让他们成为一群人。细分是分析工具，文化是归属感。`,
        defenseHint: "细分客群需要文化纽带",
        severity: "R1",
      },
      {
        targetSeat: "growth",
        attack: `飞轮让增长可计算，但消费者不是因为你的复购机制而忠诚，是因为你代表什么。`,
        defenseHint: "增长飞轮外包一层文化意义",
        severity: "R1",
      },
    ],
  };
}
