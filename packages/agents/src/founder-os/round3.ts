/**
 * Round3 — 最终改判与决议形成
 *
 * Round3 是在 Round2 交叉质询之后，每位常委有机会：
 * 1. 看到所有质询与回应后决定是否改判（change_of_view）
 * 2. 提交最终立场（support/oppose/conditional）
 * 3. 所有改判必须附理由
 * 4. 少数意见和红线不可被改判抹除（保留历史记录）
 */

import { getPersonaV2 } from "./persona-v2";
import type {
  CouncilOpinion,
  CouncilRoleId,
  CrossExaminationItem,
} from "./types";

export interface Round3Input {
  /** Round1 原始意见 */
  round1Opinions: CouncilOpinion[];
  /** Round2 质询后的回应 */
  round2Responses: CouncilOpinion[];
  /** 质询包 */
  examinationPacket: CrossExaminationItem[];
  /** 每位常委的校准提示 */
  calibrationHints: Record<CouncilRoleId, string>;
  /** 情景分析结果摘要 */
  scenarioSummaries: Record<CouncilRoleId, string>;
}

export interface Round3Opinion extends CouncilOpinion {
  /** 是否改判（与 Round1 立场不同） */
  change_of_view: boolean;
  /** 改判理由 */
  change_reason: string;
  /** 最终 confidence */
  final_confidence: number;
  /** 改判前原立场（仅改判时有值） */
  previous_position?: "support" | "oppose" | "conditional";
}

const MIN_CONFIDENCE_FOR_CHANGE = 15; // confidence 变化至少 15 分才触发改判

/**
 * 生成 Round3 Prompt（注入 Round1 立场 + 质询回应 + 校准提示）
 */
export function buildRound3Prompt(
  roleId: CouncilRoleId,
  input: Round3Input,
): string {
  const persona = getPersonaV2(roleId);
  const original = input.round1Opinions.find((o) => o.member === roleId);
  const response = input.round2Responses.find((o) => o.member === roleId);
  const receivedChallenges = input.examinationPacket.filter((c) => c.to === roleId);
  const calibration = input.calibrationHints[roleId] || "";
  const scenario = input.scenarioSummaries[roleId] || "";

  const blocks: string[] = [
    `# Round3 — 最终改判与决议 — ${roleId}`,
    `「${persona.natural_bias}」视角的最终判断`,
    "",
    "## 规则",
    "- 你可以维持原判，也可以改判。",
    "- 改判必须附理由：是被谁的质询说服、还是新的证据、还是情景分析影响。",
    "- 少数意见和红线不会被删除（历史记录保留）。",
    "- 最终决议基于 Round3 最终立场。",
    "",
  ];

  if (original) {
    blocks.push(
      "## 你的 Round1 立场",
      `立场: ${original.position}`,
      `判断: ${original.judgment || original.summary}`,
      `置信度: ${original.confidence}%`,
      original.veto ? `⚠️ 你触发了红线: ${original.veto_reason || ""}` : "",
      "",
    );
  }

  if (receivedChallenges.length > 0) {
    blocks.push("## 你收到的质询（需要回应）");
    for (const c of receivedChallenges) {
      const sev = c.severity === "high" ? "🔥" : "📌";
      blocks.push(`- ${sev} [${c.from}]: ${c.question}`);
      if (c.targetEvidenceId) {
        blocks.push(`  引用证据: ${c.targetEvidenceId}`);
      }
    }
    blocks.push("");
  }

  if (response?.response_to_challenges?.length) {
    blocks.push("## 你的 Round2 回应");
    for (const r of response.response_to_challenges) {
      blocks.push(`- ${r}`);
    }
    blocks.push("");
  }

  if (calibration) {
    blocks.push("## 校准提示");
    blocks.push(calibration);
    blocks.push("");
  }

  if (scenario) {
    blocks.push("## 情景分析影响");
    blocks.push(scenario);
    blocks.push("");
  }

  blocks.push(`## 输出格式（JSON only）
{
  "member": "${roleId}",
  "position": "support|oppose|conditional",
  "confidence": 0-100,
  "judgment": "【我的判断】一句话结论",
  "evidence_used": ["Evidence ID"],
  "top_risk": "【最大风险】",
  "proposal": "【我的建议】",
  "needs_validation": "【需要验证】",
  "change_of_view": false,
  "change_reason": "如改判，说明理由；如维持，写'维持原判'",
  "veto": false,
  "veto_reason": "",
  "minority_report": false
}`);

  return blocks.filter(Boolean).join("\n");
}

/**
 * 根据 Round1+Round2 意见生成改判结果（启发式版本，无 LLM 时使用）
 */
export function resolveRound3Heuristic(
  input: Round3Input,
): Round3Opinion[] {
  const results: Round3Opinion[] = [];

  for (const role of [...new Set([
    ...input.round1Opinions.map((o) => o.member),
    ...input.round2Responses.map((o) => o.member),
  ])]) {
    const original = input.round1Opinions.find((o) => o.member === role);
    const response = input.round2Responses.find((o) => o.member === role);

    if (!original) continue;

    let position = original.position;
    let confidence = original.confidence;
    let change_of_view = false;
    let change_reason = "维持原判";

    // 检查收到的质询中是否有 high severity 的
    const receivedChallenges = input.examinationPacket.filter(
      (c) => c.to === role && c.severity === "high",
    );

    // 检查 Round2 回应中是否有人挑战ta
    const challengesToSelf = input.round2Responses
      .filter((r) => r.challenge_to_others?.some((c) => c.includes(`→${role}`)));

    // 如果有多条 high severity 质询，且立场是 support，考虑降级
    if (receivedChallenges.length >= 2 && original.position === "support") {
      position = "conditional";
      confidence = Math.max(40, confidence - 15);
      change_of_view = true;
      change_reason = `收到 ${receivedChallenges.length} 条高优先级质询，对原判断产生疑虑。建议改为条件支持，先验证核心假设。`;
    }

    // 如果 Round2 中有回应提到"证据不足"，降 confidence
    if (response?.response_to_challenges?.some((r) => /证据不足|无法证明|无数据/.test(r))) {
      confidence = Math.max(35, confidence - 10);
      if (position === "support") {
        position = "conditional";
        change_of_view = true;
        change_reason = "审查后认为证据密度不足以支撑当前立场。";
      }
    }

    // 如果有多人同时反对，降低 confidence
    const incomingOppose = input.round2Responses.filter(
      (r) => r.member !== role && r.position === "oppose",
    );
    if (incomingOppose.length >= 4 && original.position === "support") {
      position = "conditional";
      confidence = Math.max(35, confidence - 15);
      if (!change_of_view) {
        change_of_view = true;
        change_reason = `多数常委反对（${incomingOppose.length} 席），重新评估后调整立场。`;
      }
    }

    // 如果是 CFO/CRO 且原立场是 oppose，更多证据可改为 conditional
    if ((role === "CFO" || role === "CRO") && original.position === "oppose") {
      // 查 Round2 回应中是否有"证据可接受"的表述
      const concessions = response?.response_to_challenges?.filter((r) =>
        /可接受|可以验证|条件可满足|风险可控/.test(r),
      );
      if (concessions && concessions.length >= 2) {
        position = "conditional";
        confidence = Math.min(confidence + 10, 70);
        change_of_view = true;
        change_reason = "对方补充的证据和缓释方案部分可接受，可改为条件支持。";
      }
    }

    // 构建 Round3 意见
    const round3: Round3Opinion = {
      member: role,
      position,
      confidence,
      summary: position === original.position
        ? `维持：${original.judgment || original.summary}`
        : `改判为${position}：${change_reason}`,
      judgment: position === original.position
        ? (original.judgment || original.summary)
        : `经 Round2 质询后，从「${original.position}」改判为「${position}」。${change_reason}`,
      top_risk: original.top_risk,
      proposal: original.proposal,
      needs_validation: original.needs_validation,
      evidence_used: original.evidence_used,
      reasoning: [
        `Round1 立场: ${original.position}`,
        change_of_view ? `改判理由: ${change_reason}` : "维持原判",
        `最终置信度: ${confidence}%`,
      ],
      risks: original.risks,
      conditions: position === "conditional"
        ? [...(original.conditions || []), "须满足质询中的核心条件"]
        : original.conditions,
      veto: original.veto,
      veto_reason: original.veto_reason,
      challenge_to_others: response?.challenge_to_others,
      response_to_challenges: response?.response_to_challenges,
      change_of_view,
      change_reason,
      final_confidence: confidence,
      previous_position: change_of_view ? original.position : undefined,
      minority_report: original.minority_report || change_of_view,
    };

    results.push(round3);
  }

  return results;
}

/**
 * 从 Round3 意见统计改判率
 */
export function summarizeRound3Changes(
  round3: Round3Opinion[],
): {
  changed: number;
  unchanged: number;
  changeRate: string;
  details: Array<{ member: CouncilRoleId; from?: string; to: string; reason: string }>;
} {
  const changed = round3.filter((r) => r.change_of_view);
  const unchanged = round3.filter((r) => !r.change_of_view);
  const details = changed.map((r) => ({
    member: r.member,
    from: r.previous_position,
    to: r.position,
    reason: r.change_reason,
  }));

  return {
    changed: changed.length,
    unchanged: unchanged.length,
    changeRate: `${Math.round((changed.length / round3.length) * 100)}%`,
    details,
  };
}
