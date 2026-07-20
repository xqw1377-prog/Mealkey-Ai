/**
 * 步 3：三位顾问各出定位策略
 * 铁律：像策略表，不像正确的废话；三策必须互斥；各席自带大师方案包。
 */
import type { BrandStrategyProject } from "./types";
import type {
  AdvisorId,
  AdvisorStrategyCard,
  AdvisorStrategySet,
  MarketResearchPack,
} from "./journey-types";
import { ADVISOR_META } from "./journey-types";
import {
  attachMasterSchemesToSet,
  masterSchemeContextFromInputs,
} from "./master-scheme-engine";

function createId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function stmt(parts: {
  who: string;
  job: string;
  brand: string;
  frame: string;
  pod: string;
  because: string;
  unlike: string;
}) {
  return `对于${parts.who}，当他们需要「${parts.job}」时，${parts.brand}是「${parts.frame}」里那个「${parts.pod}」的选择，因为${parts.because}；不像${parts.unlike}。`;
}

function schemeCtx(
  project: BrandStrategyProject,
  research: MarketResearchPack,
) {
  const brief = project.assets.brandBrief;
  return masterSchemeContextFromInputs({
    brandName:
      research.scope?.brandName ||
      (brief?.categoryDefinition ? `${brief.categoryDefinition}馆` : "本店"),
    category: brief?.categoryDefinition || research.scope?.category || "餐饮",
    city: research.scope?.city || "目标城市",
    who: brief?.targetCustomer || "带娃家庭 / 附近高频到店客人",
    need: brief?.customerNeed || "吃得放心、可预期",
    edge: brief?.founderBelief || "一线能把出品做稳",
    rivals: brief?.competitiveSet || research.scope?.rivals || [],
    whitespace: research.whitespace,
    categoryTrend: research.categoryTrend,
    consumerShift: research.consumerShift,
    competitiveLandscape: research.competitiveLandscape,
    headline: research.headline,
  });
}

export function buildAdvisorStrategiesFromResearch(
  project: BrandStrategyProject,
  research: MarketResearchPack,
): AdvisorStrategySet {
  const brief = project.assets.brandBrief;
  const who = brief?.targetCustomer || "带娃家庭 / 附近高频到店客人";
  const need = (brief?.customerNeed || "吃得放心、可预期").replace(/。$/, "");
  const edge = (brief?.founderBelief || "一线能把出品做稳").replace(/。$/, "");
  const cat = brief?.categoryDefinition || "本地餐饮";
  const brand =
    research.scope?.brandName ||
    (brief?.categoryDefinition ? `${brief.categoryDefinition}馆` : "本店");
  const space = (research.whitespace || "未被占领的场景心智").replace(/。$/, "");
  const rivals = (brief?.competitiveSet || []).slice(0, 2);
  const rivalA = rivals[0] || "周边同质馆";
  const rivalB = rivals[1] || "连锁快餐";

  const riesWord = space.length > 12 ? space.slice(0, 10) : space;

  const ries: AdvisorStrategyCard = {
    advisorId: "ries",
    oneLiner: `客人脑中只记一个词：「${riesWord}」`,
    positioningStatement: stmt({
      who,
      job: need,
      brand,
      frame: cat,
      pod: `${riesWord}第一`,
      because: edge,
      unlike: `${rivalA}什么都做、什么都记不住`,
    }),
    frameOfReference: `${cat} · 心智品类`,
    forWhom: who,
    jobToBeDone: need,
    battlefield: riesWord,
    pointOfDifference: `成为「${riesWord}」的第一联想，而不是更好吃的${cat}`,
    differentiation: `成为「${riesWord}」的第一联想，而不是更好吃的${cat}`,
    proof: edge,
    sacrifice: "放弃多场景、多客群、多卖点同时喊",
    doNotDo: `不做「${rivalA}式」大而全；不做性价比+高端+网红三线并行`,
    risk: "词太窄 → 短期来客不足；词太虚 → 占不住",
    rationale: "定位是心智里的第一个名字，不是产品说明书。",
    proofPlan: {
      menu: `主推不超过 3 道，全部服务「${riesWord}」联想`,
      script: `店员只准讲一个词：${riesWord}`,
      scene: `进店第一眼（门头/桌签）只出现「${riesWord}」`,
    },
  };

  const trout: AdvisorStrategyCard = {
    advisorId: "trout",
    oneLiner: `相对${rivalA}，我们是「${space}」的另一个选项`,
    positioningStatement: stmt({
      who,
      job: `不想再跟${rivalA}撞车`,
      brand,
      frame: `与${rivalA}、${rivalB}对照的${cat}`,
      pod: space,
      because: `空位还在：${research.headline.slice(0, 40)}`,
      unlike: `${rivalA}的同质打法`,
    }),
    frameOfReference: `竞争对照 · vs ${rivalA}`,
    forWhom: who,
    jobToBeDone: `选一家和${rivalA}明显不同的店`,
    battlefield: `对${rivalA}的空位`,
    pointOfDifference: `不跟${rivalA}比更好，比不同：占「${space}」`,
    differentiation: `不跟${rivalA}比更好，比不同：占「${space}」`,
    proof: `对手未占满：${space}`,
    sacrifice: `放弃与${rivalA}正面拼价格/拼宽菜单`,
    doNotDo: `不要抄${rivalA}卖点；不要口号区隔、菜单同质`,
    risk: "差异只写在海报上 → 一吃就穿帮",
    rationale: "定位是相对于竞争的选择，不是自我感觉良好。",
    proofPlan: {
      menu: `至少 2 道菜专门打穿「不像${rivalA}」`,
      script: `话术必带对照：不像${rivalA}，我们是…`,
      scene: `点餐页/桌贴写清「和${rivalA}的不同」`,
    },
  };

  const ye: AdvisorStrategyCard = {
    advisorId: "ye",
    oneLiner: `让${who}在「关键一顿」里感到「${need}」被当场兑现`,
    positioningStatement: stmt({
      who,
      job: need,
      brand,
      frame: "场景情绪型餐饮",
      pod: `场合冲突被解决：${need}`,
      because: "现有选择常让人赌运气",
      unlike: "只讲供应链、不讲场面的馆子",
    }),
    frameOfReference: "场景 · 情绪冲突",
    forWhom: who,
    jobToBeDone: need,
    battlefield: `${who}的关键场合`,
    pointOfDifference: `卖的是场面被兑现，不是菜名更花`,
    differentiation: `卖的是场面被兑现，不是菜名更花`,
    proof: need,
    sacrifice: "放弃功能参数堆砌与黑话传播",
    doNotDo: "不要只讲中央厨房/供应链；客人听不懂也不想记",
    risk: "情绪无产品锚点 → 广告腔，进店就塌",
    rationale: "没有冲突就没有记忆；冲突必须能进店验证。",
    proofPlan: {
      menu: `设计 1 个「场合套餐」直接对应「${need}」`,
      script: `迎客句只问场合，不问「几位吃点啥」的空话`,
      scene: `桌边物料写清：这顿解决什么场面`,
    },
  };

  const ctx = schemeCtx(project, research);
  const strategies = attachMasterSchemesToSet([ries, trout, ye], ctx);

  return {
    setId: createId("adv"),
    status: "ready",
    strategies,
    schemeContext: ctx,
    masterSchemeMode: "heuristic",
    conflictSummary: [
      `${ADVISOR_META.ries.name}要押「一个心智词：${riesWord}」当主轴；`,
      `${ADVISOR_META.trout.name}要押「对${rivalA}的区隔空位」当主轴；`,
      `${ADVISOR_META.ye.name}要押「${who}的场合情绪兑现」当主轴。`,
      `三案不能同时当主航道——会议室必须选一个主轴，其余降为约束。`,
    ].join(""),
    generatedAt: new Date().toISOString(),
  };
}

export function getStrategyByAdvisor(
  set: AdvisorStrategySet,
  id: AdvisorId,
): AdvisorStrategyCard | undefined {
  return set.strategies.find((s) => s.advisorId === id);
}
