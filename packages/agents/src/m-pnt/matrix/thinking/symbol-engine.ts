/**
 * 符号官 MK-SYMBOL 思维引擎
 * 学派标签：超级符号 / 文化母体（不使用任何真人姓名）
 *
 * 核心原理：
 * 1. 品牌寄生在文化母体中，成为文化的一部分
 * 2. 超级符号是文化基因的视觉/听觉/语言触发器
 * 3. 品牌符号化成本最低的记忆和传播方式
 * 4. 文化母体越强大，品牌寄生越容易
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
  rivalContrastLine,
} from "./fact-evidence";
import type { TheoryLLMAdapter } from "../types";

function inventDirections(f: ThinkingFactPack): InventedDirection[] {
  const word = clipWord(f.whitespace, 8);
  const culturalCode = f.culturalCode || "日常烟火气";
  const existing = f.existingSymbols?.length
    ? f.existingSymbols[0]
    : "千篇一律的门头";
  const brand = f.brandLabel || `${f.category}馆`;
  return [
    {
      id: "S1",
      name: `文化母体·${culturalCode}`,
      oneLiner: `寄生在「${culturalCode}」里，让${brand}成为${f.city}的日常符号`,
      type: "文化寄生",
      focus: "符号/母体/寄生",
      inventReason: `文化母体「${culturalCode}」是消费者已有的认知习惯，品牌寄生成本最低、复利最强。`,
    },
    {
      id: "S2",
      name: `超级符号·${word}化`,
      oneLiner: `用一个「${word}」符号代替千言万语，${existing}vs「${word}」`,
      type: "超级符号",
      focus: "符号/视觉/听觉",
      inventReason: `在「${existing}」的竞品中，一个强符号能降低识别成本，让消费者闭眼选。`,
    },
    {
      id: "S3",
      name: `符号堆砌（对照否决）`,
      oneLiner: `把所有中国文化元素堆到品牌上`,
      type: "对照否决",
      focus: "符号堆砌/美学疲劳",
      inventReason: "用作否决对照：符号不是堆砌，是选择一个最有力的文化触发器反复强化。",
    },
  ];
}

function scoreSymbol(d: InventedDirection, f: ThinkingFactPack): {
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

  // 文化母体强度
  const culturalCode = f.culturalCode || "";
  const hasStrongMother = /日常|聚餐|回家|团圆|庆祝|烟火|深夜|加班/.test(
    text + culturalCode,
  );
  if (hasStrongMother) {
    add("文化母体强度", 18, "寄生在强文化母体上", true);
  } else if (/符号|文化|习俗/.test(text)) {
    add("文化母体强度", 10, "有文化依托但母体不够强", true);
  } else {
    add("文化母体强度", -8, "没有文化母体依附", false);
  }

  // 超级符号单一性
  if (/一个|单一|只|唯一/.test(text) && !/堆砌|多个|各种/.test(text)) {
    add("符号单一性", 16, "集中火力打一个符号", true);
  } else if (/堆砌|多种|各种|元素/.test(text)) {
    add("符号单一性", -14, "符号堆砌=没有符号", false);
  } else {
    add("符号单一性", 4, "符号化一般", true);
  }

  // 成本效益
  if (/降低|闭眼|一眼|本能|下意识/.test(text)) {
    add("成本效益", 14, "降低识别和传播成本", true);
  } else if (/符号/.test(text)) {
    add("成本效益", 6, "有符号意识", true);
  } else {
    add("成本效益", -4, "缺少成本思维", false);
  }

  // 可执行性（符号能否落地到门头/菜单/传播）
  const hasExecution = /门头|招牌|logo|颜色|声音|语言|动作|仪式/.test(
    text + (f.existingSymbols?.join("") || ""),
  );
  if (hasExecution) {
    add("可执行性", 12, "符号可落地到具体触点", true);
  } else if (/符号|视觉/.test(text)) {
    add("可执行性", 6, "符号有表现力但需细化触点", true);
  } else {
    add("可执行性", -6, "符号无法落地", false);
  }

  // 差异化（符号是否区别于竞品）
  const existingSet = new Set(
    (f.existingSymbols || []).map((s) => s.replace(/\s/g, "")),
  );
  const ourWord = clipWord(f.whitespace, 6).replace(/\s/g, "");
  if (!existingSet.has(ourWord) && ourWord.length > 1) {
    add("符号差异化", 12, "符号未被竞品占据", true);
  } else {
    add("符号差异化", -6, "符号可能与竞品撞车", false);
  }

  // 文化复利性
  if (/日常|每天|反复|习惯|高频/.test(text + f.need)) {
    add("文化复利", 10, "高频场景让符号自我强化", true);
  } else if (/长期|品牌/.test(text)) {
    add("文化复利", 5, "有长期意识但缺高频触点", true);
  } else {
    add("文化复利", -4, "符号缺少复利空间", false);
  }

  // 可传播性
  if (/闭眼|默认|本能|传|转述/.test(text)) {
    add("可传播性", 10, "符号可脱口而出", true);
  } else {
    add("可传播性", 2, "传播性一般", true);
  }

  return { total: clampScore(score), checks };
}

export async function runSymbolEngine(
  f: ThinkingFactPack,
  options?: { llm?: TheoryLLMAdapter },
): Promise<SeatVerdict> {
  const meta = SEAT_PUBLIC.huayehu;
  const { directions, usedLlm } = await inventSeatDirections({
    seat: "MK-SYMBOL",
    fact: f,
    fallback: inventDirections(f),
    llm: options?.llm,
  });
  const scored = directions.map((d) => {
    const s = scoreSymbol(d, f);
    return { d, ...s };
  });
  scored.sort((a, b) => b.total - a.total);

  const preferredRow =
    scored.find((r) => !/堆砌|元素|各种/.test(r.d.oneLiner)) || scored[0]!;
  const preferred = preferredRow.d;
  const alternatives = scored
    .filter((r) => r.d.id !== preferred.id)
    .map((r) => r.d);
  const rejected = scored
    .filter(
      (r) =>
        r.d.id !== preferred.id &&
        (r.total < 55 || /堆砌/.test(r.d.oneLiner)),
    )
    .map((r) => ({
      name: r.d.name,
      reason: r.checks.find((c) => !c.pass)?.note || "符号化不足或成本太高",
    }));

  const culturalCode = f.culturalCode || "日常烟火气";
  const word = clipWord(f.whitespace, 8);
  const proof = evidenceBackedProof(f, "symbol");
  const unlike = unlikeCompetitorLine(f);

  const trace: ReasoningStep[] = [
    {
      step: "1. 诊断文化母体",
      judgment: `「${culturalCode}」是${f.who}的高频文化场景，当前${f.rivals[0] || "竞品"}未用符号占有。`,
      evidence: f.researchHeadline || f.consumerShift,
    },
    {
      step: "2. 造超级符号",
      judgment: usedLlm
        ? `【LLM invent】${preferred.inventReason}`
        : preferred.inventReason,
    },
    {
      step: "3. 符号成本效益检验",
      judgment: preferredRow.checks
        .map((c) => `${c.pass ? "✓" : "✗"}${c.law}`)
        .join(" · "),
    },
    {
      step: "4. 寄生路径设计",
      judgment: `符号上到门头/菜单/传播三触点；消费者每天看到想到「${word}」。`,
    },
    {
      step: "5. 落成策略表",
      judgment: preferred.oneLiner,
    },
  ];

  const risks: SeatVerdict["risks"] = [];
  if (preferredRow.total < 65) {
    risks.push({
      risk: "【符号官】符号不够锋利，消费者可能无感",
      severity: "R2",
    });
  }
  risks.push({
    risk: "【符号官】文化母体过宽则寄生不牢，过窄则增长受限",
    severity: "R1",
  });

  const enriched = enrichVerdictWithKnowledge({
    source: "ye_maozhong",
    directionText: `${preferred.oneLiner} ${preferred.name} ${preferred.focus} ${culturalCode} ${word}`,
    baseChecks: preferredRow.checks,
    baseScore: preferredRow.total,
    trace,
  });

  return {
    advisorId: "huayehu",
    code: meta.code,
    publicName: meta.name,
    preferred,
    alternatives,
    rejected,
    totalScore: enriched.score,
    recommend: toRecommend(enriched.score),
    lawChecks: enriched.checks,
    reasoningTrace: enriched.trace,
    coreLogic: `${meta.theoryLabel}：品牌寄生在文化母体中，超级符号是成本最低的记忆触发器。得分 ${enriched.score}。${enriched.caseHint || ""}`,
    whyThis: `【${meta.name}】「${preferred.oneLiner}」符号化检验最优：${preferred.inventReason}`,
    keyMentalPosition: preferred.oneLiner,
    risks,
    strategy: {
      oneLiner: `寄生「${culturalCode}」· 符号「${word}」`,
      positioningStatement: stmt({
        who: f.who,
        job: f.need,
        brand: f.brandLabel || `${f.category}馆`,
        frame: `文化母体 · ${culturalCode}`,
        pod: `${word}符号`,
        because: proof,
        unlike,
      }),
      frameOfReference: `文化母体 · ${culturalCode}`,
      forWhom: f.who,
      jobToBeDone: f.need,
      battlefield: `符号「${word}」的寄生空间`,
      pointOfDifference: `视觉/语言/行为三体合一的超级符号，不是口号式差异`,
      proof,
      sacrifice: "放弃无符号力的功能参数和空洞品牌故事",
      doNotDo: `不要和${f.rivals[0] || "竞品"}一样用通用装修风格`,
      risk: risks[0]?.risk || "符号执行要一贯性，否则白做",
      rationale: "超级符号是文化基因的放大器，不是设计师的审美表达。",
      proofPlan: {
        menu: `菜单首推菜名或呈现方式含「${word}」符号`,
        script: `全员只说与「${word}」有关的推荐语`,
        scene: `门头/桌签/打包袋统一出现「${word}」符号`,
      },
    },
    confidence: Math.min(0.9, 0.5 + enriched.score / 180),
    attackAmmo: [
      {
        targetSeat: "ries",
        attack: `心智词「${word}」能进脑子，但没符号进不了眼睛；一个超级符号让客人闭眼选，不是动脑想。`,
        defenseHint: "给心智词配一个视觉锚",
        severity: "R2",
      },
      {
        targetSeat: "trout",
        attack: `区隔写在海报上，不如符号印在打包袋上；符号是区隔的复利机器。`,
        defenseHint: "区隔语言必须符号化",
        severity: "R2",
      },
      {
        targetSeat: "ye",
        attack: `冲突带来短期记忆，符号带来长期资产；冲突官最好和符号官合作，冲突引爆、符号沉淀。`,
        defenseHint: "冲突事件＝符号植入机会",
        severity: "R1",
      },
      {
        targetSeat: "kotler",
        attack: `STP 找出正确的人，但符号让正确的人闭眼选你。没有符号的细分是学术练习。`,
        defenseHint: "细分结果必须匹配可符号化的触点",
        severity: "R1",
      },
      {
        targetSeat: "growth",
        attack: `增长官设计飞轮，但没有符号的飞轮转不动；符号就是飞轮的每个叶片上的可识别标记。`,
        defenseHint: "增长飞轮必须有符号引擎",
        severity: "R1",
      },
    ],
  };
}
