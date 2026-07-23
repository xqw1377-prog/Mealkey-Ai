/**
 * 会议补充讨论：把 Agent stream 文本收成一条「专家发言」
 * 前台只展示顾问角色，不展示 M-XX。
 */

import type { ExpertStatement, MeetingDepartment } from "./meeting";
import type { ForceAgentCode } from "./meeting-deliberation";
import { stripAgentProductNames } from "./department-board";

const AGENT_SEAT: Record<
  ForceAgentCode,
  { roleId: string; displayName: string; department: MeetingDepartment }
> = {
  "m-mkt": { roleId: "stream.market", displayName: "市场顾问", department: "market" },
  "m-pnt": { roleId: "stream.brand", displayName: "品牌顾问", department: "brand" },
  "m-biz": { roleId: "stream.business", displayName: "商业顾问", department: "business" },
  "m-ed": { roleId: "stream.org", displayName: "组织顾问", department: "org" },
  chief: { roleId: "stream.chief", displayName: "首席顾问", department: "general" },
};

export function seatFromForceAgent(forceAgent: ForceAgentCode) {
  return AGENT_SEAT[forceAgent] ?? AGENT_SEAT.chief;
}

function inferStance(text: string): ExpertStatement["stance"] {
  if (/暂缓|反对|风险过高|不建议|先别|不足/.test(text)) return "oppose";
  if (/可以|建议推进|窗口|机会|支持/.test(text) && !/但|不过|前提/.test(text)) return "support";
  if (/但|不过|前提|条件|先验证|有条件/.test(text)) return "conditional";
  return "neutral";
}

/** 从流式全文抽出一句可用主张（会议纪要风格，非长聊天） */
export function extractClaimFromStream(content: string, maxLen = 72): string {
  const cleaned = stripAgentProductNames(content)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "本轮补充判断仍需更多事实。";

  const sentences = cleaned
    .split(/(?<=[。！？\n])/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 8 && !/^正在|⏳|🔍/.test(s));

  const preferred =
    sentences.find((s) => /建议|判断|风险|机会|应该|不宜|先|暂缓|推进/.test(s)) ||
    sentences[0] ||
    cleaned;

  return preferred.length > maxLen ? `${preferred.slice(0, maxLen - 1)}…` : preferred;
}

export function statementFromAgentStream(input: {
  forceAgent: ForceAgentCode;
  content: string;
  round: 1 | 2 | 3;
  topic?: string;
}): ExpertStatement {
  const seat = seatFromForceAgent(input.forceAgent);
  const claim = extractClaimFromStream(input.content);
  const reasons = [
    extractClaimFromStream(input.content, 120),
    ...(input.topic ? [`围绕议题：${input.topic.slice(0, 40)}`] : []),
  ].filter((v, i, arr) => arr.indexOf(v) === i);

  return {
    id: `stream-${seat.roleId}-${Date.now()}`,
    roleId: seat.roleId,
    displayName: seat.displayName,
    round: input.round,
    stance: inferStance(input.content),
    claim,
    reasons: reasons.slice(0, 2),
  };
}
