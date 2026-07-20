/**
 * 空位官 MK-RIVAL 思维引擎
 * 学派标签：竞争空位（不使用任何真人姓名）
 *
 * 思维链：对手心智地图 → 找未占联想 → 拒绝「更好」→ 区隔可防御 → 策略表
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
  rivalContrastLine,
  unlikeCompetitorLine,
} from "./fact-evidence";
import type { TheoryLLMAdapter } from "../types";

function inventDirections(f: ThinkingFactPack): InventedDirection[] {
  const word = clipWord(f.whitespace, 10);
  const rival = f.rivals[0] || "周边同质馆";
  const rivalB = f.rivals[1] || "连锁快餐";
  return [
    {
      id: "R1",
      name: `竞争空位·对${rival}`,
      oneLiner: `不是更好的${rival}，而是「${word}」的不同选项`,
      type: "进攻·区隔",
      focus: "空位/对立/竞争",
      inventReason: `${rival}可能占了「宽/快/便宜」联想；「${word}」若未被钉死，就是可抢空位。`,
    },
    {
      id: "R2",
      name: `重定位·打破${rival}默认`,
      oneLiner: `打破「只能像${rival}那样选」的默认，改选「${word}」`,
      type: "重新定位",
      focus: "重定/对立",
      inventReason: `重新定位对象是${rival}的默认心智，不是自我感觉良好。`,
    },
    {
      id: "R3",
      name: `正面更好·对${rivalB}`,
      oneLiner: `比${rivalB}更好吃、更全面、更升级`,
      type: "正面战（对照否决）",
      focus: "更好/全面",
      inventReason: `用作否决对照：竞争空位学派最反对「更好」。`,
    },
  ];
}

function scoreRival(d: InventedDirection, f: ThinkingFactPack): {
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

  if (/空位|不同|不是更好|打破/.test(text)) {
    add("心智空位", 18, "瞄准未占稳的联想空位", true);
  } else if (/更好|更优|升级|全面/.test(text)) {
    add("心智空位", -16, "更好不是空位", false);
  } else {
    add("心智空位", -6, "空位不清晰", false);
  }

  if (/第一联想|首选|不同选项/.test(text) || /「/.test(text)) {
    add("第一联想", 14, "有可争夺的联想锚点", true);
  } else {
    add("第一联想", -5, "第一联想模糊", false);
  }

  const sharp =
    text.length < 40 && /不|只|不同|不是|而是|打破|vs/i.test(text);
  if (sharp) {
    add("差异锋利", 16, "一句话说清不同", true);
  } else if (/区隔|对立|不同/.test(text)) {
    add("差异锋利", 8, "有差异但不够锋利", true);
  } else {
    add("差异锋利", -10, "缺乏可感知差异", false);
  }

  if (/更好|更优|全面|综合/.test(text)) {
    add("反更好禁令", -14, "说了更好没说不同", false);
  } else {
    add("反更好禁令", 8, "坚持不同而非更好", true);
  }

  if (/打破|重新|不是.*而是|而非/.test(text)) {
    add("重新定位", 12, "有明确重定对象", true);
  } else if (/进攻|竞争|对/.test(text)) {
    add("重新定位", 6, "有竞争意识", true);
  } else {
    add("重新定位", -4, "重定对象不清", false);
  }

  if (f.rivals.length > 0) {
    add("对手地图", 10, `对照对象清晰：${f.rivals.slice(0, 2).join("、")}`, true);
  } else {
    add("对手地图", -8, "没有对手，区隔无处落地", false);
  }

  if (/场景|体验|稳|出品|供应链|品牌/.test(f.edge + f.strengths.join(""))) {
    add("防御壁垒", 8, "有软/硬壁垒支撑区隔", true);
  } else {
    add("防御壁垒", -4, "区隔易被跟进", false);
  }

  if (/场景|家庭|聚餐|夜宵|外卖/.test(text + f.whitespace + f.who)) {
    add("场景绑定", 6, "空位绑到具体场景", true);
  } else {
    add("场景绑定", 0, "场景绑定偏弱", true);
  }

  return { total: clampScore(score), checks };
}

export async function runRivalEngine(
  f: ThinkingFactPack,
  options?: { llm?: TheoryLLMAdapter },
): Promise<SeatVerdict> {
  const meta = SEAT_PUBLIC.trout;
  const { directions, usedLlm } = await inventSeatDirections({
    seat: "MK-RIVAL",
    fact: f,
    fallback: inventDirections(f),
    llm: options?.llm,
  });
  const scored = directions.map((d) => {
    const s = scoreRival(d, f);
    return { d, ...s };
  });
  scored.sort((a, b) => b.total - a.total);
  const preferredRow =
    scored.find((r) => !/更好|更全面|更升级/.test(r.d.oneLiner)) || scored[0]!;
  const preferred = preferredRow.d;
  const alternatives = scored
    .filter((r) => r.d.id !== preferred.id)
    .map((r) => r.d);
  const rejected = scored
    .filter(
      (r) =>
        r.d.id !== preferred.id &&
        (r.total < 58 || /更好|更全面/.test(r.d.oneLiner)),
    )
    .map((r) => ({
      name: r.d.name,
      reason: r.checks.find((c) => !c.pass)?.note || "差异不够锋利或易被同质替换",
    }));

  const word = ownedMentalWord(f);
  const rival = f.rivals[0] || "周边同质馆";
  const rivalB = f.rivals[1] || "连锁快餐";
  const brand = `${f.category}馆`;
  const proof = evidenceBackedProof(f, "rival");
  const unlike = unlikeCompetitorLine(f);

  const trace: ReasoningStep[] = [
    {
      step: "1. 对手心智地图",
      judgment: `${rival} / ${rivalB} 更可能占「宽菜单、快、便宜」；「${word}」若未被钉死即空位。`,
      evidence: f.competitiveLandscape,
    },
    {
      step: "2. 找未占联想",
      judgment: usedLlm
        ? `【LLM invent】${preferred.inventReason}`
        : preferred.inventReason,
    },
    {
      step: "3. 拒绝更好",
      judgment: "定位是相对于竞争的选择；不是更好，而是不同。",
    },
    {
      step: "4. 防御检验",
      judgment: preferredRow.checks
        .filter((c) => c.law.includes("防御") || c.law.includes("锋利"))
        .map((c) => `${c.law}:${c.note}`)
        .join("；") || "区隔需菜单/话术做实",
    },
    {
      step: "5. 落成策略表",
      judgment: preferred.oneLiner,
    },
  ];

  const risks: SeatVerdict["risks"] = [
    {
      risk: "【空位官】差异只写在海报上 → 一吃就穿帮",
      severity: "R2",
    },
  ];
  if (preferredRow.total < 65) {
    risks.unshift({
      risk: "【空位官】空位或锋利度不足，易被同质跟进",
      severity: "R3",
    });
  }

  const enriched = enrichVerdictWithKnowledge({
    source: "trout",
    directionText: `${preferred.oneLiner} ${preferred.name} ${preferred.focus} ${rival} ${word}`,
    baseChecks: preferredRow.checks,
    baseScore: preferredRow.total,
    trace,
  });

  return {
    advisorId: "trout",
    code: meta.code,
    publicName: meta.name,
    preferred,
    alternatives,
    rejected,
    totalScore: enriched.score,
    recommend: toRecommend(enriched.score),
    lawChecks: enriched.checks,
    reasoningTrace: enriched.trace,
    coreLogic: `${meta.theoryLabel}：定位是相对于竞争的。得分 ${enriched.score}。必须回答：第一联想归谁，我们抢哪一个尚未被占稳的联想。${enriched.caseHint || ""}`,
    whyThis: `【${meta.name}】「${preferred.oneLiner}」在竞争维度+蒸馏知识最优：${preferred.inventReason}`,
    keyMentalPosition: preferred.oneLiner,
    risks,
    strategy: {
      oneLiner: `相对${rival}，我们是「${word}」的另一个选项`,
      positioningStatement: stmt({
        who: f.who,
        job: `不想再跟${rival}撞车`,
        brand,
        frame: `与${rival}、${rivalB}对照的${f.category}`,
        pod: word,
        because: proof,
        unlike,
      }),
      frameOfReference: `竞争对照 · vs ${rival}`,
      forWhom: f.who,
      jobToBeDone: `选一家和${rival}明显不同的店`,
      battlefield: `对${rival}的空位`,
      pointOfDifference: rivalContrastLine(f),
      proof,
      sacrifice: `放弃与${rival}正面拼价格/拼宽菜单`,
      doNotDo: `不要抄${rival}卖点；不要口号区隔、菜单同质`,
      risk: risks[0]!.risk,
      rationale: "定位是相对于竞争的选择，不是自我感觉良好。",
      proofPlan: {
        menu: `至少 2 道菜专门打穿「不像${rival}」`,
        script: `话术必带对照：不像${rival}，我们是…`,
        scene: `点餐页/桌贴写清「和${rival}的不同」`,
      },
    },
    confidence: Math.min(0.9, 0.52 + enriched.score / 180),
    attackAmmo: [
      {
        targetSeat: "ries",
        attack: `你押心智词「${word}」。若菜单仍是大而全，客人记不住词，只会记住贵或便宜。请当场回答：砍掉哪三道菜？`,
        defenseHint: "用砍菜证明聚焦不是口号",
        severity: "R3",
      },
      {
        targetSeat: "ye",
        attack: `冲突若不能写成「不像${rival}」的对照选择，进店仍会撞车；冲突必须服务竞争空位。`,
        defenseHint: "冲突句带上对手对照",
        severity: "R2",
      },
      {
        targetSeat: "huayehu",
        attack: `符号降低了识别成本，但区隔才是选择理由——没有区隔的符号只是个好看的logo。`,
        defenseHint: "符号必须表达竞争差异",
        severity: "R2",
      },
      {
        targetSeat: "kotler",
        attack: `STP 细分客群，但客群选不选你取决于是否比对手更「不同」。细分不回答竞争问题。`,
        defenseHint: "细分后必须找竞争差异",
        severity: "R1",
      },
      {
        targetSeat: "growth",
        attack: `飞轮转得再好，如果区隔不清导致客人把你和竞品划等号，增长一定撞天花板。`,
        defenseHint: "增长飞轮之前先解决区隔问题",
        severity: "R1",
      },
      {
        targetSeat: "culture",
        attack: `文化叙事很高级，但如果不能转化为「选我不选竞品」的理由，文化是装饰不是定位。`,
        defenseHint: "文化必须服务竞争差异",
        severity: "R1",
      },
    ],
  };
}
