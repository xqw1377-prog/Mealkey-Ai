/**
 * Prompt 栈组装器（治理层，非二次研究层）
 *
 * Council Runtime Prompt =
 *   Constitution + Role Contract + Decision Type Matrix
 *   + Case Packet + Domain Knowledge + Expert Reports + Evidence Packet
 *   + Debate Protocol + Output Schema
 *
 * V3 升级：注入领域蒸馏知识（市场/商业/股权/定位），
 * 把 knowledge-engine 的知识转化为常委可调用的判断能力。
 */

import {
  COUNCIL_CONSTITUTION,
  DEBATE_PROTOCOL,
  getDecisionType,
  getRoleContract,
} from "./catalog";
import { EXPERT_TO_COUNCIL_LENS } from "./expert-engines";
import { renderKnowledgeBlock } from "./knowledge";
import { renderPersonaV2Block } from "./persona-v2";
import { renderDomainKnowledgeBlock } from "./domain-knowledge";
import { renderMkInsightsBlock, type MKInsight } from "./mk-insight";
import type {
  CasePacket,
  CouncilRoleId,
  EvidencePacket,
  ExpertReport,
  RoleContract,
} from "./types";

export type PromptRound = 1 | 2 | 3;

export interface BuildCouncilPromptInput {
  roleId: CouncilRoleId;
  casePacket: CasePacket;
  evidencePacket?: EvidencePacket;
  expertReports?: ExpertReport[];
  /** 优先消费；有 Insight 时 ExpertReport 仅作摘要备份 */
  insights?: MKInsight[];
  peerOpinionsSummary?: string;
  challengePacket?: string[];
  round?: PromptRound;
}

function bullet(items: readonly string[]): string {
  return items.map((x) => `- ${x}`).join("\n");
}

function renderRoleContract(role: RoleContract): string {
  return [
    `# Role Contract — ${role.role_id} ${role.role_name}`,
    `身份：${role.identity}`,
    `使命：${role.mission}`,
    `固定首问：${role.core_question}`,
    "",
    "## 目标函数",
    bullet(role.objective_function),
    "",
    "## 恐惧函数",
    bullet(role.fear_function),
    "",
    "## 判断模型",
    bullet(role.judgment_model),
    "",
    "## 证据偏好",
    bullet(role.evidence_preference),
    "",
    "## 首轮扫描",
    bullet(role.first_scan),
    "",
    "## 否决条件",
    bullet(role.veto_rules),
    "",
    "## 改判门槛",
    bullet(role.change_mind_if),
  ].join("\n");
}

function renderConstitution(): string {
  return [
    `# ${COUNCIL_CONSTITUTION.name}`,
    "",
    "## 原则",
    bullet(COUNCIL_CONSTITUTION.principles),
    "",
    "## 独立判断规则",
    bullet(COUNCIL_CONSTITUTION.independence_rules),
    "",
    "## 辩论规则",
    bullet(COUNCIL_CONSTITUTION.debate_rules),
    "",
    "## 决议规则",
    bullet(COUNCIL_CONSTITUTION.resolution_rules),
  ].join("\n");
}

function renderDecisionType(casePacket: CasePacket): string {
  const dt = getDecisionType(casePacket.decisionType);
  const weights = Object.entries(dt.weights)
    .map(([k, v]) => `${k}:${v}`)
    .join(" / ");
  return [
    `# Decision Type Matrix — ${dt.decision_type}`,
    `名称：${dt.name}`,
    `层级：L${dt.level}`,
    `通过门槛：${dt.pass_requirement}`,
    `权重：${weights}`,
    `Veto 角色：${dt.veto_roles.join("、") || "无"}`,
  ].join("\n");
}

function renderCase(casePacket: CasePacket): string {
  const fv = casePacket.founderView;
  return [
    `# Case Packet — ${casePacket.caseId}`,
    `议题：${casePacket.question}`,
    casePacket.objective ? `目标：${casePacket.objective}` : "",
    `决策类型：${casePacket.decisionType}`,
    casePacket.deadline ? `截止：${casePacket.deadline}` : "",
    "",
    "## 背景",
    bullet(casePacket.background ?? []),
    "",
    "## 约束",
    bullet(casePacket.constraints ?? []),
    "",
    "## Founder View（输入模块，非预设结论）",
    fv
      ? [
          `立场倾向：${fv.position ?? "未表态"}`,
          bullet(fv.why ?? []),
          "创始人约束：",
          bullet(fv.constraints ?? []),
        ].join("\n")
      : "- 无",
  ]
    .filter(Boolean)
    .join("\n");
}

function renderExpertReports(
  roleId: CouncilRoleId,
  reports?: ExpertReport[],
): string {
  const header = [
    "# Expert Reports（专业意见层 — 只消费，不重研）",
    "硬规则：你不是第二个咨询团队。禁止自行编造市场数据、品牌研究或财务模型。",
    "你的工作：从本席管理视角，把专业报告转换成企业决策意见。",
  ];
  if (!reports?.length) {
    return [
      ...header,
      "- 无 Expert Report：证据不足，默认 oppose 或 conditional，并列出必须补齐的引擎。",
    ].join("\n");
  }
  const blocks = reports.map((r) => {
    const lens =
      EXPERT_TO_COUNCIL_LENS[r.engineId]?.[roleId] ??
      "从本席目标函数与否决条件审视该专业意见。";
    const sections = r.sections
      .map((s) => `  - ${s.title}: ${s.content}`)
      .join("\n");
    return [
      `## ${r.engineId} — ${r.headline}`,
      `倾向提示（非结论）: ${r.stanceHint ?? "n/a"}`,
      `本席消费镜头: ${lens}`,
      sections || "  - （无章节）",
      r.opportunities?.length
        ? `机会: ${r.opportunities.join("；")}`
        : "",
      r.risks?.length ? `风险: ${r.risks.join("；")}` : "",
      r.conditions?.length ? `条件: ${r.conditions.join("；")}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  });
  return [...header, "", ...blocks].join("\n");
}

function renderEvidence(packet?: EvidencePacket): string {
  if (!packet?.items?.length) {
    return "# Evidence Packet\n- 证据不足：允许 oppose 或 conditional，不得强行 support。";
  }
  const lines = packet.items.map(
    (e) =>
      `- [${e.evidenceId}] (${e.sourceAgent}/${e.strength ?? "medium"}) ${e.claim}`,
  );
  const gaps = packet.gaps?.length ? ["", "## 证据缺口", bullet(packet.gaps)] : [];
  return [`# Evidence Packet — ${packet.caseId}`, ...lines, ...gaps].join("\n");
}

function renderDebate(round: PromptRound, challenges?: string[]): string {
  const r =
    round === 1
      ? DEBATE_PROTOCOL.round_1
      : round === 2
        ? DEBATE_PROTOCOL.round_2
        : DEBATE_PROTOCOL.round_3;
  return [
    `# Debate Protocol — Round ${round} ${r.name}`,
    `目标：${r.goal}`,
    `必填输出字段：${r.required_output.join(", ")}`,
    challenges?.length
      ? ["", "## Challenge Packet", bullet(challenges)].join("\n")
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}

const OUTPUT_SCHEMA_HINT = `# Output Schema — Council Opinion (JSON only)
禁止使用：「我觉得」「或许吧」「一般来说」。

{
  "member": "<ROLE_ID>",
  "position": "support|oppose|conditional",
  "confidence": 0-100,
  "summary": "与 judgment 一致的一句话",
  "judgment": "【我的判断】一句话结论",
  "evidence_used": ["Evidence ID"],
  "top_risk": "【最大风险】什么情况下失败",
  "proposal": "【我的建议】行动方案",
  "needs_validation": "【需要验证】下一步数据",
  "reasoning": ["..."],
  "risks": ["..."],
  "conditions": ["..."],
  "challenge_to_others": ["..."],
  "response_to_challenges": ["..."],
  "veto": false,
  "veto_reason": "",
  "change_of_view": false,
  "change_reason": "",
  "prediction": {
    "best_case": "",
    "base_case": "",
    "worst_case": "",
    "kill_metric": ""
  }
}

硬约束：
1. 你是世界级顾问级约束函数，不是说话风格。
2. 你不做二次领域研究；只能基于 Expert Reports + Evidence Packet。
3. 必须填满 judgment / evidence_used / top_risk / proposal / needs_validation。
4. 证据不足时不得为了完整而强行 support。
5. 触发红线时 veto=true，写明 veto_reason，并给出 alternative_proposal。
6. 只输出合法 JSON，不要 Markdown 围栏。`;

/**
 * 组装单常委运行时 Prompt。
 * V3：注入领域蒸馏知识，使常委具备全球顶级咨询机构的知识储备。
 */
export function buildCouncilRuntimePrompt(input: BuildCouncilPromptInput): string {
  const role = getRoleContract(input.roleId);
  const round = input.round ?? 1;
  const peer =
    round === 1
      ? ""
      : input.peerOpinionsSummary
        ? `\n# Peer Opinions (辩论轮可用)\n${input.peerOpinionsSummary}\n`
        : "";

  // V3：注入领域蒸馏知识（市场/商业/股权/定位）
  const domainBlock = renderDomainKnowledgeBlock(
    input.casePacket.decisionType,
    input.roleId,
  );

  return [
    renderConstitution(),
    "",
    renderRoleContract(role),
    "",
    renderPersonaV2Block(input.roleId),
    "",
    renderKnowledgeBlock(input.roleId),
    "",
    // V3：领域知识注入（在知识资产之后，Expert Reports之前）
    domainBlock,
    "",
    renderDecisionType(input.casePacket),
    "",
    renderCase(input.casePacket),
    "",
    input.insights?.length
      ? [
          renderMkInsightsBlock(input.insights),
          "",
          "# Expert Report 摘要（兼容层 · 细节以 MKInsight 为准）",
          ...(input.expertReports || []).map(
            (r) => `- ${r.engineId}: ${r.headline} (${r.stanceHint || "n/a"})`,
          ),
        ].join("\n")
      : renderExpertReports(input.roleId, input.expertReports),
    "",
    renderEvidence(input.evidencePacket),
    "",
    renderDebate(round, input.challengePacket),
    peer,
    "",
    OUTPUT_SCHEMA_HINT.replace("<ROLE_ID>", input.roleId),
  ].join("\n");
}

/** 秘书长用：根据议题关键词粗判 decisionType（可被人工覆盖） */
export function classifyDecisionType(question: string): CasePacket["decisionType"] {
  const q = question.toLowerCase();
  if (/融资|股权融资|估值|稀释/.test(q)) return "fundraising";
  if (/重组|裁员|组织架构|治理结构/.test(q)) return "restructuring";
  if (/第二品牌|子品牌|新品牌|双品牌/.test(q)) return "new_brand";
  if (/新城市|进.+市|进入.+市场|开城/.test(q)) return "new_city_expansion";
  if (/开店|扩店|门店|加盟扩张/.test(q)) return "store_expansion";
  return "store_expansion";
}
