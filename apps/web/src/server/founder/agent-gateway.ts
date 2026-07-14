/**
 * Founder Agent Gateway
 * 统一调用四 Agent；失败时返回降级 ExpertOpinion，不抛垮整场会议。
 */

import type {
  CompanyContext,
  ExpertOpinion,
  FounderAgentId,
  MeetingMission,
} from "./contracts";
import { AGENT_SEAT, EXPANSION_AGENTS } from "./contracts";

function clip(text: string, max = 72): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "本轮判断仍需更多事实。";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function inferStance(text: string): ExpertOpinion["stance"] {
  if (/暂缓|反对|不足|不建议|先别|风险过高/.test(text)) return "oppose";
  if (/但|不过|前提|有条件|先验证/.test(text)) return "conditional";
  if (/支持|建议推进|机会|可以进入|窗口/.test(text)) return "support";
  return "neutral";
}

/** 从企业上下文 + 议题生成降级席位意见（内核不可用时） */
export function buildDegradedOpinion(input: {
  meetingId: string;
  agentId: FounderAgentId;
  mission: MeetingMission;
  reason?: string;
}): ExpertOpinion {
  const seat = AGENT_SEAT[input.agentId];
  const ctx = input.mission.companyContext;
  const topic = input.mission.topic;
  const expand = /扩张|加盟|复制|连锁|店/.test(`${topic}${input.mission.question}`);

  const scripts: Record<FounderAgentId, { claim: string; reasons: string[]; risks: string[] }> = {
    "M-MKT": {
      claim: expand ? "高端/区域餐饮仍有扩张窗口，但竞争在加剧" : "需先确认目标市场真实需求",
      reasons: [`品类：${ctx.industry || "待补"}`, `目标：${ctx.yearlyGoal || input.mission.goal}`],
      risks: ["竞争加剧可能压缩窗口"],
    },
    "M-PNT": {
      claim: expand ? "品牌仍偏产品驱动，规模化前心智资产不足" : "定位清晰度决定后续增长效率",
      reasons: [`品牌：${ctx.brandName}`, "复制依赖可记忆的差异"],
      risks: ["扩张后品牌表达被稀释"],
    },
    "M-BIZ": {
      claim: expand ? "单店模型需先证明可复制，加盟模型尚未验证" : "先把赚钱逻辑压成可验证模型",
      reasons: [ctx.storeCount ? `当前规模：${ctx.storeCount}` : "门店规模待确认", "扩张前要有稳定单店单元"],
      risks: ["未验证模型下加速扩张，失败成本更高"],
    },
    "M-ED": {
      claim: expand ? "当前组织更适合成长期中小规模，尚未承载百店" : "组织承接能力是扩张硬约束",
      reasons: [ctx.stageLabel ? `阶段：${ctx.stageLabel}` : "阶段待校准", "店长与标准能否复制是关键"],
      risks: ["组织断点会放大单店波动"],
    },
    CHIEF: {
      claim: "关键不在开店速度，而在扩张节奏与能力准备",
      reasons: ["市场窗口与能力准备可以并存于节奏选择"],
      risks: ["非此即彼会逼出错误决策"],
    },
  };

  const script = scripts[input.agentId];
  return {
    opinionId: `degraded-${input.agentId}-${Date.now()}`,
    meetingId: input.meetingId,
    agentId: input.agentId,
    seatLabel: seat.seatLabel,
    stance: inferStance(script.claim),
    claim: clip(script.claim),
    reasons: script.reasons,
    risks: script.risks,
    confidence: 0.55,
    degraded: true,
    createdAt: new Date().toISOString(),
  };
}

/** 从自由文本投影为 Opinion（stream 结束后使用） */
export function opinionFromText(input: {
  meetingId: string;
  agentId: FounderAgentId;
  text: string;
  conversationId?: string;
}): ExpertOpinion {
  const seat = AGENT_SEAT[input.agentId];
  const cleaned = input.text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const sentences = cleaned
    .split(/(?<=[。！？\n])/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8);
  const claim =
    sentences.find((s) => /建议|判断|风险|机会|应该|不宜|暂缓|推进/.test(s)) ||
    sentences[0] ||
    cleaned;
  const riskSentence = sentences.find((s) => /风险|不足|挑战|担心/.test(s));

  return {
    opinionId: `text-${input.agentId}-${Date.now()}`,
    meetingId: input.meetingId,
    agentId: input.agentId,
    seatLabel: seat.seatLabel,
    stance: inferStance(cleaned),
    claim: clip(claim),
    reasons: [clip(cleaned, 120)].filter(Boolean),
    risks: riskSentence ? [clip(riskSentence, 80)] : [],
    confidence: 0.68,
    rawRef: input.conversationId ? { conversationId: input.conversationId } : undefined,
    createdAt: new Date().toISOString(),
  };
}

export function buildExpansionMission(input: {
  companyId: string;
  question: string;
  context: CompanyContext;
}): MeetingMission {
  const goal = input.question.trim() || "扩张可行性评估";
  return {
    missionId: `mission-${Date.now()}`,
    companyId: input.companyId,
    question: goal,
    goal: /店|扩张|加盟|复制/.test(goal) ? `${goal.replace(/[？?]。/g, "")}可行性评估` : goal,
    topic: `是否启动：${goal}`,
    requiredAgents: [...EXPANSION_AGENTS],
    companyContext: input.context,
  };
}

/**
 * 并行召集顾问（MVP：先全部降级席位，保证会议可开；
 * 真实 stream 由前端/编排层按 seat.forceAgent 补齐后替换）。
 */
export async function conveneExperts(input: {
  meetingId: string;
  mission: MeetingMission;
  /** 若提供某席已完成的文本，则投影为正式意见 */
  textByAgent?: Partial<Record<FounderAgentId, string>>;
}): Promise<ExpertOpinion[]> {
  const agents = input.mission.requiredAgents.length
    ? input.mission.requiredAgents
    : EXPANSION_AGENTS;

  return agents.map((agentId) => {
    const text = input.textByAgent?.[agentId];
    if (text && text.trim()) {
      return opinionFromText({
        meetingId: input.meetingId,
        agentId,
        text,
      });
    }
    return buildDegradedOpinion({
      meetingId: input.meetingId,
      agentId,
      mission: input.mission,
      reason: "awaiting_live_agent",
    });
  });
}

export function synthesizeDecisionFromOpinions(input: {
  topic: string;
  opinions: ExpertOpinion[];
}): {
  judgement: string;
  reasons: string[];
  validationPlan: string;
} {
  const oppose = input.opinions.filter((o) => o.stance === "oppose" || o.stance === "conditional");
  const support = input.opinions.filter((o) => o.stance === "support");
  const judgement =
    oppose.length >= support.length
      ? "暂缓全面扩张，先完成能力验证再决定加速"
      : "可设边界试点推进，验证后再放大";
  return {
    judgement,
    reasons: input.opinions.slice(0, 4).map((o) => `${o.seatLabel}：${o.claim}`),
    validationPlan: "90天完成直营复制验证，再评估加盟",
  };
}
