/**
 * 建企 AI 四问访谈 + 初步理解 + 90 天计划（前端启发式，MVP）
 */

export type InterviewAnswers = {
  brandName: string;
  businessType: string;
  storeCount: string;
  biggestProblem: string;
};

export type EnterpriseUnderstanding = {
  brandName: string;
  oneLiner: string;
  stageLabel: string;
  judgement: string;
  confirmQuestions: string[];
};

export type GrowthPlan = {
  day30: string;
  day60: string;
  day90: string;
  startedAt: string;
  decisionSummary: string;
  horizonDays: number;
};

export const INTERVIEW_QUESTIONS = [
  {
    id: "brandName" as const,
    prompt: "你的企业叫什么？",
    placeholder: "例如：湘宴",
  },
  {
    id: "businessType" as const,
    prompt: "你主要经营什么？",
    placeholder: "例如：高端湘菜",
  },
  {
    id: "storeCount" as const,
    prompt: "目前有多少家店？",
    placeholder: "例如：3家",
  },
  {
    id: "biggestProblem" as const,
    prompt: "你现在最想解决的问题是什么？",
    placeholder: "例如：怎么做到100家店",
  },
];

function parseStoreCount(raw: string): number {
  const match = raw.replace(/,/g, "").match(/(\d+)/);
  return match ? Number(match[1]) : 1;
}

export function buildEnterpriseUnderstanding(answers: InterviewAnswers): EnterpriseUnderstanding {
  const stores = parseStoreCount(answers.storeCount);
  const problem = answers.biggestProblem.trim();
  const category = answers.businessType.trim() || "餐饮品牌";
  const brand = answers.brandName.trim() || "你的品牌";

  const expanding = /100|连锁|扩张|加盟|复制|开店|规模/.test(problem);
  const stageLabel =
    stores <= 1
      ? "单店验证期"
      : stores <= 5
        ? expanding
          ? "复制增长期"
          : "多店打磨期"
        : expanding
          ? "连锁扩张准备期"
          : "区域连锁期";

  const oneLiner =
    stores <= 1
      ? `一家仍在打磨单店模型的${category}品牌。`
      : stores <= 5
        ? `一家正在从单店经营进入连锁阶段的${category}品牌。`
        : `一家已有区域基础、正思考规模化路径的${category}品牌。`;

  const judgement = expanding
    ? "你的核心挑战不是开店速度，而是品牌和组织是否支持规模化。"
    : /定位|品牌|年轻|心智/.test(problem)
      ? "你的核心挑战更像品牌资产是否清晰，而不是短期流量技巧。"
      : /利润|成本|亏损|现金流/.test(problem)
        ? "你的核心挑战更像单店模型是否真正赚钱，而不是扩张口号。"
        : "你的核心挑战需要先被重新定义成一个可验证的经营判断。";

  const confirmQuestions = expanding
    ? ["消费者为什么选择你？", "目前店长是否可以复制？", "单店模型是否稳定？"]
    : /定位|品牌/.test(problem)
      ? ["用户现在如何记住你？", "品类差异是否可被一句话说清？", "定位能否支撑增长？"]
      : ["这件事为什么现在必须解决？", "不做会损失什么？", "什么证据能证明方向对了？"];

  return {
    brandName: brand,
    oneLiner,
    stageLabel,
    judgement,
    confirmQuestions,
  };
}

export function buildGrowthPlan(input: {
  judgement: string;
  action?: string;
  problem?: string;
}): GrowthPlan {
  const text = `${input.judgement} ${input.action || ""} ${input.problem || ""}`;
  const expanding = /扩张|加盟|复制|连锁|开店|100/.test(text);
  const brandWeak = /品牌|心智|定位/.test(text);
  const orgWeak = /组织|店长|培训|复制/.test(text);

  return {
    day30: orgWeak || expanding ? "完成培训体系关键节点" : "完成验证所需的关键标准动作",
    day60: expanding
      ? brandWeak
        ? "完成品牌标准与供应链关键动作"
        : "完成供应链与单店标准固化"
      : "完成中期验证数据复盘",
    day90: expanding ? "重新评估是否启动加盟 / 加速扩张" : "复盘验证结果并决定下一步战略",
    startedAt: new Date().toISOString(),
    decisionSummary: input.judgement.slice(0, 120),
    horizonDays: 90,
  };
}

export function daysRemainingInPlan(plan: GrowthPlan, now = new Date()): number {
  const started = new Date(plan.startedAt).getTime();
  if (Number.isNaN(started)) return plan.horizonDays;
  const elapsed = Math.floor((now.getTime() - started) / (24 * 60 * 60 * 1000));
  return Math.max(0, plan.horizonDays - elapsed);
}
